/**
 * Session Monitor - Watches sessions.jsonl for real-time tracking
 * Detects session starts, tracks token usage, manages 5-hour windows
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { QuotaTracker } from './quota-tracker.js';

export interface SessionWindow {
  id: string;
  startTime: Date;
  endTime: Date;          // startTime + 5 hours
  cwd: string;
  agent?: string;
  tokensUsed: number;
  status: 'active' | 'complete' | 'expired';
}

export interface SessionEvent {
  type: 'session_start' | 'session_end' | 'tool_use' | 'tool_result' | 'message';
  timestamp: string;
  session_id: string;
  [key: string]: any;
}

export class SessionMonitor {
  private sessionsLogPath: string;
  private trackerPath: string;
  private quotaTracker: QuotaTracker;
  private activeSessions: Map<string, SessionWindow> = new Map();

  constructor() {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    this.sessionsLogPath = path.join(home, '.claude', 'logs', 'sessions.jsonl');
    this.trackerPath = path.join(home, '.claude', 'session-tracker.json');
    this.quotaTracker = new QuotaTracker();
  }

  /**
   * Start monitoring sessions.jsonl in real-time
   */
  async startMonitoring(): Promise<void> {
    console.log('👁️  Session Monitor started');
    console.log(`📁 Watching: ${this.sessionsLogPath}`);
    console.log('');

    // Ensure log directory exists
    const logDir = path.dirname(this.sessionsLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create sessions.jsonl if it doesn't exist
    if (!fs.existsSync(this.sessionsLogPath)) {
      fs.writeFileSync(this.sessionsLogPath, '');
    }

    // Watch for new lines
    await this.watchLogFile();
  }

  /**
   * Watch sessions.jsonl for new events
   */
  private async watchLogFile(): Promise<void> {
    const stream = fs.createReadStream(this.sessionsLogPath, {
      encoding: 'utf-8'
    });

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    // Process existing lines first
    for await (const line of rl) {
      if (line.trim()) {
        this.processEvent(line);
      }
    }

    // Now watch for new lines using tail -F pattern
    this.tailFile();
  }

  /**
   * Tail the file for continuous monitoring
   */
  private tailFile(): void {
    let position = fs.statSync(this.sessionsLogPath).size;

    fs.watch(this.sessionsLogPath, (eventType) => {
      if (eventType === 'change') {
        const stats = fs.statSync(this.sessionsLogPath);
        const newSize = stats.size;

        if (newSize > position) {
          const stream = fs.createReadStream(this.sessionsLogPath, {
            encoding: 'utf-8',
            start: position,
            end: newSize
          });

          const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity
          });

          rl.on('line', (line) => {
            if (line.trim()) {
              this.processEvent(line);
            }
          });

          position = newSize;
        }
      }
    });
  }

  /**
   * Process a single JSONL event
   */
  private processEvent(line: string): void {
    try {
      const event: SessionEvent = JSON.parse(line);

      switch (event.type) {
        case 'session_start':
          this.handleSessionStart(event);
          break;

        case 'session_end':
          this.handleSessionEnd(event);
          break;

        case 'tool_result':
          this.handleToolResult(event);
          break;

        default:
          // Ignore other event types for now
          break;
      }
    } catch (error) {
      // Skip malformed lines
      console.error('Failed to parse event:', error);
    }
  }

  /**
   * Handle session start event
   */
  private handleSessionStart(event: SessionEvent): void {
    const startTime = new Date(event.timestamp);
    const endTime = new Date(startTime.getTime() + 5 * 60 * 60 * 1000);

    const session: SessionWindow = {
      id: event.session_id,
      startTime,
      endTime,
      cwd: event.cwd || process.cwd(),
      agent: event.agent,
      tokensUsed: 0,
      status: 'active'
    };

    this.activeSessions.set(session.id, session);
    this.saveTracker();

    // Check quota status
    const quotaStatus = this.quotaTracker.getStatus();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 New Session Started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Session ID: ${session.id.substring(0, 12)}...`);
    console.log(`Started: ${startTime.toLocaleTimeString()}`);
    console.log(`5-Hour Window: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);
    if (session.agent) {
      console.log(`Agent: ${session.agent}`);
    }
    console.log('');
    console.log(`Token Quota: ${quotaStatus.remaining.toLocaleString()} / ${quotaStatus.limit.toLocaleString()} (${100 - quotaStatus.percent}% available)`);

    if (quotaStatus.percent > 75) {
      console.log('⚠️  WARNING: Low quota remaining!');
      console.log(`   Resets in: ${quotaStatus.timeUntilReset}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Schedule warnings
    this.scheduleWarnings(session);

    // Desktop notification
    this.sendNotification(
      '🎯 Claude Session Started',
      `Working in ${path.basename(session.cwd)}. Quota: ${quotaStatus.remaining.toLocaleString()} tokens`
    );
  }

  /**
   * Handle session end event
   */
  private handleSessionEnd(event: SessionEvent): void {
    const session = this.activeSessions.get(event.session_id);
    if (!session) return;

    session.status = 'complete';
    const duration = event.duration_seconds || 0;
    const tokensUsed = event.tokens_used || session.tokensUsed;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Session Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Session ID: ${session.id.substring(0, 12)}...`);
    console.log(`Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`);
    console.log(`Tokens Used: ${tokensUsed.toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Update quota tracker with final tokens
    if (tokensUsed > session.tokensUsed) {
      this.quotaTracker.trackTokenUsage(session.id, tokensUsed - session.tokensUsed);
    }

    this.activeSessions.delete(event.session_id);
    this.saveTracker();

    // Show updated quota status
    const quotaStatus = this.quotaTracker.getStatus();
    console.log(`Updated Quota: ${quotaStatus.remaining.toLocaleString()} tokens remaining (${quotaStatus.percent}% used)`);
    console.log('');
  }

  /**
   * Handle tool result event (for token estimation)
   */
  private handleToolResult(event: SessionEvent): void {
    const session = this.activeSessions.get(event.session_id);
    if (!session) return;

    // Estimate tokens based on tool type
    const tokens = this.estimateTokens(event.tool, event.result);

    session.tokensUsed += tokens;
    this.quotaTracker.trackTokenUsage(session.id, tokens);

    // Update tracker periodically (every 1000 tokens)
    if (session.tokensUsed % 1000 < tokens) {
      this.saveTracker();
    }
  }

  /**
   * Estimate tokens from tool usage
   */
  private estimateTokens(tool: string, _result?: any): number {
    // Conservative estimates based on typical usage
    const estimates: Record<string, number> = {
      Edit: 1500,      // Edits usually involve reading + writing context
      Write: 1200,     // Writing new files
      Read: 800,       // Reading file content
      Bash: 300,       // Command execution
      Grep: 500,       // Search results
      Glob: 400,       // File listing
      WebFetch: 1000,  // Web content
      Task: 2000       // Subagent calls
    };

    return estimates[tool] || 500; // Default estimate
  }

  /**
   * Schedule warnings for session window
   */
  private scheduleWarnings(session: SessionWindow): void {
    const now = Date.now();
    const end = session.endTime.getTime();

    // 1 hour warning
    const oneHourBefore = end - (60 * 60 * 1000);
    if (oneHourBefore > now) {
      setTimeout(() => {
        this.sendWarning(session, '⏰ 1 hour remaining in 5-hour window');
      }, oneHourBefore - now);
    }

    // 30 minute warning
    const thirtyMinBefore = end - (30 * 60 * 1000);
    if (thirtyMinBefore > now) {
      setTimeout(() => {
        this.sendWarning(session, '⚠️ 30 minutes remaining - wrap up soon');
      }, thirtyMinBefore - now);
    }

    // 5 minute warning
    const fiveMinBefore = end - (5 * 60 * 1000);
    if (fiveMinBefore > now) {
      setTimeout(() => {
        this.sendWarning(session, '🚨 5 minutes left! Save your work');
      }, fiveMinBefore - now);
    }

    // Expiration
    if (end > now) {
      setTimeout(() => {
        this.expireSession(session.id);
      }, end - now);
    }
  }

  /**
   * Send warning notification
   */
  private sendWarning(session: SessionWindow, message: string): void {
    console.log(`${message} (Session: ${session.id.substring(0, 12)}...)`);
    this.sendNotification('Claude Session Warning', message);
  }

  /**
   * Expire a session that reached 5-hour limit
   */
  private expireSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.status = 'expired';
    console.log(`⏱️  Session ${sessionId.substring(0, 12)}... reached 5-hour limit`);

    this.sendNotification(
      '⏱️ Session Expired',
      '5-hour window reached. Consider starting a new session.'
    );
  }

  /**
   * Send desktop notification
   */
  private sendNotification(title: string, message: string): void {
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec(`osascript -e 'display notification "${message}" with title "${title}" sound name "Ping"'`);
    }
  }

  /**
   * Save tracker state
   */
  private saveTracker(): void {
    const sessions = Array.from(this.activeSessions.values()).map(s => ({
      id: s.id,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      cwd: s.cwd,
      agent: s.agent,
      tokensUsed: s.tokensUsed,
      status: s.status
    }));

    const tracker = {
      sessions,
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync(this.trackerPath, JSON.stringify(tracker, null, 2));
  }

  /**
   * Get current active session
   */
  getCurrentSession(): SessionWindow | null {
    const active = Array.from(this.activeSessions.values()).find(
      s => s.status === 'active'
    );
    return active || null;
  }
}
