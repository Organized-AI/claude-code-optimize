# Getting Started with Claude Code Optimizer

*A beginner-friendly guide to maximizing your Claude Code sessions*

## Why This Tool Exists

Claude Code is an incredibly powerful AI pair programmer, but it has limits:
- **5-hour session windows** (then you need a break)
- **Token quotas** (50k free, 200k pro, 500k team per 5 hours)

As a beginner or intermediate developer, you might not realize how quickly tokens get used. One complex refactoring session could consume 80k+ tokens, leaving you surprised when you hit limits.

**This tool helps you:**
1. **Plan ahead** - Know what tasks fit your quota
2. **Learn efficiently** - Use tokens on high-value learning tasks
3. **Avoid frustration** - Never hit limits unexpectedly
4. **Build good habits** - Structured approach to AI-assisted development

## Your First Session

### Step 1: Analyze Your Project

```bash
cd /path/to/your/project
claude-optimizer analyze .
```

**What happens:**
- Scans your codebase complexity
- Breaks work into manageable sessions
- Estimates token usage for each phase
- Creates a structured plan

**Example output:**
```
🔍 Analyzing: my-todo-app
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Project Complexity: MEDIUM
   2,400 lines across 18 files
   Estimated: 4 sessions, 12-15 hours

📋 Recommended Sessions:

1. Planning & Architecture (2h, 25k tokens)
   • Understand existing code structure
   • Design new feature architecture
   • Create implementation checklist

2. Implementation - Part 1 (3h, 55k tokens)
   • Build core functionality
   • Add error handling
   • Write unit tests

3. Implementation - Part 2 (3h, 48k tokens)
   • Complete feature integration
   • UI/UX improvements
   • Integration tests

4. Polish & Documentation (2h, 18k tokens)
   • Code review and refactoring
   • Write documentation
   • Final testing

✅ Analysis saved! Run /start-next-session to begin
```

### Step 2: Check Your Status

```bash
/session-status
```

**What you see:**
```
🎯 TOKEN QUOTA (Rolling 5-hour window)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan:         PRO (200,000 tokens per 5h)
Used:         0 tokens
Remaining:    200,000 tokens
Usage:        [                          ] 0%

📋 Recommendation:
   ✅ PLENTY: 200,000 tokens available.
   Any task size OK.
```

You have a **full tank** - ready to start!

### Step 3: Start Your First Session

```bash
/start-next-session
```

**Interactive flow:**
```
🎯 Smart Session Starter

📊 Current Status:
   Token Quota: 200,000 / 200,000 (100% available)

📋 Session Queue: 0/4 complete
   Next up: Planning & Architecture

How many hours can you work? [1-5]: 2

✅ Found session: Planning & Architecture
   Duration: 2h
   Tokens: 25,000 (~12% of quota)
   Leaves 175,000 tokens for future work

📋 Session: Planning & Architecture
⏱️  Duration: 2h
🎯 Objectives:
   • Understand existing code structure
   • Design new feature architecture
   • Create implementation checklist

Start this session? (y/n): y

🚀 Starting session...
   Agent: planning-agent.md
   Project: my-todo-app
```

**What's happening behind the scenes:**
- Creates tracking files in `~/.claude/`
- Monitors your token usage in real-time
- Will warn you at 1h, 30m, 5m marks
- Updates quota tracker as you use tools

### Step 4: Work Through Your Session

During your session, Claude will help you:
- Read and understand your code
- Design the architecture
- Create structured plans

**Token-saving tips for beginners:**

❌ **Don't do this:**
```
"Can you explain every function in detail?"
```
*Uses tons of tokens reading entire codebase*

✅ **Do this instead:**
```
"Show me the main entry points and data flow.
Focus on the authentication module."
```
*Targeted reading = fewer tokens*

❌ **Don't do this:**
```
"Implement the entire feature in one go"
```
*Giant changes = massive token usage*

✅ **Do this instead:**
```
"Let's implement the user authentication first,
then we'll add the profile features in the next session"
```
*Incremental work = manageable token usage*

### Step 5: Check Status During Work

At any point, run:
```bash
/session-status
```

You might see:
```
🎯 TOKEN QUOTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Used:         32,000 tokens
Remaining:    168,000 tokens
Usage:        [████████                  ] 16%

📋 Recommendation:
   ✅ PLENTY: 168,000 tokens remaining.
   You're on track!
```

**Green progress bar** = you're doing great! 🎉

### Step 6: End Session and Plan Next

After your 2-hour planning session:

```bash
/session-status
```

```
📋 Session Queue: 1/4 complete
   ✓ Planning & Architecture (used 28,000 tokens)
   Next: Implementation - Part 1 (3h, 55k tokens)

Token Quota: 172,000 remaining (86%)
```

**You have two choices:**

**Option A: Keep going** (if you have time + energy)
```bash
/start-next-session
# Start Implementation - Part 1
```

**Option B: Schedule for later** (smart choice!)
```bash
/start-next-session
# "How many hours?" → 0
# Or just wait until you're ready

# When you come back:
/start-next-session
# Picks up where you left off
```

## Understanding Token Usage

### What Uses Tokens?

Everything Claude reads and writes consumes tokens:

| Action | Tokens | Example |
|--------|--------|---------|
| Read small file | ~800 | View a config file |
| Read large file | ~2000 | View a complex component |
| Edit existing code | ~1500 | Modify a function |
| Write new file | ~1200 | Create a new module |
| Search codebase | ~500 | Find function definitions |
| Run bash command | ~300 | Execute tests |
| Use subagent | ~2000 | Complex multi-step task |

### Example Session Breakdown

**Planning session (2h, 25k tokens):**
- Read 10 key files: 10 × 800 = 8,000
- Create architecture doc: 1,200
- Design discussions: 8,000
- Create checklist: 1,200
- Misc searches/commands: 6,600
- **Total: ~25,000 tokens**

**Implementation session (3h, 55k tokens):**
- Read 20 files: 20 × 800 = 16,000
- Create 5 new files: 5 × 1,200 = 6,000
- Edit 15 files: 15 × 1,500 = 22,500
- Run tests multiple times: 10 × 300 = 3,000
- Code reviews: 7,500
- **Total: ~55,000 tokens**

## Handling Low Quota

Let's say you've done 2 sessions and have this status:

```bash
/session-status
```

```
🎯 TOKEN QUOTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Used:         178,000 tokens
Remaining:    22,000 tokens
Usage:        [██████████████████████    ] 89%

📋 Recommendation:
   ⚠️ WARNING: 22,000 tokens remaining.
   Small tasks only (<30k tokens).
   Quota resets at 5:30 PM (in 1h 15m)
```

You try to start the next big session:

```bash
/start-next-session
```

```
📊 Current Status:
   Token Quota: 22,000 / 200,000 (11% available)

Next session needs 48,000 tokens but only 22,000 available.

⏰ Quota resets at 5:30 PM (in 1h 15m)

Options:
1. Schedule this session for 5:35 PM
2. Find a smaller task that fits now

Choice (1/2): 1

📅 Session scheduled for 5:35 PM!

Would you like to create a calendar event? (y/n): y

✅ Calendar event created!
   ~/.claude/calendar/session-3.ics

📱 Import to your calendar:
   • Double-click the .ics file (macOS)
   • Or import via Google Calendar

⏰ You'll get reminders:
   • 30 minutes before (5:05 PM)
   • 5 minutes before (5:30 PM)

💡 Take a break, and come back when quota resets!
```

### Alternative: Find Smaller Task

If you chose option 2:

```
Looking for smaller sessions that fit...

Found sessions within quota:
1. Polish & Documentation (2h, 18,000 tokens)
   • Code review and refactoring
   • Write documentation
   • Final testing

2. Bug Fixes (1h, 12,000 tokens)
   • Fix reported issues
   • Add validation

Start which session? (1/2, or 0 to wait): 1

✅ Starting: Polish & Documentation
   Using remaining quota productively!
```

## Learning Best Practices

### 1. Start Small

**First project?** Choose:
- ❌ "Rebuild my entire e-commerce platform"
- ✅ "Add a new feature to my todo app"

Smaller scope = better learning + manageable tokens

### 2. Break It Down

The tool does this for you, but understand **why**:

```
BAD: One 15-hour session
   Problems:
   - Exhausting
   - Complex context to maintain
   - Easy to lose focus
   - Might exceed quota

GOOD: Four 3-4 hour sessions
   Benefits:
   - Natural break points
   - Time to review and understand
   - Stay within quota
   - Better learning retention
```

### 3. Use Planning Sessions

**Always start with planning** (even if tempted to jump in):

```
Session 1: Planning (2h, 25k tokens)
   • Understand the codebase
   • Design the solution
   • Create a checklist

Session 2+: Implementation
   • Follow your plan
   • Learn by building
   • Iterate and improve
```

Planning sessions are **high-ROI** for learning:
- You understand the "why" before the "how"
- Less backtracking = fewer wasted tokens
- Builds good development habits

### 4. Ask Smart Questions

**Token-efficient questions:**

✅ "Show me the authentication flow in auth.js"
✅ "What's the best way to add validation to this form?"
✅ "Review this function for potential bugs"

**Token-heavy questions:**

❌ "Explain every line of code in the project"
❌ "Generate 50 different implementations and compare them"
❌ "Read all files and summarize everything"

### 5. Monitor Your Progress

Check status every hour:
```bash
/session-status
```

**Green (0-50%):** Relax, you're good!
**Yellow (50-75%):** Aware, but don't stress
**Orange (75-90%):** Start wrapping up
**Red (90%+):** Save work, prepare to stop

## Common Beginner Questions

### "Why do I need to track tokens?"

Think of tokens like **gas in a car**:
- You wouldn't drive cross-country without checking the tank
- Planning ahead prevents getting stranded
- Knowing your limits helps you choose the right route

### "What if I run out of tokens mid-task?"

The tool warns you at **90%** and **95%**, giving you time to:
1. Save your current work
2. Document where you stopped
3. Create a calendar event for when quota resets
4. Come back refreshed and ready

### "How do I know if a task is too big?"

Use the analyzer! It estimates token usage:
- **Small tasks**: <20k tokens (documentation, bug fixes)
- **Medium tasks**: 20-60k tokens (feature additions)
- **Large tasks**: 60-100k+ tokens (major refactors)

For Pro plan (200k), you can do:
- 2 large + 1 medium + 1 small task per 5 hours
- Or 3 medium + 2 small tasks
- Or many small tasks

### "Can I pause mid-session?"

**Yes!** Claude Code sessions can be:
- Paused and resumed
- Split across days
- Picked up later

The quota tracker just cares about the **rolling 5-hour window** from first token usage.

## Real-World Example: Adding a Feature

Let's walk through a realistic scenario:

**Goal:** Add user authentication to a web app

### Monday 2:00 PM - Planning

```bash
claude-optimizer analyze .
/start-next-session
# Session: Planning & Architecture (2h)
```

**What you learn:**
- Where auth should integrate
- What libraries to use
- Database schema changes needed
- Testing strategy

**Tokens used:** 28k
**Remaining:** 172k
**Time:** 2 hours well spent

### Monday 4:30 PM - Implementation Part 1

```bash
/session-status  # Check quota
/start-next-session
# Session: Implementation - Backend (3h)
```

**What you build:**
- Database models
- API endpoints
- Password hashing
- JWT generation

**Tokens used:** 62k (total: 90k)
**Remaining:** 110k

**Status:** Yellow (45% used) - you're on track!

### Monday 7:30 PM - Time Check

You've been working 5.5 hours. You're tired.

```bash
/session-status
```

```
⚠️ Low quota: 110k remaining
Next session needs 55k

Schedule for tomorrow? (y/n): y
```

**Smart choice!** You:
- ✅ Made great progress
- ✅ Learned a ton
- ✅ Stayed within limits
- ✅ Set yourself up for success tomorrow

### Tuesday 2:00 PM - Fresh Start

```bash
/session-status
```

```
Token Quota: RESET! 200k available ✅
Next: Implementation - Frontend (3h, 55k)
```

```bash
/start-next-session
```

**You continue with energy!**

## Success Metrics

You're using this tool well if:

✅ You rarely hit quota limits unexpectedly
✅ You complete sessions with 10-20% quota to spare
✅ You understand **why** each phase needs its estimated tokens
✅ You make steady progress across multiple sessions
✅ You're learning sustainable development practices

## Next Steps

1. **Try it with a real project**
   ```bash
   claude-optimizer analyze /path/to/project
   ```

2. **Start with planning**
   ```bash
   /start-next-session
   ```

3. **Monitor as you go**
   ```bash
   /session-status
   ```

4. **Build the habit**
   - Check quota before starting
   - Break work into sessions
   - Schedule when needed
   - Review what you learned

## Getting Help

- **Documentation**: See [QUOTA_AWARE_SYSTEM.md](QUOTA_AWARE_SYSTEM.md) for technical details
- **Issues**: Check [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- **Questions**: Use `/session-status` to debug quota issues

---

Remember: **This tool exists to help you learn and build effectively.** It's not about restricting you—it's about **empowering you** to make the most of Claude Code's capabilities within its natural limits.

Happy coding! 🚀
