#!/bin/bash

# Simple starter for live Claude Code tracking

echo "🚀 Starting Live Claude Code Tracker"
echo "=================================="
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check if Claude projects directory exists
if [ ! -d "$HOME/.claude/projects" ]; then
    echo "⚠️  Warning: Claude projects directory not found at ~/.claude/projects"
    echo "   Make sure you've used Claude Code at least once"
    echo ""
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
pip3 install websockets httpx --quiet 2>/dev/null

# Kill any existing instances
pkill -f "simple_tracker.py" 2>/dev/null
pkill -f "dashboard_sender.py" 2>/dev/null

# Start the combined tracker and sender
echo "🔄 Starting tracker and dashboard sender..."
python3 src/dashboard_sender.py &
TRACKER_PID=$!

echo ""
echo "✅ Live tracker started (PID: $TRACKER_PID)"
echo ""
echo "📊 Dashboard: https://moonlock-dashboard-9kneovnvn-jordaaans-projects.vercel.app/"
echo ""
echo "To stop: kill $TRACKER_PID"
echo "To view logs: tail -f tracker.log"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for interrupt
trap "kill $TRACKER_PID 2>/dev/null; echo ''; echo '👋 Stopped'; exit" INT
wait $TRACKER_PID
