#!/bin/bash

echo "🧪 Testing Claude Code Hook Notifications"
echo "========================================"
echo

cd '/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer'

echo "1. Testing basic notification..."
./hooks/test-notification.sh
sleep 2

echo
echo "2. Testing session start..."
./hooks/session-start.sh
sleep 2

echo  
echo "3. Testing normal token usage..."
echo '{"total_cost_usd": 0.15, "num_turns": 3}' | ./hooks/post-tool-monitor.sh
sleep 3

echo
echo "4. Testing rate increase (should establish baseline)..."
echo '{"total_cost_usd": 0.45, "num_turns": 6}' | ./hooks/post-tool-monitor.sh
sleep 3

echo
echo "5. Testing HIGH rate increase (50%+ - should get warning notification)..."
echo '{"total_cost_usd": 1.20, "num_turns": 10}' | ./hooks/post-tool-monitor.sh
sleep 3

echo
echo "6. Testing CRITICAL rate increase (100%+ - should get critical alert)..."  
echo '{"total_cost_usd": 3.50, "num_turns": 15}' | ./hooks/post-tool-monitor.sh
sleep 3

echo
echo "7. Testing session end..."
./hooks/session-stop.sh

echo
echo "✅ Hook testing complete!"
echo "You should have received several macOS notifications with different alert levels."
echo
echo "Check the data files:"
echo "- Session data: ./data/current_session.json"  
echo "- Rate log: ./data/token_rates.log"
echo "- Hook test log: ~/claude-hook-test.log"
