#!/bin/bash

# Simple service starter for Claude Code Optimizer
echo "🚀 Starting Claude Code Optimizer Services..."
echo ""

PROJECT_ROOT="/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

echo "📊 Starting Dashboard Server (Port 3001)..."
cd "$PROJECT_ROOT/dashboard-server"
npm start > "$PROJECT_ROOT/logs/dashboard-server.log" 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo "🌐 Starting Frontend Dashboard (Port 5173)..."
cd "$PROJECT_ROOT/moonlock-dashboard"
npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait a moment for services to start
sleep 5

echo ""
echo "✅ Services started!"
echo ""
echo "🌐 Available at:"
echo "   Backend API:  http://localhost:3001"
echo "   Frontend:     http://localhost:5173"
echo ""
echo "📝 Logs:"
echo "   Backend:      $PROJECT_ROOT/logs/dashboard-server.log"
echo "   Frontend:     $PROJECT_ROOT/logs/frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Save PIDs for later cleanup
echo $BACKEND_PID > "$PROJECT_ROOT/.pids/backend.pid"
echo $FRONTEND_PID > "$PROJECT_ROOT/.pids/frontend.pid"

echo "🎉 All services are now starting up!"
echo "Check the logs for status updates."
