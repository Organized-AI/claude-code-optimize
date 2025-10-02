# Session 2 Revision Plan: From SDK to Shell Automation

**Status**: 🔄 Session 2 Learning Experience → Session 2.5 Corrected Implementation
**Created**: 2025-09-30
**Reason**: Architecture pivot from Claude Agent SDK to shell automation

---

## Executive Summary

Session 2 successfully implemented Google Calendar integration and OAuth authentication, but incorrectly used the Claude Agent SDK to control Claude Code sessions. The SDK is designed for **building agents that run inside Claude Code**, not for **controlling Claude Code from outside**.

**What We Learned**: Calendar scheduling works perfectly. Session execution needs a complete architectural pivot to shell automation.

**What We Keep**: `oauth-helper.ts`, `calendar-service.ts`, all calendar CLI commands, OAuth flow
**What We Replace**: `session-manager.ts`, `calendar-watcher.ts` - both need shell automation approach

---

## Session 2 Analysis: What Worked, What Didn't

### ✅ What We Got RIGHT

#### 1. OAuth Authentication (`oauth-helper.ts` - 255 lines)
**Status**: ✅ KEEP AS-IS - This is production-ready

```typescript
// This works perfectly and should not be changed
export class OAuthHelper {
  async getAuthenticatedClient(): Promise<OAuth2Client>
  private async authenticate(): Promise<void>
  private async startCallbackServer(): Promise<string>
  async clearToken(): Promise<void>
  async isAuthenticated(): Promise<boolean>
}
```

**Why it's correct**:
- Clean browser-based OAuth flow
- Secure token storage in `~/.claude-optimizer/token.json`
- Proper error handling and token refresh
- Follows Google OAuth best practices

#### 2. Calendar Service (`calendar-service.ts` - 395 lines)
**Status**: ✅ KEEP AS-IS - This is production-ready

```typescript
// Smart scheduling algorithm works correctly
export class CalendarService {
  async createSessionSchedule(analysis, preferences): Promise<CalendarEvent[]>
  private async findAvailableSlots(start, needed, prefs): Promise<TimeSlot[]>
  private async getFreeBusy(start, end): Promise<TimeSlot[]>
  async listUpcomingSessions(): Promise<CalendarEvent[]>
  async getEvent(eventId): Promise<CalendarEvent | null>
  async deleteEvent(eventId): Promise<void>
}
```

**Why it's correct**:
- Intelligent conflict detection with free/busy API
- Respects working hours and day preferences
- Stores session config in event metadata
- Clean event lifecycle management

#### 3. Calendar CLI Commands (`cli.ts` additions)
**Status**: ✅ KEEP - Minor modifications needed

```bash
claude-optimizer calendar schedule <project-path>  # ✅ Keep
claude-optimizer calendar list                      # ✅ Keep
claude-optimizer calendar watch                     # ⚠️ Keep command, update implementation
claude-optimizer calendar logout                    # ✅ Keep
```

**What works**: Command structure, option parsing, calendar service integration
**What needs change**: `watch` command implementation (see below)

#### 4. Type Definitions (`types.ts`)
**Status**: ✅ KEEP - Add shell automation types

```typescript
// These types are perfect
export interface CalendarEvent { ... }
export interface SessionConfig { ... }
export interface SchedulePreferences { ... }
export interface TimeSlot { ... }

// Need to ADD shell automation types (see Section 4)
```

---

### ❌ What We Got WRONG

#### 1. Session Manager (`session-manager.ts` - 366 lines)
**Status**: ❌ COMPLETELY REPLACE

**Current (WRONG) Approach**:
```typescript
// This was the fundamental mistake
export class SessionManager extends EventEmitter {
  async startSessionFromEvent(event: CalendarEvent): Promise<void> {
    const session = query({  // ❌ WRONG: SDK query() is for building agents
      prompt: this.buildSessionPrompt(event.sessionConfig),
      options: {
        model: this.getModelName(event.sessionConfig.model),
        permissionMode: 'bypassPermissions',  // ❌ This doesn't control Claude Code
        settingSources: ['project'],
        allowedTools: event.sessionConfig.tools
      }
    });

    // ❌ WRONG: This runs an agent, doesn't control Claude Code sessions
    for await (const message of session) {
      await this.processMessage(message);
    }
  }
}
```

**Why it's wrong**:
- `query()` SDK API is for agents running **inside** Claude Code
- Cannot control Claude Code application from outside
- `permissionMode` and `allowedTools` don't apply to external control
- No access to actual Claude Code session state

**Corrected Approach** (see Section 3 for full implementation):
```typescript
// Use shell automation instead
export class SessionLauncher {
  async launchSession(event: CalendarEvent): Promise<SessionHandle> {
    // 1. Create instruction file with objectives
    await this.createInstructionFile(event.sessionConfig);

    // 2. Launch Claude Code via shell
    const process = await this.launchClaudeCode(
      event.sessionConfig.projectPath,
      event.sessionConfig.model
    );

    // 3. Return handle for monitoring
    return new SessionHandle(process.pid, event.id);
  }

  // Launch via AppleScript/shell
  private async launchClaudeCode(projectPath: string, model: string): Promise<ChildProcess>
}
```

#### 2. Calendar Watcher (`calendar-watcher.ts` - 267 lines)
**Status**: ❌ PARTIALLY REPLACE - Keep polling logic, replace session start

**Current (WRONG) Approach**:
```typescript
// Calendar polling logic is correct ✅
private async checkCalendar(): Promise<void> {
  const sessions = await this.calendarService.listUpcomingSessions();  // ✅ Good
  const now = new Date();

  for (const session of sessions) {
    const minutesUntilStart = Math.floor(
      (session.start.getTime() - now.getTime()) / 60000
    );

    if (minutesUntilStart <= 0 && !this.state.activeSession) {
      await this.triggerSession(session);  // ❌ Wrong implementation
    }
  }
}

// This is where it goes wrong
private async triggerSession(session: CalendarEvent): Promise<void> {
  await this.sessionManager.startSessionFromEvent(session);  // ❌ Uses SDK
}
```

**Corrected Approach**:
```typescript
// Keep polling logic, replace session trigger
private async triggerSession(session: CalendarEvent): Promise<void> {
  // Use shell launcher instead
  const handle = await this.sessionLauncher.launchSession(session);

  // Start log file monitoring
  const monitor = new LogMonitor(handle.pid);
  monitor.on('objective-complete', (obj) => {
    this.emit('session-update', { type: 'objective', content: obj });
  });

  this.state.activeSession = handle;
}
```

#### 3. Dependency on Claude Agent SDK
**Status**: ❌ REMOVE

```json
// package.json - REMOVE this dependency
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.1"  // ❌ Remove
  }
}
```

**Why remove it**:
- We don't need it for controlling Claude Code
- Creates confusion about architecture
- Adds unnecessary bundle size

---

## Corrected Architecture: Shell Automation

### Architectural Principle

> **Rule**: To control Claude Code from outside, use shell commands. To monitor sessions, parse log files.

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Optimizer CLI                     │
│  (Node.js TypeScript Application - External Controller)     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Shell Commands (AppleScript/bash)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code Application                   │
│              (Separate macOS Application)                    │
│                                                              │
│  Writes logs to: ~/.claude/logs/*.jsonl                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Log File Monitoring (tail -f)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      Log Monitor Service                     │
│              (Parses JSONL, emits events)                   │
└─────────────────────────────────────────────────────────────┘
```

### Shell Automation Strategy

#### Option 1: AppleScript (macOS GUI Automation)
```applescript
tell application "Claude"
  activate
  -- Open project
  -- Send instructions via UI automation
end tell
```

**Pros**: Can interact with GUI directly
**Cons**: Brittle, requires accessibility permissions, GUI-dependent

#### Option 2: CLI Wrapper (If Available)
```bash
claude-code --project "/path/to/project" \
            --model "sonnet" \
            --instruction-file "/tmp/session-instructions.txt"
```

**Pros**: Clean, reliable, scriptable
**Cons**: Requires Claude Code CLI (check if exists)

#### Option 3: URL Scheme (If Supported)
```bash
open "claude://project?path=/path/to/project&instruction=file:///tmp/instructions.txt"
```

**Pros**: Simple, OS-native
**Cons**: Limited parameter passing

**Recommended**: Start with Option 2 (CLI), fallback to Option 1 (AppleScript) if needed

---

## Session 2.5 Implementation Plan

### Phase 1: Research & Preparation (30 mins)

**Tasks**:
1. Check if Claude Code has CLI interface
   ```bash
   claude --help
   claude-code --help
   which claude
   ```

2. Examine log file format
   ```bash
   tail -f ~/.claude/logs/*.jsonl
   # Start a manual session and observe output
   ```

3. Research AppleScript automation if needed
   ```bash
   osascript -e 'tell application "System Events" to get name of processes'
   ```

**Deliverables**:
- `SHELL_RESEARCH.md` - Document findings
- Example log entries in `docs/log-format-examples.jsonl`
- Test script: `scripts/test-launch.sh`

---

### Phase 2: Core Components Replacement (2-3 hours)

#### 2.1 Replace SessionManager with SessionLauncher

**New File**: `src/session-launcher.ts` (~200 lines)

```typescript
/**
 * Session Launcher
 * Launches Claude Code sessions via shell automation
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { SessionConfig, CalendarEvent } from './types.js';

export interface SessionHandle {
  pid: number;
  eventId: string;
  projectPath: string;
  phase: string;
  startTime: Date;
}

export class SessionLauncher {
  private activeSession: SessionHandle | null = null;

  /**
   * Launch Claude Code session from calendar event
   */
  async launchSession(event: CalendarEvent): Promise<SessionHandle> {
    // 1. Create instruction file
    const instructionPath = await this.createInstructionFile(event.sessionConfig);

    // 2. Launch Claude Code
    const process = await this.launchClaudeCode(
      event.sessionConfig.projectPath,
      event.sessionConfig.model,
      instructionPath
    );

    // 3. Create session handle
    const handle: SessionHandle = {
      pid: process.pid!,
      eventId: event.id,
      projectPath: event.sessionConfig.projectPath,
      phase: event.sessionConfig.phase,
      startTime: new Date()
    };

    this.activeSession = handle;
    return handle;
  }

  /**
   * Create instruction file for session
   */
  private async createInstructionFile(config: SessionConfig): Promise<string> {
    const instructions = this.buildInstructions(config);
    const tmpDir = path.join(os.tmpdir(), 'claude-optimizer');
    await fs.mkdir(tmpDir, { recursive: true });

    const instructionPath = path.join(tmpDir, `session-${Date.now()}.txt`);
    await fs.writeFile(instructionPath, instructions, 'utf-8');

    return instructionPath;
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
- Mark each objective complete with: ✓ Completed: [objective description]

## Instructions

Work through each objective methodically. Write production-quality code with proper error handling and documentation. Test your work before marking objectives complete.

BEGIN SESSION NOW.
    `.trim();
  }

  /**
   * Launch Claude Code via shell (implementation depends on research findings)
   */
  private async launchClaudeCode(
    projectPath: string,
    model: string,
    instructionPath: string
  ): Promise<ChildProcess> {
    // TODO: Update based on Phase 1 research findings

    // Option A: CLI approach (if available)
    const args = [
      '--project', projectPath,
      '--model', model,
      '--instruction-file', instructionPath
    ];

    const process = spawn('claude-code', args, {
      detached: true,
      stdio: 'ignore'
    });

    process.unref(); // Allow parent to exit

    return process;

    // Option B: AppleScript approach (if CLI not available)
    // See appleScriptLaunch() method below
  }

  /**
   * Alternative: Launch via AppleScript (if CLI not available)
   */
  private async appleScriptLaunch(
    projectPath: string,
    instructionPath: string
  ): Promise<ChildProcess> {
    const script = `
      tell application "Claude"
        activate
        delay 1
        -- TODO: Add UI automation based on Claude Code's UI structure
      end tell
    `;

    const process = spawn('osascript', ['-e', script], {
      detached: true,
      stdio: 'ignore'
    });

    process.unref();
    return process;
  }

  /**
   * Check if Claude Code process is running
   */
  async isSessionActive(handle: SessionHandle): Promise<boolean> {
    try {
      // Check if process exists
      process.kill(handle.pid, 0); // Signal 0 checks existence
      return true;
    } catch {
      return false;
    }
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
}
```

**Tests**: `tests/session-launcher.test.ts`
- Test instruction file creation
- Test process spawning (mocked)
- Test session handle management

#### 2.2 Create Log Monitor Service

**New File**: `src/log-monitor.ts` (~300 lines)

```typescript
/**
 * Log Monitor
 * Monitors Claude Code log files for session activity
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  data?: any;
}

export interface SessionMetrics {
  tokensUsed: number;
  estimatedCost: number;
  toolCalls: number;
  objectivesCompleted: string[];
}

export class LogMonitor extends EventEmitter {
  private tailProcess: ChildProcess | null = null;
  private logPath: string;
  private metrics: SessionMetrics;
  private isMonitoring = false;

  constructor(sessionPid?: number) {
    super();
    this.logPath = this.getLatestLogPath();
    this.metrics = {
      tokensUsed: 0,
      estimatedCost: 0,
      toolCalls: 0,
      objectivesCompleted: []
    };
  }

  /**
   * Start monitoring log files
   */
  async start(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('  ⚠️  Log monitor already running');
      return;
    }

    console.log(`  📋 Monitoring logs: ${this.logPath}`);

    // Use tail -f to follow log file
    this.tailProcess = spawn('tail', ['-f', '-n', '0', this.logPath]);

    this.tailProcess.stdout?.on('data', (data) => {
      this.processLogChunk(data.toString());
    });

    this.tailProcess.stderr?.on('data', (data) => {
      console.error('  ❌ Log monitor error:', data.toString());
    });

    this.tailProcess.on('close', () => {
      this.isMonitoring = false;
      this.emit('monitoring-stopped');
    });

    this.isMonitoring = true;
    this.emit('monitoring-started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.tailProcess) {
      this.tailProcess.kill();
      this.tailProcess = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Process chunk of log data
   */
  private processLogChunk(chunk: string): void {
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        this.processLogEntry(entry);
      } catch (error) {
        // Not JSON, might be plain text log
        this.emit('log-text', line);
      }
    }
  }

  /**
   * Process individual log entry
   */
  private processLogEntry(entry: LogEntry): void {
    this.emit('log-entry', entry);

    // Detect objective completions
    if (entry.message) {
      const completionPattern = /✓\s*(?:Completed|Done|Finished):\s*(.+)/i;
      const match = entry.message.match(completionPattern);

      if (match) {
        const objective = match[1].trim();
        if (!this.metrics.objectivesCompleted.includes(objective)) {
          this.metrics.objectivesCompleted.push(objective);
          this.emit('objective-complete', objective);
          console.log(`  ✅ Objective completed: ${objective}`);
        }
      }
    }

    // Detect tool usage
    if (entry.data?.tool_name) {
      this.metrics.toolCalls++;
      this.emit('tool-use', entry.data.tool_name);
    }

    // Detect token usage
    if (entry.data?.usage?.total_tokens) {
      this.metrics.tokensUsed = entry.data.usage.total_tokens;
      this.emit('token-update', this.metrics.tokensUsed);
    }

    // Detect errors
    if (entry.level === 'error') {
      this.emit('session-error', entry.message);
    }

    // Detect session end
    if (entry.message?.includes('Session completed')) {
      this.emit('session-complete', this.metrics);
    }
  }

  /**
   * Get latest log file path
   */
  private getLatestLogPath(): string {
    // TODO: Implement based on actual log file location
    // Example: ~/.claude/logs/session-2025-09-30.jsonl
    const logsDir = path.join(os.homedir(), '.claude', 'logs');

    // For now, return expected path
    // In real implementation, scan directory for latest file
    const today = new Date().toISOString().split('T')[0];
    return path.join(logsDir, `session-${today}.jsonl`);
  }

  /**
   * Get current metrics
   */
  getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}
```

**Tests**: `tests/log-monitor.test.ts`
- Test log parsing
- Test objective detection
- Test metrics tracking
- Test event emission

#### 2.3 Update Calendar Watcher

**Modified File**: `src/calendar-watcher.ts` (~300 lines)

Changes needed:
```typescript
// Replace SessionManager import
import { SessionManager } from './session-manager.js';  // ❌ Remove
import { SessionLauncher } from './session-launcher.js'; // ✅ Add
import { LogMonitor } from './log-monitor.js';           // ✅ Add

export class CalendarWatcher extends EventEmitter {
  private calendarService: CalendarService;
  private sessionLauncher: SessionLauncher;  // ✅ Changed
  private logMonitor: LogMonitor | null = null;  // ✅ Added

  constructor(config?: Partial<WatcherConfig>) {
    super();
    this.calendarService = new CalendarService();
    this.sessionLauncher = new SessionLauncher();  // ✅ Changed

    // Remove old event forwarding
  }

  /**
   * Trigger session start (UPDATED)
   */
  private async triggerSession(session: CalendarEvent): Promise<void> {
    if (this.state.activeSession) {
      console.log('  ⚠️  Session already active, skipping auto-start\\n');
      return;
    }

    console.log('\\n🚨 ════════════════════════════════════════════════════════════════');
    console.log('\\n  🎯 SESSION START TIME REACHED\\n');
    console.log(`  Project: ${session.sessionConfig.projectName}`);
    console.log(`  Phase: ${session.sessionConfig.phase}`);
    console.log('\\n════════════════════════════════════════════════════════════════\\n');

    if (!this.config.autoStart) {
      console.log('  ℹ️  Auto-start disabled.');
      this.emit('session-ready', session);
      return;
    }

    console.log('  🤖 Auto-starting session in 5 seconds...');
    console.log('     Press Ctrl+C to cancel\\n');
    await this.delay(5000);

    try {
      // ✅ NEW: Launch via shell
      const handle = await this.sessionLauncher.launchSession(session);
      this.state.activeSession = true;

      // ✅ NEW: Start log monitoring
      this.logMonitor = new LogMonitor(handle.pid);

      this.logMonitor.on('objective-complete', (objective) => {
        console.log(`  ✅ ${objective}`);
        this.emit('session-update', { type: 'objective', content: objective });
      });

      this.logMonitor.on('session-complete', (metrics) => {
        console.log('\\n✅ Session completed!\\n');
        this.printSessionSummary(metrics);
        this.state.activeSession = false;
        this.emit('session-complete', metrics);
      });

      this.logMonitor.on('session-error', (error) => {
        console.error('\\n❌ Session error:', error);
        this.emit('session-error', new Error(error));
      });

      await this.logMonitor.start();

      this.emit('session-starting', session);

      if (process.platform === 'darwin') {
        this.showSystemNotification(
          'Claude Session Started',
          `${session.sessionConfig.phase} is now running`
        );
      }

    } catch (error) {
      console.error('\\n  ❌ Session start failed:', error);
      this.state.activeSession = false;
      throw error;
    }
  }

  /**
   * Print session summary (NEW)
   */
  private printSessionSummary(metrics: SessionMetrics): void {
    console.log('\\n📊 Session Summary');
    console.log('════════════════════════════════════════════════════════════════\\n');
    console.log(`  Tokens Used: ${metrics.tokensUsed.toLocaleString()}`);
    console.log(`  Estimated Cost: $${metrics.estimatedCost.toFixed(2)}`);
    console.log(`  Tool Calls: ${metrics.toolCalls}`);
    console.log(`\\n  Objectives Completed: ${metrics.objectivesCompleted.length}`);

    if (metrics.objectivesCompleted.length > 0) {
      console.log('\\n  ✅ Completed:');
      metrics.objectivesCompleted.forEach(obj => {
        console.log(`     • ${obj}`);
      });
    }

    console.log('\\n════════════════════════════════════════════════════════════════\\n');
  }

  /**
   * Stop watching (UPDATED)
   */
  stop(): void {
    if (!this.state.isRunning) return;

    console.log('\\n  🛑 Stopping calendar watcher...\\n');

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // ✅ NEW: Stop log monitoring
    if (this.logMonitor) {
      this.logMonitor.stop();
      this.logMonitor = null;
    }

    this.state.isRunning = false;
    this.emit('watcher-stopped');
  }
}
```

#### 2.4 Add New Type Definitions

**Modified File**: `src/types.ts`

Add to bottom of file:
```typescript
// ============================================
// Shell Automation Types
// ============================================

export interface SessionHandle {
  pid: number;
  eventId: string;
  projectPath: string;
  phase: string;
  startTime: Date;
}

export interface SessionMetrics {
  tokensUsed: number;
  estimatedCost: number;
  toolCalls: number;
  objectivesCompleted: string[];
}

export interface LogEntry {
  timestamp: Date;
  level: string;
  message: string;
  data?: any;
}
```

---

### Phase 3: Testing & Validation (1-2 hours)

#### 3.1 Manual Testing

**Test Script**: `scripts/test-session-2.5.sh`

```bash
#!/bin/bash

echo "🧪 Testing Session 2.5 Shell Automation"
echo "========================================"

# 1. Test session launcher
echo ""
echo "Test 1: Launching test session..."
npm run test:launcher

# 2. Test log monitoring
echo ""
echo "Test 2: Log file monitoring..."
npm run test:log-monitor

# 3. Test calendar watcher integration
echo ""
echo "Test 3: Calendar watcher..."
npm run test:watcher

# 4. End-to-end test (if possible)
echo ""
echo "Test 4: End-to-end session..."
npm run test:e2e

echo ""
echo "✅ All tests complete!"
```

#### 3.2 Unit Tests

Create comprehensive tests:
- `tests/session-launcher.test.ts` - Test launching logic
- `tests/log-monitor.test.ts` - Test log parsing
- `tests/calendar-watcher.test.ts` - Update existing tests

Target coverage: 80%+

#### 3.3 Integration Test

**Test File**: `tests/integration/full-session.test.ts`

```typescript
describe('Full Session Integration', () => {
  it('should schedule, launch, and monitor a session', async () => {
    // 1. Create test project analysis
    const analysis = createTestAnalysis();

    // 2. Schedule in calendar
    const events = await calendarService.createSessionSchedule(
      analysis,
      testPreferences
    );

    // 3. Launch session
    const handle = await sessionLauncher.launchSession(events[0]);
    expect(handle.pid).toBeGreaterThan(0);

    // 4. Monitor logs
    const monitor = new LogMonitor(handle.pid);
    const objectivePromise = new Promise((resolve) => {
      monitor.once('objective-complete', resolve);
    });

    await monitor.start();

    // 5. Wait for first objective
    const objective = await objectivePromise;
    expect(objective).toBeDefined();

    monitor.stop();
  }, 60000); // 1 minute timeout
});
```

---

### Phase 4: Documentation & Cleanup (30 mins)

#### 4.1 Update Documentation

**Files to Update**:
- `README.md` - Add shell automation section
- `SESSION_2_HANDOFF.md` - Mark as deprecated, link to this document
- `ARCHITECTURE.md` - Update with corrected flow

#### 4.2 Remove Old Code

```bash
# Remove deprecated files
rm src/session-manager.ts

# Remove SDK dependency
npm uninstall @anthropic-ai/claude-agent-sdk

# Update imports across codebase
# (Done via Edit tool in Phase 2)
```

#### 4.3 Create Migration Guide

**New File**: `docs/MIGRATION_SESSION_2_TO_2.5.md`

Summary of changes for anyone who started using Session 2 code.

---

## Implementation Checklist

### Phase 1: Research ✅ (30 mins)
- [ ] Check for Claude Code CLI
- [ ] Examine log file format
- [ ] Test shell automation options
- [ ] Create `SHELL_RESEARCH.md`
- [ ] Create example log entries

### Phase 2: Core Components ✅ (2-3 hours)
- [ ] Create `src/session-launcher.ts`
- [ ] Create `src/log-monitor.ts`
- [ ] Update `src/calendar-watcher.ts`
- [ ] Update `src/types.ts`
- [ ] Remove `src/session-manager.ts`
- [ ] Update imports in `src/cli.ts`
- [ ] Remove SDK from `package.json`

### Phase 3: Testing ✅ (1-2 hours)
- [ ] Create `tests/session-launcher.test.ts`
- [ ] Create `tests/log-monitor.test.ts`
- [ ] Update `tests/calendar-watcher.test.ts`
- [ ] Create `tests/integration/full-session.test.ts`
- [ ] Create `scripts/test-session-2.5.sh`
- [ ] Run all tests, ensure 80%+ coverage

### Phase 4: Documentation ✅ (30 mins)
- [ ] Update `README.md`
- [ ] Mark `SESSION_2_HANDOFF.md` as deprecated
- [ ] Create `docs/MIGRATION_SESSION_2_TO_2.5.md`
- [ ] Update `ARCHITECTURE.md`

---

## Success Criteria

Session 2.5 is complete when:

1. ✅ Claude Code sessions can be launched via shell automation
2. ✅ Log files are successfully monitored for session progress
3. ✅ Calendar watcher auto-starts sessions using shell approach
4. ✅ All unit tests pass with 80%+ coverage
5. ✅ Integration test demonstrates full workflow
6. ✅ No dependency on `@anthropic-ai/claude-agent-sdk`
7. ✅ Documentation accurately reflects shell automation architecture

---

## Timeline Estimate

**Total Time**: 4-6 hours

- Phase 1 (Research): 30 mins
- Phase 2 (Implementation): 2-3 hours
- Phase 3 (Testing): 1-2 hours
- Phase 4 (Documentation): 30 mins

**Recommended Approach**: Complete Phase 1 first, then reassess timeline based on findings.

---

## Risks & Mitigation

### Risk 1: Claude Code CLI Doesn't Exist
**Impact**: High
**Mitigation**: Use AppleScript as fallback, but this requires UI automation research

### Risk 2: Log File Format Is Undocumented
**Impact**: Medium
**Mitigation**: Reverse engineer by observing real sessions, create parser adaptively

### Risk 3: Session Auto-Start Permissions
**Impact**: Medium
**Mitigation**: Request accessibility permissions upfront, provide clear user instructions

### Risk 4: Cross-Platform Support
**Impact**: Low (macOS-first)
**Mitigation**: Document macOS-only for v2.0, plan Windows/Linux for v3.0

---

## What We Learned from Session 2

### Key Insights

1. **SDK vs. Automation**: Claude Agent SDK is for building agents, not controlling Claude Code
2. **Calendar Integration**: OAuth and scheduling logic is production-ready and reusable
3. **Event-Driven Design**: EventEmitter pattern works well for async updates
4. **Type Safety**: Strong TypeScript types caught errors early

### Valuable Code to Preserve

From Session 2, we're keeping **~650 lines** of production-ready code:
- `oauth-helper.ts` (255 lines)
- `calendar-service.ts` (395 lines)
- Calendar CLI commands (~200 lines in cli.ts)
- Type definitions (~50 lines in types.ts)

We're replacing **~633 lines** that used wrong approach:
- `session-manager.ts` (366 lines) → `session-launcher.ts` (~200 lines)
- `calendar-watcher.ts` (267 lines) → Updated version (~300 lines)

**Net Result**: Cleaner architecture with less code!

---

## Next Steps

1. **Start with Phase 1 Research** - Understand Claude Code's shell interface
2. **Implement Phase 2 Core Components** - Build shell automation
3. **Validate with Phase 3 Tests** - Ensure reliability
4. **Complete Phase 4 Documentation** - Update all docs

Once Session 2.5 is complete, we'll have a solid foundation for Session 3 (Real-Time Tracking Dashboard).

---

## Questions for User

Before starting Phase 1, please confirm:

1. Do you want to proceed with Session 2.5 implementation?
2. Should we prioritize macOS support first, or aim for cross-platform?
3. Any preferences on shell automation approach (CLI vs AppleScript)?

**Ready to start Phase 1 research?** 🚀
