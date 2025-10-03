# Session 11: One-Click Mac Session Launch (Revised - Realistic Scope)

**Status**: 🟢 READY TO START
**Estimated Time**: 3-3.5 hours
**Estimated Tokens**: 50-65k tokens (25-33% of Pro quota)
**Fits Pro Quota**: ✅ YES (with 135-150k buffer)
**Prerequisites**: SESSION 10 complete (session start command working)
**Created**: 2025-10-03
**Revised**: 2025-10-03 (After gap analysis - See SESSION_11_GAP_ANALYSIS.md)

---

## Executive Summary

**What We Have Now** (Session 10 Result):
- ✅ `session start <plan>` command works perfectly
- ✅ SESSION plans parse correctly with all objectives
- ✅ iCal export creates `.ics` files for iPhone
- ✅ Manual workflow: iPhone calendar → copy command → laptop terminal

**Gap Analysis Findings**:
- 🔴 Original plan had critical security gaps (command injection vulnerability)
- 🔴 No testing framework or validation
- 🔴 iOS integration was wishful thinking (requires SSH setup not in scope)
- 🔴 No error handling or rollback mechanism
- 🔴 Missing dependency checks (Node.js, launchctl, permissions)

**This Session Delivers** (Revised - Realistic):
- ✅ **Mac-focused**: Secure one-click URL handler for macOS
- ✅ **Security-first**: Input validation prevents command injection
- ✅ **Robust**: Error handling with rollback on failure
- ✅ **Tested**: Manual QA checklist ensures reliability
- ✅ **Honest iPhone workflow**: Clear copy-paste instructions (no false promises)

---

## Session Objectives

### Primary (Mac Experience - Must Have)
1. **Security Foundation** - Input validation and sanitization library
2. **Enhanced Calendar Export** - Session start commands with secure URLs
3. **Secure URL Handler** - Validated Mac URL scheme (no command injection)
4. **Robust Installation** - Scripts with dependency checks, error handling, rollback
5. **Manual QA** - Comprehensive testing checklist
6. **Clear Documentation** - Setup guide with troubleshooting

### Secondary (iPhone Experience - Realistic)
7. **iPhone Manual Workflow** - Copy-paste instructions that work
8. **Honest Limitations** - Document what iPhone can/cannot do

---

## Phase Breakdown

### Phase 0: Security & Validation Foundation (45 min, 10-15k tokens)

**Objective**: Build security layer BEFORE implementing URL handler

**Tasks**:
1. Create `scripts/lib/validation.sh` - Input validation module
   ```bash
   validate_plan_name() {
       # Only allow alphanumeric, underscore, hyphen
       # Reject: 10;rm -rf /
       # Accept: 10, SESSION_10_PLAN, SESSION_6B
   }

   sanitize_path() {
       # Prevent path traversal
       # Resolve to absolute path
       # Validate directory exists
   }

   parse_url_safe() {
       # Extract parameters without eval
       # Handle URL encoding
       # Return validated values
   }
   ```

2. Create `scripts/lib/preflight.sh` - Dependency checker
   ```bash
   check_dependencies() {
       # Node.js 18+ installed
       # npm available
       # launchctl not sandboxed
       # Write permissions to ~/Library/LaunchAgents
       # Terminal.app exists
   }
   ```

3. Create `scripts/lib/errors.sh` - Error handling framework
   ```bash
   rollback_installation() {
       # Undo plist creation
       # Unload LaunchAgent
       # Restore previous state
   }

   user_friendly_error() {
       # Convert technical errors to helpful messages
       # Suggest fixes
   }
   ```

**Deliverables**:
- ✅ Security validation library
- ✅ Pre-flight dependency checker
- ✅ Error handling with rollback

**Test**:
```bash
source scripts/lib/validation.sh
validate_plan_name "10; rm -rf /"  # MUST FAIL
validate_plan_name "SESSION_10"    # MUST PASS
```

---

### Phase 1: Enhanced Calendar Export (30 min, 8-12k tokens)

**Status**: ✅ ALREADY IMPLEMENTED - Just needs validation

**Tasks**:
1. Verify `calendar-service.ts` enhancements
   - ✅ URLs included in description
   - ✅ Manual commands present
   - ✅ Multi-device instructions

2. Validate iCal output
   - Test .ics file imports correctly
   - Verify URLs are clickable on Mac
   - Ensure formatting works on iPhone

**Deliverables**:
- ✅ Enhanced calendar export (already done)
- ✅ Validation that output is correct

---

### Phase 2: Secure Mac URL Handler (1 hour, 15-20k tokens)

**Objective**: Build **secure** one-click launcher (no command injection)

**Tasks**:
1. **Enhance** `scripts/install-url-handler.sh`
   - ✅ Basic version exists
   - ➕ Add `source scripts/lib/preflight.sh`
   - ➕ Run dependency checks before install
   - ➕ Add rollback on any failure
   - ➕ Verify LaunchAgent loaded successfully

2. **Secure** `scripts/handle-session-url.sh`
   - ✅ Basic structure exists
   - ➕ **HUMAN TASK #1**: Implement secure URL parsing using validation.sh
   - ➕ Validate all inputs before use
   - ➕ Add comprehensive error messages
   - ➕ Log all operations for debugging

3. **Test** `scripts/uninstall-url-handler.sh`
   - ✅ Basic version exists
   - ➕ Verify complete cleanup
   - ➕ Test URLs stop working after removal

**Deliverables**:
- ✅ Hardened installation script
- ✅ Secure URL handler (after human parsing task)
- ✅ Reliable uninstaller

**Test**:
```bash
# Security test
open "claude-session://start?plan=10;rm -rf /"  # MUST REJECT
open "claude-session://start?plan=../../etc/passwd"  # MUST REJECT
open "claude-session://start?plan=10"  # MUST WORK
```

---

### Phase 3: Manual QA & Validation (45 min, 10-12k tokens)

**Objective**: Ensure Mac workflow is bulletproof

**Tasks**:
1. Create `docs/QA_CHECKLIST.md`
   - Installation scenarios (fresh, re-install, upgrade)
   - Security validation (malicious URLs rejected)
   - Error handling (missing deps, wrong permissions)
   - Edge cases (special characters, long paths)

2. Execute QA checklist
   - Test each scenario manually
   - Document results
   - Fix critical bugs immediately

3. Calendar compatibility testing
   - Import .ics to Calendar.app (Mac)
   - Import to Google Calendar
   - Test URL clicking
   - Verify on iPhone display

**Deliverables**:
- ✅ Comprehensive QA checklist
- ✅ All tests passing
- ✅ Bugs fixed

---

### Phase 4: iPhone Reality Documentation (30 min, 6-8k tokens)

**Objective**: Honest, working iPhone workflow (no SSH complexity)

**Approach - Manual is OK**:
1. Update calendar export descriptions:
   ```
   📱 IPHONE WORKFLOW:
   1. Open calendar event (you're here!)
   2. Find "Manual Command" below
   3. Press and hold → Select All → Copy
   4. Switch to your laptop
   5. Open Terminal, paste command
   6. Press Enter → Session starts!

   💻 Manual Command (tap to copy):
   cd /path/to/project
   node dist/cli.js session start 10
   ```

2. Document in `WEEKEND_SESSION_GUIDE.md`:
   - iPhone = scheduling & viewing
   - Laptop = execution
   - This is expected, not a bug

3. Note future possibilities (SESSION 12):
   - SSH remote launch (complex setup)
   - iOS Shortcuts (reliability issues)
   - Web launcher (requires server)

**Deliverables**:
- ✅ Clear iPhone copy-paste workflow
- ✅ Honest documentation
- ✅ No automation promises we can't keep

---

### Phase 5: Documentation & Polish (30 min, 5-8k tokens)

**Objective**: Professional docs ready for weekend

**Tasks**:
1. Update `WEEKEND_SESSION_GUIDE.md`
   - Mac one-click section
   - iPhone manual section
   - Troubleshooting
   - What works / What doesn't

2. Enhance `URL_HANDLER_SETUP.md` (already exists)
   - Add security notes
   - Add dependency requirements
   - Add troubleshooting decision tree

3. Create `docs/QUICK_START.md`
   - One-page cheat sheet
   - Common commands
   - Quick troubleshooting

**Deliverables**:
- ✅ Updated comprehensive guides
- ✅ Quick reference card
- ✅ Clear expectations

---

## Learning Opportunities

### ● **Learn by Doing #1: Secure URL Parsing**

**Context**: I've built the URL handler infrastructure, but parsing URL parameters safely is critical. The handler receives URLs like `claude-session://start?plan=10&project=/path`, and we need to extract parameters WITHOUT command injection vulnerabilities.

**Your Task**: In `scripts/handle-session-url.sh` (line ~35), implement URL parsing that:
1. Extracts `plan` parameter safely
2. Extracts optional `project` parameter
3. **Validates input** using security functions from Phase 0
4. **Rejects malicious input** like `plan=10;rm -rf /`

**Guidance**: After Phase 0 creates validation.sh, you'll use it here. The parsing should:
- Strip `claude-session://start?` prefix
- Split on `&` for multiple parameters
- Extract values after `=` signs
- Pass each value through `validate_plan_name()` before use

Think about: What if project path contains `&` or `=`? How do we handle URL encoding (`%20` for spaces, `%2F` for slashes)?

---

### ● **Learn by Doing #2: Error Handling Strategy**

**Context**: Installation can fail many ways—permissions denied, launchctl unavailable, disk full. Making the installer robust requires understanding error propagation and recovery.

**Your Task**: In `scripts/install-url-handler.sh`, add rollback mechanism that cleans up partial installations.

**Guidance**: Consider:
- What state changes does the script make?
- How do we detect if each step succeeded?
- If step 3 fails, how do we undo steps 1-2?
- How do we communicate errors to users?

Use bash `trap` to catch errors, and create cleanup functions that are idempotent (safe to run multiple times).

---

## Token Budget (Revised)

| Phase | Task | Tokens | % | Status |
|-------|------|--------|---|--------|
| 0 | Security & validation | 10-15k | 20-23% | NEW ⚠️ |
| 1 | Calendar validation | 8-12k | 16-18% | ✅ Partial |
| 2 | Secure URL handler | 15-20k | 30-31% | ➕ Enhanced |
| 3 | Manual QA | 10-12k | 20-18% | NEW ✅ |
| 4 | iPhone docs | 6-8k | 12-12% | ➕ Honest |
| 5 | Documentation | 5-8k | 10-12% | ➕ Polish |
| **Total** | **All phases** | **50-65k** | **100%** | |

**Buffer**: 135-150k tokens (68-75% quota remaining)

---

## Success Criteria (Realistic)

### ✅ Must Have (Mac):
1. ✅ Calendar events with commands (done)
2. ✅ Secure URL handler (no injection)
3. ✅ Installation with rollback
4. ✅ QA checklist passes
5. ✅ Clear documentation

### 🎯 Nice to Have (Future):
1. ❌ iOS Shortcuts → SESSION 12
2. ❌ Automated tests → SESSION 12
3. ❌ Calendar watcher integration → SESSION 12

### 📱 iPhone (Honest):
1. ✅ Clear copy-paste workflow
2. ✅ Documented limitations
3. ✅ No false automation promises

---

## Post-Session Validation

### Critical Security Tests
```bash
# 1. Malicious input rejected
./scripts/test-security.sh
# Rejects: plan=10;rm -rf /
# Rejects: plan=../../etc/passwd
# Accepts: plan=10, SESSION_10_PLAN

# 2. Valid calendar export
node dist/cli.js calendar export test.ics

# 3. URL handler installed
ls ~/Library/LaunchAgents/com.claude.session-launcher.plist
launchctl list | grep claude

# 4. URL works on Mac
open "claude-session://start?plan=10"
# Opens Terminal, starts session

# 5. Error handling
open "claude-session://start?plan=invalid"
# Shows clear error, doesn't crash

# 6. Clean uninstall
./scripts/uninstall-url-handler.sh
# Removes everything, URLs stop working

# 7. Reinstall works
./scripts/install-url-handler.sh
# Works after uninstall
```

### Manual QA (See QA_CHECKLIST.md)
- [ ] Import .ics to Calendar.app
- [ ] URLs clickable on Mac
- [ ] iPhone copy-paste tested
- [ ] Error messages user-friendly
- [ ] All docs accurate

---

## Key Improvements from Original Plan

1. **Added Phase 0** - Security foundation (was completely missing)
2. **Realistic iPhone** - Manual workflow instead of impossible automation
3. **Added QA phase** - Testing was mentioned but not planned
4. **Security focus** - Input validation throughout
5. **Error handling** - Rollback and recovery mechanisms
6. **Honest scope** - Mac works great, iPhone works manually

**Result**: Longer (3-3.5h vs 2.5-3.5h) but ACTUALLY WORKS and is SECURE.

---

**Ready to implement? All critical gaps addressed. Mac experience will be solid, iPhone will work (just manually). No security holes, no false promises.** 🚀
