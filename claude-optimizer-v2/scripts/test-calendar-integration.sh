#!/bin/bash

###############################################################################
# Calendar Integration Test Suite
# Validates iCal generation, API endpoints, and download functionality
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ICAL_FILE="$PROJECT_DIR/my-sessions.ics"
API_ENDPOINT="http://localhost:3001/api/calendar/download"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Calendar Integration Test Suite                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Test Helper Functions
###############################################################################

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
# 1. iCal File Existence Tests
###############################################################################

echo -e "${YELLOW}[1] iCal File Existence Tests${NC}"

test_start "iCal file exists"
if [ -f "$ICAL_FILE" ]; then
    test_pass
else
    test_fail "File not found at $ICAL_FILE"
fi

test_start "iCal file is readable"
if [ -r "$ICAL_FILE" ]; then
    test_pass
else
    test_fail "File is not readable"
fi

test_start "iCal file is not empty"
if [ -s "$ICAL_FILE" ]; then
    test_pass
else
    test_fail "File is empty"
fi

echo ""

###############################################################################
# 2. iCal Structure Validation
###############################################################################

echo -e "${YELLOW}[2] iCal Structure Validation${NC}"

test_start "Begins with BEGIN:VCALENDAR"
if head -n 1 "$ICAL_FILE" | grep -q "BEGIN:VCALENDAR"; then
    test_pass
else
    test_fail "Missing BEGIN:VCALENDAR"
fi

test_start "Ends with END:VCALENDAR"
if tail -n 1 "$ICAL_FILE" | grep -q "END:VCALENDAR"; then
    test_pass
else
    test_fail "Missing END:VCALENDAR"
fi

test_start "Contains VERSION:2.0"
if grep -q "VERSION:2.0" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing VERSION:2.0"
fi

test_start "Contains PRODID"
if grep -q "PRODID:" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing PRODID"
fi

test_start "Contains at least one VEVENT"
if grep -q "BEGIN:VEVENT" "$ICAL_FILE"; then
    test_pass
else
    test_fail "No VEVENT found"
fi

test_start "VEVENT blocks are balanced"
BEGIN_COUNT=$(grep -c "BEGIN:VEVENT" "$ICAL_FILE")
END_COUNT=$(grep -c "END:VEVENT" "$ICAL_FILE")
if [ "$BEGIN_COUNT" -eq "$END_COUNT" ]; then
    test_pass
else
    test_fail "BEGIN:VEVENT ($BEGIN_COUNT) != END:VEVENT ($END_COUNT)"
fi

echo ""

###############################################################################
# 3. Required Event Fields
###############################################################################

echo -e "${YELLOW}[3] Required Event Fields${NC}"

test_start "Events have UID"
if grep -q "UID:" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing UID field"
fi

test_start "Events have DTSTART"
if grep -q "DTSTART:" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing DTSTART field"
fi

test_start "Events have DTEND"
if grep -q "DTEND:" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing DTEND field"
fi

test_start "Events have SUMMARY"
if grep -q "SUMMARY:" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing SUMMARY field"
fi

test_start "Events have DTSTAMP"
if grep -q "DTSTAMP:" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing DTSTAMP field"
fi

echo ""

###############################################################################
# 4. Date-Time Format Validation
###############################################################################

echo -e "${YELLOW}[4] Date-Time Format Validation${NC}"

test_start "DTSTART format is valid (YYYYMMDDTHHMMSSZ)"
if grep "DTSTART:" "$ICAL_FILE" | grep -qE "DTSTART:[0-9]{8}T[0-9]{6}Z"; then
    test_pass
else
    test_fail "Invalid DTSTART format"
fi

test_start "DTEND format is valid (YYYYMMDDTHHMMSSZ)"
if grep "DTEND:" "$ICAL_FILE" | grep -qE "DTEND:[0-9]{8}T[0-9]{6}Z"; then
    test_pass
else
    test_fail "Invalid DTEND format"
fi

test_start "DTSTAMP format is valid (YYYYMMDDTHHMMSSZ)"
if grep "DTSTAMP:" "$ICAL_FILE" | grep -qE "DTSTAMP:[0-9]{8}T[0-9]{6}Z"; then
    test_pass
else
    test_fail "Invalid DTSTAMP format"
fi

test_start "All dates use UTC timezone (Z suffix)"
NON_UTC_COUNT=$(grep -E "DT(START|END|STAMP):" "$ICAL_FILE" | grep -vcE "Z$")
if [ "$NON_UTC_COUNT" -eq 0 ]; then
    test_pass
else
    test_fail "Found $NON_UTC_COUNT non-UTC dates"
fi

echo ""

###############################################################################
# 5. Alarm Configuration
###############################################################################

echo -e "${YELLOW}[5] Alarm Configuration${NC}"

test_start "Contains VALARM blocks"
if grep -q "BEGIN:VALARM" "$ICAL_FILE"; then
    test_pass
else
    test_fail "No VALARM blocks found"
fi

test_start "Has 30-minute reminder"
if grep -q "TRIGGER:-PT30M" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing 30-minute reminder"
fi

test_start "Has 5-minute reminder"
if grep -q "TRIGGER:-PT5M" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing 5-minute reminder"
fi

echo ""

###############################################################################
# 6. Calendar Metadata
###############################################################################

echo -e "${YELLOW}[6] Calendar Metadata${NC}"

test_start "Has calendar name (X-WR-CALNAME)"
if grep -q "X-WR-CALNAME:" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing X-WR-CALNAME"
fi

test_start "Has timezone specified (X-WR-TIMEZONE)"
if grep -q "X-WR-TIMEZONE:" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing X-WR-TIMEZONE"
fi

test_start "Uses Gregorian calendar scale"
if grep -q "CALSCALE:GREGORIAN" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing CALSCALE:GREGORIAN"
fi

test_start "Method is PUBLISH"
if grep -q "METHOD:PUBLISH" "$ICAL_FILE"; then
    test_pass
else
    test_fail "Missing METHOD:PUBLISH"
fi

echo ""

###############################################################################
# 7. API Endpoint Tests (if server is running)
###############################################################################

echo -e "${YELLOW}[7] API Endpoint Tests${NC}"

# Check if server is running
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/health" | grep -q "200"; then
    SERVER_RUNNING=true
else
    SERVER_RUNNING=false
    echo -e "  ${YELLOW}⚠️  Server not running - skipping API tests${NC}"
fi

if [ "$SERVER_RUNNING" = true ]; then
    test_start "API endpoint is accessible"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT")
    if [ "$HTTP_CODE" -eq 200 ]; then
        test_pass
    else
        test_fail "HTTP $HTTP_CODE"
    fi

    test_start "Returns correct Content-Type"
    CONTENT_TYPE=$(curl -s -I "$API_ENDPOINT" | grep -i "content-type:" | cut -d: -f2 | tr -d ' \r\n')
    if echo "$CONTENT_TYPE" | grep -qi "text/calendar"; then
        test_pass
    else
        test_fail "Got: $CONTENT_TYPE"
    fi

    test_start "Sets Content-Disposition header"
    DISPOSITION=$(curl -s -I "$API_ENDPOINT" | grep -i "content-disposition:" | cut -d: -f2 | tr -d ' \r\n')
    if echo "$DISPOSITION" | grep -qi "attachment"; then
        test_pass
    else
        test_fail "Missing attachment disposition"
    fi

    test_start "Returns valid iCal content"
    RESPONSE=$(curl -s "$API_ENDPOINT")
    if echo "$RESPONSE" | grep -q "BEGIN:VCALENDAR"; then
        test_pass
    else
        test_fail "Response not valid iCal"
    fi
fi

echo ""

###############################################################################
# 8. File Integrity Checks
###############################################################################

echo -e "${YELLOW}[8] File Integrity Checks${NC}"

test_start "File is valid UTF-8"
if iconv -f UTF-8 -t UTF-8 "$ICAL_FILE" > /dev/null 2>&1; then
    test_pass
else
    test_fail "File contains invalid UTF-8"
fi

test_start "No Windows line endings (CRLF)"
if ! grep -qU $'\r' "$ICAL_FILE"; then
    test_pass
else
    echo -e "${YELLOW}⚠️  WARN (file has CRLF - okay for iCal)${NC}"
    ((TESTS_PASSED++))
fi

test_start "UID contains domain suffix"
if grep "UID:" "$ICAL_FILE" | grep -qE "@.+"; then
    test_pass
else
    test_fail "UID should contain @domain"
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
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    exit 1
fi
