#!/bin/bash

set -e

# Moonlock CLI Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/moonlock/cli/main/install.sh | bash

INSTALL_DIR="/usr/local/bin"
BINARY_NAME="moonlock"
GITHUB_REPO="moonlock/cli"  # Update with actual repo when available
VERSION="latest"
CONFIG_DIR="$HOME/.moonlock"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_error "Please do not run this script as root"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Node.js version if installed
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_warning "Node.js version $NODE_VERSION detected. Version 18+ recommended for development."
        else
            log_success "Node.js version $(node -v) detected"
        fi
    fi
    
    # Check for required tools
    local missing_tools=()
    
    if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
        missing_tools+=("curl or wget")
    fi
    
    if ! command -v tar >/dev/null 2>&1; then
        missing_tools+=("tar")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install the missing tools and try again"
        exit 1
    fi
    
    log_success "System requirements satisfied"
}

# Detect platform and architecture
detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="x64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) 
            log_error "Unsupported architecture: $ARCH"
            log_info "Supported architectures: x86_64, arm64"
            exit 1 
            ;;
    esac
    
    case $OS in
        darwin)
            PLATFORM="macos"
            if [ "$ARCH" = "arm64" ]; then
                BINARY_FILE="moonlock-macos-arm64"
            else
                BINARY_FILE="moonlock-macos-x64"
            fi
            ;;
        linux)
            PLATFORM="linux"
            BINARY_FILE="moonlock-linux-x64"
            ;;
        *)
            log_error "Unsupported operating system: $OS"
            log_info "Supported platforms: macOS, Linux"
            exit 1
            ;;
    esac
    
    log_info "Detected platform: $PLATFORM-$ARCH"
}

# Get latest release info
get_latest_release() {
    log_info "Fetching latest release information..."
    
    if [ "$VERSION" = "latest" ]; then
        if command -v curl >/dev/null 2>&1; then
            LATEST_VERSION=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        elif command -v wget >/dev/null 2>&1; then
            LATEST_VERSION=$(wget -qO- "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
        fi
        
        if [ -z "$LATEST_VERSION" ]; then
            log_warning "Could not fetch latest version, using development build"
            DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/latest/$BINARY_FILE"
        else
            VERSION="$LATEST_VERSION"
            DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/$VERSION/$BINARY_FILE"
            log_success "Latest version: $VERSION"
        fi
    else
        DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/$VERSION/$BINARY_FILE"
    fi
}

# Check if moonlock is already installed
check_existing_installation() {
    if command -v $BINARY_NAME >/dev/null 2>&1; then
        EXISTING_VERSION=$($BINARY_NAME --version 2>/dev/null | head -n1 || echo "unknown")
        log_warning "Moonlock CLI is already installed: $EXISTING_VERSION"
        
        if [ -t 0 ]; then  # Only prompt if we have a TTY
            echo -n "Do you want to update it? [y/N]: "
            read -r response
            case $response in
                [yY][eE][sS]|[yY])
                    log_info "Proceeding with update..."
                    ;;
                *)
                    log_info "Installation cancelled"
                    exit 0
                    ;;
            esac
        else
            log_info "Non-interactive mode: proceeding with update"
        fi
    fi
}

# Download and install binary
install_binary() {
    log_info "Downloading Moonlock CLI..."
    
    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    # Download binary
    if command -v curl >/dev/null 2>&1; then
        if ! curl -L -f -o "$TEMP_DIR/$BINARY_NAME" "$DOWNLOAD_URL"; then
            log_error "Failed to download from $DOWNLOAD_URL"
            log_info "This might be a development build. Trying alternative method..."
            # Fallback for local development
            if [ -f "./moonlock-cli/packages/binaries/$BINARY_FILE" ]; then
                cp "./moonlock-cli/packages/binaries/$BINARY_FILE" "$TEMP_DIR/$BINARY_NAME"
                log_success "Using local development build"
            else
                exit 1
            fi
        fi
    elif command -v wget >/dev/null 2>&1; then
        if ! wget -O "$TEMP_DIR/$BINARY_NAME" "$DOWNLOAD_URL"; then
            log_error "Failed to download from $DOWNLOAD_URL"
            exit 1
        fi
    fi
    
    # Verify download
    if [ ! -f "$TEMP_DIR/$BINARY_NAME" ]; then
        log_error "Download failed - binary not found"
        exit 1
    fi
    
    # Check if downloaded file is valid
    if [ ! -s "$TEMP_DIR/$BINARY_NAME" ]; then
        log_error "Downloaded file is empty"
        exit 1
    fi
    
    # Make executable
    chmod +x "$TEMP_DIR/$BINARY_NAME"
    
    # Install to system
    log_info "Installing to $INSTALL_DIR..."
    
    if [ -w "$INSTALL_DIR" ]; then
        mv "$TEMP_DIR/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
    else
        log_info "Requesting administrator privileges to install to $INSTALL_DIR..."
        if command -v sudo >/dev/null 2>&1; then
            sudo mv "$TEMP_DIR/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
        else
            log_error "sudo is required to install to $INSTALL_DIR"
            log_info "Please install sudo or choose a different installation directory"
            exit 1
        fi
    fi
    
    log_success "Binary installed to $INSTALL_DIR/$BINARY_NAME"
}

# Setup configuration directory
setup_config() {
    log_info "Setting up configuration directory..."
    
    if [ ! -d "$CONFIG_DIR" ]; then
        mkdir -p "$CONFIG_DIR"
        log_success "Created configuration directory: $CONFIG_DIR"
    else
        log_info "Configuration directory already exists: $CONFIG_DIR"
    fi
    
    # Set proper permissions
    chmod 755 "$CONFIG_DIR"
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."
    
    # Check if binary is in PATH
    if command -v $BINARY_NAME >/dev/null 2>&1; then
        INSTALLED_PATH=$(which $BINARY_NAME)
        log_success "Found $BINARY_NAME at: $INSTALLED_PATH"
        
        # Test version command
        if VERSION_OUTPUT=$($BINARY_NAME --version 2>&1); then
            log_success "Version check successful: $VERSION_OUTPUT"
        else
            log_warning "Version check failed, but binary is installed"
        fi
        
        # Test help command
        if $BINARY_NAME --help >/dev/null 2>&1; then
            log_success "Help command works"
        else
            log_warning "Help command failed"
        fi
        
    else
        log_error "$BINARY_NAME not found in PATH"
        log_info "You may need to:"
        log_info "  1. Restart your terminal"
        log_info "  2. Add $INSTALL_DIR to your PATH"
        log_info "  3. Run: export PATH=\"$INSTALL_DIR:\$PATH\""
        return 1
    fi
}

# Show post-installation instructions
show_completion_message() {
    echo ""
    log_success "🎉 Moonlock CLI installed successfully!"
    echo ""
    echo "🚀 Get started:"
    echo "   $BINARY_NAME --help          # Show available commands"
    echo "   $BINARY_NAME status          # Check current status"  
    echo "   $BINARY_NAME config --list   # View configuration"
    echo ""
    echo "📚 Documentation:"
    echo "   GitHub: https://github.com/$GITHUB_REPO"
    echo "   Config: $CONFIG_DIR"
    echo ""
    
    if ! command -v $BINARY_NAME >/dev/null 2>&1; then
        echo "⚠️  Note: You may need to restart your terminal or add $INSTALL_DIR to your PATH"
        echo "   Run: export PATH=\"$INSTALL_DIR:\$PATH\""
        echo ""
    fi
}

# Cleanup function
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}

# Main installation process
main() {
    echo "🚀 Moonlock CLI Installer"
    echo "========================="
    echo ""
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Run installation steps
    check_root
    check_requirements
    detect_platform
    get_latest_release
    check_existing_installation
    install_binary
    setup_config
    
    if verify_installation; then
        show_completion_message
    else
        log_error "Installation verification failed"
        log_info "The binary was installed but may not be working correctly"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Moonlock CLI Installer"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --version, -v  Install specific version"
        echo "  --dir DIR      Install to custom directory"
        echo ""
        echo "Environment variables:"
        echo "  MOONLOCK_INSTALL_DIR   Custom installation directory"
        echo "  MOONLOCK_VERSION       Specific version to install"
        echo ""
        exit 0
        ;;
    --version|-v)
        if [ -n "${2:-}" ]; then
            VERSION="$2"
        else
            echo "Error: --version requires a version number"
            exit 1
        fi
        ;;
    --dir)
        if [ -n "${2:-}" ]; then
            INSTALL_DIR="$2"
        else
            echo "Error: --dir requires a directory path"
            exit 1
        fi
        ;;
esac

# Override with environment variables if set
if [ -n "${MOONLOCK_INSTALL_DIR:-}" ]; then
    INSTALL_DIR="$MOONLOCK_INSTALL_DIR"
fi

if [ -n "${MOONLOCK_VERSION:-}" ]; then
    VERSION="$MOONLOCK_VERSION"
fi

# Run main installation
main "$@"