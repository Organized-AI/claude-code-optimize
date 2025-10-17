# Quick Start - Claude Code Optimizer

**One-page guide to get started in 2 minutes**

---

## 🚀 Installation (One-Time Setup)

```bash
# 1. Navigate to project
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"

# 2. Install URL handler (Mac only)
./scripts/install-url-handler.sh

# 3. Test it works
open "claude-session://start?plan=SESSION_11_PLAN_REVISED"
```

**Expected**: Terminal opens with session loaded ✅

---

## 📅 Daily Usage

### Create Weekend Schedule
```bash
# Export sessions to calendar
node dist/cli.js calendar export weekend.ics

# Import to iPhone
# - AirDrop weekend.ics to iPhone
# - Tap file → Add to Calendar
```

### Start Session (Mac)
```bash
# Option 1: One-click from calendar
# Click URL in Calendar.app event → Terminal opens automatically

# Option 2: Manual command
node dist/cli.js session start 12
```

### Start Session (iPhone)
```bash
# 1. Open Calendar → View event
# 2. Copy manual command (press & hold → Select All → Copy)
# 3. On Mac: Open Terminal → Paste → Enter
```

---

## 🔍 Common Commands

```bash
# Start a session
node dist/cli.js session start <plan_number>

# Export calendar
node dist/cli.js calendar export <filename.ics>

# Run dashboard
npm run dashboard

# Run security tests
./scripts/test-security.sh

# Run QA tests
./scripts/run-qa-tests.sh

# Check logs
tail -f ~/.claude-optimizer/url-handler.log
```

---

## 🆘 Troubleshooting

### URL Handler Not Working

**Symptom**: Clicking `claude-session://` URL does nothing

**Fix**:
```bash
# Reinstall URL handler
./scripts/uninstall-url-handler.sh
./scripts/install-url-handler.sh

# Verify it's loaded
launchctl list | grep claude
```

### Terminal Opens But Error

**Symptom**: Terminal opens, shows error message

**Check**:
```bash
# 1. Is Node.js installed?
node --version  # Should show v18+

# 2. Is project built?
ls dist/cli.js  # Should exist

# 3. Check logs
cat ~/.claude-optimizer/url-handler.log
```

### iPhone URLs Not Clickable

**This is NORMAL**: iOS doesn't support custom URL schemes in Calendar

**Solution**: Use manual copy-paste workflow (see `docs/IPHONE_WORKFLOW.md`)

---

## 📚 Full Documentation

- **Security**: `scripts/lib/README.md`
- **QA Testing**: `docs/QA_README.md`
- **iPhone Workflow**: `docs/IPHONE_WORKFLOW.md`
- **Session Planning**: `docs/planning/SESSION_*_PLAN.md`
- **Handoffs**: `SESSION_*_HANDOFF.md`

---

## 💡 Pro Tips

1. **Create aliases** in `~/.zshrc`:
   ```bash
   alias cco='cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"'
   alias s12='cco && node dist/cli.js session start 12'
   ```

2. **Use calendar reminders** - 30 min and 5 min before sessions

3. **Check dashboard** before starting - see token usage in real-time

4. **Run QA tests** before deploying changes

---

**Need Help?** See full docs in `docs/` directory or check `SESSION_11_HANDOFF.md` for detailed setup.

**Created**: 2025-10-03 | **Session**: 11 | **Status**: ✅ Complete
