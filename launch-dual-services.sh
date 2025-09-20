#!/bin/bash

# Dual Service Launcher - Port 3001 (Backend) + Port 5173 (Frontend)
# Launch both the dashboard server and moonlock dashboard

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"
DASHBOARD_SERVER_DIR="$PROJECT_ROOT/dashboard-server"
FRONTEND_DIR="$PROJECT_ROOT/moonlock-dashboard"

# PID file for cleanup
PID_FILE="$PROJECT_ROOT/.pids/services.pid"

# Create PID directory
mkdir -p "$PROJECT_ROOT/.pids"

# Clear screen and show header
clear
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${PURPLE}                Claude Code Optimizer Services                   ${NC}"
echo -e "${PURPLE}               Launching Backend + Frontend                      ${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to display messages
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')] INFO:${NC} $1"
}

# Cleanup function
cleanup() {
    echo ""
    log "🛑 Shutting down services..."
    
    if [ -f "$PID_FILE" ]; then
        while IFS= read -r pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                log "Stopping process $pid"
                kill "$pid" 2>/dev/null || true
                
                # Wait for graceful shutdown
                sleep 2
                
                # Force kill if still running
                if kill -0 "$pid" 2>/dev/null; then
                    warning "Force killing process $pid"
                    kill -9 "$pid" 2>/dev/null || true
                fi
            fi
        done < "$PID_FILE"
        
        rm -f "$PID_FILE"
    fi
    
    log "✅ Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to start
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    info "Waiting for $service_name to start on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if check_port $port; then
            log "✅ $service_name is running on port $port"
            return 0
        fi
        
        sleep 1
        ((attempt++))
    done
    
    error "❌ $service_name failed to start on port $port"
    return 1
}

# Function to start dashboard server (port 3001)
start_dashboard_server() {
    log "🚀 Starting Dashboard Server (Express - Port 3001)..."
    
    # Check if already running
    if check_port 3001; then
        warning "Port 3001 already in use. Stopping existing service..."
        pkill -f "node.*server.js" 2>/dev/null || true
        sleep 2
    fi
    
    # Navigate to dashboard server directory
    cd "$DASHBOARD_SERVER_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        info "Installing dependencies for dashboard server..."
        npm install
    fi
    
    # Start the server in background
    log "Starting Express server..."
    npm start > "$PROJECT_ROOT/logs/dashboard-server.log" 2>&1 &
    local server_pid=$!
    
    # Save PID
    echo $server_pid >> "$PID_FILE"
    
    # Wait for server to start
    if wait_for_service 3001 "Dashboard Server"; then
        log "📊 Dashboard Server API available at: ${CYAN}http://localhost:3001${NC}"
        return 0
    else
        error "Failed to start Dashboard Server"
        return 1
    fi
}

# Function to start frontend (port 5173)
start_frontend() {
    log "🌐 Starting Frontend Dashboard (Vite - Port 5173)..."
    
    # Check if already running
    if check_port 5173; then
        warning "Port 5173 already in use. Stopping existing service..."
        pkill -f "vite" 2>/dev/null || true
        sleep 2
    fi
    
    # Navigate to frontend directory
    cd "$FRONTEND_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        info "Installing dependencies for frontend..."
        npm install
    fi
    
    # Start the development server in background
    log "Starting Vite development server..."
    npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
    local frontend_pid=$!
    
    # Save PID
    echo $frontend_pid >> "$PID_FILE"
    
    # Wait for frontend to start
    if wait_for_service 5173 "Frontend Dashboard"; then
        log "🎨 Frontend Dashboard available at: ${CYAN}http://localhost:5173${NC}"
        return 0
    else
        error "Failed to start Frontend Dashboard"
        return 1
    fi
}

# Function to show service status
show_status() {
    echo ""
    echo -e "${CYAN}🔄 Service Status:${NC}"
    echo ""
    
    # Check Dashboard Server
    if check_port 3001; then
        echo -e "  ${GREEN}✅ Dashboard Server (Backend)${NC}  - Port 3001 - ${CYAN}http://localhost:3001${NC}"
    else
        echo -e "  ${RED}❌ Dashboard Server (Backend)${NC}  - Port 3001 - Not running"
    fi
    
    # Check Frontend
    if check_port 5173; then
        echo -e "  ${GREEN}✅ Frontend Dashboard${NC}         - Port 5173 - ${CYAN}http://localhost:5173${NC}"
    else
        echo -e "  ${RED}❌ Frontend Dashboard${NC}         - Port 5173 - Not running"
    fi
    
    echo ""
}

# Function to show URLs
show_urls() {
    echo ""
    echo -e "${PURPLE}🌐 Available Services:${NC}"
    echo ""
    echo -e "  📊 ${YELLOW}Backend API:${NC}      ${CYAN}http://localhost:3001${NC}"
    echo -e "  📊 ${YELLOW}API Status:${NC}       ${CYAN}http://localhost:3001/api/status${NC}"
    echo -e "  📊 ${YELLOW}Sessions API:${NC}     ${CYAN}http://localhost:3001/api/sessions${NC}"
    echo ""
    echo -e "  🎨 ${YELLOW}Frontend Dashboard:${NC} ${CYAN}http://localhost:5173${NC}"
    echo -e "  🎨 ${YELLOW}Real-time Monitor:${NC} ${CYAN}http://localhost:5173/monitor${NC}"
    echo ""
    echo -e "${GREEN}💡 TIP: Open both URLs in your browser for full monitoring experience!${NC}"
    echo ""
}

# Main execution
main() {
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Clear old PID file
    rm -f "$PID_FILE"
    
    log "🎯 Starting Claude Code Optimizer Services..."
    echo ""
    
    # Start services
    if start_dashboard_server; then
        log "✅ Backend service started successfully"
    else
        error "❌ Failed to start backend service"
        exit 1
    fi
    
    echo ""
    
    if start_frontend; then
        log "✅ Frontend service started successfully"
    else
        error "❌ Failed to start frontend service"
        exit 1
    fi
    
    # Show status and URLs
    show_status
    show_urls
    
    log "🎉 All services are now running!"
    log "📝 Logs are available in: $PROJECT_ROOT/logs/"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    
    # Keep script running and show periodic status
    local status_counter=0
    while true; do
        sleep 10
        
        # Show status every 60 seconds (6 * 10 seconds)
        if [ $((status_counter % 6)) -eq 0 ]; then
            # Check if services are still running
            local backend_running=false
            local frontend_running=false
            
            if check_port 3001; then
                backend_running=true
            fi
            
            if check_port 5173; then
                frontend_running=true
            fi
            
            if [ "$backend_running" = true ] && [ "$frontend_running" = true ]; then
                log "🟢 All services healthy"
            else
                warning "⚠️  Service status check - Backend: $backend_running, Frontend: $frontend_running"
            fi
        fi
        
        ((status_counter++))
    done
}

# Run main function
main "$@"
