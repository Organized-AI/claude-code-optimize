#!/bin/bash

##
# Claude Code Optimizer - URL Handler Installer
# Registers claude-session:// URL scheme on macOS
##

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PLIST_NAME="com.claude.session-launcher"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
HANDLER_SCRIPT="$SCRIPT_DIR/handle-session-url.sh"

echo ""
echo "🔧 Claude Session URL Handler Installer"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo "❌ Error: This script only works on macOS"
    exit 1
fi

# Ensure LaunchAgents directory exists
mkdir -p "$HOME/Library/LaunchAgents"

# Make handler script executable
chmod +x "$HANDLER_SCRIPT"

# Create LaunchAgent plist
echo "📝 Creating LaunchAgent configuration..."

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$PLIST_NAME</string>

    <key>ProgramArguments</key>
    <array>
        <string>$HANDLER_SCRIPT</string>
        <string>%u</string>
    </array>

    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>Claude Session Launcher</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>claude-session</string>
            </array>
        </dict>
    </array>

    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

# Load the LaunchAgent
echo "🚀 Registering URL handler..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

# Register as URL handler using lsregister (if available)
if [[ -f "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister" ]]; then
    echo "📋 Registering with Launch Services..."
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
        -f "$PLIST_PATH" 2>/dev/null || true
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🎉 URL Handler Installed Successfully"
echo ""
echo "You can now use claude-session:// URLs to launch sessions:"
echo ""
echo "  📋 Example URLs:"
echo "     claude-session://start?plan=10"
echo "     claude-session://start?plan=SESSION_10_PLAN"
echo ""
echo "  🧪 Test it:"
echo "     open 'claude-session://start?plan=10&project=$PROJECT_ROOT'"
echo ""
echo "  ℹ️  URLs will open in Terminal and start Claude Code sessions"
echo ""
echo "  🗑️  To uninstall:"
echo "     $SCRIPT_DIR/uninstall-url-handler.sh"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
