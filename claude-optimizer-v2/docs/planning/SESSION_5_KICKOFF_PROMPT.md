# SESSION 5: Context Window Monitoring - KICKOFF PROMPT

**Copy-paste this entire prompt into Claude Code to start SESSION 5.**

---

You are implementing **SESSION 5: Context Window Monitoring System** for Claude Code Optimizer v2.0.

## Context & Mission

We have a working quota tracking system (`src/quota-tracker.ts`) that monitors token usage in 5-hour rolling windows. Now we need **parallel context window monitoring** because:

- **Quota**: Rolling 5-hour limit (resets automatically)
- **Context**: Per-session cumulative (grows until restart)
- **Problem**: Both can limit coding independently - you can have quota but no context!

**Your mission**: Build complete context window tracking with 50%/80%/90% alerts and three-level compaction system.

---

## Reference Documents (Read These First)

**Planning Documents**:
1. [SESSION_5_PLAN.md](claude-optimizer-v2/SESSION_5_PLAN.md) - Comprehensive plan with token estimates
2. [IMPLEMENTATION_GAP_ANALYSIS.md](IMPLEMENTATION_GAP_ANALYSIS.md) - What's missing
3. [AUTOMATED_SESSION_ORCHESTRATION_PLAN.md](claude-optimizer-v2/docs/planning/AUTOMATED_SESSION_ORCHESTRATION_PLAN.md) Section 8 - Detailed specs

**Code Patterns to Follow**:
1. `src/quota-tracker.ts` - Structure to mirror (threshold detection, notifications)
2. `src/session-monitor.ts` - Integration point (add context tracking here)
3. `src/handoff-manager.ts` - Used by /save-and-restart command
4. `src/commands/plan-next-session.ts` - Command pattern to follow

---

## Deliverables (Build in This Order)

### Phase 1: Core Context Tracker (45 min, 15-20k tokens)

**Create**: `src/context-tracker.ts`

**Follow this structure** (mirror quota-tracker.ts):

```typescript
export interface ContextUsage {
  totalTokens: number;
  breakdown: {
    systemPrompt: number;      // ~5k
    fileReads: number;         // 500-5k each
    toolResults: number;       // 100-2k each
    conversation: number;      // 100-500 per exchange
    codeGenerated: number;     // 500-3k per response
  };
  percentUsed: number;
  status: 'fresh' | 'healthy' | 'moderate' | 'warning' | 'danger' | 'critical';
  compactionOpportunities: CompactionItem[];
}

export interface CompactionItem {
  category: string;
  currentTokens: number;
  potentialSavings: number;
  description: string;
  safe: boolean;  // Safe to remove?
}

export class ContextTracker {
  private readonly CONTEXT_LIMIT = 180000;  // 90% of 200k
  private readonly THRESHOLDS = {
    WARNING: 0.50,   // 90k tokens
    DANGER: 0.80,    // 144k tokens
    CRITICAL: 0.90   // 162k tokens
  };

  async estimateCurrentContext(): Promise<ContextUsage> {
    // Estimate tokens in current conversation
    // Start with simple heuristics
  }

  identifyCompactionOpportunities(): CompactionItem[] {
    // Identify what can be removed safely
  }

  shouldNotify(usage: number): NotificationLevel | null {
    // Check if crossed threshold
  }

  sendNotification(level: NotificationLevel, usage: ContextUsage): void {
    // Send macOS desktop notification
    // Use osascript like quota-tracker.ts does
  }
}
```

---

### Phase 2: Context Compactor (30 min, 12-15k tokens)

**Create**: `src/context-compactor.ts`

**Three compaction levels**:

```typescript
export type CompactionLevel = 'soft' | 'strategic' | 'emergency';

export interface CompactionResult {
  beforeTokens: number;
  afterTokens: number;
  tokensSaved: number;
  itemsRemoved: number;
  itemsPreserved: number;
}

export class ContextCompactor {
  async compact(level: CompactionLevel): Promise<CompactionResult> {
    switch (level) {
      case 'soft':
        return this.softCompact();      // 10-20k savings
      case 'strategic':
        return this.strategicCompact(); // 30-50k savings
      case 'emergency':
        return this.emergencyCompact(); // 60-80k savings
    }
  }

  private softCompact(): Promise<CompactionResult> {
    // Level 1: Automatic cleanup
    // Remove: duplicate tools, redundant results
    // Preserve: everything important
  }

  private strategicCompact(): Promise<CompactionResult> {
    // Level 2: User-prompted
    // Remove: old file reads (keep 10), verbose output
    // Preserve: decisions, current edits, objectives
  }

  private emergencyCompact(): Promise<CompactionResult> {
    // Level 3: Aggressive automatic
    // Remove: all non-essential context
    // Preserve: only critical decisions and current state
  }
}
```

---

### Phase 3: Three Slash Commands (65 min, 26-32k tokens)

#### Command 1: /context-status (20 min, 8-10k tokens)

**Create**: `src/commands/context-status.ts`

**Follow**: `src/commands/plan-next-session.ts` pattern

**Output format**:
```
📝 Context Window Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 USAGE SUMMARY
Total Context:    68,000 / 180,000 tokens
Percentage:       38% used
Status:           🟢 HEALTHY - Normal operation
Remaining:        112,000 tokens (~2-3 hours)

📁 CONTEXT BREAKDOWN
System Prompt:    5,000 tokens   (7%)
File Reads:       18,000 tokens  (26%) - 12 files
Tool Results:     15,000 tokens  (22%) - 34 results
Conversation:     20,000 tokens  (29%) - 45 exchanges
Code Generated:   10,000 tokens  (15%) - 8 responses

🧹 COMPACTION OPPORTUNITIES
Old file reads:   -3,000 tokens
Duplicate tools:  -2,000 tokens

💡 RECOMMENDATIONS
✅ Context is healthy - no action needed
📊 Next checkpoint: 50% (90k tokens)
```

**Update**: `package.json` bin section to add command

---

#### Command 2: /compact-context (25 min, 10-12k tokens)

**Create**: `src/commands/compact-context.ts`

**Interactive flow**:
1. Show current context usage
2. Display compaction opportunities
3. Ask: "Compact now? (y/n)"
4. Perform compaction
5. Show before/after stats

---

#### Command 3: /save-and-restart (20 min, 8-10k tokens)

**Create**: `src/commands/save-and-restart.ts`

**Flow**:
1. Use `HandoffManager` to create handoff
2. Ask: "What should new session focus on?"
3. Save handoff file
4. Show restart instructions

---

### Phase 4: Integration (50 min, 20-25k tokens)

#### Update /session-status (30 min, 12-15k tokens)

**Update**: `src/cli.ts` status command

**Add context window section**:
```typescript
// After quota display, add:

console.log(chalk.bold('\n📝 CONTEXT WINDOW (Session)\n'));
console.log(chalk.gray('━'.repeat(60)));

const contextTracker = new ContextTracker();
const contextStatus = await contextTracker.estimateCurrentContext();

console.log(`Model:        Claude Sonnet 4.5`);
console.log(`Used:         ${contextStatus.totalTokens.toLocaleString()} / 180,000 tokens (${contextStatus.percentUsed}%)`);
console.log(`Status:       ${getContextStatusDisplay(contextStatus.status)}`);
console.log(`Est. Hours:   ~${estimateHoursRemaining(contextStatus.remaining)} hours remaining`);

// Combined health
console.log(chalk.bold('\n⚡ COMBINED HEALTH\n'));
if (quotaStatus.percent > 70 && contextStatus.percentUsed > 70) {
  console.log(chalk.red('⚠️  Both approaching limits - plan next session'));
} else {
  console.log(chalk.green('✅ Both quota and context are healthy'));
}
```

---

#### Update session-monitor.ts (20 min, 8-10k tokens)

**Update**: `src/session-monitor.ts`

**Add dual tracking**:
```typescript
import { ContextTracker } from './context-tracker.js';
import { QuotaTracker } from './quota-tracker.js';

const contextTracker = new ContextTracker();
const quotaTracker = new QuotaTracker();

// In monitoring loop:
setInterval(async () => {
  const contextStatus = await contextTracker.estimateCurrentContext();
  const quotaStatus = quotaTracker.getStatus();

  // Combined alerting
  if (contextStatus.percentUsed >= 0.80 && quotaStatus.percent >= 80) {
    sendCriticalAlert('🚨 CRITICAL: Both context and quota approaching limits!');
  } else if (contextStatus.percentUsed >= 0.80) {
    contextTracker.sendNotification('danger', contextStatus);
  } else if (quotaStatus.percent >= 80) {
    quotaTracker.sendNotification('danger', quotaStatus);
  }
}, 60000); // Check every minute
```

---

### Phase 5: Testing (30 min, 10-12k tokens)

**Create**: `tests/context-tracker.test.ts`

**Test coverage**:
- ✅ Context estimation at 0%, 50%, 80%, 90%
- ✅ Threshold detection (should notify at 50%, 80%, 90%)
- ✅ Compaction saves expected tokens (soft: 10-20k, strategic: 30-50k, emergency: 60-80k)
- ✅ Status levels correct (fresh → healthy → moderate → warning → danger → critical)

**Run**:
```bash
npm run build
npm test
```

---

## 🔥 PARALLEL BUILD OPPORTUNITIES (Low Risk)

These can be built **simultaneously** in separate processes to save time:

### Independent Track 1: Commands (Can build all 3 in parallel)

**Why independent**: Each command is self-contained, no shared state

Build these **at the same time**:
- `/context-status` command
- `/compact-context` command
- `/save-and-restart` command

**Strategy**: Launch 3 agents (or 1 agent building all 3) after Phase 1+2 complete

---

### Independent Track 2: Tests (While integrating)

**Why independent**: Tests don't modify core code

Build **while doing Phase 4 integration**:
- Write `tests/context-tracker.test.ts`

**Strategy**: One agent integrates, another writes tests

---

## Parallel Execution Plan

**Sequential (Safe)**:
```
Phase 1 (tracker) → Phase 2 (compactor) → Phase 3 (commands) → Phase 4 (integration) → Phase 5 (tests)
Total: ~3h 40min
```

**Parallel (Faster)**:
```
Phase 1 (tracker) → Phase 2 (compactor) →
    ├─ Track A: Build 3 commands in parallel (65 min)
    └─ Track B: Integration work (50 min)
         └─ Track C: Write tests (30 min, while integrating)

Total: ~2h 45min (saves ~55 minutes!)
```

---

## Success Criteria

Before marking SESSION 5 complete, verify:

- ✅ All 5 files created and compile: `npm run build` succeeds
- ✅ All 3 commands work:
  - `/context-status` shows breakdown
  - `/compact-context` performs compaction
  - `/save-and-restart` creates handoff
- ✅ `/session-status` shows both quota AND context
- ✅ Tests pass: `npm test` succeeds
- ✅ Session monitor has dual tracking (quota + context)
- ✅ Desktop notifications work at 50%, 80%, 90%
- ✅ Documentation updated in AGENTS.md

---

## Working Approach

1. **Start by reading** `src/quota-tracker.ts` to understand patterns
2. **Build incrementally**: tracker → compactor → commands → integration
3. **Test each component** before moving to next
4. **Follow TypeScript conventions** from existing code
5. **Use parallel building** for commands and tests (saves time!)
6. **Commit frequently**: After each phase completes

---

## Estimated Time & Tokens

**Sequential**: 3h 40min, 83-97k tokens
**Parallel**: 2h 45min, 83-97k tokens (same tokens, less wall-clock time)
**Fits Pro Quota**: ✅ YES (with 103-117k buffer)

---

## After Completion

1. Mark SESSION 5 complete in [AGENTS.md](AGENTS.md) (🔴 → ✅)
2. Create `SESSION_5_HANDOFF.md` with accomplishments
3. Update completion % in [IMPLEMENTATION_GAP_ANALYSIS.md](IMPLEMENTATION_GAP_ANALYSIS.md)
4. Commit: `git commit -m "feat: Complete Session 5 - Context Window Monitoring"`
5. Move to SESSION 6A + 6B (can run in parallel!)

---

**Ready to build? Let's implement context window monitoring! 🚀**
