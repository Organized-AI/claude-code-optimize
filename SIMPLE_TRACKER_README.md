# 🎯 Simplified Claude Code Live Tracker

## What This Does

Gets **real Claude Code session data** to your Moonlock dashboard - no more placeholders!

## Files Added (Just 3!)

1. **`src/simple_tracker.py`** - Reads Claude's JSONL files to find active sessions
2. **`src/dashboard_sender.py`** - Sends the data to your Vercel dashboard  
3. **`start-live-tracker.sh`** - Starts everything with one command

## How It Works

```
Claude Code Running → Creates JSONL files → Tracker Reads → Sends to Dashboard
                        ↓                      ↓                ↓
                  ~/.claude/projects/     Every 5 seconds    WebSocket/HTTP
```

## Quick Start

```bash
# Test if it can see your Claude sessions
python3 test-live-data.py

# Start the live tracker
./start-live-tracker.sh

# Start a Claude Code session in another terminal
claude "write a hello world function"

# Check your dashboard - should show LIVE data!
```

## What You'll See on Dashboard

When Claude Code is **ACTIVE**:
- 🟢 Session ID
- Real token count
- Actual cost in USD
- Message count
- 95% confidence (from JSONL files)

When Claude Code is **INACTIVE**:
- ⚫ "No active session"
- 100% confidence (we're sure there's no session)

## How It Determines "Active"

- Checks if JSONL file was modified in last 60 seconds
- If yes = ACTIVE session
- If no = INACTIVE

## Troubleshooting

**No sessions found?**
- Make sure `~/.claude/projects/` exists
- Use Claude Code at least once

**Dashboard not updating?**
- Check if tracker is running: `ps aux | grep dashboard_sender`
- Try HTTP fallback if WebSocket fails (automatic)

**Wrong data?**
- The tracker reads directly from Claude's files
- If data is wrong, check the JSONL files in `~/.claude/projects/`

## Stop the Tracker

```bash
# Find the PID (shown when you start)
kill [PID]

# Or kill by name
pkill -f dashboard_sender.py
```

## Why This is Better

✅ **Simple** - Just 3 files instead of complex system
✅ **Direct** - Reads Claude's actual files
✅ **Real-time** - Updates every 5 seconds
✅ **Reliable** - Falls back to HTTP if WebSocket fails
✅ **Accurate** - 95% confidence from direct JSONL parsing

No more placeholder data on your dashboard! 🎉
