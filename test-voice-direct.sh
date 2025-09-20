#!/bin/bash

echo "🎙️ Direct Voice Test for Dashboard Disconnection"

# Test 1: Basic say command
echo "Test 1: Basic voice synthesis..."
say "This is a test of the voice notification system"
sleep 2

# Test 2: Dashboard disconnection message
echo "Test 2: Dashboard disconnection alert..."
say -v Alex "Alert: Claude Code dashboard has disconnected. Real time monitoring is now offline."
sleep 2

# Test 3: With different voice
echo "Test 3: Different voice..."
say -v Samantha "Dashboard connection lost. Attempting to restore monitoring."
sleep 2

# Test 4: Force notification through osascript
echo "Test 4: AppleScript notification with sound..."
osascript -e 'display notification "🚨 Dashboard Offline - Voice Test" with title "Claude Code Alert" sound name "Sosumi"'
sleep 1

echo "✅ Voice tests completed. Did you hear any of these?"
