#!/bin/bash

# Enhanced Voice Notification Hook
# Multiple fallback methods for voice alerts

send_voice_alert() {
    local message="$1"
    local title="${2:-Claude Code Alert}"
    
    echo "🎙️ Sending voice notification: $message" >&2
    
    # Method 1: Standard say command
    echo "   Trying method 1: say command..." >&2
    say "$message" &
    
    # Method 2: AppleScript with voice
    echo "   Trying method 2: AppleScript..." >&2
    osascript -e "say \"$message\"" &
    
    # Method 3: Terminal bell + visual
    echo "   Trying method 3: Terminal alert..." >&2
    echo -e "\a🔔 $title: $message" >&2
    
    # Method 4: Desktop notification with sound
    echo "   Trying method 4: Desktop notification..." >&2
    osascript -e "display notification \"$message\" with title \"$title\" sound name \"Sosumi\"" &
    
    # Method 5: Speech synthesis with explicit audio device
    echo "   Trying method 5: Explicit audio..." >&2
    say -v Alex --audio-device="Built-in Output" "$message" 2>/dev/null &
    
    # Wait for any background processes
    wait
    
    echo "✅ Voice notification attempts complete" >&2
}

# Test if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-test}" in
        "test")
            send_voice_alert "Testing enhanced voice notification system. Dashboard disconnection alert test."
            ;;
        *)
            send_voice_alert "$1" "$2"
            ;;
    esac
fi
