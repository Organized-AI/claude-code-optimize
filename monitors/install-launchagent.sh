#!/bin/bash
# Install LaunchAgent for Claude Monitor Auto-Start

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Claude Monitor LaunchAgent Installer${NC}"
echo "================================================"

PLIST_NAME="com.claudeoptimizer.monitor"
PLIST_FILE="$PLIST_NAME.plist"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_PLIST="$SOURCE_DIR/$PLIST_FILE"
LAUNCHAGENTS_DIR="$HOME/Library/LaunchAgents"
DEST_PLIST="$LAUNCHAGENTS_DIR/$PLIST_FILE"

# Check if source plist exists
if [ ! -f "$SOURCE_PLIST" ]; then
    echo -e "${RED}✗ Error: $PLIST_FILE not found in current directory${NC}"
    exit 1
fi

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$LAUNCHAGENTS_DIR"

# Check if already installed
if [ -f "$DEST_PLIST" ]; then
    echo -e "${YELLOW}⚠ LaunchAgent already installed${NC}"
    echo "Would you like to reinstall? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi
    
    # Unload existing agent
    echo -e "${BLUE}Unloading existing agent...${NC}"
    launchctl unload "$DEST_PLIST" 2>/dev/null
    launchctl remove "$PLIST_NAME" 2>/dev/null
fi

# Copy plist file
echo -e "${BLUE}Installing LaunchAgent...${NC}"
cp "$SOURCE_PLIST" "$DEST_PLIST"

# Set correct permissions
chmod 644 "$DEST_PLIST"

# Load the agent
echo -e "${BLUE}Loading LaunchAgent...${NC}"
launchctl load -w "$DEST_PLIST"

# Check if loaded successfully
if launchctl list | grep -q "$PLIST_NAME"; then
    echo -e "${GREEN}✅ LaunchAgent installed and loaded successfully!${NC}"
    echo ""
    echo "The Claude Monitor will now:"
    echo "  • Start automatically on boot"
    echo "  • Restart if it crashes"
    echo "  • Log output to: ~/.claude/monitor/launchagent.log"
    echo ""
    echo "Useful commands:"
    echo "  • Check status:  launchctl list | grep $PLIST_NAME"
    echo "  • Stop monitor:  launchctl unload $DEST_PLIST"
    echo "  • Start monitor: launchctl load $DEST_PLIST"
    echo "  • View logs:     tail -f ~/.claude/monitor/launchagent.log"
    echo "  • Uninstall:     launchctl unload $DEST_PLIST && rm $DEST_PLIST"
else
    echo -e "${RED}✗ Failed to load LaunchAgent${NC}"
    echo "Try loading manually:"
    echo "  launchctl load -w $DEST_PLIST"
fi

echo "================================================"
