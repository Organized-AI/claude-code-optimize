#!/bin/bash

##
# Claude Code Optimizer - Security Validation Tests
# Tests input validation and prevents command injection attacks
# Run this before deploying to ensure security measures work
##

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source validation library
# shellcheck source=lib/validation.sh
source "$SCRIPT_DIR/lib/validation.sh"

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

##
# Test helper - expect success
##
expect_pass() {
    local test_name="$1"
    shift
    local command=("$@")

    ((TESTS_RUN++))

    echo -n "  Testing: $test_name ... "

    if "${command[@]}" &>/dev/null; then
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (expected success, got failure)"
        ((TESTS_FAILED++))
        return 1
    fi
}

##
# Test helper - expect failure
##
expect_fail() {
    local test_name="$1"
    shift
    local command=("$@")

    ((TESTS_RUN++))

    echo -n "  Testing: $test_name ... "

    if "${command[@]}" &>/dev/null; then
        echo -e "${RED}FAIL${NC} (expected failure, got success)"
        ((TESTS_FAILED++))
        return 1
    else
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    fi
}

##
# Test Suite: validate_plan_name
##
test_plan_name_validation() {
    echo ""
    echo "Testing: validate_plan_name()"
    echo "========================================"

    # Valid inputs - should PASS
    expect_pass "Simple number: 10" validate_plan_name "10"
    expect_pass "With underscore: SESSION_10" validate_plan_name "SESSION_10"
    expect_pass "Mixed case: Session_10_Plan" validate_plan_name "Session_10_Plan"
    expect_pass "With hyphen: session-10" validate_plan_name "session-10"
    expect_pass "Alpha only: SESSION" validate_plan_name "SESSION"
    expect_pass "Alphanumeric: Session10A" validate_plan_name "Session10A"

    # Invalid inputs - should FAIL (security tests)
    expect_fail "Command injection: 10;rm -rf /" validate_plan_name "10;rm -rf /"
    expect_fail "Command injection: 10\$(whoami)" validate_plan_name '10$(whoami)'
    expect_fail "Command injection: 10\`whoami\`" validate_plan_name '10`whoami`'
    expect_fail "Path traversal: ../../etc/passwd" validate_plan_name "../../etc/passwd"
    expect_fail "Pipe injection: 10|cat /etc/passwd" validate_plan_name "10|cat /etc/passwd"
    expect_fail "Ampersand: 10&ls" validate_plan_name "10&ls"
    expect_fail "With space: SESSION 10" validate_plan_name "SESSION 10"
    expect_fail "With quotes: SESSION\"10" validate_plan_name 'SESSION"10'
    expect_fail "With single quote: SESSION'10" validate_plan_name "SESSION'10"
    expect_fail "With angle bracket: 10>file" validate_plan_name "10>file"
    expect_fail "With parenthesis: 10(test)" validate_plan_name "10(test)"
    expect_fail "Empty string" validate_plan_name ""
    expect_fail "Too long (101 chars)" validate_plan_name "$(printf 'A%.0s' {1..101})"
}

##
# Test Suite: sanitize_path
##
test_path_sanitization() {
    echo ""
    echo "Testing: sanitize_path()"
    echo "========================================"

    # Create temp directory for testing
    local temp_dir
    temp_dir=$(mktemp -d)

    mkdir -p "$temp_dir/subdir"
    touch "$temp_dir/testfile"

    # Valid inputs - should PASS
    expect_pass "Absolute path" sanitize_path "$temp_dir"
    expect_pass "Home directory" sanitize_path "$HOME"
    expect_pass "Current directory" sanitize_path "."

    # Invalid inputs - should FAIL
    expect_fail "Path traversal: ../../etc/passwd" sanitize_path "../../etc/passwd"
    expect_fail "Path traversal: ../../../etc" sanitize_path "../../../etc"
    expect_fail "Non-existent path" sanitize_path "/this/does/not/exist/anywhere"
    expect_fail "Empty path" sanitize_path ""

    # Test system directory protection
    expect_fail "System directory: /etc" sanitize_path "/etc"
    expect_fail "System directory: /System" sanitize_path "/System"

    # Test path resolution (should resolve to absolute)
    local resolved
    if resolved=$(sanitize_path "$temp_dir" 2>/dev/null); then
        if [[ "$resolved" == /* ]]; then
            echo -e "  Testing: Path resolution to absolute ... ${GREEN}PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "  Testing: Path resolution to absolute ... ${RED}FAIL${NC}"
            ((TESTS_FAILED++))
        fi
        ((TESTS_RUN++))
    fi

    # Cleanup
    rm -rf "$temp_dir"
}

##
# Test Suite: parse_url_safe
##
test_url_parsing() {
    echo ""
    echo "Testing: parse_url_safe()"
    echo "========================================"

    # Valid URLs - should PASS
    local url

    # Test 1: Simple plan parameter
    url="claude-session://start?plan=10"
    if parse_url_safe "$url" &>/dev/null; then
        if [[ "$PARSED_PLAN" == "10" ]] && [[ "$PARSED_COMMAND" == "start" ]]; then
            echo -e "  Testing: Simple URL parsing ... ${GREEN}PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "  Testing: Simple URL parsing ... ${RED}FAIL${NC} (wrong values)"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "  Testing: Simple URL parsing ... ${RED}FAIL${NC} (parse error)"
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))

    # Test 2: URL with multiple parameters
    url="claude-session://start?plan=SESSION_10&project=/tmp"
    if parse_url_safe "$url" &>/dev/null; then
        if [[ "$PARSED_PLAN" == "SESSION_10" ]] && [[ "$PARSED_PROJECT" == "/tmp" ]]; then
            echo -e "  Testing: Multi-parameter URL ... ${GREEN}PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "  Testing: Multi-parameter URL ... ${RED}FAIL${NC} (wrong values)"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "  Testing: Multi-parameter URL ... ${RED}FAIL${NC} (parse error)"
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))

    # Test 3: URL encoding
    url="claude-session://start?plan=session%2010"  # %20 = space (should fail validation later)
    if parse_url_safe "$url" &>/dev/null; then
        if [[ "$PARSED_PLAN" == "session 10" ]]; then
            echo -e "  Testing: URL decoding ... ${GREEN}PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "  Testing: URL decoding ... ${RED}FAIL${NC} (decoding failed)"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "  Testing: URL decoding ... ${RED}FAIL${NC} (parse error)"
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))

    # Invalid URLs - should FAIL
    expect_fail "Wrong scheme: http://..." parse_url_safe "http://example.com"
    expect_fail "Missing parameters" parse_url_safe "claude-session://start"
    expect_fail "Missing plan" parse_url_safe "claude-session://start?project=/tmp"
    expect_fail "Empty URL" parse_url_safe ""
    expect_fail "Unknown command" parse_url_safe "claude-session://delete?plan=10"
}

##
# Test Suite: End-to-End Validation
##
test_end_to_end_validation() {
    echo ""
    echo "Testing: validate_url_inputs() - Full Integration"
    echo "========================================"

    # Create temp project for testing
    local temp_project
    temp_project=$(mktemp -d)

    # Create mock planning directory
    mkdir -p "$temp_project/docs/planning"
    echo "# Test Plan" > "$temp_project/docs/planning/SESSION_10_PLAN.md"

    # Valid end-to-end test
    local url="claude-session://start?plan=10"
    local validated_result
    if validate_url_inputs "$url" "$temp_project" &>/dev/null; then
        # Normalize both paths using perl (same as validation.sh does)
        local expected_project
        expected_project=$(perl -MCwd -e 'print Cwd::abs_path($ARGV[0])' "$temp_project" 2>/dev/null)

        if [[ "$VALIDATED_PLAN" == "10" ]] && [[ "$VALIDATED_PROJECT" == "$expected_project" ]]; then
            echo -e "  Testing: Valid URL with plan file ... ${GREEN}PASS${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "  Testing: Valid URL with plan file ... ${RED}FAIL${NC} (wrong values)"
            echo "    Expected: plan=10, project=$expected_project" >&2
            echo "    Got: plan=$VALIDATED_PLAN, project=$VALIDATED_PROJECT" >&2
            ((TESTS_FAILED++))
        fi
    else
        echo -e "  Testing: Valid URL with plan file ... ${RED}FAIL${NC} (validation failed)"
        ((TESTS_FAILED++))
    fi
    ((TESTS_RUN++))

    # Plan doesn't exist
    url="claude-session://start?plan=99"
    expect_fail "Non-existent plan" validate_url_inputs "$url" "$temp_project"

    # Malicious URL
    url="claude-session://start?plan=10;rm%20-rf%20/"
    expect_fail "Malicious URL (command injection)" validate_url_inputs "$url" "$temp_project"

    # Cleanup
    rm -rf "$temp_project"
}

##
# Main test runner
##
main() {
    echo "========================================"
    echo "  Security Validation Test Suite"
    echo "========================================"
    echo ""
    echo "Testing validation library security..."

    # Run test suites
    test_plan_name_validation
    test_path_sanitization
    test_url_parsing
    test_end_to_end_validation

    # Summary
    echo ""
    echo "========================================"
    echo "  Test Results"
    echo "========================================"
    echo "  Tests run:    $TESTS_RUN"
    echo -e "  Tests passed: ${GREEN}$TESTS_PASSED${NC}"

    if [[ $TESTS_FAILED -gt 0 ]]; then
        echo -e "  Tests failed: ${RED}$TESTS_FAILED${NC}"
        echo ""
        echo -e "${RED}SECURITY TESTS FAILED${NC}"
        echo "Do NOT deploy until all tests pass!"
        exit 1
    else
        echo -e "  Tests failed: ${GREEN}0${NC}"
        echo ""
        echo -e "${GREEN}ALL SECURITY TESTS PASSED${NC}"
        echo "Validation library is secure and ready to use."
        exit 0
    fi
}

# Run tests
main "$@"
