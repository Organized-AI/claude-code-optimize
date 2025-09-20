#!/bin/bash
"""
Launch Claude Code Live Session Dashboard
"""

echo "🚀 Starting Claude Code Live Session Dashboard..."

# Check if streamlit is installed
if ! command -v streamlit &> /dev/null; then
    echo "📦 Installing required dependencies..."
    pip install streamlit
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Launch dashboard
echo "🌐 Opening dashboard at http://localhost:8501"
echo "🔴 Dashboard will show 'LIVE SESSION ACTIVE' when Claude Code is running"
echo ""
echo "💡 To test: Open another terminal and run:"
echo "   python src/usage_tracker/session_monitor.py --help"
echo ""

streamlit run src/dashboard/live_dashboard.py --server.port 8501 --server.headless false
