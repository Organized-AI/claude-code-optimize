#!/bin/bash
# Claude Session Monitor - Quick Start Script
# Starts real session tracking and dashboard on localhost:3001

echo "🚀 Starting Claude Session Monitor..."
echo "=================================================="
echo ""

cd "$(dirname "$0")"

# Check if we're in the right directory
if [ ! -f "real_session_detector.py" ]; then
    echo "❌ Error: Please run this script from the session_tracker directory"
    exit 1
fi

# Start the complete monitoring system
echo "🎯 Launching real-time Claude session tracking..."
echo "📊 Dashboard will be available at: http://localhost:3001"
echo "🔗 Integration with: https://claude-code-optimizer-dashboard.netlify.app"
echo ""
echo "✨ Features enabled:"
echo "   • Real-time Claude Desktop session detection"
echo "   • Claude Code command monitoring"  
echo "   • Automatic 5-hour session boundaries"
echo "   • Live token usage tracking"
echo "   • Real conversation data extraction"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Start the monitoring system
python3 start_monitor.py
