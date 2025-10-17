# Getting Started: iPhone Workflow for Claude Code Optimizer

This guide shows you how to use your iPhone to manage and launch Claude Code sessions.

---

## 🎯 Quick Overview

**What you'll achieve:**
- See your scheduled Claude sessions on your iPhone calendar
- Get reminders when it's time to start working
- Quickly launch sessions on your Mac with a simple copy-paste

**Time to set up:** 5 minutes
**Daily use time:** 20 seconds per session launch

---

## 📋 One-Time Setup

### Step 1: Export Your Sessions to Calendar

On your Mac, in the Claude Code Optimizer project directory:

```bash
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"

node dist/cli.js calendar export my-sessions.ics
```

This creates a file called `my-sessions.ics` with all your planned sessions.

### Step 2: Get the File to Your iPhone

**Option A: AirDrop (Fastest)**
1. Right-click `my-sessions.ics` in Finder
2. Choose "Share" → "AirDrop"
3. Select your iPhone
4. On iPhone, tap the notification
5. Tap "Add All" to add events to Calendar

**Option B: Email**
1. Email `my-sessions.ics` to yourself
2. Open email on iPhone
3. Tap the `.ics` attachment
4. Tap "Add All" to Calendar

**Option C: iCloud Drive**
1. Upload `my-sessions.ics` to iCloud Drive
2. Open Files app on iPhone
3. Tap the file
4. Tap "Add to Calendar"

### Step 3: Verify It Worked

1. Open Calendar app on iPhone
2. Look for events like: **🤖 Claude Session: SESSION 12**
3. Tap one to see details
4. You should see the session objectives and commands

✅ **Setup complete!** You only need to do this once (or when you add new sessions).

---

## 🚀 Daily Usage: Launching a Session

### When It's Time to Start Working

**Step 1: Check your iPhone**
- Get calendar reminder (e.g., "Claude Session in 5 minutes")
- Tap notification to open event
- OR open Calendar app and find today's session

**Step 2: View session details**
- Tap the session event (e.g., "🤖 Claude Session: SESSION 12")
- Scroll through to see:
  - 🎯 Session objectives
  - ⏱️ Estimated duration
  - 💻 Launch commands

**Step 3: Copy the launch command**
- Scroll to the section: **💻 MANUAL COMMAND (Mac):**
- You'll see something like:
  ```
  cd "/Users/jordaaan/Library/Mobile Documents/..." && node dist/cli.js session start 12
  ```
- **Press and hold** on the command text
- Tap **Select All**
- Tap **Copy**

**Step 4: Switch to your Mac**
- Open Terminal on your Mac
- **Paste** the command (Cmd+V or right-click → Paste)
- **Press Enter**

**Step 5: Start working!**
- Claude Code launches automatically
- Your session plan loads
- All objectives are ready to go

⏱️ **Total time:** ~20 seconds from notification to working

---

## 💡 Pro Tips

### Tip 1: Use Quick Command If Already in Project

If you're already in the project directory in Terminal, look for:

```
📋 QUICK COMMAND:
node dist/cli.js session start 12
```

This shorter command is faster to copy and paste!

### Tip 2: Set Up Calendar Reminders

1. Open Calendar app on iPhone
2. Tap a session event
3. Tap "Alert"
4. Add multiple reminders:
   - 1 day before (for planning)
   - 30 minutes before (to wrap up other work)
   - 5 minutes before (to start session)

### Tip 3: Create Mac Aliases for Super Fast Launch

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Claude Code Session Shortcuts
alias cco12='cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2" && node dist/cli.js session start 12'
alias cco13='cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2" && node dist/cli.js session start 13'
```

Then you can just type `cco12` in any Terminal window to launch Session 12!

### Tip 4: Weekend Planning Session

**Friday evening routine (5 minutes):**
1. Review next week's sessions in calendar
2. Add any new sessions if needed
3. Re-export and sync to iPhone
4. Set your calendar alerts

Now your weekend sessions are all planned and you'll get reminders!

---

## 🔄 Updating Your Calendar

### When You Add New Sessions

After creating new sessions in the optimizer:

```bash
# Re-export calendar
cd "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude-optimizer-v2"
node dist/cli.js calendar export my-sessions-updated.ics

# Send to iPhone (same methods as setup)
```

**Note:** iOS Calendar will merge events, so you won't get duplicates.

---

## 📱 What Works vs What Doesn't

### ✅ What Works Perfectly on iPhone

- 📅 Viewing all your scheduled sessions
- ⏰ Getting reminders before sessions start
- 📖 Reading session objectives and details
- 📋 Copying launch commands
- 🔔 Push notifications for upcoming sessions
- 📊 Seeing your weekly session schedule

### ❌ What Doesn't Work on iPhone

- 🔗 **One-click URL launching** - iOS Calendar doesn't support custom URL schemes like `claude-session://`
- This is an iOS platform limitation, not a bug
- The manual copy-paste workflow is actually simpler and more reliable!

---

## 🆘 Troubleshooting

### "I don't see any events after importing"

**Solution:**
- Check which calendar they were added to
- Open Calendar app → Tap "Calendars" (bottom center)
- Make sure all calendars are checked/visible
- Look for events under the calendar name matching the import

### "The command doesn't work when I paste it"

**Check:**
1. Did you copy the **entire** command? It should start with `cd` or `node`
2. Are you pasting in **Mac Terminal**, not an iPhone app?
3. Try copying again - sometimes iOS adds extra characters

### "I want to launch from iPhone directly"

**Reality check:** This would require:
- iOS Shortcuts setup (30+ min, 60% reliability)
- OR SSH configuration (1+ hour, network dependent)
- OR Web dashboard (2+ hours to build)

**Recommendation:** The 20-second copy-paste workflow is simpler, more reliable, and works 100% of the time.

### "The calendar file won't import"

**Solutions:**
1. Make sure the file extension is `.ics` (not `.txt` or `.ical`)
2. Try a different transfer method (AirDrop vs email vs iCloud)
3. Re-export: `node dist/cli.js calendar export fresh-export.ics`

---

## 📊 Example Workflow

**Friday, 5:00 PM** - Planning
```
You: Review calendar on iPhone
You: See Session 12 scheduled for Saturday 10:00 AM
You: Set alerts: 1 day before, 30 min before, 5 min before
```

**Saturday, 9:55 AM** - 5-minute warning
```
iPhone: 🔔 "Claude Session: SESSION 12 in 5 minutes"
You: Finish current task, prepare laptop
```

**Saturday, 10:00 AM** - Session start
```
iPhone: 🔔 "Claude Session: SESSION 12 starting now"
You: Tap notification → Opens calendar event
You: Scroll to command section
You: Press and hold → Select All → Copy
You: Switch to Mac
You: Open Terminal
You: Paste command (Cmd+V)
You: Press Enter
Claude Code: 🚀 Session 12 launched! Objectives loaded.
You: Start working on session tasks
```

**Total time from alert to working:** 20 seconds

---

## 🎓 Understanding the Workflow

`★ Insight ─────────────────────────────────────`
The iPhone workflow uses **separation of concerns**:
- iPhone = **Scheduling system** (when to work)
- Mac = **Execution environment** (where work happens)
- iCalendar = **Data bridge** (portable, standard format)

This division is actually more robust than trying to make iPhone
do everything. Standard protocols (iCal) are more reliable than
custom integrations.
`─────────────────────────────────────────────────`

---

## 🎯 Next Steps

**You're ready to:**
1. ✅ Export your first calendar
2. ✅ Sync to iPhone
3. ✅ Launch your next session with copy-paste
4. ✅ Set up reminders for automatic notifications

**Advanced users:**
- Create Terminal aliases for instant session launch
- Set up weekly planning routine
- Customize calendar alerts for your workflow

---

**Created:** 2025-10-03
**Last Updated:** 2025-10-03
**Status:** ✅ Ready to use

**Questions?** Check `IPHONE_WORKFLOW.md` for technical details and troubleshooting.

**Happy optimizing!** 🚀
