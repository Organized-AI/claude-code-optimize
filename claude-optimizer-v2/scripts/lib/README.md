# Security & Validation Library - Phase 0 Implementation

**Status**: COMPLETE - All tests passing
**Created**: 2025-10-03
**Purpose**: Security foundation for Session 11 URL handler implementation

---

## Overview

This library provides production-ready security validation for the macOS URL handler (`claude-session://`) to prevent command injection, path traversal, and other attacks. All user input from URLs is validated before execution.

### Security Guarantees

- NO `eval` usage
- NO unquoted variables in commands
- ALL user input validated before use
- Path operations use safe resolution
- URL decoding does not execute code
- Comprehensive error messages

---

## Files Created

### 1. `/scripts/lib/validation.sh`

Input validation and sanitization module

**Functions**:
- `validate_plan_name(plan)` - Validates session plan names
- `sanitize_path(path, [check_exists])` - Sanitizes and validates file paths
- `parse_url_safe(url)` - Safely parses URL parameters
- `url_decode(encoded_string)` - Decodes URL-encoded strings
- `validate_plan_exists(plan, project_root)` - Verifies plan file exists
- `validate_url_inputs(url, default_project)` - Master validation function

**Security Features**:
- Plan name regex: `^[a-zA-Z0-9_-]+$` (max 100 chars)
- Path traversal detection for relative paths
- System directory blocking (`/etc`, `/System`, `/var/root`)
- Safe directory allowlist (`$HOME`, `/tmp`, `/var/folders`)
- URL scheme validation (`claude-session://` only)
- Command validation (`start` only)

**Usage Example**:
```bash
source scripts/lib/validation.sh

# Validate plan name
if validate_plan_name "SESSION_10"; then
    echo "Valid plan name"
fi

# Sanitize path
safe_path=$(sanitize_path "/some/path")

# Validate complete URL
if validate_url_inputs "claude-session://start?plan=10" "$PROJECT_ROOT"; then
    echo "Plan: $VALIDATED_PLAN"
    echo "Project: $VALIDATED_PROJECT"
fi
```

---

### 2. `/scripts/lib/preflight.sh`

Dependency checker for installation validation

**Functions**:
- `check_dependencies()` - Validates all system requirements
- `check_project_built()` - Verifies dist/ directory exists
- `check_npm_installed()` - Confirms node_modules present
- `check_not_already_installed()` - Detects existing installation
- `preflight_check(project_root)` - Complete pre-flight validation

**Dependencies Checked**:
- macOS platform (Darwin)
- Node.js 18+ installed
- npm available
- launchctl accessible
- LaunchAgents directory writable
- Terminal.app exists
- osascript available
- Disk space sufficient

**Usage Example**:
```bash
source scripts/lib/preflight.sh

if preflight_check "/path/to/project"; then
    echo "Ready to install"
else
    echo "Fix dependencies first"
    exit 1
fi
```

---

### 3. `/scripts/lib/errors.sh`

Error handling framework with rollback capabilities

**Functions**:
- `init_error_handling()` - Sets up trap handlers
- `error_handler(exit_code, line_number)` - Handles command failures
- `log(level, message)` - Structured logging
- `record_state(action, target)` - Tracks installation steps
- `rollback_installation()` - Undoes partial installations
- `cleanup_on_exit()` - Cleanup handler for script exit
- `user_friendly_error(error_type, details)` - User-facing error messages
- `safe_exit(code, [error_type], [details])` - Safe exit with optional error
- `with_progress(message, command...)` - Progress indicator wrapper
- `confirm(prompt)` - Interactive confirmation
- `show_success_summary()` - Installation success message

**Log Levels**:
- `DEBUG` - Only shown when `DEBUG=1`
- `INFO` - Normal informational messages
- `WARN` - Warnings (to stderr)
- `ERROR` - Errors (to stderr)

**Rollback Actions Supported**:
- `plist_created` - Removes LaunchAgent plist
- `launchagent_loaded` - Unloads LaunchAgent
- `file_created` - Removes created file
- `directory_created` - Removes empty directory
- `backup_created` - Restores from backup

**Usage Example**:
```bash
source scripts/lib/errors.sh

init_error_handling

# Record installation steps for rollback
record_state "plist_created" "$PLIST_PATH"
record_state "launchagent_loaded" "$PLIST_PATH"

# If error occurs, rollback is automatic via trap
```

---

### 4. `/scripts/test-security.sh`

Comprehensive security validation test suite

**Test Coverage**:
- 19 plan name validation tests
- 10 path sanitization tests
- 8 URL parsing tests
- 3 end-to-end integration tests
- **Total: 40 tests**

**Test Categories**:
1. **Plan Name Validation**
   - Valid: alphanumeric, underscores, hyphens
   - Invalid: command injection, special chars, empty, too long

2. **Path Sanitization**
   - Valid: absolute paths, home directory, current directory
   - Invalid: path traversal, system directories, non-existent

3. **URL Parsing**
   - Valid: proper scheme, parameters, encoding
   - Invalid: wrong scheme, missing parameters, unknown commands

4. **Integration**
   - Valid: complete URL with plan file
   - Invalid: non-existent plans, malicious URLs

**Running Tests**:
```bash
cd /path/to/project
./scripts/test-security.sh

# Expected output:
# ========================================
#   Test Results
# ========================================
#   Tests run:    40
#   Tests passed: 40
#   Tests failed: 0
#
# ALL SECURITY TESTS PASSED
```

---

## Security Test Results

### Attack Vectors Tested & Blocked

| Attack Type | Example Input | Status |
|-------------|---------------|--------|
| Command injection | `10;rm -rf /` | BLOCKED |
| Subshell execution | `10$(whoami)` | BLOCKED |
| Backtick execution | ``10`whoami` `` | BLOCKED |
| Path traversal | `../../etc/passwd` | BLOCKED |
| Pipe injection | `10|cat /etc/passwd` | BLOCKED |
| Ampersand injection | `10&ls` | BLOCKED |
| Shell redirection | `10>file` | BLOCKED |
| System directory access | `/etc` | BLOCKED |
| System directory access | `/System` | BLOCKED |
| Special characters | `SESSION"10` | BLOCKED |
| Empty input | `` | BLOCKED |
| Oversized input | 101+ characters | BLOCKED |

### Valid Inputs Accepted

| Input Type | Example | Status |
|------------|---------|--------|
| Simple number | `10` | ACCEPTED |
| With underscore | `SESSION_10` | ACCEPTED |
| Mixed case | `Session_10_Plan` | ACCEPTED |
| With hyphen | `session-10` | ACCEPTED |
| Alpha only | `SESSION` | ACCEPTED |
| Alphanumeric | `Session10A` | ACCEPTED |

---

## Integration Guide

### For URL Handler (`handle-session-url.sh`)

Replace the TODO section (lines 33-53) with:

```bash
# Source validation library
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/lib/validation.sh"
source "$SCRIPT_DIR/lib/errors.sh"

# Initialize error handling
init_error_handling

# Validate and parse URL
if ! validate_url_inputs "$URL" "$PROJECT_ROOT"; then
    safe_exit 1 "invalid_url" "$URL"
fi

# Use validated outputs (set by validate_url_inputs)
PLAN="$VALIDATED_PLAN"
PROJECT_PATH="$VALIDATED_PROJECT"

# Log successful validation
log "INFO" "Validated URL - Plan: $PLAN, Project: $PROJECT_PATH"
```

### For Installation Script (`install-url-handler.sh`)

Add at the beginning:

```bash
# Source libraries
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/lib/preflight.sh"
source "$SCRIPT_DIR/lib/errors.sh"

# Initialize error handling
init_error_handling

# Run pre-flight checks
if ! preflight_check "$PROJECT_ROOT"; then
    safe_exit 1
fi

echo "Pre-flight checks passed - proceeding with installation..."

# Track installation steps for rollback
record_state "plist_created" "$PLIST_PATH"
# ... install steps ...
record_state "launchagent_loaded" "$PLIST_PATH"

# Show success
show_success_summary
```

---

## Testing Instructions

### 1. Run Security Tests

```bash
cd /path/to/claude-optimizer-v2
./scripts/test-security.sh
```

All 40 tests must pass before proceeding to Phase 1.

### 2. Manual Validation Tests

```bash
# Source the validation library
source scripts/lib/validation.sh

# Test malicious inputs (should fail)
validate_plan_name "10; rm -rf /"
# Expected: ERROR: Invalid plan name format

validate_plan_name '10$(whoami)'
# Expected: ERROR: Invalid plan name format

sanitize_path "../../etc/passwd"
# Expected: ERROR: Path traversal detected

parse_url_safe "http://malicious.com"
# Expected: ERROR: Invalid URL scheme

# Test valid inputs (should succeed)
validate_plan_name "SESSION_10"
# Expected: (no output, exit code 0)

sanitize_path "$HOME"
# Expected: /Users/yourname (exit code 0)

parse_url_safe "claude-session://start?plan=10"
# Expected: (sets PARSED_PLAN=10, exit code 0)
```

### 3. Dependency Check Test

```bash
source scripts/lib/preflight.sh
check_dependencies
```

Expected output shows all dependencies as found.

### 4. Error Handling Test

```bash
source scripts/lib/errors.sh
init_error_handling

# Test logging
log "INFO" "Test message"
log "ERROR" "Test error"

# Test user-friendly errors
user_friendly_error "node_not_found"
# Expected: Formatted error with solution steps
```

---

## Maintenance

### Adding New Validation Rules

1. Add function to `validation.sh`
2. Export the function at bottom of file
3. Add corresponding tests to `test-security.sh`
4. Run `./scripts/test-security.sh` to verify

### Adding New Dependencies

1. Add check to `check_dependencies()` in `preflight.sh`
2. Update this README with new requirement
3. Test on clean macOS installation

### Adding New Error Types

1. Add case to `user_friendly_error()` in `errors.sh`
2. Include problem description and solution steps
3. Test by calling `user_friendly_error "new_type" "details"`

---

## Troubleshooting

### Tests Fail on macOS

**Issue**: Path resolution differences between macOS versions

**Solution**: Tests normalize paths using `perl -MCwd` to match validation behavior

### realpath Not Found

**Issue**: Some macOS systems missing GNU realpath

**Solution**: Library uses perl fallback automatically (already implemented)

### Permission Denied Errors

**Issue**: LaunchAgents directory not writable

**Solution**: Run preflight check which validates permissions

---

## Next Steps (Phase 1)

After Phase 0 validation passes:

1. Integrate validation into `handle-session-url.sh`
2. Integrate preflight checks into `install-url-handler.sh`
3. Add error handling with rollback
4. Test complete URL handler workflow
5. Proceed to QA checklist

---

## Security Audit Checklist

- [x] No eval usage
- [x] No unquoted variables in commands
- [x] Input validation before use
- [x] Path traversal prevention
- [x] Command injection prevention
- [x] System directory protection
- [x] URL scheme validation
- [x] Comprehensive error messages
- [x] Test coverage for all attack vectors
- [x] Safe path resolution
- [x] URL decoding without code execution

**Status: ALL SECURITY REQUIREMENTS MET**

---

## References

- SESSION_11_PLAN_REVISED.md - Phase 0 requirements
- SESSION_11_GAP_ANALYSIS.md - Security gaps identified
- OWASP Command Injection Prevention Cheat Sheet
- CWE-78: OS Command Injection
- CWE-22: Path Traversal

---

**Implementation Complete**: 2025-10-03
**Test Results**: 40/40 passing (100%)
**Ready for**: Phase 1 integration
