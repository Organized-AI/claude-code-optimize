#!/bin/bash

# Claude Code Pre-Tool Hook - Session Start Notification

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$HOOK_DIR/../data"

mkdir -p "$DATA_DIR"

# Initialize session
SESSION_START_TIME=$(date +%s)
cat > "$DATA_DIR/current_session.json" << JSON
{
    "session_started": "$SESSION_START_TIME",
    "baseline_rate": 0,
    "total_cost_usd": 0,
    "num_turns": 0,
    "last_check_time": $SESSION_START_TIME,
    "current_rate": 0
}
JSON

# Send session start notification
osascript -e 'display notification "Claude Code session started with rate monitoring 📊" with title "Session Started" sound name "Ping"'

echo "🚀 Claude Code session monitoring started" >&2
