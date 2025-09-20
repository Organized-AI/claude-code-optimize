#!/bin/bash

# Simple Voice Hook for Claude Code
# Uses macOS built-in text-to-speech

# Get the tool name from environment variable
TOOL_NAME="${CLAUDE_HOOK_TOOL_NAME:-unknown_tool}"
EVENT="${CLAUDE_HOOK_EVENT:-unknown_event}"

# Voice messages based on event type
case "$EVENT" in
    "pre_tool_use")
        MESSAGE="About to use $TOOL_NAME tool"
        ;;
    "post_tool_use")
        MESSAGE="Completed $TOOL_NAME tool successfully"
        ;;
    "stop")
        MESSAGE="Claude Code session completed"
        ;;
    *)
        MESSAGE="Claude Code notification: $*"
        ;;
esac

# Speak the message using macOS say command
echo "🔊 Voice: $MESSAGE"
say "$MESSAGE" &

# Also show a system notification
osascript -e "display notification \"$MESSAGE\" with title \"Claude Code Hooks\""

# Log the event
echo "[$(date)] $EVENT: $MESSAGE" >> "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/logs/hooks.log"
