# QA Framework - Quick Start Guide

**Version**: 1.0
**Reading Time**: 2 minutes
**Purpose**: Get started with QA testing in under 5 minutes

---

## For Developers: Pre-Deployment Testing

### Step 1: Run Automated Tests (2 minutes)

```bash
cd claude-optimizer-v2
./scripts/run-qa-tests.sh
```

**Expected Output**:
```
================================================
  Claude Code Optimizer - QA Security Tests
================================================

[PASS] Command Injection (Semicolon)
[PASS] Path Traversal Attack
...

Total Tests:     17
Passed:          17
Failed:           0

ALL TESTS PASSED! Security validation is working correctly.
```

### Step 2: Interpret Results

**✅ All Tests Passed**:
- Security validation working correctly
- Safe to deploy
- Ready for manual QA (optional)

**❌ Any Tests Failed**:
- **DO NOT DEPLOY**
- Review failures in log: `~/.claude-optimizer/qa-test-results.log`
- Fix validation logic in `scripts/lib/validation.sh`
- Re-run tests until all pass

### Step 3: Deploy or Continue to Manual QA

**If automated tests pass**:
- Option A: Deploy (automated tests cover critical security)
- Option B: Run full manual QA for comprehensive validation

---

## For QA Testers: Full Testing

### Phase 1: Automated Tests (5 minutes)

```bash
cd claude-optimizer-v2
./scripts/run-qa-tests.sh
```

**If any tests fail**: Stop, report to development team

### Phase 2: Manual Testing (2-3 hours)

```bash
# Open the execution guide
open docs/QA_EXECUTION_GUIDE.md

# Open the checklist (mark as you go)
open docs/QA_CHECKLIST.md

# Keep expected results handy
open docs/QA_EXPECTED_RESULTS.md
```

**Follow the guide section by section**:
1. Installation Tests (30 min)
2. Security Tests (30 min)
3. Valid URL Tests (20 min)
4. Error Handling Tests (30 min)
5. Edge Case Tests (30 min)
6. Calendar Tests (45 min)

### Phase 3: Results (30 minutes)

**Compile Summary**:
- Count passed/failed/skipped tests
- List critical failures (blockers)
- Document bugs found
- Make deployment recommendation

---

## Quick Reference

### File Locations

**Documentation**:
- `docs/QA_README.md` - Framework overview
- `docs/QA_CHECKLIST.md` - 35 manual tests
- `docs/QA_EXECUTION_GUIDE.md` - Step-by-step guide
- `docs/QA_EXPECTED_RESULTS.md` - Expected outputs
- `docs/QA_FRAMEWORK_SUMMARY.md` - Complete summary

**Scripts**:
- `scripts/run-qa-tests.sh` - Automated security tests
- `scripts/install-url-handler.sh` - URL handler installer
- `scripts/uninstall-url-handler.sh` - URL handler uninstaller

**Logs**:
- `~/.claude-optimizer/qa-test-results.log` - Automated test results
- `~/.claude-optimizer/url-handler.log` - URL handler activity

### Key Commands

```bash
# Run automated tests
./scripts/run-qa-tests.sh

# Install URL handler
./scripts/install-url-handler.sh

# Test URL
open "claude-session://start?plan=10"

# Check logs
tail -f ~/.claude-optimizer/url-handler.log

# Uninstall
./scripts/uninstall-url-handler.sh
```

### Test Categories

**35 Manual Tests**:
- 6 Installation scenarios
- 7 Security validations
- 4 Valid URL tests
- 6 Error handling tests
- 6 Edge cases
- 6 Calendar compatibility tests

**17+ Automated Tests**:
- 7 Security injection tests
- 5 Input validation tests
- 2 Path sanitization tests
- 3 URL parsing tests

---

## Troubleshooting

### Issue: Automated tests won't run

**Error**: `bash: ./scripts/run-qa-tests.sh: Permission denied`

**Fix**:
```bash
chmod +x ./scripts/run-qa-tests.sh
./scripts/run-qa-tests.sh
```

### Issue: Validation library not found

**Error**: `Validation library not found at: scripts/lib/validation.sh`

**Fix**: Implement Phase 0 of SESSION_11_PLAN_REVISED.md first
```bash
# Create validation library
mkdir -p scripts/lib
# Implement validation.sh with required functions:
# - validate_plan_name()
# - sanitize_path()
# - parse_url_safe()
```

### Issue: URL handler doesn't work

**Diagnostic**:
```bash
# Check LaunchAgent loaded
launchctl list | grep com.claude.session-launcher

# Check plist exists
ls ~/Library/LaunchAgents/com.claude.session-launcher.plist
```

**Fix**:
```bash
# Reinstall
./scripts/uninstall-url-handler.sh
./scripts/install-url-handler.sh
```

---

## Next Steps

### Just Want to Run Automated Tests?
```bash
./scripts/run-qa-tests.sh
```

### Ready for Full QA?
```bash
open docs/QA_EXECUTION_GUIDE.md
```

### Need More Details?
```bash
open docs/QA_README.md
```

---

**That's it!** The QA framework is ready to use. Start with automated tests, then proceed to manual testing if needed.
