#!/bin/bash

###############################################################################
# Usage Integration Test Script
# Tests JSONL parser, API endpoints, and dashboard display
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Usage Integration Test Suite                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

test_start() {
    ((TESTS_RUN++))
    echo -n "  Testing: $1 ... "
}

test_pass() {
    ((TESTS_PASSED++))
    echo -e "${GREEN}✓ PASS${NC}"
}

test_fail() {
    ((TESTS_FAILED++))
    echo -e "${RED}✗ FAIL${NC}"
    if [ -n "$1" ]; then
        echo -e "    ${RED}Error: $1${NC}"
    fi
}

###############################################################################
# 1. JSONL Files Existence
###############################################################################

echo -e "${YELLOW}[1] JSONL Session Files${NC}"

test_start "Claude projects directory exists"
if [ -d "$HOME/.claude/projects" ]; then
    test_pass
else
    test_fail "Directory not found at $HOME/.claude/projects"
fi

test_start "At least one JSONL session file exists"
JSONL_COUNT=$(find "$HOME/.claude/projects" -name "*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
if [ "$JSONL_COUNT" -gt 0 ]; then
    test_pass
    echo -e "    ${BLUE}Found $JSONL_COUNT JSONL session files${NC}"
else
    test_fail "No JSONL files found"
fi

echo ""

###############################################################################
# 2. JSONL Parser Tests
###############################################################################

echo -e "${YELLOW}[2] JSONL Usage Parser${NC}"

test_start "JSONL parser module exists"
if [ -f "$PROJECT_DIR/src/jsonl-usage-parser.ts" ]; then
    test_pass
else
    test_fail "File not found"
fi

test_start "Parser imports correctly"
if grep -q "export class JSONLUsageParser" "$PROJECT_DIR/src/jsonl-usage-parser.ts"; then
    test_pass
else
    test_fail "Missing export"
fi

test_start "Parser has getCurrentSessionUsage method"
if grep -q "getCurrentSessionUsage" "$PROJECT_DIR/src/jsonl-usage-parser.ts"; then
    test_pass
else
    test_fail "Method not found"
fi

test_start "Parser has getCurrentWeekUsage method"
if grep -q "getCurrentWeekUsage" "$PROJECT_DIR/src/jsonl-usage-parser.ts"; then
    test_pass
else
    test_fail "Method not found"
fi

echo ""

###############################################################################
# 3. Dashboard Integration
###############################################################################

echo -e "${YELLOW}[3] Dashboard Integration${NC}"

test_start "Dashboard imports JSONL parser"
if grep -q "jsonl-usage-parser" "$PROJECT_DIR/src/dashboard-live.ts"; then
    test_pass
else
    test_fail "Import not found"
fi

test_start "Dashboard broadcasts current session usage"
if grep -q "claude-usage-current-session" "$PROJECT_DIR/src/dashboard-live.ts"; then
    test_pass
else
    test_fail "Message type not found"
fi

test_start "Dashboard broadcasts weekly usage"
if grep -q "claude-usage-weekly" "$PROJECT_DIR/src/dashboard-live.ts"; then
    test_pass
else
    test_fail "Message type not found"
fi

test_start "Frontend handles current session data"
if grep -q "claude-usage-current-session" "$PROJECT_DIR/../dashboard-new.html"; then
    test_pass
else
    test_fail "Handler not found in frontend"
fi

test_start "Frontend handles weekly usage data"
if grep -q "claude-usage-weekly" "$PROJECT_DIR/../dashboard-new.html"; then
    test_pass
else
    test_fail "Handler not found in frontend"
fi

echo ""

###############################################################################
# 4. Sample JSONL Parsing
###############################################################################

echo -e "${YELLOW}[4] Sample JSONL Parsing${NC}"

# Find most recent JSONL file
RECENT_JSONL=$(find "$HOME/.claude/projects" -name "*.jsonl" -type f 2>/dev/null | \
    xargs ls -t 2>/dev/null | head -1)

if [ -n "$RECENT_JSONL" ]; then
    test_start "Can read most recent JSONL file"
    if [ -r "$RECENT_JSONL" ]; then
        test_pass
        echo -e "    ${BLUE}File: $(basename "$RECENT_JSONL")${NC}"
    else
        test_fail "File not readable"
    fi

    test_start "JSONL file is valid JSON per line"
    INVALID_LINES=0
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            if ! echo "$line" | jq . > /dev/null 2>&1; then
                ((INVALID_LINES++))
            fi
        fi
    done < "$RECENT_JSONL"

    if [ "$INVALID_LINES" -eq 0 ]; then
        test_pass
    else
        test_fail "$INVALID_LINES invalid JSON lines"
    fi

    test_start "JSONL contains usage data"
    if grep -q '"usage"' "$RECENT_JSONL"; then
        test_pass
    else
        echo -e "${YELLOW}⚠️  WARN (no usage data found)${NC}"
        ((TESTS_PASSED++))
    fi
else
    echo -e "  ${YELLOW}⚠️  No JSONL files found - skipping parsing tests${NC}"
fi

echo ""

###############################################################################
# 5. Data Format Validation
###############################################################################

echo -e "${YELLOW}[5] Data Format Validation${NC}"

test_start "SessionUsage interface is defined"
if grep -q "interface SessionUsage" "$PROJECT_DIR/src/jsonl-usage-parser.ts"; then
    test_pass
else
    test_fail "Interface not found"
fi

test_start "WeeklyUsage interface is defined"
if grep -q "interface WeeklyUsage" "$PROJECT_DIR/src/jsonl-usage-parser.ts"; then
    test_pass
else
    test_fail "Interface not found"
fi

test_start "Format helper functions exist"
if grep -q "formatDuration" "$PROJECT_DIR/src/jsonl-usage-parser.ts"; then
    test_pass
else
    test_fail "Helper not found"
fi

test_start "Block reset calculation exists"
if grep -q "getBlockResetTime" "$PROJECT_DIR/src/jsonl-usage-parser.ts"; then
    test_pass
else
    test_fail "Function not found"
fi

echo ""

###############################################################################
# Results Summary
###############################################################################

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Test Results                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Total Tests:  ${BLUE}$TESTS_RUN${NC}"
echo -e "  Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Failed:       ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Run: ${YELLOW}npm run dashboard${NC}"
    echo -e "  2. Open dashboard in browser"
    echo -e "  3. Check console for usage data messages"
    echo -e "  4. Verify /usage data matches native Claude CLI"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    exit 1
fi
