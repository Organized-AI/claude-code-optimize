#!/bin/bash

# Dashboard Connection Monitor - Visual + Audio Notifications

DATA_DIR="$(dirname "$0")/../data"
mkdir -p "$DATA_DIR"

DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3001}"
NOTIFICATION_COOLDOWN=300
LAST_NOTIFICATION_FILE="$DATA_DIR/last_dashboard_notification"
DASHBOARD_STATE_FILE="$DATA_DIR/dashboard_state"

send_disconnection_alert() {
    # Check cooldown
    if [[ -f "$LAST_NOTIFICATION_FILE" ]]; then
        local last_notification=$(cat "$LAST_NOTIFICATION_FILE")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_notification))
        if [[ $time_diff -lt $NOTIFICATION_COOLDOWN ]]; then
            echo "⏱️ Notification cooldown active (${time_diff}s/${NOTIFICATION_COOLDOWN}s)" >&2
            return
        fi
    fi
    
    echo "$(date +%s)" > "$LAST_NOTIFICATION_FILE"
    
    # Visual terminal alert
    echo "🚨 DASHBOARD DISCONNECTION ALERT 🚨" >&2
    echo "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓" >&2
    echo "🔴 Claude Code dashboard is OFFLINE" >&2
    echo "🔴 Real-time monitoring DISABLED" >&2
    echo "💡 Fix: ./launch_dashboard.sh" >&2
    echo "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓" >&2
    
    # Visual dialog popup (blocks until user acknowledges)
    osascript -e 'display alert "🚨 CLAUDE CODE DASHBOARD DISCONNECTED" message "Real-time monitoring is offline. Dashboard connectivity lost." as critical' &
    
    # Notification center (non-blocking)
    osascript -e 'display notification "🚨 Dashboard offline - monitoring disabled" with title "Claude Code Alert" sound name "Sosumi"' &
    
    # Try voice (background, non-blocking)
    say -v Alex "Alert: Claude Code dashboard has disconnected. Real-time monitoring is now offline." &
    
    # Terminal bell
    echo -e "\a" >&2
}

monitor_dashboard() {
    local dashboard_available=false
    
    if curl -s --connect-timeout 5 "$DASHBOARD_URL/health" >/dev/null 2>&1; then
        dashboard_available=true
    fi
    
    local status="disconnected"
    if [[ "$dashboard_available" == true ]]; then
        status="connected"
    fi
    
    local previous_status="unknown"
    if [[ -f "$DASHBOARD_STATE_FILE" ]]; then
        previous_status=$(cat "$DASHBOARD_STATE_FILE")
    fi
    
    echo "$status" > "$DASHBOARD_STATE_FILE"
    
    # Alert on disconnection
    if [[ "$previous_status" == "connected" && "$status" == "disconnected" ]]; then
        send_disconnection_alert
    fi
    
    echo "$status"
}

case "${1:-monitor}" in
    "monitor") monitor_dashboard ;;
    "test") send_disconnection_alert ;;
    "status") cat "$DASHBOARD_STATE_FILE" 2>/dev/null || echo "unknown" ;;
    *) echo "Usage: $0 {monitor|test|status}" ;;
esac
