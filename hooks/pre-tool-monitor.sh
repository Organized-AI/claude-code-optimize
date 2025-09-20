#!/bin/bash

# PreToolUse Hook: Token Rate Monitoring
# Executes before each tool use to track token usage patterns

# Source shared utilities
source "$(dirname "$0")/shared-utils.sh"

# Hook execution
main() {
    # Initialize session if needed
    initialize_session
    
    # Get current session data
    local session_data=$(get_session_data)
    local session_id=$(echo "$session_data" | jq -r '.session_id')
    local start_time=$(echo "$session_data" | jq -r '.start_time')
    local tools_used=$(echo "$session_data" | jq -r '.tools_used // 0')
    
    # Extract current token usage
    local current_tokens=$(extract_token_usage "$@")
    local tool_name=$(get_tool_name "$@")
    
    # Calculate time elapsed since session start
    local current_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local start_epoch=$(date -d "$start_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$start_time" +%s 2>/dev/null || echo "0")
    local current_epoch=$(date +%s)
    local time_elapsed=$((current_epoch - start_epoch))
    
    # Get baseline tokens and calculate rate
    local baseline_tokens=$(echo "$session_data" | jq -r '.tokens_baseline // 0')
    local current_rate=$(calculate_token_rate "$current_tokens" "$baseline_tokens" "$time_elapsed")
    
    # Log pre-tool execution
    log_message "INFO" "PRE-TOOL: $tool_name | Session: $session_id | Tokens: $current_tokens | Rate: ${current_rate}/min"
    
    # Update session data with pre-tool state
    local updated_session=$(echo "$session_data" | jq --arg tokens "$current_tokens" --arg tool "$tool_name" --arg rate "$current_rate" '{
        session_id,
        start_time,
        tokens_baseline,
        tokens_current: ($tokens | tonumber),
        tools_used: (.tools_used + 1),
        baseline_rate,
        last_tool: $tool,
        last_rate: ($rate | tonumber),
        last_update: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }')
    
    save_session_data "$updated_session"
    
    # Update database
    update_database "PreToolUse" "$tool_name" "$current_tokens" "$current_rate"
    
    # Store pre-tool metrics for comparison in post-tool hook
    echo "$current_tokens" > "$DATA_DIR/pre_tool_tokens.tmp"
    echo "$current_rate" > "$DATA_DIR/pre_tool_rate.tmp"
    echo "$(date +%s)" > "$DATA_DIR/pre_tool_time.tmp"
    
    log_message "DEBUG" "Pre-tool monitoring complete for $tool_name"
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi