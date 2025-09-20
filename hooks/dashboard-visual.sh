#!/bin/bash

# Visual Dashboard Monitor - Prominent notifications without audio dependency

echo "🚨 VISUAL DASHBOARD DISCONNECTION ALERT 🚨"
echo "============================================="
echo "  ██████   █████  ███████ ██   ██ ██████   ██████   █████  ██████  ██████  "
echo "  ██   ██ ██   ██ ██      ██   ██ ██   ██ ██    ██ ██   ██ ██   ██ ██   ██ "
echo "  ██   ██ ███████ ███████ ███████ ██████  ██    ██ ███████ ██████  ██   ██ "
echo "  ██   ██ ██   ██      ██ ██   ██ ██   ██ ██    ██ ██   ██ ██   ██ ██   ██ "
echo "  ██████  ██   ██ ███████ ██   ██ ██████   ██████  ██   ██ ██   ██ ██████  "
echo "============================================="
echo "🔴 CLAUDE CODE DASHBOARD DISCONNECTED"
echo "🔴 Real-time monitoring is OFFLINE"
echo "🔴 Token rate warnings DISABLED"
echo "🔴 Session tracking INTERRUPTED"
echo "============================================="
echo "💡 To fix: ./launch_dashboard.sh"
echo "📊 Status: ./hooks/dashboard-monitor.sh status"
echo "============================================="

# Large visual notification
osascript -e 'display alert "🚨 CLAUDE CODE DASHBOARD DISCONNECTED" message "Real-time monitoring is offline. Dashboard connectivity lost. Click OK to acknowledge." as critical'

# Notification Center alert
osascript -e 'display notification "🚨 CRITICAL: Dashboard offline - real-time monitoring disabled" with title "Claude Code Alert" sound name "Sosumi"'

echo "✅ Visual alerts sent - did you see the popup dialogs?"
