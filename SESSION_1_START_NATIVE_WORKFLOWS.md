# Session 1 Start: Foundation with Native Workflows

**Date**: TBD
**Focus**: Claude Code Optimizer v2.0 - Native Workflows Approach
**Duration**: 5 hours

---

## 🎯 Mission Statement

Build the foundation for Claude Code Optimizer using **Claude Code's native workflow features** instead of the Agent SDK:

- ✅ **Slash Commands** for repeatable analysis tasks
- ✅ **Hooks System** for automation triggers
- ✅ **Specialized Agents** for different project phases
- ✅ **GitHub Actions** for scheduling
- ✅ **CLAUDE.md** for project-specific guidance

**Success Criteria**: Complete end-to-end workflow from project analysis to agent creation.

---

## 📖 Required Reading

**CRITICAL - Read this first**:
```
/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/IMPLEMENTATION_PLAN_V4_NATIVE_WORKFLOWS.md
```

**Supporting Docs**:
- Claude Code Common Workflows: https://docs.claude.com/en/docs/claude-code/common-workflows
- Claude Code Hooks Guide: https://docs.claude.com/en/docs/claude-code/hooks-guide
- GitHub Actions Integration: https://docs.claude.com/en/docs/claude-code/github-actions

---

## 🏗️ Architecture Overview

### What We're Building

```
Project Analysis (Slash Command)
    ↓
Session Plan (.claude/session-plan.json)
    ↓
Specialized Agents (.claude/agents/*.md)
    ↓
Hooks for Automation (~/.claude/hooks/*.sh)
    ↓
GitHub Actions Scheduling (.github/workflows/*.yml)
    ↓
Dashboard Monitoring (React app)
```

### Key Difference from Previous Approach

❌ **OLD**: Use Claude Agent SDK to programmatically control Claude
✅ **NEW**: Use Claude Code's built-in features (slash commands, hooks, agents)

**Why This is Better**:
1. Simpler - No complex SDK to learn
2. Native - Uses Claude Code as intended
3. Maintainable - Shell scripts everyone understands
4. Portable - Works across machines and CI/CD

---

## 📋 Hour-by-Hour Plan

### Hour 1: Project Setup & Rule-Based Analyzer

**Create**: `claude-optimizer/` directory structure

```
claude-optimizer/
├── src/
│   ├── analyzer.ts              # Rule-based analysis (NO AI!)
│   ├── types.ts                 # Type definitions
│   ├── generate-claude-md.ts    # CLAUDE.md generator
│   └── utils/
│       └── file-scanner.ts      # File system scanner
├── .claude/
│   └── commands/
│       └── analyze-project      # Slash command script
├── package.json
├── tsconfig.json
└── README.md
```

**Dependencies** (NO Agent SDK!):
```json
{
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

**Key Implementation**: `src/analyzer.ts`
```typescript
export class ProjectAnalyzer {
  async analyze(projectPath: string): Promise<ProjectAnalysis> {
    // 1. Scan files (recursively, with ignore patterns)
    const files = await this.scanFiles(projectPath);

    // 2. Calculate complexity using HEURISTICS
    const complexity = this.calculateComplexity(files);
    //  - File count factor
    //  - Language diversity
    //  - Technology complexity
    //  - Missing tests/docs

    // 3. Estimate hours using FORMULAS
    const estimatedHours = this.estimateHours(complexity, files);

    // 4. Generate phases (Planning, Implementation, Testing, Polish)
    const phases = this.generatePhases(estimatedHours);

    return { complexity, estimatedHours, phases, ... };
  }
}
```

**Checkpoint**: TypeScript compiles, basic analysis runs

---

### Hour 2: Slash Command & CLAUDE.md Generator

**Create**: `.claude/commands/analyze-project`

```bash
#!/bin/bash
# Slash command that users can run: /analyze-project

echo "📊 Analyzing project..."

# Run TypeScript analyzer
node dist/analyzer.js "$PWD" --format=json > .claude/session-plan.json

# Generate CLAUDE.md with project-specific guidance
node dist/generate-claude-md.js

# Display summary
node dist/display-analysis.js

echo ""
echo "✅ Analysis complete!"
echo "📄 Session plan: .claude/session-plan.json"
echo "📋 Project guidance: CLAUDE.md"
echo ""
echo "Next: Run /create-session-agents"
```

**Create**: `src/generate-claude-md.ts`

```typescript
export class ClaudeMdGenerator {
  generate(analysis: ProjectAnalysis): string {
    return `
# ${analysis.projectName}

## Project Overview
- **Complexity**: ${analysis.complexity}/10
- **Estimated Time**: ${analysis.estimatedHours} hours
- **Technologies**: ${analysis.technologies.join(', ')}

## Development Approach

### Session Phases
${analysis.phases.map((p, i) => `
${i + 1}. **${p.name}** (${p.estimatedHours}h)
   ${p.objectives.map(o => `- ${o}`).join('\n   ')}
`).join('\n')}

## Risk Factors
${analysis.riskFactors.map(r => `- ⚠️ ${r}`).join('\n')}

## Working Principles
1. Follow the session plan sequentially
2. Use specialized agents for each phase
3. Monitor token budget (alerts at 80%)
4. Document all architectural decisions

---
*Auto-generated by Claude Code Optimizer*
*Analysis Date: ${new Date().toISOString()}*
    `.trim();
  }
}
```

**Output Example**: `CLAUDE.md`
```markdown
# moonlock-dashboard

## Project Overview
- **Complexity**: 6/10
- **Estimated Time**: 18 hours
- **Technologies**: React, TypeScript, Next.js, Tailwind

## Development Approach

### Session Phases

1. **Planning & Setup** (2.7h)
   - Understand existing architecture
   - Create implementation roadmap
   - Set up development environment

2. **Core Implementation** (9h)
   - Implement primary features
   - Write integration logic
   ...

## Risk Factors
- ⚠️ No existing test coverage - will need tests from scratch
- ⚠️ Multiple technologies - integration complexity high

## Working Principles
1. Follow the session plan sequentially
2. Use specialized agents for each phase
3. Monitor token budget (alerts at 80%)
4. Document all architectural decisions
```

**Checkpoint**: `/analyze-project` creates `.claude/session-plan.json` and `CLAUDE.md`

---

### Hour 3: Specialized Agent Creator

**Create**: `.claude/commands/create-session-agents`

```bash
#!/bin/bash
# Slash command: /create-session-agents

PLAN=".claude/session-plan.json"

if [ ! -f "$PLAN" ]; then
  echo "❌ No session plan found. Run /analyze-project first."
  exit 1
fi

echo "🤖 Creating specialized agents..."

# Create agent directory
mkdir -p .claude/agents

# Generate agents from session plan
node dist/create-agents.js "$PLAN"

echo ""
echo "✅ Created agents:"
ls -1 .claude/agents/

echo ""
echo "📋 Start a session:"
echo "   claude --agent .claude/agents/planning-agent.md"
```

**Create**: `src/create-agents.ts`

```typescript
export class AgentCreator {
  async createAgents(plan: ProjectAnalysis): Promise<void> {
    for (const phase of plan.phases) {
      const agentMd = this.generateAgentMarkdown(phase, plan);

      await fs.writeFile(
        `.claude/agents/${this.slugify(phase.name)}-agent.md`,
        agentMd
      );
    }
  }

  private generateAgentMarkdown(
    phase: SessionPhase,
    plan: ProjectAnalysis
  ): string {
    return `
# ${phase.name} Agent

## Role
${this.getRoleDescription(phase.name)}

## Context
- **Project**: ${plan.projectName}
- **Complexity**: ${plan.complexity}/10
- **Phase Duration**: ${phase.estimatedHours} hours
- **Token Budget**: ${phase.tokenBudget.toLocaleString()}

## Objectives
${phase.objectives.map(o => `- [ ] ${o}`).join('\n')}

## Success Criteria
Each objective must be completed before moving to next phase.

## Constraints
- Suggested Model: **${phase.suggestedModel}**
- Max Token Budget: ${phase.tokenBudget.toLocaleString()}
- Required Tools: ${phase.requiredTools.join(', ')}

## Working Principles
${this.getWorkingPrinciples(phase.name)}

## Output Requirements
${this.getOutputRequirements(phase.name)}

---
*Generated by Claude Code Optimizer*
*Phase: ${phase.name}*
    `.trim();
  }

  private getRoleDescription(phaseName: string): string {
    const roles = {
      'Planning & Setup': 'Senior software architect specializing in system design and project planning',
      'Core Implementation': 'Expert full-stack developer with deep language expertise',
      'Testing & Integration': 'QA engineer and integration specialist',
      'Polish & Documentation': 'Code quality specialist and technical writer'
    };
    return roles[phaseName] || 'Software development specialist';
  }
}
```

**Checkpoint**: `/create-session-agents` creates 4 agent files in `.claude/agents/`

---

### Hour 4: Hooks System Setup

**Create**: Hook scripts in `~/.claude/hooks/`

```bash
# Directory structure
~/.claude/hooks/
├── session-start.sh          # Inject project context
├── pre-tool-use.sh          # Track tool usage
├── post-tool-use.sh         # Monitor token budget
└── notification.sh          # Desktop alerts
```

**Create**: `~/.claude/hooks/session-start.sh`

```bash
#!/bin/bash
# SessionStart hook - Runs at beginning of every Claude Code session

PROJECT_ROOT="$PWD"
SESSION_PLAN="$PROJECT_ROOT/.claude/session-plan.json"

if [ -f "$SESSION_PLAN" ]; then
  COMPLEXITY=$(jq -r '.complexity' "$SESSION_PLAN")
  EST_HOURS=$(jq -r '.estimatedHours' "$SESSION_PLAN")
  TECH=$(jq -r '.technologies | join(", ")' "$SESSION_PLAN")

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Project Analysis Loaded"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Complexity: $COMPLEXITY/10"
  echo "Estimated: $EST_HOURS hours"
  echo "Tech Stack: $TECH"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Check for CLAUDE.md
  if [ -f "$PROJECT_ROOT/CLAUDE.md" ]; then
    echo "✅ Project guidance loaded from CLAUDE.md"
  else
    echo "⚠️  No CLAUDE.md found. Consider running /analyze-project"
  fi

  # Initialize session log
  if [ ! -f "$PROJECT_ROOT/.claude/session-log.json" ]; then
    echo '{
      "startTime": "'$(date -u +%s)'",
      "tools": {},
      "totalTokens": 0,
      "estimatedCost": 0,
      "notifications": []
    }' > "$PROJECT_ROOT/.claude/session-log.json"
  fi
fi
```

**Create**: `~/.claude/hooks/post-tool-use.sh`

```bash
#!/bin/bash
# PostToolUse hook - Runs after every tool execution

TOOL_NAME="$1"
SESSION_LOG=".claude/session-log.json"

if [ ! -f "$SESSION_LOG" ]; then
  exit 0
fi

# Increment tool counter
jq ".tools[\"$TOOL_NAME\"] = (.tools[\"$TOOL_NAME\"] // 0) + 1" \
  "$SESSION_LOG" > "$SESSION_LOG.tmp"
mv "$SESSION_LOG.tmp" "$SESSION_LOG"

# Estimate tokens (rough heuristic)
# Edit/Write = ~1000 tokens, Read = ~500, Bash = ~200
case "$TOOL_NAME" in
  "Edit"|"Write") TOKENS=1000 ;;
  "Read") TOKENS=500 ;;
  "Bash") TOKENS=200 ;;
  *) TOKENS=300 ;;
esac

# Update token count
CURRENT=$(jq -r '.totalTokens // 0' "$SESSION_LOG")
NEW_TOTAL=$((CURRENT + TOKENS))

jq ".totalTokens = $NEW_TOTAL" "$SESSION_LOG" > "$SESSION_LOG.tmp"
mv "$SESSION_LOG.tmp" "$SESSION_LOG"

# Calculate cost (Sonnet: $3/M input, $15/M output, avg $9/M)
COST=$(echo "scale=4; $NEW_TOTAL * 9 / 1000000" | bc)
jq ".estimatedCost = $COST" "$SESSION_LOG" > "$SESSION_LOG.tmp"
mv "$SESSION_LOG.tmp" "$SESSION_LOG"

# Check budget warning (80% threshold)
BUDGET=$(jq -r '.tokenBudget // 999999' .claude/session-plan.json 2>/dev/null || echo 999999)
PERCENT=$(echo "scale=0; $NEW_TOTAL * 100 / $BUDGET" | bc)

if [ "$PERCENT" -gt 80 ]; then
  echo "⚠️  Token budget: ${PERCENT}% used ($NEW_TOTAL / $BUDGET)"

  # Send desktop notification
  if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "display notification \"${PERCENT}% of token budget used\" with title \"Claude Code Budget Warning\""
  fi
fi
```

**Create**: Slash command to register hooks

```bash
# .claude/commands/setup-hooks
#!/bin/bash

echo "📌 Setting up Claude Code Optimizer hooks..."

HOOKS_DIR="$HOME/.claude/hooks"
mkdir -p "$HOOKS_DIR"

# Copy hook scripts
cp hooks/session-start.sh "$HOOKS_DIR/"
cp hooks/pre-tool-use.sh "$HOOKS_DIR/"
cp hooks/post-tool-use.sh "$HOOKS_DIR/"
cp hooks/notification.sh "$HOOKS_DIR/"

# Make executable
chmod +x "$HOOKS_DIR"/*.sh

echo "✅ Hooks installed to ~/.claude/hooks/"
echo ""
echo "Register hooks in Claude Code settings:"
echo "  - SessionStart: ~/.claude/hooks/session-start.sh"
echo "  - PreToolUse: ~/.claude/hooks/pre-tool-use.sh"
echo "  - PostToolUse: ~/.claude/hooks/post-tool-use.sh"
echo ""
echo "Or use: /hooks register"
```

**Checkpoint**: Hooks installed, session tracking works

---

### Hour 5: CLI Commands & Documentation

**Create**: Complete CLI with all commands

```typescript
// src/cli.ts
import { Command } from 'commander';
import { ProjectAnalyzer } from './analyzer.js';
import { ClaudeMdGenerator } from './generate-claude-md.js';
import { AgentCreator } from './create-agents.js';

const program = new Command();

program
  .name('claude-optimizer')
  .version('2.0.0')
  .description('Claude Code workflow optimizer using native features');

// analyze command
program
  .command('analyze [path]')
  .description('Analyze project and create session plan')
  .action(async (projectPath = process.cwd()) => {
    console.log('📊 Analyzing project...\n');

    const analyzer = new ProjectAnalyzer();
    const analysis = await analyzer.analyze(projectPath);

    // Save session plan
    await saveJson('.claude/session-plan.json', analysis);

    // Generate CLAUDE.md
    const generator = new ClaudeMdGenerator();
    const claudeMd = generator.generate(analysis);
    await fs.writeFile('CLAUDE.md', claudeMd);

    // Display results
    displayAnalysis(analysis);

    console.log('\n✅ Files created:');
    console.log('   📄 .claude/session-plan.json');
    console.log('   📋 CLAUDE.md');
    console.log('\n📋 Next: Run claude-optimizer create-agents');
  });

// create-agents command
program
  .command('create-agents')
  .description('Generate specialized agents from session plan')
  .action(async () => {
    const plan = await loadJson('.claude/session-plan.json');
    if (!plan) {
      console.error('❌ No session plan found. Run analyze first.');
      process.exit(1);
    }

    const creator = new AgentCreator();
    await creator.createAgents(plan);

    console.log('✅ Agents created in .claude/agents/\n');
    console.log('📋 Start a session:');
    console.log('   claude --agent .claude/agents/planning-agent.md');
  });

// setup-hooks command
program
  .command('setup-hooks')
  .description('Install automation hooks')
  .action(async () => {
    await installHooks();
    console.log('✅ Hooks installed to ~/.claude/hooks/');
  });

// status command
program
  .command('status')
  .description('Show project and session status')
  .action(async () => {
    const plan = await loadJson('.claude/session-plan.json');
    const log = await loadJson('.claude/session-log.json');

    if (!plan) {
      console.log('❌ No session plan. Run: claude-optimizer analyze');
      return;
    }

    displayStatus(plan, log);
  });

program.parse();
```

**Create**: `README.md` with full documentation

**Create**: `SESSION_1_HANDOFF.md` documenting completion

**Checkpoint**: All commands work, documentation complete

---

## ✅ Success Criteria

By end of Session 1, this workflow should work:

```bash
# 1. Analyze a project
cd ~/projects/my-app
claude-optimizer analyze

# Output:
# 📊 Analyzing project...
# ✅ Analysis complete!
# 📄 .claude/session-plan.json created
# 📋 CLAUDE.md created

# 2. Create specialized agents
claude-optimizer create-agents

# Output:
# ✅ Agents created:
#    - planning-agent.md
#    - implementation-agent.md
#    - testing-agent.md
#    - polish-agent.md

# 3. Setup hooks
claude-optimizer setup-hooks

# Output:
# ✅ Hooks installed to ~/.claude/hooks/

# 4. Start a session with specialized agent
claude --agent .claude/agents/planning-agent.md

# Session starts with:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📊 Project Analysis Loaded
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Complexity: 7/10
# Estimated: 24 hours
# Tech Stack: React, TypeScript, Next.js
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ✅ Project guidance loaded from CLAUDE.md
#
# [Planning agent is now active with context]
```

---

## 🎯 Deliverables

### Code Files
- [ ] `src/analyzer.ts` - Rule-based analysis
- [ ] `src/types.ts` - Type definitions
- [ ] `src/generate-claude-md.ts` - CLAUDE.md generator
- [ ] `src/create-agents.ts` - Agent creator
- [ ] `src/utils/file-scanner.ts` - File scanner
- [ ] `src/cli.ts` - CLI commands

### Slash Commands
- [ ] `.claude/commands/analyze-project`
- [ ] `.claude/commands/create-session-agents`
- [ ] `.claude/commands/setup-hooks`

### Hooks
- [ ] `~/.claude/hooks/session-start.sh`
- [ ] `~/.claude/hooks/pre-tool-use.sh`
- [ ] `~/.claude/hooks/post-tool-use.sh`

### Documentation
- [ ] `README.md` - Usage guide
- [ ] `SESSION_1_HANDOFF.md` - Completion report

---

## ⚠️ Critical Reminders

### ❌ DO NOT
- Install `@anthropic-ai/claude-agent-sdk`
- Use any SDK programmatic control
- Try to start Claude sessions from code
- Use AI for analysis (use heuristics!)

### ✅ DO
- Use shell scripts for automation
- Leverage slash commands
- Create specialized agent files
- Use hooks for lifecycle events
- Keep analysis rule-based

---

## 📚 Reference Implementation

If you get stuck, refer to:
- `IMPLEMENTATION_PLAN_V4_NATIVE_WORKFLOWS.md` for detailed specs
- Claude Code docs for hooks syntax
- Example projects in `examples/` directory

---

**Ready to build! 🚀**

Focus: Simple, native, powerful workflow automation using Claude Code's built-in features.
