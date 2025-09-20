#!/bin/bash

# Visual Regression Testing Script for Claude Code Optimizer Dashboard
# Automated screenshot comparison and visual validation

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
BASELINE_DIR="$PROJECT_ROOT/test-screenshots/baseline"
CURRENT_DIR="$PROJECT_ROOT/test-screenshots/current"
DIFF_DIR="$PROJECT_ROOT/test-screenshots/diff"
REPORT_DIR="$PROJECT_ROOT/test-reports/visual"

# Test configuration
TARGET_URL="${1:-http://localhost:5173}"
VIEWPORT_SIZES=("1920x1080" "1366x768" "768x1024" "375x667")
COMPARISON_THRESHOLD=0.1  # 10% difference threshold
STABILIZATION_DELAY=2000  # 2 seconds for animations to settle

# Create required directories
mkdir -p "$BASELINE_DIR" "$CURRENT_DIR" "$DIFF_DIR" "$REPORT_DIR"

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

# Function to check if server is ready
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

# Function to take screenshots with Playwright
take_screenshots() {
    local url=$1
    local output_dir=$2
    local test_name=$3
    
    print_status $BLUE "Taking screenshots for $test_name..."
    
    # Create Playwright script for screenshots
    cat > /tmp/screenshot-script.js << EOF
const { chromium } = require('playwright');

async function takeScreenshots() {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    
    const viewports = [
        { name: 'desktop-large', width: 1920, height: 1080 },
        { name: 'desktop-medium', width: 1366, height: 768 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
        console.log(\`Taking screenshot: \${viewport.name} (\${viewport.width}x\${viewport.height})\`);
        
        const page = await context.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        try {
            await page.goto('$url', { waitUntil: 'networkidle' });
            
            // Wait for dashboard to load
            await page.waitForSelector('text=MoonLock Dashboard', { timeout: 10000 });
            
            // Wait for animations to settle
            await page.waitForTimeout($STABILIZATION_DELAY);
            
            // Take full page screenshot
            await page.screenshot({
                path: \`$output_dir/dashboard-\${viewport.name}-fullpage.png\`,
                fullPage: true,
                animations: 'disabled'
            });
            
            // Take viewport screenshot
            await page.screenshot({
                path: \`$output_dir/dashboard-\${viewport.name}-viewport.png\`,
                fullPage: false,
                animations: 'disabled'
            });
            
            // Take screenshots of individual components
            const components = [
                { selector: 'text=Session Timer >> ..', name: 'timer-panel' },
                { selector: 'text=Token Usage >> ..', name: 'token-panel' },
                { selector: 'text=Phase Progress >> ..', name: 'phase-panel' },
                { selector: 'text=Usage Trend >> ..', name: 'trend-panel' }
            ];
            
            for (const component of components) {
                try {
                    const element = page.locator(component.selector).first();
                    if (await element.count() > 0) {
                        await element.screenshot({
                            path: \`$output_dir/\${component.name}-\${viewport.name}.png\`,
                            animations: 'disabled'
                        });
                    }
                } catch (error) {
                    console.warn(\`Could not capture \${component.name}: \${error.message}\`);
                }
            }
            
        } catch (error) {
            console.error(\`Error taking screenshot for \${viewport.name}: \${error.message}\`);
        } finally {
            await page.close();
        }
    }
    
    await browser.close();
    console.log('Screenshot capture completed');
}

takeScreenshots().catch(console.error);
EOF
    
    if node /tmp/screenshot-script.js; then
        print_success "Screenshots taken successfully"
        rm -f /tmp/screenshot-script.js
        return 0
    else
        print_error "Failed to take screenshots"
        rm -f /tmp/screenshot-script.js
        return 1
    fi
}

# Function to compare images using ImageMagick or built-in tools
compare_images() {
    local baseline_file=$1
    local current_file=$2
    local diff_file=$3
    local threshold=$4
    
    if [ ! -f "$baseline_file" ]; then
        print_warning "Baseline image not found: $(basename "$baseline_file")"
        return 2  # New baseline needed
    fi
    
    if [ ! -f "$current_file" ]; then
        print_error "Current image not found: $(basename "$current_file")"
        return 1
    fi
    
    # Try ImageMagick compare first
    if command -v compare >/dev/null 2>&1; then
        local metric_file="/tmp/compare-metric.txt"
        
        if compare -metric AE -fuzz "${threshold}%" "$baseline_file" "$current_file" "$diff_file" 2> "$metric_file"; then
            local diff_pixels=$(cat "$metric_file" 2>/dev/null || echo "0")
            
            if [ "$diff_pixels" -eq 0 ]; then
                rm -f "$diff_file" "$metric_file"
                return 0  # Images match
            else
                rm -f "$metric_file"
                return 3  # Images differ
            fi
        else
            # Compare command failed, but this might be normal for identical images
            local diff_pixels=$(cat "$metric_file" 2>/dev/null || echo "0")
            rm -f "$metric_file"
            
            if [ "$diff_pixels" -eq 0 ]; then
                rm -f "$diff_file"
                return 0  # Images match
            else
                return 3  # Images differ
            fi
        fi
        
    # Fallback to basic file comparison
    elif cmp -s "$baseline_file" "$current_file"; then
        return 0  # Files are identical
    else
        # Files differ, create a simple diff indicator
        cp "$current_file" "$diff_file"
        return 3  # Images differ
    fi
}

# Function to run visual regression tests
run_visual_regression() {
    local mode=$1  # "baseline" or "test"
    
    if [ "$mode" = "baseline" ]; then
        print_header "Creating Visual Baseline"
        
        # Clean baseline directory
        rm -rf "$BASELINE_DIR"/*
        
        # Take baseline screenshots
        take_screenshots "$TARGET_URL" "$BASELINE_DIR" "baseline"
        
        if [ $? -eq 0 ]; then
            print_success "Visual baseline created successfully"
            print_status $BLUE "Baseline images saved to: $BASELINE_DIR"
            return 0
        else
            print_error "Failed to create visual baseline"
            return 1
        fi
        
    else
        print_header "Running Visual Regression Tests"
        
        # Check if baseline exists
        if [ ! -d "$BASELINE_DIR" ] || [ -z "$(ls -A "$BASELINE_DIR" 2>/dev/null)" ]; then
            print_error "No baseline images found. Run with 'baseline' mode first."
            return 1
        fi
        
        # Clean current and diff directories
        rm -rf "$CURRENT_DIR"/* "$DIFF_DIR"/*
        
        # Take current screenshots
        take_screenshots "$TARGET_URL" "$CURRENT_DIR" "current"
        
        if [ $? -ne 0 ]; then
            print_error "Failed to take current screenshots"
            return 1
        fi
        
        # Compare images
        local total_comparisons=0
        local successful_comparisons=0
        local failed_comparisons=0
        local new_baselines_needed=0
        local differences_found=0
        
        print_status $BLUE "Comparing screenshots..."
        
        for baseline_image in "$BASELINE_DIR"/*.png; do
            if [ -f "$baseline_image" ]; then
                local filename=$(basename "$baseline_image")
                local current_image="$CURRENT_DIR/$filename"
                local diff_image="$DIFF_DIR/$filename"
                
                total_comparisons=$((total_comparisons + 1))
                
                compare_images "$baseline_image" "$current_image" "$diff_image" "$COMPARISON_THRESHOLD"
                local comparison_result=$?
                
                case $comparison_result in
                    0)
                        print_success "✓ $filename - No changes"
                        successful_comparisons=$((successful_comparisons + 1))
                        ;;
                    1)
                        print_error "✗ $filename - Comparison failed"
                        failed_comparisons=$((failed_comparisons + 1))
                        ;;
                    2)
                        print_warning "? $filename - New baseline needed"
                        new_baselines_needed=$((new_baselines_needed + 1))
                        ;;
                    3)
                        print_warning "△ $filename - Visual differences detected"
                        differences_found=$((differences_found + 1))
                        ;;
                esac
            fi
        done
        
        # Generate report
        generate_visual_regression_report "$total_comparisons" "$successful_comparisons" "$failed_comparisons" "$new_baselines_needed" "$differences_found"
        
        # Determine overall result
        if [ $failed_comparisons -gt 0 ]; then
            print_error "Visual regression tests failed due to comparison errors"
            return 1
        elif [ $differences_found -gt 0 ]; then
            print_warning "Visual differences detected - review required"
            return 2
        elif [ $new_baselines_needed -gt 0 ]; then
            print_warning "New baseline images needed"
            return 3
        else
            print_success "All visual regression tests passed"
            return 0
        fi
    fi
}

# Function to generate visual regression report
generate_visual_regression_report() {
    local total=$1
    local successful=$2
    local failed=$3
    local new_baselines=$4
    local differences=$5
    
    local report_file="$REPORT_DIR/visual-regression-$(date '+%Y%m%d-%H%M%S').json"
    
    cat > "$report_file" << EOF
{
  "visualRegressionTest": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "targetUrl": "$TARGET_URL",
    "configuration": {
      "threshold": $COMPARISON_THRESHOLD,
      "stabilizationDelay": $STABILIZATION_DELAY,
      "viewports": $(printf '%s\n' "${VIEWPORT_SIZES[@]}" | jq -R . | jq -s .)
    },
    "results": {
      "totalComparisons": $total,
      "successful": $successful,
      "failed": $failed,
      "newBaselinesNeeded": $new_baselines,
      "differencesFound": $differences
    },
    "directories": {
      "baseline": "$BASELINE_DIR",
      "current": "$CURRENT_DIR",
      "differences": "$DIFF_DIR"
    },
    "status": $([ $differences -eq 0 ] && [ $failed -eq 0 ] && echo '"PASSED"' || echo '"REVIEW_REQUIRED"')
  }
}
EOF
    
    print_success "Visual regression report generated: $report_file"
    
    # Generate HTML report for easier viewing
    generate_html_report "$report_file"
}

# Function to generate HTML report
generate_html_report() {
    local json_report=$1
    local html_report="$REPORT_DIR/visual-regression-$(date '+%Y%m%d-%H%M%S').html"
    
    cat > "$html_report" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Regression Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #2c3e50; margin: 0; }
        .header p { color: #7f8c8d; margin: 10px 0 0 0; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .status-card { background: #f8f9fa; border-radius: 6px; padding: 20px; text-align: center; }
        .status-card h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .status-card .number { font-size: 2em; font-weight: bold; color: #3498db; }
        .image-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
        .image-item { background: white; border: 1px solid #ddd; border-radius: 6px; padding: 15px; }
        .image-item h4 { margin: 0 0 10px 0; color: #2c3e50; }
        .image-item img { max-width: 100%; height: auto; border: 1px solid #eee; }
        .comparison { display: flex; gap: 10px; flex-wrap: wrap; }
        .comparison > div { flex: 1; min-width: 200px; }
        .comparison > div h5 { margin: 5px 0; color: #666; }
        .timestamp { text-align: center; color: #95a5a6; margin-top: 40px; font-size: 14px; }
        .success { color: #27ae60; }
        .warning { color: #f39c12; }
        .error { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Visual Regression Test Report</h1>
            <p>Claude Code Optimizer Dashboard</p>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <h3>Total Tests</h3>
                <div class="number" id="total">0</div>
            </div>
            <div class="status-card">
                <h3 class="success">Passed</h3>
                <div class="number success" id="passed">0</div>
            </div>
            <div class="status-card">
                <h3 class="warning">Differences</h3>
                <div class="number warning" id="differences">0</div>
            </div>
            <div class="status-card">
                <h3 class="error">Failed</h3>
                <div class="number error" id="failed">0</div>
            </div>
        </div>
        
        <div class="image-gallery" id="imageGallery">
            <!-- Images will be populated by JavaScript -->
        </div>
        
        <div class="timestamp">
            Report generated on <span id="timestamp"></span>
        </div>
    </div>
    
    <script>
        // Set timestamp
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
        
        // In a real implementation, this would load the actual test results
        // For now, we'll show a placeholder message
        document.getElementById('imageGallery').innerHTML = 
            '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">' +
            '<h3>Visual Regression Results</h3>' +
            '<p>Screenshots and comparisons are available in the test directories:</p>' +
            '<ul style="text-align: left; display: inline-block;">' +
            '<li><strong>Baseline:</strong> test-screenshots/baseline/</li>' +
            '<li><strong>Current:</strong> test-screenshots/current/</li>' +
            '<li><strong>Differences:</strong> test-screenshots/diff/</li>' +
            '</ul>' +
            '</div>';
    </script>
</body>
</html>
EOF
    
    print_success "HTML report generated: $html_report"
}

# Main execution function
main() {
    local start_time=$(date +%s)
    local mode="${2:-test}"  # "baseline" or "test"
    local exit_code=0
    
    print_header "Claude Code Optimizer Dashboard - Visual Regression Testing"
    print_status $BLUE "Target URL: $TARGET_URL"
    print_status $BLUE "Mode: $mode"
    print_status $BLUE "Start time: $(date)"
    
    # Check if Playwright is available
    if ! command -v npx >/dev/null 2>&1 || ! npx playwright --version >/dev/null 2>&1; then
        print_warning "Playwright not found, installing..."
        cd "$PROJECT_ROOT"
        npx playwright install chromium
    fi
    
    # Wait for server if in test mode
    if [ "$mode" != "baseline" ]; then
        if ! wait_for_server "$TARGET_URL"; then
            print_error "Server is not reachable, cannot run visual tests"
            exit 1
        fi
    fi
    
    # Run visual regression tests
    run_visual_regression "$mode"
    exit_code=$?
    
    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    # Final results
    print_header "Visual Regression Testing Summary"
    print_status $BLUE "Target URL: $TARGET_URL"
    print_status $BLUE "Mode: $mode"
    print_status $BLUE "Execution time: ${minutes}m ${seconds}s"
    print_status $BLUE "Screenshots directory: test-screenshots/"
    print_status $BLUE "Reports directory: $REPORT_DIR"
    
    case $exit_code in
        0)
            if [ "$mode" = "baseline" ]; then
                print_success "✅ VISUAL BASELINE CREATED"
                print_success "Baseline screenshots are ready for comparison"
            else
                print_success "✅ VISUAL REGRESSION TESTS PASSED"
                print_success "No visual changes detected"
            fi
            ;;
        1)
            print_error "❌ VISUAL REGRESSION TESTS FAILED"
            print_error "Critical errors occurred during testing"
            ;;
        2)
            print_warning "⚠️  VISUAL DIFFERENCES DETECTED"
            print_warning "Review the differences and approve changes if expected"
            ;;
        3)
            print_warning "⚠️  NEW BASELINES NEEDED"
            print_warning "Some screenshots are missing baselines"
            ;;
    esac
    
    echo
    exit $exit_code
}

# Handle script arguments
case "${2:-}" in
    "--help"|"-h")
        echo "Claude Code Optimizer Dashboard - Visual Regression Testing"
        echo ""
        echo "Usage: $0 [target_url] [mode]"
        echo ""
        echo "Arguments:"
        echo "  target_url    URL to test (default: http://localhost:5173)"
        echo "  mode          'baseline' to create baseline, 'test' to run tests (default: test)"
        echo ""
        echo "Environment Variables:"
        echo "  COMPARISON_THRESHOLD     Difference threshold 0-1 (default: 0.1)"
        echo "  STABILIZATION_DELAY      Wait time for animations in ms (default: 2000)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Run visual regression tests"
        echo "  $0 http://localhost:3000 baseline    # Create baseline screenshots"
        echo "  $0 https://prod-site.com test        # Test against production"
        echo ""
        echo "Directories:"
        echo "  test-screenshots/baseline/    Baseline images"
        echo "  test-screenshots/current/     Current test images"
        echo "  test-screenshots/diff/        Difference images"
        echo "  test-reports/visual/          Test reports"
        echo ""
        exit 0
        ;;
    *)
        # Run main function
        main
        ;;
esac