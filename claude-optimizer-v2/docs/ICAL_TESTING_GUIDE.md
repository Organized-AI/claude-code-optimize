# iCal Testing Quick Reference Guide

**Purpose**: Quick instructions for testing calendar export functionality
**For**: Session 11 validation and future QA

---

## Quick Test (2 minutes)

### Generate Test File
```bash
cd /path/to/claude-optimizer-v2

node -e "
import { IcalValidator } from './dist/ical-validator.js';
import { writeFile } from 'fs/promises';

const content = \`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Claude Code Optimizer//Calendar Integration//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Claude Code Sessions
X-WR-TIMEZONE:UTC
BEGIN:VEVENT
UID:test-session@claude-optimizer
DTSTAMP:20251003T120000Z
DTSTART:20251003T140000Z
DTEND:20251003T170000Z
SUMMARY:🤖 Test Claude Session
DESCRIPTION:🚀 QUICK START\\\\n\\\\n🖥️  Mac: claude-session://start?plan=10\\\\n💻 Manual: cd ~/project && node dist/cli.js session start 10
LOCATION:/Users/test/project
CATEGORIES:Claude Code,Development
END:VEVENT
END:VCALENDAR\`;

await writeFile('test-quick.ics', content.split('\\n').join('\\r\\n'));
const validator = new IcalValidator();
console.log(validator.generateReport(content));
"
```

### Test Import (Mac)
```bash
open test-quick.ics
```

**Expected**: Calendar.app opens with import dialog

---

## Validation Checks

### ✅ Must Pass
- [ ] File opens in Calendar.app (Mac)
- [ ] Event has title with emoji (🤖)
- [ ] Date/time displayed correctly
- [ ] Description shows "QUICK START" section
- [ ] URLs visible in description
- [ ] Manual commands visible

### ⚠️  Should Check
- [ ] Emoji render correctly (Mac: yes, iPhone: usually)
- [ ] Multi-line formatting preserved
- [ ] Box-drawing characters display (Mac: yes, iPhone: maybe)

### ❌ Known Limitations
- [ ] Custom URL (`claude-session://`) **not clickable** until handler installed (Phase 2)
- [ ] iPhone: URL will **never** be clickable (no iOS handler)
- [ ] Google Calendar: URL shows as plain text

---

## Platform Testing Matrix

| Platform | Import Method | Expected Result | Notes |
|----------|---------------|-----------------|-------|
| **Mac Calendar** | `open file.ics` | ✅ Full support | URLs clickable after Phase 2 |
| **iPhone Calendar** | AirDrop or email | ✅ Works, manual commands only | Copy-paste workflow |
| **Google Calendar** | Web import | ✅ Works, plain text URLs | Use manual commands |
| **Outlook** | Import .ics | ⚠️  Should work | Untested, RFC compliant |

---

## Validation Report

### Run Validator
```bash
cd /path/to/claude-optimizer-v2

node -e "
import { IcalValidator } from './dist/ical-validator.js';
import { readFile } from 'fs/promises';

const content = await readFile('test-session.ics', 'utf-8');
const validator = new IcalValidator();
console.log(validator.generateReport(content));
"
```

### Expected Output
```
iCal Validation Report
============================================================

✅ Status: VALID

Format:
  - Has VCALENDAR: ✅
  - Has Events: ✅
  - Event Count: 1
  - Required Fields: ✅

Warnings:
  ⚠️  Line 15 exceeds 75 characters (should be folded)
  ⚠️  Using LF instead of CRLF line endings (may cause issues on some platforms)

Calendar App Compatibility:

  Apple Calendar (Mac):
    ✅ Compatible
      - Custom URL scheme - clickable on Mac if handler installed
      - Contains emoji - should render correctly

  Google Calendar:
    ✅ Compatible
      - Custom URL scheme - may show as plain text in web version
      - Contains emoji - should render correctly

  iPhone Calendar:
    ✅ Compatible
      - Custom URL scheme - will not be clickable (no handler)
      - Contains emoji - should render correctly
      - Box-drawing characters may not display correctly on all devices
```

---

## iPhone Testing Workflow

### Setup (One-Time)
1. Generate test file on Mac (see above)
2. AirDrop to iPhone **OR** email to yourself
3. Open on iPhone

### Import
1. Tap .ics file attachment
2. Tap "Add to Calendar"
3. Select calendar

### Verify
1. Open Calendar app
2. Navigate to test date
3. Tap event
4. Tap event details to expand

### Test Copy-Paste (Critical for iPhone)
1. Scroll to "💻 Manual Command:" section
2. **Press and hold** on command text
3. Tap "Select All"
4. Tap "Copy"
5. Switch to laptop
6. Open Terminal
7. Paste (Cmd+V)
8. **Verify**: Command is correct and complete

**Example Command**:
```bash
cd /Users/jordaaan/Library/Mobile\ Documents/com~apple~CloudDocs/BHT\ Promo\ iCloud/Organized\ AI/Windsurf/Claude\ Code\ Optimizer
node dist/cli.js session start 10
```

---

## Troubleshooting

### "File won't open on Mac"
**Cause**: Invalid iCal format
**Fix**: Run validator, check for errors
```bash
node -e "import('./dist/ical-validator.js').then(m => new m.IcalValidator().validateIcal(...))"
```

### "Event shows but description is garbled"
**Cause**: Escaping issue
**Check**:
- Backslashes should be `\\`
- Newlines should be `\n` (escaped)
- Semicolons should be `\;`

### "iPhone won't import"
**Cause**: File transfer issue or invalid format
**Fix**:
1. Try different transfer method (email vs AirDrop)
2. Verify file is complete (not truncated)
3. Check file size (should be < 10KB for single event)

### "URLs not clickable"
**Status**: **EXPECTED** until Phase 2
**Why**: URL handler not installed yet
**When**: Phase 2 will make `claude-session://` clickable on Mac
**iPhone**: Will **never** be clickable (use copy-paste workflow)

---

## Quick Validation Checklist

Before committing changes to calendar export:

```bash
# 1. Build
npm run build

# 2. Generate test file
node dist/scripts/test-ical-generation.js  # (when created)

# 3. Validate format
# (validator runs automatically during export)

# 4. Import test
open test-session.ics

# 5. Visual check
# - Event appears
# - Description formatted
# - Commands visible

# 6. Delete test event
# (clean up after testing)
```

---

## RFC 5545 Quick Reference

### Required VCALENDAR Properties
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your Org//Product//EN
[events...]
END:VCALENDAR
```

### Required VEVENT Properties
```
BEGIN:VEVENT
UID:unique-id@domain
DTSTAMP:20251003T120000Z
DTSTART:20251003T140000Z
DTEND:20251003T170000Z       (or DURATION)
SUMMARY:Event Title
END:VEVENT
```

### Date Format
```
YYYYMMDDTHHmmssZ
^^^^^^^^ ^^^^^^ ^
Date     Time   UTC

Example: 20251003T140000Z = Oct 3, 2025, 2:00 PM UTC
```

### Escaping Rules
```
\         → \\
;         → \;
,         → \,
newline   → \n
```

---

## Success Criteria

### ✅ Phase 1 Complete When:
- [x] Test file generated successfully
- [x] Validation report shows "VALID"
- [x] Mac Calendar import works
- [x] Description formatting preserved
- [x] URLs and commands visible
- [x] Documentation complete

### 🚀 Ready for Phase 2 When:
- [x] All Phase 1 criteria met
- [x] URL format verified (`claude-session://start?plan=X`)
- [x] Manual workflow documented (especially iPhone)
- [x] Known limitations documented

---

**Last Updated**: 2025-10-03
**Session**: 11 - Phase 1 Validation
**Status**: ✅ Complete
