# Session 1: Foundation Builder - Start Prompt (GitHub Version)

## 🚀 Updated Prompt for Existing Repository

Since you have an existing GitHub repo, here's the updated prompt that works with it:

---

## THE PROMPT (Copy This):

```
You are the Foundation Builder Agent for the Claude Code Optimizer v2.0 project.

Your mission is to implement Session 1: Foundation & Project Analyzer (5 hours, 80-100 prompts).

REPOSITORY: https://github.com/Organized-AI/claude-code-optimize

CONTEXT DOCUMENTS (Read these first):

1. Agent Specification:
.claude/agents/foundation-builder-agent.md

2. Implementation Plan:
IMPLEMENTATION_PLAN_V2.md

3. Technical Reference:
CLAUDE_SDK_CALENDAR_IMPLEMENTATION.md

PROJECT STRUCTURE:
We will create the new simplified tool as a separate package within this repository:

claude-code-optimize/
├── .claude/
│   └── agents/
│       └── foundation-builder-agent.md     (existing)
├── IMPLEMENTATION_PLAN_V2.md                (existing)
├── CLAUDE_SDK_CALENDAR_IMPLEMENTATION.md    (existing)
├── moonlock-dashboard/                      (existing - keep)
├── claude-optimizer/                        (NEW - create this)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── cli.ts
│   │   ├── project-analyzer.ts
│   │   ├── database.ts
│   │   └── utils/
│   └── tests/
└── [existing files]

INSTRUCTIONS:

1. Read the Foundation Builder Agent specification from .claude/agents/foundation-builder-agent.md
2. Create new directory: ./claude-optimizer/ (sibling to moonlock-dashboard)
3. Follow the hour-by-hour implementation plan in IMPLEMENTATION_PLAN_V2.md
4. Build deliverables in this order:
   - Hour 1: TypeScript project setup in ./claude-optimizer/
   - Hour 2: File scanner utility
   - Hour 3: Claude Agent SDK integration
   - Hour 4: SQLite database schema
   - Hour 5: CLI command & polish

5. Success criteria: By end of session, `npm run cli analyze ../moonlock-dashboard` should work

6. Create SESSION_1_HANDOFF.md in ./claude-optimizer/ when complete

IMPORTANT:
- Keep all existing files (moonlock-dashboard, docs, etc.)
- Create claude-optimizer as a new, separate package
- Do NOT modify existing code
- Use relative paths to existing documentation

Begin by reading the agent specification and confirming you understand the mission.
```

---

## 📍 How to Start

### **Step 1: Navigate to Your Repo**

```bash
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"

# Verify you're in the right place
ls -la
# Should see: moonlock-dashboard/, IMPLEMENTATION_PLAN_V2.md, etc.
```

### **Step 2: Start Claude Code Session**

```bash
claude
```

### **Step 3: Paste the Updated Prompt**

Copy the prompt above (in the gray box) and paste it into Claude Code.

---

## 🎯 What Will Happen

The agent will create a new directory structure:

```
claude-code-optimize/                    (your existing repo)
├── .claude/                            ✅ existing
├── moonlock-dashboard/                 ✅ existing - untouched
├── IMPLEMENTATION_PLAN_V2.md           ✅ existing
├── CLAUDE_SDK_CALENDAR_IMPLEMENTATION.md ✅ existing
├── claude-optimizer/                   🆕 NEW - agent creates this
│   ├── package.json                    🆕
│   ├── tsconfig.json                   🆕
│   ├── README.md                       🆕
│   ├── src/
│   │   ├── cli.ts                      🆕 CLI entry point
│   │   ├── project-analyzer.ts         🆕 Core analyzer
│   │   ├── database.ts                 🆕 SQLite integration
│   │   ├── types.ts                    🆕 TypeScript types
│   │   └── utils/
│   │       ├── file-scanner.ts         🆕 File scanner
│   │       └── complexity-calc.ts      🆕 Helpers
│   ├── tests/
│   │   └── project-analyzer.test.ts    🆕
│   ├── data/
│   │   └── claude-optimizer.db         🆕 Database
│   ├── dist/                           🆕 Compiled output
│   └── SESSION_1_HANDOFF.md            🆕 Handoff doc
└── [all other existing files remain unchanged]
```

---

## ✅ Testing the Result

After the session completes:

```bash
# Navigate to new package
cd claude-optimizer

# Install dependencies
npm install

# Build
npm run build

# Test by analyzing the moonlock-dashboard!
npm run cli analyze ../moonlock-dashboard

# Expected output:
📊 Project Analysis Results
──────────────────────────────────────────────────

Project: ../moonlock-dashboard
Complexity: 8/10 (Complex)
Estimated Time: 15 hours
Files: 156
Technologies: React, TypeScript, Vite, WebSocket
Tests: ✓
Docs: ✓

📋 Recommended Session Plan
──────────────────────────────────────────────────

1. Planning & Setup (2.25h)
   Analyze architecture, create plan...
   Model: opus | Tokens: 67,500
   ...
```

---

## 🔄 Git Workflow

The agent will work within your existing repo. After Session 1:

```bash
# Review what was created
git status

# Should see new files in claude-optimizer/

# Create a branch
git checkout -b feature/simplified-optimizer-v2

# Commit Session 1
git add claude-optimizer/
git commit -m "Session 1: Foundation & Project Analyzer

- TypeScript project setup
- Claude Agent SDK integration
- AI-powered project analysis
- SQLite database
- CLI command: analyze

Deliverables:
- File scanner utility
- Project complexity analyzer
- Session phase generator
- Database schema
- CLI with colored output

Ready for Session 2: Calendar Integration"

# Push to GitHub
git push origin feature/simplified-optimizer-v2
```

---

## 📊 Benefits of This Approach

### **Advantages**:

1. ✅ **Keep existing work** - moonlock-dashboard stays intact
2. ✅ **Side-by-side comparison** - Both versions in same repo
3. ✅ **Reuse dashboard** - Can integrate later
4. ✅ **Git history** - Track v2 development separately
5. ✅ **Easy testing** - Can analyze the dashboard itself!

### **Project Structure Benefits**:

```
Repository Root
├── moonlock-dashboard/        (Current complex version)
│   └── [React dashboard, WebSocket, etc.]
│
├── claude-optimizer/          (New simplified version)
│   └── [CLI tool, focused features]
│
└── Shared Documentation
    ├── IMPLEMENTATION_PLAN_V2.md
    ├── CLAUDE_SDK_CALENDAR_IMPLEMENTATION.md
    └── .claude/agents/
```

---

## 🎯 Success Criteria

By end of Session 1, you should be able to:

```bash
cd claude-optimizer
npm run cli analyze ../moonlock-dashboard
```

And see a beautiful analysis of your existing dashboard project! 🎉

---

## 💡 Pro Tips

### **During Development**

1. **Test on moonlock-dashboard** - Perfect test case (complex React app)
2. **Compare approaches** - See simplified vs. current side-by-side
3. **Reuse learnings** - Apply insights from v1 to v2

### **After Session 1**

1. **Analyze different projects**:
   ```bash
   npm run cli analyze ../moonlock-dashboard
   npm run cli analyze ~/other-project
   npm run cli analyze .  # Analyze itself!
   ```

2. **Review database**:
   ```bash
   sqlite3 data/claude-optimizer.db
   SELECT * FROM projects;
   ```

3. **Read handoff doc**:
   ```bash
   cat SESSION_1_HANDOFF.md
   ```

---

## 🚀 Ready to Start?

**Steps**:

1. ✅ Navigate to repo directory
2. ✅ Start `claude` session
3. ✅ Paste the updated prompt above
4. ✅ Let the Foundation Builder Agent work
5. ✅ Review results in `claude-optimizer/`

---

## 📞 Quick Commands Reference

```bash
# Navigate to repo
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"

# Start Claude
claude

# After session completes:
cd claude-optimizer
npm install
npm run build
npm run cli analyze ../moonlock-dashboard

# Review
cat SESSION_1_HANDOFF.md

# Commit
git checkout -b feature/simplified-optimizer-v2
git add claude-optimizer/
git commit -m "Session 1: Foundation & Project Analyzer"
git push origin feature/simplified-optimizer-v2
```

---

**The agent will create `claude-optimizer/` as a clean, focused package within your existing repo! 🎯**
