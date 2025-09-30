# Session 1: Foundation Builder - Start Prompt

## 🚀 Copy and Paste This Exact Prompt

Use this prompt to start your new Claude Code session. It sets up the agent with all the context it needs.

---

## THE PROMPT:

```
You are the Foundation Builder Agent for the Claude Code Optimizer v2.0 project.

Your mission is to implement Session 1: Foundation & Project Analyzer (5 hours, 80-100 prompts).

CONTEXT DOCUMENTS (Read these first):

1. Agent Specification:
/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/.claude/agents/foundation-builder-agent.md

2. Implementation Plan:
/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/IMPLEMENTATION_PLAN_V2.md

3. Technical Reference:
/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/CLAUDE_SDK_CALENDAR_IMPLEMENTATION.md

INSTRUCTIONS:

1. Read the Foundation Builder Agent specification completely
2. Create the project directory: claude-optimizer-v2
3. Follow the hour-by-hour implementation plan
4. Build deliverables in this order:
   - Hour 1: TypeScript project setup
   - Hour 2: File scanner utility
   - Hour 3: Claude Agent SDK integration
   - Hour 4: SQLite database schema
   - Hour 5: CLI command & polish

5. Success criteria: By end of session, `claude-optimizer analyze ./test-project` should work end-to-end

6. Create SESSION_1_HANDOFF.md when complete

Begin by reading the agent specification and confirming you understand the mission.
```

---

## 📍 Where to Run This

### **Option 1: New Directory (Recommended)**

```bash
# Create fresh working directory
cd ~/Desktop  # or wherever you want the project
mkdir claude-optimizer-workspace
cd claude-optimizer-workspace

# Start Claude Code
claude
# Then paste the prompt above
```

### **Option 2: Current Directory**

```bash
# If you want to work in the current location
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"

# Start Claude Code
claude
# Then paste the prompt above
```

---

## 🎯 What Will Happen

1. **Agent reads specs** (~2-3 prompts)
   - Loads Foundation Builder Agent specification
   - Reviews implementation plan
   - Confirms understanding

2. **Project setup** (~15 prompts)
   - Creates `claude-optimizer-v2/` directory
   - Installs dependencies
   - Configures TypeScript

3. **File scanner** (~20 prompts)
   - Builds recursive file scanner
   - Adds metadata detection
   - Tests with sample projects

4. **Claude SDK integration** (~30 prompts)
   - Integrates @anthropic-ai/claude-agent-sdk
   - Creates analysis prompt
   - Tests AI-powered analysis

5. **Database** (~20 prompts)
   - Creates SQLite schema
   - Implements save/load methods
   - Tests persistence

6. **CLI & polish** (~15 prompts)
   - Builds CLI command
   - Adds colored output
   - Creates tests
   - Writes documentation

7. **Handoff document** (~5 prompts)
   - Creates SESSION_1_HANDOFF.md
   - Documents what was built
   - Lists next steps

---

## ✅ Expected Final Structure

```
claude-optimizer-v2/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── cli.ts                     ✅ CLI entry point
│   ├── project-analyzer.ts        ✅ Core analyzer
│   ├── database.ts                ✅ SQLite integration
│   ├── types.ts                   ✅ TypeScript types
│   └── utils/
│       ├── file-scanner.ts        ✅ File system scanner
│       └── complexity-calc.ts     ✅ Helpers
├── tests/
│   └── project-analyzer.test.ts   ✅ Tests
├── data/
│   └── claude-optimizer.db        ✅ Database
├── dist/                          ✅ Compiled output
└── SESSION_1_HANDOFF.md           ✅ Handoff doc
```

---

## 🧪 How to Verify Success

After the session completes, you should be able to:

```bash
# Build the project
cd claude-optimizer-v2
npm run build

# Test the CLI
npm run cli analyze ./test-project

# Expected output:
📊 Project Analysis Results
──────────────────────────────────────────────────

Project: ./test-project
Complexity: 5/10 (Moderate)
Estimated Time: 8 hours
Files: 42
Technologies: TypeScript, React
Tests: ✓
Docs: ✓

📋 Recommended Session Plan
──────────────────────────────────────────────────

1. Planning & Setup (1.2h)
   Model: opus | Tokens: 36,000
   ...
```

---

## 💡 Pro Tips

### **During the Session**

1. **Let the agent work autonomously** - It has detailed instructions
2. **Check progress hourly** - Verify against the checkpoints
3. **Watch for blockers** - Agent will document if stuck
4. **Review output quality** - Make sure CLI output looks good

### **If Something Goes Wrong**

The agent has emergency protocols:
- Falls back to simpler approaches if Claude SDK fails
- Prioritizes core features if time runs short
- Documents blockers in handoff

### **When Session Completes**

1. Review SESSION_1_HANDOFF.md
2. Test the CLI command
3. Verify database has data
4. Prepare for Session 2 (Calendar Integration)

---

## 🎬 Ready to Start?

**Copy the prompt from the top of this document and paste it into a new Claude Code session.**

The Foundation Builder Agent will take it from there! 🚀

---

## 📞 Quick Reference

**Agent Spec Location:**
```
/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/.claude/agents/foundation-builder-agent.md
```

**Expected Duration:** 5 hours / 80-100 prompts

**Success Metric:** `claude-optimizer analyze ./test-project` works perfectly

**Next Session:** Calendar Integration (after reviewing handoff)
