#!/bin/bash

# Complete Deployment & Activation Script
# Deploys all automation components and starts production monitoring

set -e

# Configuration
PROJECT_DIR="/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"
DASHBOARD_URL="https://claude-code-optimizer-dashboard.vercel.app"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/.pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Create necessary directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Logging
log() {
    echo -e "${2:-$BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/deployment.log"
}

# Check Python installation
check_python() {
    log "Checking Python installation..." "$CYAN"
    
    if ! command -v python3 &> /dev/null; then
        log "Python 3 is not installed. Please install Python 3.8 or higher." "$RED"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    log "Python version: $PYTHON_VERSION" "$GREEN"
}

# Install Python dependencies
install_dependencies() {
    log "Installing Python dependencies..." "$CYAN"
    
    # Required packages
    PACKAGES=(
        "websockets>=10.0"
        "aiohttp>=3.8.0"
        "psutil>=5.9.0"
        "watchdog>=2.1.0"
        "requests>=2.28.0"
    )
    
    for package in "${PACKAGES[@]}"; do
        log "Installing $package..."
        pip3 install --quiet --upgrade "$package"
    done
    
    log "All dependencies installed successfully" "$GREEN"
}

# Make scripts executable
make_executable() {
    log "Setting executable permissions..." "$CYAN"
    
    chmod +x "$PROJECT_DIR/websocket-session-automation.py"
    chmod +x "$PROJECT_DIR/claude-code-session-monitor.py"
    chmod +x "$PROJECT_DIR/dashboard-reconnection-fix.sh"
    chmod +x "$PROJECT_DIR/deploy-automation.sh"
    
    log "Scripts are now executable" "$GREEN"
}

# Test WebSocket connection
test_websocket() {
    log "Testing WebSocket connection to dashboard..." "$CYAN"
    
    python3 -c "
import asyncio
import websockets
import json
import ssl

async def test():
    try:
        uri = 'wss://claude-code-optimizer-dashboard.vercel.app/ws'
        
        # Create SSL context
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        try:
            # Try standard SSL first
            async with websockets.connect(uri) as ws:
                await ws.send(json.dumps({'type': 'ping'}))
                print('WebSocket connection successful')
                return True
        except ssl.SSLError:
            # Fallback to relaxed SSL
            async with websockets.connect(uri, ssl=ssl_context) as ws:
                await ws.send(json.dumps({'type': 'ping'}))
                print('WebSocket connection successful (relaxed SSL)')
                return True
    except Exception as e:
        print(f'WebSocket connection failed: {e}')
        return False

result = asyncio.run(test())
exit(0 if result else 1)
" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "WebSocket connection test passed" "$GREEN"
        return 0
    else
        log "WebSocket connection test failed - will retry with HTTP fallback" "$YELLOW"
        return 1
    fi
}

# Start session automation (HTTP-based)
start_session_automation() {
    log "Starting Session Automation (HTTP API)..." "$CYAN"
    
    PID_FILE="$PID_DIR/session-automation.pid"
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            log "Session automation already running (PID: $OLD_PID)" "$YELLOW"
            return 0
        fi
        rm "$PID_FILE"
    fi
    
    # Start the HTTP-based automation script
    cd "$PROJECT_DIR"
    nohup python3 session-automation-http.py \
        > "$LOG_DIR/session-automation.log" 2>&1 &
    
    PID=$!
    echo $PID > "$PID_FILE"
    
    sleep 2
    
    if ps -p $PID > /dev/null; then
        log "Session automation started (PID: $PID)" "$GREEN"
        return 0
    else
        log "Failed to start session automation" "$RED"
        rm "$PID_FILE"
        return 1
    fi
}

# Start session monitor
start_session_monitor() {
    log "Starting Claude Code Session Monitor..." "$CYAN"
    
    PID_FILE="$PID_DIR/session-monitor.pid"
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p "$OLD_PID" > /dev/null 2>&1; then
            log "Session monitor already running (PID: $OLD_PID)" "$YELLOW"
            return 0
        fi
        rm "$PID_FILE"
    fi
    
    # Start the monitor script
    cd "$PROJECT_DIR"
    nohup python3 claude-code-session-monitor.py \
        > "$LOG_DIR/session-monitor.log" 2>&1 &
    
    PID=$!
    echo $PID > "$PID_FILE"
    
    sleep 2
    
    if ps -p $PID > /dev/null; then
        log "Session monitor started (PID: $PID)" "$GREEN"
        return 0
    else
        log "Failed to start session monitor" "$RED"
        rm "$PID_FILE"
        return 1
    fi
}

# Setup LaunchAgent for auto-start (macOS)
setup_launchagent() {
    log "Setting up LaunchAgent for auto-start..." "$CYAN"
    
    PLIST_FILE="$HOME/Library/LaunchAgents/com.claudecode.automation.plist"
    
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claudecode.automation</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$PROJECT_DIR/deploy-automation.sh</string>
        <string>start-services</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/launchagent.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/launchagent.error.log</string>
</dict>
</plist>
EOF
    
    # Load the agent
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
    launchctl load "$PLIST_FILE"
    
    log "LaunchAgent installed and activated" "$GREEN"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..." "$CYAN"
    
    SERVICES_OK=true
    
    # Check session automation
    if [ -f "$PID_DIR/session-automation.pid" ]; then
        PID=$(cat "$PID_DIR/session-automation.pid")
        if ps -p "$PID" > /dev/null 2>&1; then
            log "✓ Session automation is running" "$GREEN"
        else
            log "✗ Session automation is not running" "$RED"
            SERVICES_OK=false
        fi
    else
        log "✗ Session automation PID file not found" "$RED"
        SERVICES_OK=false
    fi
    
    # Check session monitor
    if [ -f "$PID_DIR/session-monitor.pid" ]; then
        PID=$(cat "$PID_DIR/session-monitor.pid")
        if ps -p "$PID" > /dev/null 2>&1; then
            log "✓ Session monitor is running" "$GREEN"
        else
            log "✗ Session monitor is not running" "$RED"
            SERVICES_OK=false
        fi
    else
        log "✗ Session monitor PID file not found" "$RED"
        SERVICES_OK=false
    fi
    
    # Check dashboard connectivity
    if curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL/api/health" | grep -q "200"; then
        log "✓ Dashboard API is responsive" "$GREEN"
    else
        log "✗ Dashboard API is not responding" "$RED"
        SERVICES_OK=false
    fi
    
    if [ "$SERVICES_OK" = true ]; then
        log "All services are running successfully!" "$GREEN"
        return 0
    else
        log "Some services failed to start" "$YELLOW"
        return 1
    fi
}

# Stop all services
stop_services() {
    log "Stopping all services..." "$CYAN"
    
    for pid_file in "$PID_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            PID=$(cat "$pid_file")
            SERVICE_NAME=$(basename "$pid_file" .pid)
            
            if ps -p "$PID" > /dev/null 2>&1; then
                log "Stopping $SERVICE_NAME (PID: $PID)..."
                kill -TERM "$PID" 2>/dev/null || true
                
                # Wait for process to stop
                for i in {1..10}; do
                    if ! ps -p "$PID" > /dev/null 2>&1; then
                        break
                    fi
                    sleep 1
                done
                
                # Force kill if still running
                if ps -p "$PID" > /dev/null 2>&1; then
                    kill -KILL "$PID" 2>/dev/null || true
                fi
            fi
            
            rm "$pid_file"
            log "$SERVICE_NAME stopped" "$GREEN"
        fi
    done
}

# View logs
view_logs() {
    log "Recent log entries:" "$CYAN"
    echo ""
    
    for log_file in "$LOG_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            echo -e "${MAGENTA}=== $(basename "$log_file") ===${NC}"
            tail -n 10 "$log_file"
            echo ""
        fi
    done
}

# Health check
health_check() {
    log "Running health check..." "$CYAN"
    
    python3 -c "
import json
import requests
import psutil
from datetime import datetime

# Check system resources
cpu_percent = psutil.cpu_percent(interval=1)
memory = psutil.virtual_memory()
disk = psutil.disk_usage('/')

print(f'System Resources:')
print(f'  CPU Usage: {cpu_percent}%')
print(f'  Memory: {memory.percent}% used ({memory.used / 1024**3:.1f}GB / {memory.total / 1024**3:.1f}GB)')
print(f'  Disk: {disk.percent}% used ({disk.used / 1024**3:.1f}GB / {disk.total / 1024**3:.1f}GB)')

# Check Claude Code process
claude_running = False
for proc in psutil.process_iter(['name']):
    if 'claude' in proc.info['name'].lower():
        claude_running = True
        break

print(f'\\nClaude Code Status: {\"Running\" if claude_running else \"Not Running\"}')

# Check dashboard
try:
    response = requests.get('$DASHBOARD_URL/api/health', timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f'\\nDashboard Status: Online')
        print(f'  Uptime: {data.get(\"uptime\", 0):.0f} seconds')
        print(f'  WebSocket Clients: {data.get(\"services\", {}).get(\"websocket\", \"0\")}')
    else:
        print(f'\\nDashboard Status: Error (HTTP {response.status_code})')
except Exception as e:
    print(f'\\nDashboard Status: Offline ({e})')
"
}

# Main deployment flow
deploy_all() {
    log "Starting complete deployment..." "$MAGENTA"
    echo ""
    
    # Step 1: Check Python
    check_python
    echo ""
    
    # Step 2: Install dependencies
    install_dependencies
    echo ""
    
    # Step 3: Make scripts executable
    make_executable
    echo ""
    
    # Step 4: Test WebSocket
    test_websocket
    echo ""
    
    # Step 5: Start services
    start_session_automation
    start_session_monitor
    echo ""
    
    # Step 6: Setup auto-start
    if [[ "$OSTYPE" == "darwin"* ]]; then
        setup_launchagent
        echo ""
    fi
    
    # Step 7: Verify deployment
    sleep 3
    verify_deployment
    echo ""
    
    # Step 8: Health check
    health_check
    echo ""
    
    log "Deployment completed successfully!" "$MAGENTA"
    log "Dashboard URL: $DASHBOARD_URL" "$CYAN"
    log "Logs directory: $LOG_DIR" "$CYAN"
    log "PIDs directory: $PID_DIR" "$CYAN"
}

# Command line interface
case "$1" in
    deploy)
        deploy_all
        ;;
    start)
        start_session_automation
        start_session_monitor
        verify_deployment
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_session_automation
        start_session_monitor
        verify_deployment
        ;;
    status)
        verify_deployment
        health_check
        ;;
    logs)
        view_logs
        ;;
    start-services)
        # Used by LaunchAgent
        start_session_automation
        start_session_monitor
        ;;
    *)
        echo -e "${MAGENTA}WebSocket & Session Automation Deployment${NC}"
        echo ""
        echo "Usage: $0 {deploy|start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Complete deployment with all dependencies"
        echo "  start   - Start all automation services"
        echo "  stop    - Stop all automation services"
        echo "  restart - Restart all automation services"
        echo "  status  - Check service status and health"
        echo "  logs    - View recent log entries"
        echo ""
        exit 1
        ;;
esac