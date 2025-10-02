# Session 9: Production Dashboard with Live Data Integration

**Status**: 🟢 READY TO START
**Estimated Time**: 2.5-3.5 hours
**Estimated Tokens**: 40-55k tokens (20-28% of Pro quota)
**Fits Pro Quota**: ✅ YES (with 145-160k buffer)
**Prerequisites**: SESSION 8 complete + Existing WebSocket server + dashboard.html
**Can Run in Parallel**: Partial (some phases can parallelize)

---

## Executive Summary

Build a production-ready real-time dashboard by connecting your existing beautiful UI (`dashboard.html`) to live session data through the WebSocket server. The focus is on **reliable data flow** and **production polish** rather than building new UI.

**Why This Approach**: You already have:
- ✅ Beautiful dashboard UI (dashboard.html - 2,300 lines)
- ✅ WebSocket server infrastructure (websocket-server.ts)
- ✅ Session monitoring capabilities (session-monitor.ts)
- ✅ All data sources (QuotaTracker, ContextTracker, SessionMemory)

**What's Missing**: The **integration layer** that connects everything together with real data.

---

## Session Objectives

### Primary Goals
1. ✅ Connect SessionMonitor to WebSocket server
2. ✅ Integrate QuotaTracker real-time updates
3. ✅ Add ContextTracker live metrics
4. ✅ Create Dashboard command (`dashboard start`)
5. ✅ Build mock data simulator for demos
6. ✅ Add health monitoring and diagnostics
7. ✅ Create comprehensive tests

### Success Criteria
- ✅ Dashboard shows live session data
- ✅ WebSocket updates fire in real-time
- ✅ All metrics accurate (quota, context, tokens)
- ✅ Can run in demo mode without active session
- ✅ Dashboard command launches everything
- ✅ Tests validate full integration
- ✅ Production-ready error handling
- ✅ Documentation updated

---

## Current State Analysis

### What Exists ✅

**1. WebSocket Server** (`src/websocket-server.ts`)
```typescript
✅ Socket.IO server on port 3001
✅ Health endpoint (/health)
✅ Connection handling
✅ Broadcast capability
✅ Event types defined

⚠️ Missing: Data source integration
⚠️ Missing: Real event triggers
```

**2. Dashboard UI** (`../dashboard.html`)
```typescript
✅ Beautiful dark theme design
✅ WebSocket client connection
✅ Event listeners (session:*, quota:*, context:*)
✅ Real-time UI updates
✅ Auto-update toggle
✅ Mock data mode

⚠️ Missing: Connection to real data
⚠️ Missing: Error recovery UI
```

**3. Data Sources**
```typescript
✅ SessionMonitor (src/session-monitor.ts)
✅ QuotaTracker (src/quota-tracker.ts)
✅ ContextTracker (src/context-tracker.ts)
✅ SessionMemoryManager (src/session-memory.ts)

⚠️ Missing: WebSocket integration
⚠️ Missing: Real-time event emission
```

### The Gap 🔍

```
Current: [Data Sources] ❌ [WebSocket Server] ❌ [Dashboard UI]

Goal:    [Data Sources] → [Event Bridge] → [WebSocket] → [Dashboard]
              ↓              ↓              ↓              ↓
         Live Session    Broadcasts    Socket.IO    Real-time UI
```

**What We Need to Build**: The **Event Bridge Layer**

---

## Token Estimation Breakdown

### Phase 1: Dashboard Manager (45 min, 12-15k tokens)
Central orchestration layer that coordinates everything

**Deliverable**: `src/dashboard-manager.ts`

**Implementation**:
```typescript
export class DashboardManager {
  private wsServer: WebSocketServer;
  private quotaTracker: QuotaTracker;
  private contextTracker: ContextTracker;
  private sessionMonitor: SessionMonitor;
  private simulationMode: boolean = false;

  async start(options?: {simulation?: boolean}): Promise<void>
  async stop(): Promise<void>
  private setupEventListeners(): void
  private startSimulation(): void
}
```

**Reasoning**: 12k tokens
- Class structure: 3k
- Integration logic: 5k
- Event wiring: 3k
- Error handling: 1k

---

### Phase 2: Session Monitor Integration (30 min, 8-12k tokens)
Connect SessionMonitor to emit WebSocket events

**Deliverable**: Update `src/session-monitor.ts`

**Implementation**:
```typescript
export class SessionMonitor {
  private wsServer?: WebSocketServer;

  setWebSocketServer(server: WebSocketServer): void

  // Update existing methods to broadcast:
  private broadcastTokenUpdate(tokens: number): void {
    this.wsServer?.broadcast({
      type: 'session:tokens',
      data: { current: tokens, timestamp: new Date() }
    });
  }

  private broadcastQuotaUpdate(): void
  private broadcastContextUpdate(): void
}
```

**Reasoning**: 10k tokens
- WebSocket integration: 4k
- Event broadcasting: 4k
- Testing updates: 2k

---

### Phase 3: Data Simulator (30 min, 8-10k tokens)
Create realistic mock data for demo mode

**Deliverable**: `src/dashboard-simulator.ts`

**Implementation**:
```typescript
export class DashboardSimulator {
  constructor(private wsServer: WebSocketServer) {}

  startSimulation(): void {
    // Simulate session start
    this.simulateSessionStart();

    // Gradual token increase
    this.simulateTokenGrowth();

    // Quota percentage changes
    this.simulateQuotaUpdates();

    // Context window filling
    this.simulateContextGrowth();
  }

  private simulateSessionStart() {
    this.wsServer.broadcast({
      type: 'session:start',
      data: {
        id: 'demo-session',
        project: 'claude-optimizer-v2',
        startTime: new Date()
      }
    });
  }

  private simulateTokenGrowth() {
    let tokens = 0;
    const interval = setInterval(() => {
      tokens += Math.floor(Math.random() * 500) + 100;
      this.wsServer.broadcast({
        type: 'session:tokens',
        data: { current: tokens, total: 200000 }
      });

      if (tokens > 50000) clearInterval(interval);
    }, 2000);
  }
}
```

**Reasoning**: 9k tokens
- Simulation logic: 5k
- Realistic data generation: 3k
- Timing control: 1k

---

### Phase 4: Dashboard Command (30 min, 6-8k tokens)
CLI command to launch everything easily

**Deliverable**: `src/commands/dashboard.ts`

**Implementation**:
```typescript
import { DashboardManager } from '../dashboard-manager.js';
import open from 'open';
import ora from 'ora';
import chalk from 'chalk';

export async function dashboardCommand(options: {
  simulation?: boolean;
  port?: number;
  noBrowser?: boolean;
}): Promise<void> {
  const spinner = ora('Starting dashboard...').start();

  try {
    // 1. Start dashboard manager
    const manager = new DashboardManager();
    await manager.start({ simulation: options.simulation });

    spinner.succeed('Dashboard server running');

    // 2. Open browser (unless --no-browser)
    if (!options.noBrowser) {
      spinner.text = 'Opening dashboard in browser...';
      const dashboardPath = path.join(__dirname, '../../dashboard.html');
      await open(dashboardPath);
      spinner.succeed('Dashboard opened');
    }

    // 3. Display connection info
    console.log('\n' + chalk.cyan('━'.repeat(60)));
    console.log(chalk.bold.white('  📊 Dashboard Running'));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(`  ${chalk.gray('•')} URL: ${chalk.green('file://' + dashboardPath)}`);
    console.log(`  ${chalk.gray('•')} WebSocket: ${chalk.green('ws://localhost:3001')}`);
    console.log(`  ${chalk.gray('•')} Health: ${chalk.green('http://localhost:3001/health')}`);
    console.log(`  ${chalk.gray('•')} Mode: ${options.simulation ? chalk.yellow('Simulation') : chalk.green('Live Data')}`);
    console.log(chalk.cyan('━'.repeat(60)) + '\n');

    console.log(chalk.gray('  Press Ctrl+C to stop\n'));

    // Keep alive
    await new Promise(() => {}); // Never resolves

  } catch (error) {
    spinner.fail('Failed to start dashboard');
    console.error(chalk.red(`\n  Error: ${error.message}\n`));
    process.exit(1);
  }
}
```

**CLI Usage**:
```bash
dashboard start                 # Start with live data
dashboard start --simulation    # Start with mock data
dashboard start --no-browser    # Don't auto-open browser
dashboard start --port 3002     # Custom WebSocket port
```

**Reasoning**: 7k tokens
- Command implementation: 3k
- Beautiful CLI output: 2k
- Error handling: 1k
- Options parsing: 1k

---

### Phase 5: Health Monitoring (20 min, 5-7k tokens)
Add dashboard health checks and diagnostics

**Deliverable**: `src/dashboard-health.ts`

**Implementation**:
```typescript
export class DashboardHealth {
  async check(): Promise<HealthReport> {
    return {
      websocket: await this.checkWebSocket(),
      quotaTracker: await this.checkQuotaTracker(),
      contextTracker: await this.checkContextTracker(),
      memoryAccess: await this.checkMemory()
    };
  }

  private async checkWebSocket(): Promise<ComponentHealth> {
    try {
      const response = await fetch('http://localhost:3001/health');
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        message: await response.json()
      };
    } catch (error) {
      return {
        status: 'down',
        message: error.message
      };
    }
  }
}
```

**Reasoning**: 6k tokens
- Health check logic: 3k
- Status reporting: 2k
- Diagnostic output: 1k

---

### Phase 6: Integration Tests (30 min, 8-10k tokens)
Comprehensive tests for full integration

**Deliverable**: `tests/dashboard-integration.test.ts`

**Test Coverage**:
```typescript
describe('Dashboard Integration', () => {
  test('DashboardManager starts all components', async () => {
    const manager = new DashboardManager();
    await manager.start();

    expect(manager.getStatus().running).toBe(true);
    expect(manager.getStatus().clients).toBe(0);
  });

  test('SessionMonitor broadcasts to WebSocket', async () => {
    // Start manager
    // Simulate session activity
    // Verify broadcast received
  });

  test('Simulator generates realistic data', async () => {
    // Start in simulation mode
    // Collect events
    // Verify realistic patterns
  });

  test('Dashboard command launches successfully', async () => {
    // Test CLI command
    // Verify server starts
    // Verify health endpoint
  });

  test('Error handling works correctly', async () => {
    // Test port already in use
    // Test missing dependencies
    // Test network errors
  });
});
```

**Reasoning**: 9k tokens
- Test setup: 2k
- Test cases: 5k
- Assertions: 2k

---

### Phase 7: Documentation & Polish (20 min, 4-6k tokens)
Complete the integration with docs

**Updates**:
1. README.md - Add dashboard section
2. DASHBOARD.md - Complete usage guide
3. Update WORKING_FEATURES.md
4. Add troubleshooting section

**Reasoning**: 5k tokens
- Documentation: 3k
- Examples: 1k
- Troubleshooting: 1k

---

## Total Estimate

**Mid-Range**: 48k tokens
**Conservative**: 40k tokens (all low estimates)
**Aggressive**: 57k tokens (all high estimates)

**Recommended Buffer**: +15% = 55k tokens
**Safe Upper Limit**: 65k tokens

**Pro Quota Check**: 65k < 200k ✅ FITS (with 135k buffer)

---

## Architecture Design

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   DashboardManager                      │
│  (Central orchestrator - Phase 1)                       │
└──────────────┬──────────────────────────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼────────┐    ┌─────▼──────────┐
│  WebSocket  │    │  Data Sources  │
│   Server    │    │                │
│  (Existing) │    │ • QuotaTracker │
└─────┬───────┘    │ • ContextTrack │
      │            │ • SessionMon   │
      │            │ • MemoryMgr    │
      │            └────────┬───────┘
      │                     │
      │            ┌────────▼────────┐
      │            │  Event Bridge   │
      │            │  (Phase 2)      │
      │            └────────┬────────┘
      │                     │
      ├─────────────────────┤
      │                     │
┌─────▼─────────┐   ┌──────▼────────┐
│   Dashboard   │   │   Simulator   │
│     UI        │   │   (Phase 3)   │
│  (Existing)   │   │  Mock Data    │
└───────────────┘   └───────────────┘
```

### Data Flow

```
1. Session Activity Detected
   ↓
2. Data Source Updates (QuotaTracker, etc.)
   ↓
3. Event Bridge Catches Update
   ↓
4. WebSocket Broadcast Triggered
   ↓
5. Dashboard UI Receives Event
   ↓
6. UI Updates in Real-time
```

### Event Types

```typescript
// Session Events
'session:start'    → { id, project, startTime }
'session:tokens'   → { current, total, rate }
'session:complete' → { id, duration, tokens }

// Quota Events
'quota:update'     → { used, limit, percent, resetTime }
'quota:warning'    → { level, message, timeLeft }

// Context Events
'context:update'   → { used, limit, percent, status }
'context:warning'  → { level, message, recommendation }

// Health Events
'health:check'     → { status, components }
'health:error'     → { component, error, timestamp }
```

---

## Detailed Phase Breakdown

### Phase 1: Dashboard Manager (45 min)

**File**: `src/dashboard-manager.ts`

**Full Implementation**:
```typescript
import { WebSocketServer } from './websocket-server.js';
import { SessionMonitor } from './session-monitor.js';
import { QuotaTracker } from './quota-tracker.js';
import { ContextTracker } from './context-tracker.js';
import { DashboardSimulator } from './dashboard-simulator.js';

export interface DashboardOptions {
  port?: number;
  simulation?: boolean;
  autoStart?: boolean;
}

export interface DashboardStatus {
  running: boolean;
  mode: 'live' | 'simulation';
  websocket: {
    port: number;
    clients: number;
  };
  components: {
    quotaTracker: boolean;
    contextTracker: boolean;
    sessionMonitor: boolean;
  };
}

export class DashboardManager {
  private wsServer: WebSocketServer;
  private sessionMonitor?: SessionMonitor;
  private quotaTracker?: QuotaTracker;
  private contextTracker?: ContextTracker;
  private simulator?: DashboardSimulator;
  private running: boolean = false;
  private mode: 'live' | 'simulation' = 'live';

  constructor(private options: DashboardOptions = {}) {
    this.wsServer = new WebSocketServer(options.port || 3001);
  }

  /**
   * Start the dashboard system
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Dashboard already running');
    }

    // Start WebSocket server
    await this.wsServer.start();

    // Determine mode
    this.mode = this.options.simulation ? 'simulation' : 'live';

    if (this.mode === 'simulation') {
      // Start simulator
      this.simulator = new DashboardSimulator(this.wsServer);
      this.simulator.startSimulation();
    } else {
      // Initialize live data sources
      await this.initializeLiveMode();
    }

    this.running = true;
  }

  /**
   * Stop the dashboard system
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    // Stop simulator if running
    if (this.simulator) {
      this.simulator.stop();
    }

    // Stop WebSocket server
    await this.wsServer.stop();

    this.running = false;
  }

  /**
   * Get dashboard status
   */
  getStatus(): DashboardStatus {
    return {
      running: this.running,
      mode: this.mode,
      websocket: {
        port: 3001,
        clients: this.wsServer.getConnectedClients()
      },
      components: {
        quotaTracker: !!this.quotaTracker,
        contextTracker: !!this.contextTracker,
        sessionMonitor: !!this.sessionMonitor
      }
    };
  }

  /**
   * Initialize live mode with real data sources
   */
  private async initializeLiveMode(): Promise<void> {
    // Initialize quota tracker
    this.quotaTracker = new QuotaTracker();

    // Initialize context tracker
    this.contextTracker = new ContextTracker();

    // Initialize session monitor
    this.sessionMonitor = new SessionMonitor();

    // Connect session monitor to WebSocket
    this.sessionMonitor.setWebSocketServer(this.wsServer);

    // Set up event listeners
    this.setupEventListeners();

    // Broadcast initial state
    await this.broadcastInitialState();
  }

  /**
   * Set up event listeners for live data
   */
  private setupEventListeners(): void {
    // Quota tracker updates
    // Context tracker updates
    // Session monitor updates
    // (These will be implemented in Phase 2)
  }

  /**
   * Broadcast initial state to new clients
   */
  private async broadcastInitialState(): Promise<void> {
    if (!this.quotaTracker || !this.contextTracker) return;

    const quotaStatus = await this.quotaTracker.getStatus();
    const contextStatus = this.contextTracker.getStatus();

    this.wsServer.broadcast({
      type: 'quota:update',
      data: quotaStatus,
      timestamp: new Date()
    });

    this.wsServer.broadcast({
      type: 'context:update',
      data: contextStatus,
      timestamp: new Date()
    });
  }
}
```

**Steps**:
1. Create DashboardManager class with lifecycle methods
2. Add mode switching (live vs simulation)
3. Implement component initialization
4. Add status reporting
5. Test with mock data

---

### Phase 2: Session Monitor Integration (30 min)

**Update**: `src/session-monitor.ts`

**Changes**:
```typescript
export class SessionMonitor {
  private wsServer?: WebSocketServer;

  /**
   * Connect WebSocket server for broadcasting
   */
  setWebSocketServer(server: WebSocketServer): void {
    this.wsServer = server;
  }

  /**
   * Track token usage - now broadcasts
   */
  trackTokens(tokens: number): void {
    // Existing logic...

    // NEW: Broadcast to dashboard
    this.wsServer?.broadcast({
      type: 'session:tokens',
      data: {
        current: tokens,
        sessionTotal: this.getCurrentSessionTokens(),
        quota: this.getQuotaInfo()
      },
      timestamp: new Date()
    });
  }

  // Similar updates for other tracking methods...
}
```

**Steps**:
1. Add WebSocket server property
2. Update all tracking methods to broadcast
3. Add quota/context integration
4. Test event broadcasting

---

### Phase 3: Data Simulator (30 min)

**File**: `src/dashboard-simulator.ts`

**Full Implementation**:
```typescript
import { WebSocketServer } from './websocket-server.js';

export class DashboardSimulator {
  private intervals: NodeJS.Timeout[] = [];
  private running: boolean = false;
  private tokens: number = 0;
  private contextUsed: number = 0;

  constructor(private wsServer: WebSocketServer) {}

  /**
   * Start simulation
   */
  startSimulation(): void {
    if (this.running) return;
    this.running = true;

    // Simulate session start
    this.simulateSessionStart();

    // Start token growth (every 2 seconds)
    const tokenInterval = setInterval(() => {
      this.simulateTokenUpdate();
    }, 2000);
    this.intervals.push(tokenInterval);

    // Start quota updates (every 5 seconds)
    const quotaInterval = setInterval(() => {
      this.simulateQuotaUpdate();
    }, 5000);
    this.intervals.push(quotaInterval);

    // Start context updates (every 3 seconds)
    const contextInterval = setInterval(() => {
      this.simulateContextUpdate();
    }, 3000);
    this.intervals.push(contextInterval);
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.running = false;
  }

  private simulateSessionStart(): void {
    this.wsServer.broadcast({
      type: 'session:start',
      data: {
        id: `demo-${Date.now()}`,
        project: 'claude-optimizer-v2',
        startTime: new Date()
      },
      timestamp: new Date()
    });
  }

  private simulateTokenUpdate(): void {
    // Gradual increase with some randomness
    this.tokens += Math.floor(Math.random() * 500) + 100;

    // Cap at 200k
    if (this.tokens > 200000) {
      this.tokens = 200000;
      this.stop();
      this.simulateSessionComplete();
      return;
    }

    this.wsServer.broadcast({
      type: 'session:tokens',
      data: {
        current: this.tokens,
        total: 200000,
        rate: 450 // tokens per minute
      },
      timestamp: new Date()
    });
  }

  private simulateQuotaUpdate(): void {
    const percent = (this.tokens / 200000) * 100;

    this.wsServer.broadcast({
      type: 'quota:update',
      data: {
        used: this.tokens,
        limit: 200000,
        percent: Math.round(percent),
        resetTime: new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours
      },
      timestamp: new Date()
    });
  }

  private simulateContextUpdate(): void {
    // Context grows slower than tokens
    this.contextUsed += Math.floor(Math.random() * 1000) + 500;

    // Cap at 180k
    if (this.contextUsed > 180000) {
      this.contextUsed = 180000;
    }

    const percent = (this.contextUsed / 180000) * 100;
    let status = 'healthy';
    if (percent > 90) status = 'critical';
    else if (percent > 80) status = 'danger';
    else if (percent > 50) status = 'warning';

    this.wsServer.broadcast({
      type: 'context:update',
      data: {
        used: this.contextUsed,
        limit: 180000,
        percent: Math.round(percent),
        status
      },
      timestamp: new Date()
    });
  }

  private simulateSessionComplete(): void {
    this.wsServer.broadcast({
      type: 'session:complete',
      data: {
        tokensUsed: this.tokens,
        duration: '2.5 hours',
        efficiency: 'good'
      },
      timestamp: new Date()
    });
  }
}
```

---

### Phase 4-7: See continuation in implementation notes

---

## Risk Factors

**Potential Issues** (+8-15k tokens):

1. **WebSocket Connection Stability** (+3-5k tokens)
   - Mitigation: Add reconnection logic, heartbeat monitoring

2. **Cross-platform Browser Opening** (+2-3k tokens)
   - Mitigation: Test on macOS/Windows/Linux, fallback to manual open

3. **Port Conflicts** (+2-3k tokens)
   - Mitigation: Check port availability, allow custom port selection

4. **Data Source Integration Complexity** (+3-5k tokens)
   - Mitigation: Start with simple events, add complexity incrementally

**Total Risk**: +10-16k tokens
**Worst Case**: 73k tokens (still fits quota ✅)

---

## Testing Strategy

### Unit Tests
- DashboardManager lifecycle
- Event broadcasting
- Simulator data generation
- Health checks

### Integration Tests
- End-to-end data flow
- WebSocket connectivity
- Dashboard command execution
- Error scenarios

### Manual Tests
- Dashboard opens in browser
- Live data updates work
- Simulation mode works
- Graceful error handling

---

## Success Metrics

After Session 9, you will have:

✅ **One Command Launch**
```bash
dashboard start
# → Server starts
# → Dashboard opens
# → Live data flows
```

✅ **Demo Mode**
```bash
dashboard start --simulation
# → Realistic mock data
# → Perfect for demos
```

✅ **Production Ready**
- Error handling
- Health monitoring
- Graceful shutdown
- Comprehensive tests

---

## Session Start Prompt

**Copy-paste this into Claude Code**:

```markdown
You are implementing SESSION 9: Production Dashboard with Live Data Integration.

**Context**: You have excellent infrastructure already built:
- WebSocket server (src/websocket-server.ts)
- Beautiful dashboard UI (../dashboard.html)
- All data sources (QuotaTracker, ContextTracker, SessionMonitor)
- What's missing: The integration layer to connect everything

**Your Task**: Build the integration layer for production-ready real-time dashboard.

**Deliverables** (in order):

1. **DashboardManager** (45 min, 12-15k tokens)
   - Create: src/dashboard-manager.ts
   - Central orchestrator for all components
   - Live mode vs simulation mode
   - Lifecycle management (start/stop)
   - Status reporting

2. **Session Monitor Integration** (30 min, 8-12k tokens)
   - Update: src/session-monitor.ts
   - Add WebSocket broadcasting
   - Emit events for token/quota/context updates
   - Test integration

3. **Data Simulator** (30 min, 8-10k tokens)
   - Create: src/dashboard-simulator.ts
   - Generate realistic mock data
   - Gradual token growth
   - Quota percentage updates
   - Context window simulation

4. **Dashboard Command** (30 min, 6-8k tokens)
   - Create: src/commands/dashboard.ts
   - CLI command: dashboard start [--simulation] [--no-browser]
   - Beautiful output with chalk
   - Auto-open browser
   - Graceful error handling

5. **Health Monitoring** (20 min, 5-7k tokens)
   - Create: src/dashboard-health.ts
   - Component health checks
   - Diagnostic output
   - Error reporting

6. **Integration Tests** (30 min, 8-10k tokens)
   - Create: tests/dashboard-integration.test.ts
   - Test full data flow
   - Test simulation mode
   - Test error scenarios
   - Test command execution

7. **Documentation** (20 min, 4-6k tokens)
   - Update: README.md (dashboard section)
   - Create: DASHBOARD.md (complete guide)
   - Add troubleshooting
   - Add examples

**Key Architecture**:
```
DashboardManager
  ├─ WebSocketServer (existing)
  ├─ SessionMonitor (update with broadcasting)
  ├─ QuotaTracker (integrate)
  ├─ ContextTracker (integrate)
  └─ DashboardSimulator (create for demo mode)
```

**Working Approach**:
1. Start with DashboardManager foundation
2. Add simulation mode first (easier to test)
3. Then add live mode integration
4. Build CLI command
5. Add health monitoring
6. Write comprehensive tests
7. Polish and document

Ready to build production dashboard!
```

---

## Next Steps (Session 10)

After Session 9 completes, Session 10 will focus on:

**Production Polish & Deployment**:
1. Fix remaining test issues (93 → 93 passing)
2. Package for npm distribution
3. Create installers
4. Professional error messages
5. Performance optimization
6. Security audit
7. Deployment guides

---

**Session 9 Plan Created**: 2025-10-02
**Focus**: Reliable dashboard with live data
**Approach**: Build on existing excellent infrastructure
**Ready to Start**: ✅ Yes
