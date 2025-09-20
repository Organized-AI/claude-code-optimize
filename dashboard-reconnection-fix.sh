#!/bin/bash

# Dashboard WebSocket Reconnection Fix Script
# Ensures stable WebSocket connections to the Vercel dashboard

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DASHBOARD_URL="https://claude-code-optimizer-dashboard.vercel.app"
WEBSOCKET_URL="wss://claude-code-optimizer-dashboard.vercel.app/ws"
PROJECT_DIR="/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"
LOG_FILE="$PROJECT_DIR/dashboard-reconnection.log"
PID_FILE="$PROJECT_DIR/.dashboard-monitor.pid"

# Logging function
log() {
    echo -e "$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if monitoring is already running
check_existing_monitor() {
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            log "${YELLOW}Dashboard monitor already running with PID $OLD_PID${NC}"
            return 0
        else
            rm "$PID_FILE"
        fi
    fi
    return 1
}

# Test WebSocket connection
test_websocket() {
    log "${BLUE}Testing WebSocket connection...${NC}"
    
    # Use websocat if available, otherwise fallback to curl
    if command -v websocat &> /dev/null; then
        if timeout 5 websocat -t "$WEBSOCKET_URL" <<< '{"type":"ping"}' > /dev/null 2>&1; then
            log "${GREEN}WebSocket connection successful${NC}"
            return 0
        else
            log "${RED}WebSocket connection failed${NC}"
            return 1
        fi
    else
        # Fallback to HTTP health check
        if curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL/api/health" | grep -q "200"; then
            log "${GREEN}Dashboard API is responsive${NC}"
            return 0
        else
            log "${RED}Dashboard API is not responding${NC}"
            return 1
        fi
    fi
}

# Fix Vercel serverless WebSocket handling
fix_vercel_websocket() {
    log "${BLUE}Fixing Vercel WebSocket configuration...${NC}"
    
    # Update vercel.json for better WebSocket support
    VERCEL_CONFIG="$PROJECT_DIR/moonlock-dashboard/vercel.json"
    
    if [ -f "$VERCEL_CONFIG" ]; then
        # Backup original
        cp "$VERCEL_CONFIG" "$VERCEL_CONFIG.backup.$(date +%s)"
        
        # Check if WebSocket route exists
        if ! grep -q "rewrites" "$VERCEL_CONFIG"; then
            log "${YELLOW}Adding WebSocket rewrite rules to vercel.json${NC}"
            
            # Use jq to add rewrites if available
            if command -v jq &> /dev/null; then
                jq '. + {"rewrites": [{"source": "/ws", "destination": "/api/websocket"}]}' "$VERCEL_CONFIG" > "$VERCEL_CONFIG.tmp"
                mv "$VERCEL_CONFIG.tmp" "$VERCEL_CONFIG"
            fi
        fi
        
        log "${GREEN}Vercel configuration updated${NC}"
    fi
}

# Start background monitor
start_monitor() {
    log "${BLUE}Starting dashboard connection monitor...${NC}"
    
    # Start the Python automation script in background
    cd "$PROJECT_DIR"
    
    if [ -f "websocket-session-automation.py" ]; then
        nohup python3 websocket-session-automation.py > "$PROJECT_DIR/automation.log" 2>&1 &
        MONITOR_PID=$!
        echo $MONITOR_PID > "$PID_FILE"
        log "${GREEN}Monitor started with PID $MONITOR_PID${NC}"
        
        # Verify it's running
        sleep 2
        if ps -p $MONITOR_PID > /dev/null; then
            log "${GREEN}Monitor is running successfully${NC}"
        else
            log "${RED}Monitor failed to start${NC}"
            rm "$PID_FILE"
            return 1
        fi
    else
        log "${RED}Automation script not found${NC}"
        return 1
    fi
}

# Stop monitor
stop_monitor() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log "${BLUE}Stopping monitor with PID $PID...${NC}"
            kill -TERM "$PID"
            rm "$PID_FILE"
            log "${GREEN}Monitor stopped${NC}"
        else
            log "${YELLOW}Monitor not running${NC}"
            rm "$PID_FILE"
        fi
    else
        log "${YELLOW}No monitor PID file found${NC}"
    fi
}

# Restart monitor
restart_monitor() {
    log "${BLUE}Restarting dashboard monitor...${NC}"
    stop_monitor
    sleep 2
    start_monitor
}

# Install dependencies
install_dependencies() {
    log "${BLUE}Installing required dependencies...${NC}"
    
    # Install Python packages
    pip3 install --quiet websockets aiohttp psutil
    
    # Install websocat if on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v websocat &> /dev/null; then
            if command -v brew &> /dev/null; then
                log "${YELLOW}Installing websocat...${NC}"
                brew install websocat
            fi
        fi
    fi
    
    log "${GREEN}Dependencies installed${NC}"
}

# Health check loop
health_check_loop() {
    log "${BLUE}Starting health check loop...${NC}"
    
    FAILURES=0
    MAX_FAILURES=3
    
    while true; do
        if test_websocket; then
            FAILURES=0
            log "${GREEN}[$(date '+%H:%M:%S')] WebSocket healthy${NC}"
        else
            FAILURES=$((FAILURES + 1))
            log "${YELLOW}[$(date '+%H:%M:%S')] WebSocket check failed ($FAILURES/$MAX_FAILURES)${NC}"
            
            if [ $FAILURES -ge $MAX_FAILURES ]; then
                log "${RED}Max failures reached, restarting monitor...${NC}"
                restart_monitor
                FAILURES=0
            fi
        fi
        
        sleep 30
    done
}

# Setup systemd/launchd service
setup_service() {
    log "${BLUE}Setting up background service...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use launchd
        PLIST_FILE="$HOME/Library/LaunchAgents/com.claudecode.dashboard.monitor.plist"
        
        cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claudecode.dashboard.monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$PROJECT_DIR/dashboard-reconnection-fix.sh</string>
        <string>monitor</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$PROJECT_DIR/service.log</string>
    <key>StandardErrorPath</key>
    <string>$PROJECT_DIR/service.error.log</string>
</dict>
</plist>
EOF
        
        launchctl unload "$PLIST_FILE" 2>/dev/null || true
        launchctl load "$PLIST_FILE"
        log "${GREEN}LaunchAgent installed and started${NC}"
        
    else
        # Linux - use systemd
        log "${YELLOW}Systemd service setup not implemented yet${NC}"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo -e "${BLUE}=== Dashboard WebSocket Reconnection Fix ===${NC}"
    echo ""
    echo "1. Test WebSocket connection"
    echo "2. Start monitor"
    echo "3. Stop monitor"
    echo "4. Restart monitor"
    echo "5. Install dependencies"
    echo "6. Setup auto-start service"
    echo "7. View logs"
    echo "8. Fix Vercel configuration"
    echo "9. Run health check loop"
    echo "0. Exit"
    echo ""
    echo -n "Select option: "
}

# Parse command line arguments
case "$1" in
    start)
        start_monitor
        ;;
    stop)
        stop_monitor
        ;;
    restart)
        restart_monitor
        ;;
    monitor)
        health_check_loop
        ;;
    install)
        install_dependencies
        ;;
    test)
        test_websocket
        ;;
    *)
        # Interactive mode
        while true; do
            show_menu
            read -r option
            
            case $option in
                1)
                    test_websocket
                    ;;
                2)
                    if ! check_existing_monitor; then
                        start_monitor
                    fi
                    ;;
                3)
                    stop_monitor
                    ;;
                4)
                    restart_monitor
                    ;;
                5)
                    install_dependencies
                    ;;
                6)
                    setup_service
                    ;;
                7)
                    tail -n 50 "$LOG_FILE"
                    ;;
                8)
                    fix_vercel_websocket
                    ;;
                9)
                    health_check_loop
                    ;;
                0)
                    log "${GREEN}Exiting...${NC}"
                    exit 0
                    ;;
                *)
                    log "${RED}Invalid option${NC}"
                    ;;
            esac
            
            echo ""
            echo -n "Press Enter to continue..."
            read -r
        done
        ;;
esac