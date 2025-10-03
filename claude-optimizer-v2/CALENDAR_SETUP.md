# Calendar Integration Setup Guide

Get your Claude Code sessions scheduled and accessible from any device (laptop, phone, calendar apps).

## Quick Start (5 minutes)

### 1. Get Google Calendar API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable the **Google Calendar API**:
   - Search for "Google Calendar API" in the search bar
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth client ID**
   - Select **Application type: Desktop app**
   - Give it a name (e.g., "Claude Code Optimizer")
   - Click **Create**
5. Download the credentials:
   - Click the download icon (⬇️) next to your new OAuth client
   - Save the JSON file

### 2. Install Credentials

```bash
# Create config directory
mkdir -p ~/.claude-optimizer

# Copy your downloaded credentials file
cp ~/Downloads/client_secret_*.json ~/.claude-optimizer/credentials.json
```

### 3. Test Authentication

```bash
cd /Users/jordaaan/Library/Mobile\ Documents/com~apple~CloudDocs/BHT\ Promo\ iCloud/Organized\ AI/Windsurf/Claude\ Code\ Optimizer/claude-optimizer-v2

npm run build
node dist/cli.js calendar list
```

This will:
- Open your browser for Google OAuth
- Ask you to authorize the app
- Save an auth token for future use
- Show your upcoming Claude sessions (empty at first)

## Using the Calendar Integration

### Schedule Sessions for a Project

```bash
# Analyze your project first
claude-optimizer analyze /path/to/your/project

# Create calendar schedule
claude-optimizer calendar schedule /path/to/your/project
```

This creates Google Calendar events with:
- Session objectives and phase info
- Automatic reminders (30 min and 5 min before)
- Smart scheduling in your working hours
- All session config stored in event metadata

### View Upcoming Sessions

```bash
# List all scheduled sessions
claude-optimizer calendar list

# Start watching for upcoming sessions
claude-optimizer calendar watch
```

The watcher will:
- Check every 5 minutes for upcoming sessions
- Show warnings 30 and 5 minutes before start
- Auto-start sessions at scheduled time
- Monitor session progress live

### Export to iPhone Calendar (iCal)

```bash
# Export sessions as .ics file
claude-optimizer calendar export sessions.ics
```

Then:
1. **On Mac**: Double-click `sessions.ics` to import to Calendar.app
2. **On iPhone**: AirDrop the file or email it to yourself, tap to import
3. All sessions appear in your native calendar app (works offline!)

## Mobile Access

### Option 1: Google Calendar App (Recommended)
- Install Google Calendar on iPhone
- Sign in with same Google account
- Sessions appear automatically
- Full event details including objectives

### Option 2: Native iPhone Calendar
- Use iCal export (see above)
- Import .ics file to Calendar app
- Works completely offline
- Re-export when schedule changes

### Option 3: Web Dashboard
```bash
# Start the mobile-friendly viewer
claude-optimizer calendar serve --port 8080
```

Then on your phone:
- Connect to same WiFi
- Visit: `http://YOUR_LAPTOP_IP:8080`
- Bookmark for quick access

## Weekend Usage Scenario

You're at home with just laptop + iPhone, no access to your main work computer:

### Setup (One-time, 2 minutes)
```bash
# On your laptop, ensure you have the optimizer
git clone https://github.com/yourusername/claude-code-optimizer.git
cd claude-code-optimizer/claude-optimizer-v2
npm install
npm run build

# Copy credentials from main computer OR set up new ones (see above)
cp /path/to/credentials.json ~/.claude-optimizer/credentials.json
```

### Using It
```bash
# View what's scheduled
node dist/cli.js calendar list

# Start the watcher (leave it running)
node dist/cli.js calendar watch

# Export to iPhone calendar
node dist/cli.js calendar export ~/sessions.ics
# Then AirDrop to iPhone or email yourself
```

The calendar watch will:
- Monitor for session start times
- Show macOS notifications
- Auto-start Claude Code sessions
- Track progress and objectives

## Troubleshooting

### "Failed to load OAuth credentials"
- Check that `~/.claude-optimizer/credentials.json` exists
- Verify it's a valid OAuth 2.0 Desktop app credential
- Download fresh credentials from Google Cloud Console

### "Authentication failed" or "Token expired"
```bash
# Clear saved token and re-authenticate
rm ~/.claude-optimizer/token.json
claude-optimizer calendar list  # Will trigger new auth flow
```

### "No sessions found"
- First run `claude-optimizer analyze <project>`
- Then run `claude-optimizer calendar schedule <project>`
- Sessions only appear after scheduling

### Port 3000 already in use (OAuth callback)
The OAuth flow uses `localhost:3000` temporarily. If something else is using it:
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it temporarily
kill -9 <PID>

# Or wait - the OAuth server stops after authentication
```

## Configuration Options

### Custom Working Hours
When scheduling, you can specify:

```bash
claude-optimizer calendar schedule /path/to/project \
  --start-hour 9 \
  --end-hour 17 \
  --days mon,tue,wed,thu,fri \
  --timezone "America/Los_Angeles"
```

### Custom Session Length
```bash
claude-optimizer calendar schedule /path/to/project \
  --session-length 3  # hours per session
```

## Security Notes

- OAuth tokens are stored in `~/.claude-optimizer/token.json`
- This gives calendar read/write access
- Token can be revoked at: https://myaccount.google.com/permissions
- credentials.json should not be shared publicly
- Add `.claude-optimizer/` to `.gitignore`

## Files Created

```
~/.claude-optimizer/
  ├── credentials.json    # OAuth client credentials (from Google)
  ├── token.json          # Saved auth token (auto-generated)
  └── optimizer.db        # Session history and analysis
```

## Next Steps

1. ✅ Set up credentials
2. ✅ Test with `calendar list`
3. 📅 Schedule your first project
4. 📱 Export to iPhone or use Google Calendar app
5. 👁️ Run `calendar watch` when ready to work
6. 🚀 Let automation handle the rest!

---

**Pro Tip**: Run `calendar watch` in a tmux/screen session so it persists even if you close your terminal. It will keep monitoring and auto-starting sessions based on your calendar.
