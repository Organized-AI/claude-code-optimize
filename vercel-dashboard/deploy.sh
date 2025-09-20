#!/bin/bash
# Deploy Claude Monitor Dashboard to Vercel

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     🚀 CLAUDE MONITOR DASHBOARD - VERCEL DEPLOYMENT${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm i -g vercel
fi

# Install dependencies
echo -e "${BLUE}[1/4] Installing dependencies...${NC}"
npm install

# Build the project locally first to test
echo -e "${BLUE}[2/4] Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Deploy to Vercel
echo -e "${BLUE}[3/4] Deploying to Vercel...${NC}"
echo -e "${YELLOW}Note: You'll need to configure environment variables:${NC}"
echo "  • NEXT_PUBLIC_WS_URL - WebSocket URL for real-time updates"
echo "  • DATABASE_PATH - Path to SQLite database"
echo ""

# Run vercel deployment
vercel --prod

echo ""
echo -e "${BLUE}[4/4] Post-deployment setup${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ Deployment Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Vercel dashboard:"
echo "   - NEXT_PUBLIC_WS_URL (e.g., wss://your-websocket-server.com)"
echo "   - DATABASE_PATH (if using external database)"
echo ""
echo "2. For local WebSocket server, you may need to:"
echo "   - Deploy the WebSocket server separately"
echo "   - Or use a service like Pusher/Ably for real-time updates"
echo ""
echo "3. Visit your deployment URL to see the dashboard!"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
