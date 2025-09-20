#!/bin/bash
# Complete Claude Monitor Setup Script
# This script sets up both the LaunchAgent and Dashboard Server

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     🚀 CLAUDE MONITOR COMPLETE SETUP${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONITORS_DIR="$SCRIPT_DIR/monitors"
DASHBOARD_DIR="$SCRIPT_DIR/dashboard-server"

# Step 1: Fix permissions
echo -e "${BLUE}[1/5] Setting up permissions...${NC}"
chmod +x "$MONITORS_DIR/unified-claude-monitor.sh"
chmod +x "$MONITORS_DIR/install-launchagent.sh"
chmod +x "$MONITORS_DIR/simple-monitor.sh"
chmod +x "$MONITORS_DIR/test-monitor.sh"
echo -e "${GREEN}✅ Permissions set${NC}"
echo ""

# Step 2: Install LaunchAgent
echo -e "${BLUE}[2/5] Installing LaunchAgent for auto-start...${NC}"
launchctl unload ~/Library/LaunchAgents/com.claudeoptimizer.monitor.plist 2>/dev/null
launchctl remove com.claudeoptimizer.monitor 2>/dev/null

# Reload the agent
launchctl load -w ~/Library/LaunchAgents/com.claudeoptimizer.monitor.plist
if launchctl list | grep -q "com.claudeoptimizer.monitor"; then
    echo -e "${GREEN}✅ LaunchAgent installed and loaded${NC}"
else
    echo -e "${YELLOW}⚠️  LaunchAgent installed but may need manual loading${NC}"
fi
echo ""

# Step 3: Install Dashboard Server Dependencies
echo -e "${BLUE}[3/5] Installing Dashboard Server dependencies...${NC}"
cd "$DASHBOARD_DIR"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install Node.js first${NC}"
    echo "Visit: https://nodejs.org/"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi
echo ""

# Step 4: Create startup script for dashboard
echo -e "${BLUE}[4/5] Creating dashboard startup script...${NC}"
cat > "$SCRIPT_DIR/start-dashboard.sh" << 'EOF'
#!/bin/bash
# Start Claude Monitor Dashboard

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DASHBOARD_DIR="$SCRIPT_DIR/dashboard-server"

echo "🚀 Starting Claude Monitor Dashboard..."
cd "$DASHBOARD_DIR"

# Check if server is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Dashboard already running on port 3001"
    echo "Opening dashboard in browser..."
    open http://localhost:3001
else
    echo "Starting dashboard server..."
    npm start &
    SERVER_PID=$!
    
    echo "Waiting for server to start..."
    sleep 3
    
    if ps -p $SERVER_PID > /dev/null; then
        echo "✅ Dashboard started (PID: $SERVER_PID)"
        echo "Opening dashboard in browser..."
        open http://localhost:3001
        
        echo ""
        echo "Dashboard is running at: http://localhost:3001"
        echo "To stop: kill $SERVER_PID"
        echo ""
        echo "Press Ctrl+C to stop the dashboard"
        wait $SERVER_PID
    else
        echo "❌ Failed to start dashboard"
        exit 1
    fi
fi
EOF

chmod +x "$SCRIPT_DIR/start-dashboard.sh"
echo -e "${GREEN}✅ Dashboard startup script created${NC}"
echo ""

# Step 5: Create monitoring status check script
echo -e "${BLUE}[5/5] Creating status check script...${NC}"
cat > "$SCRIPT_DIR/check-status.sh" << 'EOF'
#!/bin/bash
# Check Claude Monitor Status

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "═══════════════════════════════════════════════════"
echo "     📊 CLAUDE MONITOR STATUS CHECK"
echo "═══════════════════════════════════════════════════"
echo ""

# Check LaunchAgent
echo "🔄 LaunchAgent Status:"
if launchctl list | grep -q "com.claudeoptimizer.monitor"; then
    PID=$(launchctl list | grep com.claudeoptimizer.monitor | awk '{print $1}')
    if [ "$PID" != "-" ]; then
        echo -e "${GREEN}✅ Monitor is running (PID: $PID)${NC}"
    else
        EXIT_CODE=$(launchctl list | grep com.claudeoptimizer.monitor | awk '{print $2}')
        echo -e "${RED}❌ Monitor crashed (Exit code: $EXIT_CODE)${NC}"
        echo "   Check logs: tail -f ~/.claude/monitor/launchagent.error.log"
    fi
else
    echo -e "${RED}❌ LaunchAgent not loaded${NC}"
fi
echo ""

# Check fswatch
echo "🔍 fswatch Status:"
if command -v fswatch &> /dev/null; then
    echo -e "${GREEN}✅ fswatch installed ($(fswatch --version 2>&1 | head -1))${NC}"
else
    echo -e "${RED}❌ fswatch not found${NC}"
fi
echo ""

# Check Dashboard
echo "🖥️  Dashboard Status:"
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    PID=$(lsof -Pi :3001 -sTCP:LISTEN -t)
    echo -e "${GREEN}✅ Dashboard running (PID: $PID)${NC}"
    echo "   URL: http://localhost:3001"
else
    echo -e "${YELLOW}⚠️  Dashboard not running${NC}"
    echo "   Start with: ./start-dashboard.sh"
fi
echo ""

# Check monitoring processes
echo "📡 Active Monitors:"
MONITORS=$(ps aux | grep -E "(unified-claude-monitor|simple-monitor)" | grep -v grep)
if [ -n "$MONITORS" ]; then
    echo "$MONITORS" | while read line; do
        PID=$(echo "$line" | awk '{print $2}')
        CMD=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i}')
        echo -e "${GREEN}✅ PID $PID: $CMD${NC}"
    done
else
    echo -e "${YELLOW}⚠️  No active monitor processes found${NC}"
fi
echo ""

# Check log files
echo "📝 Recent Log Activity:"
LOG_FILE="$HOME/.claude/monitor/unified.log"
if [ -f "$LOG_FILE" ]; then
    LINES=$(wc -l < "$LOG_FILE")
    LAST_MOD=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LOG_FILE")
    echo "   Log entries: $LINES"
    echo "   Last updated: $LAST_MOD"
    echo "   Latest entries:"
    tail -3 "$LOG_FILE" 2>/dev/null | sed 's/^/     /'
else
    echo -e "${YELLOW}⚠️  No log file found${NC}"
fi
echo ""

echo "═══════════════════════════════════════════════════"
echo "Quick Commands:"
echo "  • View logs:        tail -f ~/.claude/monitor/unified.log"
echo "  • Start dashboard:  ./start-dashboard.sh"
echo "  • Stop monitor:     launchctl unload ~/Library/LaunchAgents/com.claudeoptimizer.monitor.plist"
echo "  • Start monitor:    launchctl load ~/Library/LaunchAgents/com.claudeoptimizer.monitor.plist"
echo "═══════════════════════════════════════════════════"
EOF

chmod +x "$SCRIPT_DIR/check-status.sh"
echo -e "${GREEN}✅ Status check script created${NC}"
echo ""

# Final Summary
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     ✨ SETUP COMPLETE!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "📋 What's been configured:"
echo "  ✅ LaunchAgent installed (auto-starts on boot)"
echo "  ✅ Monitor scripts have correct permissions"
echo "  ✅ Dashboard server dependencies installed"
echo "  ✅ Helper scripts created"
echo ""
echo "🚀 Quick Start Commands:"
echo -e "${BLUE}  ./start-dashboard.sh${NC}  - Start the dashboard server"
echo -e "${BLUE}  ./check-status.sh${NC}     - Check monitoring status"
echo ""
echo "📊 Dashboard Access:"
echo "  Once started, open: http://localhost:3001"
echo ""
echo "📝 Monitor Logs:"
echo "  tail -f ~/.claude/monitor/unified.log"
echo ""
echo -e "${YELLOW}⚠️  Note: The monitor is already running in the background${NC}"
echo -e "${YELLOW}   It will auto-start on every system boot${NC}"
