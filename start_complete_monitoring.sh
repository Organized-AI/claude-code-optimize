#!/bin/bash
# Complete Claude Code Optimizer Monitoring System
# ===============================================

set -e

echo "🚀 Starting Complete Claude Code Optimizer Monitoring"
echo "====================================================="

BASE_DIR="/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"
cd "$BASE_DIR"

# Function to update all data
update_all_data() {
    echo "🔄 Updating all monitoring data..."
    
    # Update real session data
    python3 -c "
import sqlite3, psutil, json, glob, os
from datetime import datetime

# Scan for new Claude processes and JSONL files
db_path = 'claude_usage.db'
claude_count = sum(1 for proc in psutil.process_iter(['name']) if proc.info['name'] == 'claude')

# Update dashboard JSON
dashboard_data = {
    'isActive': claude_count > 0,
    'totalActiveSessions': claude_count,
    'lastUpdated': datetime.now().isoformat()
}

# Get latest session from database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute('SELECT id, real_total_tokens FROM real_sessions WHERE session_type = \"claude_code\" ORDER BY start_time DESC LIMIT 1')
result = cursor.fetchone()

if result:
    dashboard_data['activeSessionId'] = result[0]
    dashboard_data['realTokens'] = result[1]
    dashboard_data['sessionType'] = 'claude_code'
else:
    dashboard_data['activeSessionId'] = None
    dashboard_data['realTokens'] = 0
    dashboard_data['sessionType'] = None

conn.close()

with open('moonlock-dashboard/real-session-data.json', 'w') as f:
    json.dump(dashboard_data, f, indent=2)

print(f'✅ Updated session data: {claude_count} active processes')
"
    
    # Update rate limit calculations
    python3 rate_limit_calculator.py > /dev/null 2>&1
    
    echo "✅ All data updated"
}

# Initial data update
update_all_data

echo ""
echo "📊 CURRENT STATUS:"
echo "=================="

# Show current status
python3 -c "
import json

# Session data
with open('moonlock-dashboard/real-session-data.json', 'r') as f:
    session_data = json.load(f)

# Rate limit data  
with open('moonlock-dashboard/rate-limit-status.json', 'r') as f:
    rate_data = json.load(f)

print(f'🔴 Active Claude Processes: {session_data[\"totalActiveSessions\"]}')
print(f'💎 Real Tokens Tracked: {session_data.get(\"realTokens\", 0):,}')
print(f'📊 Weekly Usage: {rate_data[\"weekly_limit\"][\"usage_percentage\"]:.1f}%')
print(f'⏰ 5-Hour Usage: {rate_data[\"five_hour_block\"][\"usage_percentage\"]:.1f}%')
print(f'🎯 Status: {rate_data[\"overall_status\"].upper()}')
"

echo ""
echo "🎯 AVAILABLE DASHBOARDS:"
echo "========================"
echo "1️⃣ Enhanced Rate Limit Dashboard (RECOMMENDED):"
echo "   file://$PWD/enhanced_dashboard_with_real_limits.html"
echo ""
echo "2️⃣ Simple Token Dashboard:"
echo "   file://$PWD/real_token_dashboard.html"
echo ""
echo "3️⃣ Original Real Data Bridge:"
echo "   file://$PWD/moonlock-dashboard/real-data-bridge.html"

echo ""
echo "🔄 MONITORING OPTIONS:"
echo "====================="
echo "• Run once and exit: Already done ✅"
echo "• Continuous monitoring: Run the commands below"
echo ""
echo "# Update data every 30 seconds:"
echo "while true; do python3 rate_limit_calculator.py > /dev/null 2>&1; sleep 30; done"
echo ""
echo "# Monitor for new Claude processes:"
echo "python3 continuous_monitor.py"

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================="
echo "Your real Claude Code session data is now being tracked with rate limits!"
echo "Weekly usage: $(python3 -c "import json; data=json.load(open('moonlock-dashboard/rate-limit-status.json')); print(f'{data[\"weekly_limit\"][\"usage_percentage\"]:.1f}%')")"
