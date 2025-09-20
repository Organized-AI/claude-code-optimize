#!/bin/bash

# Claude Code Stop Hook - Session End Notification

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$HOOK_DIR/../data"
SESSION_FILE="$DATA_DIR/current_session.json"

if [ -f "$SESSION_FILE" ]; then
    TOTAL_COST=$(jq -r '.total_cost_usd // 0' "$SESSION_FILE")
    BASELINE_RATE=$(jq -r '.baseline_rate // 0' "$SESSION_FILE")
    CURRENT_RATE=$(jq -r '.current_rate // 0' "$SESSION_FILE")
    SESSION_START=$(jq -r '.session_started // 0' "$SESSION_FILE")
    
    # Calculate session duration
    CURRENT_TIME=$(date +%s)
    DURATION_MINUTES=$(echo "scale=1; ($CURRENT_TIME - $SESSION_START) / 60" | bc -l)
    
    # Send session summary notification
    osascript -e "display notification \"Session complete! 
Duration: ${DURATION_MINUTES} min
Total cost: \$${TOTAL_COST}
Avg rate: \$${CURRENT_RATE}/min\" with title \"Claude Code Session Complete\" sound name \"Glass\""
    
    echo "📊 Session Summary: ${DURATION_MINUTES} min, \$${TOTAL_COST} total" >&2
else
    osascript -e 'display notification "Claude Code session ended" with title "Session Complete"'
    echo "🏁 Claude Code session ended" >&2
fi
