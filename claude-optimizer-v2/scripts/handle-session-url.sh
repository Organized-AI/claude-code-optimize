#!/bin/bash

##
# Claude Code Optimizer - URL Handler
# Processes claude-session:// URLs and launches sessions
##

set -e

URL="$1"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Log URL handling (for debugging)
LOG_FILE="$HOME/.claude-optimizer/url-handler.log"
mkdir -p "$(dirname "$LOG_FILE")"
echo "[$(date)] Received URL: $URL" >> "$LOG_FILE"

# Validate URL format
if [[ ! "$URL" =~ ^claude-session:// ]]; then
    echo "Error: Invalid URL scheme. Expected claude-session://"
    exit 1
fi

# Extract command from URL (e.g., "start" from claude-session://start?...)
COMMAND=$(echo "$URL" | sed 's|claude-session://\([^?]*\).*|\1|')

if [[ "$COMMAND" != "start" ]]; then
    echo "Error: Unknown command '$COMMAND'. Only 'start' is supported."
    exit 1
fi

# TODO(human): Parse URL parameters
# The URL comes in as: claude-session://start?plan=10&project=/path/to/proj
# You need to extract:
# - PLAN: the session plan identifier (e.g., "10", "SESSION_10_PLAN")
# - PROJECT_PATH: the project directory path (optional, defaults to PROJECT_ROOT)
#
# Hints:
# 1. Strip the "claude-session://start?" prefix
# 2. Split on "&" to get key=value pairs
# 3. Extract values for "plan=" and "project="
# 4. Handle URL encoding (e.g., %2F for /)
#
# Example approaches:
# - Using sed: echo "$URL" | sed 's/.*plan=\([^&]*\).*/\1/'
# - Using parameter expansion: ${URL#*plan=} then ${result%%&*}
# - Using grep: echo "$URL" | grep -oP 'plan=\K[^&]*'
#
# Set these variables:
PLAN=""           # Session plan identifier
PROJECT_PATH=""   # Project path (or empty to use PROJECT_ROOT)


# After parsing (this code runs after you've set PLAN and PROJECT_PATH above)

# Validate required parameters
if [[ -z "$PLAN" ]]; then
    echo "Error: Missing 'plan' parameter in URL"
    echo "Usage: claude-session://start?plan=<identifier>&project=<path>"
    exit 1
fi

# Default to PROJECT_ROOT if no project specified
if [[ -z "$PROJECT_PATH" ]]; then
    PROJECT_PATH="$PROJECT_ROOT"
fi

# Decode URL encoding in paths (e.g., %2F -> /)
PROJECT_PATH=$(printf '%b' "${PROJECT_PATH//%/\\x}")

# Validate project path exists
if [[ ! -d "$PROJECT_PATH" ]]; then
    echo "Error: Project path does not exist: $PROJECT_PATH"
    exit 1
fi

# Log the parsed parameters
echo "[$(date)] Parsed - Plan: $PLAN, Project: $PROJECT_PATH" >> "$LOG_FILE"

# Change to project directory
cd "$PROJECT_PATH"

# Build the command
SESSION_COMMAND="node dist/cli.js session start $PLAN"

# Open Terminal and run the command
# This uses AppleScript to open a new Terminal window with the command
osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$PROJECT_PATH' && echo '🚀 Starting Claude Session: $PLAN' && echo '' && $SESSION_COMMAND"
end tell
EOF

echo "[$(date)] Session launched successfully" >> "$LOG_FILE"
