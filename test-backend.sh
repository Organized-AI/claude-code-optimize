#!/bin/bash

echo "🔍 Starting Backend Server Diagnostics..."

cd "/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/dashboard-server"

echo "📁 Current directory: $(pwd)"
echo "📦 Package.json exists: $(test -f package.json && echo "✅ Yes" || echo "❌ No")"
echo "📦 Node modules exists: $(test -d node_modules && echo "✅ Yes" || echo "❌ No")"
echo "📄 Server.js exists: $(test -f server.js && echo "✅ Yes" || echo "❌ No")"

echo ""
echo "🔍 Checking port 3001..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3001 is already in use:"
    lsof -Pi :3001 -sTCP:LISTEN
    echo "🛑 Killing existing process..."
    pkill -f ".*3001.*" 2>/dev/null || true
    sleep 2
fi

echo ""
echo "🚀 Starting server..."
echo "📊 Starting Backend Server on Port 3001..."

# Start server with explicit output
node server.js 2>&1 &
SERVER_PID=$!

echo "🔢 Server PID: $SERVER_PID"
echo "⏱️  Waiting for server to start..."

# Wait and test
for i in {1..15}; do
    sleep 1
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        echo "✅ Server is responding on port 3001!"
        curl -s http://localhost:3001/health | head -3
        break
    else
        echo "⏳ Attempt $i/15 - Server not ready yet..."
    fi
done

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server process is running (PID: $SERVER_PID)"
else
    echo "❌ Server process has died"
fi

echo ""
echo "🌐 Testing URL: http://localhost:3001/health"
curl -v http://localhost:3001/health 2>&1 | head -10 || echo "❌ Curl failed"

echo ""
echo "📝 Server PID: $SERVER_PID"
echo $SERVER_PID > .backend.pid
