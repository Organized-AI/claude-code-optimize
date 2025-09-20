#!/bin/bash

# Shared utilities for Claude Code hooks system
# Provides common functions for token monitoring, notifications, and database operations

# Configuration
HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$HOOKS_DIR")"
OPTIMIZER_DB="$PROJECT_ROOT/data/claude_usage.db"
LOGS_DIR="$PROJECT_ROOT/logs"
DATA_DIR="$PROJECT_ROOT/data"

# Ensure directories exist
mkdir -p "$LOGS_DIR" "$DATA_DIR"

# Logging function
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOGS_DIR/hooks.log"
}

# Get current session data
get_session_data() {
    local session_file="$DATA_DIR/current_session.json"
    if [[ -f "$session_file" ]]; then
        cat "$session_file"
    else
        echo '{"session_id":"","start_time":"","tokens_baseline":0,"tools_used":0}'
    fi
}

# Save session data
save_session_data() {
    local data="$1"
    local session_file="$DATA_DIR/current_session.json"
    echo "$data" > "$session_file"
    log_message "DEBUG" "Session data saved: $data"
}

# Calculate token usage rate
calculate_token_rate() {
    local current_tokens="$1"
    local baseline_tokens="$2"
    local time_elapsed="$3"  # in seconds
    
    if [[ $time_elapsed -eq 0 ]]; then
        echo "0"
        return
    fi
    
    local token_diff=$((current_tokens - baseline_tokens))
    local rate=$((token_diff * 60 / time_elapsed))  # tokens per minute
    echo "$rate"
}

# Get baseline token rate from session data
get_baseline_rate() {
    local session_data=$(get_session_data)
    local baseline=$(echo "$session_data" | jq -r '.baseline_rate // 0')
    echo "$baseline"
}

# Update baseline rate
update_baseline_rate() {
    local new_rate="$1"
    local session_data=$(get_session_data)
    local updated_data=$(echo "$session_data" | jq --arg rate "$new_rate" '.baseline_rate = ($rate | tonumber)')
    save_session_data "$updated_data"
}

# Send desktop notification
send_notification() {
    local title="$1"
    local message="$2"
    local urgency="$3"  # low, normal, critical
    
    # macOS notification
    if command -v osascript &> /dev/null; then
        osascript -e "display notification \"$message\" with title \"Claude Code Hooks\" subtitle \"$title\""
    fi
    
    # Terminal bell for urgent notifications
    if [[ "$urgency" == "critical" ]]; then
        echo -e "\a\a\a"  # Triple bell
    fi
    
    log_message "NOTIFICATION" "$title: $message"
}

# Extract token usage from Claude Code environment
extract_token_usage() {
    # Try to get token usage from various sources
    local tokens=0
    
    # Method 1: From CLAUDE environment variables
    if [[ -n "$CLAUDE_TOKENS_USED" ]]; then
        tokens="$CLAUDE_TOKENS_USED"
    fi
    
    # Method 2: From hook arguments (if passed)
    if [[ -n "$1" ]] && [[ "$1" =~ ^[0-9]+$ ]]; then
        tokens="$1"
    fi
    
    # Method 3: From session file tracking
    if [[ $tokens -eq 0 ]]; then
        local session_data=$(get_session_data)
        tokens=$(echo "$session_data" | jq -r '.tokens_current // 0')
    fi
    
    echo "$tokens"
}

# Update database with hook event
update_database() {
    local event_type="$1"
    local tool_name="$2"
    local tokens_used="$3"
    local rate="$4"
    
    # Check if optimizer database exists
    if [[ -f "$OPTIMIZER_DB" ]]; then
        # SQLite command to insert hook event
        sqlite3 "$OPTIMIZER_DB" "INSERT OR IGNORE INTO hook_events (timestamp, event_type, tool_name, tokens_used, rate) VALUES (datetime('now'), '$event_type', '$tool_name', $tokens_used, $rate);" 2>/dev/null || {
            log_message "DEBUG" "Database update failed - creating hook_events table"
            sqlite3 "$OPTIMIZER_DB" "CREATE TABLE IF NOT EXISTS hook_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                tool_name TEXT,
                tokens_used INTEGER DEFAULT 0,
                rate INTEGER DEFAULT 0,
                session_id TEXT
            );" 2>/dev/null
        }
    else
        log_message "WARNING" "Optimizer database not found at $OPTIMIZER_DB"
    fi
}

# Get tool name from hook arguments
get_tool_name() {
    # Extract tool name from Claude Code hook arguments
    local tool_name="unknown"
    
    # Hook arguments might contain tool information
    if [[ -n "$CLAUDE_TOOL_NAME" ]]; then
        tool_name="$CLAUDE_TOOL_NAME"
    elif [[ -n "$1" ]]; then
        tool_name="$1"
    fi
    
    echo "$tool_name"
}

# Initialize session if needed
initialize_session() {
    local session_data=$(get_session_data)
    local session_id=$(echo "$session_data" | jq -r '.session_id')
    
    if [[ "$session_id" == "" || "$session_id" == "null" ]]; then
        # Create new session
        local new_session_id="session_$(date +%s)"
        local start_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        local initial_tokens=$(extract_token_usage)
        
        local new_session=$(echo '{}' | jq --arg id "$new_session_id" --arg start "$start_time" --arg tokens "$initial_tokens" '{
            session_id: $id,
            start_time: $start,
            tokens_baseline: ($tokens | tonumber),
            tokens_current: ($tokens | tonumber),
            tools_used: 0,
            baseline_rate: 0
        }')
        
        save_session_data "$new_session"
        log_message "INFO" "New session initialized: $new_session_id"
        
        # Send welcome notification
        send_notification "Session Started" "Claude Code hook monitoring active for session $new_session_id" "normal"
    fi
}

# Check for rate warnings
check_rate_warning() {
    local current_rate="$1"
    local baseline_rate=$(get_baseline_rate)
    
    if [[ $baseline_rate -eq 0 ]]; then
        # Set baseline on first meaningful rate
        if [[ $current_rate -gt 10 ]]; then
            update_baseline_rate "$current_rate"
            log_message "INFO" "Baseline rate set to $current_rate tokens/min"
        fi
        return
    fi
    
    # Calculate percentage increase
    local increase_pct=$(( (current_rate - baseline_rate) * 100 / baseline_rate ))
    
    if [[ $increase_pct -ge 100 ]]; then
        # 100%+ increase - critical alert
        send_notification "🚨 Critical Token Rate" "Rate increased ${increase_pct}% to ${current_rate}/min. Consider optimizing your approach." "critical"
        log_message "CRITICAL" "Token rate critical: ${current_rate}/min (${increase_pct}% increase)"
    elif [[ $increase_pct -ge 50 ]]; then
        # 50%+ increase - warning
        send_notification "⚠️ High Token Rate" "Rate increased ${increase_pct}% to ${current_rate}/min. Monitor usage carefully." "normal"
        log_message "WARNING" "Token rate high: ${current_rate}/min (${increase_pct}% increase)"
    elif [[ $increase_pct -ge 25 ]]; then
        # 25%+ increase - notice
        send_notification "📊 Token Rate Notice" "Rate increased ${increase_pct}% to ${current_rate}/min." "low"
        log_message "NOTICE" "Token rate increase: ${current_rate}/min (${increase_pct}% increase)"
    fi
}

# Export functions for use in hook scripts
export -f log_message get_session_data save_session_data calculate_token_rate
export -f get_baseline_rate update_baseline_rate send_notification extract_token_usage
export -f update_database get_tool_name initialize_session check_rate_warning