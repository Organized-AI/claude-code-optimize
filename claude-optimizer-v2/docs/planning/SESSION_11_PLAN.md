# Session 11: One-Tap Session Launch - iCal + URL Handler Integration

**Status**: 🟢 READY TO START
**Estimated Time**: 2.5-3.5 hours
**Estimated Tokens**: 45-60k tokens (23-30% of Pro quota)
**Fits Pro Quota**: ✅ YES (with 140-155k buffer)
**Prerequisites**: SESSION 10 complete (session start command working)
**Created**: 2025-10-03

---

## Executive Summary

**What We Have Now** (Session 10 Result):
- ✅ `session start <plan>` command works perfectly
- ✅ SESSION plans parse correctly with all objectives
- ✅ iCal export creates `.ics` files for iPhone
- ✅ Manual workflow: iPhone calendar → copy command → laptop terminal

**What's Still Manual**:
- ❌ User must read calendar on iPhone
- ❌ User must type command on laptop
- ❌ No one-tap/one-click session start
- ❌ Calendar events don't include actionable links

**This Session Delivers**:
- ✅ Calendar events contain session start command
- ✅ Mac URL handler (`claude-session://`) for one-click launch
- ✅ Enhanced iCal export with clickable instructions
- ✅ Optional: iOS Shortcuts for remote session start
- ✅ End-to-end tested workflow from iPhone to session

---

## Session Objectives

1. **Enhanced Calendar Export** - Add session start commands to iCal descriptions
2. **Mac URL Handler** - One-click session launch from calendar on Mac
3. **Installation Scripts** - Easy setup for URL scheme on macOS
4. **iOS Integration** - Shortcuts or fallback methods for iPhone
5. **Testing Suite** - Verify full workflow works reliably
6. **Documentation** - Clear setup guide for weekend use

---

## Phase Breakdown

### Phase 1: Enhanced Calendar Export with Commands (30 min, 8-12k tokens)

**Objective**: Make calendar events actionable with embedded commands

**Tasks**:
1. Modify `calendar-service.ts` → `exportToIcal()` method
2. Enhance event description to include:
   - Session start command (copy-paste ready)
   - URL scheme link (`claude-session://start?plan=10`)
   - Quick instructions for different devices
3. Add SESSION plan reference to event metadata
4. Format description for readability on iPhone

**Deliverables**:
- Enhanced iCal export with actionable commands
- Well-formatted multi-device instructions
- Tested `.ics` file imports correctly

**Test**:
```bash
node dist/cli.js calendar export test.ics
# Import to iPhone → verify commands are readable and copy-pasteable
```

---

### Phase 2: Mac URL Scheme Handler (45 min, 12-18k tokens)

**Objective**: Enable one-click session launch from Mac calendar/browser

**Tasks**:
1. Create `scripts/install-url-handler.sh`
   - Register `claude-session://` URL scheme
   - Create LaunchAgent plist
   - Handle macOS permissions

2. Create `scripts/handle-session-url.sh`
   - Parse URL: `claude-session://start?plan=10&project=/path`
   - Validate parameters
   - Launch session via CLI
   - Open terminal window for visibility

3. Create `scripts/uninstall-url-handler.sh`
   - Clean uninstall script

**URL Format**:
```
claude-session://start?plan=SESSION_10_PLAN&project=/full/path/to/project
```

**Deliverables**:
- Working URL handler on macOS
- Installation script with error handling
- Uninstall script for cleanup

**Test**:
```bash
# Install handler
./scripts/install-url-handler.sh

# Test URL
open "claude-session://start?plan=10&project=$PWD"

# Should: Open terminal, launch session with SESSION 10 objectives
```

---

### Phase 3: Calendar Integration Enhancement (30 min, 8-12k tokens)

**Objective**: Connect SESSION plans to calendar events

**Tasks**:
1. Modify `calendar-service.ts` → `createSessionSchedule()`
   - Accept optional SESSION plan reference
   - Store plan name in event metadata
   - Build description with plan details

2. Create new command: `calendar schedule-session <plan>`
   - Parse SESSION plan first
   - Create calendar event with plan objectives
   - Include URL handler link
   - Set smart reminders

3. Update `calendar-watcher.ts`
   - Detect SESSION plan in event metadata
   - Use `session-plan-parser.ts` to load objectives
   - Launch with enhanced prompt

**Deliverables**:
- `calendar schedule-session` command
- Calendar watcher SESSION plan integration
- Event metadata includes plan reference

**Test**:
```bash
# Schedule SESSION 10
node dist/cli.js calendar schedule-session 10

# Verify event created with:
# - SESSION 10 objectives in description
# - URL handler link
# - Plan metadata
```

---

### Phase 4: iOS Integration Options (30 min, 8-10k tokens)

**Objective**: Enable session start from iPhone (best-effort)

**Approach A: iOS Shortcuts** (Preferred if user has Mac nearby):
1. Create Shortcut that:
   - Receives URL from calendar
   - Extracts plan name
   - SSHs to Mac
   - Runs session start command

**Approach B: Manual Workflow** (Fallback):
1. Enhanced calendar description shows:
   - Clear command to copy
   - SSH command for remote access
   - Step-by-step instructions

**Deliverables**:
- iOS Shortcut template (if feasible)
- Fallback manual workflow documented
- Clear iPhone usage guide

---

### Phase 5: Testing & Documentation (30 min, 6-8k tokens)

**Objective**: Ensure everything works end-to-end

**Testing Checklist**:
- [ ] Export calendar with SESSION plan
- [ ] Import to iPhone Calendar
- [ ] Click URL on Mac → session starts
- [ ] Calendar watcher auto-starts with plan
- [ ] iPhone workflow (Shortcut or manual)
- [ ] Error handling (missing plan, wrong URL)
- [ ] Uninstall URL handler cleanly

**Documentation**:
1. Update `WEEKEND_SESSION_GUIDE.md`
   - Add URL handler setup
   - Add iPhone workflows
   - Add troubleshooting

2. Create `URL_HANDLER_SETUP.md`
   - Detailed installation guide
   - Security considerations
   - Customization options

**Deliverables**:
- Complete test suite passing
- Updated user documentation
- Setup guide for URL handlers

---

## Technical Architecture

### URL Scheme Design

```
claude-session://start?plan=<identifier>&project=<path>

Parameters:
- plan: SESSION plan identifier (10, SESSION_10_PLAN, etc.)
- project: Full path to project (optional, defaults to PWD)

Examples:
- claude-session://start?plan=10
- claude-session://start?plan=SESSION_10_PLAN&project=/Users/me/project
```

### Mac URL Handler Flow

```
1. User clicks URL in Calendar/browser
2. macOS recognizes claude-session:// scheme
3. LaunchAgent triggers handle-session-url.sh
4. Script parses URL parameters
5. Script validates plan exists
6. Script changes to project directory
7. Script runs: node dist/cli.js session start <plan>
8. Terminal window opens showing session launch
```

### Calendar Event Enhancement

**Before** (Current):
```
📅 Session 10: Real Data Integration
Time: 2:00 PM - 6:00 PM

Description:
- Connect real JSONL data
- Implement WebSocket updates
- Add historical view
```

**After** (Enhanced):
```
📅 Session 10: Real Data Integration
Time: 2:00 PM - 6:00 PM

🚀 Quick Start:
🖥️  Mac: Click here to start → claude-session://start?plan=10
📱 iPhone: Copy command below, paste in terminal

💻 Manual Command:
cd /path/to/project
node dist/cli.js session start 10

📋 Session Objectives:
1. Connect real JSONL data to dashboard
2. Implement live WebSocket updates
3. Add historical session view
[... full objectives ...]
```

---

## File Structure

### New Files
```
scripts/
  install-url-handler.sh         # macOS URL scheme installer
  handle-session-url.sh          # URL handler logic
  uninstall-url-handler.sh       # Clean removal
  ios-shortcut-template.json     # iOS Shortcut (optional)

docs/
  URL_HANDLER_SETUP.md           # Installation guide
```

### Modified Files
```
src/
  calendar-service.ts            # Enhanced iCal export
  calendar-watcher.ts            # SESSION plan integration
  cli.ts                         # New schedule-session command

docs/
  WEEKEND_SESSION_GUIDE.md       # Updated workflows
```

---

## Risk Mitigation

### Risk: macOS Security Restrictions
**Mitigation**: Script includes permission checks, clear error messages, alternative manual workflow

### Risk: iOS Can't Trigger Mac Remotely
**Mitigation**: Document multiple approaches (Shortcuts, SSH, manual), focus on copy-paste workflow

### Risk: URL Handler Conflicts
**Mitigation**: Check for existing handlers, namespace URLs clearly, provide uninstall script

### Risk: Calendar App Doesn't Show URLs as Links
**Mitigation**: Test across Calendar.app, Google Calendar, provide plain-text fallback

---

## Success Criteria

✅ **Must Have**:
1. Calendar events include session start command (copy-pasteable)
2. Mac URL handler works (one-click launch)
3. Installation script succeeds on macOS
4. Documentation complete and tested

🎯 **Nice to Have**:
1. iOS Shortcut for remote launch
2. Calendar watcher auto-detects SESSION plans
3. Smart scheduling based on plan estimates

---

## Post-Session Validation

Run this checklist after session:

```bash
# 1. Export enhanced calendar
node dist/cli.js calendar export enhanced-test.ics

# 2. Verify URL handler installed
ls ~/Library/LaunchAgents/com.claude.session-launcher.plist

# 3. Test URL launch
open "claude-session://start?plan=10"

# 4. Import to iPhone, verify readability

# 5. Run test suite
npm test -- url-handler.test.ts
```

---

## Next Steps After Session 11

### Immediate (Same Day)
- [ ] Test on real iPhone + Mac setup
- [ ] Refine based on actual usage
- [ ] Update docs with learnings

### Short-term (Next Week)
- [ ] Add session tracking to URL handler
- [ ] Metrics for URL-launched sessions
- [ ] Auto-update calendar after completion

### Long-term (Future Sessions)
- [ ] Android support
- [ ] Web-based launcher
- [ ] Team collaboration features

---

## Learning Opportunities

● **Learn by Doing**

**Context**: We need to create a macOS LaunchAgent that registers our custom URL scheme. This is how macOS knows what to do when someone clicks `claude-session://` links. I'll set up the basic structure and plist template, but the URL parameter parsing is a perfect chance for you to learn URL handling in bash.

**Your Task**: In `scripts/handle-session-url.sh`, after the TODO(human) comment, implement the URL parsing logic. The function should extract `plan` and `project` parameters from a URL like `claude-session://start?plan=10&project=/path/to/proj`.

**Guidance**: Consider using bash parameter expansion and regex. The URL comes in as `$1`. You'll need to:
1. Strip the `claude-session://start?` prefix
2. Split on `&` to get key=value pairs
3. Extract `plan=X` and `project=Y` values
4. Handle cases where parameters are missing or malformed

Useful bash: `sed`, `cut`, `grep -oP`, or parameter expansion `${var#prefix}`.

---

## Token Budget Breakdown

| Phase | Task | Tokens | % of Budget |
|-------|------|--------|-------------|
| 1 | Enhanced calendar export | 8-12k | 18-20% |
| 2 | Mac URL handler | 12-18k | 27-30% |
| 3 | Calendar integration | 8-12k | 18-20% |
| 4 | iOS options | 8-10k | 18-17% |
| 5 | Testing & docs | 6-8k | 13-13% |
| **Total** | **All phases** | **45-60k** | **100%** |

**Buffer Available**: 140-155k tokens (70-77% of quota remaining)

---

## Appendix: Alternative Approaches Considered

### Approach A: Deep Links (Rejected)
- **Pros**: Universal, works on iOS/Android
- **Cons**: Requires app, not available for terminal tools
- **Decision**: URL scheme simpler for desktop use

### Approach B: QR Codes (Considered)
- **Pros**: Easy iPhone → Mac communication
- **Cons**: Requires camera, extra step
- **Decision**: Keep as optional enhancement

### Approach C: Web Interface (Future)
- **Pros**: Works anywhere, no install
- **Cons**: Requires server, more complex
- **Decision**: Save for future session

---

**Ready to build the ultimate weekend coding workflow!** 🚀
