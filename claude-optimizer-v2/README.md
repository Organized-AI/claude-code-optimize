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

## 🚀 Quick Start

### Installation

```bash
cd claude-optimizer-v2
npm install
npm run build
```

### Usage

```bash
# Analyze a project
node dist/cli.js analyze ./my-project

# List all analyzed projects
node dist/cli.js list

# Show detailed analysis
node dist/cli.js show ./my-project

# Delete project analysis
node dist/cli.js delete ./my-project
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

## 📋 Session 1 Status

### ✅ Completed

- [x] TypeScript project setup
- [x] File scanner utility
- [x] Claude Agent SDK integration
- [x] SQLite database schema
- [x] CLI command interface
- [x] Project analysis works end-to-end
- [x] Technology detection
- [x] Risk assessment
- [x] Caching system

### 🎯 Success Criteria Met

✅ `claude-optimizer analyze ./test-project` works end-to-end
✅ Complexity analysis accurate
✅ Session phases logically generated
✅ Database stores and retrieves correctly
✅ CLI output is clear and helpful

## 🚀 Next Steps (Session 2)

- [ ] Google Calendar integration
- [ ] OAuth 2.0 authentication flow
- [ ] Calendar event creation from analysis
- [ ] Session scheduling automation
- [ ] Calendar watcher service

## 📄 License

MIT License - See LICENSE file for details

---

*Session 1 completed by Foundation Builder Agent*
