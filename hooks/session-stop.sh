#!/bin/bash

# Stop Hook: Session Cleanup and Summary
# Executes when Claude Code session ends to provide summary and cleanup

# Source shared utilities
source "$(dirname "$0")/shared-utils.sh"

# Hook execution
main() {
    # Get current session data
    local session_data=$(get_session_data)
    local session_id=$(echo "$session_data" | jq -r '.session_id')
    local start_time=$(echo "$session_data" | jq -r '.start_time')
    local baseline_tokens=$(echo "$session_data" | jq -r '.tokens_baseline // 0')
    local tools_used=$(echo "$session_data" | jq -r '.tools_used // 0')
    
    # Get final token count
    local final_tokens=$(extract_token_usage "$@")
    local tokens_consumed=$((final_tokens - baseline_tokens))
    
    # Calculate session duration
    local end_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local start_epoch=$(date -d "$start_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$start_time" +%s 2>/dev/null || echo "0")
    local end_epoch=$(date +%s)
    local duration_seconds=$((end_epoch - start_epoch))
    local duration_minutes=$((duration_seconds / 60))
    
    # Calculate final rates
    local avg_rate=$(calculate_token_rate "$final_tokens" "$baseline_tokens" "$duration_seconds")
    local tokens_per_tool=0
    if [[ $tools_used -gt 0 ]]; then
        tokens_per_tool=$((tokens_consumed / tools_used))
    fi
    
    # Log session completion
    log_message "INFO" "SESSION END: $session_id | Duration: ${duration_minutes}m | Tokens: $tokens_consumed | Tools: $tools_used | Avg rate: ${avg_rate}/min"
    
    # Generate session summary
    local summary="Session Summary:
📊 Session ID: $session_id
⏱️ Duration: ${duration_minutes} minutes
🎯 Tokens Used: $tokens_consumed
🔧 Tools Used: $tools_used
📈 Average Rate: ${avg_rate} tokens/min
🎛️ Tokens per Tool: $tokens_per_tool"
    
    # Send completion notification with summary
    send_notification "✅ Session Complete" "$summary" "normal"
    
    # Create detailed session report
    local report_file="$LOGS_DIR/session_${session_id}_$(date +%Y%m%d_%H%M%S).json"
    local session_report=$(echo '{}' | jq --arg id "$session_id" --arg start "$start_time" --arg end "$end_time" --arg duration "$duration_seconds" --arg tokens "$tokens_consumed" --arg tools "$tools_used" --arg rate "$avg_rate" --arg per_tool "$tokens_per_tool" '{
        session_id: $id,
        start_time: $start,
        end_time: $end,
        duration_seconds: ($duration | tonumber),
        duration_minutes: (($duration | tonumber) / 60),
        tokens_baseline: '$baseline_tokens',
        tokens_final: '$final_tokens',
        tokens_consumed: ($tokens | tonumber),
        tools_used: ($tools | tonumber),
        average_rate_per_minute: ($rate | tonumber),
        tokens_per_tool: ($per_tool | tonumber),
        efficiency_rating: (if ($rate | tonumber) < 100 then "excellent" elif ($rate | tonumber) < 200 then "good" elif ($rate | tonumber) < 400 then "moderate" else "needs_improvement" end)
    }')
    
    echo "$session_report" > "$report_file"
    log_message "INFO" "Session report saved: $report_file"
    
    # Update database with final session data
    update_database "SessionEnd" "session_summary" "$final_tokens" "$avg_rate"
    
    # Integration with existing optimizer system
    if [[ -f "$OPTIMIZER_DB" ]]; then
        # Create sessions table if it doesn't exist
        sqlite3 "$OPTIMIZER_DB" "CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            start_time TEXT NOT NULL,
            end_time TEXT,
            duration_seconds INTEGER,
            tokens_consumed INTEGER,
            tools_used INTEGER,
            average_rate REAL,
            efficiency_rating TEXT
        );" 2>/dev/null
        
        # Insert session summary
        sqlite3 "$OPTIMIZER_DB" "INSERT OR REPLACE INTO sessions (id, start_time, end_time, duration_seconds, tokens_consumed, tools_used, average_rate, efficiency_rating) VALUES ('$session_id', '$start_time', '$end_time', $duration_seconds, $tokens_consumed, $tools_used, $avg_rate, '$(echo "$session_report" | jq -r '.efficiency_rating')');" 2>/dev/null
        
        log_message "INFO" "Session data integrated with optimizer database"
    fi
    
    # Cleanup session data
    rm -f "$DATA_DIR/current_session.json"
    rm -f "$DATA_DIR/pre_tool_*.tmp"
    
    # Performance analysis and recommendations
    local recommendations=""
    if [[ $avg_rate -gt 300 ]]; then
        recommendations="Consider breaking complex tasks into smaller steps to improve token efficiency."
    elif [[ $tokens_per_tool -gt 2000 ]]; then
        recommendations="High tokens per tool detected. Consider using more targeted tool calls."
    elif [[ $avg_rate -lt 50 ]]; then
        recommendations="Excellent token efficiency! Current approach is highly optimized."
    fi
    
    if [[ -n "$recommendations" ]]; then
        log_message "RECOMMENDATION" "$recommendations"
        send_notification "💡 Performance Tip" "$recommendations" "low"
    fi
    
    log_message "INFO" "Session cleanup complete for $session_id"
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi