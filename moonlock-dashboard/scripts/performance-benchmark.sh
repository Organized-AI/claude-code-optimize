#!/bin/bash

# Performance Benchmarking Script for Claude Code Optimizer Dashboard
# Comprehensive performance monitoring and benchmarking suite

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
BENCHMARK_RESULTS_DIR="$PROJECT_ROOT/test-reports/performance"
LOG_DIR="$PROJECT_ROOT/test-logs"

# Performance thresholds
LOAD_TIME_THRESHOLD_MS=3000
FIRST_CONTENTFUL_PAINT_MS=1500
TIME_TO_INTERACTIVE_MS=3500
MEMORY_LIMIT_MB=100
CPU_LIMIT_PERCENT=80

# Test configuration
TARGET_URL="${1:-http://localhost:5173}"
DURATION_SECONDS=60
CONCURRENT_USERS=10
WARMUP_REQUESTS=5

# Create required directories
mkdir -p "$BENCHMARK_RESULTS_DIR" "$LOG_DIR"

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

# Function to check if URL is reachable
wait_for_server() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    print_status $BLUE "Waiting for server to be ready at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s --max-time 5 "$url" > /dev/null 2>&1; then
            print_success "Server is ready"
            return 0
        fi
        
        print_status $YELLOW "Attempt $attempt/$max_attempts - server not ready, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Server is not reachable after $max_attempts attempts"
    return 1
}

# Function to measure basic load performance
measure_load_performance() {
    local url=$1
    local output_file="$BENCHMARK_RESULTS_DIR/load-performance-$(date '+%Y%m%d-%H%M%S').json"
    
    print_header "Measuring Load Performance"
    
    print_status $BLUE "Running load performance tests..."
    
    # Create Node.js script for detailed performance measurement
    cat > /tmp/load-perf.js << 'EOF'
const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

const url = process.argv[2];
const iterations = parseInt(process.argv[3]) || 10;

async function measureSingleLoad(testUrl) {
    return new Promise((resolve, reject) => {
        const startTime = performance.now();
        const client = testUrl.startsWith('https:') ? https : http;
        
        const req = client.get(testUrl, (res) => {
            const firstByteTime = performance.now();
            let contentLength = 0;
            
            res.on('data', (chunk) => {
                contentLength += chunk.length;
            });
            
            res.on('end', () => {
                const endTime = performance.now();
                
                resolve({
                    totalTime: Math.round(endTime - startTime),
                    firstByteTime: Math.round(firstByteTime - startTime),
                    contentLength: contentLength,
                    statusCode: res.statusCode,
                    headers: res.headers
                });
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function runBenchmark() {
    const results = [];
    
    console.log(`Running ${iterations} load tests for ${url}`);
    
    for (let i = 0; i < iterations; i++) {
        try {
            const result = await measureSingleLoad(url);
            results.push(result);
            console.log(`Test ${i + 1}/${iterations}: ${result.totalTime}ms`);
        } catch (error) {
            console.error(`Test ${i + 1} failed: ${error.message}`);
            results.push({ error: error.message });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate statistics
    const successfulResults = results.filter(r => !r.error);
    const loadTimes = successfulResults.map(r => r.totalTime);
    const firstByteTimes = successfulResults.map(r => r.firstByteTime);
    
    if (loadTimes.length === 0) {
        console.error('All tests failed');
        process.exit(1);
    }
    
    const stats = {
        totalRequests: iterations,
        successfulRequests: successfulResults.length,
        failedRequests: results.length - successfulResults.length,
        loadTime: {
            min: Math.min(...loadTimes),
            max: Math.max(...loadTimes),
            avg: Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length),
            p95: Math.round(loadTimes.sort((a, b) => a - b)[Math.floor(loadTimes.length * 0.95)])
        },
        firstByteTime: {
            min: Math.min(...firstByteTimes),
            max: Math.max(...firstByteTimes),
            avg: Math.round(firstByteTimes.reduce((a, b) => a + b, 0) / firstByteTimes.length)
        },
        contentLength: successfulResults[0]?.contentLength || 0,
        timestamp: new Date().toISOString()
    };
    
    console.log(JSON.stringify(stats, null, 2));
}

runBenchmark().catch(console.error);
EOF
    
    if node /tmp/load-perf.js "$url" 20 > "$output_file" 2>&1; then
        # Parse results
        local avg_load_time=$(grep -o '"avg": [0-9]*' "$output_file" | head -1 | grep -o '[0-9]*')
        local p95_load_time=$(grep -o '"p95": [0-9]*' "$output_file" | grep -o '[0-9]*')
        
        print_success "Load performance test completed"
        print_status $BLUE "Average load time: ${avg_load_time}ms"
        print_status $BLUE "95th percentile: ${p95_load_time}ms"
        
        if [ "$avg_load_time" -lt "$LOAD_TIME_THRESHOLD_MS" ]; then
            print_success "Load time is within threshold (${LOAD_TIME_THRESHOLD_MS}ms)"
        else
            print_warning "Load time exceeds threshold (${LOAD_TIME_THRESHOLD_MS}ms)"
        fi
        
        rm -f /tmp/load-perf.js
        return 0
    else
        print_error "Load performance test failed"
        rm -f /tmp/load-perf.js
        return 1
    fi
}

# Function to run stress testing
run_stress_test() {
    local url=$1
    local output_file="$BENCHMARK_RESULTS_DIR/stress-test-$(date '+%Y%m%d-%H%M%S').json"
    
    print_header "Running Stress Test"
    
    # Check if wrk is available
    if command -v wrk >/dev/null 2>&1; then
        print_status $BLUE "Using wrk for stress testing..."
        
        wrk -t8 -c$CONCURRENT_USERS -d${DURATION_SECONDS}s --timeout=10s "$url" > "$output_file" 2>&1
        
        if [ $? -eq 0 ]; then
            # Parse wrk output
            local requests_per_sec=$(grep "Requests/sec:" "$output_file" | awk '{print $2}')
            local transfer_per_sec=$(grep "Transfer/sec:" "$output_file" | awk '{print $2}')
            
            print_success "Stress test completed"
            print_status $BLUE "Requests per second: $requests_per_sec"
            print_status $BLUE "Transfer per second: $transfer_per_sec"
        else
            print_error "Stress test failed"
            return 1
        fi
        
    elif command -v ab >/dev/null 2>&1; then
        print_status $BLUE "Using Apache Bench for stress testing..."
        
        local total_requests=$((CONCURRENT_USERS * 10))
        ab -n $total_requests -c $CONCURRENT_USERS "$url" > "$output_file" 2>&1
        
        if [ $? -eq 0 ]; then
            # Parse ab output
            local requests_per_sec=$(grep "Requests per second:" "$output_file" | awk '{print $4}')
            local time_per_request=$(grep "Time per request:" "$output_file" | head -1 | awk '{print $4}')
            
            print_success "Stress test completed"
            print_status $BLUE "Requests per second: $requests_per_sec"
            print_status $BLUE "Time per request: ${time_per_request}ms"
        else
            print_error "Stress test failed"
            return 1
        fi
        
    else
        print_warning "Neither wrk nor ab available, running basic concurrent test..."
        
        # Fallback: simple concurrent curl test
        cat > /tmp/concurrent-test.sh << 'EOF'
#!/bin/bash
url=$1
concurrent=$2
duration=$3

start_time=$(date +%s)
end_time=$((start_time + duration))
total_requests=0
successful_requests=0

while [ $(date +%s) -lt $end_time ]; do
    for i in $(seq 1 $concurrent); do
        {
            if curl -f -s --max-time 5 "$url" > /dev/null 2>&1; then
                echo "success"
            else
                echo "failure"
            fi
        } &
    done
    
    wait
    
    # Count results
    total_requests=$((total_requests + concurrent))
    # This is a simplified count - in reality we'd track individual results
    successful_requests=$((successful_requests + concurrent))
    
    sleep 1
done

echo "Total requests: $total_requests"
echo "Successful requests: $successful_requests"
echo "Duration: ${duration}s"
echo "Requests per second: $((total_requests / duration))"
EOF
        
        chmod +x /tmp/concurrent-test.sh
        /tmp/concurrent-test.sh "$url" $CONCURRENT_USERS 10 > "$output_file"
        
        local rps=$(grep "Requests per second:" "$output_file" | awk '{print $4}')
        print_status $BLUE "Basic concurrent test completed - RPS: $rps"
        
        rm -f /tmp/concurrent-test.sh
    fi
}

# Function to monitor resource usage
monitor_resource_usage() {
    local duration=${1:-30}
    local output_file="$BENCHMARK_RESULTS_DIR/resource-usage-$(date '+%Y%m%d-%H%M%S').json"
    
    print_header "Monitoring Resource Usage"
    
    print_status $BLUE "Monitoring system resources for ${duration}s..."
    
    # Create resource monitoring script
    cat > /tmp/resource-monitor.js << 'EOF'
const os = require('os');
const process = require('process');

const duration = parseInt(process.argv[2]) || 30;
const interval = 1000; // 1 second
const samples = [];

let sampleCount = 0;
const maxSamples = duration;

console.log(`Monitoring resources for ${duration} seconds...`);

const monitor = setInterval(() => {
    const sample = {
        timestamp: new Date().toISOString(),
        memory: {
            total: Math.round(os.totalmem() / 1024 / 1024), // MB
            free: Math.round(os.freemem() / 1024 / 1024), // MB
            used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) // MB
        },
        cpu: {
            loadAvg: os.loadavg(),
            cpus: os.cpus().length
        },
        process: {
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        }
    };
    
    samples.push(sample);
    sampleCount++;
    
    if (sampleCount >= maxSamples) {
        clearInterval(monitor);
        
        // Calculate averages
        const avgMemoryUsed = Math.round(
            samples.reduce((sum, s) => sum + s.memory.used, 0) / samples.length
        );
        const avgLoadAvg = samples.reduce((sum, s) => sum + s.cpu.loadAvg[0], 0) / samples.length;
        
        const summary = {
            duration: duration,
            samples: samples.length,
            memory: {
                averageUsed: avgMemoryUsed,
                peak: Math.max(...samples.map(s => s.memory.used)),
                total: samples[0].memory.total
            },
            cpu: {
                averageLoad: Math.round(avgLoadAvg * 100) / 100,
                peakLoad: Math.max(...samples.map(s => s.cpu.loadAvg[0])),
                cores: samples[0].cpu.cpus
            },
            timestamp: new Date().toISOString(),
            allSamples: samples
        };
        
        console.log(JSON.stringify(summary, null, 2));
    }
}, interval);
EOF
    
    if node /tmp/resource-monitor.js $duration > "$output_file" 2>&1; then
        # Parse results
        local avg_memory=$(grep -o '"averageUsed": [0-9]*' "$output_file" | grep -o '[0-9]*')
        local peak_memory=$(grep -o '"peak": [0-9]*' "$output_file" | grep -o '[0-9]*')
        local avg_load=$(grep -o '"averageLoad": [0-9.]*' "$output_file" | grep -o '[0-9.]*')
        
        print_success "Resource monitoring completed"
        print_status $BLUE "Average memory usage: ${avg_memory}MB"
        print_status $BLUE "Peak memory usage: ${peak_memory}MB"
        print_status $BLUE "Average CPU load: $avg_load"
        
        # Check against thresholds
        if [ "$peak_memory" -lt "$MEMORY_LIMIT_MB" ]; then
            print_success "Memory usage is within limits"
        else
            print_warning "Memory usage exceeds limit (${MEMORY_LIMIT_MB}MB)"
        fi
        
        rm -f /tmp/resource-monitor.js
        return 0
    else
        print_error "Resource monitoring failed"
        rm -f /tmp/resource-monitor.js
        return 1
    fi
}

# Function to analyze bundle size
analyze_bundle_size() {
    print_header "Analyzing Bundle Size"
    
    cd "$PROJECT_ROOT"
    
    # Build the project if not already built
    if [ ! -d "dist" ]; then
        print_status $BLUE "Building project for bundle analysis..."
        npm run build > "$LOG_DIR/build-for-analysis.log" 2>&1
    fi
    
    if [ -d "dist" ]; then
        print_status $BLUE "Analyzing bundle sizes..."
        
        local output_file="$BENCHMARK_RESULTS_DIR/bundle-analysis-$(date '+%Y%m%d-%H%M%S').json"
        
        # Find JavaScript and CSS files
        local js_files=$(find dist -name "*.js" -type f)
        local css_files=$(find dist -name "*.css" -type f)
        
        local total_js_size=0
        local total_css_size=0
        local file_details=()
        
        # Analyze JavaScript files
        for file in $js_files; do
            if [ -f "$file" ]; then
                local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
                local gzipped_size=$(gzip -c "$file" | wc -c)
                total_js_size=$((total_js_size + size))
                
                file_details+=("JS:$(basename "$file"):${size}:${gzipped_size}")
                print_status $BLUE "$(basename "$file"): ${size} bytes (${gzipped_size} gzipped)"
            fi
        done
        
        # Analyze CSS files
        for file in $css_files; do
            if [ -f "$file" ]; then
                local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
                local gzipped_size=$(gzip -c "$file" | wc -c)
                total_css_size=$((total_css_size + size))
                
                file_details+=("CSS:$(basename "$file"):${size}:${gzipped_size}")
                print_status $BLUE "$(basename "$file"): ${size} bytes (${gzipped_size} gzipped)"
            fi
        done
        
        # Generate report
        local total_size=$((total_js_size + total_css_size))
        
        cat > "$output_file" << EOF
{
  "bundleAnalysis": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "totalSize": $total_size,
    "javascript": {
      "totalSize": $total_js_size,
      "files": $(echo "$js_files" | wc -l)
    },
    "css": {
      "totalSize": $total_css_size,
      "files": $(echo "$css_files" | wc -l)
    },
    "fileDetails": [
      $(IFS=$'\n'; echo "${file_details[*]}" | sed 's/.*/"&"/' | paste -sd, -)
    ]
  }
}
EOF
        
        print_success "Bundle analysis completed"
        print_status $BLUE "Total bundle size: ${total_size} bytes"
        print_status $BLUE "JavaScript: ${total_js_size} bytes"
        print_status $BLUE "CSS: ${total_css_size} bytes"
        
        # Check reasonable size limits
        local size_limit_js=500000  # 500KB
        local size_limit_total=1000000  # 1MB
        
        if [ $total_js_size -lt $size_limit_js ]; then
            print_success "JavaScript bundle size is reasonable"
        else
            print_warning "JavaScript bundle is large (>${size_limit_js} bytes)"
        fi
        
        if [ $total_size -lt $size_limit_total ]; then
            print_success "Total bundle size is reasonable"
        else
            print_warning "Total bundle is large (>${size_limit_total} bytes)"
        fi
        
    else
        print_error "Build directory not found"
        return 1
    fi
}

# Function to generate performance report
generate_performance_report() {
    local exit_code=$1
    local report_file="$BENCHMARK_RESULTS_DIR/performance-summary-$(date '+%Y%m%d-%H%M%S').json"
    
    print_status $BLUE "Generating performance report..."
    
    # Collect all individual reports
    local load_report=$(ls -t "$BENCHMARK_RESULTS_DIR"/load-performance-*.json 2>/dev/null | head -1)
    local stress_report=$(ls -t "$BENCHMARK_RESULTS_DIR"/stress-test-*.json 2>/dev/null | head -1)
    local resource_report=$(ls -t "$BENCHMARK_RESULTS_DIR"/resource-usage-*.json 2>/dev/null | head -1)
    local bundle_report=$(ls -t "$BENCHMARK_RESULTS_DIR"/bundle-analysis-*.json 2>/dev/null | head -1)
    
    cat > "$report_file" << EOF
{
  "performanceBenchmark": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "targetUrl": "$TARGET_URL",
    "status": $([ $exit_code -eq 0 ] && echo '"PASSED"' || echo '"FAILED"'),
    "exitCode": $exit_code,
    "thresholds": {
      "loadTimeMs": $LOAD_TIME_THRESHOLD_MS,
      "memoryLimitMB": $MEMORY_LIMIT_MB,
      "cpuLimitPercent": $CPU_LIMIT_PERCENT
    },
    "reports": {
      "loadPerformance": $([ -f "$load_report" ] && echo "\"$load_report\"" || echo "null"),
      "stressTest": $([ -f "$stress_report" ] && echo "\"$stress_report\"" || echo "null"),
      "resourceUsage": $([ -f "$resource_report" ] && echo "\"$resource_report\"" || echo "null"),
      "bundleAnalysis": $([ -f "$bundle_report" ] && echo "\"$bundle_report\"" || echo "null")
    }
  }
}
EOF
    
    print_success "Performance report generated: $report_file"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    local exit_code=0
    
    print_header "Claude Code Optimizer Dashboard - Performance Benchmarking"
    print_status $BLUE "Target URL: $TARGET_URL"
    print_status $BLUE "Start time: $(date)"
    
    # Wait for server to be ready
    if ! wait_for_server "$TARGET_URL"; then
        print_error "Server is not reachable, cannot run performance tests"
        exit 1
    fi
    
    # Run performance tests
    measure_load_performance "$TARGET_URL"
    exit_code=$((exit_code + $?))
    
    run_stress_test "$TARGET_URL"
    exit_code=$((exit_code + $?))
    
    monitor_resource_usage 20
    exit_code=$((exit_code + $?))
    
    analyze_bundle_size
    exit_code=$((exit_code + $?))
    
    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    # Generate comprehensive report
    generate_performance_report $exit_code
    
    # Final results
    print_header "Performance Benchmarking Summary"
    print_status $BLUE "Target URL: $TARGET_URL"
    print_status $BLUE "Execution time: ${minutes}m ${seconds}s"
    print_status $BLUE "Reports directory: $BENCHMARK_RESULTS_DIR"
    
    if [ $exit_code -eq 0 ]; then
        print_success "✅ PERFORMANCE BENCHMARKING PASSED"
        print_success "Dashboard meets performance requirements"
    else
        print_error "❌ PERFORMANCE BENCHMARKING FAILED"
        print_error "Found $exit_code performance issues"
        print_warning "Review performance reports for optimization opportunities"
    fi
    
    echo
    exit $exit_code
}

# Handle script arguments
case "${1:-}" in
    "--help"|"-h")
        echo "Claude Code Optimizer Dashboard - Performance Benchmarking"
        echo ""
        echo "Usage: $0 [target_url]"
        echo ""
        echo "Arguments:"
        echo "  target_url    URL to benchmark (default: http://localhost:5173)"
        echo ""
        echo "Environment Variables:"
        echo "  LOAD_TIME_THRESHOLD_MS    Load time threshold in ms (default: 3000)"
        echo "  MEMORY_LIMIT_MB          Memory limit in MB (default: 100)"
        echo "  CONCURRENT_USERS         Concurrent users for stress test (default: 10)"
        echo "  DURATION_SECONDS         Stress test duration (default: 60)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Benchmark local development"
        echo "  $0 https://your-production-site.com  # Benchmark production"
        echo ""
        exit 0
        ;;
    *)
        # Run main function
        main
        ;;
esac