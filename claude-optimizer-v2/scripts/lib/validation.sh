#!/bin/bash

##
# Claude Code Optimizer - Input Validation Library
# Security-first validation for URL parameters and user inputs
# Prevents: Command injection, path traversal, XSS-like attacks
##

# Strict error handling
set -euo pipefail

##
# Validates session plan name format
# Only allows: alphanumeric, underscore, hyphen
# REJECTS: 10;rm -rf /, ../../../etc/passwd, 10$(whoami), 10`whoami`
# ACCEPTS: 10, SESSION_10_PLAN, SESSION_6B, session-10, plan_v2
#
# Usage: validate_plan_name "10" || exit 1
# Returns: 0 if valid, 1 if invalid
##
validate_plan_name() {
    local plan="$1"

    # Check for empty input
    if [[ -z "$plan" ]]; then
        echo "ERROR: Plan name cannot be empty" >&2
        return 1
    fi

    # Check length (prevent buffer overflow-style attacks)
    if [[ ${#plan} -gt 100 ]]; then
        echo "ERROR: Plan name too long (max 100 characters)" >&2
        echo "Provided: ${#plan} characters" >&2
        return 1
    fi

    # Regex validation: Only alphanumeric, underscore, hyphen
    # ^         = start of string
    # [a-zA-Z0-9_-]+ = one or more allowed characters
    # $         = end of string
    if [[ ! "$plan" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        echo "ERROR: Invalid plan name format: '$plan'" >&2
        echo "Allowed characters: letters, numbers, underscore (_), hyphen (-)" >&2
        echo "REJECTED characters detected: Special chars, spaces, or shell metacharacters" >&2
        return 1
    fi

    # Additional security: Check for common shell metacharacters
    # This is redundant with regex above, but defense in depth
    local dangerous_chars=';&|$`<>()"'\'
    if [[ "$plan" =~ [$dangerous_chars] ]]; then
        echo "ERROR: Plan name contains dangerous shell metacharacters" >&2
        echo "Plan: '$plan'" >&2
        return 1
    fi

    # All checks passed
    return 0
}

##
# Sanitizes and validates file system paths
# Prevents: Path traversal (../../etc/passwd), symlink attacks
# Resolves: Relative paths to absolute, validates existence
#
# Usage: sanitize_path "/some/path" || exit 1
# Returns: 0 if valid, 1 if invalid
# Output: Prints absolute path to stdout if valid
##
sanitize_path() {
    local input_path="$1"
    local check_exists="${2:-true}"  # Default: check existence

    # Check for empty input
    if [[ -z "$input_path" ]]; then
        echo "ERROR: Path cannot be empty" >&2
        return 1
    fi

    # Check for suspicious patterns BEFORE resolution
    # Detect obvious path traversal attempts (looking for literal .. as path component)
    # Match patterns like: ../../ or /../.. or ../ at start
    if [[ "$input_path" =~ (^|/)\.\.(\/|$) ]]; then
        # Check if it's a relative path trying to go up
        # Absolute paths won't trigger this, only relative ones with ..
        if [[ "$input_path" != /* ]]; then
            echo "ERROR: Path traversal detected: '$input_path'" >&2
            echo "Relative paths with '..' are not allowed" >&2
            return 1
        fi
    fi

    # Resolve to absolute path
    # macOS realpath doesn't support -m flag, so always use perl fallback
    local resolved_path

    if false; then  # Disabled - macOS realpath is incompatible
        # GNU realpath follows symlinks and resolves to canonical path
        # -m: Allow non-existent paths (we'll check existence separately)
        if ! resolved_path=$(realpath -m "$input_path" 2>/dev/null); then
            echo "ERROR: Failed to resolve path: '$input_path'" >&2
            return 1
        fi
    else
        # Fallback: Use perl for path resolution (available on all macOS)
        if [[ "$input_path" == /* ]]; then
            # Already absolute
            resolved_path="$input_path"
        elif [[ "$input_path" == "~"* ]]; then
            # Expand tilde
            resolved_path="${input_path/#\~/$HOME}"
        else
            # Make relative path absolute
            resolved_path="$(pwd)/$input_path"
        fi

        # Normalize path (remove .., ., double slashes)
        # Use Cwd::abs_path only for existing paths, otherwise just normalize
        if [[ -e "$resolved_path" ]]; then
            resolved_path=$(perl -MCwd -e 'print Cwd::abs_path($ARGV[0])' "$resolved_path" 2>/dev/null || echo "$resolved_path")
        else
            # For non-existent paths, manually normalize
            # Remove trailing slashes, collapse // to /, but keep the path as-is
            resolved_path="${resolved_path%/}"
            resolved_path="${resolved_path//\/\//\/}"
        fi
    fi

    # Check if path exists (if requested)
    if [[ "$check_exists" == "true" ]]; then
        if [[ ! -e "$resolved_path" ]]; then
            echo "ERROR: Path does not exist: '$resolved_path'" >&2
            echo "Original input: '$input_path'" >&2
            return 1
        fi
    fi

    # Additional security: Ensure path doesn't escape to dangerous locations
    # Prevent access to critical system directories only

    # First check if path is in allowed safe list
    local is_safe=false
    if [[ "$resolved_path" == "$HOME"* ]] || \
       [[ "$resolved_path" == "/tmp"* ]] || \
       [[ "$resolved_path" == "/var/tmp"* ]] || \
       [[ "$resolved_path" == "/var/folders"* ]] || \
       [[ "$resolved_path" == "/private/tmp"* ]] || \
       [[ "$resolved_path" == "/private/var/tmp"* ]] || \
       [[ "$resolved_path" == "/private/var/folders"* ]] || \
       [[ "$resolved_path" == "/Users/"* ]]; then
        is_safe=true
    fi

    # If not in safe list, check against dangerous paths
    if [[ "$is_safe" == "false" ]]; then
        local dangerous_paths=(
            "/etc"
            "/private/etc"
            "/var/root"
            "/private/var/root"
            "/System"
            "/.."
        )

        for dangerous in "${dangerous_paths[@]}"; do
            if [[ "$resolved_path" == "$dangerous"* ]]; then
                echo "ERROR: Access to system directory denied: '$resolved_path'" >&2
                return 1
            fi
        done
    fi

    # Output the sanitized, absolute path
    echo "$resolved_path"
    return 0
}

##
# Safely parses URL parameters without eval
# Extracts key=value pairs from URL query string
# Handles: URL encoding (%20, %2F, etc.)
#
# Usage: parse_url_safe "claude-session://start?plan=10&project=/path"
# Returns: Sets global variables PARSED_PLAN, PARSED_PROJECT, PARSED_COMMAND
# Exit codes: 0 if valid, 1 if invalid
##
parse_url_safe() {
    local url="$1"

    # Initialize output variables (use globals for easy access by caller)
    PARSED_COMMAND=""
    PARSED_PLAN=""
    PARSED_PROJECT=""

    # Check for empty URL
    if [[ -z "$url" ]]; then
        echo "ERROR: URL cannot be empty" >&2
        return 1
    fi

    # Validate URL scheme
    if [[ ! "$url" =~ ^claude-session:// ]]; then
        echo "ERROR: Invalid URL scheme. Expected 'claude-session://'" >&2
        echo "Received: '$url'" >&2
        return 1
    fi

    # Extract command (e.g., "start" from claude-session://start?...)
    # Pattern: claude-session://COMMAND?params or claude-session://COMMAND
    local command_part
    command_part=$(echo "$url" | sed -n 's|^claude-session://\([^?]*\).*|\1|p')

    if [[ -z "$command_part" ]]; then
        echo "ERROR: Failed to extract command from URL" >&2
        return 1
    fi

    PARSED_COMMAND="$command_part"

    # Validate command (only "start" is supported)
    if [[ "$PARSED_COMMAND" != "start" ]]; then
        echo "ERROR: Unknown command '$PARSED_COMMAND'. Only 'start' is supported." >&2
        return 1
    fi

    # Check if URL has query parameters
    if [[ ! "$url" =~ \? ]]; then
        echo "ERROR: URL missing required parameters (no '?' found)" >&2
        echo "Usage: claude-session://start?plan=<name>&project=<path>" >&2
        return 1
    fi

    # Extract query string (everything after first ?)
    local query_string
    query_string="${url#*\?}"

    if [[ -z "$query_string" ]]; then
        echo "ERROR: URL has '?' but no parameters" >&2
        return 1
    fi

    # Parse query parameters
    # Split on & to get key=value pairs
    # Use IFS to safely split without word splitting issues
    IFS='&' read -ra params <<< "$query_string"

    for param in "${params[@]}"; do
        # Skip empty parameters
        [[ -z "$param" ]] && continue

        # Split on = to get key and value
        # Use parameter expansion to avoid eval
        local key="${param%%=*}"
        local value="${param#*=}"

        # URL decode the value
        # Replace %XX with corresponding character
        value=$(url_decode "$value")

        case "$key" in
            plan)
                PARSED_PLAN="$value"
                ;;
            project)
                PARSED_PROJECT="$value"
                ;;
            *)
                echo "WARNING: Unknown URL parameter ignored: '$key'" >&2
                ;;
        esac
    done

    # Validate required parameter
    if [[ -z "$PARSED_PLAN" ]]; then
        echo "ERROR: Missing required parameter 'plan' in URL" >&2
        echo "Usage: claude-session://start?plan=<name>&project=<path>" >&2
        return 1
    fi

    return 0
}

##
# URL decodes a string
# Converts %20 -> space, %2F -> /, etc.
#
# Usage: decoded=$(url_decode "hello%20world")
##
url_decode() {
    local url_encoded="$1"

    # Use printf to decode hex sequences
    # This is safer than eval or other dynamic execution
    local decoded
    decoded=$(printf '%b' "${url_encoded//%/\\x}")

    echo "$decoded"
}

##
# Validates that a plan file exists in the planning directory
# Checks multiple possible filenames
#
# Usage: validate_plan_exists "10" "/path/to/project" || exit 1
# Returns: 0 if plan exists, 1 if not found
##
validate_plan_exists() {
    local plan="$1"
    local project_root="$2"

    # Possible plan file locations
    local plan_files=(
        "$project_root/docs/planning/SESSION_${plan}_PLAN.md"
        "$project_root/docs/planning/${plan}.md"
        "$project_root/docs/planning/SESSION_${plan}.md"
    )

    # Check if any plan file exists
    for plan_file in "${plan_files[@]}"; do
        if [[ -f "$plan_file" ]]; then
            echo "INFO: Found plan at: $plan_file" >&2
            return 0
        fi
    done

    # No plan file found
    echo "ERROR: Session plan not found: '$plan'" >&2
    echo "Searched locations:" >&2
    for plan_file in "${plan_files[@]}"; do
        echo "  - $plan_file" >&2
    done
    return 1
}

##
# Master validation function
# Validates all inputs from a URL in one call
#
# Usage: validate_url_inputs "claude-session://start?plan=10" "/path/to/project" || exit 1
# Returns: 0 if all validations pass, 1 otherwise
# Sets globals: VALIDATED_PLAN, VALIDATED_PROJECT
##
validate_url_inputs() {
    local url="$1"
    local default_project="${2:-}"

    # Parse URL
    if ! parse_url_safe "$url"; then
        return 1
    fi

    # Validate plan name format
    if ! validate_plan_name "$PARSED_PLAN"; then
        echo "ERROR: Plan name failed security validation" >&2
        return 1
    fi

    # Use default project if none provided
    local project_path="${PARSED_PROJECT:-$default_project}"

    if [[ -z "$project_path" ]]; then
        echo "ERROR: No project path provided in URL or default" >&2
        return 1
    fi

    # Sanitize and validate project path
    local validated_path
    if ! validated_path=$(sanitize_path "$project_path" true); then
        echo "ERROR: Project path failed security validation" >&2
        return 1
    fi

    # Validate plan exists
    if ! validate_plan_exists "$PARSED_PLAN" "$validated_path"; then
        echo "ERROR: Plan does not exist in project" >&2
        return 1
    fi

    # Set output variables
    VALIDATED_PLAN="$PARSED_PLAN"
    VALIDATED_PROJECT="$validated_path"

    return 0
}

# Export functions for use in other scripts
export -f validate_plan_name
export -f sanitize_path
export -f parse_url_safe
export -f url_decode
export -f validate_plan_exists
export -f validate_url_inputs
