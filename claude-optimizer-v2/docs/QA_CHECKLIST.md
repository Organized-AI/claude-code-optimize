# QA Testing Checklist - Mac URL Handler & Calendar Integration

**Version**: 1.0
**Created**: 2025-10-03
**Purpose**: Comprehensive quality assurance checklist for Session 11 deliverables
**Status**: Ready for manual testing

---

## Testing Overview

This checklist covers all critical aspects of the Mac URL handler workflow and calendar integration. Each test must be executed manually and results documented.

**Test Categories**:
- Installation Scenarios (6 tests)
- Security Validation (7 tests)
- Valid URL Tests (4 tests)
- Error Handling (6 tests)
- Edge Cases (6 tests)
- Calendar Compatibility (6 tests)

**Total Tests**: 35
**Estimated Time**: 2-3 hours
**Prerequisites**: Fresh macOS system or VM for comprehensive testing

---

## Quick Reference

### Test Status Legend
- [ ] NOT TESTED
- [P] PASSED
- [F] FAILED (see notes)
- [S] SKIPPED (document reason)

### Severity Levels
- **CRITICAL**: Must pass - blocks deployment
- **HIGH**: Should pass - significant impact
- **MEDIUM**: Nice to have - minor impact
- **LOW**: Optional - cosmetic/edge case

---

## Section 1: Installation Scenarios

### Test 1.1: Fresh Installation
**Severity**: CRITICAL
**Preconditions**: No prior URL handler installed, clean macOS
**Test Steps**:
1. Clone repository to fresh location
2. Build project: `npm run build`
3. Run installer: `./scripts/install-url-handler.sh`
4. Verify output shows success message
5. Check LaunchAgent exists: `ls ~/Library/LaunchAgents/com.claude.session-launcher.plist`
6. Verify handler is loaded: `launchctl list | grep com.claude.session-launcher`
7. Test URL: `open "claude-session://start?plan=10"`

**Expected Results**:
- Installer completes without errors
- Plist file created in LaunchAgents directory
- LaunchAgent loaded and active
- URL opens Terminal with session command
- Log file created at `~/.claude-optimizer/url-handler.log`

**Pass Criteria**: All steps complete successfully, Terminal opens with correct command

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 1.2: Re-installation (Handler Already Exists)
**Severity**: HIGH
**Preconditions**: URL handler already installed from Test 1.1
**Test Steps**:
1. Run installer again: `./scripts/install-url-handler.sh`
2. Check for warnings about existing installation
3. Verify installer handles existing plist gracefully
4. Confirm handler still works: `open "claude-session://start?plan=10"`

**Expected Results**:
- Installer detects existing installation
- Shows message about replacing/updating handler
- Successfully updates plist if changes present
- Reloads LaunchAgent without errors
- Handler continues to work

**Pass Criteria**: Re-install completes without errors, handler functional

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 1.3: Upgrade Installation (Old Version Present)
**Severity**: HIGH
**Preconditions**: Manually create old/simplified version of plist
**Test Steps**:
1. Unload current handler: `launchctl unload ~/Library/LaunchAgents/com.claude.session-launcher.plist`
2. Modify plist to simulate old version (change label or remove fields)
3. Reload old version: `launchctl load ~/Library/LaunchAgents/com.claude.session-launcher.plist`
4. Run installer: `./scripts/install-url-handler.sh`
5. Verify upgrade successful

**Expected Results**:
- Installer detects old version
- Successfully replaces old plist with new version
- LaunchAgent reloaded with updated configuration
- No leftover files from old version

**Pass Criteria**: Upgrade completes, new version active, no artifacts from old version

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 1.4: Installation with Missing Dependencies
**Severity**: CRITICAL
**Preconditions**: System missing Node.js or other dependencies
**Test Steps**:
1. Temporarily rename Node.js: `sudo mv /usr/local/bin/node /usr/local/bin/node.bak`
2. Run installer: `./scripts/install-url-handler.sh`
3. Observe error handling
4. Restore Node.js: `sudo mv /usr/local/bin/node.bak /usr/local/bin/node`
5. Verify installer provides helpful error message

**Expected Results**:
- Installer detects missing Node.js
- Shows clear error: "Node.js is required but not found"
- Provides installation instructions
- Exits gracefully without partial installation
- No plist created
- No LaunchAgent loaded

**Pass Criteria**: Clear error message, no partial install, helpful guidance provided

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 1.5: Installation without Write Permissions
**Severity**: HIGH
**Preconditions**: Remove write permissions from LaunchAgents directory
**Test Steps**:
1. Remove write permission: `chmod -w ~/Library/LaunchAgents`
2. Run installer: `./scripts/install-url-handler.sh`
3. Observe error handling
4. Restore permissions: `chmod +w ~/Library/LaunchAgents`

**Expected Results**:
- Installer detects permission issue
- Shows error: "Cannot write to ~/Library/LaunchAgents"
- Provides fix instructions (chmod command or manual fix)
- Exits without corrupting system state
- Rollback cleans up any temporary files

**Pass Criteria**: Permission error detected, clear guidance, no corruption

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 1.6: Installation on Different macOS Versions
**Severity**: MEDIUM
**Preconditions**: Access to multiple macOS versions (Big Sur, Monterey, Ventura, Sonoma)
**Test Steps**:
1. Test installation on each macOS version
2. Verify LaunchAgent plist format compatibility
3. Test URL handling on each version
4. Check for OS-specific issues

**Expected Results**:
- Works on macOS Big Sur (11.x) and later
- LaunchAgent loads correctly on all versions
- osascript Terminal commands work on all versions
- No deprecated API warnings

**Pass Criteria**: Successful install and operation on macOS 11+

**Status**: [ ]
**macOS Version Tested**: _____________________________________
**Notes**: _____________________________________

---

## Section 2: Security Validation

### Test 2.1: Command Injection via Semicolon
**Severity**: CRITICAL
**Preconditions**: URL handler installed
**Test Steps**:
1. Create malicious URL: `open "claude-session://start?plan=10;rm -rf /tmp/testfile"`
2. Create test file before: `touch /tmp/testfile`
3. Trigger URL
4. Verify test file still exists: `ls /tmp/testfile`

**Expected Results**:
- URL handler REJECTS the malicious plan parameter
- Error shown: "Invalid plan name format"
- Test file still exists (command injection prevented)
- Log shows rejection: `grep "Invalid" ~/.claude-optimizer/url-handler.log`
- No Terminal window opens

**Pass Criteria**: Malicious input rejected, no command execution, clear error

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 2.2: Path Traversal Attack
**Severity**: CRITICAL
**Preconditions**: URL handler installed
**Test Steps**:
1. Attempt path traversal: `open "claude-session://start?plan=../../etc/passwd"`
2. Verify rejection
3. Check logs for security event

**Expected Results**:
- URL handler REJECTS path traversal attempt
- Error: "Invalid plan name format" or "Plan does not exist"
- No access to /etc/passwd
- Security event logged
- No Terminal window opens

**Pass Criteria**: Path traversal blocked, no unauthorized file access

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 2.3: Command Injection via Subshell
**Severity**: CRITICAL
**Preconditions**: URL handler installed
**Test Steps**:
1. Attempt subshell injection: `open "claude-session://start?plan=10\$(whoami)"`
2. Verify rejection
3. Alternative: `open "claude-session://start?plan=10\`id\`"`

**Expected Results**:
- URL handler REJECTS subshell syntax
- Error: "Invalid plan name format"
- No command substitution executed
- Backslashes and backticks stripped/rejected

**Pass Criteria**: Subshell injection blocked

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 2.4: SQL-Style Injection
**Severity**: CRITICAL
**Preconditions**: URL handler installed
**Test Steps**:
1. Attempt SQL-style: `open "claude-session://start?plan=10' OR '1'='1"`
2. Verify rejection

**Expected Results**:
- URL handler REJECTS quotes and SQL syntax
- Error: "Invalid plan name format"
- Only alphanumeric, underscore, hyphen allowed

**Pass Criteria**: SQL-style injection blocked

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 2.5: XSS-Style Injection
**Severity**: HIGH
**Preconditions**: URL handler installed
**Test Steps**:
1. Attempt XSS: `open "claude-session://start?plan=SESSION<script>alert(1)</script>"`
2. Verify rejection

**Expected Results**:
- URL handler REJECTS HTML/script tags
- Error: "Invalid plan name format"
- No script execution (even though this is bash, not browser)

**Pass Criteria**: Script tags blocked

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 2.6: Empty Parameter Attack
**Severity**: HIGH
**Preconditions**: URL handler installed
**Test Steps**:
1. Empty plan: `open "claude-session://start?plan="`
2. Verify graceful error

**Expected Results**:
- URL handler detects empty parameter
- Error: "Missing 'plan' parameter in URL"
- Helpful usage message shown
- No Terminal window opens

**Pass Criteria**: Empty parameter handled gracefully, clear error

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 2.7: Missing Parameter Attack
**Severity**: HIGH
**Preconditions**: URL handler installed
**Test Steps**:
1. No plan parameter: `open "claude-session://start"`
2. Verify error handling

**Expected Results**:
- URL handler detects missing parameter
- Error: "Missing 'plan' parameter in URL"
- Usage example provided
- No crash or undefined behavior

**Pass Criteria**: Missing parameter detected, helpful error shown

**Status**: [ ]
**Notes**: _____________________________________

---

## Section 3: Valid URL Tests

### Test 3.1: Simple Plan Number
**Severity**: CRITICAL
**Preconditions**: URL handler installed, SESSION_10_PLAN.md exists
**Test Steps**:
1. Trigger simple URL: `open "claude-session://start?plan=10"`
2. Observe Terminal window opens
3. Verify correct command executed
4. Check logs

**Expected Results**:
- Terminal window opens immediately
- Command shown: `node dist/cli.js session start 10`
- Project directory is correct
- Session starts successfully
- Log entry created with timestamp

**Pass Criteria**: Terminal opens, correct command, session starts

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 3.2: Named Plan Format
**Severity**: CRITICAL
**Preconditions**: URL handler installed, SESSION_10_PLAN.md exists
**Test Steps**:
1. Use full name: `open "claude-session://start?plan=SESSION_10_PLAN"`
2. Verify it works the same as Test 3.1

**Expected Results**:
- Terminal window opens
- Correct plan resolved
- Session starts successfully

**Pass Criteria**: Named plan works identically to numeric plan

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 3.3: URL with Project Path
**Severity**: HIGH
**Preconditions**: URL handler installed, separate project directory exists
**Test Steps**:
1. Create test project: `mkdir -p /tmp/test-project`
2. Use URL with project: `open "claude-session://start?plan=10&project=/tmp/test-project"`
3. Verify Terminal opens in correct directory
4. Check `pwd` output in Terminal

**Expected Results**:
- Terminal opens in /tmp/test-project
- Command: `cd /tmp/test-project && node dist/cli.js session start 10`
- Project path override works

**Pass Criteria**: Custom project path respected

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 3.4: URL Encoded Parameters
**Severity**: HIGH
**Preconditions**: URL handler installed
**Test Steps**:
1. Create path with spaces: `mkdir -p "$HOME/My Test Project"`
2. Use encoded URL: `open "claude-session://start?plan=10&project=$HOME/My%20Test%20Project"`
3. Verify URL decoding works

**Expected Results**:
- %20 decoded to space
- Terminal opens in "My Test Project" directory
- URL decoding handles: %2F (/), %20 (space), %3A (:)

**Pass Criteria**: URL encoding decoded correctly

**Status**: [ ]
**Notes**: _____________________________________

---

## Section 4: Error Handling

### Test 4.1: Invalid Plan Name (Doesn't Exist)
**Severity**: HIGH
**Preconditions**: URL handler installed
**Test Steps**:
1. Use non-existent plan: `open "claude-session://start?plan=999"`
2. Observe error handling

**Expected Results**:
- Error detected: "Plan does not exist" or similar
- Terminal may open with error message
- Session does NOT start
- Helpful message: "Available plans: SESSION_10_PLAN, SESSION_11_PLAN"

**Pass Criteria**: Clear error, no crash, helpful guidance

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 4.2: Invalid Project Path (Doesn't Exist)
**Severity**: HIGH
**Preconditions**: URL handler installed
**Test Steps**:
1. Use non-existent path: `open "claude-session://start?plan=10&project=/does/not/exist"`
2. Verify error handling

**Expected Results**:
- Error: "Project path does not exist: /does/not/exist"
- No Terminal window opens (or opens with error)
- Logged to error log

**Pass Criteria**: Invalid path detected, clear error

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 4.3: Node.js Not in PATH
**Severity**: HIGH
**Preconditions**: URL handler installed, Node.js temporarily unavailable
**Test Steps**:
1. Modify PATH in LaunchAgent plist to exclude Node.js location
2. Reload LaunchAgent
3. Trigger URL: `open "claude-session://start?plan=10"`
4. Observe error

**Expected Results**:
- Terminal opens with error: "node: command not found"
- Error logged
- User-friendly message if possible

**Pass Criteria**: Error clearly indicates Node.js issue

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 4.4: Terminal.app Not Available
**Severity**: MEDIUM
**Preconditions**: URL handler installed
**Test Steps**:
1. Temporarily rename Terminal.app: `sudo mv /Applications/Terminal.app /Applications/Terminal.app.bak`
2. Trigger URL: `open "claude-session://start?plan=10"`
3. Observe error
4. Restore Terminal: `sudo mv /Applications/Terminal.app.bak /Applications/Terminal.app`

**Expected Results**:
- AppleScript error: "Terminal can't be found"
- Error logged
- Graceful failure (doesn't crash system)

**Pass Criteria**: Terminal absence detected, graceful error

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 4.5: Disk Full Scenario
**Severity**: LOW
**Preconditions**: Simulated disk full (difficult to test)
**Test Steps**:
1. Fill disk to near capacity (if safe to test)
2. Run installer or trigger URL
3. Verify error handling

**Expected Results**:
- Disk space error detected
- Installation fails gracefully
- Clear error message
- Rollback cleans up partial files

**Pass Criteria**: Disk full handled gracefully

**Status**: [S] SKIPPED - Requires disk fill simulation
**Notes**: _____________________________________

---

### Test 4.6: Network Interruption During Install
**Severity**: LOW
**Preconditions**: None (installer doesn't use network)
**Test Steps**:
1. Disconnect network
2. Run installer
3. Verify it works offline

**Expected Results**:
- Installation completes successfully (no network needed)
- No network-related errors

**Pass Criteria**: Installation works offline

**Status**: [ ]
**Notes**: _____________________________________

---

## Section 5: Edge Cases

### Test 5.1: Very Long Plan Name (255+ Characters)
**Severity**: MEDIUM
**Preconditions**: URL handler installed
**Test Steps**:
1. Create URL with 255+ char plan name
2. Trigger URL
3. Verify rejection or truncation

**Expected Results**:
- Plan name rejected if too long
- Error: "Plan name exceeds maximum length"
- No buffer overflow or crash

**Pass Criteria**: Long names handled safely

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 5.2: Very Long URL (>2048 Characters)
**Severity**: MEDIUM
**Preconditions**: URL handler installed
**Test Steps**:
1. Create URL >2048 chars (long project path)
2. Trigger URL
3. Verify handling

**Expected Results**:
- URL rejected or truncated safely
- Error if too long
- No crash

**Pass Criteria**: Long URLs don't crash handler

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 5.3: Plan Names with Special Characters
**Severity**: HIGH
**Preconditions**: URL handler installed
**Test Steps**:
1. Test valid special chars:
   - Hyphen: `open "claude-session://start?plan=SESSION_10-A"`
   - Underscore: `open "claude-session://start?plan=SESSION_6B"`
   - Mixed: `open "claude-session://start?plan=SESSION-10_PLAN-v2"`
2. Verify these are accepted

**Expected Results**:
- Alphanumeric + hyphen + underscore allowed
- Plans with these chars work correctly
- Other special chars rejected

**Pass Criteria**: Valid special chars work, invalid ones rejected

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 5.4: Path with Spaces
**Severity**: HIGH
**Preconditions**: URL handler installed
**Test Steps**:
1. Create directory: `mkdir -p "$HOME/My Test Project"`
2. Build project there or use existing
3. Use URL: `open "claude-session://start?plan=10&project=$HOME/My%20Test%20Project"`

**Expected Results**:
- Spaces in path handled correctly
- Terminal opens in correct directory
- Command executes without errors

**Pass Criteria**: Spaces in paths work correctly

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 5.5: Path with Unicode Characters
**Severity**: MEDIUM
**Preconditions**: URL handler installed
**Test Steps**:
1. Create directory: `mkdir -p "$HOME/tëst/项目"`
2. Use URL with unicode path
3. Verify handling

**Expected Results**:
- Unicode characters handled correctly
- Path resolution works
- No encoding errors

**Pass Criteria**: Unicode paths work or show clear error

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 5.6: Concurrent URL Triggers
**Severity**: MEDIUM
**Preconditions**: URL handler installed
**Test Steps**:
1. Trigger same URL multiple times rapidly
2. Click URL 5 times in succession
3. Observe behavior

**Expected Results**:
- Multiple Terminal windows open (expected behavior)
- No race conditions or crashes
- Each session starts independently
- OR: Rate limiting prevents spam (if implemented)

**Pass Criteria**: Concurrent triggers handled safely

**Status**: [ ]
**Notes**: _____________________________________

---

## Section 6: Calendar Compatibility

### Test 6.1: Import .ics to Apple Calendar.app (Mac)
**Severity**: CRITICAL
**Preconditions**: Calendar export feature working
**Test Steps**:
1. Export calendar: `node dist/cli.js calendar export test.ics`
2. Double-click test.ics file
3. Verify import dialog appears
4. Import to Calendar.app
5. Open event, check description

**Expected Results**:
- .ics file opens Calendar.app import dialog
- Events import without errors
- Event description shows URLs
- Manual commands visible
- Formatting preserved (line breaks, sections)

**Pass Criteria**: Clean import, all content visible

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 6.2: Import to Google Calendar (Web)
**Severity**: HIGH
**Preconditions**: Calendar export feature working
**Test Steps**:
1. Export calendar: `node dist/cli.js calendar export test.ics`
2. Open Google Calendar web interface
3. Settings > Import & export > Import
4. Upload test.ics
5. Verify events appear correctly

**Expected Results**:
- .ics file imports successfully
- Events appear in Google Calendar
- Description formatting maintained
- URLs preserved (may or may not be clickable)

**Pass Criteria**: Events import, content readable

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 6.3: View on iPhone Calendar App
**Severity**: HIGH
**Preconditions**: Calendar synced to iPhone (iCloud or Google)
**Test Steps**:
1. After Test 6.1 or 6.2, wait for sync
2. Open Calendar app on iPhone
3. Find imported event
4. Tap event to view details
5. Verify description is readable

**Expected Results**:
- Event appears on iPhone calendar
- Description loads completely
- Manual commands visible and copyable
- URLs shown (may not be clickable)
- Formatting mostly preserved

**Pass Criteria**: Event visible, description readable, commands copyable

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 6.4: URLs Clickable on Mac
**Severity**: HIGH
**Preconditions**: Events imported to Calendar.app
**Test Steps**:
1. Open event in Calendar.app on Mac
2. Look for claude-session:// URLs in description
3. Attempt to click URL
4. Verify Terminal opens

**Expected Results**:
- URLs displayed as clickable links in Calendar.app
- Clicking URL triggers URL handler
- Terminal opens with session command
- Same behavior as clicking URL in browser

**Pass Criteria**: URLs are clickable, handler works from Calendar.app

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 6.5: URLs Copyable on iPhone
**Severity**: MEDIUM
**Preconditions**: Event synced to iPhone
**Test Steps**:
1. Open event on iPhone
2. Tap and hold on URL or manual command
3. Select text, copy
4. Paste into Notes app to verify

**Expected Results**:
- Text in description is selectable
- URLs can be copied
- Manual commands can be copied
- No formatting corruption when pasted

**Pass Criteria**: Text copyable, paste preserves content

**Status**: [ ]
**Notes**: _____________________________________

---

### Test 6.6: Description Formatting Preserved
**Severity**: MEDIUM
**Preconditions**: Calendar export feature working
**Test Steps**:
1. Export calendar
2. Open .ics in text editor
3. Check DESCRIPTION field encoding
4. Import to multiple calendar apps
5. Compare formatting across apps

**Expected Results**:
- Line breaks preserved (\n or literal)
- Emoji visible
- Sections (headers) distinguishable
- Lists/bullet points readable
- No escaped characters visible to user

**Pass Criteria**: Formatting readable across Calendar.app, Google Calendar, and iPhone

**Status**: [ ]
**Notes**: _____________________________________

---

## Post-Testing Summary

### Critical Test Results

**Total Tests**: 35
**Passed**: _____
**Failed**: _____
**Skipped**: _____

### Critical Failures (Blockers)
List any CRITICAL severity tests that failed:
1. _____________________________________
2. _____________________________________
3. _____________________________________

### High Priority Failures
List any HIGH severity tests that failed:
1. _____________________________________
2. _____________________________________
3. _____________________________________

### Deployment Decision

- [ ] **APPROVED** - All critical tests passed, ready to deploy
- [ ] **APPROVED WITH NOTES** - Minor issues, deploy with documentation
- [ ] **REJECTED** - Critical failures present, requires fixes

### Tester Sign-Off

**Tester Name**: _____________________________________
**Date**: _____________________________________
**macOS Version**: _____________________________________
**Node.js Version**: _____________________________________
**Project Build**: _____________________________________

### Additional Notes

_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
