// src/server/services/SessionBoundaryManager.ts
// Real-time session boundary monitoring with hooks

export interface SessionBoundary {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  timeElapsed: number;
  timeRemaining: number;
  progress: number; // 0-100 percentage
  status: 'active' | 'warning' | 'critical' | 'expired';
}

export interface SessionAlert {
  type: 'transition' | 'time_remaining' | 'optimization' | 'boundary';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timeRemaining: number;
  recommendations: string[];
  timestamp: Date;
}

export type SessionHookCallback = (boundary: SessionBoundary, alert?: SessionAlert) => Promise<void>;

export class SessionBoundaryManager {
  private readonly SESSION_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours
  private readonly ALERT_THRESHOLDS = [
    { minutes: 30, severity: 'warning' as const },
    { minutes: 15, severity: 'warning' as const },
    { minutes: 5, severity: 'critical' as const },
  ];
  
  private hooks: Map<string, SessionHookCallback[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastAlertTimes: Map<string, number> = new Map();
  private currentBoundary: SessionBoundary | null = null;

  constructor() {
    this.initializeHookTypes();
  }

  private initializeHookTypes() {
    this.hooks.set('session_start', []);
    this.hooks.set('session_end', []);
    this.hooks.set('time_alert_30min', []);
    this.hooks.set('time_alert_15min', []);
    this.hooks.set('time_alert_5min', []);
    this.hooks.set('optimization_trigger', []);
    this.hooks.set('boundary_detection', []);
  }

  // Hook Registration Methods
  registerHook(event: string, callback: SessionHookCallback): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)!.push(callback);
    console.log(`🪝 Registered hook for event: ${event}`);
  }

  // 1. Session Block Transition Hooks
  registerSessionTransitionHooks(): void {
    this.registerHook('session_start', async (boundary: SessionBoundary, alert?: SessionAlert) => {
      console.log(`🚀 SESSION STARTED: ${boundary.sessionId}`);
      console.log(`⏰ Session will end at: ${boundary.endTime.toLocaleString()}`);
      
      // Initialize session tracking
      await this.initializeSessionTracking(boundary);
      
      // Set up optimization schedules
      await this.scheduleOptimizations(boundary);
    });

    this.registerHook('session_end', async (boundary: SessionBoundary, alert?: SessionAlert) => {
      console.log(`🏁 SESSION ENDED: ${boundary.sessionId}`);
      console.log(`📊 Final session stats: ${(boundary.progress).toFixed(1)}% completed`);
      
      // Save session summary
      await this.saveSessionSummary(boundary);
      
      // Clean up resources
      await this.cleanupSession(boundary);
    });
  }

  // 2. Time Remaining Alerts
  registerTimeRemainingAlerts(): void {
    this.registerHook('time_alert_30min', async (boundary: SessionBoundary, alert?: SessionAlert) => {
      const alert30min: SessionAlert = {
        type: 'time_remaining',
        severity: 'warning',
        message: '⚠️ 30 minutes remaining in Claude session',
        timeRemaining: boundary.timeRemaining,
        recommendations: [
          'Consider wrapping up complex tasks',
          'Save important work progress',
          'Prepare for session transition'
        ],
        timestamp: new Date()
      };

      await this.sendAlert(alert30min);
      await this.triggerOptimizationMode(boundary, 'moderate');
    });

    this.registerHook('time_alert_15min', async (boundary: SessionBoundary, alert?: SessionAlert) => {
      const alert15min: SessionAlert = {
        type: 'time_remaining',
        severity: 'warning',
        message: '⚠️ 15 minutes remaining in Claude session',
        timeRemaining: boundary.timeRemaining,
        recommendations: [
          'Switch to budget-friendly models',
          'Focus on essential tasks only',
          'Document current progress'
        ],
        timestamp: new Date()
      };

      await this.sendAlert(alert15min);
      await this.triggerOptimizationMode(boundary, 'aggressive');
    });

    this.registerHook('time_alert_5min', async (boundary: SessionBoundary, alert?: SessionAlert) => {
      const alert5min: SessionAlert = {
        type: 'time_remaining',
        severity: 'critical',
        message: '🚨 5 minutes remaining in Claude session!',
        timeRemaining: boundary.timeRemaining,
        recommendations: [
          'Immediately save all work',
          'Use only essential commands',
          'Prepare for session end'
        ],
        timestamp: new Date()
      };

      await this.sendAlert(alert5min);
      await this.triggerOptimizationMode(boundary, 'emergency');
    });
  }

  // 3. Session Optimization Hooks
  registerSessionOptimizationHooks(): void {
    this.registerHook('optimization_trigger', async (boundary: SessionBoundary, alert?: SessionAlert) => {
      const optimizationLevel = this.determineOptimizationLevel(boundary);
      
      switch (optimizationLevel) {
        case 'moderate':
          await this.applyModerateOptimizations(boundary);
          break;
        case 'aggressive':
          await this.applyAggressiveOptimizations(boundary);
          break;
        case 'emergency':
          await this.applyEmergencyOptimizations(boundary);
          break;
      }
    });
  }

  // 4. Block Boundary Detection
  registerBoundaryDetection(): void {
    this.registerHook('boundary_detection', async (boundary: SessionBoundary, alert?: SessionAlert) => {
      // Real-time boundary monitoring
      const status = this.calculateSessionStatus(boundary);
      
      if (status !== boundary.status) {
        console.log(`📊 Session status changed: ${boundary.status} → ${status}`);
        boundary.status = status;
        
        // Trigger appropriate actions based on status change
        await this.handleStatusChange(boundary, status);
      }
    });
  }

  // Core Session Boundary Calculation (FIXED LOGIC)
  calculateSessionBoundary(sessionId: string, startTime: number): SessionBoundary {
    const start = new Date(startTime);
    const end = new Date(startTime + this.SESSION_DURATION_MS);
    const now = new Date();
    
    const timeElapsed = now.getTime() - start.getTime();
    const timeRemaining = Math.max(0, end.getTime() - now.getTime());
    const progress = Math.min(100, (timeElapsed / this.SESSION_DURATION_MS) * 100);
    
    return {
      sessionId,
      startTime: start,
      endTime: end,
      timeElapsed,
      timeRemaining,
      progress,
      status: this.calculateSessionStatus({ timeRemaining } as SessionBoundary)
    };
  }

  private calculateSessionStatus(boundary: { timeRemaining: number }): 'active' | 'warning' | 'critical' | 'expired' {
    if (boundary.timeRemaining <= 0) return 'expired';
    if (boundary.timeRemaining <= 5 * 60 * 1000) return 'critical'; // 5 minutes
    if (boundary.timeRemaining <= 30 * 60 * 1000) return 'warning'; // 30 minutes
    return 'active';
  }

  // Real-time Monitoring
  startMonitoring(sessionId: string, startTime: number): void {
    console.log(`👀 Starting real-time session boundary monitoring for ${sessionId}`);
    
    // Calculate initial boundary
    this.currentBoundary = this.calculateSessionBoundary(sessionId, startTime);
    
    // Trigger session start hooks
    this.executeHooks('session_start', this.currentBoundary);
    
    // Set up monitoring interval (every 30 seconds)
    this.monitoringInterval = setInterval(async () => {
      if (this.currentBoundary) {
        const updatedBoundary = this.calculateSessionBoundary(sessionId, startTime);
        await this.processBoundaryUpdate(updatedBoundary);
        this.currentBoundary = updatedBoundary;
      }
    }, 30000);
  }

  private async processBoundaryUpdate(boundary: SessionBoundary): Promise<void> {
    // Check for time-based alerts
    await this.checkTimeAlerts(boundary);
    
    // Execute boundary detection hooks
    await this.executeHooks('boundary_detection', boundary);
    
    // Check if session has expired
    if (boundary.status === 'expired' && this.currentBoundary?.status !== 'expired') {
      await this.executeHooks('session_end', boundary);
      this.stopMonitoring();
    }
  }

  private async checkTimeAlerts(boundary: SessionBoundary): Promise<void> {
    const remainingMinutes = boundary.timeRemaining / (60 * 1000);
    
    for (const threshold of this.ALERT_THRESHOLDS) {
      const alertKey = `${boundary.sessionId}_${threshold.minutes}min`;
      
      if (remainingMinutes <= threshold.minutes && !this.lastAlertTimes.has(alertKey)) {
        this.lastAlertTimes.set(alertKey, Date.now());
        await this.executeHooks(`time_alert_${threshold.minutes}min`, boundary);
      }
    }
  }

  private async executeHooks(event: string, boundary: SessionBoundary, alert?: SessionAlert): Promise<void> {
    const callbacks = this.hooks.get(event) || [];
    
    for (const callback of callbacks) {
      try {
        await callback(boundary, alert);
      } catch (error) {
        console.error(`❌ Hook execution failed for event ${event}:`, error);
      }
    }
  }

  // Optimization Implementation Methods
  private async triggerOptimizationMode(boundary: SessionBoundary, level: 'moderate' | 'aggressive' | 'emergency'): Promise<void> {
    console.log(`🔧 Triggering ${level} optimization mode`);
    
    const optimizationAlert: SessionAlert = {
      type: 'optimization',
      severity: level === 'emergency' ? 'critical' : 'warning',
      message: `Optimization mode activated: ${level}`,
      timeRemaining: boundary.timeRemaining,
      recommendations: this.getOptimizationRecommendations(level),
      timestamp: new Date()
    };

    await this.executeHooks('optimization_trigger', boundary, optimizationAlert);
  }

  private getOptimizationRecommendations(level: string): string[] {
    switch (level) {
      case 'moderate':
        return [
          'Use shorter, more focused prompts',
          'Avoid generating large code blocks',
          'Prefer reading existing files over recreating'
        ];
      case 'aggressive':
        return [
          'Switch to budget models (claude-haiku, kimi-k2)',
          'Minimize token-heavy operations',
          'Focus only on critical tasks'
        ];
      case 'emergency':
        return [
          'Stop all non-essential operations',
          'Save current work immediately',
          'Use minimal token commands only'
        ];
      default:
        return [];
    }
  }

  private async applyModerateOptimizations(boundary: SessionBoundary): Promise<void> {
    console.log('🔧 Applying moderate optimizations...');
    // Implementation would adjust model selection, token limits, etc.
  }

  private async applyAggressiveOptimizations(boundary: SessionBoundary): Promise<void> {
    console.log('🔧 Applying aggressive optimizations...');
    // Implementation would switch to budget models, reduce response lengths
  }

  private async applyEmergencyOptimizations(boundary: SessionBoundary): Promise<void> {
    console.log('🚨 Applying emergency optimizations...');
    // Implementation would minimize all token usage, essential operations only
  }

  // Utility Methods
  private async sendAlert(alert: SessionAlert): Promise<void> {
    console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
    if (alert.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      alert.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
  }

  private async initializeSessionTracking(boundary: SessionBoundary): Promise<void> {
    // Initialize tracking systems
    console.log(`📊 Initializing tracking for session ${boundary.sessionId}`);
  }

  private async scheduleOptimizations(boundary: SessionBoundary): Promise<void> {
    // Schedule optimization triggers
    console.log(`⏰ Scheduling optimizations for session ending at ${boundary.endTime.toLocaleString()}`);
  }

  private async saveSessionSummary(boundary: SessionBoundary): Promise<void> {
    const summary = {
      sessionId: boundary.sessionId,
      duration: boundary.timeElapsed,
      progress: boundary.progress,
      endTime: new Date(),
      status: 'completed'
    };
    
    console.log('💾 Session summary saved:', summary);
  }

  private async cleanupSession(boundary: SessionBoundary): Promise<void> {
    this.lastAlertTimes.clear();
    this.currentBoundary = null;
    console.log('🧹 Session cleanup completed');
  }

  private async handleStatusChange(boundary: SessionBoundary, newStatus: string): Promise<void> {
    // Handle status change logic
    console.log(`📊 Handling status change to: ${newStatus}`);
  }

  private determineOptimizationLevel(boundary: SessionBoundary): 'moderate' | 'aggressive' | 'emergency' {
    const remainingMinutes = boundary.timeRemaining / (60 * 1000);
    
    if (remainingMinutes <= 5) return 'emergency';
    if (remainingMinutes <= 15) return 'aggressive';
    if (remainingMinutes <= 30) return 'moderate';
    
    return 'moderate';
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Session boundary monitoring stopped');
    }
  }

  // Public API for getting current boundary info
  getCurrentBoundary(): SessionBoundary | null {
    return this.currentBoundary;
  }

  // Initialize all hooks
  initializeAllHooks(): void {
    console.log('🔗 Initializing all session boundary hooks...');
    
    this.registerSessionTransitionHooks();
    this.registerTimeRemainingAlerts();
    this.registerSessionOptimizationHooks();
    this.registerBoundaryDetection();
    
    console.log('✅ All session boundary hooks initialized');
  }
}