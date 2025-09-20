import { Session } from '../../../shared/types/index';

export interface DataState {
  session: Session | null;
  elapsed: number;
  remaining: number;
  tokenUsage: {
    used: number;
    total: number;
    projected: number;
  };
  phase: {
    current: string;
    promptsUsed: number;
    totalPrompts: number;
  };
  claudeCode: {
    isRealTimeActive: boolean;
    precisionMetrics: {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      totalTokens: number;
      efficiency: number;
      ratePerMin: number;
      costEstimate: number;
    };
    liveStatus: {
      hasActiveSession: boolean;
      activeSessionId?: string;
      lastActivity?: number;
    };
  };
  connection: {
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    lastUpdate: number;
    quality: 'excellent' | 'good' | 'poor' | 'offline';
  };
  ui: {
    loading: boolean;
    error: string | null;
    initialized: boolean;
  };
}

export type DataStateListener = (state: DataState) => void;

interface PollConfig {
  interval: number;
  maxRetries: number;
  backoffMultiplier: number;
  maxInterval: number;
}

export class DataController {
  private state: DataState;
  private listeners: Set<DataStateListener> = new Set();
  private eventSource: EventSource | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  private config: PollConfig = {
    interval: 5000,
    maxRetries: 5,
    backoffMultiplier: 1.5,
    maxInterval: 30000
  };

  private retryCount = 0;
  private currentPollInterval = this.config.interval;
  private lastDataChange = 0;
  private isDestroyed = false;

  constructor() {
    this.state = {
      session: null,
      elapsed: 0,
      remaining: 0,
      tokenUsage: { used: 0, total: 0, projected: 0 },
      phase: { current: 'Unknown', promptsUsed: 0, totalPrompts: 100 },
      claudeCode: {
        isRealTimeActive: false,
        precisionMetrics: {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          totalTokens: 0,
          efficiency: 0,
          ratePerMin: 0,
          costEstimate: 0
        },
        liveStatus: {
          hasActiveSession: false
        }
      },
      connection: { 
        status: 'disconnected', 
        lastUpdate: 0, 
        quality: 'offline' 
      },
      ui: { loading: true, error: null, initialized: false }
    };
  }

  // State management
  private updateState(partial: Partial<DataState>): void {
    if (this.isDestroyed) return;

    const hasChanges = this.hasStateChanges(partial);
    
    this.state = {
      ...this.state,
      ...partial,
      connection: {
        ...this.state.connection,
        ...(partial.connection || {}),
        lastUpdate: hasChanges ? Date.now() : this.state.connection.lastUpdate
      }
    };

    if (hasChanges) {
      this.lastDataChange = Date.now();
      this.adjustPollInterval();
    }

    this.notifyListeners();
  }

  private hasStateChanges(partial: Partial<DataState>): boolean {
    if (partial.session?.id !== this.state.session?.id) return true;
    if (partial.elapsed !== this.state.elapsed) return true;
    if (partial.tokenUsage?.used !== this.state.tokenUsage.used) return true;
    if (partial.phase?.promptsUsed !== this.state.phase.promptsUsed) return true;
    return false;
  }

  private adjustPollInterval(): void {
    const timeSinceLastChange = Date.now() - this.lastDataChange;
    
    if (timeSinceLastChange > 60000) { // 1 minute of no changes
      this.currentPollInterval = Math.min(this.currentPollInterval * 1.2, this.config.maxInterval);
    } else {
      this.currentPollInterval = this.config.interval;
    }
  }

  private notifyListeners(): void {
    if (this.isDestroyed) return;
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('Error in data state listener:', error);
      }
    });
  }

  // Public API
  subscribe(listener: DataStateListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state
    try {
      listener({ ...this.state });
    } catch (error) {
      console.error('Error in initial data state listener call:', error);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): DataState {
    return { ...this.state };
  }

  // Initialization
  async initialize(): Promise<void> {
    if (this.isDestroyed) return;

    console.log('🚀 DataController initializing...');
    
    this.updateState({
      ui: { ...this.state.ui, loading: true, error: null }
    });

    try {
      // Connect SSE first
      await this.connectSSE();
      
      // Load initial session data
      await this.loadInitialData();
      
      // Start coordinated polling
      this.startSmartPolling();
      
      this.updateState({
        ui: { loading: false, error: null, initialized: true }
      });

      console.log('✅ DataController initialized successfully');
    } catch (error) {
      console.error('❌ DataController initialization failed:', error);
      this.updateState({
        ui: { loading: false, error: 'Failed to initialize data connection', initialized: false }
      });
      
      // Retry initialization after delay
      if (this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        const delay = this.config.interval * Math.pow(this.config.backoffMultiplier, this.retryCount);
        
        setTimeout(() => {
          if (!this.isDestroyed) {
            this.initialize();
          }
        }, delay);
      }
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      // Get Claude Code session data from unified endpoint
      const [liveStatusRes, precisionMetricsRes, budgetProgressRes] = await Promise.all([
        fetch('/api/claude-code?endpoint=live-status'),
        fetch('/api/claude-code?endpoint=precision-metrics'),
        fetch('/api/claude-code?endpoint=budget-progress')
      ]);
      
      if (!liveStatusRes.ok || !precisionMetricsRes.ok || !budgetProgressRes.ok) {
        throw new Error(`Claude Code API responded with ${liveStatusRes.status}/${precisionMetricsRes.status}/${budgetProgressRes.status}`);
      }
      
      const [liveStatus, precisionMetrics, budgetProgress] = await Promise.all([
        liveStatusRes.json(),
        precisionMetricsRes.json(),
        budgetProgressRes.json()
      ]);
      
      // Process Claude Code live status data
      if (liveStatus.hasActiveSession) {
        const now = Date.now();
        const activeSession = liveStatus.activeSession;
        const startTime = activeSession.startTime;
        const elapsed = now - startTime;
        
        // Convert Claude Code session data to internal Session format
        const session: Session = {
          id: activeSession.sessionId,
          status: activeSession.status,
          startTime: startTime,
          duration: elapsed,
          tokensUsed: precisionMetrics.totalTokens || 0,
          tokenBudget: budgetProgress.totalBudget || 200000, // 5-hour budget
          createdAt: startTime,
          updatedAt: now
        };
        
        // Use real Claude Code token data
        const tokenData = {
          used: precisionMetrics.totalTokens || 0,
          total: precisionMetrics.totalTokens || 0,
          projected: budgetProgress.projectedUsage || 0
        };

        // Calculate phase based on 5-hour window progress
        const sessionProgress = budgetProgress.percentage || 0;
        const phaseData = {
          current: liveStatus.isRealTimeActive ? 'Live Session Active' : 'Claude Code Session',
          promptsUsed: Math.floor(sessionProgress / 5),
          totalPrompts: 100
        };

        this.updateState({
          session,
          tokenUsage: tokenData,
          phase: phaseData,
          elapsed: elapsed,
          remaining: Math.max(0, budgetProgress.remainingTime || 0),
          claudeCode: {
            isRealTimeActive: liveStatus.isRealTimeActive || false,
            precisionMetrics: {
              inputTokens: precisionMetrics.inputTokens || 0,
              outputTokens: precisionMetrics.outputTokens || 0,
              cacheReadTokens: precisionMetrics.cacheReadTokens || 0,
              totalTokens: precisionMetrics.totalTokens || 0,
              efficiency: precisionMetrics.efficiency || 0,
              ratePerMin: precisionMetrics.ratePerMin || 0,
              costEstimate: precisionMetrics.costEstimate || 0
            },
            liveStatus: {
              hasActiveSession: liveStatus.hasActiveSession,
              activeSessionId: activeSession.sessionId,
              lastActivity: liveStatus.lastActivity
            }
          },
          connection: { 
            ...this.state.connection, 
            quality: 'good' 
          }
        });

        this.retryCount = 0; // Reset retry count on success
      } else {
        // No active Claude Code session
        this.updateState({
          session: null,
          tokenUsage: { used: 0, total: 0, projected: 0 },
          phase: { current: 'No Active Session', promptsUsed: 0, totalPrompts: 0 },
          elapsed: 0,
          remaining: 0,
          claudeCode: {
            isRealTimeActive: false,
            precisionMetrics: {
              inputTokens: 0,
              outputTokens: 0,
              cacheReadTokens: 0,
              totalTokens: 0,
              efficiency: 0,
              ratePerMin: 0,
              costEstimate: 0
            },
            liveStatus: {
              hasActiveSession: false
            }
          },
          connection: { 
            ...this.state.connection, 
            quality: 'good' 
          }
        });
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      throw error;
    }
  }

  // SSE (Server-Sent Events) management for Vercel compatibility
  private async connectSSE(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('DataController destroyed'));
        return;
      }

      try {
        // Try Claude Code SSE first, fall back to generic events
        let sseUrl = `/api/claude-code?endpoint=events${this.state.session ? `&sessionId=${this.state.session.id}` : ''}`;
        
        // Test if Claude Code events endpoint exists
        try {
          const testResponse = await fetch('/api/claude-code?endpoint=events', { method: 'HEAD' });
          if (!testResponse.ok) {
            console.log('🔌 Claude Code events not available, falling back to generic events');
            sseUrl = `/api/events${this.state.session ? `?sessionId=${this.state.session.id}` : ''}`;
          }
        } catch {
          console.log('🔌 Claude Code events not available, falling back to generic events');
          sseUrl = `/api/events${this.state.session ? `?sessionId=${this.state.session.id}` : ''}`;
        }
        
        console.log('🔌 Connecting to SSE endpoint:', sseUrl);
        this.eventSource = new EventSource(sseUrl);
        
        const timeout = setTimeout(() => {
          if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
          }
          reject(new Error('SSE connection timeout'));
        }, 10000);

        this.eventSource.onopen = () => {
          clearTimeout(timeout);
          console.log('🔌 SSE connected');
          
          this.updateState({
            connection: { 
              ...this.state.connection, 
              status: 'connected',
              quality: 'excellent'
            }
          });

          this.startHeartbeat();
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleSSEMessage(event);
        };

        // Handle Claude Code specific event types
        this.eventSource.addEventListener('claude_code_session', (event: MessageEvent) => {
          this.handleSSEMessage(event);
        });
        
        this.eventSource.addEventListener('claude_code_metrics', (event: MessageEvent) => {
          this.handleSSEMessage(event);
        });
        
        this.eventSource.addEventListener('claude_code_budget', (event: MessageEvent) => {
          this.handleSSEMessage(event);
        });
        
        this.eventSource.addEventListener('claude_code_status', (event: MessageEvent) => {
          this.handleSSEMessage(event);
        });
        
        // Keep existing events for compatibility
        this.eventSource.addEventListener('timer_update', (event: MessageEvent) => {
          this.handleSSEMessage(event);
        });
        
        this.eventSource.addEventListener('token_update', (event: MessageEvent) => {
          this.handleSSEMessage(event);
        });
        
        this.eventSource.addEventListener('session_update', (event: MessageEvent) => {
          this.handleSSEMessage(event);
        });
        
        this.eventSource.addEventListener('heartbeat', (event: MessageEvent) => {
          this.updateConnectionQuality();
        });

        this.eventSource.onerror = (error) => {
          clearTimeout(timeout);
          console.error('🔌 SSE error:', error);
          
          if (this.eventSource?.readyState === EventSource.CLOSED) {
            console.log('🔌 SSE disconnected');
            
            // Clear stale data on disconnect
            this.updateState({
              connection: { 
                ...this.state.connection, 
                status: 'disconnected',
                quality: 'offline'
              },
              // Clear stale session data when disconnected
              session: null,
              elapsed: 0,
              remaining: 0,
              tokenUsage: { used: 0, total: 0, projected: 0 },
              phase: { current: 'Disconnected', promptsUsed: 0, totalPrompts: 0 }
            });

            this.stopHeartbeat();
            this.scheduleReconnection();
          } else {
            // Temporary error, connection still open
            this.updateState({
              connection: { 
                ...this.state.connection, 
                status: 'error',
                quality: 'poor'
              }
            });
          }
          
          if (timeout) {
            reject(error);
          }
        };

        this.updateState({
          connection: { 
            ...this.state.connection, 
            status: 'connecting' 
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }
  
  private handleSSEMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type || event.type) {
        case 'claude_code_session':
          if (this.state.connection.status === 'connected') {
            const sessionData = message.session || message.data;
            if (sessionData) {
              this.updateState({
                session: sessionData.sessionId ? {
                  id: sessionData.sessionId,
                  status: sessionData.status || 'active',
                  startTime: sessionData.startTime,
                  duration: Date.now() - sessionData.startTime,
                  tokensUsed: sessionData.tokensUsed || 0,
                  tokenBudget: sessionData.tokenBudget || 200000,
                  createdAt: sessionData.startTime,
                  updatedAt: Date.now()
                } : null,
                claudeCode: {
                  ...this.state.claudeCode,
                  liveStatus: {
                    hasActiveSession: sessionData.hasActiveSession || false,
                    activeSessionId: sessionData.sessionId,
                    lastActivity: sessionData.lastActivity || Date.now()
                  },
                  isRealTimeActive: sessionData.isRealTimeActive || false
                }
              });
            }
          }
          break;

        case 'claude_code_metrics':
          if (this.state.connection.status === 'connected') {
            const metrics = message.metrics || message.data;
            if (metrics) {
              this.updateState({
                claudeCode: {
                  ...this.state.claudeCode,
                  precisionMetrics: {
                    inputTokens: metrics.inputTokens || 0,
                    outputTokens: metrics.outputTokens || 0,
                    cacheReadTokens: metrics.cacheReadTokens || 0,
                    totalTokens: metrics.totalTokens || 0,
                    efficiency: metrics.efficiency || 0,
                    ratePerMin: metrics.ratePerMin || 0,
                    costEstimate: metrics.costEstimate || 0
                  }
                },
                tokenUsage: {
                  used: metrics.totalTokens || 0,
                  total: metrics.totalTokens || 0,
                  projected: Math.round((metrics.totalTokens || 0) * 1.2)
                }
              });
            }
          }
          break;

        case 'claude_code_budget':
          if (this.state.connection.status === 'connected') {
            const budget = message.budget || message.data;
            if (budget) {
              this.updateState({
                remaining: budget.remainingTime || 0,
                elapsed: budget.elapsedTime || 0
              });
            }
          }
          break;

        case 'claude_code_status':
          if (this.state.connection.status === 'connected') {
            const status = message.status || message.data;
            if (status) {
              this.updateState({
                claudeCode: {
                  ...this.state.claudeCode,
                  isRealTimeActive: status.isRealTimeActive || false,
                  liveStatus: {
                    ...this.state.claudeCode.liveStatus,
                    hasActiveSession: status.hasActiveSession || false,
                    lastActivity: status.lastActivity || Date.now()
                  }
                },
                phase: {
                  ...this.state.phase,
                  current: status.isRealTimeActive ? 'Live Session Active' : 'Claude Code Session'
                }
              });
            }
          }
          break;
          
        case 'timer_update':
          if (this.state.connection.status === 'connected') {
            this.updateState({
              elapsed: message.elapsed,
              remaining: message.remaining,
              session: this.state.session ? {
                ...this.state.session,
                status: message.status || this.state.session.status
              } : null
            });
          }
          break;
          
        case 'token_update':
          if (this.state.connection.status === 'connected') {
            this.updateState({
              tokenUsage: {
                used: message.tokensUsed,
                total: message.totalUsed,
                projected: message.projectedTotal
              }
            });
          }
          break;
          
        case 'session_update':
          if (message.session && this.state.connection.status === 'connected') {
            this.updateState({ session: message.session });
          }
          break;
          
        case 'connection':
          console.log('SSE connection confirmed, client ID:', message.clientId);
          break;
          
        case 'heartbeat':
          // Update connection quality based on heartbeat
          this.updateConnectionQuality();
          break;
          
        default:
          console.log('Unknown SSE message:', message);
      }
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  }

  // Removed - replaced by handleSSEMessage above

  private subscribeToSession(): void {
    // With SSE, subscription is handled via query parameters in the URL
    // Reconnect with session ID if we have one
    if (this.state.session && this.eventSource) {
      this.eventSource.close();
      const sseUrl = `/api/claude-code?endpoint=events&sessionId=${this.state.session.id}`;
      this.eventSource = new EventSource(sseUrl);
    }
  }

  private startHeartbeat(): void {
    // SSE heartbeat is handled server-side
    // We just monitor connection quality
    this.heartbeatTimer = setInterval(() => {
      this.updateConnectionQuality();
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private updateConnectionQuality(): void {
    const timeSinceLastUpdate = Date.now() - this.state.connection.lastUpdate;
    let quality: DataState['connection']['quality'];
    
    if (timeSinceLastUpdate < 5000) {
      quality = 'excellent';
    } else if (timeSinceLastUpdate < 15000) {
      quality = 'good';
    } else if (timeSinceLastUpdate < 60000) {
      quality = 'poor';
    } else {
      quality = 'offline';
    }

    this.updateState({
      connection: { 
        ...this.state.connection, 
        quality 
      }
    });
  }

  private scheduleReconnection(): void {
    if (this.isDestroyed || this.reconnectTimer) return;
    
    const delay = Math.min(
      this.config.interval * Math.pow(this.config.backoffMultiplier, this.retryCount),
      this.config.maxInterval
    );

    console.log(`🔄 Scheduling SSE reconnection in ${delay}ms...`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      if (!this.isDestroyed && this.retryCount < this.config.maxRetries) {
        this.retryCount++;
        try {
          await this.connectSSE();
          this.retryCount = 0;
        } catch (error) {
          console.error('SSE reconnection failed:', error);
          this.scheduleReconnection();
        }
      }
    }, delay);
  }

  // Smart polling
  private startSmartPolling(): void {
    if (this.pollTimer) return;
    
    this.pollTimer = setInterval(() => {
      this.performSmartPoll();
    }, this.currentPollInterval);

    console.log('📊 Smart polling started');
  }

  private async performSmartPoll(): Promise<void> {
    // Skip polling if SSE is healthy and we have recent data
    if (this.state.connection.status === 'connected' && 
        this.state.connection.quality === 'excellent' &&
        Date.now() - this.state.connection.lastUpdate < 10000) {
      return;
    }

    try {
      // Use real session data instead of API calls
      await this.loadInitialData();
      
      // Update poll interval based on activity
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = setInterval(() => {
          this.performSmartPoll();
        }, this.currentPollInterval);
      }
    } catch (error) {
      console.error('Smart poll failed:', error);
      
      this.updateState({
        connection: { 
          ...this.state.connection, 
          quality: 'poor' 
        }
      });
    }
  }

  // Public methods for manual actions
  async pauseSession(): Promise<void> {
    if (!this.state.session) return;
    
    try {
      await fetch(`/api/sessions/${this.state.session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      
      // Update will come via SSE or next poll
    } catch (error) {
      console.error('Failed to pause session:', error);
      this.updateState({
        ui: { ...this.state.ui, error: 'Failed to pause session' }
      });
    }
  }

  async resumeSession(): Promise<void> {
    if (!this.state.session) return;
    
    try {
      await fetch(`/api/sessions/${this.state.session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      
      // Update will come via SSE or next poll
    } catch (error) {
      console.error('Failed to resume session:', error);
      this.updateState({
        ui: { ...this.state.ui, error: 'Failed to resume session' }
      });
    }
  }

  async completeSession(): Promise<void> {
    if (!this.state.session) return;
    
    try {
      await fetch(`/api/sessions/${this.state.session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      
      this.updateState({
        session: null,
        elapsed: 0,
        remaining: 0
      });
    } catch (error) {
      console.error('Failed to complete session:', error);
      this.updateState({
        ui: { ...this.state.ui, error: 'Failed to complete session' }
      });
    }  
  }

  // Cleanup
  destroy(): void {
    console.log('🧹 DataController shutting down...');
    
    this.isDestroyed = true;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.listeners.clear();
    
    console.log('✅ DataController destroyed');
  }
}