# Claude Code Optimizer - Commands Reference

Complete guide to all custom commands, tools, and workflows available in this project.

---

## 🎯 Session Monitoring Commands

### `ctx` - Quick Session Time Check ✨ **NEW**

**What it does:** Shows how much time remains in your 5-hour Claude session window.

**When to use:**
- Start of each session to see your time budget
- Periodically during long coding sessions
- Before planning a complex task
- When deciding whether to wrap up or continue

**Example:**
```bash
$ ctx

⏱️  5-Hour Session: 4h 7m remaining (18% used)
   █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

💡 Run /context for token usage details
```

**Use case scenarios:**
- **Starting work:** `ctx` shows you have 4h 45m → Plan a 3-hour implementation
- **Mid-session:** `ctx` shows 1h 30m left → Time to wrap up and create handoff
- **Before big task:** `ctx` shows 30m left → Better to save-and-restart first

---

### `/context` - Token Usage Display (Built-in)

**What it does:** Shows Claude's built-in context window usage (200k token limit).

**When to use:**
- Check how much context space you've used
- Before reading large files
- When conversation feels slow
- Deciding between continuing or compacting

**Example output:**
```
⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛁ ⛀ ⛀ ⛀
⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   Context Usage
⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶   claude-sonnet-4-5 • 45k/200k tokens (22%)
```

**Use case scenarios:**
- **Low usage (< 25%):** Continue working normally
- **Moderate (25-50%):** Monitor, avoid reading huge files
- **High (50-80%):** Consider compacting context
- **Critical (> 80%):** Run `compact-context.js` or `save-and-restart.js`

---

### `session` - Alternative Session Time Command

**What it does:** Same as `ctx`, just a longer alias.

**When to use:** If you prefer typing `session` instead of `ctx`.

---

## 📊 Context Management Commands

### `context-status.js` - Detailed Context Analysis

**What it does:** Comprehensive analysis of context usage with breakdowns and recommendations.

**When to use:**
- Deep dive into where tokens are being used
- Planning context optimization strategy
- Before deciding to compact or restart
- Troubleshooting high context usage

**Example:**
```bash
$ node dist/commands/context-status.js

📝 Context Window Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 USAGE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Context:    45,000 / 180,000 tokens
Percentage:       25.0% used
Session Time:     3h 15m remaining of 5h session
Session Progress: ████████████████░░░░░░░░░░░░░░░░░░░░ 35.0%

📁 CONTEXT BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
System Prompt:         5,000 tokens  ( 11%)
File Reads:           15,000 tokens  ( 33%)
Tool Results:         10,000 tokens  ( 22%)
Conversation:         10,000 tokens  ( 22%)
Code Generated:        5,000 tokens  ( 11%)
```

**Use case scenarios:**
- **File reads dominating:** You've read too many large files - be selective
- **Tool results high:** Long outputs - consider piping to files
- **Conversation high:** Lots of back-and-forth - might need restart
- **Code generated high:** You're generating lots of code - consider compaction

---

### `compact-context.js` - Context Compaction

**What it does:** Reduces context size by removing old file reads and duplicate tool results.

**When to use:**
- Context usage > 50%
- Before reading large files when context is moderate
- To extend current session without restarting
- When you want to continue but context is building up

**Example:**
```bash
$ node dist/commands/compact-context.js

🧹 Context Compaction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing context...
  • Removing 15 old file reads         ~12,000 tokens
  • Deduplicating tool results         ~3,000 tokens
  • Trimming verbose outputs           ~2,000 tokens

Total savings: ~17,000 tokens (38% reduction)

✓ Context compacted successfully!
  Before: 45,000 tokens (25%)
  After:  28,000 tokens (15%)
```

**Use case scenarios:**
- **Mid-session cleanup:** Free up space to continue working
- **Before complex task:** Clear space for upcoming work
- **Avoiding restart:** Extend session when time permits but context is high

---

### `save-and-restart.js` - Session Handoff

**What it does:** Creates a handoff document with current progress and restarts fresh session.

**When to use:**
- Context > 80% or session time < 1 hour
- Completing a major milestone
- Switching between different tasks
- End of work session
- Before tackling a completely new feature

**Example:**
```bash
$ node dist/commands/save-and-restart.js

📋 Creating Session Handoff
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Session:
  • Duration: 4h 15m
  • Context Used: 145,000 / 180,000 tokens (81%)
  • Files Modified: 12
  • Commits: 3

Creating handoff document...
  ✓ Analyzing completed work
  ✓ Documenting current state
  ✓ Listing next steps
  ✓ Saved to: SESSION_7_HANDOFF.md

Ready to start fresh session with:
  • Full 5-hour window
  • 200k context available
  • Clear continuation plan
```

**Use case scenarios:**
- **Natural breakpoint:** Just finished feature implementation
- **Context critical:** 80%+ used, need fresh space
- **Time running out:** < 1 hour left in 5-hour window
- **Task switch:** Moving from bug fixes to new feature

---

## 📅 Session Planning Commands

### `estimate-session.js` - Token Prediction

**What it does:** Uses ML to predict token usage for upcoming tasks based on historical data.

**When to use:**
- Planning next session's scope
- Deciding which tasks fit in remaining time
- Estimating whether a feature needs multiple sessions
- Before scheduling work

**Example:**
```bash
$ node dist/commands/estimate-session.js

🔮 Session Token Estimation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: Implement user authentication
Type: Implementation

Historical Analysis:
  • Similar tasks: 5 previous sessions
  • Average tokens: 45,000
  • Variance: ±8,000 tokens

Estimate for this task:
  • Baseline: 45,000 tokens
  • Complexity adjustment: +5,000
  • Total estimate: 50,000 tokens (~2.5 hours)

Recommendation: Fits in current session (145k tokens remaining)
```

**Use case scenarios:**
- **Planning work:** Estimate if task fits in remaining quota
- **Scheduling:** Decide optimal time to start
- **Realistic goals:** Avoid over-committing to tasks
- **Resource allocation:** Choose appropriate model (Sonnet vs Opus)

---

### `plan-next-session.js` - Automated Scheduling

**What it does:** Analyzes handoff, estimates tokens, schedules next session automatically.

**When to use:**
- After creating a handoff document
- Planning tomorrow's work
- Setting up automated session flow
- Before end of day to queue next session

**Example:**
```bash
$ node dist/commands/plan-next-session.js

📅 Planning Next Session
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reading: SESSION_7_HANDOFF.md

Remaining Work:
  1. Fix parser deduplication bug      ~3,000 tokens
  2. Test automation integration       ~5,000 tokens
  3. Document Session 6                ~8,000 tokens

Total estimate: 16,000 tokens (~45 minutes)

Scheduling:
  ✓ Next available slot: Tomorrow 9:00 AM
  ✓ Duration: 2 hours (with buffer)
  ✓ Model: Claude Sonnet 4.5
  ✓ Calendar event created

Ready for next session!
```

**Use case scenarios:**
- **Daily workflow:** Schedule tomorrow's session before leaving
- **Automated flow:** Set up recurring session pattern
- **Team coordination:** Share scheduled work times
- **Quota management:** Align sessions with quota reset

---

### `advanced-planning-session.js` - Session Plan Orchestration **COMING SOON**

**What it does:** Reads session plans from `docs/planning/`, analyzes dependencies, schedules multi-session workflows.

**When to use:**
- Complex multi-session projects
- Planning implementation phases
- Coordinating sequential sessions (Session 6A → 6B → 7)
- Automated project orchestration

**Example (planned):**
```bash
$ node dist/commands/advanced-planning-session.js

🎯 Advanced Session Orchestration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found session plans:
  • SESSION_6A_PLAN.md - Token Estimation ML (estimated: 20k tokens)
  • SESSION_6B_PLAN.md - Automation Integration (estimated: 5k tokens)
  • SESSION_7_PLAN.md - Testing & Documentation (estimated: 15k tokens)

Dependency Analysis:
  SESSION_6A ───> SESSION_6B ───> SESSION_7
  (complete)      (complete)      (pending)

Scheduling SESSION_7:
  ✓ Prerequisites met
  ✓ Estimated duration: 1.5 hours
  ✓ Scheduled for: Tomorrow 2:00 PM
  ✓ Handoff prepared

Next steps ready!
```

---

## 🧠 Knowledge Management Commands

### `memory-search.js` - Knowledge Base Search

**What it does:** Searches stored patterns, solutions, and architectural decisions.

**When to use:**
- Looking for previously solved problems
- Finding reusable code patterns
- Remembering architectural decisions
- Avoiding duplicate work

**Example:**
```bash
$ node dist/commands/memory-search.js "session tracking"

🔍 Knowledge Base Search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 3 results for "session tracking":

1. Session Time Tracking Implementation
   Date: 2025-10-02
   Tags: session-monitoring, architecture
   Summary: Implemented session time tracking by reading from
            Claude's .jsonl files in ~/.claude/projects/

2. Context Tracker Class
   Date: 2025-10-01
   Tags: context, monitoring
   Summary: Created ContextTracker class for monitoring context
            window usage with threshold notifications

3. Session Monitor Pattern
   Date: 2025-09-30
   Tags: monitoring, automation
   Summary: Real-time session monitoring with 5-hour window
            tracking and notification system
```

---

### `memory-stats.js` - Memory Statistics

**What it does:** Shows statistics about stored knowledge and learning patterns.

**When to use:**
- Understanding what knowledge has been captured
- Reviewing learning progress
- Finding gaps in documentation
- Auditing knowledge base health

**Example:**
```bash
$ node dist/commands/memory-stats.js

🧠 Knowledge Base Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Entries: 47
  • Patterns: 23
  • Solutions: 15
  • Architectures: 9

Most Common Tags:
  1. typescript (12)
  2. architecture (9)
  3. monitoring (8)
  4. automation (7)
  5. optimization (6)

Recent Activity:
  • Last 7 days: 8 new entries
  • Last 30 days: 23 new entries
  • Growth rate: +52% vs previous month
```

---

## 🔧 Build & Development Commands

### `npm run build` - Compile TypeScript

**When to use:**
- After modifying any .ts files
- Before running dist/commands/* tools
- After pulling changes from git
- Before testing changes

---

### `npm run dev` - Watch Mode

**When to use:**
- Active development session
- Making frequent changes
- Testing iterations
- Real-time feedback needed

---

### `npm test` - Run Test Suite

**When to use:**
- After implementing features
- Before committing changes
- Validating bug fixes
- CI/CD pipeline

---

## ⚡ Quick Workflows

### Morning Startup Workflow
```bash
ctx                    # Check session time
/context              # Check token usage
git pull              # Get latest changes
npm run build         # Compile
npm test              # Verify everything works
```

### Mid-Session Check-in
```bash
ctx                              # Time check
node dist/commands/context-status.js  # Detailed analysis
```

### End-of-Session Workflow
```bash
git add . && git commit -m "..."           # Save work
node dist/commands/save-and-restart.js     # Create handoff
node dist/commands/plan-next-session.js    # Schedule next
```

### Crisis Management (Context/Time Running Out)
```bash
# If context > 80% OR time < 1 hour:
node dist/commands/save-and-restart.js

# If context moderate but want to continue:
node dist/commands/compact-context.js
```

---

## 📋 Command Decision Tree

```
Need to check status?
├─ Quick time check → ctx
├─ Quick tokens → /context
└─ Detailed analysis → node dist/commands/context-status.js

Context getting high?
├─ < 50% → Keep working
├─ 50-80% → node dist/commands/compact-context.js
└─ > 80% → node dist/commands/save-and-restart.js

Planning work?
├─ Estimate task → node dist/commands/estimate-session.js
├─ Schedule next → node dist/commands/plan-next-session.js
└─ Multi-session → node dist/commands/advanced-planning-session.js (soon)

Looking for info?
├─ Search knowledge → node dist/commands/memory-search.js
└─ See statistics → node dist/commands/memory-stats.js

Building/Testing?
├─ Compile once → npm run build
├─ Watch mode → npm run dev
└─ Run tests → npm test
```

---

## 🎓 Pro Tips

1. **Start every session with `ctx`** - Know your time budget upfront
2. **Use `/context` frequently** - Don't let tokens sneak up on you
3. **Save handoffs at natural breakpoints** - Don't wait for emergencies
4. **Search memory first** - Avoid solving the same problem twice
5. **Estimate before planning** - Realistic goals prevent frustration
6. **Compact before reading large files** - Preemptive context management
7. **Schedule next session before leaving** - Smooth transitions between work

---

## 📞 Quick Reference Card

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `ctx` | Session time | Start/during/before big tasks |
| `/context` | Token usage | Frequently during work |
| `context-status.js` | Deep analysis | Planning, troubleshooting |
| `compact-context.js` | Free space | 50-80% context used |
| `save-and-restart.js` | Clean start | >80% context OR <1h time |
| `estimate-session.js` | Predict tokens | Planning next work |
| `plan-next-session.js` | Auto schedule | End of session |
| `memory-search.js` | Find solutions | Before implementing |
| `npm run build` | Compile | After code changes |

---

**Last Updated:** 2025-10-02
**Version:** 2.0.0