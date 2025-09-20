#!/bin/bash

# Deployment Validation Script for Claude Code Optimizer Dashboard
# Validates both local and production deployments with comprehensive health checks

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
TEST_RESULTS_DIR="$PROJECT_ROOT/test-reports"
LOG_DIR="$PROJECT_ROOT/test-logs"

# Default values
ENVIRONMENT="${1:-local}"
BASE_URL="${2:-http://localhost:5173}"
TIMEOUT_SECONDS=30
HEALTH_CHECK_RETRIES=5
PERFORMANCE_BUDGET_MS=3000

# Create required directories
mkdir -p "$TEST_RESULTS_DIR" "$LOG_DIR"

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

# Function to check if a URL is reachable
check_url_health() {
    local url=$1
    local max_retries=$2
    local retry_delay=${3:-2}
    
    for i in $(seq 1 $max_retries); do
        if curl -f -s --max-time $TIMEOUT_SECONDS "$url" > /dev/null 2>&1; then
            return 0
        fi
        
        if [ $i -lt $max_retries ]; then
            print_status $YELLOW "Attempt $i/$max_retries failed, retrying in ${retry_delay}s..."
            sleep $retry_delay
        fi
    done
    
    return 1
}

# Function to measure page load performance
measure_page_performance() {
    local url=$1
    local output_file="$TEST_RESULTS_DIR/performance-$(date '+%Y%m%d-%H%M%S').json"
    
    print_status $BLUE "Measuring page performance for: $url"
    
    if command -v node >/dev/null 2>&1; then
        # Use Node.js to measure performance if available
        cat > /tmp/perf-test.js << 'EOF'
const { performance } = require('perf_hooks');
const https = require('https');
const http = require('http');

const url = process.argv[2];
const startTime = performance.now();

const client = url.startsWith('https:') ? https : http;

client.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        console.log(JSON.stringify({
            url: url,
            loadTime: Math.round(loadTime),
            statusCode: res.statusCode,
            contentLength: data.length,
            timestamp: new Date().toISOString()
        }, null, 2));
    });
}).on('error', (err) => {
    console.error(JSON.stringify({
        url: url,
        error: err.message,
        timestamp: new Date().toISOString()
    }, null, 2));
    process.exit(1);
});
EOF
        
        if node /tmp/perf-test.js "$url" > "$output_file" 2>&1; then
            local load_time=$(grep -o '"loadTime": [0-9]*' "$output_file" | grep -o '[0-9]*')
            if [ "$load_time" -lt "$PERFORMANCE_BUDGET_MS" ]; then
                print_success "Page loaded in ${load_time}ms (under ${PERFORMANCE_BUDGET_MS}ms budget)"
            else
                print_warning "Page loaded in ${load_time}ms (exceeds ${PERFORMANCE_BUDGET_MS}ms budget)"
            fi
        else
            print_error "Performance measurement failed"
            return 1
        fi
        
        rm -f /tmp/perf-test.js
    else
        print_warning "Node.js not available, skipping detailed performance measurement"
        # Fallback to simple curl timing
        local curl_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time $TIMEOUT_SECONDS "$url")
        local curl_time_ms=$(echo "$curl_time * 1000" | bc 2>/dev/null || echo "unknown")
        print_status $BLUE "Basic load time: ${curl_time_ms}ms"
    fi
}

# Function to validate dashboard content
validate_dashboard_content() {
    local url=$1
    local temp_file="/tmp/dashboard-content.html"
    
    print_status $BLUE "Validating dashboard content..."
    
    if curl -f -s --max-time $TIMEOUT_SECONDS "$url" > "$temp_file"; then
        local validation_errors=0
        
        # Check for essential dashboard elements
        local required_elements=(
            "MoonLock Dashboard"
            "Session Timer"
            "Token Usage"
            "Phase Progress"
            "Usage Trend"
            "Claude Code Session Active"
        )
        
        for element in "${required_elements[@]}"; do
            if grep -q "$element" "$temp_file"; then
                print_success "Found required element: $element"
            else
                print_error "Missing required element: $element"
                validation_errors=$((validation_errors + 1))
            fi
        done
        
        # Check for critical JavaScript and CSS
        if grep -q "script" "$temp_file"; then
            print_success "JavaScript files are referenced"
        else
            print_warning "No JavaScript references found"
            validation_errors=$((validation_errors + 1))
        fi
        
        if grep -q -E "(stylesheet|\.css)" "$temp_file"; then
            print_success "CSS files are referenced"
        else
            print_warning "No CSS references found"
            validation_errors=$((validation_errors + 1))
        fi
        
        # Check for React root element
        if grep -q 'id="root"' "$temp_file"; then
            print_success "React root element found"
        else
            print_error "React root element missing"
            validation_errors=$((validation_errors + 1))
        fi
        
        rm -f "$temp_file"
        return $validation_errors
    else
        print_error "Failed to fetch dashboard content"
        return 1
    fi
}

# Function to check API endpoints (if any)
check_api_endpoints() {
    local base_url=$1
    
    print_status $BLUE "Checking API endpoints..."
    
    # Common API endpoints to test
    local api_endpoints=(
        "/api/health"
        "/api/status"
        "/health"
        "/status"
    )
    
    local working_endpoints=0
    
    for endpoint in "${api_endpoints[@]}"; do
        local full_url="${base_url}${endpoint}"
        if curl -f -s --max-time 10 "$full_url" > /dev/null 2>&1; then
            print_success "API endpoint working: $endpoint"
            working_endpoints=$((working_endpoints + 1))
        else
            print_status $YELLOW "API endpoint not available: $endpoint"
        fi
    done
    
    if [ $working_endpoints -eq 0 ]; then
        print_warning "No API endpoints found (this may be expected for static deployments)"
    else
        print_success "Found $working_endpoints working API endpoints"
    fi
}

# Function to check security headers
check_security_headers() {
    local url=$1
    
    print_status $BLUE "Checking security headers..."
    
    local headers_file="/tmp/security-headers.txt"
    curl -I -s --max-time 10 "$url" > "$headers_file" 2>&1
    
    if [ $? -eq 0 ]; then
        local security_score=0
        local total_checks=0
        
        # Check for important security headers
        local security_headers=(
            "X-Content-Type-Options"
            "X-Frame-Options"
            "X-XSS-Protection"
            "Strict-Transport-Security"
            "Content-Security-Policy"
        )
        
        for header in "${security_headers[@]}"; do
            total_checks=$((total_checks + 1))
            if grep -i "$header" "$headers_file" > /dev/null; then
                print_success "Security header present: $header"
                security_score=$((security_score + 1))
            else
                print_warning "Security header missing: $header"
            fi
        done
        
        local security_percentage=$((security_score * 100 / total_checks))
        print_status $BLUE "Security score: $security_score/$total_checks ($security_percentage%)"
        
        rm -f "$headers_file"
        
        if [ $security_percentage -lt 60 ]; then
            print_warning "Security score is below 60% - consider adding more security headers"
            return 1
        else
            print_success "Security headers check passed"
            return 0
        fi
    else
        print_error "Failed to fetch headers"
        return 1
    fi
}

# Function to run local deployment tests
test_local_deployment() {
    print_header "Testing Local Deployment"
    
    local errors=0
    
    # Check if development server is running
    if ! check_url_health "$BASE_URL" 1 0; then
        print_status $YELLOW "Development server not running, attempting to start..."
        
        cd "$PROJECT_ROOT"
        
        # Start development server in background
        npm run dev > "$LOG_DIR/dev-server.log" 2>&1 &
        local dev_pid=$!
        
        print_status $BLUE "Started development server (PID: $dev_pid)"
        print_status $BLUE "Waiting for server to be ready..."
        
        # Wait for server to start
        if check_url_health "$BASE_URL" $HEALTH_CHECK_RETRIES 3; then
            print_success "Development server is now running"
        else
            print_error "Failed to start development server"
            kill $dev_pid 2>/dev/null || true
            return 1
        fi
        
        # Register cleanup
        trap "kill $dev_pid 2>/dev/null || true" EXIT
    else
        print_success "Development server is running"
    fi
    
    # Run validation tests
    validate_dashboard_content "$BASE_URL"
    errors=$((errors + $?))
    
    check_api_endpoints "$BASE_URL"
    
    measure_page_performance "$BASE_URL"
    
    check_security_headers "$BASE_URL"
    errors=$((errors + $?))
    
    return $errors
}

# Function to run production deployment tests
test_production_deployment() {
    print_header "Testing Production Deployment"
    
    local errors=0
    
    # Validate production URL
    if [[ ! "$BASE_URL" =~ ^https?:// ]]; then
        print_error "Invalid production URL: $BASE_URL"
        return 1
    fi
    
    print_status $BLUE "Testing production deployment at: $BASE_URL"
    
    # Check if production site is reachable
    if check_url_health "$BASE_URL" $HEALTH_CHECK_RETRIES 2; then
        print_success "Production site is reachable"
    else
        print_error "Production site is not reachable"
        return 1
    fi
    
    # Run validation tests
    validate_dashboard_content "$BASE_URL"
    errors=$((errors + $?))
    
    check_api_endpoints "$BASE_URL"
    
    measure_page_performance "$BASE_URL"
    
    check_security_headers "$BASE_URL"
    errors=$((errors + $?))
    
    # Additional production-specific checks
    print_status $BLUE "Running production-specific checks..."
    
    # Check HTTPS redirect (if HTTP URL provided)
    if [[ "$BASE_URL" =~ ^http:// ]]; then
        local https_url="${BASE_URL/http:/https:}"
        if check_url_health "$https_url" 1 0; then
            print_success "HTTPS version is available"
        else
            print_warning "HTTPS version not available"
        fi
    fi
    
    # Check for CDN headers
    local headers_file="/tmp/cdn-headers.txt"
    if curl -I -s --max-time 10 "$BASE_URL" > "$headers_file" 2>&1; then
        if grep -i -E "(cloudflare|cloudfront|fastly|cdn)" "$headers_file" > /dev/null; then
            print_success "CDN detected in headers"
        else
            print_status $BLUE "No CDN headers detected"
        fi
        
        # Check caching headers
        if grep -i -E "(cache-control|expires|etag)" "$headers_file" > /dev/null; then
            print_success "Caching headers present"
        else
            print_warning "No caching headers found"
        fi
        
        rm -f "$headers_file"
    fi
    
    return $errors
}

# Function to generate deployment report
generate_deployment_report() {
    local environment=$1
    local exit_code=$2
    local report_file="$TEST_RESULTS_DIR/deployment-report-$environment-$(date '+%Y%m%d-%H%M%S').json"
    
    print_status $BLUE "Generating deployment report..."
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "environment": "$environment",
    "url": "$BASE_URL",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": $([ $exit_code -eq 0 ] && echo '"PASSED"' || echo '"FAILED"'),
    "exitCode": $exit_code
  },
  "system": {
    "platform": "$(uname -s)",
    "arch": "$(uname -m)",
    "nodeVersion": "$(node --version 2>/dev/null || echo 'not available')",
    "npmVersion": "$(npm --version 2>/dev/null || echo 'not available')"
  },
  "configuration": {
    "timeout": $TIMEOUT_SECONDS,
    "retries": $HEALTH_CHECK_RETRIES,
    "performanceBudget": $PERFORMANCE_BUDGET_MS
  },
  "summary": {
    "totalErrors": $exit_code,
    "testDuration": "$(date '+%Y-%m-%d %H:%M:%S')",
    "reportGenerated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
    
    print_success "Deployment report saved: $report_file"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    local exit_code=0
    
    print_header "Claude Code Optimizer Dashboard - Deployment Validation"
    print_status $BLUE "Environment: $ENVIRONMENT"
    print_status $BLUE "Target URL: $BASE_URL"
    print_status $BLUE "Start time: $(date)"
    
    case "$ENVIRONMENT" in
        "local")
            test_local_deployment
            exit_code=$?
            ;;
        "production"|"prod")
            test_production_deployment
            exit_code=$?
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_status $BLUE "Valid environments: local, production"
            exit 1
            ;;
    esac
    
    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    # Generate report
    generate_deployment_report "$ENVIRONMENT" $exit_code
    
    # Final results
    print_header "Deployment Validation Summary"
    print_status $BLUE "Environment: $ENVIRONMENT"
    print_status $BLUE "Target URL: $BASE_URL"
    print_status $BLUE "Execution time: ${minutes}m ${seconds}s"
    print_status $BLUE "Report directory: $TEST_RESULTS_DIR"
    
    if [ $exit_code -eq 0 ]; then
        print_success "✅ DEPLOYMENT VALIDATION PASSED"
        print_success "Dashboard is ready and functional"
    else
        print_error "❌ DEPLOYMENT VALIDATION FAILED"
        print_error "Found $exit_code validation errors"
        print_warning "Check logs in $LOG_DIR for detailed error information"
    fi
    
    echo
    exit $exit_code
}

# Handle script arguments
case "${1:-}" in
    "--help"|"-h")
        echo "Claude Code Optimizer Dashboard - Deployment Validation"
        echo ""
        echo "Usage: $0 [environment] [base_url]"
        echo ""
        echo "Environments:"
        echo "  local        Test local development deployment (default)"
        echo "  production   Test production deployment"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Test local deployment"
        echo "  $0 local                             # Test local deployment"
        echo "  $0 production https://your-site.com  # Test production deployment"
        echo ""
        echo "Environment Variables:"
        echo "  TIMEOUT_SECONDS      Request timeout (default: 30)"
        echo "  HEALTH_CHECK_RETRIES Health check attempts (default: 5)"
        echo "  PERFORMANCE_BUDGET_MS Performance budget in ms (default: 3000)"
        echo ""
        exit 0
        ;;
    *)
        # Run main function with provided arguments
        main
        ;;
esac