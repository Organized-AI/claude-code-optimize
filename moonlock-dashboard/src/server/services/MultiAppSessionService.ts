/**
 * Multi-App Session Service
 * 
 * Provides unified tracking and analytics across all Claude applications:
 * - Claude Code (existing SessionBasedAnthropicService)
 * - Claude Desktop (new ClaudeDesktopMonitor)
 * - Future: Claude Web, Mobile, etc.
 */

import { JsonDatabaseManager } from './JsonDatabaseManager.js';
import { WebSocketManager } from './WebSocketManager.js';
import { SessionBasedAnthropicService } from './SessionBasedAnthropicService.js';
import { ClaudeDesktopMonitor, DesktopUsageMetrics } from './ClaudeDesktopMonitor.js';

export interface AppUsageBreakdown {
  claudeCode: {
    sessions: number;
    totalTokens: number;
    averageSessionDuration: number;
    dailyUsage: number;
    status: 'active' | 'inactive';
    lastActivity: string;
  };
  claudeDesktop: {
    sessions: number;
    estimatedTokens: number;
    totalDuration: number;
    dailyUsage: number;
    status: 'active' | 'inactive';
    lastActivity: string;
    version: string;
  };
}

export interface UnifiedUsageMetrics {
  overview: {
    totalSessions: number;
    totalEstimatedTokens: number;
    combinedDailyUsage: number;
    activeApplications: string[];
    totalEstimatedCost: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  breakdown: AppUsageBreakdown;
  timeline: SessionTimelineEntry[];
  insights: {
    mostUsedApp: string;
    peakUsageHours: number[];
    averageSessionsPerDay: number;
    tokenUsageDistribution: Record<string, number>;
  };
}

export interface SessionTimelineEntry {
  timestamp: number;
  application: 'claude-code' | 'claude-desktop';
  event: 'session_start' | 'session_end' | 'activity' | 'token_usage';
  sessionId: string;
  duration?: number;
  tokensUsed?: number;
  metadata?: Record<string, any>;
}

export interface CostProjection {
  application: string;
  currentUsage: number; // tokens
  projectedDaily: number;
  projectedWeekly: number;
  projectedMonthly: number;
  costEstimate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export class MultiAppSessionService {
  private database: JsonDatabaseManager;
  private wsManager: WebSocketManager;
  private claudeCodeService?: SessionBasedAnthropicService;
  private claudeDesktopMonitor?: ClaudeDesktopMonitor;
  private timeline: SessionTimelineEntry[] = [];
  private isInitialized: boolean = false;

  // Pricing constants (Max Plan rates per million tokens)
  private readonly PRICING = {
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 }
  };

  constructor(
    database: JsonDatabaseManager, 
    wsManager: WebSocketManager,
    claudeCodeService?: SessionBasedAnthropicService,
    claudeDesktopMonitor?: ClaudeDesktopMonitor
  ) {
    this.database = database;
    this.wsManager = wsManager;
    this.claudeCodeService = claudeCodeService;
    this.claudeDesktopMonitor = claudeDesktopMonitor;
  }

  /**
   * Initialize multi-app session tracking
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing Multi-App Session Service...');
      
      // Initialize Claude Desktop monitor if available
      if (this.claudeDesktopMonitor) {
        await this.claudeDesktopMonitor.initialize();
      }
      
      // Load historical timeline data
      await this.loadTimelineData();
      
      // Set up WebSocket listeners for real-time updates
      this.setupWebSocketListeners();
      
      this.isInitialized = true;
      console.log('✅ Multi-App Session Service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Multi-App Session Service:', error);
      throw error;
    }
  }

  /**
   * Load historical timeline data
   */
  private async loadTimelineData(): Promise<void> {
    try {
      const sessions = await this.database.getAllSessions();
      
      // Convert sessions to timeline entries
      sessions.forEach(session => {
        const application = (session as any).metadata?.type === 'claude-desktop' || 
                          session.name?.includes('Claude Desktop') ? 'claude-desktop' : 'claude-code';
        
        // Session start entry
        this.timeline.push({
          timestamp: session.startTime,
          application,
          event: 'session_start',
          sessionId: session.id,
          metadata: {
            name: session.name,
            type: session.type
          }
        });
        
        // Session end entry (if ended)
        if (session.endTime) {
          this.timeline.push({
            timestamp: session.endTime,
            application,
            event: 'session_end',
            sessionId: session.id,
            duration: session.duration,
            tokensUsed: session.tokensUsed
          });
        }
      });
      
      // Sort timeline by timestamp (newest first)
      this.timeline.sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only last 1000 entries
      if (this.timeline.length > 1000) {
        this.timeline = this.timeline.slice(0, 1000);
      }
      
      console.log(`📊 Loaded ${this.timeline.length} timeline entries`);
      
    } catch (error) {
      console.error('❌ Failed to load timeline data:', error);
    }
  }

  /**
   * Set up WebSocket listeners for real-time updates
   */
  private setupWebSocketListeners(): void {
    // Listen for Claude Desktop updates
    if (this.claudeDesktopMonitor) {
      // Note: WebSocket events would be handled by the individual services
      // This service aggregates the data when requested
    }
  }

  /**
   * Get unified usage metrics across all applications
   */
  async getUnifiedUsageMetrics(): Promise<UnifiedUsageMetrics> {
    const claudeCodeMetrics = await this.getClaudeCodeMetrics();
    const claudeDesktopMetrics = await this.getClaudeDesktopMetrics();
    
    // Calculate combined metrics
    const totalSessions = claudeCodeMetrics.sessions + claudeDesktopMetrics.sessions;
    const totalTokens = claudeCodeMetrics.totalTokens + claudeDesktopMetrics.estimatedTokens;
    const combinedDailyUsage = claudeCodeMetrics.dailyUsage + claudeDesktopMetrics.dailyUsage;
    
    // Determine active applications
    const activeApps: string[] = [];
    if (claudeCodeMetrics.status === 'active') activeApps.push('Claude Code');
    if (claudeDesktopMetrics.status === 'active') activeApps.push('Claude Desktop');
    
    // Calculate cost estimates (using Sonnet pricing as baseline)
    const dailyCost = (totalTokens / 1_000_000) * this.PRICING['claude-3-5-sonnet-20241022'].input;
    
    // Generate insights
    const insights = this.generateInsights(claudeCodeMetrics, claudeDesktopMetrics);
    
    return {
      overview: {
        totalSessions,
        totalEstimatedTokens: totalTokens,
        combinedDailyUsage,
        activeApplications: activeApps,
        totalEstimatedCost: {
          daily: dailyCost,
          weekly: dailyCost * 7,
          monthly: dailyCost * 30
        }
      },
      breakdown: {
        claudeCode: claudeCodeMetrics,
        claudeDesktop: claudeDesktopMetrics
      },
      timeline: this.timeline.slice(0, 50), // Last 50 events
      insights
    };
  }

  /**
   * Get Claude Code metrics
   */
  private async getClaudeCodeMetrics(): Promise<AppUsageBreakdown['claudeCode']> {
    if (!this.claudeCodeService) {
      return {
        sessions: 0,
        totalTokens: 0,
        averageSessionDuration: 0,
        dailyUsage: 0,
        status: 'inactive',
        lastActivity: 'Never'
      };
    }

    try {
      const sessionInfo = await this.claudeCodeService.getCurrentSessionInfo();
      const usageMetrics = await this.claudeCodeService.getUsageMetrics();
      const isActive = await this.claudeCodeService.isSessionActive();
      
      return {
        sessions: 1, // Current session
        totalTokens: usageMetrics.tokenConsumption.total,
        averageSessionDuration: 0, // Would need historical data
        dailyUsage: usageMetrics.tokenConsumption.total,
        status: isActive ? 'active' : 'inactive',
        lastActivity: sessionInfo.sessionActive ? 'Active now' : 'Inactive'
      };
    } catch (error) {
      console.error('❌ Failed to get Claude Code metrics:', error);
      return {
        sessions: 0,
        totalTokens: 0,
        averageSessionDuration: 0,
        dailyUsage: 0,
        status: 'inactive',
        lastActivity: 'Error'
      };
    }
  }

  /**
   * Get Claude Desktop metrics
   */
  private async getClaudeDesktopMetrics(): Promise<AppUsageBreakdown['claudeDesktop']> {
    if (!this.claudeDesktopMonitor) {
      return {
        sessions: 0,
        estimatedTokens: 0,
        totalDuration: 0,
        dailyUsage: 0,
        status: 'inactive',
        lastActivity: 'Not monitored',
        version: 'N/A'
      };
    }

    try {
      const desktopMetrics = await this.claudeDesktopMonitor.getUsageMetrics();
      const isActive = desktopMetrics.activeSessions > 0;
      
      return {
        sessions: desktopMetrics.totalSessions,
        estimatedTokens: desktopMetrics.estimatedTotalTokens,
        totalDuration: desktopMetrics.totalDuration,
        dailyUsage: desktopMetrics.dailyUsage.estimatedTokens,
        status: isActive ? 'active' : 'inactive',
        lastActivity: desktopMetrics.lastActivity > 0 ? 
          new Date(desktopMetrics.lastActivity).toLocaleString() : 'No activity',
        version: desktopMetrics.applicationVersion
      };
    } catch (error) {
      console.error('❌ Failed to get Claude Desktop metrics:', error);
      return {
        sessions: 0,
        estimatedTokens: 0,
        totalDuration: 0,
        dailyUsage: 0,
        status: 'inactive',
        lastActivity: 'Error',
        version: 'Unknown'
      };
    }
  }

  /**
   * Generate usage insights
   */
  private generateInsights(
    claudeCodeMetrics: AppUsageBreakdown['claudeCode'],
    claudeDesktopMetrics: AppUsageBreakdown['claudeDesktop']
  ) {
    // Determine most used app by token usage
    const mostUsedApp = claudeCodeMetrics.totalTokens > claudeDesktopMetrics.estimatedTokens 
      ? 'Claude Code' : 'Claude Desktop';
    
    // Analyze timeline for peak usage hours
    const hourCounts: Record<number, number> = {};
    this.timeline.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakUsageHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));
    
    // Calculate average sessions per day (last 7 days)
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentSessions = this.timeline.filter(
      entry => entry.event === 'session_start' && entry.timestamp > weekAgo
    );
    const averageSessionsPerDay = recentSessions.length / 7;
    
    // Token usage distribution
    const totalTokens = claudeCodeMetrics.totalTokens + claudeDesktopMetrics.estimatedTokens;
    const tokenUsageDistribution = {
      'Claude Code': totalTokens > 0 ? (claudeCodeMetrics.totalTokens / totalTokens) * 100 : 0,
      'Claude Desktop': totalTokens > 0 ? (claudeDesktopMetrics.estimatedTokens / totalTokens) * 100 : 0
    };
    
    return {
      mostUsedApp,
      peakUsageHours,
      averageSessionsPerDay: Math.round(averageSessionsPerDay * 10) / 10,
      tokenUsageDistribution
    };
  }

  /**
   * Get cost projections by application
   */
  async getCostProjections(): Promise<CostProjection[]> {
    const claudeCodeMetrics = await this.getClaudeCodeMetrics();
    const claudeDesktopMetrics = await this.getClaudeDesktopMetrics();
    
    const projections: CostProjection[] = [];
    
    // Claude Code projection
    if (claudeCodeMetrics.totalTokens > 0) {
      const dailyCost = (claudeCodeMetrics.dailyUsage / 1_000_000) * this.PRICING['claude-3-5-sonnet-20241022'].input;
      projections.push({
        application: 'Claude Code',
        currentUsage: claudeCodeMetrics.totalTokens,
        projectedDaily: claudeCodeMetrics.dailyUsage,
        projectedWeekly: claudeCodeMetrics.dailyUsage * 7,
        projectedMonthly: claudeCodeMetrics.dailyUsage * 30,
        costEstimate: {
          daily: dailyCost,
          weekly: dailyCost * 7,
          monthly: dailyCost * 30
        }
      });
    }
    
    // Claude Desktop projection
    if (claudeDesktopMetrics.estimatedTokens > 0) {
      const dailyCost = (claudeDesktopMetrics.dailyUsage / 1_000_000) * this.PRICING['claude-3-5-sonnet-20241022'].input;
      projections.push({
        application: 'Claude Desktop',
        currentUsage: claudeDesktopMetrics.estimatedTokens,
        projectedDaily: claudeDesktopMetrics.dailyUsage,
        projectedWeekly: claudeDesktopMetrics.dailyUsage * 7,
        projectedMonthly: claudeDesktopMetrics.dailyUsage * 30,
        costEstimate: {
          daily: dailyCost,
          weekly: dailyCost * 7,
          monthly: dailyCost * 30
        }
      });
    }
    
    return projections;
  }

  /**
   * Get application health status
   */
  async getApplicationHealth(): Promise<Record<string, any>> {
    const health: Record<string, any> = {};
    
    // Claude Code health
    if (this.claudeCodeService) {
      try {
        const isActive = await this.claudeCodeService.isSessionActive();
        const healthStatus = this.claudeCodeService.getHealthStatus();
        health.claudeCode = {
          status: isActive ? 'healthy' : 'inactive',
          ...healthStatus
        };
      } catch (error) {
        health.claudeCode = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    // Claude Desktop health
    if (this.claudeDesktopMonitor) {
      try {
        const isMonitoring = this.claudeDesktopMonitor.isMonitoringActive();
        const metrics = await this.claudeDesktopMonitor.getUsageMetrics();
        health.claudeDesktop = {
          status: isMonitoring ? 'healthy' : 'inactive',
          monitoring: isMonitoring,
          activeSessions: metrics.activeSessions,
          lastActivity: metrics.lastActivity
        };
      } catch (error) {
        health.claudeDesktop = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    return health;
  }

  /**
   * Add timeline entry
   */
  addTimelineEntry(entry: SessionTimelineEntry): void {
    this.timeline.unshift(entry);
    
    // Keep only last 1000 entries
    if (this.timeline.length > 1000) {
      this.timeline = this.timeline.slice(0, 1000);
    }
    
    // Broadcast update
    this.wsManager.broadcast('multi-app-timeline-update', entry);
  }

  /**
   * Check if any Claude application is currently active
   */
  async isAnyAppActive(): Promise<boolean> {
    // Quick parallel check without full metrics calculation
    const checks = await Promise.all([
      this.isClaudeCodeActive(),
      this.isClaudeDesktopActive()
    ]);
    
    const isActive = checks.some(active => active);
    
    // Return accurate status
    if (isActive) {
      const activeApps = [];
      if (checks[0]) activeApps.push('Claude Code');
      if (checks[1]) activeApps.push('Claude Desktop');
      console.log(`✅ Active Claude sessions: ${activeApps.join(' + ')}`);
    }
    
    return isActive;
  }
  
  /**
   * Quick check if Claude Code is active
   */
  private async isClaudeCodeActive(): Promise<boolean> {
    try {
      if (!this.claudeCodeService) return false;
      return await this.claudeCodeService.isSessionActive();
    } catch {
      return false;
    }
  }
  
  /**
   * Quick check if Claude Desktop is active
   */
  private async isClaudeDesktopActive(): Promise<boolean> {
    try {
      if (!this.claudeDesktopMonitor) return false;
      const sessions = this.claudeDesktopMonitor.getAllSessions();
      return sessions.some(s => s.status === 'active');
    } catch {
      return false;
    }
  }

  /**
   * Get service status
   */
  getServiceStatus(): any {
    return {
      initialized: this.isInitialized,
      claudeCodeAvailable: !!this.claudeCodeService,
      claudeDesktopAvailable: !!this.claudeDesktopMonitor,
      timelineEntries: this.timeline.length
    };
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    console.log('🔴 Shutting down Multi-App Session Service...');
    
    if (this.claudeDesktopMonitor) {
      this.claudeDesktopMonitor.shutdown();
    }
    
    this.isInitialized = false;
    console.log('🔴 Multi-App Session Service shut down');
  }
}