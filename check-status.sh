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
