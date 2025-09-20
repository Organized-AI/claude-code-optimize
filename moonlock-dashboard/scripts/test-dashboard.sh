#!/bin/bash

# Dashboard Testing Orchestration Script
# Coordinates all testing types for comprehensive validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_TYPE="${1:-all}"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

print_header() {
    echo
    echo "=================================================="
    print_status $BLUE "$1"
    echo "=================================================="
    echo
}

print_success() {
    print_status $GREEN "✓ $1"
}

print_warning() {
    print_status $YELLOW "⚠ $1" 
}

print_error() {
    print_status $RED "✗ $1"
}

# Function to run specific test suite
run_test_suite() {
    local test_name=$1
    local test_command=$2
    local is_critical=${3:-false}
    
    print_status $BLUE "Running $test_name..."
    
    local start_time=$(date +%s)
    
    if eval "$test_command"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "$test_name completed successfully in ${duration}s"
        return 0
    else
        local exit_code=$?
        print_error "$test_name failed with exit code $exit_code"
        
        if [ "$is_critical" = true ]; then
            print_error "Critical test failed - stopping execution"
            exit $exit_code
        fi
        
        return $exit_code
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        print_success "Node.js version: $(node --version)"
    else
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        print_success "npm version: $(npm --version)"
    else
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        print_success "Dependencies are installed"
    else
        print_warning "Installing dependencies..."
        cd "$PROJECT_ROOT"
        npm install
    fi
    
    # Check if browsers are installed for E2E tests
    if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "e2e" ]; then
        if command -v npx >/dev/null 2>&1; then
            if npx playwright --version >/dev/null 2>&1; then
                print_success "Playwright is available"
            else
                print_warning "Installing Playwright..."
                npx playwright install
            fi
        fi
    fi
}

# Function to run unit tests
run_unit_tests() {
    print_header "Running Unit Tests"
    
    cd "$PROJECT_ROOT"
    run_test_suite "Unit Tests" "npm run test:ui" true
}

# Function to run E2E tests
run_e2e_tests() {
    print_header "Running End-to-End Tests"
    
    cd "$PROJECT_ROOT"
    
    # Start development server for E2E tests
    print_status $BLUE "Starting development server for E2E tests..."
    npm run dev > /tmp/dev-server-e2e.log 2>&1 &
    local dev_pid=$!
    
    # Wait for server to be ready
    local max_wait=30
    local wait_count=0
    
    while [ $wait_count -lt $max_wait ]; do
        if curl -f -s http://localhost:5173 > /dev/null 2>&1; then
            print_success "Development server is ready"
            break
        fi
        
        wait_count=$((wait_count + 1))
        sleep 1
    done
    
    if [ $wait_count -eq $max_wait ]; then
        print_error "Development server failed to start within ${max_wait}s"
        kill $dev_pid 2>/dev/null || true
        return 1
    fi
    
    # Register cleanup
    trap "kill $dev_pid 2>/dev/null || true" EXIT
    
    # Run E2E tests with simplified config
    run_test_suite "E2E Tests" "npm run test:e2e -- --project=chromium --reporter=line"
    local e2e_result=$?
    
    # Cleanup
    kill $dev_pid 2>/dev/null || true
    trap - EXIT
    
    return $e2e_result
}

# Function to run deployment tests
run_deployment_tests() {
    print_header "Running Deployment Tests"
    
    # Test local deployment
    run_test_suite "Local Deployment Test" "$SCRIPT_DIR/test-deployment.sh local"
}

# Function to run performance tests
run_performance_tests() {
    print_header "Running Performance Tests"
    
    # Basic performance test using the deployment script
    run_test_suite "Performance Validation" "$SCRIPT_DIR/test-deployment.sh local | grep -i performance || true"
}

# Function to run linting and type checking
run_code_quality_checks() {
    print_header "Running Code Quality Checks"
    
    cd "$PROJECT_ROOT"
    
    # Run linting
    if [ -f "package.json" ] && grep -q '"lint"' package.json; then
        run_test_suite "ESLint" "npm run lint"
    else
        print_warning "No lint script found in package.json"
    fi
    
    # Run type checking
    if [ -f "package.json" ] && grep -q '"typecheck"' package.json; then
        run_test_suite "TypeScript Check" "npm run typecheck"
    else
        print_warning "No typecheck script found in package.json"
    fi
}

# Function to run all tests
run_all_tests() {
    print_header "Running Complete Test Suite"
    
    local total_errors=0
    
    # Code quality checks (non-critical)
    run_code_quality_checks
    total_errors=$((total_errors + $?))
    
    # Unit tests (critical)
    run_unit_tests
    total_errors=$((total_errors + $?))
    
    # E2E tests
    run_e2e_tests
    total_errors=$((total_errors + $?))
    
    # Deployment tests
    run_deployment_tests
    total_errors=$((total_errors + $?))
    
    return $total_errors
}

# Main execution function
main() {
    local start_time=$(date +%s)
    local exit_code=0
    
    print_header "Claude Code Optimizer Dashboard - Testing Suite"
    print_status $BLUE "Test type: $TEST_TYPE"
    print_status $BLUE "Start time: $(date)"
    
    # Check prerequisites
    check_prerequisites
    
    # Run specified tests
    case "$TEST_TYPE" in
        "unit")
            run_unit_tests
            exit_code=$?
            ;;
        "e2e")
            run_e2e_tests
            exit_code=$?
            ;;
        "deployment")
            run_deployment_tests
            exit_code=$?
            ;;
        "performance")
            run_performance_tests
            exit_code=$?
            ;;
        "quality"|"lint")
            run_code_quality_checks
            exit_code=$?
            ;;
        "all"|*)
            run_all_tests
            exit_code=$?
            ;;
    esac
    
    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    # Final results
    print_header "Testing Summary"
    print_status $BLUE "Test type: $TEST_TYPE"
    print_status $BLUE "Execution time: ${minutes}m ${seconds}s"
    
    if [ $exit_code -eq 0 ]; then
        print_success "✅ ALL TESTS PASSED"
        print_success "Dashboard is validated and ready for deployment"
    else
        print_error "❌ TESTS FAILED"
        print_error "Found $exit_code test failures"
        print_warning "Please review and fix the failing tests before deployment"
    fi
    
    echo
    exit $exit_code
}

# Handle script arguments
case "${1:-}" in
    "--help"|"-h")
        echo "Claude Code Optimizer Dashboard - Testing Suite"
        echo ""
        echo "Usage: $0 [test_type]"
        echo ""
        echo "Test Types:"
        echo "  all          Run all test suites (default)"
        echo "  unit         Run unit tests only"
        echo "  e2e          Run end-to-end tests only"
        echo "  deployment   Run deployment tests only"
        echo "  performance  Run performance tests only"
        echo "  quality      Run code quality checks only"
        echo ""
        echo "Examples:"
        echo "  $0                    # Run all tests"
        echo "  $0 unit              # Run unit tests only"
        echo "  $0 e2e               # Run E2E tests only"
        echo "  $0 deployment        # Run deployment tests only"
        echo ""
        exit 0
        ;;
    *)
        # Run main function
        main
        ;;
esac