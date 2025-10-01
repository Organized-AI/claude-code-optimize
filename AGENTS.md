# AGENTS.md

AI agent guidance for working with Claude Code Optimizer v2.0.

## Project Overview

**Claude Code Optimizer v2.0** is an intelligent session management system that helps developers maximize productivity with Claude Code through quota-aware monitoring, automated session orchestration, and token estimation with machine learning.

### Core Philosophy
Strategic planning over speed. With 5-hour session windows and 200k token quotas, this tool ensures you never hit limits unexpectedly and make every token count.

### What We're Building (v2 Only)
- **Hyperaware quota tracking** with 6 thresholds (10%, 25%, 50%, 75%, 80%, 90%, 95%)
- **Token estimation system** that learns and improves accuracy over time (72% → 95%)
- **Automated session orchestration** with launchd scheduling and handoff files
- **Session memory** for perfect context preservation across sessions

## Project Structure

```
claude-optimizer-v2/          # Active v2 development
├── src/                      # TypeScript source code
│   ├── quota-tracker.ts      # Rolling 5-hour window management
│   ├── session-monitor.ts    # Real-time JSONL watching
│   ├── smart-session-planner.ts  # Intelligent scheduling
│   └── types/                # TypeScript type definitions
├── .claude/
│   └── commands/             # Slash commands
│       ├── session-status
│       ├── start-next-session
│       └── create-calendar-events
├── docs/                     # All documentation
│   ├── guides/               # User guides
│   ├── architecture/         # System design
│   ├── planning/             # Implementation plans
│   └── sessions/             # Session templates
└── tests/                    # Test suites
```

## Development Environment

### Prerequisites
- **Node.js** 18+ (TypeScript compilation)
- **npm** 8+ (package management)
- **macOS** (for launchd automation, notifications)
- **Claude Code** installed and configured

### Setup Commands

```bash
# Navigate to v2 directory
cd claude-optimizer-v2

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Watch mode for development
npm run build:watch
```

### Quick Start Development

```bash
# 1. Make changes to TypeScript files in src/
vim src/quota-tracker.ts

# 2. Rebuild
npm run build

# 3. Test the compiled output
node dist/quota-tracker.js

# 4. Run slash command to verify
/session-status
```

## Code Style

### TypeScript Conventions

**File Organization**:
```typescript
// 1. Imports (external first, then internal)
import * as fs from 'fs';
import { QuotaTracker } from './quota-tracker.js';

// 2. Interfaces and types
export interface TokenQuota { ... }

// 3. Class definition
export class QuotaTracker { ... }

// 4. Helper functions (private)
```

**Naming**:
- Classes: `PascalCase` (e.g., `QuotaTracker`, `SessionMonitor`)
- Functions/methods: `camelCase` (e.g., `canStartSession`, `calculateBurnRate`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `TASK_ESTIMATES`, `COMPLEXITY_FACTORS`)
- Interfaces: `PascalCase` with 'I' prefix optional (e.g., `TokenQuota`)

**File Extensions**:
- Source: `.ts` (TypeScript)
- Compiled: `.js` (JavaScript in dist/)
- Import paths: Include `.js` extension (e.g., `from './quota-tracker.js'`)

### Documentation Standards

**Inline Comments**:
```typescript
/**
 * Calculate current burn rate (tokens per minute)
 *
 * @returns Formatted string like "580 tokens/min"
 */
private calculateBurnRate(quota: TokenQuota): string {
  // Only calculate if we have data
  if (quota.sessions.length === 0) {
    return 'calculating...';
  }
  // ... implementation
}
```

**Markdown Documentation**:
- Use `SCREAMING_SNAKE_CASE.md` for major documents
- Include table of contents for docs >200 lines
- Add code examples with syntax highlighting
- Link to related documentation

## Testing Instructions

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test quota-tracker.test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Writing Tests

```typescript
// tests/quota-tracker.test.ts
import { QuotaTracker } from '../src/quota-tracker';

describe('QuotaTracker', () => {
  it('should initialize with correct defaults', () => {
    const tracker = new QuotaTracker();
    const status = tracker.getStatus();

    expect(status.used).toBe(0);
    expect(status.limit).toBe(200000); // Pro plan
  });

  it('should calculate burn rate correctly', () => {
    // Test implementation
  });
});
```

### Test Coverage Goals
- **Core modules**: 80%+ coverage (quota-tracker, session-monitor)
- **Utilities**: 70%+ coverage
- **Integration**: Manual testing with real sessions

## Build and Deployment

### TypeScript Build

```bash
# Development build
npm run build

# Production build with optimizations
npm run build:prod

# Clean and rebuild
npm run clean && npm run build
```

### Build Output Structure
```
dist/
├── quota-tracker.js
├── session-monitor.js
├── smart-session-planner.js
└── types/
    └── handoff.js
```

### Slash Commands Deployment

Commands in `.claude/commands/` must be:
1. **Executable**: `chmod +x .claude/commands/session-status`
2. **Node shebang**: `#!/usr/bin/env node`
3. **Compiled code**: Reference `dist/` compiled output

## Git Workflow

### Commit Message Format

```
<type>: <short summary>

<optional body with details>

🤖 Generated with Claude Code
https://claude.com/claude-code

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**:
- `feat`: New feature (e.g., `feat: Add 80% strategic planning trigger`)
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Pre-commit Checklist

Before committing:
- ✅ TypeScript compiles without errors (`npm run build`)
- ✅ Tests pass (`npm test`)
- ✅ Documentation updated if behavior changed
- ✅ No console.log() debugging left in code
- ✅ File references updated if files moved

### Branch Strategy

- `main`: Production-ready code
- Feature branches: `feature/token-estimation-ml`
- Bug fixes: `fix/burn-rate-calculation`

## Key Implementation Patterns

### 1. File-Based State Management

```typescript
// Pattern: Load → Modify → Save
loadQuota(): TokenQuota {
  if (!fs.existsSync(this.quotaPath)) {
    return this.initializeQuota();
  }
  return JSON.parse(fs.readFileSync(this.quotaPath, 'utf-8'));
}

private saveQuota(quota: TokenQuota): void {
  const dir = path.dirname(this.quotaPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(this.quotaPath, JSON.stringify(quota, null, 2));
}
```

### 2. Desktop Notifications (macOS)

```typescript
// Use osascript for native notifications
private sendNotification(title: string, message: string): void {
  const script = `display notification "${message}" with title "${title}"`;
  execSync(`osascript -e '${script}'`);
}
```

### 3. JSONL Log Watching

```typescript
// Watch sessions.jsonl for real-time detection
fs.watchFile(this.logPath, { interval: 500 }, () => {
  const lines = fs.readFileSync(this.logPath, 'utf-8').split('\n');
  const lastLine = lines[lines.length - 2]; // Last non-empty
  const event = JSON.parse(lastLine);

  if (event.type === 'session_start') {
    this.handleSessionStart(event);
  }
});
```

### 4. Token Estimation with Learning

```typescript
// Store historical data for ML
interface EstimationModel {
  taskTypeAccuracy: Record<string, { accuracy: number }>;
  libraryKnowledge: Record<string, { avgIntegrationCost: number }>;
  userProfile: { avgBurnRate: number; learningCurve: number };
}

// Update model after each session
updateModel(estimated: number, actual: number, taskType: string) {
  const variance = Math.abs(actual - estimated) / estimated;
  const accuracy = 1 - variance;

  // Weighted average with historical data
  model.taskTypeAccuracy[taskType].accuracy =
    (model.taskTypeAccuracy[taskType].accuracy * 0.7) + (accuracy * 0.3);
}
```

## Security Considerations

### Data Storage
- **Local only**: All quota/session data stored in `~/.claude/`
- **No cloud sync**: Intentionally local for privacy
- **File permissions**: User-only read/write (chmod 600)

### API Keys
- **Never commit**: `.env` files in `.gitignore`
- **Environment variables**: Use `process.env.VARIABLE_NAME`
- **Validation**: Check for required keys on startup

### Sensitive Data
```typescript
// DON'T: Log sensitive information
console.log('API Key:', process.env.API_KEY); // ❌

// DO: Redact in logs
console.log('API Key:', process.env.API_KEY?.substring(0, 8) + '...'); // ✅
```

## Debugging Tips

### Enable Verbose Logging

```typescript
// Add DEBUG environment variable
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('[QuotaTracker] Loading quota from:', this.quotaPath);
}
```

### Common Issues

**TypeScript not compiling**:
```bash
# Check tsconfig.json is correct
cat tsconfig.json

# Clean and rebuild
rm -rf dist/ && npm run build
```

**Slash command not found**:
```bash
# Verify executable
ls -la .claude/commands/session-status

# Make executable
chmod +x .claude/commands/session-status

# Test directly
./.claude/commands/session-status
```

**JSONL not being watched**:
```bash
# Verify file exists
ls -la ~/.claude/logs/sessions.jsonl

# Check permissions
chmod 644 ~/.claude/logs/sessions.jsonl
```

## Byterover MCP Integration

### Knowledge Storage Workflow

**ALWAYS** use these tools for context management:

```typescript
// 1. Retrieve context before starting
await byterover.retrieveKnowledge({
  query: "quota tracking implementation patterns",
  scope: "claude-optimizer-v2"
});

// 2. Store learnings after implementation
await byterover.storeKnowledge({
  category: "implementation",
  content: "Token estimation accuracy improved from 72% to 94% by adding library-specific multipliers",
  tags: ["quota", "estimation", "ml"]
});
```

### Critical Rules
- ✅ **MUST** call `byterover-retrieve-knowledge` at task start
- ✅ **MUST** call `byterover-store-knowledge` after completing significant work
- ✅ Reference stored knowledge with "According to Byterover memory layer..."

## Quick Reference

### Essential Commands

```bash
# Development
npm run build              # Compile TypeScript
npm test                   # Run tests
npm run build:watch        # Watch mode

# Testing slash commands
/session-status            # Check quota & session
/start-next-session        # Interactive session starter
/create-calendar-events    # Export to calendar

# File locations
~/.claude/quota-tracker.json           # Quota state
~/.claude/logs/sessions.jsonl          # Claude Code log
~/.claude/session-queue.json           # Planned sessions
```

### Token Thresholds (Hyperaware Mode)

```
0-10%:   🎯 FRESH        - Plan strategically
10-25%:  🟢 EXCELLENT    - Any task OK
25-50%:  ✅ GOOD         - Large tasks OK (60-80k tokens)
50-80%:  💡 MODERATE     - Medium tasks (30-60k tokens)
80-90%:  ⚠️ DANGER       - START PLANNING next session
90-95%:  🔴 CRITICAL     - Wrap up current task
95%+:    🚨 EMERGENCY    - Save immediately
```

### Key Files to Understand

| File | Purpose | Key Functions |
|------|---------|---------------|
| `quota-tracker.ts` | Rolling window management | `canStartSession()`, `getStatus()` |
| `session-monitor.ts` | JSONL watching | `getCurrentSession()`, `estimateTokens()` |
| `smart-session-planner.ts` | Intelligent scheduling | `findNextSession()`, `scheduleSession()` |

## Session Planning Framework

### Purpose
Create **uniform, measured sessions** that minimize confusion and eliminate decision-making overhead.

### Session Plan Template

Every session follows this standardized format:

**Location**: `claude-optimizer-v2/SESSION_N_PLAN.md`

**Required Sections**:
1. Header (status, time, tokens, prerequisites)
2. Executive summary
3. Session objectives with success criteria
4. Phase breakdown with token estimates
5. Prerequisites checklist
6. Session start prompt

**Active Sessions**:
- ✅ [SESSION_1](claude-optimizer-v2/docs/sessions/SESSION_1_START_NATIVE_WORKFLOWS.md) - Native workflows
- ✅ [SESSION_2](claude-optimizer-v2/SESSION_2_HANDOFF.md) - Quota tracking
- ✅ [SESSION_2.5](claude-optimizer-v2/SESSION_2.5_COMPLETE.md) - Architecture refinement
- 📋 [SESSION_3](claude-optimizer-v2/SESSION_3_PLAN.md) - Dashboard implementation
- 📋 [SESSION_4](claude-optimizer-v2/docs/planning/AUTOMATED_SESSION_ORCHESTRATION_PLAN.md) - Automation

### Standard Operating Procedure

**Before Session**:
```bash
# 1. Check quota
/session-status

# 2. Review plan
cat SESSION_N_PLAN.md

# 3. Verify prerequisites
npm run build && npm test

# 4. Use prepared start prompt from plan
```

**During Session** (follow phases sequentially):
- Phase 1 → Phase 2 → Phase 3 → Phase 4
- Track token usage vs estimates
- At 80% quota: Run `/plan-next-session`

**After Session**:
```bash
# 1. Update plan status: 📋 → ✅
# 2. Create handoff (SESSION_N_HANDOFF.md)
# 3. Record actual vs estimated tokens
# 4. Commit: git commit -m "feat: Complete Session N"
```

### Token Estimation Baselines

| Task Type | Tokens/Hour | Confidence |
|-----------|-------------|------------|
| Planning | 20,000 | HIGH |
| Implementation | 45,000 | MEDIUM |
| Refactoring | 55,000 | MEDIUM |
| Testing | 30,000 | HIGH |
| Debugging | 35,000 | LOW |
| Polish | 20,000 | HIGH |

**Complexity Multipliers**:
- Familiar tech: 0.9x
- Learning tech: 1.2x
- New tech: 1.5x

### Phase Guidelines

**Optimal phase**: 1-2 hours, 25-45k tokens

**Break phases when**:
- Natural checkpoint (tests pass, feature done)
- Approaching 2-hour duration
- Complexity shift (coding → testing)

### Decision Checklist

Before starting any session, verify:
- [ ] Session plan exists
- [ ] Token estimate calculated
- [ ] Prerequisites verified
- [ ] Start prompt prepared
- [ ] Success criteria defined
- [ ] Handoff template ready

**If any unchecked**: Stop and complete it first.

## Documentation Links

- **Getting Started**: [docs/guides/GETTING_STARTED_GUIDE.md](claude-optimizer-v2/docs/guides/GETTING_STARTED_GUIDE.md)
- **Quota System**: [docs/guides/QUOTA_AWARE_SYSTEM.md](claude-optimizer-v2/docs/guides/QUOTA_AWARE_SYSTEM.md)
- **Hyperaware Mode**: [docs/guides/HYPERAWARE_MODE.md](claude-optimizer-v2/docs/guides/HYPERAWARE_MODE.md)
- **Automation Plan**: [docs/planning/AUTOMATED_SESSION_ORCHESTRATION_PLAN.md](claude-optimizer-v2/docs/planning/AUTOMATED_SESSION_ORCHESTRATION_PLAN.md)
- **Architecture**: [docs/architecture/VISUAL_ARCHITECTURE.md](claude-optimizer-v2/docs/architecture/VISUAL_ARCHITECTURE.md)
- **Session Plans**: [claude-optimizer-v2/](claude-optimizer-v2/) (SESSION_N_PLAN.md files)

## Project Goals

### Short-term (Current Sprint)
- ✅ Hyperaware quota tracking (80% planning trigger)
- ✅ Token estimation with ML
- 🔄 Automated session orchestration (in progress)
- 📋 Session handoff system (planned)

### Medium-term (Next 3 Months)
- Calendar integration with auto-launch
- Advanced estimation (95%+ accuracy)
- Multi-project support
- Team collaboration features

### Long-term Vision
- Industry-standard quota management
- Cross-platform support (Windows, Linux)
- Community-driven estimation models
- Integration with major IDEs

---

**Remember**: This is v2 only. We've cleaned up v1 completely. Focus on quota-aware development, token estimation, and automated orchestration. Every feature should help developers work strategically within Claude Code's natural limits.

**Last Updated**: January 2025
**Version**: 2.0.0
