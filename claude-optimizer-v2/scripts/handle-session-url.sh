#!/bin/bash

##
# Claude Code Optimizer - URL Handler
# Processes claude-session:// URLs and launches sessions
##

set -e

URL="$1"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source security libraries from Phase 0
source "$SCRIPT_DIR/lib/validation.sh"
source "$SCRIPT_DIR/lib/errors.sh"

# Initialize error handling with automatic cleanup
init_error_handling

# Log URL handling (for debugging)
LOG_FILE="$HOME/.claude-optimizer/url-handler.log"
mkdir -p "$(dirname "$LOG_FILE")"
log "INFO" "Received URL: $URL"

# Validate URL format using security library
if [[ ! "$URL" =~ ^claude-session:// ]]; then
    user_friendly_error "Invalid URL scheme" "URL must start with claude-session://"
    safe_exit 1
fi

# Extract command from URL (e.g., "start" from claude-session://start?...)
COMMAND=$(echo "$URL" | sed 's|claude-session://\([^?]*\).*|\1|')

if [[ "$COMMAND" != "start" ]]; then
    user_friendly_error "Unknown command" "Only 'start' command is supported, got: $COMMAND"
    safe_exit 1
fi

log "INFO" "Command validated: $COMMAND"

# Parse URL parameters
# Extract plan/phase and project from URL using regex matching
# Example: claude-session://start?plan=12&project=/path
# Example: claude-session://start?phase=Planning&project=/path

# Extract plan parameter (optional)
if [[ "$URL" =~ plan=([^&]*) ]]; then
    PLAN="${BASH_REMATCH[1]}"
fi

# Extract phase parameter (optional, alternative to plan)
if [[ "$URL" =~ phase=([^&]*) ]]; then
    PHASE="${BASH_REMATCH[1]}"
    # URL decode the phase name
    PHASE=$(echo -e "${PHASE//%/\\x}")
fi

# Extract project parameter (required)
if [[ "$URL" =~ project=([^&]*) ]]; then
    PROJECT_PATH="${BASH_REMATCH[1]}"
    # URL decode the project path
    PROJECT_PATH=$(echo -e "${PROJECT_PATH//%/\\x}")
fi

log "INFO" "Parsed URL - plan: ${PLAN:-<none>}, phase: ${PHASE:-<none>}, project: ${PROJECT_PATH:-<default>}"


# After parsing (this code runs after you've set PLAN/PHASE and PROJECT_PATH above)

# Validate that we have either plan or phase
if [[ -z "$PLAN" && -z "$PHASE" ]]; then
    user_friendly_error "Missing session parameter" "URL must include either plan=<identifier> or phase=<name>"
    echo ""
    echo "Usage: claude-session://start?plan=<identifier>&project=<path>"
    echo "   or: claude-session://start?phase=<name>&project=<path>"
    safe_exit 1
fi

# Default to PROJECT_ROOT if no project specified
if [[ -z "$PROJECT_PATH" ]]; then
    PROJECT_PATH="$PROJECT_ROOT"
    log "INFO" "Using default project path: $PROJECT_ROOT"
fi

# SECURITY: Validate inputs using Phase 0 security library
log "INFO" "Validating inputs - Plan: ${PLAN:-<none>}, Phase: ${PHASE:-<none>}, Project: $PROJECT_PATH"

# Validate plan name format if provided (blocks command injection)
if [[ -n "$PLAN" ]]; then
    if ! validate_plan_name "$PLAN"; then
        user_friendly_error "Invalid plan name" "Plan must be alphanumeric with underscores/hyphens only"
        safe_exit 1
    fi
fi

# Sanitize and validate project path (blocks path traversal)
VALIDATED_PROJECT=$(sanitize_path "$PROJECT_PATH") || {
    user_friendly_error "Invalid project path" "Path failed security validation: $PROJECT_PATH"
    safe_exit 1
}
PROJECT_PATH="$VALIDATED_PROJECT"

# Verify plan file exists if using plan mode
if [[ -n "$PLAN" ]]; then
    if ! validate_plan_exists "$PLAN" "$PROJECT_ROOT"; then
        user_friendly_error "Plan not found" "No plan file found for: $PLAN"
        safe_exit 1
    fi
fi

# Log the validated parameters
log "INFO" "Validated - Plan: ${PLAN:-<none>}, Phase: ${PHASE:-<none>}, Project: $PROJECT_PATH"

# Change to project directory
cd "$PROJECT_PATH" || {
    user_friendly_error "Cannot change directory" "Failed to access: $PROJECT_PATH"
    safe_exit 1
}

# Build the command (using validated inputs)
if [[ -n "$PLAN" ]]; then
    # Plan-based session: use the session start command
    SESSION_COMMAND="node dist/cli.js session start $PLAN"
    SESSION_TITLE="$PLAN"
else
    # Phase-based session: open Claude Code with context message
    SESSION_COMMAND="claude"
    SESSION_TITLE="$PHASE"
fi

log "INFO" "Launching Terminal with command: $SESSION_COMMAND"

# Create context message for the user
CONTEXT_MESSAGE="📅 Calendar Session: $SESSION_TITLE"
if [[ -n "$PHASE" ]]; then
    CONTEXT_MESSAGE="$CONTEXT_MESSAGE\n📋 Phase: $PHASE\n📂 Project: $(basename \"$PROJECT_PATH\")\n\n💡 Resume your work on: $PHASE"
fi

# Open Terminal and run the command
# This uses AppleScript to open a new Terminal window with the command
# NOTE: Variables are already validated for security
osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$PROJECT_PATH' && echo '$CONTEXT_MESSAGE' && echo '' && $SESSION_COMMAND"
end tell
EOF

log "INFO" "Session launched successfully"
echo "✅ Session launched in Terminal"
