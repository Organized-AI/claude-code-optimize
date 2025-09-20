#!/bin/bash

# Validate Vercel API Endpoints Performance
# This script tests all critical endpoints for timeout issues

echo "🔍 Validating Vercel API Endpoints..."
echo "=================================="

# Base URL (update after deployment)
BASE_URL="${1:-https://claude-code-optimizer-dashboard.vercel.app}"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function with timeout protection
test_endpoint() {
    local endpoint=$1
    local description=$2
    local max_time=${3:-2} # Default 2 second timeout
    
    echo -n "Testing $description ($endpoint)... "
    
    start_time=$(date +%s%3N)
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $max_time "$BASE_URL$endpoint")
    end_time=$(date +%s%3N)
    
    response_time=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        if [ $response_time -lt 1000 ]; then
            echo -e "${GREEN}✓ OK${NC} (${response_time}ms)"
        elif [ $response_time -lt 2000 ]; then
            echo -e "${YELLOW}⚠ SLOW${NC} (${response_time}ms)"
        else
            echo -e "${RED}✗ TIMEOUT${NC} (${response_time}ms)"
        fi
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $response)"
    fi
}

echo ""
echo "🎯 Testing Critical Endpoints:"
echo "------------------------------"

# Test Token Metrics endpoints
test_endpoint "/api/multi-app/metrics" "Multi-App Metrics" 2
test_endpoint "/api/claude-code/precision-metrics" "Precision Metrics" 2
test_endpoint "/api/claude-code/live-status" "Live Status" 2
test_endpoint "/api/claude-code/budget-progress" "Budget Progress" 2
test_endpoint "/api/claude-code/analytics" "Analytics" 2
test_endpoint "/api/claude-code/history" "History" 2
test_endpoint "/api/claude-code/status" "Claude Code Status" 2

# Test other critical endpoints
test_endpoint "/api/sessions" "Sessions" 2
test_endpoint "/api/tokens" "Tokens" 2
test_endpoint "/api/health" "Health Check" 1
test_endpoint "/api/templates" "Templates" 2

echo ""
echo "🚀 Performance Summary:"
echo "----------------------"

# Load test for Token Metrics component simulation
echo -n "Simulating Token Metrics component load... "
start_time=$(date +%s%3N)

# Parallel requests to simulate component loading
(
    curl -s "$BASE_URL/api/multi-app/metrics" > /dev/null &
    curl -s "$BASE_URL/api/claude-code/precision-metrics" > /dev/null &
    curl -s "$BASE_URL/api/claude-code/budget-progress" > /dev/null &
    wait
)

end_time=$(date +%s%3N)
total_time=$((end_time - start_time))

if [ $total_time -lt 2000 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (Total: ${total_time}ms)"
else
    echo -e "${RED}✗ FAILED${NC} (Total: ${total_time}ms - Exceeds 2s threshold)"
fi

echo ""
echo "=================================="
echo "✅ Validation Complete"
echo ""
echo "Deploy Command:"
echo "vercel --prod"