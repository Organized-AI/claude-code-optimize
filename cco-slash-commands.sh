#!/bin/bash
# CCO Slash Commands - Quick monitoring tools
# Usage: Source this file to get instant slash commands
# Example: source cco-slash-commands.sh

# Get the directory where this script is located
CCO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to CCO directory for commands
cd "$CCO_DIR"

echo "🚀 CCO Slash Commands Loaded!"
echo "==============================================="

# CCO command functions (work like slash commands)
cco_status() { python3 "$CCO_DIR/cco_simple.py" status; }
cco_limits() { python3 "$CCO_DIR/cco_simple.py" limits; }
cco_quota() { python3 "$CCO_DIR/cco_simple.py" weekly; }
cco_blocks() { python3 "$CCO_DIR/cco_simple.py" blocks; }
cco_daily() { python3 "$CCO_DIR/cco_simple.py" daily; }
cco_sessions() { python3 "$CCO_DIR/cco_simple.py" sessions; }

# Create aliases for hyphenated versions
alias cco-status='cco_status'
alias cco-limits='cco_limits'
alias cco-quota='cco_quota'
alias cco-blocks='cco_blocks'
alias cco-daily='cco_daily'
alias cco-sessions='cco_sessions'

# Live monitoring functions (macOS compatible)
cco_watch_status() { 
    echo "🔄 Live Status Monitor (press Ctrl+C to stop)"
    echo "Updates every 5 seconds..."
    echo ""
    while true; do
        clear
        echo "🔄 Live Status Monitor - $(date '+%H:%M:%S')"
        echo "========================================"
        python3 "$CCO_DIR/cco_simple.py" status
        echo ""
        echo "Press Ctrl+C to stop monitoring"
        sleep 5
    done
}
cco_watch_limits() { 
    echo "🚨 Live Limits Monitor (press Ctrl+C to stop)"
    echo "Updates every 30 seconds..."
    echo ""
    while true; do
        clear
        echo "🚨 Live Limits Monitor - $(date '+%H:%M:%S')"
        echo "========================================"
        python3 "$CCO_DIR/cco_simple.py" limits
        echo ""
        echo "Press Ctrl+C to stop monitoring"
        sleep 30
    done
}
cco_watch_blocks() { 
    echo "⏱️ Live Blocks Monitor (press Ctrl+C to stop)"
    echo "Updates every 10 seconds..."
    echo ""
    while true; do
        clear
        echo "⏱️ Live Blocks Monitor - $(date '+%H:%M:%S')"
        echo "========================================"
        python3 "$CCO_DIR/cco_simple.py" blocks
        echo ""
        echo "Press Ctrl+C to stop monitoring"
        sleep 10
    done
}

# Create aliases for hyphenated live monitoring versions
alias cco-watch-status='cco_watch_status'
alias cco-watch-limits='cco_watch_limits'
alias cco-watch-blocks='cco_watch_blocks'

# Dashboard functions
cco_dashboard() { cd "$CCO_DIR" && ./start_smart_monitoring.sh; }
cco_deploy_dashboard() { cd "$CCO_DIR" && ./deploy_smart_dashboard.sh; }
cco_monitor() { cd "$CCO_DIR" && python3 smart_dashboard_monitor.py; }

# Create aliases for hyphenated dashboard versions
alias cco-dashboard='cco_dashboard'
alias cco-deploy-dashboard='cco_deploy_dashboard'
alias cco-monitor='cco_monitor'

# Quick combo functions
cco_quick() { 
    python3 "$CCO_DIR/cco_simple.py" status
    echo ""
    python3 "$CCO_DIR/cco_simple.py" limits
}
cco_overview() {
    python3 "$CCO_DIR/cco_simple.py" weekly
    echo ""
    python3 "$CCO_DIR/cco_simple.py" blocks
}

# Create aliases for hyphenated combo versions
alias cco-quick='cco_quick'
alias cco-overview='cco_overview'

# Planning functions  
cco_plan() { python3 "$CCO_DIR/cco_simple.py" plan "$@"; }
cco_recommend() { python3 "$CCO_DIR/cco_simple.py" recommend "$@"; }
cco_optimize() { python3 "$CCO_DIR/cco_simple.py" optimize; }

# Notification functions
cco_notify_start() { 
    echo "🔔 Starting CCO macOS Notifications..."
    cd "$CCO_DIR" && python3 cco_macos_notifier.py "$@"
}
cco_notify_test() { 
    echo "🧪 Testing CCO notifications..."
    cd "$CCO_DIR" && python3 cco_macos_notifier.py --test
}
cco_notify_silent() {
    echo "🔕 Starting silent notifications (thresholds only)..."
    cd "$CCO_DIR" && python3 cco_macos_notifier.py --no-regular-updates "$@"
}

# Create aliases for hyphenated planning versions
alias cco-plan='cco_plan'
alias cco-recommend='cco_recommend'
alias cco-optimize='cco_optimize'

# Create aliases for notification versions
alias cco-notify='cco_notify_start'
alias cco-notify-test='cco_notify_test'
alias cco-notify-silent='cco_notify_silent'

echo ""
echo "📊 Available CCO Commands:"
echo "=========================================="
echo "Quick Status:"
echo "  cco-status      - Current session status"
echo "  cco-limits      - Traffic light quota status"
echo "  cco-quota       - Weekly usage breakdown"
echo "  cco-blocks      - 5-hour block progress"
echo "  cco-daily       - Today's usage summary"
echo "  cco-sessions    - Recent session history"
echo ""
echo "Live Monitoring:"
echo "  cco-watch-status  - Watch session status (updates every 5s)"
echo "  cco-watch-limits  - Watch quota limits (updates every 30s)"
echo "  cco-watch-blocks  - Watch block progress (updates every 10s)"
echo ""
echo "Dashboard:"
echo "  cco-dashboard     - Launch smart dashboard"
echo "  cco-deploy-dashboard - Update dashboard manually"
echo "  cco-monitor       - Start auto-monitoring"
echo ""
echo "Quick Combos:"
echo "  cco-quick         - Status + Limits in one command"
echo "  cco-overview      - Weekly + Blocks overview"
echo ""
echo "Planning:"
echo "  cco-plan          - Analyze current project"
echo "  cco-recommend     - Get model recommendations"
echo "  cco-optimize      - Usage optimization tips"
echo ""
echo "Notifications:"
echo "  cco-notify        - Start macOS notifications (regular updates)"
echo "  cco-notify-test   - Test notification system"
echo "  cco-notify-silent - Start notifications (thresholds only)"
echo ""
echo "🎯 Example Usage:"
echo "  cco-status        # Check current session"
echo "  cco-watch-limits  # Monitor quota in real-time"
echo "  cco-quick         # Quick status check"
echo ""
echo "✅ Ready to monitor! Try: cco-status"