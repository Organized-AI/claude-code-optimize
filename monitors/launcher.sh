#!/bin/bash

# Interactive Session Launcher with Recovery
# Location: ./monitors/launcher.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
CLAUDE_PROJECTS_DIR="$HOME/.claude/projects"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Clear screen and show header
clear
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}                   Claude Code Optimizer                        ${NC}"
echo -e "${PURPLE}                  Session Monitor Launcher                      ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to display a formatted message
display_message() {
    local type="$1"
    local message="$2"
    
    case "$type" in
        "info")
            echo -e "${BLUE}ℹ️  INFO:${NC} $message"
            ;;
        "success")
            echo -e "${GREEN}✅ SUCCESS:${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  WARNING:${NC} $message"
            ;;
        "error")
            echo -e "${RED}❌ ERROR:${NC} $message"
            ;;
        "question")
            echo -e "${CYAN}❓ QUESTION:${NC} $message"
            ;;
    esac
}

# Function to check system requirements
check_requirements() {
    display_message "info" "Checking system requirements..."
    
    local requirements_met=true
    
    # Check for Claude projects directory
    if [ ! -d "$CLAUDE_PROJECTS_DIR" ]; then
        display_message "warning" "Claude projects directory not found: $CLAUDE_PROJECTS_DIR"
        display_message "info" "This usually means Claude Code hasn't been used yet"
        requirements_met=false
    else
        display_message "success" "Claude projects directory found"
    fi
    
    # Check for fswatch (optional but recommended)
    if command -v fswatch >/dev/null 2>&1; then
        display_message "success" "fswatch found (real-time monitoring available)"
    else
        display_message "warning" "fswatch not found (will use polling method)"
        display_message "info" "Install fswatch for better performance: brew install fswatch"
    fi
    
    # Check for curl
    if command -v curl >/dev/null 2>&1; then
        display_message "success" "curl found (dashboard integration available)"
    else
        display_message "warning" "curl not found (dashboard integration disabled)"
    fi
    
    # Check for jq
    if command -v jq >/dev/null 2>&1; then
        display_message "success" "jq found (JSON parsing available)"
    else
        display_message "warning" "jq not found (limited session recovery)"
        display_message "info" "Install jq for full functionality: brew install jq"
    fi
    
    echo ""
    return 0
}

# Function to scan for existing sessions
scan_existing_sessions() {
    display_message "info" "Scanning for existing Claude sessions..."
    
    if [ ! -d "$CLAUDE_PROJECTS_DIR" ]; then
        display_message "info" "No sessions found (projects directory doesn't exist)"
        return 1
    fi
    
    local session_files=($(find "$CLAUDE_PROJECTS_DIR" -name "*.jsonl" -type f 2>/dev/null))
    
    if [ ${#session_files[@]} -eq 0 ]; then
        display_message "info" "No existing sessions found"
        return 1
    fi
    
    echo ""
    display_message "success" "Found ${#session_files[@]} existing session(s):"
    echo ""
    
    local latest_file=""
    local latest_time=0
    
    for file in "${session_files[@]}"; do
        local session_id=$(basename "$file" .jsonl)
        local short_id="${session_id:0:8}..."
        local file_size=$(wc -l < "$file" 2>/dev/null || echo "0")
        local mod_time=$(stat -f "%m" "$file" 2>/dev/null || stat -c "%Y" "$file" 2>/dev/null || echo "0")
        local mod_date=$(date -r "$mod_time" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "unknown")
        
        echo -e "  ${CYAN}$short_id${NC} - $file_size lines - Modified: $mod_date"
        
        if [ "$mod_time" -gt "$latest_time" ]; then
            latest_time="$mod_time"
            latest_file="$file"
        fi
    done
    
    echo ""
    
    if [ -n "$latest_file" ]; then
        local latest_session_id=$(basename "$latest_file" .jsonl)
        local latest_short_id="${latest_session_id:0:8}..."
        display_message "info" "Most recent session: $latest_short_id"
        
        # Check if the session is likely still active (modified within last hour)
        local current_time=$(date +%s)
        local time_diff=$((current_time - latest_time))
        
        if [ "$time_diff" -lt 3600 ]; then
            display_message "success" "Session appears to be currently active (modified $(($time_diff / 60)) minutes ago)"
            echo ""
            echo -e "${GREEN}🎯 ACTIVE SESSION DETECTED!${NC}"
            echo -e "   Session ID: $latest_short_id"
            echo -e "   File: $latest_file"
            echo -e "   Last activity: $(date -r "$latest_time" '+%H:%M:%S')"
            echo ""
            return 0
        else
            display_message "info" "Session was last active $(($time_diff / 3600)) hours ago"
        fi
    fi
    
    echo ""
    return 1
}

# Function to show monitoring options
show_monitoring_options() {
    echo -e "${YELLOW}📋 Monitoring Options:${NC}"
    echo ""
    echo "  1. 🔄 Full Monitor (with session recovery)"
    echo "  2. 🎯 Simple Monitor (current activity only)"  
    echo "  3. 🌐 Dashboard + Monitor (port 5173)"
    echo "  4. 🛠️  Setup Mode (configure environment)"
    echo "  5. ❓ Help & Information"
    echo "  6. 🚪 Exit"
    echo ""
}

# Function to get user choice
get_user_choice() {
    local choice
    while true; do
        echo -ne "${CYAN}Select an option (1-6): ${NC}"
        read -r choice
        
        case "$choice" in
            1|2|3|4|5|6)
                echo "$choice"
                return 0
                ;;
            *)
                display_message "error" "Invalid choice. Please select 1-6."
                ;;
        esac
    done
}

# Function to start full monitor
start_full_monitor() {
    display_message "info" "Starting full monitor with session recovery..."
    echo ""
    
    if [ -f "$SCRIPT_DIR/unified-claude-monitor.sh" ]; then
        display_message "success" "Launching unified monitor..."
        echo ""
        exec "$SCRIPT_DIR/unified-claude-monitor.sh"
    else
        display_message "error" "Monitor script not found: $SCRIPT_DIR/unified-claude-monitor.sh"
        exit 1
    fi
}

# Function to start simple monitor
start_simple_monitor() {
    display_message "info" "Starting simple monitor (no recovery)..."
    echo ""
    
    if [ -f "$SCRIPT_DIR/simple-monitor.sh" ]; then
        display_message "success" "Launching simple monitor..."
        echo ""
        exec "$SCRIPT_DIR/simple-monitor.sh"
    else
        display_message "error" "Simple monitor script not found: $SCRIPT_DIR/simple-monitor.sh"
        exit 1
    fi
}

# Function to start dashboard + monitor
start_dashboard_monitor() {
    display_message "info" "Starting dashboard + monitor combo..."
    echo ""
    
    # Check if Node.js is available
    if ! command -v npm >/dev/null 2>&1; then
        display_message "error" "Node.js/npm not found. Please install Node.js to use the dashboard."
        return 1
    fi
    
    # Check if dashboard exists
    local dashboard_dir="$PROJECT_ROOT/moonlock-dashboard"
    if [ ! -d "$dashboard_dir" ]; then
        display_message "error" "Dashboard directory not found: $dashboard_dir"
        return 1
    fi
    
    display_message "info" "Dashboard should already be running on port 5173..."
    display_message "info" "Backend should already be running on port 3001..."
    
    # Check if services are running
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        display_message "success" "Frontend running on port 5173"
    else
        display_message "warning" "Frontend not running. Starting services..."
        cd "$PROJECT_ROOT"
        ./start-services.sh
        sleep 3
    fi
    
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        display_message "success" "Backend running on port 3001"
    else
        display_message "warning" "Backend not running. Please check logs."
    fi
    
    echo ""
    display_message "success" "Dashboard URLs:"
    echo -e "   Frontend: ${CYAN}http://localhost:5173${NC}"
    echo -e "   Backend:  ${CYAN}http://localhost:3001${NC}"
    echo ""
    
    # Start monitor
    display_message "info" "Starting monitor..."
    start_full_monitor
}

# Function to setup environment
setup_environment() {
    display_message "info" "Setting up environment..."
    echo ""
    
    # Create necessary directories
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/config"
    mkdir -p "$PROJECT_ROOT/.pids"
    
    # Create basic config file if it doesn't exist
    local config_file="$PROJECT_ROOT/config/monitor.env"
    if [ ! -f "$config_file" ]; then
        cat > "$config_file" << EOF
# Claude Code Optimizer Configuration
CLAUDE_PROJECTS_DIR="$HOME/.claude/projects"
DASHBOARD_API="http://localhost:3001/api"
LOG_LEVEL="info"
RECOVERY_ENABLED=true
MONITOR_INTERVAL=5
EOF
        display_message "success" "Created configuration file: $config_file"
    fi
    
    # Check and create .env file for dashboard
    local env_file="$PROJECT_ROOT/.env"
    if [ ! -f "$env_file" ]; then
        cat > "$env_file" << EOF
# Dashboard Environment Variables
PORT=5173
API_PORT=3001
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_URL=https://rdsfgdtsbyioqilatvxu.supabase.co
EOF
        display_message "success" "Created environment file: $env_file"
        display_message "warning" "Please update SUPABASE_KEY in $env_file"
    fi
    
    # Make sure all scripts are executable
    chmod +x "$PROJECT_ROOT"/*.sh 2>/dev/null || true
    chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true
    
    display_message "success" "Environment setup complete!"
    echo ""
    
    echo -ne "${CYAN}Press Enter to return to main menu...${NC}"
    read -r
}

# Function to show help
show_help() {
    clear
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}                   Claude Code Optimizer Help                   ${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    echo -e "${YELLOW}🎯 WHAT THIS TOOL DOES:${NC}"
    echo "  • Monitors Claude Code usage in real-time"
    echo "  • Recovers session data from the beginning"
    echo "  • Provides dashboard visualization"
    echo "  • Tracks token usage and session efficiency"
    echo ""
    
    echo -e "${YELLOW}🔄 SESSION RECOVERY:${NC}"
    echo "  • Automatically detects existing Claude sessions"
    echo "  • Reconstructs session data from JSONL files"
    echo "  • Shows complete session timeline from start"
    echo "  • Preserves context across monitoring restarts"
    echo ""
    
    echo -e "${YELLOW}📊 MONITORING MODES:${NC}"
    echo "  • Full Monitor: Complete session recovery + real-time monitoring"
    echo "  • Simple Monitor: Basic real-time monitoring only"
    echo "  • Dashboard: Web-based visual interface + monitoring"
    echo ""
    
    echo -e "${YELLOW}🛠️  REQUIREMENTS:${NC}"
    echo "  • Claude Code CLI installed and used"
    echo "  • fswatch (optional, for better performance)"
    echo "  • jq (optional, for advanced session parsing)"
    echo "  • Node.js (optional, for dashboard)"
    echo ""
    
    echo -e "${YELLOW}📁 FILE LOCATIONS:${NC}"
    echo "  • Session data: $CLAUDE_PROJECTS_DIR"
    echo "  • Monitor logs: $PROJECT_ROOT/logs/"
    echo "  • Configuration: $PROJECT_ROOT/config/"
    echo ""
    
    echo -ne "${CYAN}Press Enter to return to main menu...${NC}"
    read -r
}

# Main execution flow
main() {
    # Check requirements
    check_requirements
    
    # Scan for existing sessions
    local has_active_session=false
    if scan_existing_sessions; then
        has_active_session=true
    fi
    
    # Main menu loop
    while true; do
        if [ "$has_active_session" = true ]; then
            echo -e "${GREEN}💡 TIP: An active session was detected. Use option 1 for full recovery!${NC}"
            echo ""
        fi
        
        show_monitoring_options
        
        local choice=$(get_user_choice)
        echo ""
        
        case "$choice" in
            1)
                start_full_monitor
                ;;
            2)
                start_simple_monitor
                ;;
            3)
                start_dashboard_monitor
                ;;
            4)
                setup_environment
                ;;
            5)
                show_help
                clear
                echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
                echo -e "${PURPLE}                   Claude Code Optimizer                        ${NC}"
                echo -e "${PURPLE}                  Session Monitor Launcher                      ${NC}"
                echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
                echo ""
                ;;
            6)
                display_message "info" "Goodbye!"
                exit 0
                ;;
        esac
    done
}

# Run main function
main "$@"
