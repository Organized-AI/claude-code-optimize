# Session 10: Real Data Integration & Dashboard Enhancement

**Status**: 🟢 READY TO START
**Estimated Time**: 3.5-4.5 hours
**Estimated Tokens**: 65-85k tokens (32-42% of Pro quota)
**Fits Pro Quota**: ✅ YES (with 115-135k buffer)
**Prerequisites**: SESSION 9 complete (Dashboard UI + Live Server)
**Created**: 2025-10-02

---

## Executive Summary

Session 9 successfully built the dashboard UI and live server infrastructure. However, the implementation **diverged significantly** from the original plan, taking a confidence-first MVP approach instead of the planned 7-phase integration. This was the RIGHT choice and resulted in a working system quickly.

**What Session 9 Delivered**:
- ✅ Beautiful Moonlock-styled dashboard UI (`dashboard-new.html`)
- ✅ Live data connection (`dashboard-live.ts`) with QuotaTracker + ContextTracker
- ✅ Working WebSocket server broadcasting real data
- ✅ Tab navigation (Current Session / History)
- ✅ Tailwind CSS integration with professional design

**What Session 9 DIDN'T Deliver** (from original plan):
- ❌ DashboardManager orchestration class
- ❌ SessionMonitor WebSocket integration
- ❌ DashboardSimulator for mock data
- ❌ CLI command (`dashboard start`)
- ❌ Health monitoring system
- ❌ Integration tests
- ❌ Full documentation

**Gap Analysis Result**: Session 9 built 30% of the planned features but achieved 100% of the core value - a working dashboard. The missing pieces are architectural polish, not functionality.

---

## Section 1: Session 9 Review & Gap Analysis

### What Was Supposed to Be Built (Original Plan)

**7-Phase Architecture**:
1. **DashboardManager** (45 min, 12-15k tokens) - Central orchestrator
2. **SessionMonitor Integration** (30 min, 8-12k tokens) - WebSocket broadcasting
3. **DashboardSimulator** (30 min, 8-10k tokens) - Mock data generator
4. **Dashboard Command** (30 min, 6-8k tokens) - CLI interface
5. **Health Monitoring** (20 min, 5-7k tokens) - Diagnostics
6. **Integration Tests** (30 min, 8-10k tokens) - Full test coverage
7. **Documentation** (20 min, 4-6k tokens) - Complete guides

**Total Planned**: 48-58k tokens, 2.5-3.5 hours

### What Was Actually Built (Revised Approach)

Session 9 pivoted to a **3-phase confidence-first approach**:

**Phase 1: MVP Dashboard** ✅ COMPLETED
- File: `src/dashboard-launcher.ts` (45 lines)
- Simple WebSocket server + mock data broadcast
- Dashboard opens, numbers update every 2 seconds
- **Result**: Working in 30 minutes

**Phase 2: Live Data Connection** ✅ COMPLETED
- File: `src/dashboard-live.ts` (92 lines)
- Real QuotaTracker + ContextTracker integration
- Broadcasts every 5 seconds
- **Result**: Real data flowing

**Phase 3: Dashboard Redesign** ✅ COMPLETED
- File: `dashboard-new.html` (927 lines)
- Complete Moonlock-style redesign
- Tailwind CSS + JetBrains Mono
- Tab navigation (Current Session / History)
- **Result**: Production-ready UI

**Total Delivered**: ~40k tokens, 4.5 hours (including redesign)

### Critical Gap Analysis

#### Missing from Original Plan (Not Implemented)

| Component | Status | Impact | Priority |
|-----------|--------|--------|----------|
| **DashboardManager** | ❌ Not built | No central orchestrator | MEDIUM |
| **SessionMonitor Integration** | ❌ Not integrated | No session event broadcasting | MEDIUM |
| **DashboardSimulator** | ❌ Not built | No demo mode | LOW |
| **Dashboard CLI Command** | ❌ Not built | Manual launch only | HIGH |
| **Health Monitoring** | ❌ Not built | No diagnostics | LOW |
| **Integration Tests** | ❌ Not built | No automated testing | MEDIUM |
| **Documentation** | ❌ Not updated | Missing usage guides | MEDIUM |

#### What Works vs What's Hardcoded

**✅ REAL DATA (Working)**:
- Context usage from ContextTracker (live)
- Quota usage from QuotaTracker (live)
- WebSocket connection status
- Auto-update mechanism

**⚠️ MOCK/HARDCODED DATA**:
- Token breakdown (input: 7.5M, output: 15M, cache: 7.9M) - Static numbers
- Session metadata (PID: 31447, Session ID: 86e27a053908) - Hardcoded
- 5-Hour Block Budget (24M/750K) - Fake calculation
- Token efficiency (98%) - Not calculated
- Token rate (10800.1/min) - Static
- History tab - ALL mock data
- Session analytics - Fake numbers
- Usage trends chart - Static bars
- Project phases - Hardcoded progress
- Weekly quota (432h Sonnet, 36h Opus) - Not real

#### Issues Found in Implementation

1. **Dashboard Path Confusion**:
   - `dashboard-live.ts` opens `../../dashboard.html` (old dashboard)
   - Should open `../../dashboard-new.html`
   - **Impact**: Live server opens wrong dashboard

2. **Data Mismatch**:
   - `dashboard-live.ts` sends `session:message` events
   - `dashboard-new.html` expects token breakdown in specific format
   - **Impact**: Token metrics not updating from live data

3. **No Session Detection**:
   - Dashboard doesn't know current session ID
   - Can't read from actual JSONL files
   - **Impact**: All session data is fake

4. **Missing Event Handlers**:
   - Dashboard listens for `session:message` but data structure mismatch
   - Token breakdown fields don't align
   - **Impact**: Live updates partially broken

5. **No JSONL Parser**:
   - Planned but never implemented
   - **Impact**: Can't read historical session data

---

## Section 2: Missing Features from Session 9

### Critical (Must Fix Before New Features)

**C1: Fix Dashboard Path** (5 min, 1k tokens)
- Update `dashboard-live.ts` line 84
- Change `dashboard.html` → `dashboard-new.html`
- **Why Critical**: Users see wrong dashboard

**C2: Align WebSocket Events** (15 min, 3-4k tokens)
- Fix event structure in `dashboard-live.ts`
- Add token breakdown fields (input/output/cache)
- Match what `dashboard-new.html` expects
- **Why Critical**: Token metrics not updating

**C3: Session ID Detection** (20 min, 4-5k tokens)
- Detect current Claude Code session
- Broadcast real PID, session ID
- Update banner in dashboard
- **Why Critical**: Shows wrong session info

### High Priority (Core Functionality)

**H1: JSONL Parser** (45 min, 12-15k tokens)
- Create `src/parsers/session-jsonl-parser.ts`
- Parse session files from `~/.claude/projects/`
- Extract: tokens (input/output/cache), timestamps, model usage
- Calculate: efficiency, rate, cost
- **Why High**: Enables all historical data

**H2: Token Breakdown Integration** (30 min, 8-10k tokens)
- Use JSONL parser to get real token counts
- Broadcast actual input/output/cache splits
- Calculate real efficiency percentage
- Update 5-hour block budget
- **Why High**: Currently showing fake metrics

**H3: Dashboard CLI Command** (45 min, 10-12k tokens)
- Create `src/commands/dashboard.ts`
- Command: `dashboard` or `npm run dashboard`
- Options: `--port`, `--no-browser`
- Beautiful CLI output with ora/chalk
- **Why High**: Easier to launch

### Medium Priority (Polish)

**M1: Session History Backend** (45 min, 12-15k tokens)
- Create `src/services/session-history.ts`
- Scan all JSONL files
- Aggregate sessions for History tab
- Generate usage trends (7-day chart)
- **Why Medium**: History tab is all mock

**M2: DashboardManager** (30 min, 8-10k tokens)
- Create simplified orchestrator
- Manages WebSocket + data sources
- Graceful start/stop
- **Why Medium**: Clean architecture

**M3: Integration Tests** (30 min, 8-10k tokens)
- Test JSONL parser
- Test WebSocket data flow
- Test dashboard command
- **Why Medium**: Quality assurance

### Low Priority (Nice to Have)

**L1: Simulation Mode** (30 min, 8-10k tokens)
- DashboardSimulator class
- Mock data for demos
- `dashboard --simulation`
- **Why Low**: Working dashboard exists

**L2: Health Monitoring** (20 min, 5-7k tokens)
- Component health checks
- Diagnostic endpoint
- **Why Low**: Dashboard already shows status

**L3: Documentation Updates** (20 min, 4-6k tokens)
- Update README.md
- Create DASHBOARD.md guide
- Add troubleshooting
- **Why Low**: Can be done anytime

---

## Section 3: Real Data Integration Plan

### 3.1 JSONL Parser Architecture

**File**: `src/parsers/session-jsonl-parser.ts`

**Data Model**:
```typescript
interface SessionData {
  sessionId: string;
  projectPath: string;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds

  tokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
    total: number;
  };

  prompts: number; // count of user messages
  model: string; // claude-sonnet-4-5, etc.

  metrics: {
    efficiency: number; // cache hit ratio
    tokensPerMinute: number;
    cost: number; // calculated
  };
}

interface WeeklyQuota {
  sonnet: {
    used: number; // hours
    limit: number; // 432 hours
    remaining: number;
  };
  opus: {
    used: number; // hours
    limit: number; // 36 hours
    remaining: number;
  };
  resetDate: Date;
  sessionsRemaining: number; // estimate
}
```

**Parser Implementation**:
```typescript
export class SessionJSONLParser {

  /**
   * Parse a single session JSONL file
   */
  async parseSession(sessionId: string): Promise<SessionData> {
    const filePath = this.getSessionFilePath(sessionId);
    const lines = await this.readJSONL(filePath);

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheCreation = 0;
    let cacheRead = 0;
    let prompts = 0;
    let model = '';
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    for (const line of lines) {
      if (line.type === 'assistant' && line.message?.usage) {
        const usage = line.message.usage;
        inputTokens += usage.input_tokens || 0;
        outputTokens += usage.output_tokens || 0;
        cacheCreation += usage.cache_creation_input_tokens || 0;
        cacheRead += usage.cache_read_input_tokens || 0;

        if (line.timestamp) {
          const ts = new Date(line.timestamp);
          if (!startTime || ts < startTime) startTime = ts;
          if (!endTime || ts > endTime) endTime = ts;
        }
      }

      if (line.type === 'user') {
        prompts++;
      }

      if (line.message?.model) {
        model = line.message.model;
      }
    }

    const duration = endTime && startTime ?
      endTime.getTime() - startTime.getTime() : 0;

    const total = inputTokens + outputTokens + cacheCreation + cacheRead;
    const efficiency = total > 0 ? (cacheRead / total) * 100 : 0;
    const tokensPerMinute = duration > 0 ?
      (total / (duration / 60000)) : 0;

    // Cost calculation (Sonnet 4.5 pricing)
    const cost = this.calculateCost({
      input: inputTokens,
      output: outputTokens,
      cacheWrite: cacheCreation,
      cacheRead: cacheRead
    }, model);

    return {
      sessionId,
      projectPath: this.extractProjectPath(filePath),
      startTime: startTime || new Date(),
      endTime: endTime || new Date(),
      duration,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        cacheCreation,
        cacheRead,
        total
      },
      prompts,
      model,
      metrics: {
        efficiency,
        tokensPerMinute,
        cost
      }
    };
  }

  /**
   * Get weekly quota usage
   */
  async getWeeklyUsage(): Promise<WeeklyQuota> {
    const sessions = await this.getRecentSessions(7); // last 7 days

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

    const sonnetLimit = 432;
    const opusLimit = 36;
    const avgSessionHours = 4; // typical session length

    const remainingHours = Math.max(
      (sonnetLimit - sonnetHours),
      (opusLimit - opusHours) * 12 // Opus is more valuable
    );

    const sessionsRemaining = Math.floor(remainingHours / avgSessionHours);

    return {
      sonnet: {
        used: sonnetHours,
        limit: sonnetLimit,
        remaining: sonnetLimit - sonnetHours
      },
      opus: {
        used: opusHours,
        limit: opusLimit,
        remaining: opusLimit - opusHours
      },
      resetDate: this.getNextWeeklyReset(),
      sessionsRemaining
    };
  }

  /**
   * Find JSONL file path for session
   */
  private getSessionFilePath(sessionId: string): string {
    // Search in ~/.claude/projects/
    const projectDirs = this.listProjectDirectories();

    for (const dir of projectDirs) {
      const sessionPath = path.join(dir, `${sessionId}.jsonl`);
      if (fs.existsSync(sessionPath)) {
        return sessionPath;
      }
    }

    throw new Error(`Session ${sessionId} not found`);
  }

  /**
   * Get current session ID from process
   */
  getCurrentSessionId(): string | null {
    // Check environment variable
    if (process.env.CLAUDE_SESSION_ID) {
      return process.env.CLAUDE_SESSION_ID;
    }

    // Try to detect from current working directory
    // Claude Code sets predictable patterns
    const cwd = process.cwd();
    const projectDirs = this.listProjectDirectories();

    for (const dir of projectDirs) {
      if (cwd.includes(path.basename(dir))) {
        // Find most recent JSONL in this project
        const sessions = this.getSessionsInProject(dir);
        return sessions[0]?.sessionId || null;
      }
    }

    return null;
  }
}
```

### 3.2 Data Flow Architecture

```
1. Current Session Detection
   ↓
   SessionJSONLParser.getCurrentSessionId()
   ↓
2. Parse Current Session
   ↓
   SessionJSONLParser.parseSession(sessionId)
   ↓
3. Extract Token Data
   ↓
   {input, output, cacheRead, cacheCreation}
   ↓
4. Broadcast via WebSocket
   ↓
   wsServer.broadcast({
     type: 'session:tokens',
     data: {
       inputTokens: ...,
       outputTokens: ...,
       cacheTokens: ...,
       efficiency: ...,
       rate: ...
     }
   })
   ↓
5. Dashboard Updates
   ↓
   Real-time UI shows actual data
```

### 3.3 WebSocket Message Format Updates

**Current (Broken)**:
```typescript
// dashboard-live.ts sends:
{
  type: 'session:message',
  data: {
    messageType: 'quota:update',
    used: 0,
    limit: 200000
  }
}

// dashboard-new.html expects:
socket.on('session:tokens', (data) => {
  // data.inputTokens, data.outputTokens, etc.
});
```

**Fixed Format**:
```typescript
// 1. Session metadata
{
  type: 'session:start',
  data: {
    sessionId: 'abc123',
    pid: 12345,
    project: 'claude-optimizer-v2',
    startTime: '2025-10-02T...'
  }
}

// 2. Token breakdown
{
  type: 'session:tokens',
  data: {
    inputTokens: 7564083,
    outputTokens: 15128231,
    cacheTokens: 7942242,
    efficiency: 35, // percent
    tokensPerMinute: 10800,
    total: 30634556
  }
}

// 3. Quota status
{
  type: 'quota:update',
  data: {
    used: 0,
    limit: 200000,
    percent: 0,
    resetTime: '2025-10-03T...'
  }
}

// 4. Context status
{
  type: 'context:update',
  data: {
    used: 5000,
    limit: 180000,
    percent: 2.8,
    status: 'healthy'
  }
}

// 5. 5-hour block budget
{
  type: 'block:update',
  data: {
    used: 30634556, // total tokens
    limit: 750000, // 5-hour estimate
    cacheReadFree: 7942242, // doesn't count
    billableTokens: 22692314
  }
}
```

### 3.4 Testing Strategy

**Unit Tests**:
```typescript
describe('SessionJSONLParser', () => {
  test('parses session JSONL correctly', async () => {
    const parser = new SessionJSONLParser();
    const data = await parser.parseSession('test-session-id');

    expect(data.tokens.input).toBeGreaterThan(0);
    expect(data.tokens.output).toBeGreaterThan(0);
    expect(data.metrics.efficiency).toBeDefined();
  });

  test('calculates weekly quota accurately', async () => {
    const parser = new SessionJSONLParser();
    const quota = await parser.getWeeklyUsage();

    expect(quota.sonnet.limit).toBe(432);
    expect(quota.opus.limit).toBe(36);
    expect(quota.sessionsRemaining).toBeGreaterThanOrEqual(0);
  });

  test('detects current session ID', () => {
    const parser = new SessionJSONLParser();
    const sessionId = parser.getCurrentSessionId();

    expect(sessionId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
  });
});
```

**Integration Tests**:
```typescript
describe('Dashboard Live Data', () => {
  test('broadcasts real token data', async (done) => {
    const server = new DashboardLive();
    await server.start();

    const client = io('http://localhost:3001');

    client.on('session:tokens', (data) => {
      expect(data.inputTokens).toBeDefined();
      expect(data.outputTokens).toBeDefined();
      expect(data.cacheTokens).toBeDefined();
      done();
    });
  });
});
```

**Manual Verification**:
```bash
# 1. Check JSONL parser output
node -e "
  const { SessionJSONLParser } = require('./dist/parsers/session-jsonl-parser.js');
  const parser = new SessionJSONLParser();
  parser.parseSession('current').then(data => {
    console.log('Tokens:', data.tokens);
    console.log('Efficiency:', data.metrics.efficiency + '%');
  });
"

# 2. Compare with /context command
# Run both and verify numbers match
```

---

## Section 4: Dashboard Improvements

### 4.1 Visual/Design Tweaks (Match Moonlock Exactly)

**Current Issues**:
1. Tab buttons could be more prominent
2. Progress bars should animate on load
3. Card hover effects need refinement
4. Color gradients slightly off from Moonlock
5. Font weights inconsistent

**Fixes**:
```css
/* Tab buttons - make active tab more distinct */
.tab-button.active {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
}

/* Progress bar animations */
@keyframes fillProgress {
  from { width: 0; }
  to { width: var(--final-width); }
}

.progress-fill {
  animation: fillProgress 1s ease-out;
}

/* Card hover - subtle lift */
.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.2);
}

/* Gradient refinement */
.moonlock-text-gradient {
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%);
}
```

### 4.2 Missing UI Components

**Not Yet Implemented**:
1. **Expandable session history items** - Click to show details
2. **Export data button** - Actually exports JSON/CSV
3. **Real-time activity feed** - Show recent events
4. **Error notifications** - Toast messages for issues
5. **Loading states** - Skeleton screens while loading
6. **Empty states** - When no sessions exist

**Implementation**:
```html
<!-- Expandable session item -->
<div class="session-item" onclick="toggleDetails(this)">
  <div class="session-header">...</div>
  <div class="session-details hidden">
    <div class="timeline">
      <!-- Prompt-by-prompt breakdown -->
    </div>
  </div>
</div>

<!-- Export functionality -->
<button onclick="exportData()">
  Export Data
</button>

<script>
function exportData() {
  const data = getAllSessions();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `claude-sessions-${Date.now()}.json`;
  a.click();
}
</script>
```

### 4.3 Animation/Interaction Improvements

**Add These**:
1. **Number count-up animation** - When values change
2. **Smooth tab transitions** - Fade in/out
3. **Progress bar pulse** - When updating
4. **Connection status glow** - Pulsing indicator
5. **Chart bars animate in** - Stagger effect

**Implementation**:
```javascript
// Number count-up
function animateNumber(element, start, end, duration) {
  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= end) {
      current = end;
      clearInterval(timer);
    }
    element.textContent = formatNumber(Math.floor(current));
  }, 16);
}

// Tab transition
function switchTab(tab) {
  const current = document.querySelector('.tab-content.active');
  const next = document.getElementById(`${tab}-tab`);

  current.classList.add('fade-out');
  setTimeout(() => {
    current.classList.remove('active', 'fade-out');
    next.classList.add('fade-in', 'active');
  }, 150);
}
```

### 4.4 Responsive Design Issues

**Problems**:
- 3-column layout breaks on tablets
- Banner text wraps awkwardly on mobile
- Chart bars too thin on small screens
- Tab buttons too close together

**Fixes**:
```css
/* Better breakpoints */
@media (max-width: 1024px) {
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .banner-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .tab-button {
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
  }

  .chart-bar {
    min-width: 24px; /* Increase from 16px */
  }
}

@media (max-width: 640px) {
  .metric-card {
    padding: 1rem;
  }

  .text-6xl {
    font-size: 2.5rem; /* Reduce from 3.75rem */
  }
}
```

---

## Section 5: Implementation Phases

### Phase 1: Fix Critical Gaps (30 min, 8-10k tokens)

**Goal**: Make current dashboard work correctly with live data

**Tasks**:
1. Fix dashboard path in `dashboard-live.ts`
2. Align WebSocket event structure
3. Detect current session ID
4. Broadcast real PID and session metadata

**Files Modified**:
- `src/dashboard-live.ts`

**Validation**:
```bash
npm run build
node dist/dashboard-live.js
# → Should open dashboard-new.html
# → Should show real session ID
# → Token metrics should update
```

### Phase 2: JSONL Parser & Data Layer (60 min, 18-22k tokens)

**Goal**: Parse session files and extract real data

**Tasks**:
1. Create `SessionJSONLParser` class
2. Implement `parseSession()` method
3. Implement `getWeeklyUsage()` method
4. Add `getCurrentSessionId()` detection
5. Write unit tests

**Files Created**:
- `src/parsers/session-jsonl-parser.ts`
- `tests/parsers/session-jsonl-parser.test.ts`

**Validation**:
```bash
npm test -- session-jsonl-parser
# → All tests pass

node -e "
  const parser = new SessionJSONLParser();
  const data = await parser.parseSession('current');
  console.log(data);
"
# → Shows real token data
```

### Phase 3: Dashboard Integration (45 min, 12-15k tokens)

**Goal**: Connect JSONL parser to dashboard broadcast

**Tasks**:
1. Update `dashboard-live.ts` to use parser
2. Broadcast token breakdown from JSONL
3. Broadcast session metadata
4. Update 5-hour block budget calculation
5. Send weekly quota status

**Files Modified**:
- `src/dashboard-live.ts`

**Validation**:
```bash
node dist/dashboard-live.js
# → Dashboard shows real tokens (not 7.5M/15M)
# → Session ID matches /context output
# → Efficiency is calculated correctly
# → Block budget is accurate
```

### Phase 4: Session History Backend (45 min, 12-15k tokens)

**Goal**: Populate History tab with real data

**Tasks**:
1. Create `SessionHistoryService` class
2. Scan all JSONL files in project
3. Generate usage trends (7-day)
4. Calculate analytics (avg session time, efficiency)
5. Broadcast to History tab

**Files Created**:
- `src/services/session-history.ts`

**Validation**:
- History tab shows real sessions
- Usage trends chart reflects actual data
- Session count is accurate
- Analytics are calculated correctly

### Phase 5: CLI Command & Polish (45 min, 12-15k tokens)

**Goal**: Easy launch and professional UX

**Tasks**:
1. Create `dashboard` command
2. Add options: `--port`, `--no-browser`, `--simulation`
3. Beautiful CLI output
4. Graceful error handling
5. Add to package.json scripts

**Files Created**:
- `src/commands/dashboard.ts`

**Validation**:
```bash
npm run dashboard
# → Server starts
# → Dashboard opens
# → Beautiful CLI output

dashboard --port 3002
# → Works on custom port

dashboard --simulation
# → Shows mock data (stretch goal)
```

### Phase 6: Testing & Documentation (30 min, 8-10k tokens)

**Goal**: Quality assurance and guides

**Tasks**:
1. Integration tests for data flow
2. Update README.md
3. Create DASHBOARD.md guide
4. Add troubleshooting section
5. Document WebSocket API

**Files Modified**:
- `README.md`
- `tests/dashboard-integration.test.ts`

**Files Created**:
- `DASHBOARD.md`

**Validation**:
- `npm test` → All tests pass
- Documentation is clear and complete
- Examples work as written

---

## Section 6: Testing & Validation

### Unit Tests

**JSONL Parser**:
```typescript
describe('SessionJSONLParser', () => {
  it('should parse session tokens correctly', async () => {
    const parser = new SessionJSONLParser();
    const session = await parser.parseSession('test-id');

    expect(session.tokens.input).toBeGreaterThan(0);
    expect(session.tokens.output).toBeGreaterThan(0);
    expect(session.tokens.total).toBe(
      session.tokens.input +
      session.tokens.output +
      session.tokens.cacheCreation +
      session.tokens.cacheRead
    );
  });

  it('should calculate efficiency correctly', async () => {
    const session = await parser.parseSession('test-id');
    const expectedEfficiency = (
      session.tokens.cacheRead /
      session.tokens.total
    ) * 100;

    expect(session.metrics.efficiency).toBeCloseTo(expectedEfficiency);
  });
});
```

**Session History**:
```typescript
describe('SessionHistoryService', () => {
  it('should aggregate sessions correctly', async () => {
    const service = new SessionHistoryService();
    const sessions = await service.getAllSessions();

    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].sessionId).toBeDefined();
  });

  it('should generate 7-day trends', async () => {
    const trends = await service.getUsageTrends(7);

    expect(trends.length).toBeLessThanOrEqual(7);
    trends.forEach(day => {
      expect(day.date).toBeInstanceOf(Date);
      expect(day.tokens).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### Integration Tests

**Full Data Flow**:
```typescript
describe('Dashboard Data Flow', () => {
  let server: DashboardLive;
  let client: Socket;

  beforeAll(async () => {
    server = new DashboardLive();
    await server.start();
    client = io('http://localhost:3001');
  });

  afterAll(async () => {
    client.disconnect();
    await server.stop();
  });

  it('should broadcast real token data', (done) => {
    client.on('session:tokens', (data) => {
      expect(data.inputTokens).toBeDefined();
      expect(data.outputTokens).toBeDefined();
      expect(data.efficiency).toBeGreaterThan(0);
      done();
    });
  });

  it('should send session metadata', (done) => {
    client.on('session:start', (data) => {
      expect(data.sessionId).toMatch(/^[a-f0-9-]{36}$/);
      expect(data.pid).toBeGreaterThan(0);
      done();
    });
  });
});
```

### Manual Validation Checklist

**Verify Real Data Matches /context**:
```bash
# 1. Run /context command in Claude Code
# Note the following values:
# - Context tokens used
# - Quota tokens used
# - Session ID

# 2. Launch dashboard
npm run dashboard

# 3. Compare values:
☐ Context tokens match /context output
☐ Quota tokens match /context output
☐ Session ID matches current session
☐ Token breakdown (input/output/cache) is accurate
☐ Efficiency percentage is calculated correctly
☐ 5-hour block budget reflects real usage
```

**Visual Regression Testing**:
```bash
# Compare dashboard screenshots
☐ Current Session tab loads correctly
☐ History tab loads correctly
☐ Tab switching works smoothly
☐ All cards render properly
☐ Progress bars animate correctly
☐ Numbers format correctly (K/M suffixes)
☐ Colors match Moonlock design
☐ Responsive layout works on mobile/tablet/desktop
```

**Error Handling**:
```bash
☐ Graceful error if JSONL file missing
☐ Fallback if session ID not detected
☐ WebSocket reconnection works
☐ Port conflict shows helpful error
☐ Invalid session ID handled gracefully
```

---

## Section 7: Success Criteria

### Specific, Measurable Goals

**Data Accuracy** (Must Achieve 100%):
- [ ] Token counts match JSONL file exactly
- [ ] Session ID matches current Claude Code session
- [ ] PID matches current process
- [ ] Efficiency calculation is mathematically correct
- [ ] Weekly quota reflects actual usage from last 7 days
- [ ] Cost calculation uses correct model pricing

**Real-time Updates** (Must Work):
- [ ] Dashboard updates every 5 seconds
- [ ] New tokens appear within 10 seconds
- [ ] WebSocket reconnects automatically on disconnect
- [ ] No data loss during updates
- [ ] History tab reflects latest session immediately

**User Experience** (Must Be Excellent):
- [ ] Dashboard launches with one command: `npm run dashboard`
- [ ] Opens in browser automatically
- [ ] Shows helpful error messages
- [ ] Beautiful CLI output with colors
- [ ] Responsive design works on all devices
- [ ] Animations are smooth (60fps)

**Code Quality** (Must Pass):
- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles with no errors
- [ ] No console errors in browser
- [ ] Code follows existing patterns
- [ ] Documentation is complete

### Acceptance Criteria by Feature

**JSONL Parser**:
- [ ] Parses any session file correctly
- [ ] Handles missing data gracefully
- [ ] Calculates all metrics accurately
- [ ] Detects current session automatically
- [ ] Works with any project path
- [ ] Performance: < 100ms to parse session

**Dashboard Live Data**:
- [ ] All token metrics are real (no mock data)
- [ ] Session metadata is accurate
- [ ] 5-hour block budget is calculated correctly
- [ ] Weekly quota shows actual usage
- [ ] Updates happen automatically
- [ ] No hardcoded values remain

**Session History**:
- [ ] Shows all sessions from last 7 days
- [ ] Usage trends chart reflects real data
- [ ] Session analytics are accurate
- [ ] Can export data to JSON
- [ ] Expandable session details work
- [ ] Performance: < 500ms to load history

**Dashboard Command**:
- [ ] Works: `dashboard` or `npm run dashboard`
- [ ] Opens correct dashboard file
- [ ] Shows connection info
- [ ] Handles port conflicts
- [ ] Graceful shutdown with Ctrl+C
- [ ] Help text is clear: `dashboard --help`

### Definition of "Done"

A feature is DONE when:

1. **Implemented**: Code is written and committed
2. **Tested**: Unit tests pass + manual testing complete
3. **Documented**: README/docs updated
4. **Validated**: Matches /context output exactly
5. **Reviewed**: No console errors, no TODO comments
6. **Merged**: Code is in main branch

Session 10 is DONE when:

1. **All Critical Gaps Fixed**: Dashboard shows real data
2. **JSONL Parser Complete**: Can read any session file
3. **Dashboard Command Works**: One-command launch
4. **History Tab Populated**: Real sessions displayed
5. **Tests Pass**: 100% test success rate
6. **Documentation Complete**: Clear usage guides
7. **No Mock Data**: Everything is real
8. **User Tested**: Works end-to-end for demo

---

## Token Budget Breakdown

### Phase-by-Phase Estimate

| Phase | Tasks | Low | Mid | High |
|-------|-------|-----|-----|------|
| **Phase 1: Critical Gaps** | Fix path, events, session ID | 6k | 8k | 10k |
| **Phase 2: JSONL Parser** | Parser class, detection, tests | 16k | 18k | 22k |
| **Phase 3: Dashboard Integration** | Connect parser, broadcast data | 10k | 12k | 15k |
| **Phase 4: Session History** | History service, aggregation | 10k | 12k | 15k |
| **Phase 5: CLI Command** | Command, options, output | 10k | 12k | 15k |
| **Phase 6: Testing & Docs** | Tests, README, guides | 6k | 8k | 10k |
| **Buffer (15%)** | Unexpected issues, refinement | 9k | 11k | 13k |
| **TOTAL** | | **67k** | **81k** | **100k** |

### Recommended Approach

**Conservative** (67k tokens):
- Skip simulation mode
- Skip advanced animations
- Minimal documentation
- Basic error handling

**Balanced** (81k tokens): ⭐ RECOMMENDED
- All core features
- Good documentation
- Proper error handling
- Basic polish

**Comprehensive** (100k tokens):
- All features + polish
- Extensive documentation
- Advanced error handling
- Full test coverage
- Design refinements

**Pro Quota Check**: 100k < 200k ✅ FITS (with 100k buffer)

---

## Risk Mitigation

### Identified Risks

**R1: Session ID Detection Fails** (Probability: MEDIUM, Impact: HIGH)
- **Risk**: Can't automatically find current session
- **Mitigation**: Fallback to manual session ID via env var
- **Contingency**: Show list of recent sessions, let user select
- **Cost**: +5k tokens

**R2: JSONL File Structure Changes** (Probability: LOW, Impact: HIGH)
- **Risk**: Claude updates JSONL format
- **Mitigation**: Version detection, support multiple formats
- **Contingency**: Parse what we can, show warnings for unknown fields
- **Cost**: +8k tokens

**R3: WebSocket Event Mismatch** (Probability: LOW, Impact: MEDIUM)
- **Risk**: Dashboard expects different event structure
- **Mitigation**: Update both sender and receiver in same commit
- **Contingency**: Add event schema validation
- **Cost**: +3k tokens

**R4: Performance Issues** (Probability: MEDIUM, Impact: LOW)
- **Risk**: Parsing large JSONL files is slow
- **Mitigation**: Stream parsing, cache results
- **Contingency**: Only parse last N messages
- **Cost**: +4k tokens

**R5: Path Resolution Issues** (Probability: MEDIUM, Impact: MEDIUM)
- **Risk**: Can't find ~/.claude/projects on all systems
- **Mitigation**: Make paths configurable
- **Contingency**: Manual path entry via CLI
- **Cost**: +2k tokens

**Total Risk Budget**: +22k tokens (already included in buffer)

---

## File Structure for Session 10

```
claude-optimizer-v2/
├── src/
│   ├── parsers/
│   │   └── session-jsonl-parser.ts         ⏳ CREATE (Phase 2)
│   ├── services/
│   │   └── session-history.ts              ⏳ CREATE (Phase 4)
│   ├── commands/
│   │   └── dashboard.ts                    ⏳ CREATE (Phase 5)
│   ├── dashboard-live.ts                   ✏️ MODIFY (Phases 1,3)
│   └── dashboard-launcher.ts               ℹ️ REFERENCE (keep for MVP)
│
├── tests/
│   ├── parsers/
│   │   └── session-jsonl-parser.test.ts    ⏳ CREATE (Phase 2)
│   ├── services/
│   │   └── session-history.test.ts         ⏳ CREATE (Phase 4)
│   └── dashboard-integration.test.ts       ⏳ CREATE (Phase 6)
│
├── docs/
│   └── DASHBOARD.md                        ⏳ CREATE (Phase 6)
│
├── dashboard-new.html                      ✏️ MODIFY (minor tweaks)
├── README.md                               ✏️ UPDATE (Phase 6)
└── package.json                            ✏️ UPDATE (add dashboard script)
```

---

## Quick Start for Session 10

### Step 1: Verify System

```bash
cd claude-optimizer-v2
npm run build
npm test

# Check current state
node dist/dashboard-live.js
# → Should open browser (but wrong dashboard)
# → Should show some data (but partly mock)
```

### Step 2: Read Planning Docs

Priority order:
1. This plan (SESSION_10_PLAN.md)
2. SESSION_9_HANDOFF.md (understand what exists)
3. SESSION_9_REVISED_APPROACH.md (understand the pivot)

### Step 3: Start with Critical Gaps (Phase 1)

```bash
# Fix the immediate issues
# 1. Update dashboard-live.ts line 84
#    Change: '../../dashboard.html'
#    To: '../../dashboard-new.html'

# 2. Fix WebSocket events to match dashboard expectations
# 3. Add session ID detection

npm run build && node dist/dashboard-live.js
# → Verify dashboard-new.html opens
# → Check token metrics update
```

### Step 4: Build JSONL Parser (Phase 2)

```bash
# Create the parser
touch src/parsers/session-jsonl-parser.ts
touch tests/parsers/session-jsonl-parser.test.ts

# Implement parser following the plan
# Test with current session
npm test -- session-jsonl-parser
```

### Step 5: Integrate & Polish (Phases 3-6)

Follow the phase breakdown in Section 5.

---

## Session 10 Kickoff Prompt

**Copy-paste this to start Session 10**:

```markdown
You are implementing SESSION 10: Real Data Integration & Dashboard Enhancement.

**Context from Session 9**:
Session 9 successfully built a beautiful Moonlock-styled dashboard UI but took a
confidence-first MVP approach instead of the planned 7-phase architecture. This
was the RIGHT decision and got a working dashboard quickly. However, several
planned features were not implemented, and the dashboard is showing mostly mock data.

**Current State**:
✅ Beautiful dashboard UI (dashboard-new.html) with Tailwind CSS
✅ Live WebSocket server broadcasting some data
✅ Real QuotaTracker + ContextTracker integration
❌ Dashboard opening wrong file (dashboard.html vs dashboard-new.html)
❌ Token breakdown is hardcoded (7.5M/15M/7.9M)
❌ Session metadata is fake (PID, Session ID)
❌ History tab is all mock data
❌ No JSONL parser to read real session data
❌ No CLI command for easy launch

**Your Mission**: Connect ALL dashboard data to real sources.

**Implementation Plan** (6 Phases):

**Phase 1: Fix Critical Gaps** (30 min, 8-10k tokens)
- Fix dashboard path in dashboard-live.ts (line 84)
- Align WebSocket event structure
- Detect current session ID
- Broadcast real PID and session metadata
- Files: src/dashboard-live.ts

**Phase 2: JSONL Parser & Data Layer** (60 min, 18-22k tokens)
- Create: src/parsers/session-jsonl-parser.ts
- Parse JSONL files from ~/.claude/projects/
- Extract: tokens (input/output/cache), timestamps, model
- Calculate: efficiency, rate, cost
- Implement getCurrentSessionId() detection
- Files: src/parsers/session-jsonl-parser.ts, tests/parsers/session-jsonl-parser.test.ts

**Phase 3: Dashboard Integration** (45 min, 12-15k tokens)
- Update dashboard-live.ts to use JSONL parser
- Broadcast real token breakdown
- Update 5-hour block budget calculation
- Send weekly quota status
- Files: src/dashboard-live.ts

**Phase 4: Session History Backend** (45 min, 12-15k tokens)
- Create: src/services/session-history.ts
- Scan all JSONL files in project
- Generate 7-day usage trends
- Calculate session analytics
- Broadcast to History tab
- Files: src/services/session-history.ts, tests/services/session-history.test.ts

**Phase 5: CLI Command & Polish** (45 min, 12-15k tokens)
- Create: src/commands/dashboard.ts
- Command: `dashboard` or `npm run dashboard`
- Options: --port, --no-browser, --simulation
- Beautiful CLI output with ora/chalk
- Graceful error handling
- Files: src/commands/dashboard.ts, package.json

**Phase 6: Testing & Documentation** (30 min, 8-10k tokens)
- Integration tests for full data flow
- Update README.md with dashboard section
- Create DASHBOARD.md usage guide
- Add troubleshooting section
- Files: tests/dashboard-integration.test.ts, README.md, DASHBOARD.md

**Key Architecture**:
```
SessionJSONLParser
  ↓
Parse ~/.claude/projects/[project]/[session-id].jsonl
  ↓
Extract real data (tokens, efficiency, metadata)
  ↓
DashboardLive broadcasts via WebSocket
  ↓
Dashboard UI updates in real-time
```

**JSONL Data Structure** (from handoff):
```json
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

**Success Criteria**:
✅ Dashboard shows REAL tokens (not 7.5M/15M mock data)
✅ Session ID matches /context output
✅ Token breakdown is accurate (input/output/cache)
✅ Efficiency is calculated correctly
✅ 5-hour block budget reflects real usage
✅ History tab shows real sessions
✅ One-command launch: `npm run dashboard`
✅ All tests pass
✅ Documentation complete

**Token Budget**: 67-100k tokens (Recommended: 81k)
**Time Estimate**: 3.5-4.5 hours

**Start with Phase 1** - Fix critical gaps so dashboard works correctly with current data.

Ready to build real data integration!
```

---

## Next Steps (Session 11+)

After Session 10 completes, future sessions can focus on:

**Session 11: Advanced Features**
- WebSocket authentication
- Multi-user dashboard support
- Real-time collaboration features
- Advanced analytics (cost projections, trend analysis)
- Performance optimizations

**Session 12: Production Deployment**
- npm package publishing
- Installer scripts
- Cross-platform testing (macOS/Windows/Linux)
- Security audit
- Deployment guides

**Session 13: Integration & Ecosystem**
- IDE extensions (VS Code, Cursor)
- GitHub Actions integration
- Slack/Discord notifications
- API for third-party tools
- Plugin system

---

## Appendix: Key Reference Files

**For JSONL Parsing**:
- Session file location: `~/.claude/projects/-Users-jordaaan-Library-Mobile-Documents-.../[uuid].jsonl`
- Project directory pattern: `-Users-jordaaan-Library-Mobile-Documents-com-apple-CloudDocs-BHT-Promo-iCloud-Organized-AI-Windsurf-Claude-Code-Optimizer-claude-optimizer-v2`
- JSONL line structure: `{"type":"assistant","message":{"usage":{...}},"timestamp":"..."}`

**For Dashboard Updates**:
- Dashboard UI: `dashboard-new.html` (927 lines, Tailwind CSS)
- Live server: `src/dashboard-live.ts` (92 lines)
- WebSocket server: `src/websocket-server.ts` (182 lines)

**For Testing**:
- Compare with: `/context` command output in Claude Code
- Verify with: `node dist/cli.js status`
- Check quota: QuotaTracker.getStatus()

**For Session Detection**:
- Environment variable: `process.env.CLAUDE_SESSION_ID` (if set)
- Current working directory: Contains project path substring
- Fallback: Most recent JSONL in matching project directory

---

**Session 10 Plan Created**: 2025-10-02
**Focus**: Real data integration for production dashboard
**Approach**: Fix gaps, parse JSONL, integrate data, polish UX
**Ready to Start**: ✅ YES
**Confidence Level**: 🟢 HIGH - Clear objectives, proven foundation

Let's build a dashboard that shows REAL data! 🚀
