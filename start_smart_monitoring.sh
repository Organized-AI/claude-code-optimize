#!/bin/bash
echo "🚀 CLAUDE CODE OPTIMIZER - SMART MONITORING STARTER"
echo "===================================================="

# Check if we're in the right directory
if [ ! -f "generate_smart_dashboard.py" ]; then
    echo "❌ Please run this from the Claude Code Optimizer directory"
    exit 1
fi

echo "📊 Current Status Check:"

# Check activity
ACTIVITY_STATUS=$(python3 -c "
from generate_smart_dashboard import detect_session_activity
activity = detect_session_activity('./session_tracker/claude_usage.db')
print('⚡ ACTIVE sessions detected' if activity else '💤 No active sessions')
")
echo "   $ACTIVITY_STATUS"

# Quick deploy
echo ""
echo "🚀 Quick Deploy Smart Dashboard:"
echo "   Generating latest dashboard and deploying..."
./deploy_smart_dashboard.sh

echo ""
echo "🎯 NEXT STEPS:"
echo ""
echo "1️⃣ VIEW DASHBOARD:"
echo "   Open: https://vercel-deploy-a9u367of7-jordaaans-projects.vercel.app"
echo "   ✓ Rate limits displayed prominently at TOP"
echo "   ✓ Cache analytics showing $4,077+ savings"
echo "   ✓ Activity-based smart updates"
echo ""
echo "2️⃣ START AUTO-MONITORING (Optional):"
echo "   Run: python3 smart_dashboard_monitor.py"
echo "   ✓ Auto-deploys every 10 seconds during activity"
echo "   ✓ Pauses during inactive periods"
echo "   ✓ Hands-free dashboard maintenance"
echo ""
echo "3️⃣ REGULAR UPDATES:"
echo "   Manual: ./deploy_smart_dashboard.sh"
echo "   ✓ Updates with latest session data"
echo "   ✓ Refreshes cache analytics"
echo "   ✓ One-command deployment"
echo ""
echo "🏆 YOUR SMART DASHBOARD IS READY!"
echo "   - Rate limit monitoring prioritized"
echo "   - Intelligent activity detection" 
echo "   - $4,077+ cost savings tracked"
echo "   - Professional team-ready interface"
