# Calendar Event Example - Visual Reference

**Purpose**: Show exactly what users will see when they import a Claude session calendar event

---

## Example Event: SESSION 10

### Calendar View (Mac)

```
┌────────────────────────────────────────────────────┐
│ October 3, 2025                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│ 2:00 PM - 5:00 PM                                  │
│ 🤖 Claude Session: SESSION 10 - Real Data         │
│    Integration                                     │
│                                                    │
│ [Reminders: 30 min, 5 min before]                 │
└────────────────────────────────────────────────────┘
```

### Event Details (Mac Calendar.app)

When user clicks on the event, they see:

```
╔════════════════════════════════════════════════════╗
║ 🤖 Claude Session: SESSION 10 - Real Data         ║
║    Integration & Dashboard Enhancement            ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║ 📅 October 3, 2025                                 ║
║ 🕐 2:00 PM - 5:00 PM                               ║
║                                                    ║
║ 📍 /Users/jordaaan/Library/Mobile Documents/...   ║
║                                                    ║
║ ────────────────────────────────────────────────── ║
║                                                    ║
║ Description:                                       ║
║                                                    ║
║ 🚀 QUICK START                                     ║
║ ═══════════════════════════════════════════════    ║
║                                                    ║
║ 🖥️  Mac (One-Click):                               ║
║    claude-session://start?plan=10&project=...     ║
║                                                    ║
║ 💻 Manual Command:                                 ║
║    cd /Users/jordaaan/Library/Mobile Documents/   ║
║       com~apple~CloudDocs/BHT Promo iCloud/...    ║
║    node dist/cli.js session start 10              ║
║                                                    ║
║ 📋 SESSION DETAILS                                 ║
║ ═══════════════════════════════════════════════    ║
║                                                    ║
║ Project: Claude Code Optimizer                    ║
║ Phase: SESSION 10 - Real Data Integration         ║
║ Model: claude-sonnet-4                            ║
║ Token Budget: 75,000                              ║
║                                                    ║
║ 🎯 Objectives:                                     ║
║    1. Integrate real Google Calendar data into    ║
║       dashboard                                    ║
║    2. Add frontend WebSocket handlers for live    ║
║       updates                                      ║
║    3. Implement session status tracking           ║
║    4. Enhance dashboard UI with real-time         ║
║       metrics                                      ║
║                                                    ║
║ ═══════════════════════════════════════════════    ║
║                                                    ║
║ 📱 iPhone: Copy the manual command above          ║
║ 🖥️  Mac: Click the URL or use calendar watcher    ║
║ 🤖 Auto: Run "calendar watch" to auto-start       ║
║                                                    ║
║ ────────────────────────────────────────────────── ║
║                                                    ║
║ 🔔 Alerts:                                         ║
║    • 30 minutes before                             ║
║    • 5 minutes before                              ║
║                                                    ║
║ 🏷️  Categories:                                    ║
║    Claude Code, Development, AI                   ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

## iPhone View

### Calendar List (iPhone)

```
┌──────────────────────────┐
│  October 2025            │
├──────────────────────────┤
│                          │
│ Fri  Oct 3               │
│                          │
│ 2:00 PM                  │
│ 🤖 Claude Session:        │
│ SESSION 10 - Real...     │
│                          │
│ [30m] [5m]               │
│                          │
└──────────────────────────┘
```

### Event Details (iPhone - Tapped)

```
┌──────────────────────────────────┐
│ ← October 2025                   │
├──────────────────────────────────┤
│                                  │
│ 🤖 Claude Session: SESSION 10 -  │
│    Real Data Integration &       │
│    Dashboard Enhancement         │
│                                  │
│ Friday, October 3, 2025          │
│ 2:00 PM - 5:00 PM                │
│                                  │
│ 📍 /Users/jordaaan/Library/...   │
│                                  │
│ [Show More ▼]                    │
│                                  │
├──────────────────────────────────┤
│ Description                      │
├──────────────────────────────────┤
│                                  │
│ 🚀 QUICK START                   │
│ ═══════════════════════          │
│                                  │
│ 🖥️  Mac (One-Click):             │
│ claude-session://start?plan=10   │
│ &project=...                     │
│                                  │
│ 💻 Manual Command:               │
│ cd /Users/jordaaan/Library/...  │
│ node dist/cli.js session         │
│ start 10                         │
│                                  │
│ 📋 SESSION DETAILS               │
│ ═══════════════════════          │
│                                  │
│ Project: Claude Code Optimizer  │
│ Phase: SESSION 10               │
│ Model: claude-sonnet-4          │
│ Token Budget: 75,000            │
│                                  │
│ 🎯 Objectives:                   │
│ 1. Integrate real Google...     │
│ 2. Add frontend WebSocket...    │
│ 3. Implement session...         │
│ 4. Enhance dashboard UI...      │
│                                  │
│ ═══════════════════════          │
│                                  │
│ 📱 iPhone: Copy the manual       │
│ command above                    │
│ 🖥️  Mac: Click the URL or use    │
│ calendar watcher                 │
│ 🤖 Auto: Run "calendar watch"    │
│ to auto-start                    │
│                                  │
├──────────────────────────────────┤
│                                  │
│ Alerts                           │
│ 30 minutes before                │
│ 5 minutes before                 │
│                                  │
└──────────────────────────────────┘
```

---

## User Workflows

### Mac Workflow (After Phase 2)

1. **Calendar reminder pops up** (30 min before)
   ```
   ┌─────────────────────────────────────┐
   │ ⏰ Reminder                          │
   ├─────────────────────────────────────┤
   │ 🤖 Claude Session: SESSION 10       │
   │                                     │
   │ Starting in 30 minutes              │
   │                                     │
   │ [Snooze] [View Event]               │
   └─────────────────────────────────────┘
   ```

2. **User clicks "View Event"**
   - Sees event details with URL

3. **User clicks URL** (after Phase 2 URL handler installed)
   ```
   claude-session://start?plan=10&project=/path/to/project
   ```

4. **Terminal opens automatically**
   ```bash
   $ cd /Users/jordaaan/Library/Mobile Documents/...
   $ node dist/cli.js session start 10

   🚀 Starting Claude Code session...
   📋 Loading SESSION 10 plan...
   ✅ Session started!
   ```

### iPhone Workflow (Manual - All Phases)

1. **Calendar reminder on iPhone** (30 min before)
   ```
   ┌────────────────────────────┐
   │ 🔔 In 30 minutes           │
   ├────────────────────────────┤
   │ 🤖 Claude Session:         │
   │ SESSION 10                 │
   │                            │
   │ [Snooze] [View]            │
   └────────────────────────────┘
   ```

2. **User taps "View"**
   - Opens Calendar app to event details

3. **User scrolls to "💻 Manual Command" section**
   - Sees full command text

4. **User press-and-holds on command text**
   ```
   ┌────────────────────────────┐
   │ cd /Users/jordaaan/...     │
   │ node dist/cli.js ...       │
   │                            │
   │ [Copy] [Select All]        │
   └────────────────────────────┘
   ```

5. **User taps "Copy"**
   - Command copied to clipboard

6. **User switches to laptop**
   - Opens Terminal

7. **User pastes and runs**
   ```bash
   # Cmd+V to paste
   $ cd /Users/jordaaan/Library/Mobile Documents/...
   $ node dist/cli.js session start 10

   # Press Enter
   🚀 Starting Claude Code session...
   ```

---

## Real .ics File Content

### Minimal Example

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Claude Code Optimizer//Calendar Integration//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Claude Code Sessions
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Automated Claude Code Optimizer Sessions
BEGIN:VEVENT
UID:test-session-10@claude-optimizer
DTSTAMP:20251003T203523Z
DTSTART:20251003T140000Z
DTEND:20251003T170000Z
SUMMARY:🤖 Claude Session: SESSION 10 - Real Data Integration
DESCRIPTION:🚀 QUICK START\n═══════════════════════════════════════\n\n
 🖥️  Mac (One-Click):\n   claude-session://start?plan=10\n\n💻 Manual
  Command:\n   cd /path/to/project\n   node dist/cli.js session start 10
 \n\n📋 SESSION DETAILS\n═══════════════════════════════════════\n\nProje
 ct: Claude Code Optimizer\nPhase: SESSION 10\nModel: claude-sonnet-4\nTo
 ken Budget: 75\,000\n\n🎯 Objectives:\n   1. Integrate real Google Calen
 dar data\n   2. Add frontend WebSocket handlers\n   3. Implement session
  status tracking\n   4. Enhance dashboard UI\n\n══════════════════════
 ═════════════════\n\n📱 iPhone: Copy the manual command above\n🖥️  Mac
 : Click the URL or use calendar watcher\n🤖 Auto: Run "calendar watch"
 to auto-start
LOCATION:/Users/jordaaan/Claude-Optimizer
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Claude session starting in 30 minutes
END:VALARM
BEGIN:VALARM
TRIGGER:-PT5M
ACTION:DISPLAY
DESCRIPTION:Claude session starting in 5 minutes
END:VALARM
CATEGORIES:Claude Code,Development,AI
COLOR:blue
END:VEVENT
END:VCALENDAR
```

Note: Line wrapping shown for readability. Actual file uses proper iCal line folding.

---

## Key Observations

### What Works Great ✅

1. **Emoji** - Render perfectly on all platforms
2. **Multi-line formatting** - Newlines (\\n) work correctly
3. **Manual commands** - Easy to copy-paste
4. **Reminders** - Both 30 min and 5 min alerts trigger
5. **Categories** - Event is properly categorized

### Platform Differences ⚠️

1. **Box-drawing characters** (═══)
   - Mac: Render perfectly
   - iPhone: May show as generic Unicode (still readable)
   - Google: May show as generic Unicode

2. **URL clickability**
   - Mac: Clickable after Phase 2 URL handler installed
   - iPhone: Never clickable (OS limitation)
   - Google: Shows as plain text

3. **Description length**
   - Mac: Full description shown
   - iPhone: Initially truncated, "Show More" to expand
   - Google: Wraps differently, still readable

### User Experience Notes

1. **Mac users** will get best experience:
   - One-click URL after Phase 2
   - Full formatting preserved
   - Calendar watcher auto-launch possible

2. **iPhone users** have functional workflow:
   - View event on phone
   - Copy command with press-and-hold
   - Run on laptop (2-device workflow)
   - Clear instructions provided

3. **Google Calendar users** work like iPhone:
   - No clickable URLs
   - Manual command copy-paste
   - Still very usable

---

## Summary

The calendar export creates **professional, standards-compliant** calendar events that:
- Display beautifully on Mac
- Work well on iPhone (with documented manual workflow)
- Are compatible with Google Calendar
- Include clear instructions for all platforms
- Provide both automated (Mac) and manual (universal) workflows

**The format is production-ready and user-friendly across all major platforms.**

---

**Last Updated**: 2025-10-03
**Session**: 11 - Phase 1
**Purpose**: Visual reference for calendar event format
