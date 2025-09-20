#!/bin/bash

# Test Claude Code Hook Notification System

echo "🔔 Testing Claude Code Hook Notifications..." >&2

# Test macOS notification
osascript -e 'display notification "Claude Code Hook Test - Notifications Working!" with title "Hook System" sound name "Glass"' 

# Test terminal bell
echo -e "\a" >&2

# Test file logging
echo "$(date): Hook notification test executed" >> ~/claude-hook-test.log

echo "✅ Notification test completed" >&2
