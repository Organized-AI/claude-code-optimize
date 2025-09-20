#!/bin/bash

# Dashboard Connection Monitor Hook
# Monitors dashboard connectivity and sends notifications on disconnection

# Source shared utilities if available
if [[ -f "$(dirname "$0")/shared-utils.sh" ]]; then
    source "$(dirname "$0")/shared-utils.sh"
else
    # Basic fallback functions
    DATA_DIR="$(dirname "$0")/../data"
    mkdir -p "$DATA_DIR"
fi

# Configuration
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3001}"
WEBSOCKET_URL="${WEBSOCKET_URL:-ws://localhost:3001/ws}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"  # Check every 30 seconds
NOTIFICATION_COOLDOWN=300  # 5 minutes between notifications
LAST_NOTIFICATION_FILE="$DATA_DIR/last_dashboard_notification"

# State tracking
DASHBOARD_STATE_FILE="$DATA_DIR/dashboard_state"
CONNECTION_LOG="$DATA_DIR/dashboard_connection.log"

monitor_dashboard_connection() {
    # Monitor dashboard connection status
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local dashboard_available=false
    local websocket_available=false
    
    # Check HTTP dashboard
    if curl -s --connect-timeout 5 "$DASHBOARD_URL/health" >/dev/null 2>&1; then
        dashboard_available=true
    fi
    
    # Check WebSocket connection (simplified check)
    if lsof -i :3001 >/dev/null 2>&1; then
        websocket_available=true
    fi
    
    # Determine overall status
    local status="disconnected"
    if [[ "$dashboard_available" == true && "$websocket_available" == true ]]; then
        status="connected"
    elif [[ "$dashboard_available" == true ]]; then
        status="http_only"
    elif [[ "$websocket_available" == true ]]; then
        status="websocket_only"
    fi
    
    # Log status
    echo "$timestamp,$status,$dashboard_available,$websocket_available" >> "$CONNECTION_LOG"
    
    # Get previous status
    local previous_status="unknown"
    if [[ -f "$DASHBOARD_STATE_FILE" ]]; then
        previous_status=$(cat "$DASHBOARD_STATE_FILE")
    fi
    
    # Save current status
    echo "$status" > "$DASHBOARD_STATE_FILE"
    
    # Check for status changes
    if [[ "$previous_status" != "$status" ]]; then
        handle_status_change "$previous_status" "$status" "$dashboard_available" "$websocket_available"
    fi
    
    echo "$status"
}

handle_status_change() {
    # Handle dashboard connection status changes
    
    local previous_status="$1"
    local current_status="$2" 
    local dashboard_available="$3"
    local websocket_available="$4"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check notification cooldown
    if [[ -f "$LAST_NOTIFICATION_FILE" ]]; then
        local last_notification=$(cat "$LAST_NOTIFICATION_FILE")
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_notification))
        
        if [[ $time_diff -lt $NOTIFICATION_COOLDOWN ]]; then
            echo "⏱️ Notification cooldown active (${time_diff}s/${NOTIFICATION_COOLDOWN}s)" >&2
            return
        fi
    fi
    
    # Generate notifications based on status change
    case "$current_status" in
        "connected")
            if [[ "$previous_status" != "connected" && "$previous_status" != "unknown" ]]; then
                send_dashboard_notification "✅ Dashboard Reconnected" \
                    "Claude Code dashboard is back online!" \
                    "success" "ping"
            fi
            ;;
            
        "http_only")
            send_dashboard_notification "⚠️ Dashboard Partial Connection" \
                "HTTP available but WebSocket disconnected - real-time updates disabled" \
                "warning" "glass"
            ;;
            
        "websocket_only")
            send_dashboard_notification "⚠️ Dashboard WebSocket Only" \
                "WebSocket available but HTTP unreachable - dashboard UI unavailable" \
                "warning" "glass"
            ;;
            
        "disconnected")
            send_dashboard_notification "🚨 Dashboard Disconnected" \
                "Claude Code dashboard is offline - try: ./launch_dashboard.sh" \
                "critical" "sosumi"
            ;;
    esac
}

send_dashboard_notification() {
    # Send dashboard connectivity notification
    
    local title="$1"
    local message="$2"
    local priority="${3:-info}"
    local sound="${4:-glass}"
    
    # Save notification timestamp
    echo "$(date +%s)" > "$LAST_NOTIFICATION_FILE"
    
    # Desktop notification
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"$sound\""
    
    # Terminal output
    echo "🔔 $title" >&2
    echo "$message" >&2
    
    # Log notification
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $priority - $title" >> "$DATA_DIR/dashboard_notifications.log"
    
    # Try to use smart handler if available
    if [[ -f "$(dirname "$0")/smart_handler.py" ]]; then
        python3 "$(dirname "$0")/smart_handler.py" "$title: $message" 2>/dev/null || true
    fi
}

get_dashboard_status() {
    # Get current dashboard status
    
    if [[ -f "$DASHBOARD_STATE_FILE" ]]; then
        cat "$DASHBOARD_STATE_FILE"
    else
        echo "unknown"
    fi
}

# Main execution
main() {
    case "${1:-monitor}" in
        "monitor")
            monitor_dashboard_connection
            ;;
        "status")
            get_dashboard_status
            ;;
        "test")
            echo "🧪 Testing dashboard connectivity notifications..."
            handle_status_change "connected" "disconnected" false false
            sleep 2
            handle_status_change "disconnected" "connected" true true
            ;;
        "start-daemon")
            echo "🚀 Starting dashboard connection monitor daemon..."
            while true; do
                monitor_dashboard_connection >/dev/null
                sleep "$CHECK_INTERVAL"
            done
            ;;
        *)
            echo "Usage: $0 {monitor|status|test|start-daemon}"
            echo "  monitor     - Check connection once"
            echo "  status      - Get current status"  
            echo "  test        - Test notifications"
            echo "  start-daemon - Run continuous monitoring"
            exit 1
            ;;
    esac
}

# Initialize
mkdir -p "$(dirname "$DASHBOARD_STATE_FILE")"
mkdir -p "$(dirname "$CONNECTION_LOG")"

# Run main function
main "$@"
