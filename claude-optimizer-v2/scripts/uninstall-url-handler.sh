#!/bin/bash

##
# Claude Code Optimizer - URL Handler Uninstaller
# Removes claude-session:// URL scheme registration
##

set -e

PLIST_NAME="com.claude.session-launcher"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

echo ""
echo "🗑️  Claude Session URL Handler Uninstaller"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if installed
if [[ ! -f "$PLIST_PATH" ]]; then
    echo "ℹ️  URL handler is not installed"
    echo ""
    exit 0
fi

# Unload the LaunchAgent
echo "📋 Unloading LaunchAgent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Remove the plist file
echo "🗑️  Removing configuration..."
rm -f "$PLIST_PATH"

# Clear Launch Services cache (if available)
if [[ -f "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister" ]]; then
    echo "🧹 Clearing Launch Services cache..."
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
        -kill -r -domain local -domain system -domain user 2>/dev/null || true
fi

echo ""
echo "✅ Uninstall complete!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🎉 URL Handler Removed Successfully"
echo ""
echo "  ℹ️  claude-session:// URLs will no longer work"
echo ""
echo "  🔄 To reinstall:"
echo "     $(dirname "$0")/install-url-handler.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
