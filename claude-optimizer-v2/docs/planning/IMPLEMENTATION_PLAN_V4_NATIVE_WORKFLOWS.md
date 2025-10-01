# Claude Code Optimizer v2.0 - Native Workflows Implementation Plan

## 🎯 Vision: Leverage Claude Code's Built-in Features

**Core Philosophy**: Instead of programmatically controlling Claude Code with an SDK, we'll use Claude Code's **native workflow features** to create an intelligent, automated optimization system.

**Key Technologies**:
- ✅ **Slash Commands** - Repeatable project analysis and scheduling tasks
- ✅ **Hooks System** - Automation triggers for session lifecycle events
- ✅ **Specialized Agents** - Pre-configured agents for different project phases
- ✅ **GitHub Actions** - Calendar-based scheduling and automation
- ✅ **CLAUDE.md** - Project-specific guidance and context

---

## 🏗️ Architecture Overview

### The New Approach

```
┌─────────────────────────────────────────────────────────┐
│  1. PROJECT ANALYSIS (Slash Command)                    │
│     /analyze-project                                     │
│     • Scans codebase with rule-based heuristics         │
│     • Generates complexity score and time estimates     │
│     • Creates CLAUDE.md with project-specific guidance  │
│     • Outputs session plan to .claude/session-plan.json │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  2. AGENT CREATION (Slash Command)                       │
│     /create-session-agents                               │
│     • Reads .claude/session-plan.json                    │
│     • Creates specialized agent for each phase:          │
│       - planning-agent.md                                │
│       - implementation-agent.md                          │
│       - testing-agent.md                                 │
│       - polish-agent.md                                  │
│     • Stores in .claude/agents/                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  3. SCHEDULING (GitHub Actions)                          │
│     .github/workflows/claude-session-scheduler.yml       │
│     • Cron-based triggers for each phase                 │
│     • Creates issues for each session                    │
│     • @claude mention auto-starts session                │
│     • Agent selection via workflow parameters            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  4. HOOKS AUTOMATION                                     │
│     ~/.claude/hooks/                                     │
│     • session-start-hook.sh - Inject project context    │
│     • pre-tool-hook.sh - Enforce best practices         │
│     • post-tool-hook.sh - Track progress & tokens       │
│     • notification-hook.sh - Desktop alerts              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  5. DASHBOARD (Existing React App)                       │
│     • Reads .claude/session-plan.json                    │
│     • Monitors .claude/session-log.json (from hooks)     │
│     • Shows real-time progress via file watching         │
│     • Displays token usage, cost, completion %           │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Session 1: Foundation (5 hours)

### Hour 1: Project Structure & Analysis Engine

**Goal**: Create rule-based project analyzer with slash command

**Deliverables**:

1. **TypeScript Project Setup**
```
claude-optimizer/
├── src/
│   ├── analyzer.ts           # Rule-based analysis
│   ├── types.ts              # Type definitions
│   └── utils/
│       └── file-scanner.ts   # File system scanner
├── .claude/
│   └── commands/
│       └── analyze-project   # Slash command script
├── package.json
└── tsconfig.json
```

2. **Slash Command: `/analyze-project`**
```bash
#!/bin/bash
# .claude/commands/analyze-project

# Run TypeScript analyzer
node dist/analyzer.js "$PWD" --format=json > .claude/session-plan.json

# Generate CLAUDE.md with project context
node dist/generate-claude-md.js

# Display results
node dist/display-analysis.js

echo "✅ Project analyzed! View plan: cat .claude/session-plan.json"
echo "📋 Next: Run /create-session-agents to set up specialized agents"
```

**Implementation**:
```typescript
// src/analyzer.ts
export interface ProjectAnalysis {
  complexity: number;        // 1-10 scale
  estimatedHours: number;
  phases: SessionPhase[];
  technologies: string[];
  riskFactors: string[];
  fileStats: {
    total: number;
    byLanguage: Record<string, number>;
  };
}

export class ProjectAnalyzer {
  async analyze(projectPath: string): Promise<ProjectAnalysis> {
    // 1. Scan files
    const files = await this.scanFiles(projectPath);

    // 2. Calculate complexity using heuristics
    const complexity = this.calculateComplexity(files);

    // 3. Estimate time
    const estimatedHours = this.estimateHours(complexity, files);

    // 4. Generate phases
    const phases = this.generatePhases(estimatedHours, complexity);

    return { complexity, estimatedHours, phases, ... };
  }

  private calculateComplexity(files: FileInfo[]): number {
    let score = 1;

    // File count factor
    if (files.length > 500) score += 3;
    else if (files.length > 200) score += 2;
    else if (files.length > 50) score += 1;

    // Language diversity
    const languages = new Set(files.map(f => f.language));
    score += Math.min(2, languages.size / 3);

    // Technology complexity (React, TypeScript, etc.)
    score += this.detectComplexTechnologies(files);

    // Missing tests/docs
    if (!this.hasTests(files)) score += 1;
    if (!this.hasDocs(files)) score += 1;

    return Math.min(10, score);
  }
}
```

---

### Hour 2: Specialized Agent Creator

**Goal**: Generate phase-specific agent configurations

**Slash Command: `/create-session-agents`**
```bash
#!/bin/bash
# .claude/commands/create-session-agents

# Read session plan
PLAN=".claude/session-plan.json"

if [ ! -f "$PLAN" ]; then
  echo "❌ No session plan found. Run /analyze-project first."
  exit 1
fi

# Create agent directory
mkdir -p .claude/agents

# Generate specialized agents
node dist/create-agents.js "$PLAN"

echo "✅ Created specialized agents:"
ls -1 .claude/agents/

echo ""
echo "📋 Start a session with:"
echo "   claude --agent .claude/agents/planning-agent.md"
```

**Agent Template Example**:
```markdown
<!-- .claude/agents/planning-agent.md -->
# Planning & Architecture Agent

## Role
You are a senior software architect specializing in project planning and system design.

## Context
Project: ${PROJECT_NAME}
Complexity: ${COMPLEXITY}/10
Estimated Time: ${PHASE_HOURS} hours

## Objectives for This Session
${OBJECTIVES}

## Success Criteria
- [ ] Complete architecture diagram
- [ ] Detailed implementation roadmap
- [ ] Dependencies identified
- [ ] Risk mitigation strategies defined

## Constraints
- Token Budget: ${TOKEN_BUDGET}
- Suggested Model: opus
- Max Session Duration: ${PHASE_HOURS} hours

## Working Principles
1. Start broad, then drill down into specifics
2. Document all architectural decisions
3. Identify integration points early
4. Consider scalability and maintainability

## Required Tools
- Read, Glob, Grep (for exploration)
- Write (for documentation only)
- Bash (for environment checks)

## Output Format
Create a detailed plan in `docs/ARCHITECTURE.md` covering:
1. System overview
2. Component breakdown
3. Data flow diagrams
4. Technology stack justification
5. Implementation timeline

---
*Auto-generated by Claude Code Optimizer*
*Phase: Planning & Setup*
```

**Implementation**:
```typescript
// src/create-agents.ts
export class AgentCreator {
  async createAgents(sessionPlan: ProjectAnalysis): Promise<void> {
    const agentTemplates = {
      planning: this.createPlanningAgent,
      implementation: this.createImplementationAgent,
      testing: this.createTestingAgent,
      polish: this.createPolishAgent
    };

    for (const phase of sessionPlan.phases) {
      const template = agentTemplates[phase.type];
      const agentContent = template(phase, sessionPlan);

      await fs.writeFile(
        `.claude/agents/${phase.name.toLowerCase()}-agent.md`,
        agentContent
      );
    }
  }

  private createPlanningAgent(phase: SessionPhase, plan: ProjectAnalysis): string {
    return `
# ${phase.name} Agent

## Role
Senior software architect for project planning

## Objectives (${phase.estimatedHours}h)
${phase.objectives.map(o => `- [ ] ${o}`).join('\n')}

## Token Budget
${phase.tokenBudget} tokens (${phase.suggestedModel})

## Context
- Complexity: ${plan.complexity}/10
- Technologies: ${plan.technologies.join(', ')}
- Risks: ${plan.riskFactors.join(', ')}

## Tools
${phase.requiredTools.join(', ')}

---
*Generated by Claude Code Optimizer*
    `.trim();
  }
}
```

---

### Hour 3: Hooks System for Automation

**Goal**: Create hooks for session automation and tracking

**Hook Types to Implement**:

1. **SessionStart Hook** - Inject project context
```bash
#!/bin/bash
# ~/.claude/hooks/session-start.sh

PROJECT_ROOT="$PWD"
SESSION_PLAN="$PROJECT_ROOT/.claude/session-plan.json"

if [ -f "$SESSION_PLAN" ]; then
  echo "📊 Loading project analysis..."

  # Extract key info
  COMPLEXITY=$(jq -r '.complexity' "$SESSION_PLAN")
  EST_HOURS=$(jq -r '.estimatedHours' "$SESSION_PLAN")

  # Display session context
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📋 Project Complexity: $COMPLEXITY/10"
  echo "⏱️  Estimated Time: $EST_HOURS hours"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Check if CLAUDE.md exists with project guidance
  if [ -f "CLAUDE.md" ]; then
    echo "✅ Project guidance loaded from CLAUDE.md"
  fi
fi
```

2. **PreToolUse Hook** - Track tool usage and enforce budgets
```bash
#!/bin/bash
# ~/.claude/hooks/pre-tool-use.sh

TOOL_NAME="$1"
SESSION_LOG=".claude/session-log.json"

# Initialize log if doesn't exist
if [ ! -f "$SESSION_LOG" ]; then
  echo '{"tools": {}, "startTime": "'$(date -u +%s)'"}' > "$SESSION_LOG"
fi

# Increment tool counter
jq ".tools[\"$TOOL_NAME\"] = (.tools[\"$TOOL_NAME\"] // 0) + 1" "$SESSION_LOG" > "$SESSION_LOG.tmp"
mv "$SESSION_LOG.tmp" "$SESSION_LOG"

# Check if Edit tool is being overused (potential sign of inefficiency)
EDIT_COUNT=$(jq -r '.tools.Edit // 0' "$SESSION_LOG")
if [ "$TOOL_NAME" = "Edit" ] && [ "$EDIT_COUNT" -gt 50 ]; then
  echo "⚠️  Warning: High Edit tool usage ($EDIT_COUNT calls). Consider refactoring approach."
fi
```

3. **PostToolUse Hook** - Track token usage and costs
```bash
#!/bin/bash
# ~/.claude/hooks/post-tool-use.sh

TOOL_NAME="$1"
TOKEN_USAGE="$2"  # If available from tool result
SESSION_LOG=".claude/session-log.json"

# Update token counters
if [ -n "$TOKEN_USAGE" ]; then
  CURRENT_TOKENS=$(jq -r '.totalTokens // 0' "$SESSION_LOG")
  NEW_TOTAL=$((CURRENT_TOKENS + TOKEN_USAGE))

  jq ".totalTokens = $NEW_TOTAL" "$SESSION_LOG" > "$SESSION_LOG.tmp"
  mv "$SESSION_LOG.tmp" "$SESSION_LOG"

  # Calculate cost (Sonnet pricing: $3/M input, $15/M output)
  COST=$(echo "scale=4; $NEW_TOTAL * 9 / 1000000" | bc)
  jq ".estimatedCost = $COST" "$SESSION_LOG" > "$SESSION_LOG.tmp"
  mv "$SESSION_LOG.tmp" "$SESSION_LOG"

  # Check budget warnings
  BUDGET=$(jq -r '.tokenBudget // 999999' .claude/session-plan.json)
  PERCENT=$(echo "scale=2; $NEW_TOTAL * 100 / $BUDGET" | bc)

  if [ "$PERCENT" -gt 80 ]; then
    echo "⚠️  Token budget: ${PERCENT}% used ($NEW_TOTAL / $BUDGET)"
  fi
fi
```

4. **Notification Hook** - Desktop notifications for key events
```bash
#!/bin/bash
# ~/.claude/hooks/notification.sh

MESSAGE="$1"
URGENCY="${2:-normal}"

# macOS notification
if [[ "$OSTYPE" == "darwin"* ]]; then
  osascript -e "display notification \"$MESSAGE\" with title \"Claude Code Session\" sound name \"Hero\""
fi

# Also log to session file
SESSION_LOG=".claude/session-log.json"
TIMESTAMP=$(date -u +%s)

jq ".notifications += [{\"time\": $TIMESTAMP, \"message\": \"$MESSAGE\", \"urgency\": \"$URGENCY\"}]" "$SESSION_LOG" > "$SESSION_LOG.tmp"
mv "$SESSION_LOG.tmp" "$SESSION_LOG"
```

**Hook Registration** (via slash command):
```bash
#!/bin/bash
# .claude/commands/setup-hooks

echo "📌 Registering Claude Code Optimizer hooks..."

# Register session start hook
claude --register-hook SessionStart ~/.claude/hooks/session-start.sh

# Register tool tracking hooks
claude --register-hook PreToolUse ~/.claude/hooks/pre-tool-use.sh
claude --register-hook PostToolUse ~/.claude/hooks/post-tool-use.sh

# Register notification hook
claude --register-hook Notification ~/.claude/hooks/notification.sh

echo "✅ Hooks registered successfully!"
echo ""
echo "Active hooks:"
claude /hooks list
```

---

### Hour 4: GitHub Actions Scheduling

**Goal**: Automate session triggering via GitHub Actions

**Workflow File**:
```yaml
# .github/workflows/claude-session-scheduler.yml
name: Claude Code Session Scheduler

on:
  # Manual trigger
  workflow_dispatch:
    inputs:
      phase:
        description: 'Session phase to run'
        required: true
        type: choice
        options:
          - planning
          - implementation
          - testing
          - polish

  # Scheduled triggers (example: daily sessions)
  schedule:
    # Planning phase: Monday 9 AM
    - cron: '0 9 * * 1'
    # Implementation: Tuesday-Thursday 9 AM
    - cron: '0 9 * * 2-4'
    # Testing: Friday 9 AM
    - cron: '0 9 * * 5'

jobs:
  trigger-claude-session:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Determine phase from schedule
        id: phase
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "phase=${{ inputs.phase }}" >> $GITHUB_OUTPUT
          else
            # Determine phase from day of week
            DOW=$(date +%u)  # 1=Monday, 5=Friday
            case $DOW in
              1) echo "phase=planning" >> $GITHUB_OUTPUT ;;
              2|3|4) echo "phase=implementation" >> $GITHUB_OUTPUT ;;
              5) echo "phase=testing" >> $GITHUB_OUTPUT ;;
            esac
          fi

      - name: Check if session plan exists
        run: |
          if [ ! -f ".claude/session-plan.json" ]; then
            echo "❌ No session plan found. Run /analyze-project first."
            exit 1
          fi

      - name: Create session issue
        uses: actions/github-script@v7
        with:
          script: |
            const phase = '${{ steps.phase.outputs.phase }}';
            const fs = require('fs');
            const plan = JSON.parse(fs.readFileSync('.claude/session-plan.json', 'utf8'));

            // Find phase details
            const phaseDetails = plan.phases.find(p =>
              p.name.toLowerCase().includes(phase)
            );

            // Create issue for this session
            const issue = await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🤖 Claude Session: ${phaseDetails.name}`,
              body: `
## ${phaseDetails.name} Session

**Duration**: ${phaseDetails.estimatedHours} hours
**Model**: ${phaseDetails.suggestedModel}
**Token Budget**: ${phaseDetails.tokenBudget.toLocaleString()}

### Objectives
${phaseDetails.objectives.map(o => `- [ ] ${o}`).join('\n')}

### Instructions for @claude

Please use the specialized agent for this phase:

\`\`\`
Load agent: .claude/agents/${phase}-agent.md
\`\`\`

Work through the objectives systematically. Reference the project guidance in CLAUDE.md.

@claude start this session

---
*Automated by Claude Code Optimizer*
*Scheduled: ${new Date().toLocaleString()}*
              `,
              labels: ['claude-session', phase]
            });

            console.log('Created issue:', issue.data.html_url);

      - name: Send notification
        run: |
          echo "✅ Session issue created for ${{ steps.phase.outputs.phase }} phase"

          # Optional: Send Slack/email notification
          # curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          #   -d '{"text": "Claude session started: ${{ steps.phase.outputs.phase }}"}'
```

**Additional Workflow**: Session completion tracker
```yaml
# .github/workflows/session-complete.yml
name: Track Session Completion

on:
  issues:
    types: [closed]

jobs:
  track-completion:
    runs-on: ubuntu-latest
    if: contains(github.event.issue.labels.*.name, 'claude-session')

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Update session log
        run: |
          # Parse phase from issue title
          PHASE=$(echo "${{ github.event.issue.title }}" | grep -oP '(?<=: ).*')

          # Update session-log.json
          jq ".completedPhases += [\"$PHASE\"]" .claude/session-log.json > .claude/session-log.json.tmp
          mv .claude/session-log.json.tmp .claude/session-log.json

          # Calculate progress
          TOTAL_PHASES=$(jq '.phases | length' .claude/session-plan.json)
          COMPLETED=$(jq '.completedPhases | length' .claude/session-log.json)
          PERCENT=$(echo "scale=0; $COMPLETED * 100 / $TOTAL_PHASES" | bc)

          echo "📊 Progress: $PERCENT% ($COMPLETED / $TOTAL_PHASES phases)"

      - name: Commit updated log
        run: |
          git config user.name "Claude Code Optimizer"
          git config user.email "bot@claude-optimizer"
          git add .claude/session-log.json
          git commit -m "chore: Update session log - ${{ github.event.issue.title }} completed"
          git push
```

---

### Hour 5: Dashboard Integration & CLI

**Goal**: Connect dashboard to file-based state, create CLI commands

**Dashboard Updates**:
```typescript
// dashboard/src/hooks/useSessionState.ts
import { useEffect, useState } from 'react';

export interface SessionState {
  plan: ProjectAnalysis | null;
  log: SessionLog | null;
  progress: number;
}

export function useSessionState(projectPath: string): SessionState {
  const [state, setState] = useState<SessionState>({
    plan: null,
    log: null,
    progress: 0
  });

  useEffect(() => {
    // Read session files
    const loadState = async () => {
      const planPath = `${projectPath}/.claude/session-plan.json`;
      const logPath = `${projectPath}/.claude/session-log.json`;

      const [plan, log] = await Promise.all([
        fetch(`file://${planPath}`).then(r => r.json()).catch(() => null),
        fetch(`file://${logPath}`).then(r => r.json()).catch(() => null)
      ]);

      const progress = log && plan
        ? (log.completedPhases.length / plan.phases.length) * 100
        : 0;

      setState({ plan, log, progress });
    };

    loadState();

    // Watch for file changes (using fs.watch or chokidar)
    const watcher = watchFiles([
      `${projectPath}/.claude/session-plan.json`,
      `${projectPath}/.claude/session-log.json`
    ], loadState);

    return () => watcher.close();
  }, [projectPath]);

  return state;
}
```

**CLI Commands**:
```typescript
// src/cli.ts
import { Command } from 'commander';

const program = new Command();

program
  .name('claude-optimizer')
  .version('2.0.0')
  .description('Claude Code workflow optimizer');

// Analyze project
program
  .command('analyze <project-path>')
  .description('Analyze project and generate session plan')
  .action(async (projectPath) => {
    const analyzer = new ProjectAnalyzer();
    const analysis = await analyzer.analyze(projectPath);

    // Save to .claude/session-plan.json
    await saveSessionPlan(analysis);

    // Generate CLAUDE.md
    await generateClaudeMd(analysis);

    console.log('✅ Analysis complete!');
    console.log(`📋 Next: Run 'claude-optimizer setup-agents' to create specialized agents`);
  });

// Create specialized agents
program
  .command('setup-agents')
  .description('Create specialized agents from session plan')
  .action(async () => {
    const plan = await loadSessionPlan();
    const creator = new AgentCreator();
    await creator.createAgents(plan);

    console.log('✅ Agents created in .claude/agents/');
    console.log('📋 Start a session: claude --agent .claude/agents/planning-agent.md');
  });

// Setup hooks
program
  .command('setup-hooks')
  .description('Register optimization hooks')
  .action(async () => {
    await registerHooks();
    console.log('✅ Hooks registered!');
  });

// Dashboard
program
  .command('dashboard')
  .description('Launch monitoring dashboard')
  .action(async () => {
    // Start dashboard server
    console.log('📊 Starting dashboard on http://localhost:3001');
    await startDashboard();
  });

program.parse();
```

---

## 📊 Complete Workflow Example

### 1. Initial Setup (One-time)

```bash
# Clone and setup
git clone https://github.com/YourOrg/your-project
cd your-project

# Install Claude Code Optimizer
npm install -g claude-code-optimizer

# Analyze project
claude-optimizer analyze .

# Output:
# ✅ Project analyzed!
# 📊 Complexity: 7/10
# ⏱️  Estimated: 24 hours
# 📋 Session plan saved to .claude/session-plan.json

# Setup specialized agents
claude-optimizer setup-agents

# Output:
# ✅ Created 4 specialized agents:
#    - planning-agent.md
#    - implementation-agent.md
#    - testing-agent.md
#    - polish-agent.md

# Setup hooks for automation
claude-optimizer setup-hooks

# Output:
# ✅ Hooks registered:
#    - SessionStart → Inject project context
#    - PreToolUse → Track tool usage
#    - PostToolUse → Monitor token budget
#    - Notification → Desktop alerts
```

### 2. Start First Session (Planning)

```bash
# Option A: Manual start with specialized agent
claude --agent .claude/agents/planning-agent.md

# Option B: Use slash command
claude
> /load-agent planning

# Option C: GitHub Actions (automatic on schedule)
# Just wait for Monday 9 AM, or trigger manually
```

### 3. Monitor Progress

```bash
# Launch dashboard
claude-optimizer dashboard

# Or check CLI
claude-optimizer status

# Output:
# 📊 Project Progress
# ━━━━━━━━━━━━━━━━━━━━━━━━━━
# ✅ Planning & Setup (3h) - Complete
# ⏳ Core Implementation (12h) - In Progress (4h done)
# ⬜ Testing & Integration (6h) - Pending
# ⬜ Polish & Documentation (3h) - Pending
#
# Token Usage: 156,234 / 360,000 (43%)
# Estimated Cost: $8.47
```

### 4. Session Continues with Hooks

During the session, hooks automatically:
- ✅ Track every tool use in `.claude/session-log.json`
- ✅ Warn when approaching token budget
- ✅ Send desktop notifications for key milestones
- ✅ Update dashboard in real-time

### 5. Complete Phase, Move to Next

```bash
# When phase is done, GitHub Actions automatically:
# 1. Closes the session issue
# 2. Updates session-log.json
# 3. Calculates new progress percentage
# 4. Triggers next phase (if scheduled)

# Or manually trigger next phase:
gh workflow run claude-session-scheduler.yml -f phase=testing
```

---

## 🎯 Advantages of This Approach

### vs. Claude Agent SDK

| Feature | Agent SDK | Native Workflows |
|---------|-----------|------------------|
| **Setup** | Complex programmatic integration | Simple slash commands & hooks |
| **Reliability** | Depends on SDK version | Uses stable Claude Code features |
| **Automation** | Custom polling loops | GitHub Actions cron + hooks |
| **Flexibility** | Limited to SDK capabilities | Full shell script power |
| **Maintenance** | SDK updates may break code | Workflow files rarely change |
| **Learning Curve** | Need to learn SDK API | Bash scripts & YAML (familiar) |

### Key Benefits

1. **Simplicity**: No complex SDK, just shell scripts and config files
2. **Native**: Leverages Claude Code's built-in features as intended
3. **Flexible**: Easy to customize hooks and workflows
4. **Portable**: Works across different machines and CI/CD
5. **Transparent**: All automation is visible in workflow files
6. **Maintainable**: Easier to debug and modify

---

## 📋 Session-by-Session Implementation

### Session 1: Foundation (UPDATED)
- ✅ Rule-based project analyzer
- ✅ Slash command: `/analyze-project`
- ✅ CLAUDE.md generator
- ✅ Basic CLI

### Session 2: Agent System
- ✅ Agent template system
- ✅ Slash command: `/create-session-agents`
- ✅ Agent customization
- ✅ Phase-specific configurations

### Session 3: Hooks & Automation
- ✅ SessionStart hook
- ✅ PreToolUse/PostToolUse hooks
- ✅ Token tracking
- ✅ Desktop notifications
- ✅ Slash command: `/setup-hooks`

### Session 4: GitHub Actions
- ✅ Scheduler workflow
- ✅ Issue creation automation
- ✅ Session completion tracking
- ✅ Progress updates

### Session 5: Dashboard & Polish
- ✅ File-based state reading
- ✅ Real-time updates (file watching)
- ✅ Token/cost visualization
- ✅ Phase progress tracking
- ✅ Documentation

---

## 🚀 Next Steps

This updated plan uses **100% native Claude Code features** with no SDK complexity. Ready to start Session 1!

**Key Files to Create First**:
1. `src/analyzer.ts` - Rule-based complexity analysis
2. `.claude/commands/analyze-project` - Slash command
3. `src/generate-claude-md.ts` - CLAUDE.md generator
4. `src/cli.ts` - CLI interface

**Test Command**:
```bash
cd your-project
/analyze-project
# Should create .claude/session-plan.json and CLAUDE.md
```

Ready to implement? 🎯
