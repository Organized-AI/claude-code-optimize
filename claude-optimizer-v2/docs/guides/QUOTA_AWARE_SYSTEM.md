# Quota-Aware Session Management

The Claude Code Optimizer includes an intelligent quota-aware system that automatically manages token usage within Claude Code's 5-hour rolling window limits.

## Overview

Claude Code enforces rate limits based on a **rolling 5-hour window**:
- **Free tier**: 50,000 tokens per 5 hours
- **Pro tier**: 200,000 tokens per 5 hours
- **Team tier**: 500,000 tokens per 5 hours

The quota-aware system:
1. **Tracks** token usage in real-time
2. **Monitors** context window consumption per-session
3. **Warns** you at critical thresholds (50%, 80%, 90%)
4. **Compacts** context automatically to extend sessions
5. **Schedules** sessions when quota is insufficient
6. **Creates** calendar events for scheduled sessions
7. **Prevents** rate limit and context limit surprises

## Key Components

### 1. Quota Tracker (`src/quota-tracker.ts`)

Manages the rolling 5-hour token quota window.

**Key Features:**
- Tracks token usage from first token in window
- Window resets 5 hours after first token used
- Provides recommendations based on remaining quota
- Schedules sessions for after quota reset
- Desktop notifications at critical thresholds
- **Hyperaware mode**: Notifications at 10%, 25%, 50%, 75%, 90%, 95%
- Burn rate tracking (tokens per minute)
- Estimated runway calculations

**Status Levels (Hyperaware Mode):**
```
🎯 FRESH (0-10%):       Full quota. Strategic planning time
🟢 EXCELLENT (10-25%):  Any task size OK. Early monitoring active
✅ GOOD (25-50%):       Large tasks OK (60-80k tokens, 40-55 tool calls)
💡 MODERATE (50-75%):   Medium tasks OK (30-60k tokens, 20-40 tool calls). Monitor burn rate
⚠️ HIGH USAGE (75-90%): Small tasks only (<30k tokens, ~20 tool calls). Schedule larger work
🔴 DANGER (90-95%):     Wrap up current task. Est. tool calls shown
🚨 CRITICAL (95%+):     Save work immediately. Auto-schedule all future sessions
```

**Notification Thresholds:**
- **10%**: Early tracking started - burn rate monitoring begins
- **25%**: Quarter checkpoint - pace awareness
- **50%**: Halfway mark - usage monitoring
- **75%**: Caution zone - consider scheduling
- **90%**: Danger zone - complete current task
- **95%**: Critical - save immediately

### 2. Session Monitor (`src/session-monitor.ts`)

Watches `~/.claude/logs/sessions.jsonl` for real-time session tracking.

**Key Features:**
- Detects session starts automatically
- Creates 5-hour session windows
- Estimates token usage from tool calls
- Sends warnings at 1h, 30m, 5m marks
- Tracks both session time AND quota

**Token Estimates (per tool call):**
```
Edit:     1,500 tokens  (read + write + context)
Write:    1,200 tokens  (new file creation)
Read:       800 tokens  (file content)
WebFetch: 1,000 tokens  (web content)
Task:     2,000 tokens  (subagent calls)
Grep:       500 tokens  (search results)
Glob:       400 tokens  (file listing)
Bash:       300 tokens  (command execution)
```

### 3. Smart Session Planner (`src/smart-session-planner.ts`)

Intelligent scheduling based on quota availability.

**Key Features:**
- Finds best session considering quota
- Tries smaller sessions if primary doesn't fit
- Schedules for quota reset if needed
- Creates iCal events for scheduled sessions
- Manages session dependencies

**Scheduling Logic:**
1. Check if primary session fits quota
2. If not, try to find smaller session that fits
3. If nothing fits, schedule for quota reset time
4. Offer calendar integration for scheduled sessions

### 4. Context Window Tracker (`src/context-tracker.ts`)

Monitors conversation context size to prevent hitting limits.

**Key Features:**
- Estimates current context token usage
- Tracks context growth per session
- Identifies compaction opportunities
- Auto-compacts at critical thresholds
- Provides restart options when needed

**Context Levels:**
```
🎯 FRESH (0-50k):              Plenty of space. Read files freely
🟢 HEALTHY (50-90k):           Good space. Normal operation
⚡ MODERATE (90-120k):         Monitor usage. Prefer edits over re-reads
⚠️ CONTEXT WARNING (120-144k, 50%): Plan compaction strategy
🔴 CONTEXT DANGER (144-180k, 80%):  COMPACT NOW to continue
🚨 CONTEXT CRITICAL (180k+):        Emergency auto-compact triggered
```

**Context vs Quota:**
- **Quota**: Rolling 5-hour window (resets automatically)
- **Context**: Per-session cumulative (grows with conversation)
- **Both matter**: Can have quota but no context, or vice versa!

### 5. Slash Commands

#### `/session-status`

Displays comprehensive session, quota, AND context status:

```
📊 Claude Code Session Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 SESSION WINDOW (5-hour limit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:       🟢 Active
Session ID:   abc123def456...
Started:      1/6/2025, 2:30:00 PM
Expires:      1/6/2025, 7:30:00 PM
Elapsed:      2h 15m / 5h
Remaining:    2h 45m
Progress:     [███████████           ] 45%
Agent:        planning-agent.md
Working Dir:  my-project

🎯 TOKEN QUOTA (Rolling 5-hour window)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Plan:         PRO (200,000 tokens per 5h)
Used:         85,000 tokens (42%)
Remaining:    115,000 tokens (58%)
Usage:        [████████████          ] 42%
Burn Rate:    630 tokens/min
Est. Runway:  ~182 minutes (76 tool calls)
Resets at:    1/6/2025, 7:30:00 PM
Resets in:    2h 45m

📋 Status & Recommendation:
   💡 MODERATE: 115,000 tokens remaining (58% left).
   Medium tasks OK (30-60k tokens, 20-40 tool calls). Monitor burn rate.

📢 Next Alert:   50% usage (~15,000 tokens)

📝 CONTEXT WINDOW (Session)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Model:        Claude Sonnet 4.5
Limit:        180,000 tokens (usable)
Used:         68,000 tokens (38%)
Remaining:    112,000 tokens (62%)
Context:      [███████              ] 38%
Status:       🟢 HEALTHY - Normal operation
Est. Hours:   ~2-3 hours remaining

📋 Status & Recommendation:
   🟢 HEALTHY: 112,000 tokens context remaining.
   Continue coding normally. Use Edit over Read+Write when possible.

📢 Next Alert:   50% context (~90,000 tokens)

⚡ COMBINED HEALTH: GOOD
   Both quota and context are healthy. Continue current work.
```

#### `/context-status`

Displays detailed context window analysis:

```
📝 Context Window Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 USAGE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Context:    68,000 / 180,000 tokens
Percentage:       38% used
Status:           🟢 HEALTHY - Normal operation
Remaining:        112,000 tokens (~2-3 hours)

📁 CONTEXT BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
System Prompt:    5,000 tokens   (7%)
File Reads:       18,000 tokens  (26%) - 12 files
Tool Results:     15,000 tokens  (22%) - 34 results
Conversation:     20,000 tokens  (29%) - 45 exchanges
Code Generated:   10,000 tokens  (15%) - 8 responses

🧹 COMPACTION OPPORTUNITIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Old file reads:   -3,000 tokens (keep recent 10)
Duplicate tools:  -2,000 tokens (deduplicate)
Old exchanges:    -1,500 tokens (keep key decisions)

Total Potential:  6,500 tokens (not needed yet)

💡 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Context is healthy - no action needed
✅ Continue normal operation
📊 Next checkpoint: 50% (90k tokens)

Compaction available if needed: /compact-context
```

#### `/compact-context`

Compact conversation context to free up space:

```bash
/compact-context
```

See detailed flow in [AUTOMATED_SESSION_ORCHESTRATION_PLAN.md](../planning/AUTOMATED_SESSION_ORCHESTRATION_PLAN.md#compact-context).

#### `/save-and-restart`

Save context and start fresh session (preserves quota):

```bash
/save-and-restart
```

**When to use:**
- Context approaching limit (80%+)
- Want fresh conversation space
- Same token quota window still valid

Creates handoff file and restarts session with clean context.

#### `/start-next-session`

Interactive session starter with quota awareness:

```
🎯 Smart Session Starter

📊 Current Status:
   Token Quota: 115,000 / 200,000 (57% available)
   Resets in: 2h 45m

📋 Session Queue: 2/5 complete
   Ready: 1
   Scheduled: 2

How many hours can you work? [1-5]: 3

✅ Starting: Implementation - Part 2/3
   (45,000 tokens, 115,000 available)

📋 Session: Implementation - Part 2/3
⏱️  Duration: 3h
🎯 Objectives:
   • Build API integration layer
   • Implement error handling
   • Add validation logic

Start this session? (y/n):
```

**Quota-Low Flow:**
If quota is insufficient, offers two options:

```
⏰ Scheduling for 7:30 PM when quota resets
   (needs 85,000, have 25,000)

Schedule this session for later? (y/n): y

✅ Session scheduled!
   Run this command again after quota resets

💡 Or create calendar event:
   /create-calendar-events
```

Or finds smaller task:

```
Looking for smaller sessions that fit...

Found smaller sessions:
   1. Polish & Documentation (2h, 18,000 tokens)
   2. Testing (1.5h, 22,000 tokens)

Start which session? (1-2, or 0 to cancel):
```

#### `/create-calendar-events`

Exports scheduled sessions to iCal format:

```
📅 Create Calendar Events
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Creating 3 calendar events...

   ✓ Implementation - Part 1/3 → ~/.claude/calendar/session-1.ics
   ✓ Testing → ~/.claude/calendar/session-3.ics
   ✓ Polish & Documentation → ~/.claude/calendar/session-4.ics

✅ Calendar events created!
   Import the .ics files to your calendar app

📂 Calendar files created in:
   ~/.claude/calendar/

📱 To import:
   • macOS Calendar: Double-click the .ics files
   • Google Calendar: Import from Settings
   • Outlook: File → Open & Export → Import/Export

⏰ Reminders set for:
   • 30 minutes before session
   • 5 minutes before session

🎯 Next Scheduled Session:
   Implementation - Part 1/3
   1/6/2025, 7:35:00 PM
   In 2h 50m
```

## Workflow Examples

### Example 1: Starting With Full Quota

```bash
# Check status
/session-status
# Shows: 200,000 tokens available ✅

# Start next session
/start-next-session
# Prompt: How many hours? → 4
# Shows: Starting Implementation (65,000 tokens)
# Confirmation: y

# Session starts immediately
# Monitor tracks tokens in real-time
```

### Example 2: Low Quota - Schedule for Later

```bash
# Check status
/session-status
# Shows: 18,000 tokens remaining ⚠️

# Try to start
/start-next-session
# Prompt: How many hours? → 3
# Response: ⏰ Quota insufficient (needs 65k, have 18k)
# Offer: Schedule for 5:30 PM? (y/n) → y

# Session scheduled
# Create calendar event
/create-calendar-events
# Import to calendar app

# Wait for quota reset...
# Calendar reminder fires
# Come back and run:
/start-next-session
# Automatically starts scheduled session
```

### Example 3: Low Quota - Find Smaller Task

```bash
# Check status
/session-status
# Shows: 25,000 tokens remaining

# Try to start
/start-next-session
# Response: Large session doesn't fit
# Shows smaller options:
#   1. Polish (18k tokens)
#   2. Documentation (22k tokens)
# Choose: 1

# Starts Polish session immediately
# Use remaining quota productively
```

## File Locations

```
~/.claude/
├── logs/
│   └── sessions.jsonl          # Claude Code session log (watched)
├── quota-tracker.json          # Rolling window state
├── session-tracker.json        # Active sessions
├── session-queue.json          # Planned sessions
└── calendar/
    ├── session-1.ics          # Scheduled session events
    ├── session-2.ics
    └── ...
```

## Best Practices

### 1. Check Status Regularly
```bash
/session-status
```
Shows both session time and quota status at a glance.

### 2. Schedule Ahead
When you see quota warnings, schedule your next sessions:
```bash
/start-next-session  # Will offer to schedule if low
/create-calendar-events  # Export to calendar
```

### 3. Use Smaller Sessions Near Limit
When quota is 75%+ used, prefer smaller tasks:
- Polish & documentation (15-20k tokens)
- Bug fixes (10-15k tokens)
- Code review (8-12k tokens)

### 4. Monitor During Long Sessions
System monitors both quota AND context:

**Quota warnings**:
- **50% quota**: Keep an eye on usage
- **80% quota**: Plan next session
- **90% quota**: Save work, prepare to stop
- **95% quota**: Rate limit imminent

**Context warnings**:
- **50% context**: Use edits, minimize re-reads
- **80% context**: Compact now to continue
- **90% context**: Emergency auto-compact

### 5. Plan Around Reset Times
The 5-hour window starts from **first token used**, not session start.

If you start a session at 2:00 PM:
- First tool call at 2:05 PM
- Quota window: 2:05 PM - 7:05 PM
- Plan sessions accordingly

## Troubleshooting

### "No active session" but I'm in Claude Code

The session monitor watches `sessions.jsonl`. If it's not detecting:

1. Check log file exists:
   ```bash
   ls -la ~/.claude/logs/sessions.jsonl
   ```

2. Verify JSONL format (each line should be valid JSON)

3. Start a new session to trigger detection

### Quota seems wrong

The tracker estimates tokens from tool usage. Actual usage may vary.

To reset:
```bash
rm ~/.claude/quota-tracker.json
```

Next session will initialize fresh window.

### Scheduled session doesn't auto-start

`/start-next-session` checks for due sessions but doesn't auto-run.

Options:
1. Run command manually when calendar reminder fires
2. Set up cron job (advanced)
3. Use calendar event as reminder to run command

### Calendar events won't import

iCal files are in `~/.claude/calendar/`.

Try:
- Open file directly (double-click on macOS)
- Import via calendar app's import feature
- Check file permissions

## Technical Details

### Token Quota Calculation

```typescript
interface TokenQuota {
  plan: 'free' | 'pro' | 'team';
  limit: number;  // 50k, 200k, or 500k

  currentWindow: {
    startTime: string;      // First token timestamp
    resetTime: string;      // startTime + 5 hours
    tokensUsed: number;     // Running total
    remaining: number;      // limit - tokensUsed
  };
}
```

### Session Detection

Watches for `session_start` events in JSONL:
```json
{
  "type": "session_start",
  "timestamp": "2025-01-06T14:05:23.456Z",
  "session_id": "abc123...",
  "cwd": "/path/to/project",
  "agent": ".claude/agents/planning-agent.md"
}
```

### iCal Format

Generated calendar events include:
- Summary: "Claude Session: [Phase Name]"
- Description: Objectives + token budget + agent
- Location: Project path
- Duration: Estimated hours
- Alarms: 30min and 5min before

## Integration with Native Workflows

The quota-aware system integrates with:

- **Slash commands**: `/start-next-session`, `/session-status`
- **Hooks**: Pre-session checks (future)
- **Specialized agents**: Token-aware prompts (future)
- **Calendar**: iCal export for scheduling

See [IMPLEMENTATION_PLAN_V4_NATIVE_WORKFLOWS.md](../IMPLEMENTATION_PLAN_V4_NATIVE_WORKFLOWS.md) for complete system architecture.
