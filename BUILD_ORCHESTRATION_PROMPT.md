# Build Orchestration Prompt
## Claude Code Optimizer v2.0 - Implementation Sessions

**Purpose**: Execute the implementation plan from IMPLEMENTATION_GAP_ANALYSIS.md using specialized agents for maximum efficiency.

**Current Status**: 35% complete (12/34 features)
**Target**: 100% complete across 3-4 strategic sessions

---

## 🎯 SESSION 5: Context Window Monitoring System

**Status**: 🔴 CRITICAL PRIORITY
**Completion**: 0% → 85%
**Estimated**: 45-65k tokens, 3-4 hours
**Can Run in Parallel**: No (foundational - must complete first)

### Pre-Session Setup

**Prerequisites Check**:
```bash
# Verify foundation is solid
cd claude-optimizer-v2
npm run build  # Should compile without errors
npm test       # Should pass existing tests

# Check existing patterns
ls -la src/quota-tracker.ts  # Pattern to follow
ls -la src/session-monitor.ts  # Integration point
```

### Agent Orchestration Plan

**Use single general-purpose agent** (dependencies between components)

### Session Start Prompt

```markdown
You are implementing SESSION 5: Context Window Monitoring System for Claude Code Optimizer v2.0.

**Context**: We have a working quota tracking system (quota-tracker.ts) that monitors token usage in 5-hour rolling windows. Now we need parallel context window monitoring because:
- Quota: Rolling 5-hour limit (resets automatically)
- Context: Per-session cumulative (grows until restart)
- Both can limit coding independently

**Reference Documents**:
- Read: IMPLEMENTATION_GAP_ANALYSIS.md (what to build)
- Read: AUTOMATED_SESSION_ORCHESTRATION_PLAN.md Section 8 (specifications)
- Pattern: src/quota-tracker.ts (follow this structure)

**Your Task**: Build the complete context window monitoring system.

**Deliverables** (in order):

1. **Context Tracker Module** (45 min, 15-20k tokens)
   - Create: src/context-tracker.ts
   - Follow quota-tracker.ts patterns
   - Implement:
     ```typescript
     export interface ContextUsage {
       totalTokens: number;
       breakdown: {
         systemPrompt: number;
         fileReads: number;
         toolResults: number;
         conversation: number;
         codeGenerated: number;
       };
       percentUsed: number;
       status: 'fresh' | 'healthy' | 'moderate' | 'warning' | 'danger' | 'critical';
       compactionOpportunities: CompactionItem[];
     }

     export class ContextTracker {
       private readonly CONTEXT_LIMIT = 180000;
       private readonly THRESHOLDS = {
         WARNING: 0.50,   // 90k
         DANGER: 0.80,    // 144k
         CRITICAL: 0.90   // 162k
       };

       async estimateCurrentContext(): Promise<ContextUsage>
       identifyCompactionOpportunities(): CompactionItem[]
       shouldNotify(usage: number): NotificationLevel | null
     }
     ```

2. **Context Compactor Module** (30 min, 12-15k tokens)
   - Create: src/context-compactor.ts
   - Implement three levels:
     - Soft (Level 1): 10-20k savings, automatic
     - Strategic (Level 2): 30-50k savings, user-prompted
     - Emergency (Level 3): 60-80k savings, automatic
   - Removal logic: old file reads, duplicate tools, verbose output
   - Preservation: decisions, current edits, objectives, errors

3. **Slash Command: /context-status** (20 min, 8-10k tokens)
   - Create: src/commands/context-status.ts
   - Display detailed analysis:
     - Total usage (X / 180k)
     - Breakdown by category
     - Compaction opportunities
     - Status level with emoji
     - Actionable recommendations
   - Update package.json bin section

4. **Slash Command: /compact-context** (25 min, 10-12k tokens)
   - Create: src/commands/compact-context.ts
   - Interactive flow:
     1. Analyze current context
     2. Show removal vs preservation
     3. Get user confirmation
     4. Perform compaction
     5. Report savings
   - Update package.json bin section

5. **Slash Command: /save-and-restart** (20 min, 8-10k tokens)
   - Create: src/commands/save-and-restart.ts
   - Flow:
     1. Create handoff with current context
     2. Gather focus for new session
     3. Provide restart instructions
   - Integrate with HandoffManager
   - Update package.json bin section

6. **Integration: Update /session-status** (30 min, 12-15k tokens)
   - Update: src/cli.ts status command
   - Add context window section:
     ```
     📝 CONTEXT WINDOW (Session)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     Model:        Claude Sonnet 4.5
     Used:         68,000 / 180,000 tokens (38%)
     Status:       🟢 HEALTHY - Normal operation

     ⚡ COMBINED HEALTH: GOOD
     ```
   - Show dual quota + context status

7. **Integration: Session Monitor** (20 min, 8-10k tokens)
   - Update: src/session-monitor.ts
   - Add context tracking alongside quota tracking
   - Implement combined alerting:
     ```typescript
     if (contextUsage >= 0.80 && quotaUsage >= 0.80) {
       sendCriticalAlert('Both limits approaching!');
     }
     ```

8. **Testing & Documentation** (30 min, 10-12k tokens)
   - Create: tests/context-tracker.test.ts
   - Test all threshold levels
   - Test compaction levels
   - Update: AGENTS.md with new commands
   - Build and verify: npm run build && npm test

**Success Criteria**:
- ✅ All 5 files created and compile without errors
- ✅ All 3 commands work: /context-status, /compact-context, /save-and-restart
- ✅ /session-status shows both quota and context
- ✅ Tests pass for context tracking
- ✅ Documentation updated

**Total Estimated**: 3h 15min, 85-110k tokens

**Working Approach**:
1. Read quota-tracker.ts first to understand patterns
2. Build incrementally: tracker → compactor → commands → integration
3. Test each component before moving to next
4. Follow TypeScript conventions from existing code
5. Use existing HandoffManager, QuotaTracker patterns

Ready to build SESSION 5?
```

---

## 🎯 SESSION 6A & 6B: Token Estimation + Automation (PARALLEL)

**Status**: 🟡 HIGH PRIORITY
**Completion**: 0% → 70%
**Estimated**: 90-130k tokens total, 5-6 hours
**Can Run in Parallel**: YES - Independent systems

### Parallel Execution Strategy

Run TWO agents simultaneously:
- **Agent 1**: Token Estimation System (6A)
- **Agent 2**: Automation Scripts (6B)

These are independent and don't share code.

---

## 📋 SESSION 6A: Token Estimation ML System

**Agent**: General-purpose
**Estimated**: 55-75k tokens, 3-4 hours
**Prerequisites**: SESSION 5 complete (needs context tracking for full picture)

### Session Start Prompt

```markdown
You are implementing SESSION 6A: Token Estimation ML System for Claude Code Optimizer v2.0.

**Context**: We now have dual tracking (quota + context). The next layer is predictive: estimate token usage for planned sessions and learn from actual usage to improve accuracy over time (72% → 95%).

**Reference Documents**:
- Read: IMPLEMENTATION_GAP_ANALYSIS.md Section "Token Estimation ML System"
- Read: AUTOMATED_SESSION_ORCHESTRATION_PLAN.md Section 7
- Read: SESSION_3_PLAN.md (example session with token estimates)

**Your Task**: Build the token estimation and learning system.

**Deliverables** (in order):

1. **Token Estimator Module** (60 min, 25-30k tokens)
   - Create: src/token-estimator.ts
   - Implement:
     ```typescript
     interface TaskEstimate {
       taskType: 'planning' | 'implementation' | 'refactoring' | 'testing' | 'debugging' | 'polish';
       baseTokens: number;
       tokensPerHour: number;
       confidenceLevel: 'low' | 'medium' | 'high';
     }

     const TASK_ESTIMATES = {
       planning: { baseTokens: 15000, tokensPerHour: 20000, confidenceLevel: 'high' },
       implementation: { baseTokens: 25000, tokensPerHour: 45000, confidenceLevel: 'medium' },
       // ... etc
     };

     const COMPLEXITY_FACTORS = {
       projectSize: { small: 0.8, medium: 1.0, large: 1.3, enterprise: 1.6 },
       techStack: { familiar: 0.9, learning: 1.2, new: 1.5 },
       codeQuality: { clean: 0.9, mixed: 1.0, legacy: 1.4 }
     };

     export class TokenEstimator {
       estimateSession(sessionPlan: SessionPlan): SessionEstimate
       trackActualUsage(sessionId: string, actual: number): void
       calculateVariance(estimated: number, actual: number): Variance
       updateModel(variance: Variance): void
       generateReport(sessionId: string): AnalysisReport
     }
     ```

2. **Session Plan Parser** (30 min, 12-15k tokens)
   - Create: src/session-plan-parser.ts
   - Parse SESSION_N_PLAN.md files
   - Extract phases, objectives, complexity factors
   - Return structured SessionPlan object

3. **ML Model Persistence** (20 min, 8-10k tokens)
   - Create: src/ml-model-storage.ts
   - Store model in: ~/.claude/ml-model/estimation-model.json
   - Track accuracy over time
   - Update baselines from variance data

4. **Variance Tracker** (25 min, 10-12k tokens)
   - Create: src/variance-tracker.ts
   - Real-time tracking during sessions
   - Compare estimated vs actual per phase
   - Identify deviation patterns

5. **Slash Command: /estimate-session** (40 min, 15-18k tokens)
   - Create: src/commands/estimate-session.ts
   - Usage: /estimate-session SESSION_3_PLAN.md
   - Flow:
     1. Parse session plan
     2. Apply baselines + complexity factors
     3. Show breakdown by phase
     4. Compare to historical accuracy
     5. Offer to save estimate
   - Update package.json bin section

6. **Post-Session Report Generator** (30 min, 12-15k tokens)
   - Create: src/report-generator.ts
   - Auto-generate after session complete
   - Format: ~/.claude/session-reports/{session-id}-report.md
   - Include:
     - Estimation accuracy per phase
     - Variance analysis
     - Lessons learned
     - Updated model weights

7. **Testing & Documentation** (25 min, 10-12k tokens)
   - Create: tests/token-estimator.test.ts
   - Test estimation accuracy
   - Test model updates
   - Update: AGENTS.md

**Success Criteria**:
- ✅ Can estimate any session plan markdown file
- ✅ Tracks actual vs estimated in real-time
- ✅ Generates post-session analysis reports
- ✅ ML model improves over time
- ✅ /estimate-session command works

**Total Estimated**: 3h 50min, 92-112k tokens

Ready to build SESSION 6A?
```

---

## 📋 SESSION 6B: Automation Scripts (PARALLEL with 6A)

**Agent**: General-purpose
**Estimated**: 35-50k tokens, 2-3 hours
**Prerequisites**: SESSION 5 complete (needs handoff system)

### Session Start Prompt

```markdown
You are implementing SESSION 6B: Automated Session Launch for Claude Code Optimizer v2.0.

**Context**: We have handoff files that preserve context between sessions. Now we need automation to launch sessions at scheduled times (e.g., when quota resets) with zero manual intervention.

**Reference Documents**:
- Read: IMPLEMENTATION_GAP_ANALYSIS.md Section "Automated Session Launch"
- Read: AUTOMATED_SESSION_ORCHESTRATION_PLAN.md Section 3
- Read: src/handoff-manager.ts (handoff integration point)

**Your Task**: Build shell automation for scheduled session starts.

**Deliverables** (in order):

1. **Directory Structure** (5 min, 2-3k tokens)
   - Create: ~/.claude/automation/
   - Create: ~/.claude/bin/

2. **Quota Check Script** (15 min, 5-7k tokens)
   - Create: ~/.claude/bin/check-quota.sh
   - Verify quota has reset
   - Return READY or WAITING
   - Use QuotaTracker via Node

3. **Launch Session Script** (40 min, 15-20k tokens)
   - Create: ~/.claude/automation/launch-session.sh
   - Parameters: handoff-file, agent-file, project-path
   - Flow:
     1. Verify quota ready
     2. Load handoff content
     3. Create session prompt with context
     4. Launch iTerm/Terminal with Claude Code
     5. Send desktop notification
     6. Log session start

4. **Schedule Session Script** (35 min, 12-15k tokens)
   - Create: ~/.claude/automation/schedule-session.sh
   - Parameters: handoff-file, agent-file, project-path, launch-time
   - Flow:
     1. Create launchd plist
     2. Schedule for specific time
     3. Set up pre-session notification (5 mins before)
     4. Load launchd job
     5. Confirm scheduling

5. **launchd Plist Template** (15 min, 5-7k tokens)
   - Create: ~/.claude/automation/session.plist.template
   - Configurable: time, paths, scripts
   - Load/unload commands

6. **Integration: Update /plan-next-session** (20 min, 8-10k tokens)
   - Update: src/commands/plan-next-session.ts
   - Add automation option at end:
     ```
     Schedule options:
     1. At quota reset (6:00 PM)
     2. 5 minutes after (6:05 PM) - recommended
     3. Custom time
     4. Manual
     ```
   - Call schedule-session.sh when user chooses 1-3

7. **Testing & Documentation** (20 min, 8-10k tokens)
   - Test manual launch
   - Test scheduled launch
   - Test pre-session notifications
   - Update: AGENTS.md with automation commands

**Success Criteria**:
- ✅ Can manually launch session with handoff
- ✅ Can schedule session for future time
- ✅ launchd job runs automatically
- ✅ Pre-session notifications work
- ✅ /plan-next-session offers automation

**Total Estimated**: 2h 30min, 55-72k tokens

Ready to build SESSION 6B?
```

---

## 🎯 SESSION 7: Session Memory System

**Status**: 🟢 MEDIUM PRIORITY
**Completion**: 0% → 90%
**Estimated**: 40-55k tokens, 2.5-3 hours
**Prerequisites**: SESSION 5, 6A, 6B complete
**Can Run in Parallel**: No (integrates with previous systems)

### Session Start Prompt

```markdown
You are implementing SESSION 7: Session Memory System for Claude Code Optimizer v2.0.

**Context**: We now have context tracking, token estimation, and automation. The final layer is memory: preserve cumulative project knowledge across sessions so each new session starts with full historical context.

**Reference Documents**:
- Read: IMPLEMENTATION_GAP_ANALYSIS.md Section "Session Memory System"
- Read: AUTOMATED_SESSION_ORCHESTRATION_PLAN.md Section 5

**Your Task**: Build the session memory and context injection system.

**Deliverables** (in order):

1. **Session Memory Module** (45 min, 18-22k tokens)
   - Create: src/session-memory.ts
   - Implement:
     ```typescript
     interface ProjectMemory {
       projectPath: string;
       projectName: string;
       sessions: SessionHistory[];
       cumulativeContext: {
         techStack: string[];
         architecture: string;
         testingFramework: string;
         keyDecisions: string[];
       };
     }

     export class SessionMemoryManager {
       saveSessionMemory(session: SessionHistory): void
       loadProjectMemory(projectPath: string): ProjectMemory
       updateCumulativeContext(session: SessionHistory): void
       injectContextOnStart(memory: ProjectMemory): string
     }
     ```

2. **Project Memory Storage** (20 min, 8-10k tokens)
   - Storage: ~/.claude/project-memory/{project-hash}.json
   - Hash project path for consistent ID
   - JSON format with sessions array

3. **Tech Stack Detector** (25 min, 10-12k tokens)
   - Analyze project files
   - Detect: languages, frameworks, tools
   - Update on each session

4. **Context Injection** (30 min, 12-15k tokens)
   - Generate context summary
   - Include: previous sessions, decisions, tech stack
   - Inject at session start via handoff

5. **Integration: Update Handoff Manager** (20 min, 8-10k tokens)
   - Update: src/handoff-manager.ts
   - Load project memory automatically
   - Inject into handoff content

6. **Testing & Documentation** (20 min, 8-10k tokens)
   - Create: tests/session-memory.test.ts
   - Test memory persistence
   - Test context injection
   - Update: AGENTS.md

**Success Criteria**:
- ✅ Project memory persists across sessions
- ✅ Cumulative context tracks decisions
- ✅ New sessions load full history
- ✅ Tech stack auto-detected
- ✅ Tests pass

**Total Estimated**: 2h 40min, 64-79k tokens

Ready to build SESSION 7?
```

---

## 🚀 PARALLEL EXECUTION GUIDE

### When to Run in Parallel

**SESSION 5**: Must run ALONE (foundational)
**SESSION 6A + 6B**: CAN run in PARALLEL (independent)
**SESSION 7**: Must run AFTER 5, 6A, 6B (integrates all)

### How to Execute in Parallel

**Option 1: Two Terminal Windows**
```bash
# Terminal 1
cd claude-optimizer-v2
# Start SESSION 6A with general-purpose agent
# Paste "SESSION 6A: Token Estimation" prompt

# Terminal 2
cd claude-optimizer-v2
# Start SESSION 6B with general-purpose agent
# Paste "SESSION 6B: Automation Scripts" prompt
```

**Option 2: Single Session with Task Tool**
```markdown
I need you to build SESSION 6A and SESSION 6B in parallel using the Task tool.

Launch TWO general-purpose agents simultaneously:

Agent 1 task: [paste SESSION 6A prompt]
Agent 2 task: [paste SESSION 6B prompt]

Wait for both to complete, then integrate their results.
```

---

## 📊 COMPLETE BUILD SEQUENCE

### Sequential Approach (Safe)
```
SESSION 5 (Context) → SESSION 6A (Estimation) → SESSION 6B (Automation) → SESSION 7 (Memory)
Total: ~10-13 hours, 220-300k tokens across 4 sessions
```

### Parallel Approach (Faster)
```
SESSION 5 (Context) → [SESSION 6A + 6B in parallel] → SESSION 7 (Memory)
Total: ~8-10 hours, 220-300k tokens across 3 sessions
Saves: 2-3 hours by parallelizing 6A and 6B
```

### Aggressive Parallel (Maximum Speed)
```
Not recommended - too many dependencies
SESSION 5 must complete before others
```

---

## 💡 RECOMMENDED EXECUTION PLAN

**Week 1: Foundation**
- Day 1: SESSION 5 (Context Tracking) - 3-4 hours
- Day 2: Review, test, refine context system

**Week 2: Advanced Features**
- Day 3: SESSION 6A + 6B in parallel - 5-6 hours
- Day 4: Integration testing, bug fixes

**Week 3: Polish**
- Day 5: SESSION 7 (Memory System) - 2.5-3 hours
- Day 6: End-to-end testing, documentation

**Total**: ~12-15 hours of coding across 6 days

---

## ✅ SUCCESS METRICS

After all sessions complete:

**Functionality**:
- ✅ Context window tracked with 50%/80%/90% alerts
- ✅ Context compaction extends sessions 1-2 hours
- ✅ Token estimation achieves 85%+ accuracy
- ✅ Sessions auto-start at scheduled times
- ✅ Project memory persists across sessions

**Code Quality**:
- ✅ All TypeScript compiles without errors
- ✅ All tests pass
- ✅ Documentation updated
- ✅ Commands work as documented

**User Experience**:
- ✅ Never hit unexpected context limits
- ✅ Accurate session planning with estimates
- ✅ Zero-touch automation for scheduled work
- ✅ Full historical context on every session

---

## 🎯 QUICK START

**To build everything in order:**

1. Copy SESSION 5 prompt above
2. Start new Claude Code session
3. Paste prompt
4. Let agent build context tracking system
5. When complete, copy SESSION 6A + 6B prompts
6. Run in parallel (two sessions or Task tool)
7. When both complete, copy SESSION 7 prompt
8. Build memory system

**Result**: Complete Claude Code Optimizer v2.0 with all documented features implemented.
