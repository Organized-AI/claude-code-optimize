#!/bin/bash

##
# Claude Code Optimizer - Pre-flight Dependency Checker
# Validates environment before installation
# Prevents: Silent failures, incomplete installations
##

# Strict error handling
set -euo pipefail

##
# Checks all system dependencies required for URL handler
# Returns: 0 if all dependencies present, 1 if any missing
# Output: Clear error messages for each missing dependency
##
check_dependencies() {
    local errors=0
    local warnings=0

    echo "Checking system dependencies..."
    echo ""

    # Track which dependencies are missing
    local missing_deps=()
    local version_errors=()

    ##
    # 1. Check macOS platform
    ##
    if [[ "$(uname)" != "Darwin" ]]; then
        echo "ERROR: This tool requires macOS (detected: $(uname))" >&2
        echo "       The URL handler uses macOS-specific LaunchAgents" >&2
        ((errors++))
    else
        echo "  Platform: macOS $(sw_vers -productVersion)"
    fi

    ##
    # 2. Check Node.js installation and version
    ##
    if ! command -v node &>/dev/null; then
        missing_deps+=("Node.js")
        echo "  Node.js: NOT FOUND" >&2
        echo "           Install with: brew install node" >&2
        ((errors++))
    else
        local node_version
        node_version=$(node -v | tr -d 'v')
        local node_major
        node_major=$(echo "$node_version" | cut -d'.' -f1)

        if [[ $node_major -lt 18 ]]; then
            version_errors+=("Node.js version $node_version < 18")
            echo "  Node.js: v$node_version (TOO OLD)" >&2
            echo "           Required: v18 or higher" >&2
            echo "           Update with: brew upgrade node" >&2
            ((errors++))
        else
            echo "  Node.js: v$node_version"
        fi
    fi

    ##
    # 3. Check npm availability
    ##
    if ! command -v npm &>/dev/null; then
        missing_deps+=("npm")
        echo "  npm: NOT FOUND" >&2
        echo "       npm should be included with Node.js" >&2
        echo "       Reinstall Node.js: brew reinstall node" >&2
        ((errors++))
    else
        local npm_version
        npm_version=$(npm -v)
        echo "  npm: v$npm_version"
    fi

    ##
    # 4. Check launchctl availability
    ##
    if ! command -v launchctl &>/dev/null; then
        missing_deps+=("launchctl")
        echo "  launchctl: NOT FOUND" >&2
        echo "             This is a macOS system utility - your system may be compromised" >&2
        ((errors++))
    else
        echo "  launchctl: Available"

        # Check if we can actually use launchctl (not sandboxed)
        if ! launchctl list &>/dev/null; then
            echo "  launchctl: SANDBOXED/RESTRICTED" >&2
            echo "             Cannot access LaunchAgents - check system permissions" >&2
            ((errors++))
        fi
    fi

    ##
    # 5. Check LaunchAgents directory permissions
    ##
    local launch_agents_dir="$HOME/Library/LaunchAgents"

    if [[ ! -d "$launch_agents_dir" ]]; then
        echo "  LaunchAgents: Creating directory at $launch_agents_dir"
        if ! mkdir -p "$launch_agents_dir" 2>/dev/null; then
            echo "  LaunchAgents: CANNOT CREATE DIRECTORY" >&2
            echo "                Check permissions for: $HOME/Library" >&2
            ((errors++))
        fi
    fi

    if [[ -d "$launch_agents_dir" ]]; then
        if [[ ! -w "$launch_agents_dir" ]]; then
            echo "  LaunchAgents: NO WRITE PERMISSION" >&2
            echo "                Directory: $launch_agents_dir" >&2
            echo "                Fix with: chmod u+w '$launch_agents_dir'" >&2
            ((errors++))
        else
            echo "  LaunchAgents: Writable ($launch_agents_dir)"
        fi
    fi

    ##
    # 6. Check Terminal.app exists
    ##
    local terminal_app="/Applications/Terminal.app"
    if [[ ! -d "$terminal_app" ]]; then
        echo "  Terminal.app: NOT FOUND" >&2
        echo "                Expected location: $terminal_app" >&2
        echo "                WARNING: URL handler may not work with alternative terminals" >&2
        ((warnings++))

        # Check for common alternative terminals
        local alt_terminals=(
            "/Applications/iTerm.app"
            "/Applications/Alacritty.app"
            "/Applications/Kitty.app"
        )

        for alt in "${alt_terminals[@]}"; do
            if [[ -d "$alt" ]]; then
                echo "                Found alternative: $alt (may need manual configuration)" >&2
            fi
        done
    else
        echo "  Terminal.app: Found"
    fi

    ##
    # 7. Check osascript availability
    ##
    if ! command -v osascript &>/dev/null; then
        missing_deps+=("osascript")
        echo "  osascript: NOT FOUND" >&2
        echo "             Required for Terminal automation" >&2
        ((errors++))
    else
        echo "  osascript: Available"
    fi

    ##
    # 8. Check realpath availability (used for path sanitization)
    ##
    if ! command -v realpath &>/dev/null; then
        # realpath might not be installed by default on older macOS
        echo "  realpath: NOT FOUND" >&2
        echo "            Install with: brew install coreutils" >&2
        missing_deps+=("realpath (coreutils)")
        ((errors++))
    else
        echo "  realpath: Available"
    fi

    ##
    # 9. Check disk space
    ##
    local available_space
    available_space=$(df -h "$HOME" | tail -1 | awk '{print $4}')
    echo "  Disk space: $available_space available"

    # Parse space (simple check - assumes format like "100Gi" or "50Mi")
    if [[ "$available_space" =~ ^[0-9]+Mi$ ]]; then
        local space_mb
        space_mb=$(echo "$available_space" | sed 's/Mi//')
        if [[ $space_mb -lt 100 ]]; then
            echo "               WARNING: Low disk space (< 100MB)" >&2
            ((warnings++))
        fi
    fi

    ##
    # Summary
    ##
    echo ""
    echo "================================"

    if [[ $errors -eq 0 ]] && [[ $warnings -eq 0 ]]; then
        echo "  All checks passed!"
        echo "  Ready to install URL handler."
        echo "================================"
        return 0
    elif [[ $errors -eq 0 ]] && [[ $warnings -gt 0 ]]; then
        echo "  Pre-flight checks passed with $warnings warning(s)"
        echo "  Installation may proceed with limitations"
        echo "================================"
        return 0
    else
        echo "  Pre-flight checks FAILED"
        echo "  Errors: $errors"
        echo "  Warnings: $warnings"
        echo "================================"
        echo ""

        if [[ ${#missing_deps[@]} -gt 0 ]]; then
            echo "Missing dependencies:"
            for dep in "${missing_deps[@]}"; do
                echo "  - $dep"
            done
            echo ""
        fi

        if [[ ${#version_errors[@]} -gt 0 ]]; then
            echo "Version issues:"
            for err in "${version_errors[@]}"; do
                echo "  - $err"
            done
            echo ""
        fi

        echo "Fix the above issues and try again."
        return 1
    fi
}

##
# Checks if Node.js project is built
# Returns: 0 if dist/ exists and has files, 1 otherwise
##
check_project_built() {
    local project_root="$1"

    if [[ ! -d "$project_root/dist" ]]; then
        echo "ERROR: Project not built - dist/ directory missing" >&2
        echo "       Run: npm run build" >&2
        return 1
    fi

    if [[ ! -f "$project_root/dist/cli.js" ]]; then
        echo "ERROR: CLI not found at dist/cli.js" >&2
        echo "       Run: npm run build" >&2
        return 1
    fi

    echo "  Project build: dist/cli.js found"
    return 0
}

##
# Checks if npm dependencies are installed
# Returns: 0 if node_modules exists, 1 otherwise
##
check_npm_installed() {
    local project_root="$1"

    if [[ ! -d "$project_root/node_modules" ]]; then
        echo "ERROR: npm dependencies not installed" >&2
        echo "       Run: npm install" >&2
        return 1
    fi

    echo "  npm packages: Installed"
    return 0
}

##
# Verifies URL handler is not already installed
# Returns: 0 if not installed, 1 if already present
##
check_not_already_installed() {
    local plist_path="$HOME/Library/LaunchAgents/com.claude.session-launcher.plist"

    if [[ -f "$plist_path" ]]; then
        echo "WARNING: URL handler already installed" >&2
        echo "         Existing plist: $plist_path" >&2
        echo "         Run ./scripts/uninstall-url-handler.sh first to reinstall" >&2
        return 1
    fi

    echo "  URL handler: Not yet installed"
    return 0
}

##
# Complete pre-flight check for installation
# Validates all dependencies AND project state
##
preflight_check() {
    local project_root="${1:-.}"

    echo "================================"
    echo "  Pre-flight Checks"
    echo "================================"
    echo ""

    local failed=0

    # System dependencies
    if ! check_dependencies; then
        ((failed++))
    fi

    echo ""

    # Project state
    if ! check_npm_installed "$project_root"; then
        ((failed++))
    fi

    if ! check_project_built "$project_root"; then
        ((failed++))
    fi

    if ! check_not_already_installed; then
        ((failed++))
    fi

    echo ""

    if [[ $failed -eq 0 ]]; then
        echo "All pre-flight checks passed!"
        return 0
    else
        echo "$failed pre-flight check(s) failed"
        return 1
    fi
}

# Export functions for use in other scripts
export -f check_dependencies
export -f check_project_built
export -f check_npm_installed
export -f check_not_already_installed
export -f preflight_check
