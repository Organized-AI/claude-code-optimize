# QA Testing Framework - Overview

**Version**: 1.0
**Created**: 2025-10-03
**Status**: Ready for Use

---

## What is This?

This is a comprehensive Quality Assurance (QA) testing framework for Session 11's Mac URL handler and calendar integration features. It ensures the system is secure, reliable, and ready for production deployment.

---

## Quick Start

### For Developers

**Run automated security tests** (2-5 minutes):
```bash
cd claude-optimizer-v2
./scripts/run-qa-tests.sh
```

All tests should pass before proceeding to manual QA.

### For QA Testers

**Follow the complete testing process** (2-3 hours):
1. Read this overview
2. Run automated tests (above)
3. Follow [QA_EXECUTION_GUIDE.md](./QA_EXECUTION_GUIDE.md)
4. Use [QA_CHECKLIST.md](./QA_CHECKLIST.md) to track progress
5. Refer to [QA_EXPECTED_RESULTS.md](./QA_EXPECTED_RESULTS.md) for examples

---

## Framework Components

### 1. QA_CHECKLIST.md
**Purpose**: Master checklist of all 35 manual tests
**Use**: Mark tests as passed/failed/skipped during testing
**Sections**:
- Installation Scenarios (6 tests)
- Security Validation (7 tests)
- Valid URL Tests (4 tests)
- Error Handling (6 tests)
- Edge Cases (6 tests)
- Calendar Compatibility (6 tests)

### 2. QA_EXECUTION_GUIDE.md
**Purpose**: Step-by-step instructions for running all tests
**Use**: Follow sequentially during QA session
**Includes**:
- Prerequisites and setup
- Automated test execution
- Manual test procedures
- Screenshot guidelines
- Results documentation
- Troubleshooting

### 3. QA_EXPECTED_RESULTS.md
**Purpose**: Detailed expected outputs for every test
**Use**: Reference when checking if test passed
**Includes**:
- Expected terminal outputs
- Expected file system changes
- Expected error messages
- Pass/fail criteria
- Common failure patterns

### 4. scripts/run-qa-tests.sh
**Purpose**: Automated security validation tests
**Use**: Run before manual testing, before deployment
**Tests**:
- 7 security injection tests
- 5 validation tests
- 3 path sanitization tests
- 3 URL parsing tests

---

## Testing Workflow

```
┌─────────────────────────────────────────────┐
│  1. Prerequisites Check                     │
│     • macOS 11+                             │
│     • Node.js 18+                           │
│     • Project built                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  2. Automated Security Tests                │
│     ./scripts/run-qa-tests.sh               │
│     • MUST PASS to continue                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  3. Manual QA Testing                       │
│     Follow QA_EXECUTION_GUIDE.md            │
│     • Section 1: Installation (6 tests)     │
│     • Section 2: Security (7 tests)         │
│     • Section 3: Valid URLs (4 tests)       │
│     • Section 4: Error Handling (6 tests)   │
│     • Section 5: Edge Cases (6 tests)       │
│     • Section 6: Calendar (6 tests)         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  4. Results Documentation                   │
│     • Mark checklist [P]/[F]/[S]            │
│     • Create bug reports for failures       │
│     • Compile summary report                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  5. Deployment Decision                     │
│     • All CRITICAL tests passed? → APPROVE  │
│     • Critical failures? → REJECT           │
│     • Minor issues? → APPROVE WITH NOTES    │
└─────────────────────────────────────────────┘
```

---

## Test Coverage

### Security Testing (CRITICAL)
- ✅ Command injection prevention (semicolon, subshell, backtick)
- ✅ Path traversal prevention
- ✅ SQL/XSS-style injection prevention
- ✅ Empty/missing parameter handling
- ✅ Input validation (alphanumeric + underscore + hyphen only)

### Functionality Testing
- ✅ Fresh installation
- ✅ Re-installation and upgrades
- ✅ Valid URL formats (simple, named, with project)
- ✅ URL encoding/decoding
- ✅ Error messages (invalid plan, invalid path)
- ✅ Cross-platform compatibility (macOS versions)

### Edge Case Testing
- ✅ Very long inputs (255+ chars)
- ✅ Special characters (hyphen, underscore)
- ✅ Paths with spaces
- ✅ Unicode characters
- ✅ Concurrent requests

### Integration Testing
- ✅ Calendar .ics export
- ✅ Import to Calendar.app
- ✅ Import to Google Calendar
- ✅ iPhone sync and display
- ✅ URL clickability
- ✅ Text copy functionality

---

## Severity Levels

Tests are categorized by severity:

**CRITICAL** (Must Pass):
- Security validation tests
- Fresh installation
- Basic URL handling
- Calendar import to Calendar.app

**HIGH** (Should Pass):
- Re-installation
- Error handling
- Custom project paths
- URL encoding

**MEDIUM** (Nice to Have):
- Unicode support
- Google Calendar import
- iPhone display

**LOW** (Optional):
- Disk full scenarios
- Very long inputs
- Concurrent requests

---

## Time Estimates

| Activity | Time | Tokens (if automated) |
|----------|------|----------------------|
| Automated Tests | 2-5 min | N/A |
| Manual Installation Tests | 30 min | - |
| Manual Security Tests | 30 min | - |
| Manual Valid URL Tests | 20 min | - |
| Manual Error Tests | 30 min | - |
| Manual Edge Case Tests | 30 min | - |
| Manual Calendar Tests | 45 min | - |
| Results Documentation | 30 min | - |
| **TOTAL** | **3-4 hours** | - |

---

## Prerequisites

### System Requirements
- macOS Big Sur (11.x) or later
- Node.js 18+
- npm
- Terminal.app
- Apple Calendar.app
- 500 MB free disk space

### Testing Tools
- Text editor (for marking up checklist)
- Screenshot tool (macOS built-in: Cmd+Shift+4)
- Optional: Screen recording (for bug reports)
- Optional: iPhone (for mobile calendar tests)

### Knowledge Requirements
- Basic terminal/command line usage
- Understanding of URLs and URL schemes
- Familiarity with macOS LaunchAgents (helpful)
- Basic security concepts (injection attacks)

---

## File Locations

### QA Documentation
```
docs/
├── QA_README.md                 ← You are here
├── QA_CHECKLIST.md              ← Master test checklist
├── QA_EXECUTION_GUIDE.md        ← Step-by-step guide
└── QA_EXPECTED_RESULTS.md       ← Expected outputs reference
```

### Test Scripts
```
scripts/
├── run-qa-tests.sh              ← Automated security tests
├── install-url-handler.sh       ← URL handler installer
├── uninstall-url-handler.sh     ← URL handler uninstaller
├── handle-session-url.sh        ← URL handler script
└── lib/
    └── validation.sh            ← Security validation library
```

### Test Logs
```
~/.claude-optimizer/
├── qa-test-results.log          ← Automated test results
└── url-handler.log              ← URL handler activity log
```

### System Files
```
~/Library/LaunchAgents/
└── com.claude.session-launcher.plist  ← URL handler LaunchAgent
```

---

## Common Issues

### Automated Tests Fail

**Problem**: `./scripts/run-qa-tests.sh` shows failures

**Solution**:
1. Check validation library exists: `ls scripts/lib/validation.sh`
2. If missing, implement Phase 0 of SESSION_11_PLAN_REVISED.md
3. Review failed test output in `~/.claude-optimizer/qa-test-results.log`
4. Fix validation logic in `scripts/lib/validation.sh`

### URL Handler Not Triggering

**Problem**: Clicking URLs does nothing

**Diagnostic**:
```bash
# Check LaunchAgent loaded
launchctl list | grep com.claude.session-launcher

# Check plist valid
plutil -lint ~/Library/LaunchAgents/com.claude.session-launcher.plist

# Check logs
tail -f ~/.claude-optimizer/url-handler.log
```

**Solution**:
```bash
# Reinstall handler
./scripts/uninstall-url-handler.sh
./scripts/install-url-handler.sh
```

### Calendar Import Fails

**Problem**: .ics file won't import to Calendar.app

**Diagnostic**:
```bash
# Check .ics format
cat test.ics | grep -E "(BEGIN|END):(VCALENDAR|VEVENT)"

# Should see matching pairs
```

**Solution**:
- Verify calendar export works: `node dist/cli.js calendar export test.ics`
- Check for invalid characters in description
- Try importing to Google Calendar (more forgiving)

---

## Best Practices

### Before Testing
1. Take VM snapshot (if using VM)
2. Backup important data
3. Close other applications (reduce interference)
4. Allocate uninterrupted time block

### During Testing
1. Follow tests in order (later tests may depend on earlier)
2. Document everything (better too much than too little)
3. Take screenshots of failures
4. Don't skip CRITICAL tests
5. If stuck, check troubleshooting section

### After Testing
1. Compile results immediately (while fresh)
2. File bug reports for failures
3. Preserve test artifacts (screenshots, logs)
4. Communicate blockers to team
5. Archive results for future reference

---

## Success Criteria

### Minimum for Deployment
- ✅ All automated security tests PASS
- ✅ All CRITICAL manual tests PASS
- ✅ No command injection vulnerabilities
- ✅ URL handler installs and works on macOS 11+
- ✅ Calendar export/import works

### Ideal State
- ✅ All tests PASS (no failures)
- ✅ Clear documentation
- ✅ No unresolved bugs
- ✅ Works on multiple macOS versions
- ✅ iPhone calendar integration verified

### Acceptable Compromises
- ⚠️ MEDIUM/LOW tests may have minor issues
- ⚠️ Unicode support may be partial
- ⚠️ Google Calendar formatting may differ from Calendar.app
- ⚠️ iPhone URL clicking may not work (copy-paste is OK)

---

## Support & Feedback

### Questions During Testing?
1. Check troubleshooting sections in guides
2. Review expected results reference
3. Search handler logs for clues
4. Document issue for team review

### Found a Gap in QA Docs?
1. Note the missing information
2. Document in test results
3. Suggest improvement for next version

### Suggestions for Improvement?
This is v1.0 of the QA framework. Your feedback helps improve it!

---

## Changelog

### Version 1.0 (2025-10-03)
- Initial QA framework creation
- 35 manual test cases
- 17+ automated security tests
- Complete documentation suite
- Ready for Session 11 QA

---

## Next Steps

Ready to start testing?

1. **Run automated tests**:
   ```bash
   ./scripts/run-qa-tests.sh
   ```

2. **If automated tests pass**, proceed to manual QA:
   - Open [QA_EXECUTION_GUIDE.md](./QA_EXECUTION_GUIDE.md)
   - Follow step-by-step instructions
   - Mark [QA_CHECKLIST.md](./QA_CHECKLIST.md) as you go

3. **If automated tests fail**, fix issues first:
   - Review logs: `cat ~/.claude-optimizer/qa-test-results.log`
   - Fix validation logic
   - Re-run automated tests
   - Don't proceed to manual QA until automated tests pass

---

**Good luck with testing!** 🧪

This framework ensures Session 11's Mac URL handler is secure, reliable, and ready for your weekend coding sessions.
