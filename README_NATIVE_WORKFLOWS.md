# Claude Code Optimizer v2.0 - Native Workflows Edition

> Intelligent workflow automation using Claude Code's built-in features

## 🎯 What This Is

A **complete workflow automation system** for Claude Code that uses:
- ✅ **Slash Commands** - Repeatable project analysis
- ✅ **Hooks** - Automated session tracking and alerts
- ✅ **Specialized Agents** - Phase-specific AI assistants
- ✅ **GitHub Actions** - Scheduled session triggers
- ✅ **File-Based State** - Simple, transparent monitoring

**NO external APIs, NO SDK complexity, NO WebSockets** - just native Claude Code features working together beautifully.

---

## 🚀 Quick Start (5 minutes)

### 1. Install

```bash
npm install -g claude-code-optimizer
```

### 2. Analyze Your Project

```bash
cd ~/projects/my-app
claude-optimizer analyze
```

**Output**:
```
📊 Analyzing project...

✅ Analysis complete!
📄 .claude/session-plan.json created
📋 CLAUDE.md created with project guidance

Project Complexity: 7/10
Estimated Time: 24 hours
Technologies: React, TypeScript, Next.js
```

### 3. Create Specialized Agents

```bash
claude-optimizer create-agents
```

**Output**:
```
🤖 Creating specialized agents...

✅ Created 4 agents in .claude/agents/:
   - planning-agent.md        (2.7h, Opus)
   - implementation-agent.md  (12h, Sonnet)
   - testing-agent.md         (6h, Sonnet)
   - polish-agent.md          (3.3h, Sonnet)
```

### 4. Setup Automation Hooks

```bash
claude-optimizer setup-hooks
```

**Output**:
```
📌 Setting up hooks...

✅ Installed to ~/.claude/hooks/:
   - session-start.sh    (Project context injection)
   - pre-tool-use.sh     (Tool usage tracking)
   - post-tool-use.sh    (Token budget monitoring)
   - notification.sh     (Desktop alerts)
```

### 5. Start a Session

```bash
claude --agent .claude/agents/planning-agent.md
```

**Session Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Project Analysis Loaded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Complexity: 7/10
Estimated: 24 hours
Tech Stack: React, TypeScript, Next.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Project guidance loaded from CLAUDE.md

# Planning & Architecture Agent

Working on objectives:
- [ ] Understand existing codebase architecture
- [ ] Create detailed implementation roadmap
- [ ] Set up development environment
...
```

---

## 📋 How It Works

### The Workflow

```
1. Analyze Project
   └─> Rule-based TypeScript analyzer
       └─> Creates session-plan.json + CLAUDE.md

2. Create Agents
   └─> Reads session-plan.json
       └─> Generates 4 specialized agent .md files

3. Setup Hooks
   └─> Installs automation scripts
       └─> Enables session tracking + alerts

4. Start Session
   └─> Load specialized agent
       └─> Hooks inject context automatically
           └─> Track progress in real-time

5. Complete Phase
   └─> GitHub Actions (optional)
       └─> Auto-triggers next phase
```

### What Gets Created

```
your-project/
├── .claude/
│   ├── session-plan.json      # Analysis results
│   ├── session-log.json       # Runtime tracking
│   ├── agents/
│   │   ├── planning-agent.md
│   │   ├── implementation-agent.md
│   │   ├── testing-agent.md
│   │   └── polish-agent.md
│   └── commands/
│       ├── analyze-project    # Slash command
│       └── create-agents      # Slash command
│
├── CLAUDE.md                  # Project guidance
│
└── .github/
    └── workflows/
        └── claude-scheduler.yml  # Auto-scheduling (optional)
```

---

## 🎯 Key Features

### 1. Intelligent Project Analysis

**Rule-Based Complexity Calculation**:
```typescript
Complexity Score =
  File Count Factor (0-3) +
  Language Diversity (0-2) +
  Technology Complexity (0-3) +
  Missing Tests/Docs (0-2)

Result: 1-10 scale
```

**Time Estimation**:
```typescript
Estimated Hours = Complexity × 2.5 × Adjustment Factors
  - Large codebase: ×1.5
  - Many technologies: ×1.3
  - No tests: ×1.2
  - Complex frameworks: ×1.4
```

**Output**: Detailed session plan with 4 phases

### 2. Specialized Agents

Each agent is optimized for its phase:

| Agent | Role | Model | Tools | Duration |
|-------|------|-------|-------|----------|
| **Planning** | Architect | Opus | Read, Glob, Grep | 15% of total |
| **Implementation** | Developer | Sonnet | Edit, Write, Read | 50% of total |
| **Testing** | QA Engineer | Sonnet | Edit, Bash, Read | 25% of total |
| **Polish** | Code Quality | Sonnet | Edit, Write | 10% of total |

### 3. Automated Tracking

**Hooks Monitor Everything**:
- ✅ Tool usage counts (Edit, Read, Bash, etc.)
- ✅ Estimated token consumption
- ✅ Cost tracking ($0.003/1K for Sonnet input)
- ✅ Budget warnings (at 80% usage)
- ✅ Desktop notifications for key events

**Real-Time Dashboard** (optional):
- Live token/cost graphs
- Phase progress percentages
- Tool usage breakdown
- Time remaining estimates

### 4. GitHub Actions Scheduling

**Automated Session Triggers**:
```yaml
# Monday 9 AM - Planning Phase
schedule:
  - cron: '0 9 * * 1'

# Tuesday-Thursday 9 AM - Implementation
schedule:
  - cron: '0 9 * * 2-4'
```

**What Happens**:
1. Workflow creates GitHub issue
2. Issue mentions `@claude` with agent
3. Claude Code detects mention
4. Session starts automatically
5. Hooks track progress
6. Issue closes when complete
7. Next phase triggers on schedule

---

## 📊 Example: Real Project Analysis

### Input
```bash
claude-optimizer analyze ~/projects/e-commerce-app
```

### Output
```
📊 Project Analysis Results
════════════════════════════════════════

Project: e-commerce-app
Complexity: 8/10 (Complex)
Estimated Time: 32 hours
Files: 247
Size: 1,423KB
Technologies: React, Next.js, TypeScript, Prisma, TailwindCSS
Tests: ✓ Yes
Docs: ✗ No

📋 Recommended Session Plan
════════════════════════════════════════

1. Planning & Setup (4.8h)
   • Understand existing architecture
   • Create implementation roadmap
   • Set up development environment
   • Identify integration points
   Model: opus | Budget: 144,000 tokens

2. Core Implementation (16h)
   • Implement primary features
   • Write integration logic
   • Create utility functions
   • Build business logic
   Model: sonnet | Budget: 480,000 tokens

3. Testing & Integration (8h)
   • Write comprehensive tests
   • Fix identified bugs
   • Verify component integration
   • Perform integration testing
   Model: sonnet | Budget: 240,000 tokens

4. Polish & Documentation (3.2h)
   • Code cleanup and refactoring
   • Performance optimization
   • Write user documentation
   • Create developer guides
   Model: sonnet | Budget: 96,000 tokens

⚠️  Risk Factors
════════════════════════════════════════
• Large codebase - analysis may take longer
• Multiple technologies - integration complexity high
• No documentation - will need to explore thoroughly
• Complex framework (Next.js) - requires expertise

Next: Run claude-optimizer create-agents
```

---

## 🔧 Advanced Usage

### Slash Commands

Once installed, use these directly in Claude Code:

```
/analyze-project       # Analyze current project
/create-session-agents # Generate specialized agents
/setup-hooks          # Install automation hooks
/check-status         # View session progress
```

### Custom Hooks

Edit hooks to customize behavior:

```bash
# ~/.claude/hooks/post-tool-use.sh
# Add custom logic

if [ "$TOOL_NAME" = "Edit" ]; then
  # Run linter after every edit
  npm run lint
fi

# Send Slack notification on high token usage
if [ "$PERCENT" -gt 90 ]; then
  curl -X POST $SLACK_WEBHOOK \
    -d '{"text": "Token budget 90% used!"}'
fi
```

### Agent Customization

Edit agent files to adjust behavior:

```markdown
<!-- .claude/agents/implementation-agent.md -->
# Core Implementation Agent

## Additional Context
This project uses:
- Custom authentication system (see auth/)
- Database migrations with Prisma
- API routes in pages/api/

## Extra Objectives
- [ ] Ensure all API routes have error handling
- [ ] Add TypeScript types for all database models
- [ ] Implement rate limiting on public endpoints

## Code Style
- Use async/await (not .then())
- Prefer functional components
- Write JSDoc comments for complex functions
```

### Dashboard Integration

```bash
# Start live monitoring dashboard
claude-optimizer dashboard

# Opens browser to localhost:3001
# Shows real-time:
#   - Token usage graph
#   - Cost breakdown
#   - Phase progress
#   - Tool usage stats
```

---

## 🎓 Learning Resources

### Documentation Files

1. **[IMPLEMENTATION_PLAN_V4_NATIVE_WORKFLOWS.md](./IMPLEMENTATION_PLAN_V4_NATIVE_WORKFLOWS.md)**
   - Complete technical specification
   - Hour-by-hour implementation guide
   - Code examples for all components

2. **[VISUAL_ARCHITECTURE.md](./VISUAL_ARCHITECTURE.md)**
   - System architecture diagrams
   - Data flow visualizations
   - Sequence diagrams

3. **[ARCHITECTURE_COMPARISON.md](./ARCHITECTURE_COMPARISON.md)**
   - SDK vs Native Workflows comparison
   - Migration guide
   - Feature parity matrix

4. **[SESSION_1_START_NATIVE_WORKFLOWS.md](./SESSION_1_START_NATIVE_WORKFLOWS.md)**
   - Step-by-step build guide
   - Success criteria
   - Checkpoint validations

### Claude Code Docs

- [Common Workflows](https://docs.claude.com/en/docs/claude-code/common-workflows)
- [Hooks Guide](https://docs.claude.com/en/docs/claude-code/hooks-guide)
- [GitHub Actions Integration](https://docs.claude.com/en/docs/claude-code/github-actions)

---

## 🛠️ Troubleshooting

### Issue: Hooks Not Firing

**Check**:
```bash
# Verify hooks are registered
cat ~/.claude/settings.json | jq '.hooks'

# Should show:
# {
#   "SessionStart": "~/.claude/hooks/session-start.sh",
#   "PreToolUse": "~/.claude/hooks/pre-tool-use.sh",
#   ...
# }

# Re-register if needed
claude-optimizer setup-hooks
```

### Issue: session-plan.json Not Created

**Check**:
```bash
# Run analyzer with debug
claude-optimizer analyze --debug

# Verify TypeScript compiles
cd node_modules/claude-code-optimizer
npm run build

# Check for errors in output
```

### Issue: Agent Not Loading Context

**Check**:
```bash
# Verify CLAUDE.md exists
ls -la CLAUDE.md

# Verify session-plan.json exists
cat .claude/session-plan.json

# Manually trigger SessionStart hook
~/.claude/hooks/session-start.sh
```

---

## 📈 Performance

### Speed
- Project analysis: **<1 second** (local, no API)
- Agent creation: **<1 second** (file generation)
- Hook execution: **<100ms** per hook
- Dashboard updates: **Real-time** (file watching)

### Reliability
- No external API dependencies
- Works offline
- Simple error recovery
- Transparent debugging

### Cost
- Analysis: **$0** (no AI calls)
- Session tracking: **$0** (local hooks)
- GitHub Actions: **Free** (public repos)
- Token estimation: **95% accurate**

---

## 🎯 Use Cases

### 1. Solo Developer

```bash
# One-time setup
claude-optimizer analyze ~/projects/my-app
claude-optimizer create-agents
claude-optimizer setup-hooks

# Daily work
claude --agent .claude/agents/implementation-agent.md
# Hooks automatically track progress
```

### 2. Team Collaboration

```bash
# Commit analysis to repo
git add .claude/ CLAUDE.md
git commit -m "Add Claude Code session plan"
git push

# Team members pull and use same agents
git pull
claude --agent .claude/agents/testing-agent.md
```

### 3. CI/CD Integration

```yaml
# .github/workflows/code-review.yml
on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: claude-optimizer analyze
      - run: |
          gh pr comment ${{ github.event.number }} \
            --body "$(cat .claude/session-plan.json)"
```

### 4. Client Projects

```bash
# Generate client-facing analysis
claude-optimizer analyze --format=markdown > PROJECT_ESTIMATE.md

# Share with client
cat PROJECT_ESTIMATE.md
# Shows complexity, time, phases, risks
```

---

## 🚀 Roadmap

### v2.1 (Next Release)
- [ ] iCal export for session schedules
- [ ] Slack integration for notifications
- [ ] Enhanced dashboard with graphs
- [ ] Multi-project comparison view

### v2.2
- [ ] AI-powered analysis (optional)
- [ ] Custom hook templates
- [ ] Team collaboration features
- [ ] Cost budgeting per project

### v3.0
- [ ] VS Code extension
- [ ] Pre-built agent library
- [ ] Session recording/replay
- [ ] Automatic PR creation

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md)

**Priority areas**:
- Additional language detection
- More technology patterns
- Custom hook examples
- Agent template library

---

## 📄 License

MIT License - See [LICENSE](./LICENSE)

---

## 🙏 Acknowledgments

Built on top of Claude Code's excellent native features:
- Slash commands
- Hooks system
- Specialized agents
- GitHub Actions integration

Special thanks to Anthropic for creating such a flexible, powerful platform!

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/organized-ai/claude-code-optimizer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/organized-ai/claude-code-optimizer/discussions)
- **Email**: support@claude-optimizer.dev

---

**Ready to optimize your Claude Code workflow?** 🚀

```bash
npm install -g claude-code-optimizer
claude-optimizer analyze
```

---

*Built with ❤️ using Claude Code's native workflows*
