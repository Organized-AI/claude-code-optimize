# 🧠 Algorithm Design: Extract Next Objectives

**Purpose**: Intelligently infer what should happen next in a coding session based on session history, git state, and project context.

**Location**: `src/auto-handoff-service.ts:extractNextObjectives()`

---

## Input Data Available

From the function signature:
```typescript
extractNextObjectives(
  memory: ProjectMemory,
  projectPath: string
): Promise<SessionObjective[]>
```

**Key Data Sources:**

1. `memory.sessions[-1].objectives` - What was *planned* this session
2. `memory.sessions[-1].completedTasks` - What was *finished*
3. Git status - What files are modified/staged/untracked
4. Git diff stats - Lines changed per file
5. `memory.cumulativeContext.keyDecisions` - Recent architectural choices
6. Test/build commands - Can we detect failures?

---

## Decision Tree Logic

### Step 1: Analyze Last Session's Objectives

```
IF last session had objectives:
  incomplete = objectives - completedTasks

  FOR EACH incomplete objective:
    → Add as HIGH priority
    → Reason: "Continue from previous session"

ELSE:
  → No prior objectives, proceed to git analysis
```

**Why this matters**: The most reliable signal of what to do next is what was planned but not finished.

---

### Step 2: Analyze Git Workspace State

```
Get git status:
  - Modified files (M)
  - Staged files (A, M)
  - Untracked files (??)
  - Deleted files (D)

Pattern Detection:

IF only test files modified:
  → "Implement features for updated tests"
  → Priority: HIGH
  → Reason: TDD pattern detected

IF only source files modified (no tests):
  → "Add tests for modified features"
  → Priority: MEDIUM
  → Reason: Test coverage gap

IF many uncommitted changes (>10 files):
  → "Review and commit pending changes"
  → Priority: HIGH
  → Reason: Risk of losing work

IF new files untracked:
  → "Complete implementation of new features"
  → Priority: MEDIUM
  → Reason: Work in progress
```

**Pattern Recognition Examples:**

| Git State | Inference | Priority |
|-----------|-----------|----------|
| 5 `.test.ts` modified, 0 source | TDD: Implement features | HIGH |
| 3 `.ts` modified, 0 tests | Add test coverage | MEDIUM |
| 15+ files modified | Complete refactor | HIGH |
| Only `README.md` modified | Documentation update | LOW |
| Config + source modified | System migration | HIGH |

---

### Step 3: Analyze File Patterns for Context

```
Group files by type:
  - Source: .ts, .js, .py, etc.
  - Tests: .test.ts, .spec.js, etc.
  - Docs: .md, README
  - Config: package.json, tsconfig.json

IF docs modified:
  → Lower priority (documentation update)

IF config modified + source modified:
  → "Complete refactor/migration"
  → Priority: HIGH
  → Reason: System-wide change in progress

IF only single file modified:
  → "Complete {filename} implementation"
  → Priority: MEDIUM
  → Reason: Focused work session
```

**File Type Classification:**

```typescript
const fileTypes = {
  source: /\.(ts|js|py|go|rs|java|cpp|c)$/,
  test: /\.(test|spec)\.(ts|js|py)$/,
  docs: /\.(md|txt|rst)$/,
  config: /(package\.json|tsconfig\.json|\..*rc|Makefile)$/,
  build: /(webpack|vite|rollup|babel)\.config\./,
  types: /\.d\.ts$/
}
```

---

### Step 4: Check for Build/Test Failures

```
IF package.json exists:
  Try: npm run build (with timeout)

  IF build fails:
    → "Fix build errors"
    → Priority: CRITICAL
    → EstimatedTokens: 30k-50k

  Try: npm test (with timeout)

  IF tests fail:
    → "Fix failing tests"
    → Priority: HIGH
    → EstimatedTokens: 20k-40k
```

**Important**: Use timeouts to prevent hanging:
```typescript
execSync('npm run build', { timeout: 30000, stdio: 'pipe' })
```

**Failure Detection:**
- Exit code !== 0 = failure
- Stderr contains "error" = likely failure
- No output after 30s = timeout (treat as skip)

---

### Step 5: Infer from Recent Decisions

```
Parse keyDecisions for action items:

  IF decision contains "TODO:", "Next:", "Follow-up:":
    → Extract as objective
    → Priority: MEDIUM

  IF decision mentions "refactor", "migrate":
    → "Continue {refactor/migration} work"
    → Priority: MEDIUM

  IF decision mentions "add {feature}":
    → "Implement {feature}"
    → Priority: HIGH
```

**Decision Parsing Examples:**

| Decision Text | Extracted Objective |
|---------------|---------------------|
| "Next: Add authentication middleware" | "Implement authentication middleware" (HIGH) |
| "TODO: Refactor database layer" | "Continue database refactor" (MEDIUM) |
| "Follow-up: Write integration tests" | "Add integration tests" (MEDIUM) |

---

### Step 6: Default Fallbacks

```
IF no objectives generated yet:

  → Add: "Continue implementation from previous session"
     Priority: MEDIUM
     EstimatedTokens: 50k

IF only 1-2 objectives:

  → Add: "Review and refactor recent changes"
     Priority: LOW
     EstimatedTokens: 20k

  → Add: "Update documentation"
     Priority: LOW
     EstimatedTokens: 15k
```

**Goal**: Always return 3-5 objectives, even with minimal data.

---

## Priority Assignment Strategy

### Priority Levels

```typescript
Priority Rules:

CRITICAL (rare):
  - Build completely broken
  - Merge conflicts blocking work
  - Critical bugs in production code
  - Security vulnerabilities

HIGH:
  - Incomplete objectives from last session
  - Test failures
  - Many uncommitted changes (>10 files)
  - TDD pattern: tests written but implementation missing
  - Blocking dependencies

MEDIUM:
  - Test coverage gaps
  - Feature implementation in progress
  - Refactoring work
  - Follow-up tasks from decisions
  - Code quality improvements

LOW:
  - Documentation updates
  - Code cleanup/polish
  - Nice-to-have improvements
  - Optimization (non-critical)
```

### Priority Ordering

Objectives should be sorted:
1. CRITICAL first (if any)
2. HIGH priority
3. MEDIUM priority
4. LOW priority last

**Example Output:**
```typescript
[
  { description: "Fix build errors", priority: "high", ... },
  { description: "Complete auth implementation", priority: "high", ... },
  { description: "Add tests for new features", priority: "medium", ... },
  { description: "Update API documentation", priority: "low", ... }
]
```

---

## Token Estimation Heuristics

### Base Estimates by Task Type

```typescript
Token Estimates:

Build Fixes:        30k - 50k  (complex, lots of context)
Test Failures:      20k - 40k  (debugging + fixing)
New Features:       40k - 60k  (implementation + tests)
Refactoring:        25k - 45k  (careful changes across files)
Documentation:      10k - 20k  (writing + examples)
Bug Fixes:          15k - 35k  (investigation + fix)
Code Review:        15k - 25k  (reading + suggesting)
```

### Scope Multipliers

```typescript
Multipliers:
  - Small scope (1-2 files):   × 0.8
  - Medium scope (3-10 files): × 1.0
  - Large scope (>10 files):   × 1.3
  - Unfamiliar tech:           × 1.5
  - Legacy codebase:           × 1.4
```

### Calculation Example

```typescript
// Feature implementation in 5 files (medium scope)
baseEstimate = 50000  // New feature base
multiplier = 1.0      // Medium scope
total = 50000 × 1.0 = 50000 tokens

// Refactor in 15 files (large scope) in legacy code
baseEstimate = 35000  // Refactor base
multiplier = 1.3 × 1.4 = 1.82  // Large scope + legacy
total = 35000 × 1.82 = 63700 tokens
```

---

## Edge Case Handling

### 1. No Git Repository

```typescript
IF no .git directory:
  → Rely only on memory.sessions data
  → Default to generic continuation tasks
  → Objectives: ["Continue implementation", "Add tests"]
```

### 2. First Session (No History)

```typescript
IF memory.sessions.length === 0:
  → Analyze project structure
  → Objectives based on what exists:
    - "Set up project structure" (if minimal files)
    - "Initial implementation" (if scaffolding exists)
    - "Review and plan architecture" (if large codebase)
```

### 3. Everything Completed

```typescript
IF all objectives done AND no git changes:
  → Session went perfectly!
  → Objectives:
    - "Polish and documentation" (LOW)
    - "Add comprehensive tests" (MEDIUM)
    - "Performance optimization" (LOW)
```

### 4. Massive Changes (>50 files)

```typescript
IF modifiedFiles.length > 50:
  → Likely large-scale refactor or migration
  → Objective: "Complete large-scale refactor/migration"
  → Priority: HIGH
  → EstimatedTokens: 80k-100k
  → Warning: May need multiple sessions
```

### 5. Only Deleted Files

```typescript
IF all git changes are deletions:
  → Cleanup work in progress
  → Objective: "Complete cleanup and remove deprecated code"
  → Priority: MEDIUM
  → EstimatedTokens: 20k-30k
```

### 6. Merge Conflicts

```typescript
IF git status contains "both modified":
  → CRITICAL: Blocking work
  → Objective: "Resolve merge conflicts"
  → Priority: CRITICAL
  → EstimatedTokens: 15k-30k
```

---

## Sample Algorithm Pseudocode

```typescript
async extractNextObjectives(
  memory: ProjectMemory,
  projectPath: string
): Promise<SessionObjective[]> {

  const objectives: SessionObjective[] = []

  // ═══════════════════════════════════════════════════════
  // Step 1: Check incomplete from last session
  // ═══════════════════════════════════════════════════════

  const lastSession = memory.sessions[memory.sessions.length - 1]

  if (lastSession?.objectives) {
    const completed = new Set(lastSession.completedTasks)
    const incomplete = lastSession.objectives.filter(obj =>
      !completed.has(obj)
    )

    incomplete.forEach(obj => {
      objectives.push({
        description: obj,
        priority: 'high',
        estimatedTokens: 45000
      })
    })
  }

  // ═══════════════════════════════════════════════════════
  // Step 2: Git analysis
  // ═══════════════════════════════════════════════════════

  const gitStatus = this.getGitStatus(projectPath)
  const modifiedFiles = this.parseGitStatus(gitStatus)

  // ═══════════════════════════════════════════════════════
  // Step 3: Pattern detection
  // ═══════════════════════════════════════════════════════

  const testFiles = modifiedFiles.filter(f => this.isTestFile(f))
  const sourceFiles = modifiedFiles.filter(f => this.isSourceFile(f))
  const configFiles = modifiedFiles.filter(f => this.isConfigFile(f))

  // TDD pattern: Tests written, implementation needed
  if (testFiles.length > 0 && sourceFiles.length === 0) {
    objectives.push({
      description: `Implement features for ${testFiles.length} new tests`,
      priority: 'high',
      estimatedTokens: testFiles.length * 10000 + 30000
    })
  }

  // Test gap: Implementation exists, tests missing
  if (sourceFiles.length > 0 && testFiles.length === 0) {
    objectives.push({
      description: 'Add tests for modified features',
      priority: 'medium',
      estimatedTokens: 30000
    })
  }

  // Large-scale change
  if (modifiedFiles.length > 10) {
    objectives.push({
      description: 'Complete large-scale refactor',
      priority: 'high',
      estimatedTokens: 60000
    })
  }

  // Config changes = system update
  if (configFiles.length > 0 && sourceFiles.length > 0) {
    objectives.push({
      description: 'Complete system configuration update',
      priority: 'high',
      estimatedTokens: 45000
    })
  }

  // ═══════════════════════════════════════════════════════
  // Step 4: Build/test check
  // ═══════════════════════════════════════════════════════

  const buildStatus = await this.tryBuild(projectPath)
  if (buildStatus === 'failed') {
    objectives.unshift({  // Prepend = highest priority
      description: 'Fix build errors',
      priority: 'high',
      estimatedTokens: 40000
    })
  }

  const testStatus = await this.tryTest(projectPath)
  if (testStatus === 'failed') {
    objectives.unshift({
      description: 'Fix failing tests',
      priority: 'high',
      estimatedTokens: 35000
    })
  }

  // ═══════════════════════════════════════════════════════
  // Step 5: Parse key decisions
  // ═══════════════════════════════════════════════════════

  const recentDecisions = memory.cumulativeContext.keyDecisions.slice(-5)

  recentDecisions.forEach(decision => {
    const todoMatch = decision.match(/TODO:\s*(.+)/i)
    const nextMatch = decision.match(/Next:\s*(.+)/i)

    if (todoMatch) {
      objectives.push({
        description: todoMatch[1].trim(),
        priority: 'medium',
        estimatedTokens: 30000
      })
    } else if (nextMatch) {
      objectives.push({
        description: nextMatch[1].trim(),
        priority: 'medium',
        estimatedTokens: 35000
      })
    }
  })

  // ═══════════════════════════════════════════════════════
  // Step 6: Defaults (if needed)
  // ═══════════════════════════════════════════════════════

  if (objectives.length === 0) {
    objectives.push({
      description: 'Continue implementation from previous session',
      priority: 'medium',
      estimatedTokens: 50000
    })
  }

  if (objectives.length < 3) {
    objectives.push({
      description: 'Review and refactor recent changes',
      priority: 'low',
      estimatedTokens: 20000
    })
  }

  // ═══════════════════════════════════════════════════════
  // Step 7: Sort and limit
  // ═══════════════════════════════════════════════════════

  const priorityOrder = { high: 1, medium: 2, low: 3 }

  objectives.sort((a, b) =>
    priorityOrder[a.priority || 'medium'] -
    priorityOrder[b.priority || 'medium']
  )

  return objectives.slice(0, 5)  // Max 5 objectives
}
```

---

## Helper Methods Needed

### Git Status Parsing

```typescript
private getGitStatus(projectPath: string): string {
  try {
    return execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'ignore']
    })
  } catch {
    return ''
  }
}

private parseGitStatus(status: string): string[] {
  return status
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.substring(3).trim())
}
```

### File Type Detection

```typescript
private isTestFile(filepath: string): boolean {
  return /\.(test|spec)\.(ts|js|py)$/.test(filepath)
}

private isSourceFile(filepath: string): boolean {
  return /\.(ts|js|py|go|rs|java|cpp)$/.test(filepath) &&
         !this.isTestFile(filepath)
}

private isConfigFile(filepath: string): boolean {
  return /(package\.json|tsconfig\.json|\..*rc|Makefile)$/.test(filepath)
}
```

### Build/Test Detection

```typescript
private async tryBuild(projectPath: string): Promise<'passed' | 'failed' | 'skipped'> {
  const packagePath = path.join(projectPath, 'package.json')
  if (!fs.existsSync(packagePath)) return 'skipped'

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
  if (!pkg.scripts?.build) return 'skipped'

  try {
    execSync('npm run build', {
      cwd: projectPath,
      timeout: 30000,
      stdio: 'pipe'
    })
    return 'passed'
  } catch {
    return 'failed'
  }
}

private async tryTest(projectPath: string): Promise<'passed' | 'failed' | 'skipped'> {
  const packagePath = path.join(projectPath, 'package.json')
  if (!fs.existsSync(packagePath)) return 'skipped'

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
  if (!pkg.scripts?.test) return 'skipped'

  try {
    execSync('npm test', {
      cwd: projectPath,
      timeout: 60000,
      stdio: 'pipe'
    })
    return 'passed'
  } catch {
    return 'failed'
  }
}
```

---

## Testing Strategy

### Unit Tests

Test each step independently:

```typescript
describe('extractNextObjectives', () => {
  it('should prioritize incomplete objectives from last session', async () => {
    const memory = {
      sessions: [{
        objectives: ['Implement feature A', 'Write tests'],
        completedTasks: ['Implement feature A']
      }]
    }

    const result = await service.extractNextObjectives(memory, '/path')

    expect(result[0].description).toBe('Write tests')
    expect(result[0].priority).toBe('high')
  })

  it('should detect TDD pattern from git status', async () => {
    // Mock git status with only test files modified
    const result = await service.extractNextObjectives(memory, '/path')

    expect(result).toContainEqual(
      expect.objectContaining({
        description: expect.stringContaining('Implement features'),
        priority: 'high'
      })
    )
  })

  it('should default to continuation when no data available', async () => {
    const emptyMemory = { sessions: [] }

    const result = await service.extractNextObjectives(emptyMemory, '/path')

    expect(result.length).toBeGreaterThan(0)
    expect(result[0].description).toContain('Continue')
  })
})
```

---

## Performance Considerations

### Timeouts

All git and npm commands should have timeouts:
- `git status`: 5s max
- `npm run build`: 30s max
- `npm test`: 60s max

### Caching

Consider caching git status for 30 seconds to avoid repeated `execSync` calls.

### Error Handling

Never throw errors - always degrade gracefully:
```typescript
try {
  // Risky operation
} catch (error) {
  // Log for debugging
  console.debug('Git operation failed:', error)
  // Return safe default
  return []
}
```

---

## Success Metrics

**Good Algorithm Output:**
- 3-5 relevant objectives
- High-priority items first
- Reasonable token estimates (30k-60k per item)
- Mix of completion + new work
- Clear, actionable descriptions

**Bad Algorithm Output:**
- Generic objectives ("Do stuff")
- Too many objectives (>7)
- All low priority
- Unrealistic token estimates (<10k or >100k)
- Duplicate objectives

---

## Future Enhancements

1. **ML-Based Prioritization**: Learn from user's actual work patterns
2. **Dependency Graph**: Build objective dependencies automatically
3. **Time-Based Context**: Consider time of day, day of week for objectives
4. **Team Patterns**: Learn from team's common workflows
5. **Issue Tracker Integration**: Pull objectives from GitHub/Jira

---

**Last Updated**: 2025-10-02
**Status**: Design Complete - Ready for Implementation
**Next Step**: Implement in `src/auto-handoff-service.ts:extractNextObjectives()`