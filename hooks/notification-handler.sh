#!/bin/bash

# Notification Hook: Custom Session Notifications
# Handles special notifications during Claude Code sessions

# Source shared utilities
source "$(dirname "$0")/shared-utils.sh"

# Hook execution
main() {
    local notification_type="$1"
    local message="$2"
    local context="$3"
    
    # Get current session data
    local session_data=$(get_session_data)
    local session_id=$(echo "$session_data" | jq -r '.session_id')
    local current_tokens=$(extract_token_usage)
    
    # Log notification event
    log_message "NOTIFICATION" "Type: $notification_type | Message: $message | Context: $context | Session: $session_id"
    
    # Handle different notification types
    case "$notification_type" in
        "session_start")
            send_notification "🚀 Claude Code Session" "New session started: $session_id" "normal"
            ;;
        "session_pause")
            send_notification "⏸️ Session Paused" "Session $session_id paused at $current_tokens tokens" "low"
            ;;
        "session_resume")
            send_notification "▶️ Session Resumed" "Session $session_id resumed" "low"
            ;;
        "context_reset")
            send_notification "🔄 Context Reset" "Context cleared for session $session_id" "normal"
            # Reset baseline after context reset
            local updated_session=$(echo "$session_data" | jq --arg tokens "$current_tokens" '{
                session_id,
                start_time: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
                tokens_baseline: ($tokens | tonumber),
                tokens_current: ($tokens | tonumber),
                tools_used: 0,
                baseline_rate: 0
            }')
            save_session_data "$updated_session"
            ;;
        "error")
            send_notification "❌ Session Error" "$message" "critical"
            ;;
        "warning")
            send_notification "⚠️ Session Warning" "$message" "normal"
            ;;
        "milestone")
            # Handle session milestones (e.g., 1000 tokens, 50 tools, etc.)
            local tools_used=$(echo "$session_data" | jq -r '.tools_used // 0')
            if [[ $((current_tokens % 10000)) -eq 0 && $current_tokens -gt 0 ]]; then
                send_notification "📊 Token Milestone" "Session reached ${current_tokens} tokens | ${tools_used} tools used" "low"
            fi
            if [[ $((tools_used % 25)) -eq 0 && $tools_used -gt 0 ]]; then
                send_notification "🔧 Tool Milestone" "Session used ${tools_used} tools | ${current_tokens} tokens total" "low"
            fi
            ;;
        "efficiency")
            # Efficiency notifications based on rate analysis
            local session_rate=$(echo "$session_data" | jq -r '.last_rate // 0')
            local baseline_rate=$(get_baseline_rate)
            
            if [[ $baseline_rate -gt 0 && $session_rate -lt $((baseline_rate / 2)) ]]; then
                send_notification "🎯 High Efficiency" "Current rate ${session_rate}/min is well below baseline ${baseline_rate}/min" "low"
            fi
            ;;
        "budget_warning")
            # Budget-based notifications
            if [[ $current_tokens -gt 100000 ]]; then
                send_notification "💰 Budget Alert" "Session at $current_tokens tokens - consider budget implications" "normal"
            fi
            ;;
        "custom")
            # Custom notifications with full message
            send_notification "Claude Code" "$message" "normal"
            ;;
        *)
            # Default handler
            send_notification "Claude Code Notification" "$notification_type: $message" "low"
            ;;
    esac
    
    # Update database with notification event
    update_database "Notification" "$notification_type" "$current_tokens" "0"
    
    log_message "DEBUG" "Notification handling complete: $notification_type"
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi