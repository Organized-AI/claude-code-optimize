/**
 * Calendar Watcher
 * Background service that monitors calendar for upcoming Claude sessions
 */

import { EventEmitter } from 'events';
import { CalendarService } from './calendar-service.js';
import { SessionLauncher, SessionHandle } from './session-launcher.js';
import { LogMonitor, SessionMetrics } from './log-monitor.js';
import { WebSocketServer } from './websocket-server.js';
import type { CalendarEvent } from './types.js';

/**
 * Watcher configuration
 */
export interface WatcherConfig {
  pollIntervalMinutes: number;    // How often to check calendar (default: 5)
  warningMinutes: number[];        // When to show warnings (default: [30, 5])
  autoStart: boolean;              // Auto-start sessions at scheduled time
  websocketPort?: number;          // WebSocket server port (default: 3001)
  enableWebSocket?: boolean;       // Enable WebSocket broadcasting (default: true)
}

/**
 * Watcher state
 */
export interface WatcherState {
  isRunning: boolean;
  lastCheckTime: Date | null;
  upcomingSessions: CalendarEvent[];
  activeSession: boolean;
}

export class CalendarWatcher extends EventEmitter {
  private calendarService: CalendarService;
  private sessionLauncher: SessionLauncher;
  private logMonitor: LogMonitor | null = null;
  private activeSessionHandle: SessionHandle | null = null;
  private websocketServer: WebSocketServer | null = null;
  private config: WatcherConfig;
  private state: WatcherState;
  private pollTimer: NodeJS.Timeout | null = null;
  private warningsShown: Set<string> = new Set();

  constructor(config?: Partial<WatcherConfig>) {
    super();

    this.calendarService = new CalendarService();
    this.sessionLauncher = new SessionLauncher();

    this.config = {
      pollIntervalMinutes: config?.pollIntervalMinutes || 5,
      warningMinutes: config?.warningMinutes || [30, 5],
      autoStart: config?.autoStart !== undefined ? config.autoStart : true,
      websocketPort: config?.websocketPort || 3001,
      enableWebSocket: config?.enableWebSocket !== undefined ? config.enableWebSocket : true
    };

    this.state = {
      isRunning: false,
      lastCheckTime: null,
      upcomingSessions: [],
      activeSession: false
    };

    // Initialize WebSocket server if enabled
    if (this.config.enableWebSocket) {
      this.websocketServer = new WebSocketServer(this.config.websocketPort);
    }
  }

  /**
   * Start watching calendar
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log('  ⚠️  Watcher already running\n');
      return;
    }

    console.log('  👁️  Starting calendar watcher...\n');
    console.log(`  📊 Poll interval: ${this.config.pollIntervalMinutes} minutes`);
    console.log(`  ⏰ Warnings at: ${this.config.warningMinutes.join(', ')} minutes before`);
    console.log(`  🤖 Auto-start: ${this.config.autoStart ? 'Enabled' : 'Disabled'}`);

    // Start WebSocket server if enabled
    if (this.websocketServer) {
      await this.websocketServer.start();
    }

    this.state.isRunning = true;
    this.emit('watcher-started');

    // Do initial check
    await this.checkCalendar();

    // Start polling
    this.pollTimer = setInterval(
      () => this.checkCalendar(),
      this.config.pollIntervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop watching calendar
   */
  async stop(): Promise<void> {
    if (!this.state.isRunning) return;

    console.log('\n  🛑 Stopping calendar watcher...\n');

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Stop log monitoring if active
    if (this.logMonitor) {
      this.logMonitor.stop();
      this.logMonitor = null;
    }

    // Stop WebSocket server if active
    if (this.websocketServer) {
      await this.websocketServer.stop();
    }

    this.state.isRunning = false;
    this.emit('watcher-stopped');
  }

  /**
   * Check calendar for upcoming sessions
   */
  private async checkCalendar(): Promise<void> {
    try {
      this.state.lastCheckTime = new Date();

      // Get upcoming Claude sessions
      const sessions = await this.calendarService.listUpcomingSessions();
      this.state.upcomingSessions = sessions;

      const now = new Date();

      for (const session of sessions) {
        const minutesUntilStart = Math.floor(
          (session.start.getTime() - now.getTime()) / 60000
        );

        // Skip if session has already started or ended
        if (minutesUntilStart < 0 || now > session.end) {
          continue;
        }

        // Check if it's time to start the session
        if (minutesUntilStart <= 0 && !this.state.activeSession) {
          await this.triggerSession(session);
          continue;
        }

        // Check if we should show warnings
        for (const warningMinutes of this.config.warningMinutes) {
          if (minutesUntilStart <= warningMinutes && minutesUntilStart > 0) {
            const warningKey = `${session.id}-${warningMinutes}`;

            if (!this.warningsShown.has(warningKey)) {
              this.showWarning(session, minutesUntilStart);
              this.warningsShown.add(warningKey);
            }
          }
        }
      }

      this.emit('check-complete', {
        timestamp: this.state.lastCheckTime,
        sessionsFound: sessions.length
      });

    } catch (error) {
      console.error('  ❌ Error checking calendar:', error);
      this.emit('check-error', error);
    }
  }

  /**
   * Show warning for upcoming session
   */
  private showWarning(session: CalendarEvent, minutesUntil: number): void {
    console.log('\n⏰ ════════════════════════════════════════════════════════════════');
    console.log(`\n  📅 Session starting in ${minutesUntil} minutes\n`);
    console.log(`  Project: ${session.sessionConfig.projectName}`);
    console.log(`  Phase: ${session.sessionConfig.phase}`);
    console.log(`  Model: ${session.sessionConfig.model}`);
    console.log(`  Time: ${session.start.toLocaleTimeString()} - ${session.end.toLocaleTimeString()}`);
    console.log('\n════════════════════════════════════════════════════════════════\n');

    // Show system notification (macOS)
    if (process.platform === 'darwin') {
      this.showSystemNotification(
        'Claude Session Starting Soon',
        `${session.sessionConfig.phase} in ${minutesUntil} minutes`
      );
    }

    this.emit('session-warning', {
      session,
      minutesUntil
    });
  }

  /**
   * Trigger session start
   */
  private async triggerSession(session: CalendarEvent): Promise<void> {
    if (this.state.activeSession) {
      console.log('  ⚠️  Session already active, skipping auto-start\n');
      return;
    }

    console.log('\n🚨 ════════════════════════════════════════════════════════════════');
    console.log('\n  🎯 SESSION START TIME REACHED\n');
    console.log(`  Project: ${session.sessionConfig.projectName}`);
    console.log(`  Phase: ${session.sessionConfig.phase}`);
    console.log('\n════════════════════════════════════════════════════════════════\n');

    if (!this.config.autoStart) {
      console.log('  ℹ️  Auto-start disabled.');
      this.emit('session-ready', session);
      return;
    }

    // Auto-start enabled
    console.log('  🤖 Auto-starting session in 5 seconds...');
    console.log('     Press Ctrl+C to cancel\n');

    await this.delay(5000);

    try {
      this.state.activeSession = true;
      this.emit('session-starting', session);

      // Launch session via shell
      const handle = await this.sessionLauncher.launchSession(session);
      this.activeSessionHandle = handle;

      // Wait for log file to be created
      await this.sessionLauncher.waitForLogFile(handle.logFilePath);

      // Start log monitoring
      this.logMonitor = new LogMonitor(handle.logFilePath, session.sessionConfig.model);

      // Set up log monitor event handlers
      this.setupLogMonitorHandlers();

      // Start monitoring
      await this.logMonitor.start();

      // Show system notification
      if (process.platform === 'darwin') {
        this.showSystemNotification(
          'Claude Session Started',
          `${session.sessionConfig.phase} is now running`
        );
      }

      // Broadcast session start to dashboard
      this.websocketServer?.broadcast({
        type: 'session:start',
        data: {
          sessionId: handle.sessionId,
          projectName: session.sessionConfig.projectName,
          phase: session.sessionConfig.phase,
          model: session.sessionConfig.model,
          objectives: session.sessionConfig.objectives,
          startTime: handle.startTime
        },
        timestamp: new Date()
      });

      console.log('  ✓ Session monitoring active\n');

    } catch (error) {
      console.error('\n  ❌ Session start failed:', error);
      this.state.activeSession = false;
      this.activeSessionHandle = null;
      if (this.logMonitor) {
        this.logMonitor.stop();
        this.logMonitor = null;
      }
      throw error;
    }
  }

  /**
   * Set up log monitor event handlers
   */
  private setupLogMonitorHandlers(): void {
    if (!this.logMonitor) return;

    // Forward objective completions
    this.logMonitor.on('objective-complete', (objective) => {
      console.log(`  ✅ ${objective}`);
      this.emit('session-update', { type: 'objective', content: objective });

      // Broadcast to dashboard
      this.websocketServer?.broadcast({
        type: 'session:objective',
        data: { objective },
        timestamp: new Date()
      });
    });

    // Forward token updates
    this.logMonitor.on('token-update', (tokenData) => {
      this.emit('session-update', { type: 'tokens', data: tokenData });

      // Broadcast to dashboard
      this.websocketServer?.broadcast({
        type: 'session:tokens',
        data: tokenData,
        timestamp: new Date()
      });
    });

    // Forward tool usage
    this.logMonitor.on('tool-use', (tool) => {
      this.emit('session-update', { type: 'tool', data: tool });

      // Broadcast to dashboard
      this.websocketServer?.broadcast({
        type: 'session:tool',
        data: tool,
        timestamp: new Date()
      });
    });

    // Handle session completion (detect when Claude CLI exits)
    this.logMonitor.on('monitoring-stopped', () => {
      if (this.activeSessionHandle) {
        this.handleSessionComplete();
      }
    });

    // Handle monitoring errors
    this.logMonitor.on('monitoring-error', (error) => {
      console.error('  ❌ Monitoring error:', error);
      this.emit('session-error', error);

      // Broadcast error to dashboard
      this.websocketServer?.broadcast({
        type: 'session:error',
        data: { error: error.message || String(error) },
        timestamp: new Date()
      });
    });
  }

  /**
   * Handle session completion
   */
  private async handleSessionComplete(): Promise<void> {
    if (!this.logMonitor || !this.activeSessionHandle) return;

    console.log('\n✅ Session completed!\n');

    try {
      // Get final metrics
      const metrics = this.logMonitor.getMetrics();
      this.printSessionSummary(metrics);

      this.emit('session-complete', metrics);

      // Broadcast completion to dashboard
      this.websocketServer?.broadcast({
        type: 'session:complete',
        data: {
          sessionId: this.activeSessionHandle.sessionId,
          metrics,
          completedAt: new Date()
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error getting session metrics:', error);
    } finally {
      this.state.activeSession = false;
      this.activeSessionHandle = null;
      this.logMonitor = null;
    }
  }

  /**
   * Print session summary
   */
  private printSessionSummary(metrics: SessionMetrics): void {
    console.log('📊 Session Summary');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log(`  Duration: ${this.formatDuration(metrics.startTime, metrics.lastUpdate)}`);
    console.log(`  Tokens Used: ${metrics.tokensUsed.toLocaleString()}`);
    console.log(`    • Input: ${metrics.inputTokens.toLocaleString()}`);
    console.log(`    • Output: ${metrics.outputTokens.toLocaleString()}`);
    console.log(`    • Cache: ${metrics.cacheTokens.toLocaleString()}`);
    console.log(`  Estimated Cost: $${metrics.estimatedCost.toFixed(2)}`);
    console.log(`  Tool Calls: ${metrics.toolCalls}`);
    console.log(`  Messages: ${metrics.messageCount}`);

    if (metrics.objectivesCompleted.length > 0) {
      console.log(`\n  Objectives Completed: ${metrics.objectivesCompleted.length}`);
      console.log('\n  ✅ Completed:');
      metrics.objectivesCompleted.forEach(obj => {
        console.log(`     • ${obj}`);
      });
    }

    console.log('\n════════════════════════════════════════════════════════════════\n');
  }

  /**
   * Format duration between two dates
   */
  private formatDuration(start: Date, end: Date): string {
    const ms = end.getTime() - start.getTime();
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Show macOS system notification
   */
  private showSystemNotification(title: string, message: string): void {
    try {
      // Use osascript for macOS notifications
      const { exec } = require('child_process');
      exec(`osascript -e 'display notification "${message}" with title "${title}"'`);
    } catch (error) {
      // Silently fail if notifications aren't supported
    }
  }

  /**
   * Helper: delay for ms
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current watcher state
   */
  getState(): WatcherState {
    return { ...this.state };
  }

  /**
   * Manually trigger a session check
   */
  async checkNow(): Promise<void> {
    console.log('  🔄 Checking calendar now...\n');
    await this.checkCalendar();
  }

  /**
   * Get upcoming sessions
   */
  getUpcomingSessions(): CalendarEvent[] {
    return [...this.state.upcomingSessions];
  }
}
