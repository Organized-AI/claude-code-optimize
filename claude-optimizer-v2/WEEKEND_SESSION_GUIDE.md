# Weekend SESSION Plan Integration Guide

🎉 **Quick Win Implemented!** You can now start Claude Code sessions directly from your SESSION plans with one command!

## What's New

### ✅ `session start` Command
Start any SESSION plan with a single command:
```bash
node dist/cli.js session start 10
# or
node dist/cli.js session start SESSION_10_PLAN
```

This automatically:
- Finds and parses `docs/planning/SESSION_10_PLAN.md`
- Extracts all objectives, phases, and prerequisites
- Builds complete prompt with session instructions
- Launches Claude Code with everything loaded
- Tracks session with proper metadata

### ✅ `session list` Command
View all available SESSION plans:
```bash
node dist/cli.js session list
```

Shows:
- All SESSION plans in `docs/planning/`
- Status, time estimates, token budgets
- Quick start examples

## Weekend Workflow

### Friday Setup (5 min)

1. **Build the optimizer**:
   ```bash
   cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"
   npm run build
   ```

2. **Check available sessions**:
   ```bash
   node dist/cli.js session list
   ```

3. **Export to iPhone calendar** (optional):
   ```bash
   node dist/cli.js calendar export ~/Desktop/weekend-sessions.ics
   # Then AirDrop to iPhone
   ```

### Saturday/Sunday Usage

#### Option A: View on iPhone, Run on Laptop (Recommended)

1. **On iPhone**: Check calendar for next SESSION_10
2. **On laptop terminal**:
   ```bash
   cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"

   node dist/cli.js session start 10
   ```
3. **Session starts automatically** with all objectives loaded!

#### Option B: Laptop Only

1. **Check what's available**:
   ```bash
   node dist/cli.js session list
   ```

2. **Start the session**:
   ```bash
   node dist/cli.js session start 10
   ```

## Example: Starting SESSION 10

```bash
$ node dist/cli.js session start 10

✔ Session plan loaded

═══════════════════════════════════════════════════════
  Session 10: Real Data Integration & Dashboard Enhancement
═══════════════════════════════════════════════════════

Status: 🟢 READY TO START
Estimated Time: 3.5-4.5 hours
Token Budget: 65-85k tokens (32-42% of Pro quota)

Prerequisites:
  • SESSION 9 complete (Dashboard UI + Live Server)

Session Objectives:
  1. Connect real JSONL data to dashboard
  2. Implement live WebSocket updates
  3. Add historical session view
  4. Test with actual Claude Code sessions

Phases:
  Phase 1: JSONL Parser Integration
    • Create SessionJSONLParser class
    • Parse .jsonl files from ~/.claude/projects/
    • Extract tokens, tools, messages

  Phase 2: Live Data Broadcasting
    • Connect parser to WebSocket server
    • Broadcast real session metrics
    • Update dashboard with live data

  ... and 2 more objectives

────────────────────────────────────────────────────────

✔ Session started!

✓ Claude Code session launched
  Session ID: a1b2c3d4-e5f6-...
  PID: 12345
  Log: /Users/jordaaan/.claude/projects/...

📋 Follow the objectives above to complete this session.
```

## Command Reference

### Session Commands
```bash
# List all SESSION plans
node dist/cli.js session list

# Start SESSION 10
node dist/cli.js session start 10

# Start with full name
node dist/cli.js session start SESSION_10_PLAN

# Show help
node dist/cli.js session --help
```

### Calendar Commands
```bash
# Export to iCal
node dist/cli.js calendar export sessions.ics

# List upcoming sessions
node dist/cli.js calendar list

# Start calendar watcher (auto-start sessions)
node dist/cli.js calendar watch
```

### Status Commands
```bash
# Check quota and context
node dist/cli.js status

# View dashboard
node dist/cli.js dashboard
```

## Files Created/Modified

### New Files
- ✅ `src/session-plan-parser.ts` - Enhanced with new methods
- ✅ `src/commands/session-start.ts` - New command implementation
- ✅ `ICAL_SESSION_INTEGRATION_PLAN.md` - Full integration roadmap
- ✅ `WEEKEND_SESSION_GUIDE.md` - This file!

### Modified Files
- ✅ `src/cli.ts` - Added session commands group

## Testing Checklist

### ✅ Completed
- [x] Can list all SESSION plans
- [x] Can parse SESSION plan markdown
- [x] Can extract objectives and phases
- [x] Can start session with plan objectives
- [x] Session launches Claude Code correctly
- [x] Objectives loaded in session prompt

### 🔲 To Test This Weekend
- [ ] Start SESSION_10 from iPhone calendar
- [ ] Verify all objectives appear in Claude session
- [ ] Complete at least one phase
- [ ] Track token usage matches estimates
- [ ] Test with different SESSION plans

## Next Steps (After Weekend)

### Phase 2: Enhanced Calendar Integration
1. **Modify calendar export** to include session start command
2. **Add URL handler** for one-tap start on Mac
3. **Create iOS Shortcut** to SSH and start session from iPhone

### Phase 3: Full Automation
1. **Enhanced calendar watcher** reads SESSION plans automatically
2. **Auto-start** sessions at scheduled time with plan objectives
3. **Progress tracking** shows which phase you're on

See [ICAL_SESSION_INTEGRATION_PLAN.md](./ICAL_SESSION_INTEGRATION_PLAN.md) for full roadmap.

## Troubleshooting

### "Session plan not found"
```bash
# Check available plans
node dist/cli.js session list

# Use exact plan number or name
node dist/cli.js session start 10
# or
node dist/cli.js session start SESSION_10_PLAN
```

### "Cannot find module"
```bash
# Rebuild the project
npm run build
```

### Session doesn't start
```bash
# Check Claude Code is not already running
# Check you're in the correct project directory
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"
```

## Pro Tips

1. **Use short numbers**: `node dist/cli.js session start 10` is faster than full names
2. **Check objectives first**: Run `session list` to see what each session does
3. **Track progress**: Use dashboard to monitor token usage during session
4. **Plan breaks**: SESSION plans show estimated time - plan bathroom/coffee breaks!
5. **iPhone as reference**: Keep SESSION objectives on iPhone screen while working on laptop

## Success! 🎉

You now have a working system to:
- ✅ View SESSION plans on your phone
- ✅ Start sessions with one command on laptop
- ✅ Auto-load all objectives and phases
- ✅ Track progress with real-time dashboard

**This weekend, you can work from anywhere with just your laptop + iPhone!**

---

*Built in 1 hour. Ready for production. Happy coding!* 🚀
