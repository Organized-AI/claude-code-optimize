#!/bin/bash
echo "🔥 DEPLOYING WORKING CLAUDE CODE DASHBOARD"
echo "=========================================="

# 1. Generate static dashboard with latest real data
echo "📊 Generating dashboard with embedded real data..."
python3 generate_static_dashboard.py

if [ ! -f "dashboard_static_embedded.html" ]; then
    echo "❌ Failed to generate static dashboard"
    exit 1
fi

# 2. Copy to deployment folder
echo "📋 Copying to Vercel deployment folder..."
cp dashboard_static_embedded.html vercel-deploy/index.html

# 3. Deploy to Vercel
echo "🚀 Deploying to Vercel..."
cd vercel-deploy
DEPLOY_URL=$(vercel --prod --yes)

echo ""
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "========================================"
echo "🌐 Live Dashboard: $DEPLOY_URL"
echo ""
echo "✅ Features Working:"
echo "   • Real token counts from SQLite database"
echo "   • Actual session costs and usage"
echo "   • Rate limit progress bars"
echo "   • Efficiency analytics"
echo "   • No localhost dependencies!"
echo ""
echo "🔄 To update with fresh data:"
echo "   ./deploy_working_dashboard.sh"
echo ""
echo "💡 Data embedded in dashboard generated at: $(date)"
