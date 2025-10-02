# Session 6A: Token Estimation ML System

**Status**: 🟡 HIGH PRIORITY - NOT STARTED
**Estimated Time**: 3-4 hours
**Estimated Tokens**: 55-75k tokens (28-38% of Pro quota)
**Fits Pro Quota**: ✅ YES (with 125-145k buffer)
**Prerequisites**: SESSION 5 complete (needs context tracking)
**Can Run in Parallel**: ✅ YES with SESSION 6B (independent systems)

---

## Executive Summary

Build an intelligent token estimation system with machine learning that predicts session token usage from markdown plans and improves accuracy over time through variance analysis (target: 72% → 95% accuracy by Session 10).

**Why Important**: Planning sessions without estimation leads to hitting quota limits mid-task. This system enables data-driven session planning with improving accuracy.

---

## Session Objectives

### Primary Goals
1. ✅ Build token estimator with task-based baselines
2. ✅ Implement complexity multipliers for accurate predictions
3. ✅ Create session plan parser for markdown files
4. ✅ Build variance tracking system
5. ✅ Implement ML model that learns from actual usage
6. ✅ Create /estimate-session command
7. ✅ Generate post-session analysis reports

### Success Criteria
- ✅ Can estimate any SESSION_N_PLAN.md file
- ✅ Tracks actual vs estimated in real-time
- ✅ Generates post-session analysis reports
- ✅ ML model improves over time (persists learnings)
- ✅ /estimate-session command works
- ✅ Initial estimates achieve 70%+ accuracy

---

## Token Estimation Breakdown

### Phase 1: Token Estimator Module (60 min)
**Estimated Tokens**: 25,000 - 30,000

**Calculation**:
- Base implementation: 25,000 tokens
- Duration: 1 hour
- Rate: 45,000 tokens/hour (implementation type)
- Formula: 1h × 45k/h × 1.1 (new ML logic) = 27,500 tokens
- Range: ±10% = 25,000 - 30,000

**Reasoning**:
- Task baseline estimates: ~8k tokens
- Complexity multipliers: ~5k tokens
- Estimation engine: ~12k tokens
- **Complexity**: 1.1 (new domain, moderate)
- **Confidence**: MEDIUM

### Phase 2: Session Plan Parser (30 min)
**Estimated Tokens**: 12,000 - 15,000

**Calculation**:
- Markdown parsing: 12,000 tokens
- Duration: 0.5 hours
- Rate: 45,000 tokens/hour
- Formula: 0.5h × 45k/h × 1.0 = 12,500 tokens
- Range: ±12% = 12,000 - 15,000

**Reasoning**:
- Parse markdown structure
- Extract phases and objectives
- **Complexity**: 1.0 (standard parsing)
- **Confidence**: HIGH

### Phase 3: ML Model & Variance Tracking (45 min)
**Estimated Tokens**: 18,000 - 22,000

**Calculation**:
- ML persistence: ~8-10k tokens
- Variance tracker: ~10-12k tokens
- Range: 18,000 - 22,000

**Reasoning**:
- JSON model storage
- Variance calculation logic
- **Complexity**: 1.0 (structured data)
- **Confidence**: MEDIUM

### Phase 4: Commands & Reports (75 min)
**Estimated Tokens**: 27,000 - 33,000

**Calculation**:
- /estimate-session command: ~15-18k tokens
- Report generator: ~12-15k tokens
- Range: 27,000 - 33,000

**Reasoning**:
- Interactive command flow
- Markdown report generation
- **Complexity**: 0.9 (familiar patterns)
- **Confidence**: HIGH

### Phase 5: Testing & Documentation (30 min)
**Estimated Tokens**: 10,000 - 12,000

---

## Total Estimate

**Mid-Range**: 64,000 tokens
**Conservative**: 55,000 tokens
**Aggressive**: 75,000 tokens

**Recommended Buffer**: +15% = 74,000 tokens

**Pro Quota Check**: 74k < 200k ✅ FITS

---

## Phase Breakdown

### Phase 1: Token Estimator Module (60 min, 25-30k tokens)

**Deliverable**: `src/token-estimator.ts`

**Implementation**:
```typescript
export interface TaskEstimate {
  taskType: 'planning' | 'implementation' | 'refactoring' | 'testing' | 'debugging' | 'polish';
  baseTokens: number;
  tokensPerHour: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

// Task-based baseline estimates
export const TASK_ESTIMATES: Record<string, TaskEstimate> = {
  planning: {
    taskType: 'planning',
    baseTokens: 15000,
    tokensPerHour: 20000,    // Mostly reading, some writing
    confidenceLevel: 'high'   // Predictable
  },
  implementation: {
    taskType: 'implementation',
    baseTokens: 25000,
    tokensPerHour: 45000,    // Heavy reading + writing
    confidenceLevel: 'medium' // Variable
  },
  refactoring: {
    taskType: 'refactoring',
    baseTokens: 30000,
    tokensPerHour: 55000,    // Lots of edits
    confidenceLevel: 'medium'
  },
  testing: {
    taskType: 'testing',
    baseTokens: 18000,
    tokensPerHour: 30000,    // Write tests + run commands
    confidenceLevel: 'high'
  },
  debugging: {
    taskType: 'debugging',
    baseTokens: 20000,
    tokensPerHour: 35000,    // Highly variable
    confidenceLevel: 'low'    // Unpredictable
  },
  polish: {
    taskType: 'polish',
    baseTokens: 12000,
    tokensPerHour: 20000,    // Cleanup + docs
    confidenceLevel: 'high'
  }
};

// Complexity multipliers
export const COMPLEXITY_FACTORS = {
  projectSize: {
    small: 0.8,       // <5k LOC
    medium: 1.0,      // 5-20k LOC
    large: 1.3,       // 20-50k LOC
    enterprise: 1.6   // 50k+ LOC
  },
  techStack: {
    familiar: 0.9,    // You know it well
    learning: 1.2,    // Some experience
    new: 1.5          // First time
  },
  codeQuality: {
    clean: 0.9,       // Well-structured
    mixed: 1.0,       // Average
    legacy: 1.4       // Messy/undocumented
  }
};

export interface SessionEstimate {
  sessionId: string;
  totalTokens: {
    low: number;
    mid: number;
    high: number;
  };
  totalHours: {
    low: number;
    mid: number;
    high: number;
  };
  confidenceLevel: 'low' | 'medium' | 'high';
  phases: PhaseEstimate[];
}

export class TokenEstimator {
  estimateSession(sessionPlan: SessionPlan): SessionEstimate
  trackActualUsage(sessionId: string, actual: number): void
  calculateVariance(estimated: number, actual: number): Variance
  updateModel(variance: Variance): void
  generateReport(sessionId: string): AnalysisReport
}
```

---

### Phase 2: Session Plan Parser (30 min, 12-15k tokens)

**Deliverable**: `src/session-plan-parser.ts`

**Implementation**:
```typescript
export interface SessionPlan {
  sessionId: string;
  filePath: string;
  estimatedTime: string;
  estimatedTokens?: string;
  phases: SessionPhase[];
  prerequisites: string[];
  objectives: string[];
}

export interface SessionPhase {
  number: number;
  name: string;
  description: string;
  estimatedHours?: number;
  estimatedTokens?: number;
  taskType: string;
  objectives: string[];
}

export class SessionPlanParser {
  parseFile(filePath: string): SessionPlan
  extractPhases(markdown: string): SessionPhase[]
  extractObjectives(markdown: string): string[]
  detectTaskType(phaseDescription: string): TaskType
}
```

**What It Parses**:
- Session header (status, time, tokens)
- Phase breakdown sections
- Objectives and success criteria
- Prerequisites

---

### Phase 3: ML Model Persistence (20 min, 8-10k tokens)

**Deliverable**: `src/ml-model-storage.ts`

**Storage Location**: `~/.claude/ml-model/estimation-model.json`

**Model Format**:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-10-01T12:00:00Z",
  "sessionsAnalyzed": 5,
  "overallAccuracy": 0.78,

  "taskTypeAccuracy": {
    "planning": { "accuracy": 0.92, "avgVariance": 0.08 },
    "implementation": { "accuracy": 0.76, "avgVariance": 0.24 },
    "testing": { "accuracy": 0.88, "avgVariance": 0.12 }
  },

  "userProfile": {
    "experienceLevel": "intermediate",
    "specialties": ["typescript", "react", "nodejs"],
    "avgBurnRate": 580,
    "learningCurve": 0.05
  },

  "libraryKnowledge": {
    "socketio": {
      "sessionsUsed": 1,
      "avgIntegrationCost": 5000,
      "variance": 0.15
    }
  }
}
```

---

### Phase 4: Variance Tracker (25 min, 10-12k tokens)

**Deliverable**: `src/variance-tracker.ts`

**Storage**: `~/.claude/session-tracking/{session-id}.json`

**Tracks**:
```typescript
export interface VarianceData {
  sessionId: string;
  planFile: string;
  estimated: {
    totalTokens: number;
    phases: Record<string, number>;
  };
  actual: {
    totalTokens: number;
    phases: Record<string, PhaseActual>;
  };
  variance: {
    total: number;
    totalPercent: number;
    byPhase: Record<string, VarianceDetail>;
  };
  deviations: Deviation[];
}

export class VarianceTracker {
  startTracking(sessionId: string, estimate: SessionEstimate): void
  recordPhaseComplete(sessionId: string, phaseId: string, actual: number): void
  calculateVariance(sessionId: string): VarianceData
  identifyDeviations(variance: VarianceData): Deviation[]
}
```

---

### Phase 5: /estimate-session Command (40 min, 15-18k tokens)

**Deliverable**: `src/commands/estimate-session.ts`

**Usage**: `/estimate-session SESSION_5_PLAN.md`

**Output Example**:
```
📊 Session Token Estimation Tool

Reading: SESSION_5_PLAN.md...

Analyzing phases:
✓ Phase 1: Context Tracker Module (45 min)
✓ Phase 2: Context Compactor (30 min)
✓ Phase 3: Slash Commands (65 min)
✓ Phase 4: Integration & Testing (80 min)

🔍 Detected Complexity Factors:
• Project size: Medium (1.0x)
• Tech stack: Familiar TypeScript (0.9x)
• Code quality: Clean (0.9x)

📈 Token Estimates:

Phase 1: 15,000 - 20,000 tokens
  Base: 18,000 | Confidence: HIGH

Phase 2: 12,000 - 15,000 tokens
  Base: 13,500 | Confidence: MEDIUM

Phase 3: 26,000 - 32,000 tokens
  Base: 29,000 | Confidence: HIGH

Phase 4: 30,000 - 38,000 tokens
  Base: 34,000 | Confidence: MEDIUM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL ESTIMATE: 45,000 - 65,000 tokens
Mid-Range: 56,000 tokens (28% of Pro quota)
Recommended Buffer: +15% = 65,000 tokens

✅ Fits Pro Quota (200k)? YES
✅ Fits with 40k buffer? YES (max 105k)

💡 Confidence: HIGH
Based on: 3 similar sessions (avg 82% accuracy)

⚡ Estimated Burn Rate: 580 tokens/min
⏱️  Estimated Duration: 3-4 hours

Save this estimate? (y/n):
```

---

### Phase 6: Report Generator (30 min, 12-15k tokens)

**Deliverable**: `src/report-generator.ts`

**Output**: `~/.claude/session-reports/{session-id}-report.md`

**Report Format**:
```markdown
# Session 5 Completion Report

**Completed**: 2025-10-01 19:45:00
**Duration**: 3h 45m (estimated: 3.5h) ✅
**Tokens Used**: 58,200 (estimated: 56,000) ✅

---

## Estimation Accuracy

**Overall Variance**: +2,200 tokens (+3.9%)
**Rating**: ⭐⭐⭐⭐⭐ EXCELLENT (target: <10%)

### Phase Breakdown

| Phase | Est. | Actual | Var. | % | Accuracy |
|-------|------|--------|------|---|----------|
| Phase 1 | 18.0k | 19.2k | +1.2k | +6.7% | ⭐⭐⭐⭐ VERY GOOD |
| Phase 2 | 13.5k | 12.8k | -0.7k | -5.2% | ⭐⭐⭐⭐⭐ EXCELLENT |
| Phase 3 | 29.0k | 28.5k | -0.5k | -1.7% | ⭐⭐⭐⭐⭐ EXCELLENT |
| Phase 4 | 34.0k | 36.7k | +2.7k | +7.9% | ⭐⭐⭐⭐ VERY GOOD |

---

## Lessons Learned (Auto-Applied)

### 1. Context Estimation Complexity
**Impact**: +1,200 tokens (6.7% over)
**Root Cause**: Underestimated edge cases
**Prevention**: Add +10% buffer for new estimation logic
**Applied To**: Future context-related estimates

### 2. Testing Efficiency
**Impact**: -500 tokens (1.7% under!)
**Root Cause**: Reused test patterns effectively
**Win**: Familiar patterns = accurate estimates
**Applied To**: Confirmed testing baseline accurate

---

## Updated Model Weights

```json
{
  "taskTypes": {
    "implementation": {
      "tokensPerHour": 46500
    }
  },
  "complexity": {
    "familiarTypeScript": 0.88
  }
}
```

---

## Recommendations for Next Session

**For Similar Implementation Work**:
- Base: 46k tokens/hour (updated from 45k)
- Buffer: 12% (down from 15%)
- Confidence: HIGH

**For Context-Related Work**:
- Add: +10% for estimation complexity
- Expected: Similar patterns to quota tracking
```

---

### Phase 7: Testing & Documentation (25 min, 10-12k tokens)

**Create**: `tests/token-estimator.test.ts`

**Test Coverage**:
- ✅ Estimate calculation with baselines
- ✅ Complexity multipliers applied correctly
- ✅ Variance tracking accuracy
- ✅ ML model updates
- ✅ Report generation

---

## Prerequisites

### Before Starting
1. ✅ SESSION 5 completed (context tracking exists)
2. ✅ TypeScript environment working
3. ✅ At least one SESSION_N_PLAN.md file exists for testing

### Files to Read First
1. `SESSION_3_PLAN.md` - Example session plan to parse
2. `src/quota-tracker.ts` - Tracking patterns
3. `AUTOMATED_SESSION_ORCHESTRATION_PLAN.md` Section 7 - Specifications

### Can Run in Parallel With
✅ **SESSION 6B** (Automation Scripts) - completely independent

---

## Session Start Prompt

```markdown
You are implementing SESSION 6A: Token Estimation ML System for Claude Code Optimizer v2.0.

**Context**: We now have dual tracking (quota + context). The next layer is predictive: estimate token usage for planned sessions and learn from actual usage to improve accuracy over time (72% → 95%).

**Reference Documents**:
- Read: IMPLEMENTATION_GAP_ANALYSIS.md Section "Token Estimation ML System"
- Read: AUTOMATED_SESSION_ORCHESTRATION_PLAN.md Section 7
- Read: SESSION_6A_PLAN.md (this plan)
- Example: SESSION_3_PLAN.md (session plan format)

**Your Task**: Build the token estimation and learning system.

**Deliverables** (in order):

1. **Token Estimator Module** (60 min, 25-30k tokens)
   - Create: src/token-estimator.ts
   - Implement task baselines and complexity factors

2. **Session Plan Parser** (30 min, 12-15k tokens)
   - Create: src/session-plan-parser.ts
   - Parse SESSION_N_PLAN.md files

3. **ML Model Persistence** (20 min, 8-10k tokens)
   - Create: src/ml-model-storage.ts
   - Store in ~/.claude/ml-model/estimation-model.json

4. **Variance Tracker** (25 min, 10-12k tokens)
   - Create: src/variance-tracker.ts
   - Track estimated vs actual

5. **Slash Command: /estimate-session** (40 min, 15-18k tokens)
   - Create: src/commands/estimate-session.ts
   - Update package.json bin section

6. **Post-Session Report Generator** (30 min, 12-15k tokens)
   - Create: src/report-generator.ts
   - Auto-generate analysis reports

7. **Testing & Documentation** (25 min, 10-12k tokens)
   - Create: tests/token-estimator.test.ts
   - Update: AGENTS.md

**Success Criteria**:
- ✅ Can estimate any session plan file
- ✅ ML model improves over time
- ✅ /estimate-session command works
- ✅ Reports auto-generate

Ready to build SESSION 6A?
```

---

## Next Session

After SESSION 6A + 6B both complete:
- **SESSION 7**: Session Memory System
- **Integrates**: Context tracking, estimation, automation

See: `SESSION_7_PLAN.md`
