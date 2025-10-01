# Session 1 Start Prompt - CORRECTED

## 🎯 Initialization

You are beginning **Session 1** of the Claude Code Optimizer v2.0 project.

**⚠️ CRITICAL**: This project does NOT use Claude Agent SDK. We use shell automation instead.

## 📋 Your Mission

Build the foundation for a simplified Claude Code optimizer with:
1. Rule-based project analysis (NO AI - just heuristics)
2. File system scanning
3. Complexity calculation via rules
4. SQLite database for storage
5. CLI interface

## 📖 Reference Documents

**Primary Implementation Guide**:
```
/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/IMPLEMENTATION_PLAN_V3_CORRECTED.md
```

**Architecture Clarification**:
```
/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/ARCHITECTURE_CLARIFICATION.md
```

## 🏗️ Project Location

**Repository**: https://github.com/Organized-AI/claude-code-optimize

**Working Directory**:
```
/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/
```

**Create New Directory**:
```
claude-optimizer/
```

This will be a sibling to the existing `moonlock-dashboard/` directory.

## ✅ Session 1 Objectives

### Hour 1: Project Setup
- [ ] Create `claude-optimizer/` directory
- [ ] Initialize TypeScript project
- [ ] Install dependencies (NO Claude Agent SDK!)
- [ ] Configure TypeScript (ES2022, strict mode)
- [ ] Create basic directory structure

### Hour 2: File Scanner
- [ ] Implement `src/utils/file-scanner.ts`
- [ ] Recursive file system traversal
- [ ] Language detection from extensions
- [ ] Technology detection from package.json
- [ ] Test/docs detection

### Hour 3: Project Analyzer (Rule-Based)
- [ ] Implement `src/project-analyzer.ts`
- [ ] Heuristic complexity calculation
- [ ] Time estimation formulas
- [ ] Session phase generation
- [ ] Risk assessment

### Hour 4: Database Schema
- [ ] Implement `src/database.ts`
- [ ] SQLite schema creation
- [ ] CRUD operations
- [ ] Transaction handling
- [ ] Data retrieval methods

### Hour 5: CLI & Testing
- [ ] Implement `src/cli.ts`
- [ ] `analyze` command with ora spinner
- [ ] Colorful output with chalk
- [ ] Basic tests
- [ ] Documentation

## 🎯 Success Criteria

By end of session, this should work:

```bash
cd claude-optimizer
npm run build
npm run cli -- analyze ../moonlock-dashboard
```

**Expected Output**:
```
📊 Project Analysis Results
──────────────────────────────────────────────────

Project: /path/to/moonlock-dashboard
Complexity: 6/10 (Moderate)
Estimated Time: 12 hours
Files: 45
Size: 234KB
Technologies: React, TypeScript, Node.js
Tests: ✓
Docs: ✓

📋 Recommended Session Plan
──────────────────────────────────────────────────

1. Planning & Setup (1.8h)
   Analyze architecture, create implementation plan, configure environment
   Model: opus | Tokens: 54,000
   Objectives:
   • Understand existing codebase architecture
   • Create detailed implementation roadmap
   • Set up development environment and dependencies
   • Identify key integration points

2. Core Implementation (6h)
   Build main features, write core logic, implement integrations
   Model: sonnet | Tokens: 180,000
   Objectives:
   • Implement primary features
   • Write integration logic
   • Create utility functions and helpers
   • Build core business logic

3. Testing & Integration (3h)
   Write tests, fix bugs, ensure components work together
   Model: sonnet | Tokens: 90,000
   Objectives:
   • Write comprehensive test coverage
   • Fix identified bugs and issues
   • Verify all components integrate properly
   • Perform integration testing

4. Polish & Documentation (1.2h)
   Refactor code, optimize performance, write documentation
   Model: sonnet | Tokens: 36,000
   Objectives:
   • Code cleanup and refactoring
   • Performance optimization
   • Write user documentation
   • Create developer guides

Next: Run claude-optimizer schedule <project-path> to create calendar events
```

## ⚠️ Critical Reminders

### ❌ DO NOT:
- Install `@anthropic-ai/claude-agent-sdk`
- Use `query()` or any SDK functions
- Attempt to programmatically control Claude Code
- Use AI for project analysis

### ✅ DO:
- Use heuristic calculations for complexity
- Scan files using Node.js `fs` module
- Calculate estimates using formulas
- Store results in SQLite
- Create clean TypeScript interfaces

## 📦 Dependencies to Install

```json
{
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "commander": "^11.0.0",
    "inquirer": "^9.0.0",
    "ora": "^7.0.0",
    "chalk": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/better-sqlite3": "^7.0.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

## 🚀 Getting Started

1. Read `IMPLEMENTATION_PLAN_V3_CORRECTED.md` thoroughly
2. Create project structure
3. Install dependencies
4. Implement components in order:
   - File scanner first
   - Then project analyzer
   - Then database
   - Finally CLI
5. Test with `moonlock-dashboard/` as test project
6. Document any issues or blockers

## 🎯 End-of-Session Deliverable

Create `SESSION_1_HANDOFF.md` with:
- ✅ What was completed
- 🎬 Demo of working CLI
- ⚠️ Any known issues
- 📋 Next session priorities
- 🔗 Dependencies for Session 2

---

**Begin Session 1 Implementation!** 🚀

Focus on rule-based heuristics, NOT AI. Keep it simple, fast, and accurate.
