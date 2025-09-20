#!/bin/bash
echo "🚀 Deploying Claude Code Optimizer Dashboard to Vercel..."

# Copy latest dashboard to deployment folder
cp dashboard_embedded_data.html vercel-deploy/index.html

# Deploy to Vercel
cd vercel-deploy
vercel --prod --yes

echo "✅ Deployment complete!"
echo "🌐 Dashboard: https://vercel-deploy-kayyr4nd7-jordaaans-projects.vercel.app"
