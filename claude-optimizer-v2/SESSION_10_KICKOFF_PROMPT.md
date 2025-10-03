# Session 10 Kickoff: Real Data Integration & Critical Fixes

**Session Type**: Implementation & Bug Fixes
**Estimated Duration**: 3.5-4 hours
**Estimated Tokens**: 65-85k tokens
**Prerequisites**: Session 9 complete ✅
**Status**: 🟢 READY TO START

---

## 🎯 Session 10 Objectives

### Primary Goal
**Replace ALL mock data with real JSONL-parsed data** and fix critical issues from Session 9.

### What You're Building
1. **SessionJSONLParser** - Parse `~/.claude/projects/` session files
2. **Real token breakdown** - Input/output/cache from actual usage
3. **Session history** - All past sessions from JSONL files
4. **Live dashboard integration** - Connect everything to WebSocket server
5. **Production CLI command** - Beautiful `dashboard` command
6. **Fix critical bugs** - 5 issues identified in gap analysis

---

## 📋 Quick Context from Session 9

### What Works (Session 9 Delivered)
- ✅ Beautiful Moonlock-styled dashboard (`dashboard-new.html`)
- ✅ Live WebSocket server broadcasting every 5 seconds
- ✅ Real quota data from QuotaTracker
- ✅ Real context data from ContextTracker
- ✅ Tab navigation (Current Session / History)
- ✅ Tailwind CSS + JetBrains Mono font

### What's Broken/Missing (Must Fix)
- ❌ **Dashboard path bug**: Opens wrong file (`dashboard.html` vs `dashboard-new.html`)
- ❌ **Token metrics hardcoded**: 7.5M/15M/7.9M are static numbers
- ❌ **No session detection**: Can't identify current session automatically
- ❌ **WebSocket event mismatch**: Data structure doesn't align
- ❌ **No JSONL parser**: Can't read historical sessions
- ❌ **All History tab data is fake**: Analytics, trends, weekly quota all mock

---

## 🚀 Implementation Plan (6 Phases)

### Phase 1: Fix Critical Bugs (30 min, 8-10k tokens)

**Critical Issues to Fix**:

1. **Dashboard Path** (5 min)
   ```typescript
   // File: src/dashboard-live.ts, line ~84
   // Change:
   const dashboardPath = path.join(__dirname, '../../dashboard.html');
   // To:
   const dashboardPath = path.join(__dirname, '../../dashboard-new.html');
   ```

2. **Session ID Detection** (15 min)
   ```typescript
   // Add to dashboard-live.ts
   function getCurrentSessionId(): string {
     // Read from process.env or detect from current session
     // Return actual session ID (uuid format)
   }
   ```

3. **WebSocket Event Alignment** (10 min)
   ```typescript
   // Ensure events match what dashboard expects:
   wsServer.broadcast({
     type: 'session:message',
     data: {
       messageType: 'token-breakdown',
       inputTokens: realData.input,      // Not hardcoded
       outputTokens: realData.output,
       cacheTokens: realData.cache
     }
   });
   ```

**Validation**: Test that dashboard opens correctly and shows real session ID

---

### Phase 2: JSONL Parser Implementation (60 min, 18-22k tokens)

**Create**: `src/parsers/session-jsonl-parser.ts`

**Key Features**:
```typescript
export interface SessionData {
  sessionId: string;
  projectName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalPrompts: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  efficiency: number;
  cost: number;
  model: string;
}

export class SessionJSONLParser {
  private sessionDir: string;

  constructor() {
    const home = process.env.HOME || '';
    this.sessionDir = path.join(home, '.claude/projects/-Users-jordaaan-Library-Mobile-Documents-...');
  }

  /**
   * Parse a single session file
   */
  parseSession(sessionId: string): SessionData {
    const filePath = path.join(this.sessionDir, `${sessionId}.jsonl`);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreation = 0;
    let cacheRead = 0;
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    for (const line of lines) {
      const entry = JSON.parse(line);

      if (entry.type === 'assistant' && entry.message?.usage) {
        const usage = entry.message.usage;
        inputTokens += usage.input_tokens || 0;
        outputTokens += usage.output_tokens || 0;
        cacheCreation += usage.cache_creation_input_tokens || 0;
        cacheRead += usage.cache_read_input_tokens || 0;
      }

      if (entry.timestamp) {
        const time = new Date(entry.timestamp);
        if (!startTime) startTime = time;
        endTime = time;
      }
    }

    return {
      sessionId,
      inputTokens,
      outputTokens,
      cacheCreationTokens: cacheCreation,
      cacheReadTokens: cacheRead,
      totalTokens: inputTokens + outputTokens + cacheCreation + cacheRead,
      // ... calculate other fields
    };
  }

  /**
   * Get all sessions from last N days
   */
  getRecentSessions(days: number = 7): SessionData[] {
    const files = fs.readdirSync(this.sessionDir);
    const sessionFiles = files.filter(f => f.endsWith('.jsonl'));

    return sessionFiles
      .map(f => this.parseSession(f.replace('.jsonl', '')))
      .filter(s => /* last N days */);
  }

  /**
   * Get current session (detect automatically)
   */
  getCurrentSession(): SessionData | null {
    // Find most recent session file
    const files = fs.readdirSync(this.sessionDir);
    // Sort by modification time, get latest
    // Parse and return
  }
}
```

**Validation**: Test parser with current session file

---

### Phase 3: Dashboard Integration (45 min, 12-15k tokens)

**Update**: `src/dashboard-live.ts`

```typescript
import { SessionJSONLParser } from './parsers/session-jsonl-parser.js';

async function launchLiveDashboard() {
  const wsServer = new WebSocketServer(3001);
  const quotaTracker = new QuotaTracker();
  const contextTracker = new ContextTracker();
  const parser = new SessionJSONLParser();  // NEW

  await wsServer.start();

  async function broadcastCurrentState() {
    // Get current session data from JSONL
    const currentSession = parser.getCurrentSession();

    if (currentSession) {
      // Broadcast real token breakdown
      wsServer.broadcast({
        type: 'session:message',
        data: {
          messageType: 'token-breakdown',
          inputTokens: currentSession.inputTokens,
          outputTokens: currentSession.outputTokens,
          cacheTokens: currentSession.cacheReadTokens,
          efficiency: currentSession.efficiency,
          rate: calculateRate(currentSession)
        }
      });

      // Broadcast real session metadata
      wsServer.broadcast({
        type: 'session:message',
        data: {
          messageType: 'session-metadata',
          sessionId: currentSession.sessionId,
          projectName: currentSession.projectName,
          pid: process.pid,
          startTime: currentSession.startTime
        }
      });
    }

    // Keep existing quota and context broadcasts
    const quotaStatus = quotaTracker.getStatus();
    const contextUsage = await contextTracker.estimateCurrentContext();
    // ... existing code
  }

  // Broadcast every 5 seconds
  setInterval(broadcastCurrentState, 5000);
  broadcastCurrentState(); // Initial
}
```

**Validation**: Dashboard shows real token numbers that match JSONL file

---

### Phase 4: Session History (45 min, 12-15k tokens)

**Create**: `src/services/session-history.ts`

```typescript
export class SessionHistoryService {
  private parser: SessionJSONLParser;

  constructor() {
    this.parser = new SessionJSONLParser();
  }

  /**
   * Get all sessions for History tab
   */
  getAllSessions(): SessionData[] {
    return this.parser.getRecentSessions(30); // Last 30 days
  }

  /**
   * Get usage trends for chart
   */
  getUsageTrends(days: number = 7): DailyUsage[] {
    const sessions = this.parser.getRecentSessions(days);

    // Group by date
    const byDate = new Map<string, number>();
    for (const session of sessions) {
      const date = session.startTime.toISOString().split('T')[0];
      byDate.set(date, (byDate.get(date) || 0) + session.totalTokens);
    }

    // Convert to array for chart
    return Array.from(byDate.entries()).map(([date, tokens]) => ({
      date,
      tokens,
      formattedDate: new Date(date).toLocaleDateString()
    }));
  }

  /**
   * Calculate weekly quota usage
   */
  getWeeklyQuota(): WeeklyQuotaData {
    const sessions = this.parser.getRecentSessions(7);

    let sonnetHours = 0;
    let opusHours = 0;

    for (const session of sessions) {
      const hours = session.duration / (1000 * 60 * 60);
      if (session.model.includes('sonnet')) {
        sonnetHours += hours;
      } else if (session.model.includes('opus')) {
        opusHours += hours;
      }
    }

    return {
      sonnetUsed: sonnetHours,
      sonnetLimit: 432,
      opusUsed: opusHours,
      opusLimit: 36,
      sessionsRemaining: calculateSessionsRemaining(sonnetHours, opusHours),
      resetDate: getWeeklyResetDate()
    };
  }
}
```

**Update `dashboard-live.ts`** to broadcast history data on request

**Validation**: History tab shows real sessions, real trends, real weekly quota

---

### Phase 5: CLI Command (45 min, 12-15k tokens)

**Create**: `src/commands/dashboard.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import open from 'open';

export function registerDashboardCommand(program: Command): void {
  program
    .command('dashboard')
    .description('Launch real-time dashboard with live data')
    .option('--simulation', 'Use mock data instead of live data')
    .option('--no-browser', 'Don\'t auto-open browser')
    .option('--port <port>', 'WebSocket server port', '3001')
    .action(async (options) => {
      const spinner = ora('Starting dashboard server...').start();

      try {
        // Launch dashboard-live.ts in background
        const serverProcess = spawn('node', ['dist/dashboard-live.js'], {
          stdio: 'pipe',
          detached: false
        });

        // Wait for server to be ready
        await waitForServer(parseInt(options.port));
        spinner.succeed('Dashboard server running');

        // Display beautiful info
        console.log(chalk.cyan('\n' + '━'.repeat(60)));
        console.log(chalk.bold('  📊 Claude Code Dashboard'));
        console.log(chalk.cyan('━'.repeat(60)));
        console.log(`  Server:  ${chalk.green('ws://localhost:' + options.port)}`);
        console.log(`  Mode:    ${options.simulation ? chalk.yellow('Simulation') : chalk.green('Live Data')}`);
        console.log(chalk.cyan('━'.repeat(60)) + '\n');
        console.log(chalk.gray('  Press Ctrl+C to stop\n'));

        // Open browser if requested
        if (options.browser !== false) {
          const dashboardPath = path.join(__dirname, '../../dashboard-new.html');
          await open(dashboardPath);
          console.log(chalk.green('  ✓ Dashboard opened in browser\n'));
        }

        // Handle shutdown
        process.on('SIGINT', () => {
          console.log(chalk.yellow('\n\nShutting down...'));
          serverProcess.kill();
          process.exit(0);
        });

        // Keep process alive
        await new Promise(() => {});

      } catch (error) {
        spinner.fail('Failed to start dashboard');
        console.error(chalk.red(`\n  ${error.message}\n`));
        process.exit(1);
      }
    });
}
```

**Update `src/cli.ts`** to register the command

**Validation**: `dashboard` command launches server and opens browser

---

### Phase 6: Testing & Documentation (30 min, 8-10k tokens)

**Create Tests**:
```typescript
// tests/parsers/session-jsonl-parser.test.ts
describe('SessionJSONLParser', () => {
  it('should parse session file correctly', () => {
    const parser = new SessionJSONLParser();
    const data = parser.parseSession('test-session-id');

    expect(data.inputTokens).toBeGreaterThan(0);
    expect(data.outputTokens).toBeGreaterThan(0);
    expect(data.sessionId).toBe('test-session-id');
  });

  it('should aggregate tokens correctly', () => {
    // Test aggregation logic
  });
});
```

**Update Documentation**:
- README.md with dashboard usage
- Create DASHBOARD.md guide
- Update COMMANDS_REFERENCE.md

**Validation**: All tests pass, documentation complete

---

## 🔍 Success Criteria

### Must Have (Phase 1-3)
- [ ] Dashboard opens `dashboard-new.html` (not old one)
- [ ] Token breakdown shows real numbers from JSONL
- [ ] Session ID is detected automatically
- [ ] WebSocket events match dashboard structure
- [ ] Token metrics update in real-time

### Should Have (Phase 4-5)
- [ ] History tab shows real sessions
- [ ] Usage trends chart has real data
- [ ] Weekly quota shows actual Sonnet/Opus hours
- [ ] `dashboard` command launches successfully
- [ ] Beautiful CLI output and error handling

### Nice to Have (Phase 6)
- [ ] Integration tests passing
- [ ] Complete documentation
- [ ] Visual regression testing

---

## 📁 Files to Create/Modify

**New Files**:
```
src/parsers/session-jsonl-parser.ts
src/services/session-history.ts
src/commands/dashboard.ts
tests/parsers/session-jsonl-parser.test.ts
docs/DASHBOARD.md
```

**Modify Files**:
```
src/dashboard-live.ts (fix path, add parser)
src/cli.ts (register dashboard command)
README.md (add dashboard section)
docs/COMMANDS_REFERENCE.md (document dashboard command)
```

---

## 🔑 Key Information

### Session File Location
```
~/.claude/projects/-Users-jordaaan-Library-Mobile-Documents-com-apple-CloudDocs-BHT-Promo-iCloud-Organized-AI-Windsurf-Claude-Code-Optimizer/[uuid].jsonl
```

### Current Session ID
```
391e7616-0668-4905-903b-36613ba317bc
```

### JSONL Structure
```javascript
{
  "type": "assistant",
  "message": {
    "usage": {
      "input_tokens": 4,
      "cache_creation_input_tokens": 139516,
      "cache_read_input_tokens": 20037,
      "output_tokens": 5
    }
  },
  "timestamp": "2025-10-02T19:58:28.525Z"
}
```

---

## 💡 Quick Start Commands

```bash
# Verify build
npm run build

# Check current status
node dist/cli.js status

# Test current session exists
ls ~/.claude/projects/*/391e7616-0668-4905-903b-36613ba317bc.jsonl

# Start implementation
# Follow phases 1-6 in order
```

---

## 🎯 Implementation Strategy

1. **Start with Phase 1** (30 min) - Fix critical bugs first
   - Test after each fix
   - Ensure dashboard opens correctly

2. **Build Phase 2** (60 min) - JSONL parser is foundation
   - Test with current session file
   - Verify token aggregation matches `/context` output

3. **Integrate Phase 3** (45 min) - Connect parser to dashboard
   - See real numbers in browser
   - Compare with `status` command

4. **Expand Phase 4** (45 min) - History tab data
   - Generate real trends
   - Calculate real weekly quota

5. **Polish Phase 5** (45 min) - Production command
   - Beautiful UX
   - Error handling

6. **Validate Phase 6** (30 min) - Tests and docs
   - Ensure quality
   - Document usage

---

## 📊 Token Budget

**Conservative**: 65k tokens (phases 1-4 only)
**Balanced**: 81k tokens ⭐ RECOMMENDED (phases 1-6)
**Comprehensive**: 100k tokens (all phases + polish)

All fit within 200k Pro quota with significant buffer.

---

## 🚀 Ready to Start!

**Prerequisites**:
- ✅ Session 9 complete
- ✅ Dashboard UI built
- ✅ WebSocket server working
- ✅ Gap analysis complete
- ✅ Plan validated

**Context**: 138k/200k (69% used - good to continue or start fresh)
**Quota**: 200k available

**This session will transform the dashboard from beautiful mockup to production-ready tool!**

Let's build! 🎯
