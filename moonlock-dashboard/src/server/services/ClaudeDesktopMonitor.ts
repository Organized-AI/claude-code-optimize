/**
 * Claude Desktop Monitor Service
 * 
 * Monitors Claude Desktop session activity through:
 * - Sentry session files for session tracking
 * - Window state changes for activity detection
 * - Local/Session storage for usage patterns
 * - Cookie changes for authentication state
 */

import { promises as fs } from 'fs';
import path from 'path';
import { watch } from 'fs';
import { JsonDatabaseManager } from './JsonDatabaseManager.js';
import { WebSocketManager } from './WebSocketManager.js';

export interface ClaudeDesktopSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration: number;
  status: 'active' | 'ended' | 'error';
  version: string;
  environment: string;
  errors: number;
  estimatedTokens: number;
  activityEvents: number;
}

export interface DesktopUsageMetrics {
  totalSessions: number;
  activeSessions: number;
  totalDuration: number; // in milliseconds
  averageSessionDuration: number;
  estimatedTotalTokens: number;
  dailyUsage: {
    sessions: number;
    duration: number;
    estimatedTokens: number;
  };
  applicationVersion: string;
  lastActivity: number;
}

export interface DesktopActivityEvent {
  type: 'session_start' | 'session_end' | 'window_focus' | 'window_blur' | 'activity';
  timestamp: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class ClaudeDesktopMonitor {
  private database: JsonDatabaseManager;
  private wsManager: WebSocketManager;
  private claudeDesktopPath: string;
  private sessions: Map<string, ClaudeDesktopSession> = new Map();
  private fileWatchers: ReturnType<typeof watch>[] = [];
  private isMonitoring: boolean = false;
  private activityEvents: DesktopActivityEvent[] = [];

  // Paths to monitor
  private readonly PATHS = {
    sentrySession: '/Users/jordaaan/Library/Application Support/Claude/sentry/session.json',
    windowState: '/Users/jordaaan/Library/Application Support/Claude/window-state.json',
    cookies: '/Users/jordaaan/Library/Application Support/Claude/Cookies',
    config: '/Users/jordaaan/Library/Application Support/Claude/config.json',
    sessionStorage: '/Users/jordaaan/Library/Application Support/Claude/Session Storage',
    localStorage: '/Users/jordaaan/Library/Application Support/Claude/Local Storage'
  };

  // Token estimation constants (based on typical usage patterns)
  private readonly TOKEN_ESTIMATION = {
    BASE_TOKENS_PER_MINUTE: 50,     // Conservative base rate
    ACTIVITY_MULTIPLIER: 2.5,       // Multiplier for active periods
    MAX_TOKENS_PER_SESSION: 10000   // Reasonable session cap
  };

  constructor(database: JsonDatabaseManager, wsManager: WebSocketManager) {
    this.database = database;
    this.wsManager = wsManager;
    this.claudeDesktopPath = '/Users/jordaaan/Library/Application Support/Claude';
  }

  /**
   * Initialize Claude Desktop monitoring
   */
  async initialize(): Promise<void> {
    try {
      console.log('🖥️ Initializing Claude Desktop Monitor...');
      
      // Check if Claude Desktop directory exists
      await this.ensureDesktopPathExists();
      
      // Load existing sessions from database
      await this.loadExistingSessions();
      
      // Start file monitoring
      await this.startFileMonitoring();
      
      // Process current session state
      await this.processCurrentSessionState();
      
      this.isMonitoring = true;
      console.log('✅ Claude Desktop Monitor initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Claude Desktop Monitor:', error);
      throw error;
    }
  }

  /**
   * Ensure Claude Desktop path exists
   */
  private async ensureDesktopPathExists(): Promise<void> {
    try {
      await fs.access(this.claudeDesktopPath);
    } catch {
      throw new Error(`Claude Desktop not found at ${this.claudeDesktopPath}`);
    }
  }

  /**
   * Load existing sessions from database
   */
  private async loadExistingSessions(): Promise<void> {
    try {
      const allSessions = await this.database.getAllSessions();
      const desktopSessions = allSessions.filter(session => 
        session.name?.includes('Claude Desktop') ||
        (session as any).desktopSessionId
      );
      
      desktopSessions.forEach(session => {
        const desktopSessionId = (session as any).desktopSessionId || session.id.replace('desktop_', '');
        this.sessions.set(desktopSessionId, {
          sessionId: desktopSessionId,
          startTime: session.startTime || session.createdAt,
          endTime: (session as any).endTime,
          duration: session.duration || 0,
          status: session.status === 'active' ? 'active' : 'ended',
          version: (session as any).metadata?.version || 'unknown',
          environment: (session as any).metadata?.environment || 'production',
          errors: (session as any).metadata?.errors || 0,
          estimatedTokens: session.tokensUsed || 0,
          activityEvents: (session as any).metadata?.activityEvents || 0
        });
      });
      
      console.log(`📂 Loaded ${this.sessions.size} existing Claude Desktop sessions`);
    } catch (error) {
      console.error('❌ Failed to load existing sessions:', error);
    }
  }

  /**
   * Start monitoring Claude Desktop files
   */
  private async startFileMonitoring(): Promise<void> {
    const filesToWatch = [
      { path: this.PATHS.sentrySession, handler: this.handleSentrySessionChange.bind(this) },
      { path: this.PATHS.windowState, handler: this.handleWindowStateChange.bind(this) },
      { path: this.PATHS.cookies, handler: this.handleCookiesChange.bind(this) },
      { path: this.PATHS.config, handler: this.handleConfigChange.bind(this) }
    ];

    for (const { path: filePath, handler } of filesToWatch) {
      try {
        // Check if file exists first
        await fs.access(filePath);
        
        const watcher = watch(filePath, { persistent: false }, (eventType) => {
          if (eventType === 'change') {
            handler(filePath);
          }
        });
        
        this.fileWatchers.push(watcher);
      } catch (error) {
        console.log(`ℹ️ File not found, skipping: ${filePath}`);
      }
    }

    console.log('👀 Started monitoring Claude Desktop files');
  }

  /**
   * Handle sentry session file changes
   */
  private async handleSentrySessionChange(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const sessionData = JSON.parse(content);
      
      console.log('📊 Claude Desktop session update detected');
      
      const session: ClaudeDesktopSession = {
        sessionId: sessionData.sid,
        startTime: Math.floor(sessionData.started * 1000), // Convert to milliseconds
        duration: Math.floor((sessionData.duration || 0) * 1000),
        status: sessionData.status === 'ok' ? 'active' : 'error',
        version: sessionData.release || 'unknown',
        environment: sessionData.environment || 'production',
        errors: sessionData.errors || 0,
        estimatedTokens: this.estimateTokenUsage(Math.floor((sessionData.duration || 0) * 1000)),
        activityEvents: 0
      };

      // Update or create session
      const existingSession = this.sessions.get(session.sessionId);
      if (existingSession) {
        session.activityEvents = existingSession.activityEvents;
      }
      
      this.sessions.set(session.sessionId, session);
      
      // Save to database
      await this.saveSessionToDatabase(session);
      
      // Record activity event
      this.recordActivityEvent({
        type: 'session_start',
        timestamp: Date.now(),
        sessionId: session.sessionId,
        metadata: { version: session.version, environment: session.environment }
      });
      
      // Broadcast update
      this.wsManager.broadcast('claude-desktop-session-update', {
        sessionId: session.sessionId,
        type: 'session_update',
        data: session
      });
      
    } catch (error) {
      console.error('❌ Failed to process sentry session change:', error);
    }
  }

  /**
   * Handle window state changes (activity indicator)
   */
  private async handleWindowStateChange(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const windowState = JSON.parse(content);
      
      // Record activity event
      this.recordActivityEvent({
        type: 'activity',
        timestamp: Date.now(),
        metadata: { 
          windowBounds: windowState,
          isMaximized: windowState.isMaximized,
          isFullScreen: windowState.isFullScreen
        }
      });
      
      // Update activity count for active sessions
      this.updateActiveSessionActivity();
      
      // Check if we need to create a new session (user just opened Claude Desktop)
      const hasActiveSession = Array.from(this.sessions.values()).some(s => s.status === 'active');
      if (!hasActiveSession) {
        console.log('🆕 Claude Desktop activity detected - creating new session');
        await this.createActiveSession();
      }
      
      // Broadcast activity
      this.wsManager.broadcast('claude-desktop-activity', {
        type: 'window_activity',
        timestamp: Date.now(),
        isActive: true
      });
      
    } catch (error) {
      console.error('❌ Failed to process window state change:', error);
    }
  }

  /**
   * Handle cookies changes (auth state)
   */
  private async handleCookiesChange(filePath: string): Promise<void> {
    this.recordActivityEvent({
      type: 'activity',
      timestamp: Date.now(),
      metadata: { type: 'auth_change' }
    });
  }

  /**
   * Handle config changes
   */
  private async handleConfigChange(filePath: string): Promise<void> {
    this.recordActivityEvent({
      type: 'activity',
      timestamp: Date.now(),
      metadata: { type: 'config_change' }
    });
  }

  /**
   * Process current session state on startup
   */
  private async processCurrentSessionState(): Promise<void> {
    try {
      // Check multiple possible indicators of active session
      const checks = [
        this.checkSentrySession(),
        this.checkProcessRunning(),
        this.checkRecentActivity()
      ];
      
      const results = await Promise.allSettled(checks);
      const isActive = results.some(r => r.status === 'fulfilled' && r.value === true);
      
      if (isActive) {
        console.log('✅ Claude Desktop session detected as ACTIVE');
        // Create or update active session
        await this.createActiveSession();
      } else {
        console.log('ℹ️ No active Claude Desktop session found');
      }
    } catch (error) {
      console.log('ℹ️ Error checking Claude Desktop session:', error);
    }
  }
  
  /**
   * Check if sentry session indicates active session
   */
  private async checkSentrySession(): Promise<boolean> {
    try {
      const content = await fs.readFile(this.PATHS.sentrySession, 'utf-8');
      const sessionData = JSON.parse(content);
      return sessionData.status === 'ok';
    } catch {
      return false;
    }
  }
  
  /**
   * Check if Claude Desktop process is running
   */
  private async checkProcessRunning(): Promise<boolean> {
    try {
      // Check for Claude Desktop process
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('pgrep -x "Claude" || pgrep -f "Claude.app"', (error: any, stdout: string) => {
          resolve(!error && stdout.trim().length > 0);
        });
      });
    } catch {
      return false;
    }
  }
  
  /**
   * Check for recent file activity
   */
  private async checkRecentActivity(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.PATHS.windowState);
      const minutesAgo = (Date.now() - stats.mtimeMs) / 1000 / 60;
      return minutesAgo < 5; // Active if modified in last 5 minutes
    } catch {
      return false;
    }
  }
  
  /**
   * Create or update active session
   */
  private async createActiveSession(): Promise<void> {
    const sessionId = `desktop_${Date.now()}`;
    const session: ClaudeDesktopSession = {
      sessionId,
      startTime: Date.now(),
      duration: 0,
      status: 'active',
      version: 'unknown',
      environment: 'production',
      errors: 0,
      estimatedTokens: 0,
      activityEvents: 0
    };
    
    this.sessions.set(sessionId, session);
    await this.saveSessionToDatabase(session);
    
    // Broadcast active status
    this.wsManager.broadcast('claude-desktop-status', {
      status: 'SESSION_ACTIVE',
      sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * Estimate token usage based on session duration and activity
   */
  private estimateTokenUsage(durationMs: number): number {
    const durationMinutes = durationMs / (1000 * 60);
    const baseTokens = durationMinutes * this.TOKEN_ESTIMATION.BASE_TOKENS_PER_MINUTE;
    
    // Apply activity multiplier if there are recent activity events
    const recentActivity = this.activityEvents.filter(
      event => Date.now() - event.timestamp < 300000 // Last 5 minutes
    ).length;
    
    const activityMultiplier = recentActivity > 0 ? this.TOKEN_ESTIMATION.ACTIVITY_MULTIPLIER : 1;
    const estimatedTokens = Math.min(
      baseTokens * activityMultiplier,
      this.TOKEN_ESTIMATION.MAX_TOKENS_PER_SESSION
    );
    
    return Math.round(estimatedTokens);
  }

  /**
   * Update activity count for active sessions
   */
  private updateActiveSessionActivity(): void {
    this.sessions.forEach((session, sessionId) => {
      if (session.status === 'active') {
        session.activityEvents++;
        session.estimatedTokens = this.estimateTokenUsage(session.duration);
      }
    });
  }

  /**
   * Record activity event
   */
  private recordActivityEvent(event: DesktopActivityEvent): void {
    this.activityEvents.unshift(event);
    
    // Keep only last 1000 events
    if (this.activityEvents.length > 1000) {
      this.activityEvents = this.activityEvents.slice(0, 1000);
    }
  }

  /**
   * Save session to database
   */
  private async saveSessionToDatabase(session: ClaudeDesktopSession): Promise<void> {
    try {
      const sessionId = `desktop_${session.sessionId}`;
      
      // Check if session already exists
      const existingSession = await this.database.getSession(sessionId);
      
      const sessionData = {
        id: sessionId,
        name: `Claude Desktop - ${session.version}`,
        startTime: session.startTime,
        duration: session.duration,
        tokenBudget: 10000, // Default budget
        tokensUsed: session.estimatedTokens,
        status: session.status === 'active' ? 'active' : 'completed',
        createdAt: session.startTime,
        updatedAt: Date.now(),
        // Store Claude Desktop specific data in a way that doesn't break the interface
        desktopSessionId: session.sessionId,
        metadata: {
          type: 'claude-desktop',
          version: session.version,
          environment: session.environment,
          errors: session.errors,
          activityEvents: session.activityEvents,
          endTime: session.endTime
        }
      };
      
      if (existingSession) {
        await this.database.updateSession(sessionData);
      } else {
        await this.database.createSession(sessionData);
      }
    } catch (error) {
      console.error('❌ Failed to save session to database:', error);
    }
  }

  /**
   * Get current usage metrics
   */
  async getUsageMetrics(): Promise<DesktopUsageMetrics> {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => s.status === 'active');
    
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + s.estimatedTokens, 0);
    
    // Calculate daily usage (last 24 hours)
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const dailySessions = sessions.filter(s => s.startTime > dayAgo);
    const dailyDuration = dailySessions.reduce((sum, s) => sum + s.duration, 0);
    const dailyTokens = dailySessions.reduce((sum, s) => sum + s.estimatedTokens, 0);
    
    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      totalDuration,
      averageSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
      estimatedTotalTokens: totalTokens,
      dailyUsage: {
        sessions: dailySessions.length,
        duration: dailyDuration,
        estimatedTokens: dailyTokens
      },
      applicationVersion: sessions[0]?.version || 'unknown',
      lastActivity: Math.max(...this.activityEvents.map(e => e.timestamp), 0)
    };
  }

  /**
   * Get recent activity events
   */
  getRecentActivity(limit: number = 50): DesktopActivityEvent[] {
    return this.activityEvents.slice(0, limit);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): ClaudeDesktopSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Shutdown monitor
   */
  shutdown(): void {
    console.log('🔴 Shutting down Claude Desktop Monitor...');
    
    this.fileWatchers.forEach(watcher => {
      if (watcher) watcher.close();
    });
    
    this.fileWatchers = [];
    this.isMonitoring = false;
    
    console.log('🔴 Claude Desktop Monitor shut down');
  }
}