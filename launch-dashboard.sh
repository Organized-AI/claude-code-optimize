#!/bin/bash

# Claude Code Optimizer - Dashboard Launcher
# Starts server, runs tests, and opens dashboard in browser

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/claude-optimizer-v2"
DASHBOARD_FILE="$SCRIPT_DIR/dashboard.html"
PORT=3001

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${BOLD}${CYAN}🚀 Claude Code Optimizer - Dashboard Launcher${NC}\n"
echo "======================================================"

# Step 1: Check if port is in use
echo -e "\n${BLUE}1. Checking port ${PORT}...${NC}"
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Port $PORT is already in use. Killing existing process...${NC}"
  lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
  sleep 1
  echo -e "${GREEN}✅ Port cleared${NC}"
else
  echo -e "${GREEN}✅ Port $PORT is available${NC}"
fi

# Step 2: Build TypeScript
echo -e "\n${BLUE}2. Building TypeScript project...${NC}"
cd "$PROJECT_DIR"
npm run build > /dev/null 2>&1
echo -e "${GREEN}✅ Build complete${NC}"

# Step 3: Run tests (optional, comment out if you want to skip)
echo -e "\n${BLUE}3. Running connectivity tests...${NC}"
node test-dashboard.js
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed${NC}"
else
  echo -e "${RED}❌ Some tests failed (Exit code: $TEST_EXIT_CODE)${NC}"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborting...${NC}"
    exit 1
  fi
fi

# Step 4: Start WebSocket server in background
echo -e "\n${BLUE}4. Starting WebSocket server on port ${PORT}...${NC}"
cd "$PROJECT_DIR"
nohup node -e "import('./dist/server.js').then(m => m.main())" > /tmp/claude-dashboard-server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > /tmp/claude-dashboard-server.pid
echo -e "${GREEN}✅ Server started (PID: $SERVER_PID)${NC}"

# Step 5: Wait for server to be ready
echo -e "\n${BLUE}5. Waiting for server to be ready...${NC}"
RETRIES=10
READY=false

for i in $(seq 1 $RETRIES); do
  if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
    READY=true
    break
  fi
  echo -e "${YELLOW}   Attempt $i/$RETRIES...${NC}"
  sleep 1
done

if [ "$READY" = true ]; then
  echo -e "${GREEN}✅ Server is healthy and ready${NC}"
else
  echo -e "${RED}❌ Server failed to start${NC}"
  echo -e "${YELLOW}Check logs: tail /tmp/claude-dashboard-server.log${NC}"
  exit 1
fi

# Step 6: Open dashboard in browser
echo -e "\n${BLUE}6. Opening dashboard in browser...${NC}"
open "$DASHBOARD_FILE"
echo -e "${GREEN}✅ Dashboard opened${NC}"

# Display info
echo -e "\n${BOLD}${GREEN}======================================================"
echo -e "           Dashboard is Ready! 🎉"
echo -e "======================================================${NC}\n"

echo -e "${CYAN}Server Information:${NC}"
echo -e "  WebSocket: ws://localhost:$PORT"
echo -e "  Health: http://localhost:$PORT/health"
echo -e "  PID: $SERVER_PID"
echo -e "  Logs: /tmp/claude-dashboard-server.log"

echo -e "\n${CYAN}Dashboard:${NC}"
echo -e "  File: $DASHBOARD_FILE"
echo -e "  Status: Should be open in your browser"

echo -e "\n${YELLOW}To stop the server:${NC}"
echo -e "  kill $SERVER_PID"
echo -e "  OR"
echo -e "  kill \$(cat /tmp/claude-dashboard-server.pid)"

echo -e "\n${YELLOW}To view server logs:${NC}"
echo -e "  tail -f /tmp/claude-dashboard-server.log"

echo -e "\n${GREEN}Enjoy your dashboard! 🚀${NC}\n"
