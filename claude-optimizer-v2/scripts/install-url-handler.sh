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

# Source security libraries
source "$SCRIPT_DIR/lib/preflight.sh"
source "$SCRIPT_DIR/lib/errors.sh"

# Initialize error handling with rollback support
init_error_handling

echo ""
echo "🔧 Claude Session URL Handler Installer"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Run pre-flight checks
log "INFO" "Running pre-flight dependency checks..."
echo "🔍 Checking system requirements..."
echo ""

if ! preflight_check; then
    user_friendly_error "Pre-flight check failed" "Please fix the issues above and try again"
    safe_exit 1
fi

echo ""
echo "✅ All pre-flight checks passed"
echo ""

# Check if running on macOS (redundant with preflight but kept for clarity)
if [[ "$(uname)" != "Darwin" ]]; then
    user_friendly_error "Wrong platform" "This script only works on macOS"
    safe_exit 1
fi

# Record installation steps for potential rollback
record_state "installation_started"

# Ensure LaunchAgents directory exists
mkdir -p "$HOME/Library/LaunchAgents" || {
    user_friendly_error "Cannot create LaunchAgents directory" "Check permissions for ~/Library/LaunchAgents"
    rollback_installation
    safe_exit 1
}
record_state "launchagents_dir_created"

# Make handler script executable
chmod +x "$HANDLER_SCRIPT" || {
    user_friendly_error "Cannot make handler executable" "Check permissions for $HANDLER_SCRIPT"
    rollback_installation
    safe_exit 1
}
record_state "handler_script_executable"

# Create LaunchAgent plist
log "INFO" "Creating LaunchAgent configuration at $PLIST_PATH"
with_progress "Creating LaunchAgent configuration"

cat > "$PLIST_PATH" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>PLIST_NAME_PLACEHOLDER</string>

    <key>ProgramArguments</key>
    <array>
        <string>HANDLER_SCRIPT_PLACEHOLDER</string>
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

# Replace placeholders
sed -i '' "s|PLIST_NAME_PLACEHOLDER|$PLIST_NAME|g" "$PLIST_PATH"
sed -i '' "s|HANDLER_SCRIPT_PLACEHOLDER|$HANDLER_SCRIPT|g" "$PLIST_PATH"

# Check if plist was created successfully
if [ ! -f "$PLIST_PATH" ]; then
    user_friendly_error "Cannot create plist file" "Failed to write to $PLIST_PATH"
    rollback_installation
    safe_exit 1
fi

record_state "plist_created"
log "INFO" "Plist file created successfully"

# Load the LaunchAgent
log "INFO" "Loading LaunchAgent into launchctl"
with_progress "Registering URL handler"

# Unload existing (if any) before loading new
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Load the new configuration
if ! launchctl load "$PLIST_PATH"; then
    user_friendly_error "Failed to load LaunchAgent" "Check launchctl permissions"
    rollback_installation
    safe_exit 1
fi

record_state "launchagent_loaded"
log "INFO" "LaunchAgent loaded successfully"

# Register as URL handler using lsregister (if available)
if [[ -f "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister" ]]; then
    log "INFO" "Registering with Launch Services..."
    with_progress "Registering with Launch Services"
    /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
        -f "$PLIST_PATH" 2>/dev/null || true
    record_state "lsregister_completed"
fi

log "INFO" "Installation completed successfully"

# Show success summary using errors.sh function
show_success_summary "URL Handler Installation" \
    "You can now use claude-session:// URLs to launch sessions" \
    "Example: open 'claude-session://start?plan=10'"

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
