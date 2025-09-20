#!/bin/bash

# Production Validation Script for Claude Code Dashboard
# Tests all critical functionality after deployment

PROD_URL="https://moonlock-dashboard-7p8iecf3i-jordaaans-projects.vercel.app"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Production Deployment Validation"
echo "URL: $PROD_URL"
echo "========================================="
echo ""

# Test 1: Site Accessibility
echo -n "1. Testing site accessibility... "
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_STATUS)"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_STATUS)"
fi

# Test 2: Token Metrics API Response Time
echo -n "2. Testing Token Metrics API (<2s requirement)... "
START_TIME=$(date +%s%N)
curl -s "$PROD_URL/api/multi-app/metrics" > /dev/null
END_TIME=$(date +%s%N)
ELAPSED_MS=$(( ($END_TIME - $START_TIME) / 1000000 ))
if [ "$ELAPSED_MS" -lt 2000 ]; then
    echo -e "${GREEN}✓ PASS${NC} (${ELAPSED_MS}ms)"
else
    echo -e "${RED}✗ FAIL${NC} (${ELAPSED_MS}ms)"
fi

# Test 3: Claude Code Status API
echo -n "3. Testing Claude Code Status API... "
STATUS_RESPONSE=$(curl -s "$PROD_URL/api/claude-code/status")
if echo "$STATUS_RESPONSE" | jq -e '.connected' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 4: Templates API
echo -n "4. Testing Templates API... "
TEMPLATES_RESPONSE=$(curl -s "$PROD_URL/api/templates")
if echo "$TEMPLATES_RESPONSE" | jq -e '.templates[0].name' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 5: Analytics API
echo -n "5. Testing Analytics API... "
ANALYTICS_RESPONSE=$(curl -s "$PROD_URL/api/analytics")
if echo "$ANALYTICS_RESPONSE" | jq -e '.sessions' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 6: Check for JavaScript Bundle
echo -n "6. Testing JavaScript bundle loading... "
if curl -s "$PROD_URL" | grep -q "index-.*\.js"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 7: Check for CSS Bundle
echo -n "7. Testing CSS bundle loading... "
if curl -s "$PROD_URL" | grep -q "index-.*\.css"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

# Test 8: API CORS Headers
echo -n "8. Testing API CORS headers... "
CORS_HEADER=$(curl -s -I "$PROD_URL/api/multi-app/metrics" | grep -i "access-control-allow-origin")
if echo "$CORS_HEADER" | grep -q "\*"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
fi

echo ""
echo "========================================="
echo "Performance Metrics:"
echo "========================================="

# Measure all API endpoints
echo ""
echo "API Response Times:"
for endpoint in "multi-app/metrics" "claude-code/status" "templates" "analytics"; do
    START_TIME=$(date +%s%N)
    curl -s "$PROD_URL/api/$endpoint" > /dev/null
    END_TIME=$(date +%s%N)
    ELAPSED_MS=$(( ($END_TIME - $START_TIME) / 1000000 ))
    printf "  %-25s: %4dms\n" "$endpoint" "$ELAPSED_MS"
done

echo ""
echo "========================================="
echo "Deployment Summary:"
echo "========================================="
echo "Production URL: $PROD_URL"
echo "Deployment Time: $(date)"
echo ""
echo "Key Improvements Deployed:"
echo "  ✓ Optimized Token Metrics API with <2s response time"
echo "  ✓ New serverless endpoints with proper timeout configuration"
echo "  ✓ Enhanced error handling and fallback states"
echo "  ✓ Reduced Vercel function timeouts (10s max)"
echo "  ✓ Improved frontend timeout protection"
echo ""
echo "========================================="