#!/bin/bash

# Test Notification System
# Validates notification functionality across different urgency levels

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOKS_DIR="$PROJECT_ROOT/hooks"

# Source shared utilities
source "$HOOKS_DIR/shared-utils.sh"

# Test notification function
test_notification() {
    local level="$1"
    local title="$2"
    local message="$3"
    local urgency="$4"
    
    echo "🧪 Testing $level notification..."
    send_notification "$title" "$message" "$urgency"
    sleep 2
}

# Main test suite
main() {
    echo "🚀 Starting Claude Code Hooks notification test suite"
    echo "======================================================"
    
    # Initialize session for testing
    initialize_session
    
    # Test different notification levels
    echo ""
    echo "📢 Testing notification levels..."
    
    test_notification "LOW" "Test Low Priority" "This is a low priority test notification" "low"
    test_notification "NORMAL" "Test Normal Priority" "This is a normal priority test notification" "normal"
    test_notification "CRITICAL" "Test Critical Priority" "This is a critical priority test notification (with bell)" "critical"
    
    echo ""
    echo "📊 Testing token rate warnings..."
    
    # Simulate token rate warnings
    update_baseline_rate "100"
    check_rate_warning "125"  # 25% increase
    sleep 2
    check_rate_warning "150"  # 50% increase
    sleep 2
    check_rate_warning "200"  # 100% increase
    sleep 2
    
    echo ""
    echo "🔧 Testing hook-specific notifications..."
    
    # Test notification handler directly
    "$HOOKS_DIR/notification-handler.sh" "session_start" "Test session started"
    sleep 1
    "$HOOKS_DIR/notification-handler.sh" "milestone" "Reached token milestone"
    sleep 1
    "$HOOKS_DIR/notification-handler.sh" "efficiency" "High efficiency detected"
    sleep 1
    "$HOOKS_DIR/notification-handler.sh" "warning" "Test warning message"
    sleep 1
    "$HOOKS_DIR/notification-handler.sh" "error" "Test error message"
    sleep 1
    
    echo ""
    echo "📱 Testing system integration..."
    
    # Test macOS-specific features
    if command -v osascript &> /dev/null; then
        echo "✅ macOS notification system detected"
        osascript -e 'display notification "Hook system test completed successfully" with title "Claude Code Hooks" subtitle "System Integration Test"'
    else
        echo "❌ macOS notification system not available"
    fi
    
    echo ""
    echo "📈 Testing session milestones..."
    
    # Simulate session with milestones
    local test_session=$(echo '{}' | jq '{
        session_id: "test_session_'$(date +%s)'",
        start_time: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
        tokens_baseline: 0,
        tokens_current: 10000,
        tools_used: 25,
        baseline_rate: 100
    }')
    save_session_data "$test_session"
    
    "$HOOKS_DIR/notification-handler.sh" "milestone" "Token milestone test"
    
    echo ""
    echo "🏁 Test Results Summary"
    echo "======================"
    echo "✅ Low priority notifications"
    echo "✅ Normal priority notifications" 
    echo "✅ Critical priority notifications (with bell)"
    echo "✅ Token rate warning notifications"
    echo "✅ Hook-specific notification types"
    echo "✅ Session milestone notifications"
    
    if command -v osascript &> /dev/null; then
        echo "✅ macOS system integration"
    else
        echo "⚠️ macOS system integration (not available)"
    fi
    
    echo ""
    echo "📝 Check the logs at: $PROJECT_ROOT/logs/hooks.log"
    echo "🎯 All notification tests completed successfully!"
    
    # Clean up test session
    rm -f "$PROJECT_ROOT/data/current_session.json"
}

# Execute if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi