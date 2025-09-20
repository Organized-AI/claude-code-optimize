#!/bin/bash
# Test script to verify monitoring setup

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Claude Monitor Test Script${NC}"
echo "================================================"

# Test 1: Check Claude Code directory
echo -e "\n${BLUE}Test 1: Claude Code Directory${NC}"
CLAUDE_CODE_DIR="$HOME/.claude/projects"
if [ -d "$CLAUDE_CODE_DIR" ]; then
    echo -e "${GREEN}✓${NC} Claude Code directory exists"
    echo "  Path: $CLAUDE_CODE_DIR"
    
    # Count JSONL files
    JSONL_COUNT=$(find "$CLAUDE_CODE_DIR" -name "*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
    echo "  Found $JSONL_COUNT JSONL session files"
    
    # Show recent session
    RECENT=$(find "$CLAUDE_CODE_DIR" -name "*.jsonl" -type f -exec ls -t {} + 2>/dev/null | head -1)
    if [ ! -z "$RECENT" ]; then
        echo "  Most recent: $(basename "$RECENT")"
        echo "  Modified: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$RECENT" 2>/dev/null)"
    fi
else
    echo -e "${RED}✗${NC} Claude Code directory not found"
fi

# Test 2: Check Claude Desktop directory
echo -e "\n${BLUE}Test 2: Claude Desktop Directory${NC}"
CLAUDE_DESKTOP_DIR="$HOME/Library/Application Support/Claude"
if [ -d "$CLAUDE_DESKTOP_DIR" ]; then
    echo -e "${GREEN}✓${NC} Claude Desktop directory exists"
    echo "  Path: $CLAUDE_DESKTOP_DIR"
    
    # Check subdirectories
    for subdir in "IndexedDB" "Local Storage" "Session Storage"; do
        if [ -d "$CLAUDE_DESKTOP_DIR/$subdir" ]; then
            echo -e "  ${GREEN}✓${NC} $subdir exists"
        else
            echo -e "  ${YELLOW}⚠${NC} $subdir not found"
        fi
    done
else
    echo -e "${RED}✗${NC} Claude Desktop directory not found"
fi

# Test 3: Check if fswatch is installed
echo -e "\n${BLUE}Test 3: Dependencies${NC}"
if command -v fswatch &> /dev/null; then
    echo -e "${GREEN}✓${NC} fswatch is installed"
    echo "  Version: $(fswatch --version 2>&1 | head -1)"
else
    echo -e "${YELLOW}⚠${NC} fswatch not installed"
    echo "  Install with: brew install fswatch"
fi

# Test 4: Check if dashboard is reachable
echo -e "\n${BLUE}Test 4: Dashboard Connection${NC}"
DASHBOARD="http://localhost:3001/api/activity"
if curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD" | grep -q "000"; then
    echo -e "${YELLOW}⚠${NC} Dashboard not reachable at localhost:3001"
    echo "  Dashboard may not be running"
else
    echo -e "${GREEN}✓${NC} Dashboard endpoint is reachable"
fi

# Test 5: Check running processes
echo -e "\n${BLUE}Test 5: Running Processes${NC}"
if pgrep -x "Claude" > /dev/null; then
    echo -e "${GREEN}✓${NC} Claude Desktop is running (PID: $(pgrep -x "Claude"))"
else
    echo -e "${YELLOW}○${NC} Claude Desktop is not running"
fi

if pgrep -f "claude" > /dev/null; then
    echo -e "${GREEN}✓${NC} Claude CLI process detected (PID: $(pgrep -f "claude" | head -1))"
else
    echo -e "${YELLOW}○${NC} No Claude CLI process detected"
fi

# Test 6: Recent activity
echo -e "\n${BLUE}Test 6: Recent Activity${NC}"

# Check Claude Code activity
RECENT_CODE=$(find "$CLAUDE_CODE_DIR" -name "*.jsonl" -mtime -1 2>/dev/null | wc -l | tr -d ' ')
if [ "$RECENT_CODE" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Claude Code: $RECENT_CODE sessions in last 24 hours"
else
    echo -e "${YELLOW}○${NC} Claude Code: No sessions in last 24 hours"
fi

# Check Claude Desktop activity
if [ -d "$CLAUDE_DESKTOP_DIR/IndexedDB" ]; then
    RECENT_DESKTOP=$(find "$CLAUDE_DESKTOP_DIR/IndexedDB" -name "*.ldb" -o -name "*.log" -mtime -1 2>/dev/null | wc -l | tr -d ' ')
    if [ "$RECENT_DESKTOP" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Claude Desktop: $RECENT_DESKTOP database changes in last 24 hours"
    else
        echo -e "${YELLOW}○${NC} Claude Desktop: No database changes in last 24 hours"
    fi
fi

echo -e "\n================================================"
echo -e "${GREEN}Test Complete!${NC}"
echo ""
echo "Summary:"
echo "• Claude Code data: $CLAUDE_CODE_DIR"
echo "• Claude Desktop data: $CLAUDE_DESKTOP_DIR"
echo "• Monitor script: ./unified-claude-monitor.sh"
echo ""

if ! command -v fswatch &> /dev/null; then
    echo -e "${YELLOW}Action Required:${NC}"
    echo "Install fswatch to enable monitoring:"
    echo "  brew install fswatch"
    echo ""
fi

echo "To start monitoring, run:"
echo "  ./monitors/unified-claude-monitor.sh"
echo "================================================"
