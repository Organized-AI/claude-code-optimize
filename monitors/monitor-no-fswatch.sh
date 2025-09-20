#!/bin/bash
# Alternative Claude Monitor - No fswatch required
# Uses polling instead of file system events

# Configuration
DASHBOARD_HOST="localhost"
DASHBOARD_PORT="3001"
LOG_FILE="$HOME/.claude/monitor/unified.log"
POLL_INTERVAL=5  # Check every 5 seconds

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Alternative Claude Monitor (No fswatch)${NC}"
echo "================================================"
echo "Monitoring:"
echo "  • Claude Code (CLI) - Full message content"
echo "  • Claude Desktop    - Activity detection"
echo "  • Poll Interval    - Every ${POLL_INTERVAL} seconds"
echo "================================================"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Track known files
declare -A KNOWN_FILES
declare -A FILE_SIZES
declare -A FILE_POSITIONS

# Function to send data to dashboard
send_to_dashboard() {
    local source=$1
    local event_type=$2
    local data=$3
    
    # Try curl first, if dashboard is down, just log
    if curl -s -f -X POST "http://$DASHBOARD_HOST:$DASHBOARD_PORT/api/activity" \
        -H "Content-Type: application/json" \
        -d "{
            \"source\": \"$source\",
            \"type\": \"$event_type\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
            \"data\": $data
        }" >> "$LOG_FILE" 2>&1; then
        echo "  → Sent to dashboard"
    else
        echo "  → Logged locally (dashboard offline)"
        echo "$(date): $source - $event_type - $data" >> "$LOG_FILE"
    fi
}

# Monitor Claude Code JSONL files
check_claude_code() {
    local claude_dir="$HOME/.claude/projects"
    
    # Find all JSONL files
    while IFS= read -r -d '' file; do
        local file_key="${file}"
        local current_size=$(stat -f%z "$file" 2>/dev/null || echo "0")
        
        # Check if this is a new file
        if [[ ! "${KNOWN_FILES[$file_key]}" ]]; then
            KNOWN_FILES[$file_key]=1
            FILE_SIZES[$file_key]=$current_size
            FILE_POSITIONS[$file_key]=0
            
            local session_id=$(basename "$file" .jsonl)
            echo -e "${GREEN}[Claude Code]${NC} New session detected: $session_id"
            
            send_to_dashboard "claude-code" "new_session" "{
                \"session_id\": \"$session_id\",
                \"file\": \"$file\"
            }"
        fi
        
        # Check if file has grown
        if [[ "$current_size" -gt "${FILE_SIZES[$file_key]}" ]]; then
            FILE_SIZES[$file_key]=$current_size
            
            # Read new content from last position
            local last_pos=${FILE_POSITIONS[$file_key]}
            
            # Read new lines
            while IFS= read -r line; do
                if [[ ! -z "$line" ]]; then
                    echo -e "${GREEN}[Claude Code]${NC} New message"
                    send_to_dashboard "claude-code" "message" "$line"
                fi
            done < <(tail -c +$((last_pos + 1)) "$file" 2>/dev/null)
            
            # Update position
            FILE_POSITIONS[$file_key]=$current_size
        fi
    done < <(find "$claude_dir" -name "*.jsonl" -print0 2>/dev/null)
}

# Monitor Claude Desktop activity
check_claude_desktop() {
    local desktop_dir="$HOME/Library/Application Support/Claude"
    
    # Check IndexedDB changes
    for db_dir in "$desktop_dir/IndexedDB" "$desktop_dir/Local Storage" "$desktop_dir/Session Storage"; do
        if [[ -d "$db_dir" ]]; then
            while IFS= read -r -d '' file; do
                local file_key="${file}"
                local current_size=$(stat -f%z "$file" 2>/dev/null || echo "0")
                
                # Check if size changed
                if [[ "${FILE_SIZES[$file_key]}" ]] && [[ "$current_size" != "${FILE_SIZES[$file_key]}" ]]; then
                    local filename=$(basename "$file")
                    echo -e "${YELLOW}[Claude Desktop]${NC} Activity: $filename (${current_size} bytes)"
                    
                    send_to_dashboard "claude-desktop" "activity" "{
                        \"file\": \"$filename\",
                        \"size\": $current_size,
                        \"change\": $((current_size - ${FILE_SIZES[$file_key]}))
                    }"
                fi
                
                FILE_SIZES[$file_key]=$current_size
            done < <(find "$db_dir" \( -name "*.ldb" -o -name "*.log" \) -print0 2>/dev/null)
        fi
    done
}

# Check running processes
check_processes() {
    # Check Claude Desktop
    if pgrep -x "Claude" > /dev/null 2>&1; then
        if [[ ! "${KNOWN_FILES[claude_desktop_running]}" ]]; then
            KNOWN_FILES[claude_desktop_running]=1
            echo -e "${BLUE}[Process]${NC} Claude Desktop started"
            send_to_dashboard "system" "process_start" "{
                \"app\": \"Claude Desktop\",
                \"pid\": $(pgrep -x "Claude")
            }"
        fi
    else
        unset KNOWN_FILES[claude_desktop_running]
    fi
    
    # Check Claude CLI
    if pgrep -f "claude" > /dev/null 2>&1; then
        if [[ ! "${KNOWN_FILES[claude_cli_running]}" ]]; then
            KNOWN_FILES[claude_cli_running]=1
            echo -e "${BLUE}[Process]${NC} Claude CLI started"
            send_to_dashboard "system" "process_start" "{
                \"app\": \"Claude CLI\",
                \"pid\": $(pgrep -f "claude" | head -1)
            }"
        fi
    else
        unset KNOWN_FILES[claude_cli_running]
    fi
}

# Initial scan
echo -e "${BLUE}Performing initial scan...${NC}"
check_claude_code
check_claude_desktop
check_processes
echo -e "${GREEN}Initial scan complete!${NC}"
echo "================================================"
echo "Monitoring active. Press Ctrl+C to stop."
echo ""

# Main monitoring loop
while true; do
    check_claude_code
    check_claude_desktop
    check_processes
    sleep $POLL_INTERVAL
done
