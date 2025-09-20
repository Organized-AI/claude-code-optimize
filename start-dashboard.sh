#!/bin/bash
# Start Claude Monitor Dashboard

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DASHBOARD_DIR="$SCRIPT_DIR/dashboard-server"

echo "🚀 Starting Claude Monitor Dashboard..."
cd "$DASHBOARD_DIR"

# Check if server is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Dashboard already running on port 3001"
    echo "Opening dashboard in browser..."
    open http://localhost:3001
else
    echo "Starting dashboard server..."
    npm start &
    SERVER_PID=$!
    
    echo "Waiting for server to start..."
    sleep 3
    
    if ps -p $SERVER_PID > /dev/null; then
        echo "✅ Dashboard started (PID: $SERVER_PID)"
        echo "Opening dashboard in browser..."
        open http://localhost:3001
        
        echo ""
        echo "Dashboard is running at: http://localhost:3001"
        echo "To stop: kill $SERVER_PID"
        echo ""
        echo "Press Ctrl+C to stop the dashboard"
        wait $SERVER_PID
    else
        echo "❌ Failed to start dashboard"
        exit 1
    fi
fi
