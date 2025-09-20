#!/bin/bash
echo "🚀 DEPLOYING SMART CLAUDE CODE DASHBOARD"
echo "========================================"

# 1. Generate smart dashboard with latest real data + activity detection
echo "📊 Generating smart dashboard with embedded real data + activity detection..."
python3 generate_smart_dashboard.py

if [ ! -f "dashboard_smart_embedded.html" ]; then
    echo "❌ Failed to generate smart dashboard"
    exit 1
fi

# 2. Copy to deployment folder
echo "📋 Copying smart dashboard to Vercel deployment folder..."
cp dashboard_smart_embedded.html vercel-deploy/index.html

# 3. Deploy to Vercel
echo "🚀 Deploying to Vercel..."
cd vercel-deploy
DEPLOY_URL=$(vercel --prod --yes)

echo ""
echo "🎉 SMART DASHBOARD DEPLOYED!"
echo "============================================="
echo "🌐 Live Dashboard: $DEPLOY_URL"
echo ""
echo "✅ Smart Features:"
echo "   • Rate limit monitoring prioritized at TOP"
echo "   • Auto-detects session activity"
echo "   • Intelligent 10-second polling during activity"
echo "   • Pauses monitoring during inactive periods"
echo "   • Real cache analytics with cost savings"
echo "   • Professional priority layout"
echo ""
echo "⚡ Activity Status:"
ACTIVITY_STATUS=$(python3 -c "
from generate_smart_dashboard import detect_session_activity
activity = detect_session_activity('./claude_usage.db')
print('ACTIVE - monitoring enabled' if activity else 'INACTIVE - monitoring paused')
")
echo "   Current: $ACTIVITY_STATUS"
echo ""
echo "🔄 Auto-Update Commands:"
echo "   Manual update: ./deploy_smart_dashboard.sh"
echo "   Start monitor: python3 smart_dashboard_monitor.py"
echo ""
echo "💡 Dashboard generated at: $(date)"
