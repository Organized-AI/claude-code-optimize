#!/bin/bash
# Simple Claude Monitor - Works with macOS default bash
# No dependencies required

# Configuration
DASHBOARD_HOST="localhost"
DASHBOARD_PORT="3001"
LOG_FILE="$HOME/.claude/monitor/simple.log"
STATE_FILE="$HOME/.claude/monitor/state.txt"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Simple Claude Monitor${NC}"
echo "================================================"
echo "Monitoring both Claude Code and Desktop"
echo "Dashboard: http://$DASHBOARD_HOST:$DASHBOARD_PORT"
echo "================================================"

# Create directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$STATE_FILE")"

# Initialize state file
touch "$STATE_FILE"

# Simple monitoring loop
monitor_loop() {
    echo -e "${BLUE}Starting monitoring...${NC}"
    
    while true; do
        # Monitor Claude Code - count JSONL files
        CODE_COUNT=$(find "$HOME/.claude/projects" -name "*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
        LAST_CODE_COUNT=$(grep "code_count:" "$STATE_FILE" 2>/dev/null | cut -d: -f2 || echo "0")
        
        if [ "$CODE_COUNT" != "$LAST_CODE_COUNT" ]; then
            echo -e "${GREEN}[Claude Code]${NC} Session count changed: $LAST_CODE_COUNT → $CODE_COUNT"
            echo "$(date): Claude Code sessions: $CODE_COUNT" >> "$LOG_FILE"
            
            # Update state
            grep -v "code_count:" "$STATE_FILE" > "$STATE_FILE.tmp" 2>/dev/null || true
            echo "code_count:$CODE_COUNT" >> "$STATE_FILE.tmp"
            mv "$STATE_FILE.tmp" "$STATE_FILE"
            
            # Try to send to dashboard
            curl -s -X POST "http://$DASHBOARD_HOST:$DASHBOARD_PORT/api/activity" \
                -H "Content-Type: application/json" \
                -d "{
                    \"source\": \"claude-code\",
                    \"type\": \"session_change\",
                    \"count\": $CODE_COUNT,
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }" 2>/dev/null || echo "  (Dashboard offline)"
        fi
        
        # Monitor Claude Desktop - check if IndexedDB was modified
        DESKTOP_DIR="$HOME/Library/Application Support/Claude/IndexedDB"
        if [ -d "$DESKTOP_DIR" ]; then
            DESKTOP_MOD=$(stat -f "%m" "$DESKTOP_DIR" 2>/dev/null || echo "0")
            LAST_DESKTOP_MOD=$(grep "desktop_mod:" "$STATE_FILE" 2>/dev/null | cut -d: -f2 || echo "0")
            
            if [ "$DESKTOP_MOD" != "$LAST_DESKTOP_MOD" ]; then
                echo -e "${YELLOW}[Claude Desktop]${NC} Activity detected"
                echo "$(date): Claude Desktop activity" >> "$LOG_FILE"
                
                # Update state
                grep -v "desktop_mod:" "$STATE_FILE" > "$STATE_FILE.tmp" 2>/dev/null || true
                echo "desktop_mod:$DESKTOP_MOD" >> "$STATE_FILE.tmp"
                mv "$STATE_FILE.tmp" "$STATE_FILE"
                
                # Try to send to dashboard
                curl -s -X POST "http://$DASHBOARD_HOST:$DASHBOARD_PORT/api/activity" \
                    -H "Content-Type: application/json" \
                    -d "{
                        \"source\": \"claude-desktop\",
                        \"type\": \"activity\",
                        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                    }" 2>/dev/null || echo "  (Dashboard offline)"
            fi
        fi
        
        # Check processes every 10 iterations (50 seconds)
        ITER=$(grep "iteration:" "$STATE_FILE" 2>/dev/null | cut -d: -f2 || echo "0")
        ITER=$((ITER + 1))
        
        if [ $((ITER % 10)) -eq 0 ]; then
            if pgrep -x "Claude" > /dev/null 2>&1; then
                echo -e "${BLUE}[Process]${NC} Claude Desktop is running"
            fi
            
            if pgrep -f "claude" > /dev/null 2>&1; then
                echo -e "${BLUE}[Process]${NC} Claude CLI is active"
            fi
        fi
        
        # Update iteration counter
        grep -v "iteration:" "$STATE_FILE" > "$STATE_FILE.tmp" 2>/dev/null || true
        echo "iteration:$ITER" >> "$STATE_FILE.tmp"
        mv "$STATE_FILE.tmp" "$STATE_FILE"
        
        # Wait 5 seconds
        sleep 5
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Monitoring stopped${NC}"; exit 0' INT

# Run the monitor
monitor_loop
