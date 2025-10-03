# Weekend Quick Start Guide

Use Claude Code calendar integration from your laptop + iPhone while away from your main computer.

## Before You Leave (5 minutes)

### 1. Set Up OAuth (One-Time)

```bash
# On your main computer
cd ~/path/to/claude-optimizer-v2

# Download credentials from Google Cloud Console
# (see CALENDAR_SETUP.md for detailed instructions)

# Copy credentials to config dir
mkdir -p ~/.claude-optimizer
cp ~/Downloads/client_secret_*.json ~/.claude-optimizer/credentials.json

# Test authentication
npm run build
node dist/cli.js calendar list
# This will open browser and ask you to authorize
```

### 2. Schedule Your Weekend Sessions

```bash
# Analyze your project
node dist/cli.js analyze /path/to/your/project

# Create calendar schedule
node dist/cli.js calendar schedule /path/to/your/project \
  --start-hour 9 \
  --end-hour 17 \
  --days sat,sun

# Verify sessions were created
node dist/cli.js calendar list
```

### 3. Export for iPhone

```bash
# Export to iCal format
node dist/cli.js calendar export ~/sessions.ics

# AirDrop to your iPhone
# Or email to yourself
```

## On Your Laptop This Weekend

### Option A: Use Google Calendar (Easiest)

1. Install Google Calendar app on iPhone
2. Sign in with same Google account
3. All sessions appear automatically
4. Works completely offline after sync

### Option B: Use Mobile Web Viewer

```bash
# On laptop, start the server
cd ~/path/to/claude-optimizer-v2
node dist/cli.js calendar serve --port 8080

# The server will show URLs like:
# → http://192.168.1.100:8080

# On iPhone:
# 1. Connect to same WiFi
# 2. Open that URL in Safari
# 3. Add to Home Screen for quick access
```

### Option C: Use Native iPhone Calendar

```bash
# If you exported .ics file before:
# 1. Open Mail on iPhone
# 2. Open email with sessions.ics attachment
# 3. Tap the .ics file
# 4. Tap "Add All" to import to Calendar app
```

## Running Sessions

### Manual Approach

1. Check calendar for next session
2. Open terminal on laptop
3. Navigate to project directory
4. Start Claude Code session
5. Work through the objectives listed in calendar

### Automated Approach (Recommended)

```bash
# Start the calendar watcher
node dist/cli.js calendar watch

# This will:
# ✓ Monitor calendar for upcoming sessions
# ✓ Show notifications 30 and 5 minutes before
# ✓ Auto-start Claude Code at scheduled time
# ✓ Track progress and token usage
# ✓ Complete automatically when done

# Keep this running in a terminal window
```

## Quick Commands Reference

```bash
# Change to project directory
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"

# List upcoming sessions
node dist/cli.js calendar list

# Start calendar watcher (auto-start sessions)
node dist/cli.js calendar watch

# Start mobile web viewer
node dist/cli.js calendar serve --port 8080

# Export to iPhone calendar
node dist/cli.js calendar export ~/Desktop/sessions.ics

# View calendar help
node dist/cli.js calendar --help
```

## Viewing Schedule on iPhone

### Google Calendar App

- **Download**: App Store → "Google Calendar"
- **Setup**: Sign in with Google account
- **View**: All Claude sessions appear with 🤖 emoji
- **Details**: Tap event to see objectives, model, token budget
- **Notifications**: Get alerts 30 and 5 minutes before

### Native Calendar App (iOS)

- **Import**: Open .ics file from Mail or Files app
- **View**: Events appear in Calendar app
- **Limitations**: Need to re-import if schedule changes

### Mobile Web (Safari)

- **Access**: http://YOUR_LAPTOP_IP:8080
- **Features**: Live countdown, session details, objectives
- **Offline**: Doesn't work offline (needs laptop running)
- **Tip**: Add to Home Screen for app-like experience

## Troubleshooting

### "Authentication failed"

```bash
# Clear token and re-authenticate
rm ~/.claude-optimizer/token.json
node dist/cli.js calendar list
# Browser will open for fresh login
```

### Can't access mobile web viewer from iPhone

- Verify laptop and iPhone on same WiFi
- Check firewall isn't blocking port 8080
- Try accessing `http://localhost:8080` on laptop first
- Use IP address shown by server, not hostname

### Sessions not appearing in Google Calendar

- Wait 1-2 minutes for sync
- Pull down to refresh in mobile app
- Verify authentication: `node dist/cli.js calendar list`
- Check you're signed in to correct Google account

### Calendar watcher not auto-starting sessions

- Ensure watcher is running: `node dist/cli.js calendar watch`
- Check system time is correct
- Verify session start time hasn't passed
- Look for error messages in terminal

## Tips for Success

1. **Keep watcher running**: Use `tmux` or `screen` to persist terminal session
2. **Set realistic times**: Schedule sessions when you'll actually be available
3. **Check night before**: Run `calendar list` to verify schedule
4. **Charge devices**: Make sure laptop has power for long sessions
5. **Backup plan**: Keep .ics file handy in case you need to re-import

## Weekend Workflow Example

**Friday Evening** (Setup)
```bash
# Schedule weekend sessions
node dist/cli.js calendar schedule ~/my-project \
  --start-hour 9 \
  --end-hour 17 \
  --days sat,sun

# Export to iPhone
node dist/cli.js calendar export ~/sessions.ics
# AirDrop to phone
```

**Saturday Morning** (Start Working)
```bash
# Start calendar watcher
node dist/cli.js calendar watch

# Optional: Start mobile viewer
node dist/cli.js calendar serve --port 8080
```

**During Weekend** (Check Progress)
- iPhone: Open Google Calendar to see what's next
- Laptop: Watcher shows countdown and auto-starts sessions
- Between sessions: Check token usage and context status

**Sunday Evening** (Review)
```bash
# Check completed sessions
node dist/cli.js calendar list

# View session history
node dist/cli.js status
```

## Advanced: Run Watcher in Background

```bash
# Install tmux (if not installed)
brew install tmux

# Start tmux session
tmux new -s claude-watcher

# Inside tmux, start watcher
cd ~/path/to/claude-optimizer-v2
node dist/cli.js calendar watch

# Detach from tmux (watcher keeps running)
# Press: Ctrl+B, then D

# Re-attach later
tmux attach -t claude-watcher

# Kill tmux session when done
tmux kill-session -t claude-watcher
```

## Getting Help

- **Full setup guide**: See [CALENDAR_SETUP.md](./CALENDAR_SETUP.md)
- **All commands**: Run `node dist/cli.js calendar --help`
- **Test features**: Follow instructions in setup guide
- **Report issues**: Check error messages, try re-authentication

---

**Have a productive weekend!** 🚀

Your calendar will keep you on track, the watcher will auto-start sessions, and your iPhone will keep you informed of what's coming up.
