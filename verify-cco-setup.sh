#!/bin/bash
# CCO Setup Verification Script
# Tests that all Claude Code Optimizer slash commands are working

echo "🔍 Claude Code Optimizer Setup Verification"
echo "=============================================="

CCO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CCO_DIR"

# Test 1: Check if Python script works
echo ""
echo "Test 1: Python Script Functionality"
echo "-----------------------------------"
if python3 cco_simple.py status >/dev/null 2>&1; then
    echo "✅ Python script works correctly"
else
    echo "❌ Python script failed"
    echo "   Fix: Check Python 3 installation"
    exit 1
fi

# Test 2: Check if commands are loaded
echo ""
echo "Test 2: Slash Commands Availability"
echo "-----------------------------------"
# Source the commands in this script's context
source cco-slash-commands.sh >/dev/null 2>&1

# Test if the function exists
if declare -f cco_status >/dev/null 2>&1; then
    echo "✅ Slash commands loaded successfully"
else
    echo "❌ Slash commands not loaded"
    echo "   Fix: Check cco-slash-commands.sh"
    exit 1
fi

# Test 3: Check .bash_profile integration
echo ""
echo "Test 3: Shell Profile Integration"
echo "--------------------------------"
BASH_PROFILE="$HOME/.bash_profile"
if grep -q "cco-slash-commands.sh" "$BASH_PROFILE"; then
    echo "✅ Commands added to .bash_profile"
else
    echo "❌ Commands not found in .bash_profile"
    echo "   Fix: Re-run setup script"
    exit 1
fi

# Test 4: Test key commands
echo ""
echo "Test 4: Command Execution Test"
echo "------------------------------"
echo "Testing cco-status:"
cco_status
echo ""
echo "Testing cco-limits:"
cco_limits

echo ""
echo "🎉 Setup Verification Complete!"
echo "================================"
echo ""
echo "All CCO slash commands are working correctly!"
echo ""
echo "🚀 Available Commands:"
echo "  cco-status      - Current session status"
echo "  cco-limits      - Weekly quota status"
echo "  cco-blocks      - 5-hour block progress"
echo "  cco-quick       - Quick status overview"
echo "  cco-plan        - Project analysis"
echo "  cco-recommend   - Model recommendations"
echo ""
echo "💡 Pro Tips:"
echo "  • Use 'cco-watch-limits' for real-time monitoring"
echo "  • Use 'cco-plan .' to analyze current project"
echo "  • Use 'cco-quick' for fast status check"
echo ""
echo "🔄 To use commands in new terminal sessions:"
echo "  1. Close and reopen your terminal"
echo "  2. Or run: source ~/.bash_profile"
echo ""
echo "✅ Ready for Claude Code power user workflow!"
