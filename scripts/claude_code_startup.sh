#!/bin/bash

echo "🚀 Claude Code Power User Environment"
echo "======================================"

# Check if we're in the right directory
EXPECTED_DIR="/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"

if [ "$PWD" != "$EXPECTED_DIR" ]; then
    echo "📁 Navigating to Claude Code Optimizer..."
    cd "$EXPECTED_DIR"
fi

# Show status
echo "📊 System Status:"
python -c "
try:
    from src.core.session_manager import ClaudeCodeSessionManager
    manager = ClaudeCodeSessionManager()
    summary = manager.get_token_usage_summary()
    print(f'  🪙 Tokens: {summary[\"total_used\"]:,}/{summary[\"weekly_limit\"]:,} ({summary[\"usage_percentage\"]:.1f}%)')
    print(f'  📈 Sessions: {summary[\"sessions_this_week\"]} this week')
except ImportError:
    print('  ⚠️  Environment not fully configured')
except:
    print('  ℹ️  First run - no session history')
"

echo ""
echo "🔧 Available Commands:"
echo "  cc-analyze <project>  - Analyze project for optimization"
echo "  cc-start <type> <project> - Start optimized session"
echo "  cc-status            - Check token usage"
echo "  cc-quick <project>   - Quick start workflow"
echo ""
echo "💡 Example: cc-analyze ~/my-project"
echo "✨ Ready for optimized Claude Code sessions!"