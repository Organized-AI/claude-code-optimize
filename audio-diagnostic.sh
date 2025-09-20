#!/bin/bash

echo "🔊 macOS Audio Diagnostic for Voice Notifications"
echo "================================================"

# Check current volume
echo "1. Current system volume:"
osascript -e 'output volume of (get volume settings)'

echo
echo "2. Audio output devices:"
system_profiler SPAudioDataType 2>/dev/null | grep -A 5 "Devices:" || echo "   Unable to list audio devices"

echo
echo "3. Testing basic audio:"
echo "   • Playing system sound..."
afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || echo "   ❌ System sound failed"

echo "   • Testing say command with output..."
say -v Alex "Audio test one two three" --progress 2>/dev/null || echo "   ❌ Say command failed"

echo
echo "4. Do Not Disturb status:"
defaults read com.apple.ncprefs dnd_prefs 2>/dev/null | grep -i "userPref\|dndDisplaySleep" || echo "   Unable to check DND status"

echo
echo "5. Quick audio test - you should hear this NOW:"
for i in {1..3}; do
    echo "   Test $i..."
    say -v Alex "Test number $i" &
    afplay /System/Library/Sounds/Ping.aiff 2>/dev/null &
    sleep 2
done
wait

echo
echo "🎯 If you heard NONE of these tests, check:"
echo "   • System Preferences > Sound > Output"
echo "   • Volume slider in menu bar"
echo "   • Bluetooth headphones connected?"
echo "   • External speakers/monitors with audio?"
