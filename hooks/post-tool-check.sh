#!/bin/bash

# PostToolUse Hook: Token Rate Analysis and Warnings
# Executes after each tool use to analyze rate changes and send alerts

# Source shared utilities
source "$(dirname "$0")/shared-utils.sh"

# Hook execution
main() {
    # Get current session data
    local session_data=$(get_session_data)
    local session_id=$(echo "$session_data" | jq -r '.session_id')
    
    # Extract current token usage
    local current_tokens=$(extract_token_usage "$@")
    local tool_name=$(get_tool_name "$@")
    
    # Get pre-tool metrics
    local pre_tokens=0
    local pre_rate=0
    local pre_time=$(date +%s)
    
    if [[ -f "$DATA_DIR/pre_tool_tokens.tmp" ]]; then
        pre_tokens=$(cat "$DATA_DIR/pre_tool_tokens.tmp")
        pre_rate=$(cat "$DATA_DIR/pre_tool_rate.tmp")
        pre_time=$(cat "$DATA_DIR/pre_tool_time.tmp")
    fi
    
    # Calculate tool execution metrics
    local current_time=$(date +%s)
    local execution_time=$((current_time - pre_time))
    local tokens_consumed=$((current_tokens - pre_tokens))
    local tool_rate=0
    
    if [[ $execution_time -gt 0 ]]; then
        tool_rate=$((tokens_consumed * 60 / execution_time))  # tokens per minute
    fi
    
    # Calculate overall session rate
    local start_time=$(echo "$session_data" | jq -r '.start_time')
    local baseline_tokens=$(echo "$session_data" | jq -r '.tokens_baseline // 0')
    local start_epoch=$(date -d "$start_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$start_time" +%s 2>/dev/null || echo "0")
    local total_elapsed=$((current_time - start_epoch))
    local session_rate=$(calculate_token_rate "$current_tokens" "$baseline_tokens" "$total_elapsed")
    
    # Log post-tool execution
    log_message "INFO" "POST-TOOL: $tool_name | Tokens consumed: $tokens_consumed | Tool rate: ${tool_rate}/min | Session rate: ${session_rate}/min | Exec time: ${execution_time}s"
    
    # Update session data
    local updated_session=$(echo "$session_data" | jq --arg tokens "$current_tokens" --arg consumed "$tokens_consumed" --arg session_rate "$session_rate" --arg tool_rate "$tool_rate" '{
        session_id,
        start_time,
        tokens_baseline,
        tokens_current: ($tokens | tonumber),
        tools_used,
        baseline_rate,
        last_tool,
        last_rate: ($session_rate | tonumber),
        last_tool_tokens: ($consumed | tonumber),
        last_tool_rate: ($tool_rate | tonumber),
        last_update: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }')
    
    save_session_data "$updated_session"
    
    # Update database
    update_database "PostToolUse" "$tool_name" "$current_tokens" "$session_rate"
    
    # Check for rate warnings based on session rate
    check_rate_warning "$session_rate"
    
    # Additional warnings for extremely high tool rates
    if [[ $tool_rate -gt 500 ]]; then
        send_notification "🔥 Extreme Tool Rate" "$tool_name consumed $tokens_consumed tokens at ${tool_rate}/min rate. Consider breaking down complex operations." "critical"
    elif [[ $tool_rate -gt 200 ]]; then
        send_notification "⚡ High Tool Rate" "$tool_name used ${tool_rate}/min token rate. Monitor for efficiency." "normal"
    fi
    
    # Context window warnings
    if [[ $current_tokens -gt 180000 ]]; then
        send_notification "📏 Context Limit Approaching" "Session at $current_tokens tokens. Consider context management soon." "normal"
    elif [[ $current_tokens -gt 150000 ]]; then
        send_notification "📊 High Context Usage" "Session at $current_tokens tokens. Monitor context window usage." "low"
    fi
    
    # Clean up temporary files
    rm -f "$DATA_DIR/pre_tool_tokens.tmp" "$DATA_DIR/pre_tool_rate.tmp" "$DATA_DIR/pre_tool_time.tmp"
    
    log_message "DEBUG" "Post-tool analysis complete for $tool_name"
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi