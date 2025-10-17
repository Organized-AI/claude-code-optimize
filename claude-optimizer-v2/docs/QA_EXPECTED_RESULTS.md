# QA Expected Results Reference

**Version**: 1.0
**Purpose**: Detailed expected results for all QA tests with examples
**Related**: QA_CHECKLIST.md, QA_EXECUTION_GUIDE.md

---

## Document Purpose

This reference provides:
- Exact expected outputs for each test
- Example screenshots/outputs
- Pass/fail criteria explanations
- Edge case clarifications
- Troubleshooting hints when results differ

---

## Section 1: Installation Scenarios

### Test 1.1: Fresh Installation

**Expected Terminal Output**:
```
$ ./scripts/install-url-handler.sh

🚀 Claude Session URL Handler - Installation

Checking dependencies...
✓ Node.js found: v18.17.0
✓ npm found: 9.6.7
✓ LaunchAgents directory writable
✓ launchctl available

Installing URL handler...
✓ Created plist: ~/Library/LaunchAgents/com.claude.session-launcher.plist
✓ LaunchAgent loaded successfully

Testing URL handler...
✓ URL scheme registered: claude-session://

Installation complete! 🎉

Test the handler:
  open "claude-session://start?plan=10"

To uninstall:
  ./scripts/uninstall-url-handler.sh
```

**File System Changes**:
```bash
# New file created
~/Library/LaunchAgents/com.claude.session-launcher.plist

# Log directory created
~/.claude-optimizer/

# Log file created (on first URL trigger)
~/.claude-optimizer/url-handler.log
```

**LaunchAgent Status**:
```bash
$ launchctl list | grep com.claude.session-launcher
-       0       com.claude.session-launcher
```
- First column `-` means process not running (normal, runs on-demand)
- Second column `0` means last exit code was success
- Third column is the label

**Pass Criteria**:
- Script exits with code 0
- All checkmarks shown
- Plist file exists and is valid XML
- LaunchAgent appears in `launchctl list`
- No error messages

**Fail Examples**:
```
# Missing dependency
✗ Node.js not found
Error: Node.js is required but not found in PATH
Please install: https://nodejs.org/

# Permission issue
✗ Cannot write to ~/Library/LaunchAgents
Error: Permission denied
Try: chmod +w ~/Library/LaunchAgents
```

---

### Test 1.2: Re-installation

**Expected Output**:
```
$ ./scripts/install-url-handler.sh

🚀 Claude Session URL Handler - Installation

Existing installation detected.
Unloading previous version...
✓ Previous LaunchAgent unloaded

Checking dependencies...
[... same as 1.1 ...]

Installing URL handler...
✓ Updated plist: ~/Library/LaunchAgents/com.claude.session-launcher.plist
✓ LaunchAgent loaded successfully

Installation complete! 🎉
```

**Differences from Fresh Install**:
- Message about existing installation
- Unload step before install
- "Updated plist" instead of "Created plist"

**Pass Criteria**:
- Detects existing installation
- Gracefully unloads and replaces
- No duplicate LaunchAgents
- Handler works after reinstall

---

### Test 1.3: Upgrade Installation

**Expected Behavior**:
- Same as Test 1.2 (re-installation)
- Old plist completely replaced
- No orphaned configuration

**Verification**:
```bash
# Compare plist before and after
diff /path/to/old-plist.bak ~/Library/LaunchAgents/com.claude.session-launcher.plist

# Check only one LaunchAgent with our label
launchctl list | grep claude | wc -l
# Expected: 1
```

---

### Test 1.4: Missing Dependencies

**Expected Output (Node.js Missing)**:
```
$ ./scripts/install-url-handler.sh

🚀 Claude Session URL Handler - Installation

Checking dependencies...
✗ Node.js not found

Error: Node.js is required but not found.

Installation: https://nodejs.org/
Or via Homebrew: brew install node

Required version: Node.js 18+
Current PATH: /usr/local/bin:/usr/bin:/bin

Installation aborted.
```

**File System State**:
- No plist created
- No LaunchAgent loaded
- No partial installation artifacts

**Exit Code**: Non-zero (1)

**Pass Criteria**:
- Clear error about missing dependency
- Installation instructions provided
- No files created
- Clean abort

---

### Test 1.5: Missing Write Permissions

**Expected Output**:
```
$ ./scripts/install-url-handler.sh

🚀 Claude Session URL Handler - Installation

Checking dependencies...
✓ Node.js found: v18.17.0
✓ npm found: 9.6.7
✗ LaunchAgents directory not writable

Error: Cannot write to ~/Library/LaunchAgents

Fix: chmod +w ~/Library/LaunchAgents

Or grant write permissions for your user account.

Installation aborted.
```

**Pass Criteria**:
- Permission check happens before any file operations
- Clear fix instructions
- No attempt to write files
- Helpful error message

---

### Test 1.6: macOS Version Compatibility

**Expected Behavior by Version**:

**macOS Big Sur (11.x)**:
- All features work
- LaunchAgent format supported

**macOS Monterey (12.x)**:
- All features work
- No warnings

**macOS Ventura (13.x)**:
- All features work
- No warnings

**macOS Sonoma (14.x)**:
- All features work
- Optimized for latest

**macOS Catalina (10.15) - Not Supported**:
- May show deprecation warnings
- LaunchAgent may work but not guaranteed
- Document as unsupported

**Pass Criteria**:
- Works on macOS 11+ without errors
- No deprecated API warnings in logs
- URLs trigger correctly on all versions

---

## Section 2: Security Validation

### Test 2.1: Command Injection (Semicolon)

**Malicious URL**:
```
claude-session://start?plan=10;rm -rf /tmp/testfile
```

**Expected Behavior**:
```bash
# Before test
$ touch /tmp/testfile
$ ls /tmp/testfile
/tmp/testfile

# Trigger malicious URL
$ open "claude-session://start?plan=10;rm -rf /tmp/testfile"

# Handler log shows rejection
$ tail ~/.claude-optimizer/url-handler.log
[2025-10-03 14:32:15] [ERROR] Invalid plan name format: 10;rm -rf /tmp/testfile
[2025-10-03 14:32:15] [ERROR] Plan name contains illegal characters
[2025-10-03 14:32:15] [INFO] Request rejected

# File still exists
$ ls /tmp/testfile
/tmp/testfile  ✓ Still there!
```

**No Terminal Window Opens**

**Dialog May Appear** (macOS warning):
```
The URL "claude-session://start?plan=10;rm -rf /tmp/testfile"
could not be handled.
```

**Pass Criteria**:
- Semicolon detected and rejected
- No Terminal window opens
- Test file still exists
- Error logged
- No command execution

**Fail Examples**:
```
# CRITICAL FAILURE
$ ls /tmp/testfile
ls: /tmp/testfile: No such file or directory
# → Command was executed! Security vulnerability!
```

---

### Test 2.2: Path Traversal

**Malicious URL**:
```
claude-session://start?plan=../../etc/passwd
```

**Expected Log**:
```
[2025-10-03 14:35:22] [ERROR] Invalid plan name format: ../../etc/passwd
[2025-10-03 14:35:22] [ERROR] Path traversal attempt detected
[2025-10-03 14:35:22] [INFO] Request rejected for security reasons
```

**Expected User Message**:
```
Error: Invalid plan name format

Plan names must contain only:
- Letters (a-z, A-Z)
- Numbers (0-9)
- Underscores (_)
- Hyphens (-)

Examples: 10, SESSION_10_PLAN, SESSION-6A
```

**Pass Criteria**:
- Path traversal pattern rejected
- No file system access
- Clear error message
- Security event logged

---

### Test 2.3: Subshell Injection

**Malicious URL**:
```
claude-session://start?plan=10$(whoami)
```

**Expected Behavior**:
- `$()` syntax detected
- Plan name validation fails
- Error: "Invalid plan name format"
- No command substitution executed

**Verification**:
```bash
# Check handler log doesn't show username
$ grep "$(whoami)" ~/.claude-optimizer/url-handler.log
# Expected: No matches (username not in log)

# Log should show the literal string
$ grep "10\$(whoami)" ~/.claude-optimizer/url-handler.log
[ERROR] Invalid plan name format: 10$(whoami)
```

---

### Test 2.4: SQL Injection

**Malicious URL**:
```
claude-session://start?plan=10' OR '1'='1
```

**Expected Behavior**:
- Single quotes rejected
- Error: "Invalid plan name format"
- No SQL-like processing (we're not using SQL, but principle applies)

**Pass Criteria**:
- Quote characters blocked
- Only alphanumeric + underscore + hyphen allowed

---

### Test 2.5: XSS Injection

**Malicious URL**:
```
claude-session://start?plan=SESSION<script>alert(1)</script>
```

**Expected Behavior**:
- Angle brackets `<>` rejected
- Error: "Invalid plan name format"
- No script processing

**Note**: While bash doesn't execute JavaScript, rejecting HTML/script syntax prevents potential issues if plan names are ever displayed in web contexts.

---

### Test 2.6: Empty Parameter

**URL**:
```
claude-session://start?plan=
```

**Expected Error**:
```
Error: Missing 'plan' parameter in URL

Usage: claude-session://start?plan=<identifier>&project=<path>

Examples:
  claude-session://start?plan=10
  claude-session://start?plan=SESSION_10_PLAN
  claude-session://start?plan=10&project=/path/to/project
```

**Pass Criteria**:
- Empty parameter detected
- Helpful usage message
- No crash or undefined behavior

---

### Test 2.7: Missing Parameter

**URL**:
```
claude-session://start
```

**Expected**: Same error as Test 2.6

**Additional Check**:
```bash
# URL with only project parameter (no plan)
open "claude-session://start?project=/tmp"

# Should also error:
Error: Missing 'plan' parameter in URL
```

---

## Section 3: Valid URL Tests

### Test 3.1: Simple Plan Number

**URL**:
```
claude-session://start?plan=10
```

**Expected Behavior**:

1. **Terminal Window Opens** (within 1-2 seconds)

2. **Terminal Shows**:
```
Last login: [timestamp]
$ cd /Users/you/path/to/claude-optimizer-v2
$ echo '🚀 Starting Claude Session: 10'
🚀 Starting Claude Session: 10

$ node dist/cli.js session start 10

╭──────────────────────────────────────╮
│  Claude Code Optimizer - Session 10  │
╰──────────────────────────────────────╯

Loading session plan: SESSION_10_PLAN.md
[... session output ...]
```

3. **Handler Log Shows**:
```
[2025-10-03 14:45:10] [INFO] Received URL: claude-session://start?plan=10
[2025-10-03 14:45:10] [INFO] Parsed - Plan: 10, Project: /Users/you/path/to/claude-optimizer-v2
[2025-10-03 14:45:10] [INFO] Validation passed
[2025-10-03 14:45:10] [INFO] Launching Terminal
[2025-10-03 14:45:11] [INFO] Session launched successfully
```

**Pass Criteria**:
- Terminal opens within 2 seconds
- Correct project directory
- Correct session command
- Session starts without errors
- Clean log entries

---

### Test 3.2: Named Plan Format

**URL**:
```
claude-session://start?plan=SESSION_10_PLAN
```

**Expected Behavior**:
- Same as Test 3.1
- Plan parameter passed exactly as provided
- Validation accepts underscores
- Session command: `node dist/cli.js session start SESSION_10_PLAN`

**Verification**:
```bash
# Both should work identically
open "claude-session://start?plan=10"
open "claude-session://start?plan=SESSION_10_PLAN"

# Session resolver should handle both formats
```

---

### Test 3.3: Custom Project Path

**URL**:
```
claude-session://start?plan=10&project=/tmp/test-project
```

**Expected Terminal Output**:
```
$ cd /tmp/test-project
$ echo '🚀 Starting Claude Session: 10'
🚀 Starting Claude Session: 10

$ node dist/cli.js session start 10
```

**Verification**:
```bash
# Check working directory in Terminal
$ pwd
/tmp/test-project  ✓ Correct!
```

**Pass Criteria**:
- Terminal opens in custom directory
- Not in default project root
- Command executes in specified path

---

### Test 3.4: URL Encoded Parameters

**URL**:
```
claude-session://start?plan=10&project=/Users/me/My%20Test%20Project
```

**Expected Behavior**:
- `%20` decoded to space
- Terminal opens in "/Users/me/My Test Project"
- No encoding errors

**Verification**:
```bash
# Terminal should show:
$ cd '/Users/me/My Test Project'

# Not:
$ cd /Users/me/My%20Test%20Project  # ✗ Wrong!
```

**Additional Encodings to Support**:
- `%20` → space
- `%2F` → `/`
- `%3A` → `:`
- `%2B` → `+`

---

## Section 4: Error Handling

### Test 4.1: Invalid Plan Name

**URL**:
```
claude-session://start?plan=999
```

**Expected Behavior**:

**Option A: Early Detection (Preferred)**
```
Error: Plan does not exist: 999

Available plans:
- SESSION_10_PLAN
- SESSION_11_PLAN
- SESSION_6A_PLAN

Check: docs/planning/
```

**Option B: Late Detection (Acceptable)**
```
# Terminal opens, command runs, then errors:
$ node dist/cli.js session start 999

Error: Session plan not found: 999
Looking for: docs/planning/SESSION_999_PLAN.md

Available plans:
  SESSION_10_PLAN.md
  SESSION_11_PLAN.md
```

**Pass Criteria**:
- Error is clear and actionable
- Lists available plans (helpful!)
- Doesn't crash handler
- Logged properly

---

### Test 4.2: Invalid Project Path

**URL**:
```
claude-session://start?plan=10&project=/does/not/exist
```

**Expected Error** (before Terminal opens):
```
[2025-10-03 15:10:05] [ERROR] Project path does not exist: /does/not/exist
[2025-10-03 15:10:05] [INFO] Request rejected
```

**User Sees**:
```
Error: Project path does not exist
Path: /does/not/exist

Please check the project path and try again.
```

**No Terminal Window Opens**

**Pass Criteria**:
- Path validated before Terminal launch
- Clear error message
- No attempt to cd to invalid path

---

### Test 4.3: Node.js Not in PATH

**Expected Terminal Output**:
```
$ cd /path/to/project
$ echo '🚀 Starting Claude Session: 10'
🚀 Starting Claude Session: 10

$ node dist/cli.js session start 10
bash: node: command not found
```

**Handler Log**:
```
[2025-10-03 15:15:20] [INFO] Session launched successfully
# Note: Handler doesn't know command failed (limitation)
```

**Improvement Opportunity**:
- Could pre-check Node.js availability
- Show better error if Node.js not found

**Pass Criteria**:
- Terminal opens (expected)
- Clear "command not found" error
- User understands Node.js is missing

---

### Test 4.4: Terminal.app Not Available

**Expected Error**:
```
osascript: application "Terminal" doesn't seem to exist.
```

**Handler Log**:
```
[2025-10-03 15:20:10] [ERROR] Failed to launch Terminal
[2025-10-03 15:20:10] [ERROR] osascript error: application doesn't exist
```

**System Behavior**:
- Dialog may appear: "The application Terminal can't be found."
- Handler logs error
- Graceful failure (no crash)

**Pass Criteria**:
- Error detected
- Logged appropriately
- System doesn't crash
- User gets some feedback

---

### Test 4.5: Disk Full

**Expected Behavior**:
- Installation fails before creating plist
- Clear error: "No space left on device"
- No partial files created

**Note**: Difficult to test safely. May skip.

---

### Test 4.6: Network Interruption

**Expected Behavior**:
- Installation completes successfully (offline)
- No network required for URL handler
- No errors

**Pass Criteria**:
- Works without network connection

---

## Section 5: Edge Cases

### Test 5.1: Very Long Plan Name

**URL**:
```
claude-session://start?plan=AAAA...[255+ chars]...AAAA
```

**Expected Behavior**:
```
Error: Plan name exceeds maximum length

Maximum: 255 characters
Received: 300 characters

Please use a shorter plan name.
```

**Pass Criteria**:
- Length check prevents overflow
- Clear error message
- No buffer overflow
- No crash

---

### Test 5.2: Very Long URL

**URL**: >2048 characters

**Expected Behavior**:
- macOS may truncate URL before handler receives it
- OR handler detects and rejects excessive length
- No crash

**Verification**:
```bash
# Create long URL
LONG_URL="claude-session://start?plan=10&project=/very/long/path/$(printf 'a%.0s' {1..3000})"

# Trigger
open "$LONG_URL"

# Should error gracefully
```

---

### Test 5.3: Special Characters in Plan Names

**Valid Examples**:
```
claude-session://start?plan=SESSION-10-A      ✓
claude-session://start?plan=SESSION_6B        ✓
claude-session://start?plan=SESSION-10_PLAN-v2 ✓
claude-session://start?plan=10A               ✓
```

**Invalid Examples**:
```
claude-session://start?plan=SESSION.10        ✗ (period)
claude-session://start?plan=SESSION#10        ✗ (hash)
claude-session://start?plan=SESSION@10        ✗ (at sign)
claude-session://start?plan=SESSION 10        ✗ (space)
```

**Validation Pattern**:
```
^[a-zA-Z0-9_-]+$

Allowed:
- Letters: a-z, A-Z
- Numbers: 0-9
- Underscore: _
- Hyphen: -
```

---

### Test 5.4: Path with Spaces

**URL**:
```
claude-session://start?plan=10&project=/Users/me/My%20Test%20Project
```

**Expected Terminal**:
```
$ cd '/Users/me/My Test Project'
# Note: Single quotes protect spaces
```

**Pass Criteria**:
- Spaces decoded correctly
- Path quoted properly in shell command
- No "No such file or directory" errors

---

### Test 5.5: Unicode Characters

**URL**:
```
claude-session://start?plan=10&project=/Users/me/tëst/项目
```

**Expected Behavior**:
- Unicode characters preserved
- Path resolution works
- Terminal shows correctly

**Potential Issues**:
- URL encoding may complicate: `/Users/me/t%C3%ABst/%E9%A1%B9%E7%9B%AE`
- Terminal encoding must support UTF-8

**Pass Criteria**:
- Unicode paths work OR
- Clear error if unsupported

---

### Test 5.6: Concurrent URL Triggers

**Test**:
```bash
# Click URL 5 times rapidly
for i in {1..5}; do
  open "claude-session://start?plan=10" &
done
```

**Expected Behavior**:
- 5 Terminal windows open
- Each runs session independently
- No crashes
- No race conditions

**OR** (if rate limiting implemented):
```
Request 1: ✓ Launched
Request 2: ✓ Launched
Request 3: ⚠️ Rate limited (wait 5 seconds)
Request 4: ⚠️ Rate limited
Request 5: ⚠️ Rate limited
```

**Pass Criteria**:
- All requests handled safely
- No handler crashes
- No corrupted state

---

## Section 6: Calendar Compatibility

### Test 6.1: Apple Calendar Import

**Expected Import Dialog**:
```
┌─────────────────────────────────────────┐
│  Import Events                          │
├─────────────────────────────────────────┤
│                                         │
│  Import to:  [Personal Calendar ▾]     │
│                                         │
│  Found 10 events in test.ics           │
│                                         │
│  [Cancel]           [OK]                │
└─────────────────────────────────────────┘
```

**After Import**:
- Events appear in chosen calendar
- Event names visible
- Dates/times correct

**Event Details View**:
```
┌─────────────────────────────────────────┐
│  Session 10: Real Data Integration     │
│                                         │
│  Friday, Jan 19, 2025                   │
│  2:00 PM - 5:00 PM                      │
│                                         │
│  Description:                           │
│                                         │
│  🎯 OBJECTIVES:                         │
│  • Connect dashboard to live data      │
│  • Implement WebSocket handlers        │
│  • Add error handling                  │
│                                         │
│  🔗 ONE-CLICK START (Mac):              │
│  claude-session://start?plan=10        │
│                                         │
│  💻 MANUAL COMMAND:                     │
│  cd /path/to/project                   │
│  node dist/cli.js session start 10     │
│                                         │
│  📱 IPHONE: Copy manual command        │
└─────────────────────────────────────────┘
```

**Pass Criteria**:
- Clean import, no errors
- All events visible
- Description formatting readable
- Sections distinguishable
- URLs present (may or may not be clickable - check in 6.4)

---

### Test 6.2: Google Calendar Import

**Import Process**:
1. Google Calendar → Settings (gear icon)
2. "Import & export" (left sidebar)
3. "Import" section → "Select file from your computer"
4. Choose test.ics → "Import"

**Expected Result**:
```
✓ Imported 10 events to Personal
```

**Event View**:
- Events appear on calendar
- Click event → Description shows
- May strip some formatting (acceptable)
- URLs preserved as text

**Known Limitations**:
- Google may not preserve all line breaks
- Emoji may or may not display
- URLs not automatically clickable (user must copy-paste)

**Pass Criteria**:
- Events import successfully
- Description content readable
- Manual commands visible and copyable
- Acceptable formatting degradation

---

### Test 6.3: iPhone Calendar View

**Expected View** (after sync):

**Calendar List**:
```
  2 PM  Session 10: Real Data Integration
  3 PM  Team Standup
  5 PM  Session 11: Mac URL Handler
```

**Event Details** (tap event):
```
┌─────────────────────────────────────────┐
│  ← Session 10: Real Data Integration   │
│                                         │
│  Friday, January 19                     │
│  2:00 PM to 5:00 PM                     │
│  Personal                               │
│                                         │
│  🎯 OBJECTIVES:                         │
│  • Connect dashboard to live data      │
│  • Implement WebSocket handlers        │
│  • Add error handling                  │
│                                         │
│  🔗 ONE-CLICK START (Mac):              │
│  claude-session://start?plan=10        │
│                                         │
│  💻 MANUAL COMMAND:                     │
│  cd /path/to/project                   │
│  node dist/cli.js session start 10     │
│                                         │
│  📱 IPHONE: Copy manual command        │
│                                         │
└─────────────────────────────────────────┘
```

**Pass Criteria**:
- Event shows on iPhone calendar
- Description loads (may take a moment)
- Text is readable
- Can select and copy text
- Emoji display correctly

---

### Test 6.4: URLs Clickable on Mac

**Test**:
1. Open event in Calendar.app on Mac
2. Look at description
3. Move mouse over `claude-session://start?plan=10`

**Expected Behavior**:

**If Clickable** (ideal):
- URL underlined when hovering
- Cursor changes to pointer
- Click opens Terminal with session

**If Not Clickable** (acceptable):
- URL shown as plain text
- Can select and copy
- Paste into browser or terminal: `open "claude-session://start?plan=10"`

**Verification**:
```bash
# Try clicking URL in Calendar.app
# If works → PASS
# If not clickable → Check if copyable → PASS with note
```

**Pass Criteria**:
- URLs either clickable OR copyable
- Clicking works if clickable
- Manual copy-paste works as fallback

---

### Test 6.5: URLs Copyable on iPhone

**Test**:
1. Open event on iPhone
2. Tap and hold on URL or manual command
3. "Select All" appears
4. Select text
5. "Copy" button appears

**Expected**:
```
Selected text: claude-session://start?plan=10

Copied to clipboard: claude-session://start?plan=10
```

**Paste Test**:
- Open Notes app
- Paste
- Verify text matches original

**Pass Criteria**:
- Text is selectable
- Copy function works
- Pasted text correct
- No corruption

---

### Test 6.6: Description Formatting

**Raw .ics DESCRIPTION Field**:
```
DESCRIPTION:🎯 OBJECTIVES:\n• Connect dashboard to live data\n• Implement
 WebSocket handlers\n\n🔗 ONE-CLICK START (Mac):\nclaude-session://start?p
 lan=10\n\n💻 MANUAL COMMAND:\ncd /path/to/project\nnode dist/cli.js session
  start 10
```

**Expected Rendering** (Calendar.app):
```
🎯 OBJECTIVES:
• Connect dashboard to live data
• Implement WebSocket handlers

🔗 ONE-CLICK START (Mac):
claude-session://start?plan=10

💻 MANUAL COMMAND:
cd /path/to/project
node dist/cli.js session start 10
```

**Expected Rendering** (Google Calendar):
```
🎯 OBJECTIVES: • Connect dashboard to live data • Implement WebSocket handlers 🔗 ONE-CLICK START (Mac): claude-session://start?plan=10 💻 MANUAL COMMAND: cd /path/to/project node dist/cli.js session start 10
```
*Note: Google may collapse line breaks - acceptable*

**Pass Criteria**:
- Line breaks preserved in Calendar.app
- Emoji visible
- Sections distinguishable
- Google Calendar readability acceptable
- No escaped characters shown (\n, \\n, etc.)

---

## Common Failure Patterns

### Pattern 1: Terminal Opens but Nothing Happens

**Symptom**:
- Terminal window appears
- No command runs
- Blank prompt

**Likely Cause**:
- osascript `do script` command malformed
- Quotes not escaped properly

**Check**:
```bash
# View exact osascript command in handler script
cat scripts/handle-session-url.sh | grep -A 5 "do script"
```

### Pattern 2: URL Handler Never Triggers

**Symptom**:
- Clicking URLs does nothing
- No Terminal, no error

**Diagnostic**:
```bash
# Check LaunchAgent loaded
launchctl list | grep com.claude.session-launcher
# Should show entry

# Check plist valid
plutil -lint ~/Library/LaunchAgents/com.claude.session-launcher.plist
# Should say "OK"

# Check URL scheme registered
defaults read com.apple.LaunchServices/com.apple.launchservices.secure
# Should mention claude-session
```

### Pattern 3: Malicious Input Accepted

**Symptom**:
- Test 2.1-2.7 security tests fail
- Commands execute that shouldn't

**Likely Cause**:
- Validation not implemented
- Validation regex incorrect
- Input used before validation

**Fix**:
- Review validation.sh implementation
- Check regex: `^[a-zA-Z0-9_-]+$`
- Ensure validation happens BEFORE any command construction

---

## Summary

This expected results reference should be used during QA testing to:
1. Verify actual output matches expected
2. Understand what "passing" looks like
3. Diagnose failures by comparing differences
4. Document acceptable variations (e.g., Google Calendar formatting)

All tests should produce results matching or better than documented here.
