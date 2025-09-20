#!/bin/bash
# Deploy Claude Monitor Dashboard to Vercel

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Claude Monitor Dashboard - Vercel Deployment${NC}"
echo "================================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm i -g vercel
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Build the project
echo -e "${BLUE}🔨 Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix errors and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Deploy to Vercel
echo -e "${BLUE}☁️  Deploying to Vercel...${NC}"
echo ""
echo "Options:"
echo "  1. Deploy to production (--prod)"
echo "  2. Deploy preview"
echo ""
read -p "Choose deployment type (1 or 2): " choice

if [ "$choice" = "1" ]; then
    vercel --prod
else
    vercel
fi

echo ""
echo -e "${GREEN}✨ Deployment complete!${NC}"
echo ""
echo "Don't forget to set environment variables in Vercel:"
echo "  - NEXT_PUBLIC_API_URL (your monitoring server URL)"
echo "  - NEXT_PUBLIC_WS_URL (WebSocket URL)"
echo "  - MONITOR_API_URL (Backend API URL)"
echo ""
echo "You can set these in:"
echo "  1. Vercel Dashboard > Project Settings > Environment Variables"
echo "  2. Or using: vercel env add"
