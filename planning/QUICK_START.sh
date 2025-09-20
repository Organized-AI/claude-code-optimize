#!/bin/bash

# Claude Code Optimizer - Quick Start Setup
# Run this script to initialize your Foundation Phase Session 1

echo "🚀 Claude Code Optimizer - Foundation Phase Setup"
echo "=================================================="

# Create session directory
SESSION_ID="foundation_$(date +%Y%m%d_%H%M%S)"
mkdir -p "sessions/$SESSION_ID"

echo "📁 Created session directory: sessions/$SESSION_ID"

# Copy session template
cp "tracking/SESSION_LOG_TEMPLATE.md" "sessions/$SESSION_ID/session-log.md"

# Update session log with Foundation Phase details
sed -i '' "s/\[ID\]/$SESSION_ID/g" "sessions/$SESSION_ID/session-log.md"
sed -i '' "s/\[Phase\]/Foundation/g" "sessions/$SESSION_ID/session-log.md"
sed -i '' "s/\[Agent\]/Foundation Agent/g" "sessions/$SESSION_ID/session-log.md"
sed -i '' "s/\[Date\]/$(date)/g" "sessions/$SESSION_ID/session-log.md"

echo "📋 Session log created and customized"

# Display prompt file location
echo ""
echo "📝 Your Claude Code prompt is ready at:"
echo "   planning/FOUNDATION_AGENT_PROMPT.txt"
echo ""
echo "🎯 Session Details:"
echo "   • Token Budget: 80-100 prompts"
echo "   • Duration: 5 hours"
echo "   • Focus: Core infrastructure & session management"
echo ""
echo "✅ Ready to copy/paste into Claude Code!"
echo ""
echo "Next steps:"
echo "1. Copy the prompt from FOUNDATION_AGENT_PROMPT.txt"
echo "2. Paste into Claude Code"
echo "3. Track progress in sessions/$SESSION_ID/session-log.md"
echo "4. Update tracking/TOKEN_UTILIZATION_TRACKER.md as you go"
echo ""
echo "Good luck building your moonlock dashboard! 🌙🔒"
