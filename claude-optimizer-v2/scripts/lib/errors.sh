#!/bin/bash

##
# Claude Code Optimizer - Error Handling Framework
# Provides rollback, cleanup, and user-friendly error reporting
# Uses bash traps for automatic cleanup on failures
##

# Strict error handling
set -euo pipefail

# Global state tracking for rollback
INSTALLATION_STATE=()
ERROR_OCCURRED=false
LOG_FILE="${LOG_FILE:-$HOME/.claude-optimizer/error.log}"

##
# Initialize error handling
# Sets up trap handlers for cleanup on exit/error
##
init_error_handling() {
    # Create log directory if needed
    mkdir -p "$(dirname "$LOG_FILE")"

    # Set up trap to call cleanup on exit
    trap cleanup_on_exit EXIT

    # Set up trap to call error handler on ERR
    trap 'error_handler $? $LINENO' ERR

    # Initialize state
    INSTALLATION_STATE=()
    ERROR_OCCURRED=false
}

##
# Error handler called on any command failure
# Arguments: $1 = exit code, $2 = line number
##
error_handler() {
    local exit_code=$1
    local line_number=$2

    ERROR_OCCURRED=true

    log "ERROR" "Command failed with exit code $exit_code at line $line_number"
    log "ERROR" "Installation interrupted - will attempt rollback"
}

##
# Logs a message to both console and log file
# Usage: log "LEVEL" "message"
# Levels: DEBUG, INFO, WARN, ERROR
##
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Format: [TIMESTAMP] [LEVEL] message
    local log_line="[$timestamp] [$level] $message"

    # Always write to log file
    echo "$log_line" >> "$LOG_FILE"

    # Write to stderr for ERROR and WARN, stdout for others
    case "$level" in
        ERROR)
            echo "$message" >&2
            ;;
        WARN)
            echo "WARNING: $message" >&2
            ;;
        INFO)
            echo "$message"
            ;;
        DEBUG)
            # Only show debug if DEBUG env var is set
            if [[ "${DEBUG:-0}" == "1" ]]; then
                echo "DEBUG: $message"
            fi
            ;;
    esac
}

##
# Records an installation step for potential rollback
# Usage: record_state "plist_created" "/path/to/file"
##
record_state() {
    local action="$1"
    local target="${2:-}"

    INSTALLATION_STATE+=("$action:$target")
    log "DEBUG" "State recorded: $action -> $target"
}

##
# Rollback installation to previous state
# Undoes all recorded state changes in reverse order
##
rollback_installation() {
    log "WARN" "Starting rollback of installation..."

    # Nothing to rollback if no state recorded
    if [[ ${#INSTALLATION_STATE[@]} -eq 0 ]]; then
        log "INFO" "No installation state to rollback"
        return 0
    fi

    local rollback_failed=0

    # Reverse order (LIFO)
    for (( idx=${#INSTALLATION_STATE[@]}-1 ; idx>=0 ; idx-- )); do
        local state="${INSTALLATION_STATE[idx]}"
        local action="${state%%:*}"
        local target="${state#*:}"

        log "INFO" "Rolling back: $action ($target)"

        case "$action" in
            plist_created)
                if [[ -f "$target" ]]; then
                    if rm -f "$target"; then
                        log "INFO" "  Removed plist: $target"
                    else
                        log "ERROR" "  Failed to remove plist: $target"
                        ((rollback_failed++))
                    fi
                fi
                ;;

            launchagent_loaded)
                if launchctl list | grep -q "com.claude.session-launcher"; then
                    if launchctl unload "$target" 2>/dev/null; then
                        log "INFO" "  Unloaded LaunchAgent: $target"
                    else
                        log "ERROR" "  Failed to unload LaunchAgent: $target"
                        ((rollback_failed++))
                    fi
                fi
                ;;

            file_created)
                if [[ -f "$target" ]]; then
                    if rm -f "$target"; then
                        log "INFO" "  Removed file: $target"
                    else
                        log "ERROR" "  Failed to remove file: $target"
                        ((rollback_failed++))
                    fi
                fi
                ;;

            directory_created)
                if [[ -d "$target" ]] && [[ -z "$(ls -A "$target")" ]]; then
                    if rmdir "$target"; then
                        log "INFO" "  Removed directory: $target"
                    else
                        log "ERROR" "  Failed to remove directory: $target"
                        ((rollback_failed++))
                    fi
                fi
                ;;

            backup_created)
                # Restore from backup
                local backup_path="$target"
                local original_path="${backup_path%.backup}"

                if [[ -f "$backup_path" ]]; then
                    if mv "$backup_path" "$original_path"; then
                        log "INFO" "  Restored backup: $original_path"
                    else
                        log "ERROR" "  Failed to restore backup: $backup_path"
                        ((rollback_failed++))
                    fi
                fi
                ;;

            *)
                log "WARN" "  Unknown rollback action: $action"
                ;;
        esac
    done

    # Clear state after rollback
    INSTALLATION_STATE=()

    if [[ $rollback_failed -eq 0 ]]; then
        log "INFO" "Rollback completed successfully"
        return 0
    else
        log "ERROR" "Rollback completed with $rollback_failed failure(s)"
        log "ERROR" "Manual cleanup may be required - check $LOG_FILE"
        return 1
    fi
}

##
# Cleanup handler called on script exit
# Performs rollback if error occurred
##
cleanup_on_exit() {
    local exit_code=$?

    if [[ "$ERROR_OCCURRED" == "true" ]] || [[ $exit_code -ne 0 ]]; then
        log "ERROR" "Script exiting with error (code: $exit_code)"
        rollback_installation
    fi
}

##
# Converts technical errors to user-friendly messages
# Provides actionable help for common issues
##
user_friendly_error() {
    local error_type="$1"
    local error_details="${2:-}"

    case "$error_type" in
        permission_denied)
            cat <<EOF

INSTALLATION FAILED: Permission Denied

The installer cannot write to the required directory.

Problem: $error_details

Solutions:
  1. Check directory permissions:
     ls -la "$error_details"

  2. Fix permissions:
     chmod u+w "$error_details"

  3. If on a managed Mac, contact IT for assistance

EOF
            ;;

        node_not_found)
            cat <<EOF

INSTALLATION FAILED: Node.js Not Found

The URL handler requires Node.js 18 or higher.

Solutions:
  1. Install Node.js via Homebrew:
     brew install node

  2. Or download from: https://nodejs.org

  3. Verify installation:
     node -v
     # Should show: v18.x.x or higher

EOF
            ;;

        launchctl_failed)
            cat <<EOF

INSTALLATION FAILED: LaunchAgent Registration Failed

The system could not register the URL handler.

Problem: $error_details

Solutions:
  1. Check if launchctl is working:
     launchctl list

  2. Check system permissions:
     ls -la ~/Library/LaunchAgents

  3. Try manual load:
     launchctl load ~/Library/LaunchAgents/com.claude.session-launcher.plist

  4. Check system logs:
     log show --predicate 'subsystem == "com.apple.launchd"' --last 5m

EOF
            ;;

        plist_creation_failed)
            cat <<EOF

INSTALLATION FAILED: Configuration File Creation Failed

Could not create the LaunchAgent configuration file.

Problem: $error_details

Solutions:
  1. Check disk space:
     df -h ~

  2. Check permissions:
     ls -la ~/Library/LaunchAgents

  3. Create directory manually:
     mkdir -p ~/Library/LaunchAgents
     chmod u+w ~/Library/LaunchAgents

EOF
            ;;

        already_installed)
            cat <<EOF

INSTALLATION ABORTED: URL Handler Already Installed

An existing installation was detected.

Location: $error_details

Solutions:
  1. Uninstall first, then reinstall:
     ./scripts/uninstall-url-handler.sh
     ./scripts/install-url-handler.sh

  2. Or manually remove:
     launchctl unload ~/Library/LaunchAgents/com.claude.session-launcher.plist
     rm ~/Library/LaunchAgents/com.claude.session-launcher.plist
     ./scripts/install-url-handler.sh

EOF
            ;;

        invalid_url)
            cat <<EOF

URL PROCESSING FAILED: Invalid URL Format

The provided URL does not match the expected format.

Received: $error_details

Expected format:
  claude-session://start?plan=<name>&project=<path>

Examples:
  claude-session://start?plan=10
  claude-session://start?plan=SESSION_10_PLAN&project=/path/to/project

EOF
            ;;

        plan_not_found)
            cat <<EOF

SESSION START FAILED: Plan Not Found

The specified session plan does not exist.

Plan requested: $error_details

Solutions:
  1. List available plans:
     ls docs/planning/SESSION_*_PLAN.md

  2. Create the plan file:
     # Create: docs/planning/SESSION_${error_details}_PLAN.md

  3. Check plan name in URL (case-sensitive)

EOF
            ;;

        *)
            cat <<EOF

ERROR: $error_type

Details: $error_details

For more information, check the log file:
  $LOG_FILE

For help, see documentation:
  ./docs/URL_HANDLER_SETUP.md

EOF
            ;;
    esac
}

##
# Safe exit with error code and optional user-friendly message
# Usage: safe_exit 1 "permission_denied" "/path/to/dir"
##
safe_exit() {
    local exit_code=$1
    local error_type="${2:-}"
    local error_details="${3:-}"

    if [[ -n "$error_type" ]]; then
        user_friendly_error "$error_type" "$error_details"
        log "ERROR" "Exiting with error: $error_type ($error_details)"
    fi

    exit "$exit_code"
}

##
# Progress indicator for long-running operations
# Usage: with_progress "Installing..." run_some_command args
# Or:    with_progress "Installing..." (just prints message)
##
with_progress() {
    local message="$1"
    shift
    local command=("$@")

    echo -n "$message "

    # If no command provided, just print the message
    if [ ${#command[@]} -eq 0 ]; then
        echo ""
        return 0
    fi

    # Run command, capture output
    local output
    local exit_code=0

    if output=$("${command[@]}" 2>&1); then
        echo "Done"
    else
        exit_code=$?
        echo "FAILED"
        log "ERROR" "Command failed: ${command[*]}"
        log "ERROR" "Output: $output"
        return $exit_code
    fi
}

##
# Confirmation prompt for destructive operations
# Usage: confirm "Are you sure?" || exit 1
##
confirm() {
    local prompt="$1"
    local response

    read -r -p "$prompt (y/N): " response

    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

##
# Show installation summary
# Displays what was installed and next steps
##
show_success_summary() {
    cat <<'EOF'

================================
  Installation Successful!
================================

URL Handler installed and registered.

Next Steps:
  1. Test the installation:
     open "claude-session://start?plan=10"

  2. The URL handler is now active system-wide

  3. URLs will open Terminal and start sessions

Troubleshooting:
  - View logs: tail -f ~/.claude-optimizer/url-handler.log
  - Uninstall: ./scripts/uninstall-url-handler.sh
  - Docs: ./docs/URL_HANDLER_SETUP.md

EOF
}

# Export functions for use in other scripts
export -f init_error_handling
export -f error_handler
export -f log
export -f record_state
export -f rollback_installation
export -f cleanup_on_exit
export -f user_friendly_error
export -f safe_exit
export -f with_progress
export -f confirm
export -f show_success_summary
