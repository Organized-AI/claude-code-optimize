#!/bin/bash

# Claude Code Post-Tool Hook - Token Rate Monitoring
# This script monitors token usage after each tool execution

# Set up paths
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$HOOK_DIR/../data"
SESSION_FILE="$DATA_DIR/current_session.json"
RATE_LOG="$DATA_DIR/token_rates.log"

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

# Read JSON data from stdin
if [ -t 0 ]; then
    # No stdin data, create test data
    JSON_DATA='{"total_cost_usd": 0.15, "num_turns": 3, "duration_ms": 45000}'
else
    JSON_DATA=$(cat)
fi

# Parse current metrics
CURRENT_COST=$(echo "$JSON_DATA" | jq -r '.total_cost_usd // 0')
CURRENT_TURNS=$(echo "$JSON_DATA" | jq -r '.num_turns // 0') 
CURRENT_TIME=$(date +%s)

# Load previous session data
if [ -f "$SESSION_FILE" ]; then
    PREV_COST=$(jq -r '.total_cost_usd // 0' "$SESSION_FILE")
    PREV_TIME=$(jq -r '.last_check_time // 0' "$SESSION_FILE")
    BASELINE_RATE=$(jq -r '.baseline_rate // 0' "$SESSION_FILE")
else
    PREV_COST=0
    PREV_TIME=$CURRENT_TIME
    BASELINE_RATE=0
fi

# Calculate rate (cost per minute)
TIME_DIFF=$((CURRENT_TIME - PREV_TIME))
COST_DIFF=$(echo "$CURRENT_COST - $PREV_COST" | bc -l)

if [ "$TIME_DIFF" -gt 0 ]; then
    CURRENT_RATE=$(echo "scale=4; $COST_DIFF * 60 / $TIME_DIFF" | bc -l)
else
    CURRENT_RATE=0
fi

# Establish baseline (first measurement)
if [ "$BASELINE_RATE" = "0" ] && [ "$CURRENT_RATE" != "0" ]; then
    BASELINE_RATE=$CURRENT_RATE
    echo "📊 Baseline token rate established: \$${BASELINE_RATE}/min" >&2
fi

# Check for rate increases and send notifications
if [ "$BASELINE_RATE" != "0" ] && [ "$CURRENT_RATE" != "0" ]; then
    RATE_INCREASE=$(echo "scale=2; $CURRENT_RATE / $BASELINE_RATE" | bc -l)
    
    # Check if rate doubled (100% increase)
    if (( $(echo "$RATE_INCREASE >= 2.0" | bc -l) )); then
        osascript -e "display notification \"🚨 CRITICAL: Token rate increased 100%+
Current: \$${CURRENT_RATE}/min vs Baseline: \$${BASELINE_RATE}/min
Consider: /compact or break down task\" with title \"Claude Code Alert\" sound name \"Sosumi\""
        echo "🚨 CRITICAL RATE ALERT: ${RATE_INCREASE}x baseline" >&2
        
    # Check if rate increased 50%
    elif (( $(echo "$RATE_INCREASE >= 1.5" | bc -l) )); then
        osascript -e "display notification \"⚠️ HIGH: Token rate up 50%+
Current: \$${CURRENT_RATE}/min vs Baseline: \$${BASELINE_RATE}/min
Try: /compact command\" with title \"Claude Code Warning\" sound name \"Glass\""
        echo "⚠️ HIGH RATE WARNING: ${RATE_INCREASE}x baseline" >&2
        
    # Check if rate increased 25%
    elif (( $(echo "$RATE_INCREASE >= 1.25" | bc -l) )); then
        osascript -e "display notification \"📊 Token rate up 25% - monitoring...
Current: \$${CURRENT_RATE}/min\" with title \"Claude Code Info\""
        echo "📊 MEDIUM RATE CHANGE: ${RATE_INCREASE}x baseline" >&2
    fi
fi

# Update session data
cat > "$SESSION_FILE" << JSON
{
    "total_cost_usd": $CURRENT_COST,
    "num_turns": $CURRENT_TURNS,
    "last_check_time": $CURRENT_TIME,
    "baseline_rate": $BASELINE_RATE,
    "current_rate": $CURRENT_RATE,
    "last_updated": "$(date -Iseconds)"
}
JSON

# Log rate data
echo "$(date -Iseconds),$CURRENT_RATE,$BASELINE_RATE,$RATE_INCREASE" >> "$RATE_LOG"

# Debug output
echo "💰 Cost: \$$CURRENT_COST | Rate: \$${CURRENT_RATE}/min | Baseline: \$${BASELINE_RATE}/min" >&2
