#!/bin/bash

# Moonlock Dashboard Startup Script
# Handles environment setup, dependency checks, and graceful startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_MIN_VERSION="18.0.0"
PROJECT_NAME="Moonlock Dashboard"
DATA_DIR="./data"
LOG_DIR="./logs"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Version comparison function
version_compare() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Check Node.js version
check_node_version() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js ${NODE_MIN_VERSION} or higher."
        exit 1
    fi

    local node_version=$(node -v | sed 's/v//')
    if ! version_compare "$node_version" "$NODE_MIN_VERSION"; then
        log_error "Node.js version ${node_version} is too old. Please upgrade to ${NODE_MIN_VERSION} or higher."
        exit 1
    fi

    log_success "Node.js version: ${node_version}"
}

# Check npm/yarn
check_package_manager() {
    if command -v npm &> /dev/null; then
        PACKAGE_MANAGER="npm"
        log_success "Using npm as package manager"
    elif command -v yarn &> /dev/null; then
        PACKAGE_MANAGER="yarn"
        log_success "Using yarn as package manager"
    else
        log_error "Neither npm nor yarn is available. Please install one of them."
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p "$DATA_DIR"
    mkdir -p "$LOG_DIR"
    
    log_success "Directories created successfully"
}

# Check if dependencies are installed
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        log_warning "Dependencies not found. Installing..."
        $PACKAGE_MANAGER install
        log_success "Dependencies installed successfully"
    else
        log_success "Dependencies already installed"
    fi
}

# Build application if needed
build_application() {
    if [ ! -d "dist" ] || [ "$1" == "--rebuild" ]; then
        log_info "Building application..."
        $PACKAGE_MANAGER run build
        log_success "Application built successfully"
    else
        log_success "Application already built"
    fi
}

# Check database
check_database() {
    local db_path="${DATA_DIR}/moonlock.db"
    
    if [ -f "$db_path" ]; then
        log_success "Database found at $db_path"
        
        # Check if database is accessible
        if command -v sqlite3 &> /dev/null; then
            if sqlite3 "$db_path" "PRAGMA integrity_check;" | grep -q "ok"; then
                log_success "Database integrity check passed"
            else
                log_warning "Database integrity check failed"
            fi
        fi
    else
        log_info "Database will be created on first run"
    fi
}

# Start application
start_application() {
    local mode=${1:-"production"}
    
    log_info "Starting $PROJECT_NAME in $mode mode..."
    
    # Set environment
    export NODE_ENV=$mode
    
    if [ "$mode" == "development" ]; then
        log_info "Starting development servers..."
        $PACKAGE_MANAGER run dev
    else
        log_info "Starting production server..."
        node dist/server/index.js
    fi
}

# Health check
health_check() {
    local max_attempts=30
    local attempt=0
    local port=${PORT:-3001}
    
    log_info "Performing health check..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "http://localhost:$port/api/health" > /dev/null 2>&1; then
            log_success "Health check passed - server is running"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 1
    done
    
    log_error "Health check failed - server may not be running properly"
    return 1
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    # Kill any background processes if needed
    # This will be called on script exit
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🌙 $PROJECT_NAME Startup Script"
    echo "================================="
    echo -e "${NC}"
    
    # Parse arguments
    local mode="production"
    local rebuild=false
    local health_check_enabled=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dev|--development)
                mode="development"
                shift
                ;;
            --prod|--production)
                mode="production"
                shift
                ;;
            --rebuild)
                rebuild=true
                shift
                ;;
            --no-health-check)
                health_check_enabled=false
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --dev, --development    Start in development mode"
                echo "  --prod, --production    Start in production mode (default)"
                echo "  --rebuild              Force rebuild of application"
                echo "  --no-health-check      Skip health check after startup"
                echo "  --help                 Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Pre-flight checks
    log_info "Running pre-flight checks..."
    check_node_version
    check_package_manager
    create_directories
    check_dependencies
    
    if [ "$mode" == "production" ]; then
        if [ "$rebuild" == true ]; then
            build_application --rebuild
        else
            build_application
        fi
        check_database
    fi
    
    log_success "Pre-flight checks completed"
    echo ""
    
    # Start application
    if [ "$mode" == "development" ]; then
        log_info "🚀 Starting in development mode with hot reload..."
        log_info "Frontend: http://localhost:5173"
        log_info "API: http://localhost:3001"
        log_info "WebSocket: ws://localhost:3001/ws"
        echo ""
        start_application "development"
    else
        log_info "🚀 Starting in production mode..."
        log_info "Dashboard: http://localhost:3001"
        log_info "API: http://localhost:3001/api"
        log_info "WebSocket: ws://localhost:3001/ws"
        echo ""
        
        # Start in background for health check
        start_application "production" &
        local server_pid=$!
        
        if [ "$health_check_enabled" == true ]; then
            sleep 2
            if health_check; then
                log_success "🎉 $PROJECT_NAME started successfully!"
            else
                log_error "❌ $PROJECT_NAME failed to start properly"
                kill $server_pid 2>/dev/null || true
                exit 1
            fi
        fi
        
        # Wait for server process
        wait $server_pid
    fi
}

# Run main function with all arguments
main "$@"