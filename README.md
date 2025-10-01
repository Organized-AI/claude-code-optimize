# Claude Code Optimizer v2.0

**Intelligent session management for strategic Claude Code development**

## 🎯 Mission

Help developers maximize productivity with Claude Code through **quota-aware monitoring**, **automated session orchestration**, and **token estimation with machine learning**.

**Core Philosophy**: *"Strategic planning over speed. With 5-hour sessions and 200k token quotas, make every token count."*

> 📖 **For AI Agents**: See [AGENTS.md](AGENTS.md) for development guidelines and project structure

## 🏗️ Project Structure

```
claude-optimizer-v2/          # All active development
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

## ✨ Key Features

### 1. Hyperaware Quota Tracking

**6 notification thresholds** for maximum visibility (10%, 25%, 50%, 75%, 80%, 90%, 95%):

```
🎯 FRESH (0-10%):      Plan strategically
🟢 EXCELLENT (10-25%): Any task OK
✅ GOOD (25-50%):      Large tasks (60-80k tokens)
💡 MODERATE (50-80%):  Medium tasks (30-60k tokens)
⚠️ DANGER (80-90%):    START PLANNING next session
🔴 CRITICAL (90-95%):  Wrap up current task
🚨 EMERGENCY (95%+):   Save immediately
```

**Real-time metrics**:
- Burn rate tracking (tokens/min)
- Estimated runway (time + tool calls remaining)
- Next alert predictions

### 2. Token Estimation with Machine Learning

Learns from each session to improve accuracy:

```
Session 1: ~72% accuracy (establishing baseline)
Session 3: ~94% accuracy (learning patterns)
Session 5: Target 95%+ (expert predictions)
```

**Features**:
- Task-based estimates (planning, implementation, testing, etc.)
- Complexity multipliers (project size, tech stack familiarity)
- Real-time variance tracking
- Post-session analysis reports
- Automatic model updates

### 3. Automated Session Orchestration

**80% Strategic Planning Trigger**: When quota hits 80%, system prompts you to plan the next session instead of blocking at 90%.

**Session Handoff System**:
- Markdown files preserve perfect context
- What was accomplished
- Current state (branch, tests, commits)
- Next session objectives with token estimates
- Key decisions and context

**Auto-Launch**:
- Schedule sessions to start automatically at quota reset
- launchd/cron integration for macOS
- Desktop notifications (5 mins before)
- Zero setup time - full context loaded

### 4. Session Memory

**Perfect context preservation**:
- Project tech stack and architecture
- All previous session accomplishments
- Design decisions and their rationale
- Cumulative knowledge across sessions

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Organized-AI/claude-code-optimize.git
cd claude-code-optimize/claude-optimizer-v2

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### First Session

```bash
# Check your quota status
/session-status

# Start an interactive session
/start-next-session
```

### Basic Workflow

```
1. Check status before starting → /session-status
2. Work on your project with Claude Code
3. At 80% quota → /plan-next-session
4. Schedule automation for quota reset
5. Take a break, let automation handle restart
6. Come back, session auto-starts with full context
```

## 📊 Example Session

**2:00 PM - Start Session**
```
Status: 🎯 FRESH (0%, 200k tokens)
Action: Begin planning phase
```

**3:30 PM - Quarter Progress**
```
Alert:  📈 25% Used
Status: ✅ GOOD (150k remaining)
Action: Continue implementation
```

**5:30 PM - Strategic Planning**
```
Alert:  ⚠️ 80% Used - STRATEGIC PLANNING TIME
Status: 40k tokens remaining (~27 mins at current pace)
Action: /plan-next-session

System:
  → Creates handoff markdown
  → Schedules 6:05 PM auto-start
  → Creates calendar event with reminders
```

**5:35 PM - Safe Stop**
```
Status: Work saved, automation ready
Action: Close session, take a break
```

**6:00 PM - Reminder**
```
Notification: "🤖 Session starts in 5 minutes!"
```

**6:05 PM - Auto-Launch**
```
Terminal opens automatically
Claude starts with full context
Zero setup time!
```

## 📚 Documentation

**For Users**:
- [Getting Started Guide](claude-optimizer-v2/docs/guides/GETTING_STARTED_GUIDE.md) - Beginner-friendly onboarding
- [Hyperaware Mode](claude-optimizer-v2/docs/guides/HYPERAWARE_MODE.md) - Understanding quota thresholds
- [Quota System](claude-optimizer-v2/docs/guides/QUOTA_AWARE_SYSTEM.md) - Technical reference

**For Developers**:
- [AGENTS.md](AGENTS.md) - Development guidelines and patterns
- [Automation Plan](claude-optimizer-v2/docs/planning/AUTOMATED_SESSION_ORCHESTRATION_PLAN.md) - Complete system architecture
- [Visual Architecture](claude-optimizer-v2/docs/architecture/VISUAL_ARCHITECTURE.md) - System diagrams

**Full Documentation Index**: [claude-optimizer-v2/docs/README.md](claude-optimizer-v2/docs/README.md)

## 🛠️ Development

### Tech Stack
- **TypeScript** - Type-safe session management
- **Node.js** 18+ - Runtime environment
- **macOS** - Native integration (launchd, osascript)
- **SQLite** - Local session history
- **JSON** - File-based state management

### Key Commands

```bash
# Development
cd claude-optimizer-v2
npm run build              # Compile TypeScript
npm test                   # Run tests
npm run build:watch        # Watch mode

# Slash commands (in Claude Code)
/session-status            # Check quota & session
/start-next-session        # Interactive starter
/create-calendar-events    # Export to calendar
```

### Testing

```bash
# All tests
npm test

# Specific module
npm test quota-tracker

# Watch mode
npm test -- --watch
```

## 🎯 Roadmap

### ✅ Completed
- Hyperaware quota tracking (6 thresholds)
- Token estimation baseline
- Session monitoring via JSONL
- Slash commands implementation
- Complete documentation

### 🔄 In Progress
- Automated session orchestration
- Session handoff system
- Calendar integration with auto-launch
- Machine learning model refinement

### 📋 Planned
- 95%+ token estimation accuracy
- Multi-project support
- Team collaboration features
- Cross-platform support (Windows, Linux)

## 🤝 Contributing

We welcome contributions! See [AGENTS.md](AGENTS.md) for:
- Development setup
- Code style guidelines
- Testing requirements
- Commit message format

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** - For Claude Code's exceptional development capabilities
- **Claude Community** - For feedback and real-world testing
- **Early Adopters** - For validating the quota-aware approach

---

**Built to help developers work strategically within Claude Code's natural limits** 🚀

*Remember: With 5-hour sessions and token quotas, precision beats speed. This tool ensures you maximize every token and never hit a wall.*
