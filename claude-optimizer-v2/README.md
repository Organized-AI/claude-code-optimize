# Claude Code Optimizer v2.0

> AI-powered project analysis and session planning with Claude Agent SDK integration

## 🎯 Overview

Claude Code Optimizer automatically analyzes your codebase complexity and generates optimized session plans for Claude Code development. It uses the Claude Agent SDK to provide intelligent estimates and break down projects into manageable phases.

## ✨ Features

- 🤖 **AI-Powered Analysis**: Uses Claude Opus to deeply analyze project complexity
- 📊 **Smart Estimation**: Accurate time estimates based on codebase size, technologies, and architecture
- 📋 **Session Planning**: Breaks down projects into logical development phases
- 💾 **SQLite Storage**: Caches analysis results for instant retrieval
- 🎨 **Beautiful CLI**: Colorful, informative command-line interface
- 🔄 **Technology Detection**: Automatically identifies frameworks and libraries
- 🎯 **Quota Tracking**: Monitor token usage across 5-hour rolling windows
- 📝 **Context Monitoring**: Track session context window (0-180k tokens)
- 🧹 **Context Compaction**: Three-level compaction system to free up space
- 💾 **Session Handoffs**: Preserve context between sessions
- 🧠 **Session Memory**: Cumulative project knowledge across all sessions
- 🔮 **Token Estimation**: ML-powered prediction for session planning
- ⏰ **Session Automation**: Schedule sessions with macOS automation
- 📊 **Memory Analytics**: Deep insights from session history
- 🔍 **Memory Search**: Find decisions, objectives, and tasks
- 📈 **Trend Analysis**: Track efficiency and patterns over time
- 💡 **Smart Insights**: Actionable recommendations for improvement

## 🚀 Quick Start

### Installation

```bash
cd claude-optimizer-v2
npm install
npm run build
```

### Usage

```bash
# Project Analysis
node dist/cli.js analyze ./my-project
node dist/cli.js list
node dist/cli.js show ./my-project
node dist/cli.js delete ./my-project

# Session Management
node dist/cli.js status                    # Show quota and context status
plan-next-session                          # Plan your next session (at 80% quota)
context-status                             # View context window analysis
compact-context                            # Free up context space
save-and-restart                           # Create handoff and restart fresh

# Token Estimation
estimate-session SESSION_5_PLAN.md         # Estimate tokens for a session plan

# Memory Analytics (NEW - Session 8)
memory-stats                               # View session statistics
memory-search "keyword"                    # Search decisions, objectives, tasks
memory-analytics                           # Generate trends and predictions
memory-insights                            # Get actionable recommendations
memory-report                              # Generate beautiful HTML report
memory-export backup.json                  # Export memory for backup
memory-import backup.json                  # Import memory (merge or replace)

# Calendar Integration
node dist/cli.js calendar schedule ./project
node dist/cli.js calendar list
node dist/cli.js calendar watch
```

## 📊 Example Output

```
📊 Project Analysis Results
════════════════════════════════════════════════════════════════════════════════

Project: /Users/you/my-awesome-app
Complexity: 7/10 (Complex)
Estimated Time: 24 hours
Files: 156
Size: 842KB
Technologies: React, Next.js, TypeScript, Prisma ORM
Tests: ✓ Yes
Docs: ✓ Yes

📋 Recommended Session Plan
════════════════════════════════════════════════════════════════════════════════

1. Planning & Setup (3.6h)
   Analyze architecture, create implementation plan, configure environment
   Model: opus | Budget: 108,000 tokens
   Objectives:
   • Understand existing codebase architecture
   • Create detailed implementation roadmap
   • Set up development environment and dependencies
   • Identify key integration points

2. Core Implementation (12.0h)
   Build main features, write core logic, implement integrations
   Model: sonnet | Budget: 360,000 tokens
   ...
```

## 🏗️ Architecture

### Project Structure

```
claude-optimizer-v2/
├── src/
│   ├── cli.ts                    # Command-line interface
│   ├── project-analyzer.ts       # Main analysis engine
│   ├── database.ts               # SQLite operations
│   ├── types.ts                  # TypeScript definitions
│   └── utils/
│       └── file-scanner.ts       # File system scanner
├── tests/
│   └── file-scanner.test.ts      # Unit tests
├── data/
│   └── claude-optimizer.db       # SQLite database
└── dist/                         # Compiled JavaScript
```

### How It Works

1. **File Scanning**: Recursively scans project directory, identifies languages and technologies
2. **Claude Analysis**: Uses Claude Agent SDK with Opus model for deep complexity analysis
3. **Phase Generation**: Creates optimal session breakdown based on project characteristics
4. **Database Storage**: Caches results in SQLite for instant retrieval
5. **CLI Display**: Presents results in colorful, formatted output

## 🔧 Configuration

### Claude Agent SDK

The analyzer uses the Claude Agent SDK with these settings:

- **Model**: `claude-opus-4-20250514` for analysis
- **Permission Mode**: `bypassPermissions` for automated scanning
- **Allowed Tools**: Read, Glob, Grep, Bash (limited to safe commands)

### Database

SQLite database is stored in `./data/claude-optimizer.db` with tables:

- `projects` - Core project information
- `technologies` - Detected technologies
- `session_phases` - Generated session plans
- `phase_objectives` - Objectives for each phase
- `risk_factors` - Identified risks

## 🧠 Session Memory System (NEW - Session 7)

The session memory system preserves cumulative project knowledge across all sessions, creating true long-term continuity.

### Features

- **Automatic Tech Stack Detection**: Identifies languages, frameworks, and tools from project files
- **Cumulative Decision Tracking**: Preserves all key decisions across sessions
- **Context Injection**: Every new session starts with full historical context
- **Session History**: Complete record of objectives, outcomes, and token usage

### Storage

Project memory is stored in `~/.claude/project-memory/{project-hash}.json` with:

```json
{
  "projectPath": "/path/to/project",
  "projectName": "my-project",
  "totalSessions": 5,
  "sessions": [ /* Array of session histories */ ],
  "cumulativeContext": {
    "techStack": ["TypeScript", "React", "Node.js"],
    "architecture": "Web Application",
    "testingFramework": "Vitest",
    "buildSystem": "Vite",
    "keyDecisions": [ /* All important decisions */ ]
  }
}
```

### Integration

Memory integrates automatically with:
- **Handoff Manager**: Injects memory into handoff files
- **Session Planning**: Uses history for better estimates
- **Context Tracking**: Preserves long-term knowledge

No manual intervention required - memory works transparently in the background.

## 📚 API Reference

### ProjectAnalyzer

```typescript
const analyzer = new ProjectAnalyzer();
const analysis = await analyzer.analyzeProject('./my-project');
```

Returns `ProjectAnalysis` with:
- `complexity`: 1-10 scale
- `estimatedHours`: Total development time
- `phases`: Array of `SessionPhase` objects
- `technologies`: Detected frameworks/libraries
- `riskFactors`: Potential challenges

### OptimizerDatabase

```typescript
const db = new OptimizerDatabase();

// Save analysis
db.saveProjectAnalysis(analysis);

// Retrieve analysis
const cached = db.getProject('./my-project');

// List all projects
const projects = db.listProjects();
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Build and test
npm run build && node dist/cli.js analyze ./test-project
```

## 📋 Implementation Status

### ✅ Session 1-5 Completed

**Session 1: Core Analysis**
- [x] TypeScript project setup
- [x] File scanner utility
- [x] Claude Agent SDK integration
- [x] SQLite database schema
- [x] CLI command interface

**Session 2-3: Calendar Integration**
- [x] Google Calendar OAuth flow
- [x] Event creation from analysis
- [x] Calendar watcher service
- [x] Session automation

**Session 4: Quota & Handoffs**
- [x] Quota tracking (5-hour windows)
- [x] Session handoff system
- [x] /plan-next-session command
- [x] Automation dashboard

**Session 5: Context Window Monitoring** (NEW!)
- [x] Context tracker module
- [x] Three-level compaction system
- [x] /context-status command
- [x] /compact-context command
- [x] /save-and-restart command
- [x] Dual quota + context monitoring

### 🎯 Session Commands

**Monitoring**
- `claude-optimizer status` - Show quota and context status
- `context-status` - Detailed context window analysis
- `plan-next-session` - Plan next session at 80% quota

**Context Management**
- `compact-context` - Free up context space (soft/strategic/emergency)
- `save-and-restart` - Create handoff and restart with fresh context

**Calendar Integration**
- `claude-optimizer calendar schedule ./project` - Create session schedule
- `claude-optimizer calendar list` - View upcoming sessions
- `claude-optimizer calendar watch` - Auto-start scheduled sessions

## 🚀 Next Steps (Session 6)

- [ ] Token estimation for task planning (Session 6A)
- [ ] /task-estimate command
- [ ] Enhanced automation (Session 6B)
- [ ] Notification system improvements

## 📄 License

MIT License - See LICENSE file for details

---

*Session 1 completed by Foundation Builder Agent*
