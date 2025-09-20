#!/bin/bash
# Unified Claude Monitor - Tracks both CLI and Desktop usage
# Location: ~/Claude Code Optimizer/monitors/unified-claude-monitor.sh

# Configuration
DASHBOARD_HOST="localhost"
DASHBOARD_PORT="3001"
LOG_FILE="$HOME/.claude/monitor/unified.log"

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Unified Claude Monitor${NC}"
echo "================================================"
echo "Monitoring:"
echo "  • Claude Code (CLI) - Full message content"
echo "  • Claude Desktop    - Activity detection"
echo "================================================"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to send data to dashboard
send_to_dashboard() {
    local source=$1
    local event_type=$2
    local data=$3
    
    curl -s -X POST "http://$DASHBOARD_HOST:$DASHBOARD_PORT/api/activity" \
        -H "Content-Type: application/json" \
        -d "{
            \"source\": \"$source\",
            \"type\": \"$event_type\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"data\": $data
        }" >> "$LOG_FILE" 2>&1
}

# Monitor 1: Claude Code (JSONL files)
monitor_claude_code() {
    echo -e "${BLUE}📝 Monitoring Claude Code...${NC}"
    
    # Watch for new JSONL files and tail existing ones
    fswatch -r "$HOME/.claude/projects" | while read event; do
        if [[ $event == *.jsonl ]]; then
            # New session detected
            session_id=$(basename "$event" .jsonl)
            echo -e "${GREEN}[Claude Code]${NC} New session: $session_id"
            
            # Tail the new file
            tail -F "$event" 2>/dev/null | while read line; do
                if [ ! -z "$line" ]; then
                    # Parse and send each message
                    echo -e "${GREEN}[Claude Code]${NC} New message"
                    send_to_dashboard "claude-code" "message" "$line"
                fi
            done &
        fi
    done
}

# Monitor 2: Claude Desktop (Activity detection)
monitor_claude_desktop() {
    echo -e "${YELLOW}🖥️  Monitoring Claude Desktop...${NC}"
    
    CLAUDE_DESKTOP="$HOME/Library/Application Support/Claude"
    
    # Watch IndexedDB and Local Storage for changes
    fswatch -r "$CLAUDE_DESKTOP/IndexedDB" "$CLAUDE_DESKTOP/Local Storage" \
            "$CLAUDE_DESKTOP/Session Storage" 2>/dev/null | while read event; do
        
        # Get file info
        if [ -f "$event" ]; then
            size=$(stat -f%z "$event" 2>/dev/null || echo "0")
            filename=$(basename "$event")
            
            # Only report significant changes (not every byte)
            if [[ $filename == *.ldb ]] || [[ $filename == *.log ]]; then
                echo -e "${YELLOW}[Claude Desktop]${NC} Activity detected: $filename ($size bytes)"
                
                send_to_dashboard "claude-desktop" "activity" "{
                    \"file\": \"$filename\",
                    \"size\": $size,
                    \"path\": \"$event\"
                }"
            fi
        fi
    done
}

# Monitor 3: System-wide Claude process monitoring
monitor_processes() {
    echo -e "${BLUE}⚙️  Monitoring Claude processes...${NC}"
    
    while true; do
        # Check if Claude Desktop is running
        if pgrep -x "Claude" > /dev/null; then
            send_to_dashboard "system" "process" "{
                \"app\": \"Claude Desktop\",
                \"status\": \"running\",
                \"pid\": $(pgrep -x "Claude")
            }"
        fi
        
        # Check if claude CLI is running
        if pgrep -f "claude" > /dev/null; then
            send_to_dashboard "system" "process" "{
                \"app\": \"Claude CLI\",
                \"status\": \"running\",
                \"pid\": $(pgrep -f "claude")
            }"
        fi
        
        sleep 60  # Check every minute
    done
}

# Start all monitors in background
monitor_claude_code &
PID1=$!
monitor_claude_desktop &
PID2=$!
monitor_processes &
PID3=$!

echo "================================================"
echo -e "${GREEN}✅ All monitors started${NC}"
echo "PIDs: Code=$PID1, Desktop=$PID2, Process=$PID3"
echo "Logs: $LOG_FILE"
echo "Dashboard: http://$DASHBOARD_HOST:$DASHBOARD_PORT"
echo "================================================"
echo "Press Ctrl+C to stop all monitors"

# Cleanup on exit
trap "kill $PID1 $PID2 $PID3 2>/dev/null; echo 'Monitors stopped'" EXIT

# Keep script running
wait
