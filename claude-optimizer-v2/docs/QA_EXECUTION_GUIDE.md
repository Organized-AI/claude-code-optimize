# QA Test Execution Guide

**Version**: 1.0
**Purpose**: Step-by-step guide for executing QA tests and documenting results
**Related**: QA_CHECKLIST.md, run-qa-tests.sh

---

## Overview

This guide provides detailed instructions for executing the complete QA testing suite for Session 11's Mac URL handler and calendar integration features.

### Testing Approach

**Two-Phase Testing**:
1. **Automated Security Tests** - Run `scripts/run-qa-tests.sh` for security validation
2. **Manual QA Tests** - Follow QA_CHECKLIST.md for end-to-end testing

**Time Allocation**:
- Automated tests: 2-5 minutes
- Manual tests: 2-3 hours
- Documentation: 30 minutes
- Total: ~3-4 hours

---

## Prerequisites

### Required Setup

1. **Clean Test Environment**:
   - Fresh macOS installation OR VM snapshot
   - No prior URL handler installed
   - Standard user account (not admin for some tests)

2. **Software Requirements**:
   - macOS Big Sur (11.x) or later
   - Node.js 18+ installed
   - Terminal.app available
   - Apple Calendar.app (for calendar tests)
   - Text editor for documenting results

3. **Test Data**:
   - Clone project repository
   - Build project: `npm run build`
   - Ensure SESSION_10_PLAN.md exists in docs/planning/

4. **Documentation**:
   - Copy of QA_CHECKLIST.md (will mark up)
   - Spreadsheet or text file for results tracking
   - Screenshot tool ready

---

## Phase 1: Automated Security Tests

### Step 1.1: Pre-Test Verification

**Check validation library exists**:
```bash
ls -la claude-optimizer-v2/scripts/lib/validation.sh
```

**Expected**: File exists with validation functions

**If missing**:
- Implementation required (Phase 0 of SESSION_11_PLAN_REVISED.md)
- Cannot proceed with automated tests

### Step 1.2: Run Automated Tests

**Execute test script**:
```bash
cd claude-optimizer-v2
./scripts/run-qa-tests.sh
```

### Step 1.3: Interpret Results

**Success Output Example**:
```
================================================
  Claude Code Optimizer - QA Security Tests
================================================

[INFO] Test log: ~/.claude-optimizer/qa-test-results.log
[INFO] Project root: /path/to/claude-optimizer-v2

--- Security Validation Tests ---

[INFO] Running: Command Injection (Semicolon)
[PASS] Command Injection (Semicolon)

[INFO] Running: Path Traversal Attack
[PASS] Path Traversal Attack

... (more tests) ...

================================================
  Test Summary
================================================

Total Tests:     17
Passed:          17
Failed:           0
Skipped:          0

Pass Rate: 100%

ALL TESTS PASSED! Security validation is working correctly.
```

**Failure Output Example**:
```
[INFO] Running: Command Injection (Semicolon)
ERROR: Malicious plan with semicolon was accepted!
[FAIL] Command Injection (Semicolon)

...

Total Tests:     17
Passed:          15
Failed:           2
Skipped:          0

DEPLOYMENT BLOCKED: Security tests failed!
Fix the failing tests before proceeding.
```

### Step 1.4: Document Automated Results

**In your test log, record**:
- Date and time of test run
- Total tests executed
- Pass/fail counts
- Any failures with details from log file
- Path to full log: `~/.claude-optimizer/qa-test-results.log`

**Action Items**:
- [ ] All automated tests passed → Proceed to Phase 2
- [ ] Any tests failed → Fix issues, re-run, document fixes

---

## Phase 2: Manual QA Tests

### Step 2.1: Setup Test Environment

**Create test workspace**:
```bash
mkdir -p ~/qa-testing-workspace
cd ~/qa-testing-workspace
```

**Create test project directories**:
```bash
mkdir -p "My Test Project"
mkdir -p "tëst/项目"  # Unicode test
```

**Create tracking spreadsheet** (or use QA_CHECKLIST.md directly):
```
Test ID | Test Name | Status | Notes | Screenshot
--------|-----------|--------|-------|------------
1.1     | Fresh Install | [ ] | |
1.2     | Re-install | [ ] | |
...
```

### Step 2.2: Section-by-Section Execution

Work through QA_CHECKLIST.md in order, following this pattern for each test:

#### Test Execution Template

**For each test in QA_CHECKLIST.md**:

1. **Read Test Description**:
   - Note severity level
   - Understand preconditions
   - Review test steps
   - Know expected results

2. **Prepare Test Environment**:
   - Verify preconditions met
   - Create any required test data
   - Take "before" screenshot if applicable

3. **Execute Test Steps**:
   - Follow steps exactly as written
   - Document any deviations
   - Note actual results vs. expected
   - Take screenshots of key moments

4. **Evaluate Results**:
   - Compare actual vs. expected
   - Determine pass/fail
   - Note any partial passes
   - Document unexpected behavior

5. **Document Results**:
   - Mark status in checklist: [P], [F], or [S]
   - Write notes in Notes section
   - Reference screenshot filenames
   - Note any bugs found

6. **Handle Failures**:
   - For CRITICAL failures: Stop testing, file bug, await fix
   - For HIGH failures: Document, continue testing, plan fix
   - For MEDIUM/LOW: Document, continue testing

### Step 2.3: Screenshot Naming Convention

Use consistent naming for screenshots:
```
qa-test-[section]-[test-number]-[description].png

Examples:
qa-test-1-1-fresh-install-success.png
qa-test-2-1-malicious-url-rejected.png
qa-test-6-4-url-clickable-calendar.png
```

Store in: `~/qa-testing-workspace/screenshots/`

### Step 2.4: Special Instructions by Section

#### Section 1: Installation Scenarios

**Before starting**:
- Take VM snapshot (for Test 1.2, 1.3 re-testing)
- Ensure clean slate

**After Section 1**:
- Keep URL handler installed for Section 2-5
- Document any installation issues

#### Section 2: Security Validation

**Critical Section**:
- Every test MUST be executed
- Any failure is deployment blocker
- Document exactly what happens

**Safety Note**:
- Tests use safe malicious examples
- No actual system damage possible
- Test file: /tmp/testfile (safe location)

**Example Test 2.1 Detailed Steps**:
```bash
# 1. Create test file
touch /tmp/testfile

# 2. Trigger malicious URL
open "claude-session://start?plan=10;rm -rf /tmp/testfile"

# 3. Wait 5 seconds for processing

# 4. Check if file exists
ls /tmp/testfile

# Expected: File still exists
# If deleted: CRITICAL FAILURE - command injection vulnerability
```

#### Section 3: Valid URL Tests

**Prepare test plans**:
```bash
# Ensure these files exist:
ls docs/planning/SESSION_10_PLAN.md
```

**Test both formats**:
- Numeric: plan=10
- Named: plan=SESSION_10_PLAN

#### Section 4: Error Handling

**Temporarily break things** (safely):
```bash
# Test 4.3: Hide Node.js
sudo mv /usr/local/bin/node /usr/local/bin/node.bak

# Run test...

# Restore:
sudo mv /usr/local/bin/node.bak /usr/local/bin/node
```

**Document error messages**:
- Copy exact error text
- Note if user-friendly or technical
- Suggest improvements if needed

#### Section 5: Edge Cases

**Create test data**:
```bash
# Long plan name (255 chars)
LONG_PLAN=$(printf 'A%.0s' {1..255})
echo "claude-session://start?plan=$LONG_PLAN"

# Unicode paths
mkdir -p "$HOME/tëst/项目"
```

**Test systematically**:
- Each special character combination
- Boundary conditions (254, 255, 256 chars)

#### Section 6: Calendar Compatibility

**Multi-device testing required**:
1. Mac Calendar.app (primary)
2. Google Calendar web (if available)
3. iPhone Calendar app (if available)

**If iPhone unavailable**:
- Mark iPhone tests as [S] SKIPPED
- Note in comments: "No iPhone available for testing"
- Test on Mac only

**Calendar import steps**:
```bash
# 1. Export calendar
cd claude-optimizer-v2
node dist/cli.js calendar export ~/qa-testing-workspace/test.ics

# 2. Open in text editor (verify format)
cat ~/qa-testing-workspace/test.ics

# 3. Double-click to import to Calendar.app

# 4. Open event, inspect description

# 5. Try clicking URL
```

---

## Phase 3: Results Documentation

### Step 3.1: Compile Test Results

**Create summary document**:

```markdown
# QA Test Results Summary

**Date**: [Date]
**Tester**: [Your Name]
**Environment**: macOS [Version], Node.js [Version]
**Build**: [Commit Hash or Build Number]

## Executive Summary

Total Tests: 35
- Passed: __
- Failed: __
- Skipped: __

Pass Rate: __%

## Critical Findings

### Blockers (Must Fix Before Deploy)
1. [Test ID] [Test Name]: [Description]
   - Severity: CRITICAL
   - Impact: [Description]
   - Reproduction steps: [...]
   - Screenshots: [...]

### High Priority Issues
1. [Test ID] [Test Name]: [Description]
   - Severity: HIGH
   - Impact: [Description]

### Medium/Low Issues
1. [...]

## Test Section Results

### Section 1: Installation (6 tests)
- Passed: __/6
- Failed: __/6
- Notes: [...]

### Section 2: Security (7 tests)
- Passed: __/7
- Failed: __/7
- Notes: [...]

[... continue for all sections ...]

## Deployment Recommendation

[ ] APPROVED - All critical tests passed
[ ] APPROVED WITH NOTES - Minor issues documented
[ ] REJECTED - Critical failures present

## Attachments

- QA_CHECKLIST.md (marked up)
- Screenshots: ~/qa-testing-workspace/screenshots/
- Test logs: ~/.claude-optimizer/qa-test-results.log
```

### Step 3.2: Bug Reports

**For each failed test, create bug report**:

```markdown
# Bug Report: [Test ID] - [Short Description]

**Severity**: [CRITICAL/HIGH/MEDIUM/LOW]
**Status**: [NEW/IN PROGRESS/FIXED]
**Found By**: QA Test [Test ID]

## Description
[What went wrong]

## Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happened]

## Screenshots
- [Screenshot 1]: [Description]
- [Screenshot 2]: [Description]

## Environment
- macOS: [Version]
- Node.js: [Version]
- Project Build: [Hash]

## Suggested Fix
[If known]

## Priority Justification
[Why this severity level]
```

### Step 3.3: Final Checklist

**Before completing QA**:

- [ ] All 35 tests executed or skipped with reason
- [ ] Automated test results documented
- [ ] Screenshots captured for key tests
- [ ] Bug reports created for failures
- [ ] Summary document completed
- [ ] QA_CHECKLIST.md marked up
- [ ] Test log files preserved
- [ ] Deployment recommendation made

---

## Troubleshooting Test Execution

### Issue: Automated tests won't run

**Symptom**: `./scripts/run-qa-tests.sh` fails immediately

**Solutions**:
```bash
# 1. Check script is executable
chmod +x ./scripts/run-qa-tests.sh

# 2. Check validation library exists
ls ./scripts/lib/validation.sh

# 3. Check bash version
bash --version  # Should be 3.2+

# 4. Run with explicit bash
bash ./scripts/run-qa-tests.sh
```

### Issue: URL handler doesn't trigger

**Symptom**: Clicking URLs does nothing

**Diagnostic steps**:
```bash
# 1. Check LaunchAgent loaded
launchctl list | grep com.claude.session-launcher

# 2. Check plist exists
ls -la ~/Library/LaunchAgents/com.claude.session-launcher.plist

# 3. Check URL scheme registered
defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers

# 4. Check logs
tail -f ~/.claude-optimizer/url-handler.log
```

**Fix**:
```bash
# Reload LaunchAgent
launchctl unload ~/Library/LaunchAgents/com.claude.session-launcher.plist
launchctl load ~/Library/LaunchAgents/com.claude.session-launcher.plist

# Or reinstall
./scripts/install-url-handler.sh
```

### Issue: Can't create test directories with unicode

**Symptom**: `mkdir: tëst/项目: Invalid argument`

**Solution**:
```bash
# Check terminal encoding
echo $LANG  # Should include UTF-8

# Set if needed
export LANG=en_US.UTF-8

# Try alternate approach
mkdir -p "$HOME/test-unicode-äöü"
```

### Issue: Calendar import fails

**Symptom**: .ics file won't import or shows errors

**Diagnostic**:
```bash
# 1. Validate .ics format
cat test.ics | grep -E "(BEGIN|END):(VCALENDAR|VEVENT)"

# 2. Check for syntax errors
# Should see matching BEGIN/END pairs

# 3. Try importing to Google Calendar instead
# Upload at calendar.google.com
```

---

## Advanced Testing Scenarios

### Scenario A: Testing on Corporate/Managed Mac

**Challenges**:
- May have System Integrity Protection (SIP)
- May restrict LaunchAgent installation
- May require admin approval

**Approach**:
```bash
# 1. Check SIP status
csrutil status

# 2. Test with limited permissions
# Use standard user account, not admin

# 3. Document restrictions encountered
```

### Scenario B: Testing with Different Terminal Apps

**Beyond Terminal.app**:
- iTerm2
- Alacritty
- Kitty

**Note**: Current implementation targets Terminal.app only. Testing with alternatives documents future enhancement opportunities, not current requirements.

### Scenario C: Multi-User Testing

**Setup**:
1. Create second user account on Mac
2. Install URL handler for User A
3. Switch to User B
4. Test isolation

**Expected**: Each user has independent handler configuration

---

## Post-Testing Actions

### After QA Complete

1. **Preserve Test Artifacts**:
   ```bash
   cd ~/qa-testing-workspace
   tar -czf qa-results-$(date +%Y%m%d).tar.gz screenshots/ test.ics
   ```

2. **Archive Results**:
   - Store in project: `docs/qa-results/[date]/`
   - Include summary, screenshots, logs

3. **Update Documentation**:
   - If issues found, update troubleshooting guides
   - Document any quirks discovered

4. **Communicate Results**:
   - Share summary with team
   - Highlight blockers immediately
   - Provide test artifacts

5. **Plan Fixes**:
   - Create issues for failures
   - Prioritize by severity
   - Schedule re-testing after fixes

---

## Quick Reference

### Key Commands

```bash
# Run automated tests
./scripts/run-qa-tests.sh

# Install URL handler
./scripts/install-url-handler.sh

# Uninstall URL handler
./scripts/uninstall-url-handler.sh

# Export calendar
node dist/cli.js calendar export test.ics

# Check LaunchAgent status
launchctl list | grep claude

# View logs
tail -f ~/.claude-optimizer/url-handler.log

# Test URL (change plan number as needed)
open "claude-session://start?plan=10"
```

### Test File Locations

```
QA Checklist:        docs/QA_CHECKLIST.md
Execution Guide:     docs/QA_EXECUTION_GUIDE.md (this file)
Automated Tests:     scripts/run-qa-tests.sh
Results Log:         ~/.claude-optimizer/qa-test-results.log
Handler Log:         ~/.claude-optimizer/url-handler.log
LaunchAgent Plist:   ~/Library/LaunchAgents/com.claude.session-launcher.plist
```

### Support

**If you encounter issues during testing**:
1. Check troubleshooting section above
2. Review relevant documentation in docs/
3. Check project issues/discussions
4. Document issue in test results

---

**Happy Testing!** 🧪

This comprehensive QA process ensures the Mac URL handler is secure, reliable, and ready for deployment.
