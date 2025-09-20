#!/bin/bash

# Dashboard Connection Monitor Hook with Enhanced Voice Notifications

# Source shared utilities if available
if [[ -f "$(dirname "$0")/shared-utils.sh" ]]; then
    source "$(dirname "$0")/shared-utils.sh"
else
    DATA_DIR="$(dirname "$0")/../data"
    mkdir -p "$DATA_DIR"
fi

# Source voice notification helper
if [[ -f "$(dirname "$0")/voice-notification.sh" ]]; then
    source "$(dirname "$0")/voice-notification.sh"
fi

send_dashboard_notification_with_voice() {
    local title="$1"
    local message="$2"
    local priority="${3:-info}"
    local sound="${4:-glass}"
    
    echo "$(date +%s)" > "$DATA_DIR/last_dashboard_notification"
    
    # Desktop notification
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"$sound\""
    
    # Terminal output
    echo "🔔 $title" >&2
    echo "$message" >&2
    
    # Enhanced voice notification
    echo "🎙️ Activating voice alert..." >&2
    if command -v send_voice_alert >/dev/null 2>&1; then
        send_voice_alert "$title: $message"
    else
        # Fallback direct voice
        say -v Alex "$title. $message" &
        say -v Samantha "$title. $message" &
        osascript -e "say \"$title. $message\"" &
        wait
    fi
    
    # Smart handler
    if [[ -f "$(dirname "$0")/smart_handler.py" ]]; then
        python3 "$(dirname "$0")/smart_handler.py" "$title: $message" 2>/dev/null || true
    fi
    
    echo "✅ All notification methods attempted" >&2
}

# Test the enhanced voice notification
echo "🎙️ Testing Enhanced Dashboard Disconnection Voice Notification"
echo "============================================================="

send_dashboard_notification_with_voice \
    "🚨 Dashboard Disconnected" \
    "Claude Code dashboard is completely offline. Real-time monitoring disabled. Try running launch dashboard script." \
    "critical" \
    "sosumi"

echo
echo "Did you hear any voice alerts? Check your:"
echo "• 🔊 System volume (should be >50%)"
echo "• 🎧 Audio output device (check Sound preferences)"
echo "• 🔇 Do Not Disturb mode (should be off)"
echo "• 🖥️ Desktop notifications should have appeared"
