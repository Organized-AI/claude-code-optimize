#!/bin/bash
# Setup power user aliases for Claude Code Optimizer

cat > ~/.claude_code_aliases << 'EOF'
# Claude Code Power User Aliases - Week 1 Foundation

# Core Commands
alias cc='cd "/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"'
alias cc-analyze='python -m src.cli.main analyze'
alias cc-start='python -m src.cli.main start-session'
alias cc-status='python -m src.cli.main status'
alias cc-quick='python -m src.cli.main quick-start'

# Session Management  
alias cc-plan='claude --dangerously-skip-permissions --agent planning_optimizer'
alias cc-code='claude --dangerously-skip-permissions --agent coding_optimizer'
alias cc-test='claude --dangerously-skip-permissions --agent testing_optimizer'
alias cc-review='claude --dangerously-skip-permissions --agent review_optimizer'

# Quick Analysis
alias cc-check='function _cc_check() { 
    echo "🔍 Quick Analysis: $1"
    cc-analyze "$1" --output table
    echo ""
    echo "💡 Start with: cc-start planning \"$1\""
}; _cc_check'

# Token Management
alias cc-tokens='function _cc_tokens() {
    echo "💰 Token Budget Status"
    python -c "
from src.core.session_manager import ClaudeCodeSessionManager
manager = ClaudeCodeSessionManager()
summary = manager.get_token_usage_summary()
print(f\"Weekly: {summary[\"total_used\"]:,}/{summary[\"weekly_limit\"]:,} ({summary[\"usage_percentage\"]:.1f}%)\")
print(f\"Remaining: {summary[\"remaining\"]:,} tokens\")
print(f\"Sessions: {summary[\"sessions_this_week\"]} this week\")
"
}; _cc_tokens'

# Project Quick Start
alias cc-new='function _cc_new() {
    echo "🚀 Setting up Claude Code optimization for: $1"
    cc-analyze "$1"
    echo ""
    echo "📅 Next steps:"
    echo "1. cc-start planning \"$1\""
    echo "2. Review recommendations"
    echo "3. Create calendar blocks"
}; _cc_new'

# Thinking Mode Shortcuts
alias cc-think='claude --dangerously-skip-permissions --thinking-mode'
alias cc-deep='claude --dangerously-skip-permissions --thinking-mode deep'
alias cc-fast='claude --dangerously-skip-permissions --agent fast_coding'

# Session Tracking Commands
alias cc-current='python -m src.cli.main current-session'
alias cc-session-report='python -m src.cli.main session-report'  
alias cc-generate-data='python generate_current_session_data.py'

# Emergency Commands
alias cc-emergency='echo "🚨 Emergency Claude Code session - using reserve tokens"; claude --dangerously-skip-permissions --emergency-mode'
alias cc-save-state='python -c "
from src.core.session_manager import ClaudeCodeSessionManager
manager = ClaudeCodeSessionManager()
manager.save_session_history()
print(\"✅ Session state saved\")
"'
EOF

# Add to shell configuration
if [ -f ~/.zshrc ]; then
    # Check if already sourced
    if ! grep -q "source ~/.claude_code_aliases" ~/.zshrc; then
        echo "source ~/.claude_code_aliases" >> ~/.zshrc
        echo "✅ Added aliases to ~/.zshrc"
    else
        echo "✅ Aliases already in ~/.zshrc"
    fi
elif [ -f ~/.bashrc ]; then
    # Check if already sourced
    if ! grep -q "source ~/.claude_code_aliases" ~/.bashrc; then
        echo "source ~/.claude_code_aliases" >> ~/.bashrc
        echo "✅ Added aliases to ~/.bashrc"
    else
        echo "✅ Aliases already in ~/.bashrc"
    fi
fi

echo "✅ Power user aliases created"
echo "💡 Restart terminal or run: source ~/.claude_code_aliases"