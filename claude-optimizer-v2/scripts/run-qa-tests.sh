#!/bin/bash

##
# Claude Code Optimizer - Automated QA Security Tests
# Tests URL handler security validation before deployment
##

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_LOG="$HOME/.claude-optimizer/qa-test-results.log"
TEST_TMP="/tmp/claude-qa-tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Initialize
mkdir -p "$(dirname "$TEST_LOG")"
mkdir -p "$TEST_TMP"
echo "=== QA Security Test Run: $(date) ===" > "$TEST_LOG"

##
# Logging functions
##
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
    echo "[INFO] $*" >> "$TEST_LOG"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $*"
    echo "[PASS] $*" >> "$TEST_LOG"
    ((PASSED_TESTS++))
}

log_failure() {
    echo -e "${RED}[FAIL]${NC} $*"
    echo "[FAIL] $*" >> "$TEST_LOG"
    ((FAILED_TESTS++))
}

log_skip() {
    echo -e "${YELLOW}[SKIP]${NC} $*"
    echo "[SKIP] $*" >> "$TEST_LOG"
    ((SKIPPED_TESTS++))
}

##
# Test execution wrapper
##
run_test() {
    local test_name="$1"
    local test_function="$2"

    ((TOTAL_TESTS++))
    echo ""
    log_info "Running: $test_name"

    if $test_function; then
        log_success "$test_name"
        return 0
    else
        log_failure "$test_name"
        return 1
    fi
}

##
# Validation library sourcing test
##
test_validation_lib_exists() {
    if [[ ! -f "$SCRIPT_DIR/lib/validation.sh" ]]; then
        echo "Validation library not found at: $SCRIPT_DIR/lib/validation.sh"
        echo "This test suite requires the security validation library."
        return 1
    fi

    # Source the validation library
    source "$SCRIPT_DIR/lib/validation.sh"
    return 0
}

##
# Security Test 1: Command Injection via Semicolon
##
test_command_injection_semicolon() {
    local malicious_plan="10;rm -rf /tmp/testfile"

    if validate_plan_name "$malicious_plan" 2>/dev/null; then
        echo "ERROR: Malicious plan with semicolon was accepted!"
        return 1
    fi

    return 0
}

##
# Security Test 2: Path Traversal
##
test_path_traversal() {
    local malicious_plan="../../etc/passwd"

    if validate_plan_name "$malicious_plan" 2>/dev/null; then
        echo "ERROR: Path traversal attack was accepted!"
        return 1
    fi

    return 0
}

##
# Security Test 3: Subshell Command Substitution
##
test_subshell_injection() {
    local malicious_plan='10$(whoami)'

    if validate_plan_name "$malicious_plan" 2>/dev/null; then
        echo "ERROR: Subshell command substitution was accepted!"
        return 1
    fi

    return 0
}

##
# Security Test 4: Backtick Command Substitution
##
test_backtick_injection() {
    local malicious_plan='10`id`'

    if validate_plan_name "$malicious_plan" 2>/dev/null; then
        echo "ERROR: Backtick command substitution was accepted!"
        return 1
    fi

    return 0
}

##
# Security Test 5: SQL-Style Injection
##
test_sql_injection() {
    local malicious_plan="10' OR '1'='1"

    if validate_plan_name "$malicious_plan" 2>/dev/null; then
        echo "ERROR: SQL-style injection was accepted!"
        return 1
    fi

    return 0
}

##
# Security Test 6: XSS-Style Injection
##
test_xss_injection() {
    local malicious_plan="SESSION<script>alert(1)</script>"

    if validate_plan_name "$malicious_plan" 2>/dev/null; then
        echo "ERROR: XSS-style injection was accepted!"
        return 1
    fi

    return 0
}

##
# Security Test 7: Null Byte Injection
##
test_null_byte_injection() {
    local malicious_plan=$'10\x00'

    if validate_plan_name "$malicious_plan" 2>/dev/null; then
        echo "ERROR: Null byte injection was accepted!"
        return 1
    fi

    return 0
}

##
# Validation Test 1: Valid Simple Plan Number
##
test_valid_simple_plan() {
    local valid_plan="10"

    if ! validate_plan_name "$valid_plan" 2>/dev/null; then
        echo "ERROR: Valid plan '10' was rejected!"
        return 1
    fi

    return 0
}

##
# Validation Test 2: Valid Named Plan
##
test_valid_named_plan() {
    local valid_plan="SESSION_10_PLAN"

    if ! validate_plan_name "$valid_plan" 2>/dev/null; then
        echo "ERROR: Valid plan 'SESSION_10_PLAN' was rejected!"
        return 1
    fi

    return 0
}

##
# Validation Test 3: Valid Plan with Hyphen
##
test_valid_plan_hyphen() {
    local valid_plan="SESSION-10-A"

    if ! validate_plan_name "$valid_plan" 2>/dev/null; then
        echo "ERROR: Valid plan 'SESSION-10-A' was rejected!"
        return 1
    fi

    return 0
}

##
# Validation Test 4: Empty Plan Name
##
test_empty_plan() {
    local empty_plan=""

    if validate_plan_name "$empty_plan" 2>/dev/null; then
        echo "ERROR: Empty plan name was accepted!"
        return 1
    fi

    return 0
}

##
# Validation Test 5: Very Long Plan Name
##
test_very_long_plan() {
    local long_plan=$(printf 'A%.0s' {1..300})

    if validate_plan_name "$long_plan" 2>/dev/null; then
        echo "ERROR: Excessively long plan name (300 chars) was accepted!"
        return 1
    fi

    return 0
}

##
# Path Validation Test 1: Path Sanitization
##
test_path_sanitization() {
    # Create a test directory
    local test_dir="$TEST_TMP/test-project"
    mkdir -p "$test_dir"

    # Test that path is resolved correctly
    local sanitized_path
    sanitized_path=$(sanitize_path "$test_dir" 2>/dev/null)

    if [[ ! -d "$sanitized_path" ]]; then
        echo "ERROR: Sanitized path does not exist: $sanitized_path"
        return 1
    fi

    # Check that relative paths are resolved to absolute
    if [[ "$sanitized_path" != /* ]]; then
        echo "ERROR: Path not resolved to absolute: $sanitized_path"
        return 1
    fi

    return 0
}

##
# Path Validation Test 2: Non-existent Path Rejection
##
test_nonexistent_path() {
    local bad_path="/this/path/does/not/exist/anywhere"

    if sanitize_path "$bad_path" 2>/dev/null; then
        echo "ERROR: Non-existent path was accepted!"
        return 1
    fi

    return 0
}

##
# URL Parsing Test 1: Basic URL Parsing
##
test_url_parsing_basic() {
    local test_url="claude-session://start?plan=10"
    local parsed_plan

    parsed_plan=$(parse_url_safe "$test_url" "plan" 2>/dev/null)

    if [[ "$parsed_plan" != "10" ]]; then
        echo "ERROR: Failed to parse plan from URL. Got: '$parsed_plan'"
        return 1
    fi

    return 0
}

##
# URL Parsing Test 2: Multiple Parameters
##
test_url_parsing_multiple() {
    local test_url="claude-session://start?plan=10&project=/tmp/test"
    local parsed_plan
    local parsed_project

    parsed_plan=$(parse_url_safe "$test_url" "plan" 2>/dev/null)
    parsed_project=$(parse_url_safe "$test_url" "project" 2>/dev/null)

    if [[ "$parsed_plan" != "10" ]]; then
        echo "ERROR: Failed to parse plan. Got: '$parsed_plan'"
        return 1
    fi

    if [[ "$parsed_project" != "/tmp/test" ]]; then
        echo "ERROR: Failed to parse project. Got: '$parsed_project'"
        return 1
    fi

    return 0
}

##
# URL Parsing Test 3: URL Encoding
##
test_url_encoding() {
    local test_url="claude-session://start?plan=10&project=/path%20with%20spaces"
    local parsed_project

    parsed_project=$(parse_url_safe "$test_url" "project" 2>/dev/null)

    if [[ "$parsed_project" != "/path with spaces" ]]; then
        echo "ERROR: URL decoding failed. Got: '$parsed_project'"
        return 1
    fi

    return 0
}

##
# Main Test Execution
##
main() {
    echo ""
    echo "================================================"
    echo "  Claude Code Optimizer - QA Security Tests"
    echo "================================================"
    echo ""

    log_info "Test log: $TEST_LOG"
    log_info "Project root: $PROJECT_ROOT"
    echo ""

    # Pre-flight check: Validation library must exist
    log_info "Pre-flight: Checking for validation library..."
    if ! test_validation_lib_exists; then
        echo ""
        echo -e "${RED}CRITICAL:${NC} Security validation library not found!"
        echo "Expected location: $SCRIPT_DIR/lib/validation.sh"
        echo ""
        echo "This library is required for secure URL handling."
        echo "Please implement Phase 0 of SESSION_11_PLAN_REVISED.md first."
        echo ""
        exit 1
    fi
    log_success "Validation library loaded"

    echo ""
    echo "--- Security Validation Tests ---"

    run_test "Command Injection (Semicolon)" test_command_injection_semicolon
    run_test "Path Traversal Attack" test_path_traversal
    run_test "Subshell Injection (\$(...))" test_subshell_injection
    run_test "Backtick Injection (\`...\`)" test_backtick_injection
    run_test "SQL-Style Injection" test_sql_injection
    run_test "XSS-Style Injection" test_xss_injection
    run_test "Null Byte Injection" test_null_byte_injection

    echo ""
    echo "--- Valid Input Tests ---"

    run_test "Valid Simple Plan (10)" test_valid_simple_plan
    run_test "Valid Named Plan (SESSION_10_PLAN)" test_valid_named_plan
    run_test "Valid Plan with Hyphen" test_valid_plan_hyphen
    run_test "Empty Plan Rejection" test_empty_plan
    run_test "Very Long Plan Rejection" test_very_long_plan

    echo ""
    echo "--- Path Validation Tests ---"

    run_test "Path Sanitization" test_path_sanitization
    run_test "Non-existent Path Rejection" test_nonexistent_path

    echo ""
    echo "--- URL Parsing Tests ---"

    # Check if parse_url_safe function exists
    if declare -f parse_url_safe >/dev/null; then
        run_test "Basic URL Parsing" test_url_parsing_basic
        run_test "Multiple Parameters" test_url_parsing_multiple
        run_test "URL Encoding/Decoding" test_url_encoding
    else
        log_skip "URL Parsing Tests (parse_url_safe not implemented)"
        ((TOTAL_TESTS+=3))
        ((SKIPPED_TESTS+=3))
    fi

    # Generate summary
    echo ""
    echo "================================================"
    echo "  Test Summary"
    echo "================================================"
    echo ""
    printf "Total Tests:   %3d\n" $TOTAL_TESTS
    printf "${GREEN}Passed:        %3d${NC}\n" $PASSED_TESTS
    printf "${RED}Failed:        %3d${NC}\n" $FAILED_TESTS
    printf "${YELLOW}Skipped:       %3d${NC}\n" $SKIPPED_TESTS
    echo ""

    # Calculate pass rate
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        local pass_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
        echo "Pass Rate: ${pass_rate}%"
    fi

    echo ""
    echo "Full log: $TEST_LOG"
    echo ""

    # Cleanup
    rm -rf "$TEST_TMP"

    # Exit with failure if any tests failed
    if [[ $FAILED_TESTS -gt 0 ]]; then
        echo -e "${RED}DEPLOYMENT BLOCKED:${NC} Security tests failed!"
        echo "Fix the failing tests before proceeding."
        exit 1
    fi

    echo -e "${GREEN}ALL TESTS PASSED!${NC} Security validation is working correctly."
    echo ""
    exit 0
}

# Run main
main
