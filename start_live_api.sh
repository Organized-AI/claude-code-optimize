#!/bin/bash
echo "🚀 Starting Live Data API Server..."

# Kill any existing processes on port 3003
pkill -f "live_data_api"

# Start the API server
python3 live_data_api_fixed.py &
API_PID=$!

echo "📡 API Server started with PID: $API_PID"
echo "🌐 Available at: http://localhost:3002"
echo "💾 Database: ./session_tracker/claude_usage.db"

# Save PID for easy cleanup
echo $API_PID > api_server.pid

echo "✅ Server is running in the background"
echo "🛑 To stop: kill \$(cat api_server.pid)"
