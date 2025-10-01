/**
 * Session Launcher
 * Launches Claude Code sessions via shell automation
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import type { SessionConfig, CalendarEvent } from './types.js';

export interface SessionHandle {
  pid: number;
  sessionId: string;
  eventId: string;
  projectPath: string;
  phase: string;
  startTime: Date;
  logFilePath: string;
}

export class SessionLauncher {
  private activeSession: SessionHandle | null = null;

  /**
   * Launch Claude Code session from calendar event
   */
  async launchSession(event: CalendarEvent): Promise<SessionHandle> {
    console.log('\n🚀 Launching Claude Code session...\n');
    console.log(`  📁 Project: ${event.sessionConfig.projectName}`);
    console.log(`  🎯 Phase: ${event.sessionConfig.phase}`);
    console.log(`  🤖 Model: ${event.sessionConfig.model}`);
    console.log(`  📊 Token Budget: ${event.sessionConfig.tokenBudget.toLocaleString()}\n`);

    // 1. Generate session ID
    const sessionId = randomUUID();

    // 2. Build instruction prompt
    const prompt = this.buildInstructions(event.sessionConfig);

    // 3. Launch Claude CLI
    const process = await this.launchClaudeCode(
      event.sessionConfig.projectPath,
      event.sessionConfig.model,
      sessionId,
      prompt
    );

    // 4. Calculate log file path
    const logFilePath = this.getLogFilePath(
      event.sessionConfig.projectPath,
      sessionId
    );

    // 5. Create session handle
    const handle: SessionHandle = {
      pid: process.pid!,
      sessionId,
      eventId: event.id,
      projectPath: event.sessionConfig.projectPath,
      phase: event.sessionConfig.phase,
      startTime: new Date(),
      logFilePath
    };

    this.activeSession = handle;
    console.log(`  ✓ Session launched (PID: ${handle.pid})`);
    console.log(`  ✓ Session ID: ${sessionId}`);
    console.log(`  ✓ Log file: ${logFilePath}\n`);

    return handle;
  }

  /**
   * Build instruction prompt for Claude Code session
   */
  private buildInstructions(config: SessionConfig): string {
    return `
# ${config.phase} - ${config.projectName}

## Session Objectives

${config.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

## Constraints

- Token Budget: ${config.tokenBudget.toLocaleString()} tokens
- Model: ${config.model}
- **Important**: Mark each objective complete with: ✓ Completed: [objective description]

## Instructions

Work through each objective methodically. Write production-quality code with proper error handling, types, and documentation. Test your work before marking objectives complete.

When you complete an objective, explicitly state it in the format:
✓ Completed: [Brief description of what was accomplished]

BEGIN SESSION NOW.
    `.trim();
  }

  /**
   * Launch Claude Code via shell
   */
  private async launchClaudeCode(
    projectPath: string,
    model: string,
    sessionId: string,
    prompt: string
  ): Promise<ChildProcess> {
    // Verify project path exists
    try {
      await fs.access(projectPath);
    } catch {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Build arguments for Claude CLI
    const args = [
      '--permission-mode', 'bypassPermissions',
      '--model', model,
      '--session-id', sessionId,
      prompt
    ];

    console.log(`  🔧 Launching: claude ${args.slice(0, 6).join(' ')} <prompt>\n`);

    // Spawn Claude CLI process
    const process = spawn('claude', args, {
      cwd: projectPath,
      detached: true,
      stdio: 'ignore' // Run in background, don't pipe stdio
    });

    // Allow parent process to exit independently
    process.unref();

    // Wait a moment to ensure process started
    await this.delay(1000);

    // Verify process is running
    if (!this.isProcessRunning(process.pid!)) {
      throw new Error('Failed to start Claude Code process');
    }

    return process;
  }

  /**
   * Get log file path for session
   */
  private getLogFilePath(projectPath: string, sessionId: string): string {
    // Encode project path (replace / with -, spaces with -)
    const encoded = projectPath
      .replace(/^\//, '-')
      .replace(/\//g, '-')
      .replace(/\s+/g, '-');

    return path.join(
      os.homedir(),
      '.claude',
      'projects',
      encoded,
      `${sessionId}.jsonl`
    );
  }

  /**
   * Check if process is running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      // Signal 0 checks if process exists without actually sending a signal
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if session is still active
   */
  async isSessionActive(handle: SessionHandle): Promise<boolean> {
    return this.isProcessRunning(handle.pid);
  }

  /**
   * Wait for log file to be created
   */
  async waitForLogFile(logFilePath: string, timeoutMs: number = 30000): Promise<void> {
    console.log(`  ⏳ Waiting for log file to be created...`);

    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        await fs.access(logFilePath);
        console.log(`  ✓ Log file created\n`);
        return;
      } catch {
        await this.delay(500);
      }
    }

    throw new Error(`Log file not created within ${timeoutMs}ms: ${logFilePath}`);
  }

  /**
   * Get current active session
   */
  getActiveSession(): SessionHandle | null {
    return this.activeSession;
  }

  /**
   * Clear active session reference
   */
  clearActiveSession(): void {
    this.activeSession = null;
  }

  /**
   * Terminate a running session
   */
  async terminateSession(handle: SessionHandle): Promise<void> {
    console.log(`\n  🛑 Terminating session ${handle.sessionId}...`);

    try {
      // Send SIGTERM to allow graceful shutdown
      process.kill(handle.pid, 'SIGTERM');

      // Wait up to 5 seconds for graceful shutdown
      const timeout = Date.now() + 5000;
      while (Date.now() < timeout) {
        if (!this.isProcessRunning(handle.pid)) {
          console.log(`  ✓ Session terminated gracefully\n`);
          return;
        }
        await this.delay(500);
      }

      // Force kill if still running
      console.log(`  ⚠️  Forcing session termination...`);
      process.kill(handle.pid, 'SIGKILL');
      console.log(`  ✓ Session terminated\n`);

    } catch (error) {
      // Process might already be dead
      if (!this.isProcessRunning(handle.pid)) {
        console.log(`  ✓ Session already terminated\n`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Helper: delay for ms
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get session information from log file path
   */
  static parseLogFilePath(logPath: string): { projectPath: string; sessionId: string } | null {
    const match = logPath.match(/\.claude\/projects\/(.+)\/([a-f0-9-]+)\.jsonl$/);
    if (!match) return null;

    const encodedPath = match[1];
    const sessionId = match[2];

    // Decode project path
    const projectPath = encodedPath
      .replace(/^-/, '/')
      .replace(/-/g, '/');

    return { projectPath, sessionId };
  }
}
