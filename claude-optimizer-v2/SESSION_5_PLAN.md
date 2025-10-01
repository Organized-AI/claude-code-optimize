# Session 5: Context Window Monitoring System

**Status**: 🔴 CRITICAL PRIORITY - NOT STARTED
**Estimated Time**: 3-4 hours
**Estimated Tokens**: 45-65k tokens (23-33% of Pro quota)
**Fits Pro Quota**: ✅ YES (with 135-155k buffer)
**Prerequisites**: SESSION 1-4 complete, TypeScript environment ready
**Can Run in Parallel**: ❌ NO (foundational - must complete first)

---

## Executive Summary

Build the complete context window monitoring system to track conversation context usage (0-180k tokens) alongside the existing quota tracking. This enables dual monitoring so users never hit unexpected context limits while coding.

**Why Critical**: We have excellent quota tracking but zero context tracking. Context fills up independently of quota and can stop coding sessions just as effectively. This session closes that critical gap.

---

## Session Objectives

### Primary Goals
1. ✅ Build context tracker module following quota-tracker.ts patterns
2. ✅ Implement three-level context compaction system
3. ✅ Create three new slash commands for context management
4. ✅ Integrate context monitoring with existing session monitor
5. ✅ Update /session-status to show dual quota + context display

### Success Criteria
- ✅ All 5 new files created and compile without errors
- ✅ Commands work: /context-status, /compact-context, /save-and-restart
- ✅ /session-status displays both quota and context windows
- ✅ Tests pass for context tracking
- ✅ Documentation updated in AGENTS.md

---

## Token Estimation Breakdown

### Phase 1: Context Tracker Module (45 min)
**Estimated Tokens**: 15,000 - 20,000

**Calculation**:
- Base implementation: 15,000 tokens
- Duration: 0.75 hours
- Rate: 45,000 tokens/hour (implementation type)
- Formula: 0.75h × 45k/h × 0.9 (familiar TypeScript) = 18,187 tokens
- Range: ±15% = 15,000 - 20,000

**Reasoning**:
- Follow quota-tracker.ts patterns (familiar code structure)
- TypeScript interfaces and class: ~5k tokens
- Estimation logic: ~8k tokens
- Threshold detection: ~5k tokens
- **Complexity**: 0.9 (following existing pattern)
- **Confidence**: HIGH

### Phase 2: Context Compactor Module (30 min)
**Estimated Tokens**: 12,000 - 15,000

**Calculation**:
- Base implementation: 12,000 tokens
- Duration: 0.5 hours
- Rate: 45,000 tokens/hour
- Formula: 0.5h × 45k/h × 1.0 (new compaction logic) = 12,500 tokens
- Range: ±12% = 12,000 - 15,000

**Reasoning**:
- Three compaction levels: ~8k tokens
- Removal logic: ~4k tokens
- **Complexity**: 1.0 (new logic, moderate complexity)
- **Confidence**: MEDIUM

### Phase 3: Slash Commands (65 min)
**Estimated Tokens**: 26,000 - 32,000

**Calculation**:
- Three commands × ~9k tokens each = 27,000 tokens
- Range: ±10% = 26,000 - 32,000

**Commands**:
1. /context-status: ~8-10k tokens
2. /compact-context: ~10-12k tokens
3. /save-and-restart: ~8-10k tokens

**Reasoning**:
- Follow plan-next-session.ts patterns
- Interactive flows with readline
- **Complexity**: 0.9 (familiar patterns)
- **Confidence**: HIGH

### Phase 4: Integration & Testing (80 min)
**Estimated Tokens**: 30,000 - 38,000

**Calculation**:
- Session monitor integration: ~12-15k tokens
- CLI status update: ~12-15k tokens
- Testing: ~10-12k tokens
- Range: 30,000 - 38,000

**Reasoning**:
- Update existing files carefully
- Write comprehensive tests
- **Complexity**: 1.0 (integration work)
- **Confidence**: MEDIUM

---

## Total Estimate

**Mid-Range**: 56,000 tokens
**Conservative**: 45,000 tokens (all phases at low end)
**Aggressive**: 65,000 tokens (all phases at high end)

**Recommended Buffer**: +15% = 65,000 tokens
**Safe Upper Limit**: 75,000 tokens

**Pro Quota Check**: 75k < 200k ✅ FITS (with 125k buffer)

---

## Risk Factors (Could Increase Usage)

1. **Context Estimation Complexity** (+8-12k tokens)
   - Mitigation: Start with simple token counting heuristics

2. **Compaction Logic Edge Cases** (+5-8k tokens)
   - Mitigation: Focus on clear removal/preservation rules

3. **Integration Debugging** (+5-10k tokens)
   - Mitigation: Test incrementally, one integration at a time

**Total Risk**: +18-30k tokens
**Worst Case**: 95k tokens (still fits quota ✅)

---

## Phase Breakdown

### Phase 1: Context Tracker Module (45 min, 15-20k tokens)

**Deliverable**: `src/context-tracker.ts`

**Implementation**:
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

export class ContextTracker {
  private readonly CONTEXT_LIMIT = 180000;  // 90% of 200k
  private readonly THRESHOLDS = {
    WARNING: 0.50,   // 90k tokens
    DANGER: 0.80,    // 144k tokens
    CRITICAL: 0.90   // 162k tokens
  };

  async estimateCurrentContext(): Promise<ContextUsage>
  identifyCompactionOpportunities(): CompactionItem[]
  shouldNotify(usage: number): NotificationLevel | null
}
```

**Pattern to Follow**: `src/quota-tracker.ts`

**Steps**:
1. Read quota-tracker.ts to understand structure
2. Create ContextUsage interface
3. Implement ContextTracker class
4. Add threshold detection logic
5. Build estimation heuristics

---

### Phase 2: Context Compactor Module (30 min, 12-15k tokens)

**Deliverable**: `src/context-compactor.ts`

**Implementation**:
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
  compact(level: CompactionLevel): Promise<CompactionResult>

  private softCompact(): CompactionResult    // 10-20k savings
  private strategicCompact(): CompactionResult  // 30-50k savings
  private emergencyCompact(): CompactionResult  // 60-80k savings
}
```

**Compaction Rules**:
- **Remove**: Old file reads (keep recent 10), duplicate tools, verbose output
- **Preserve**: Decisions, current edits, objectives, errors

---

### Phase 3: Slash Commands (65 min, 26-32k tokens)

#### Command 1: /context-status (20 min, 8-10k tokens)

**Deliverable**: `src/commands/context-status.ts`

**Output Example**:
```
📝 Context Window Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 USAGE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Context:    68,000 / 180,000 tokens
Percentage:       38% used
Status:           🟢 HEALTHY - Normal operation
Remaining:        112,000 tokens (~2-3 hours)

📁 CONTEXT BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
System Prompt:    5,000 tokens   (7%)
File Reads:       18,000 tokens  (26%) - 12 files
Tool Results:     15,000 tokens  (22%) - 34 results
Conversation:     20,000 tokens  (29%) - 45 exchanges
Code Generated:   10,000 tokens  (15%) - 8 responses

🧹 COMPACTION OPPORTUNITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Old file reads:   -3,000 tokens (keep recent 10)
Duplicate tools:  -2,000 tokens (deduplicate)

💡 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Context is healthy - no action needed
📊 Next checkpoint: 50% (90k tokens)
```

#### Command 2: /compact-context (25 min, 10-12k tokens)

**Deliverable**: `src/commands/compact-context.ts`

**Interactive Flow**:
1. Analyze current context
2. Show removal vs preservation plan
3. Get user confirmation
4. Perform compaction
5. Report savings

#### Command 3: /save-and-restart (20 min, 8-10k tokens)

**Deliverable**: `src/commands/save-and-restart.ts`

**Flow**:
1. Create handoff with current context (use HandoffManager)
2. Gather focus for new session
3. Provide restart instructions

**Update**: `package.json` bin section for all three commands

---

### Phase 4: Integration & Testing (80 min, 30-38k tokens)

#### Integration 1: Update /session-status (30 min, 12-15k tokens)

**Update**: `src/cli.ts` status command

**Add Context Section**:
```
📝 CONTEXT WINDOW (Session)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:        Claude Sonnet 4.5
Used:         68,000 / 180,000 tokens (38%)
Status:       🟢 HEALTHY - Normal operation
Est. Hours:   ~2-3 hours remaining

⚡ COMBINED HEALTH: GOOD
   Both quota and context are healthy.
```

#### Integration 2: Session Monitor (20 min, 8-10k tokens)

**Update**: `src/session-monitor.ts`

**Add Context Tracking**:
```typescript
import { ContextTracker } from './context-tracker.js';

const contextTracker = new ContextTracker();
const quotaTracker = new QuotaTracker();

// Combined alerting
if (contextUsage >= 0.80 && quotaUsage >= 0.80) {
  sendCriticalAlert('BOTH context and quota approaching limits!');
} else if (contextUsage >= 0.80) {
  sendContextAlert(contextStatus);
}
```

#### Testing (30 min, 10-12k tokens)

**Create**: `tests/context-tracker.test.ts`

**Test Coverage**:
- ✅ Context estimation at different levels
- ✅ Threshold detection (50%, 80%, 90%)
- ✅ Compaction at all three levels
- ✅ Integration with session monitor

**Run**: `npm run build && npm test`

---

## Prerequisites

### Before Starting
1. ✅ SESSION 1-4 completed
2. ✅ TypeScript environment working (`npm run build` succeeds)
3. ✅ Existing tests passing (`npm test` succeeds)
4. ✅ Git working directory clean

### Files to Read First
1. `src/quota-tracker.ts` - Pattern to follow
2. `src/session-monitor.ts` - Integration point
3. `src/handoff-manager.ts` - Used by /save-and-restart
4. `src/commands/plan-next-session.ts` - Command pattern

### Reference Documents
1. `IMPLEMENTATION_GAP_ANALYSIS.md` - What to build
2. `AUTOMATED_SESSION_ORCHESTRATION_PLAN.md` Section 8 - Specifications
3. `BUILD_ORCHESTRATION_PROMPT.md` - This session's prompt

---

## Session Start Prompt

**Copy-paste this into Claude Code**:

```markdown
You are implementing SESSION 5: Context Window Monitoring System for Claude Code Optimizer v2.0.

**Context**: We have a working quota tracking system (quota-tracker.ts) that monitors token usage in 5-hour rolling windows. Now we need parallel context window monitoring because:
- Quota: Rolling 5-hour limit (resets automatically)
- Context: Per-session cumulative (grows until restart)
- Both can limit coding independently

**Reference Documents**:
- Read: IMPLEMENTATION_GAP_ANALYSIS.md (what to build)
- Read: AUTOMATED_SESSION_ORCHESTRATION_PLAN.md Section 8 (specifications)
- Read: SESSION_5_PLAN.md (this plan)
- Pattern: src/quota-tracker.ts (follow this structure)

**Your Task**: Build the complete context window monitoring system.

**Deliverables** (in order):

1. **Context Tracker Module** (45 min, 15-20k tokens)
   - Create: src/context-tracker.ts
   - Follow quota-tracker.ts patterns
   - Implement ContextUsage interface and ContextTracker class

2. **Context Compactor Module** (30 min, 12-15k tokens)
   - Create: src/context-compactor.ts
   - Implement three levels: soft, strategic, emergency
   - Removal logic: old file reads, duplicate tools, verbose output
   - Preservation: decisions, current edits, objectives, errors

3. **Slash Command: /context-status** (20 min, 8-10k tokens)
   - Create: src/commands/context-status.ts
   - Display detailed analysis with breakdown
   - Update package.json bin section

4. **Slash Command: /compact-context** (25 min, 10-12k tokens)
   - Create: src/commands/compact-context.ts
   - Interactive compaction flow
   - Update package.json bin section

5. **Slash Command: /save-and-restart** (20 min, 8-10k tokens)
   - Create: src/commands/save-and-restart.ts
   - Integrate with HandoffManager
   - Update package.json bin section

6. **Integration: Update /session-status** (30 min, 12-15k tokens)
   - Update: src/cli.ts status command
   - Add context window section
   - Show dual quota + context status

7. **Integration: Session Monitor** (20 min, 8-10k tokens)
   - Update: src/session-monitor.ts
   - Add context tracking alongside quota
   - Implement combined alerting

8. **Testing & Documentation** (30 min, 10-12k tokens)
   - Create: tests/context-tracker.test.ts
   - Test all threshold levels
   - Update: AGENTS.md with new commands
   - Build and verify: npm run build && npm test

**Success Criteria**:
- ✅ All 5 files created and compile without errors
- ✅ All 3 commands work: /context-status, /compact-context, /save-and-restart
- ✅ /session-status shows both quota and context
- ✅ Tests pass for context tracking
- ✅ Documentation updated

**Working Approach**:
1. Read quota-tracker.ts first to understand patterns
2. Build incrementally: tracker → compactor → commands → integration
3. Test each component before moving to next
4. Follow TypeScript conventions from existing code

Ready to build SESSION 5?
```

---

## Historical Context

**Previous Sessions**:
- SESSION 1-4: Built quota tracking, calendar integration, handoffs, dashboard
- Current gap: No context window tracking (0% complete vs 100% quota tracking)

**Why This Session Matters**:
- Context fills independently of quota
- Users can hit context limits unexpectedly
- Dual tracking prevents both types of limits
- Foundation for future sessions (6A needs context data)

---

## Next Session

After SESSION 5 completes:
- **Option 1**: SESSION 6A (Token Estimation) + SESSION 6B (Automation) in parallel
- **Option 2**: SESSION 6A solo, then SESSION 6B solo
- **Recommended**: Parallel execution (saves 2-3 hours)

See: `SESSION_6A_PLAN.md` and `SESSION_6B_PLAN.md`
