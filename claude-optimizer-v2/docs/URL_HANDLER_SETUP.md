# URL Handler Setup Guide

Enable one-click session launching from calendar events using `claude-session://` URLs.

## What This Does

Registers a custom URL scheme (`claude-session://`) on macOS so you can:
- Click links in calendar events to start sessions
- Launch sessions from browser/email/any app
- Automate session workflows with URLs

## Installation (30 seconds)

```bash
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"

# Install URL handler
./scripts/install-url-handler.sh
```

You'll see:
```
🔧 Claude Session URL Handler Installer
═══════════════════════════════════════════════════════════════

📝 Creating LaunchAgent configuration...
🚀 Registering URL handler...
📋 Registering with Launch Services...

✅ Installation complete!
```

## Usage

### From Calendar Events

After exporting calendar with enhanced descriptions:
```bash
node dist/cli.js calendar export sessions.ics
```

Calendar events will contain:
```
🚀 QUICK START
═══════════════════════════════════════

🖥️  Mac (One-Click):
   claude-session://start?plan=10&project=%2Fpath%2Fto%2Fproject

💻 Manual Command:
   cd /path/to/project
   node dist/cli.js session start 10
```

**On Mac**: Click the URL → Terminal opens → Session starts!

### From Command Line

Test the URL handler:
```bash
# Start SESSION 10 in current project
open "claude-session://start?plan=10&project=$PWD"

# Start specific plan in specific project
open "claude-session://start?plan=SESSION_10_PLAN&project=/full/path"
```

### From Browser/Email

Any app that recognizes URLs will work:
- Email: Click link → Terminal launches
- Browser: Navigate to URL → Terminal launches
- Slack/Discord: Click link → Terminal launches

## URL Format

```
claude-session://start?plan=<identifier>&project=<path>
```

### Parameters

**plan** (required):
- Session plan identifier
- Examples: `10`, `SESSION_10_PLAN`, `SESSION_10`
- Matches files in `docs/planning/SESSION_*_PLAN.md`

**project** (optional):
- Full path to project directory
- URL-encoded (spaces become `%20`, `/` becomes `%2F`)
- Defaults to optimizer project root if omitted

### Examples

```bash
# Minimal - uses current project
claude-session://start?plan=10

# With project path
claude-session://start?plan=10&project=/Users/me/my-project

# URL-encoded path with spaces
claude-session://start?plan=SESSION_11_PLAN&project=/Users/me/My%20Project

# Multiple parameters (order doesn't matter)
claude-session://start?project=/path&plan=10
```

## How It Works

### Architecture

```
1. User clicks URL in calendar/browser/email
2. macOS recognizes claude-session:// scheme
3. LaunchAgent triggers handle-session-url.sh
4. Script parses URL parameters (plan, project)
5. Script validates plan exists and project path
6. AppleScript opens new Terminal window
7. Terminal runs: cd <project> && node dist/cli.js session start <plan>
8. Claude Code launches with SESSION plan objectives
```

### Files Created

```
~/Library/LaunchAgents/
  com.claude.session-launcher.plist    # macOS LaunchAgent config

~/.claude-optimizer/
  url-handler.log                      # Debug log (created on first use)

scripts/
  install-url-handler.sh               # Installer
  handle-session-url.sh                # URL processor
  uninstall-url-handler.sh             # Remover
```

## Troubleshooting

### URL doesn't launch Terminal

**Check if handler is registered**:
```bash
launchctl list | grep claude
# Should show: com.claude.session-launcher
```

**Re-register**:
```bash
./scripts/uninstall-url-handler.sh
./scripts/install-url-handler.sh
```

### "Invalid URL scheme" error

- Ensure URL starts with `claude-session://`
- Check for typos in scheme name
- Verify URL encoding (use `encodeURIComponent()` for paths)

### "Session plan not found" error

- Verify plan exists: `node dist/cli.js session list`
- Check plan identifier matches filename
- Ensure you're in correct project directory

### Terminal opens but nothing happens

**Check debug log**:
```bash
tail -f ~/.claude-optimizer/url-handler.log
```

**Test handler directly**:
```bash
./scripts/handle-session-url.sh "claude-session://start?plan=10"
```

### Permission denied

**Make scripts executable**:
```bash
chmod +x scripts/*.sh
```

## Security Considerations

### What the Handler Can Do
- ✅ Launch Terminal windows
- ✅ Run commands in your project directory
- ✅ Access SESSION plan files

### What the Handler Cannot Do
- ❌ Run arbitrary commands (only `session start` with plan)
- ❌ Access files outside project directory
- ❌ Execute without your explicit URL click
- ❌ Run in background (always visible in Terminal)

### Validation Steps
1. URL must start with `claude-session://`
2. Command must be exactly `start`
3. Plan must exist in `docs/planning/`
4. Project path must be valid directory
5. All parameters logged to `~/.claude-optimizer/url-handler.log`

## Uninstall

Remove URL handler completely:
```bash
./scripts/uninstall-url-handler.sh
```

This will:
- Unload the LaunchAgent
- Remove plist file
- Clear Launch Services cache
- `claude-session://` URLs will no longer work

To reinstall later, just run `install-url-handler.sh` again.

## Advanced Usage

### Custom Terminal App

By default, URLs open in Terminal.app. To use iTerm2 or other:

Edit `scripts/handle-session-url.sh`:
```bash
# Change this:
tell application "Terminal"

# To this:
tell application "iTerm"
```

### Logging

Debug log location:
```bash
~/.claude-optimizer/url-handler.log
```

View live:
```bash
tail -f ~/.claude-optimizer/url-handler.log
```

### Testing Without Calendar

Create test HTML file:
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Test Session Launcher</h1>
  <a href="claude-session://start?plan=10">Launch SESSION 10</a>
</body>
</html>
```

Open in browser and click link.

## Integration with Calendar Export

The URL handler works seamlessly with enhanced calendar export:

```bash
# 1. Export calendar with URL links
node dist/cli.js calendar export sessions.ics

# 2. Import to Calendar app (Mac) or iPhone
# Double-click sessions.ics or AirDrop to iPhone

# 3. On Mac: Click URL in event → Session starts
# 3. On iPhone: Copy manual command → SSH to Mac → Paste
```

## Next Steps

- ✅ Install handler: `./scripts/install-url-handler.sh`
- ✅ Test with: `open "claude-session://start?plan=10"`
- ✅ Export calendar: `node dist/cli.js calendar export sessions.ics`
- ✅ Import to Calendar.app or iPhone
- ✅ Click URL in calendar event
- ✅ Watch Terminal open and session start!

---

**Pro Tip**: Create a Keyboard Maestro or Alfred workflow that generates these URLs for quick session launching from anywhere on your Mac!
