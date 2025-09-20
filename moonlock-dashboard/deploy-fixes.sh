#!/bin/bash

# Deploy WebSocket & Session Fix to Vercel
# This script deploys the critical fixes for:
# 1. WebSocket -> SSE migration for Vercel compatibility
# 2. Clean disconnected state (no stale data)
# 3. Improved multi-app session detection

echo "====================================="
echo "🚀 DEPLOYING CRITICAL FIXES TO VERCEL"
echo "====================================="

# Navigate to the moonlock-dashboard directory
cd "$(dirname "$0")" || exit 1

echo ""
echo "📋 FIXES IMPLEMENTED:"
echo "  ✅ WebSocket replaced with Server-Sent Events (SSE)"
echo "  ✅ New /api/events endpoint for Vercel compatibility"
echo "  ✅ Clean disconnected state (no stale data)"
echo "  ✅ Enhanced Claude Desktop session detection"
echo "  ✅ Enhanced Claude Code session detection"
echo "  ✅ Multi-app coordination improved"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the client
echo "🔨 Building client application..."
npm run build:client

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to production
echo "Deploying to production..."
vercel --prod

echo ""
echo "====================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "====================================="
echo ""
echo "🔍 TEST THE FOLLOWING:"
echo "1. Visit the deployment URL"
echo "2. Check that the dashboard connects (no WebSocket errors)"
echo "3. Verify disconnected state shows clean message (no stale data)"
echo "4. Start Claude Desktop - verify it shows 'SESSION ACTIVE'"
echo "5. Start Claude Code - verify it shows 'SESSION ACTIVE'"
echo "6. Use both simultaneously - verify 'MULTI-APP ACTIVE'"
echo ""
echo "📊 EXPECTED BEHAVIOR:"
echo "  - Connection via SSE (not WebSocket)"
echo "  - Clean 'Disconnected' message when offline"
echo "  - Accurate session detection for both apps"
echo "  - Real-time updates every 2 seconds"
echo ""
echo "🔗 Deployment URL: https://moonlock-dashboard-9kneovnvn-jordaaans-projects.vercel.app/"
echo ""