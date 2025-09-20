#!/bin/bash
echo "🚀 Deploying Claude Code Optimizer Live Dashboard..."

# 1. Copy latest live dashboard to deployment folder
echo "📋 Updating dashboard with live data connection..."
cp dashboard_live_data_3003.html vercel-deploy/index.html

# 2. Deploy to Vercel
echo "🌐 Deploying to Vercel..."
cd vercel-deploy
DEPLOY_URL=$(vercel --prod --yes)

echo ""
echo "✅ Deployment complete!"
echo "🌐 Live Dashboard: $DEPLOY_URL"
echo ""
echo "🔧 SETUP INSTRUCTIONS:"
echo ""
echo "FOR LOCAL TESTING (when at your development machine):"
echo "1. Start the Live Data API:"
echo "   cd '/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer'"
echo "   python3 live_data_api_fixed.py"
echo ""
echo "2. Open this local version with live data:"
echo "   open dashboard_live_data_3003.html"
echo ""
echo "FOR REMOTE ACCESS:"
echo "• The Vercel dashboard will show 'CONNECTION ERROR' when accessed remotely"
echo "• This is expected - the Vercel dashboard can't reach your localhost:3003"
echo "• Use it for sharing the interface, but real data only works locally"
echo ""
echo "🎯 NEXT STEPS TO ENABLE REMOTE REAL-TIME DATA:"
echo "• Set up a cloud database (Supabase/Railway/PlanetScale)"
echo "• Create a webhook to sync data to cloud endpoint"
echo "• Update dashboard to use cloud API as fallback"
echo ""
