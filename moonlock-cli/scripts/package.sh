#!/bin/bash

set -e

echo "📦 Packaging Moonlock CLI for distribution..."

# Ensure build is complete
if [ ! -d "dist" ]; then
    echo "❌ Build directory not found. Running build first..."
    ./scripts/build.sh
fi

# Create package directory
echo "Creating package directories..."
rm -rf packages
mkdir -p packages/binaries

# Install dependencies in dist directory
echo "Installing production dependencies..."
cd dist
npm install --production --silent
cd ..

# Package for different platforms using pkg
echo "Creating platform-specific binaries..."

# macOS ARM64
echo "📱 Building for macOS ARM64..."
npx pkg dist/cli.js --targets node18-macos-arm64 --output packages/binaries/moonlock-macos-arm64

# macOS x64
echo "💻 Building for macOS x64..."
npx pkg dist/cli.js --targets node18-macos-x64 --output packages/binaries/moonlock-macos-x64

# Linux x64
echo "🐧 Building for Linux x64..."
npx pkg dist/cli.js --targets node18-linux-x64 --output packages/binaries/moonlock-linux-x64

# Windows x64
echo "🪟 Building for Windows x64..."
npx pkg dist/cli.js --targets node18-win-x64 --output packages/binaries/moonlock-win-x64.exe

# Create tarball for npm distribution
echo "📄 Creating npm package..."
cd dist
tar -czf ../packages/moonlock-cli.tar.gz .
cd ..

# Create platform-specific packages
echo "🗜️  Creating platform packages..."

# macOS package
mkdir -p packages/macos
cp packages/binaries/moonlock-macos-arm64 packages/macos/moonlock
cp packages/binaries/moonlock-macos-x64 packages/macos/moonlock-intel
cp README.md packages/macos/ 2>/dev/null || echo "No README found"
tar -czf packages/moonlock-macos.tar.gz -C packages/macos .

# Linux package
mkdir -p packages/linux
cp packages/binaries/moonlock-linux-x64 packages/linux/moonlock
cp README.md packages/linux/ 2>/dev/null || echo "No README found"
tar -czf packages/moonlock-linux.tar.gz -C packages/linux .

# Windows package
mkdir -p packages/windows
cp packages/binaries/moonlock-win-x64.exe packages/windows/moonlock.exe
cp README.md packages/windows/ 2>/dev/null || echo "No README found"
cd packages/windows && zip -r ../moonlock-windows.zip . && cd ../..

# Create checksums
echo "🔐 Creating checksums..."
cd packages
sha256sum *.tar.gz *.zip > checksums.txt 2>/dev/null || shasum -a 256 *.tar.gz *.zip > checksums.txt
cd ..

# Generate installation script
echo "📝 Generating installation script..."
cat > packages/install.sh << 'EOF'
#!/bin/bash

set -e

INSTALL_DIR="/usr/local/bin"
BINARY_NAME="moonlock"
GITHUB_REPO="moonlock/cli"  # Update with actual repo
VERSION="latest"

# Detect platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
    x86_64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH" && exit 1 ;;
esac

# Determine download URL based on platform
case $OS in
    darwin)
        if [ "$ARCH" = "arm64" ]; then
            DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/$VERSION/download/moonlock-macos-arm64"
        else
            DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/$VERSION/download/moonlock-macos-x64"
        fi
        ;;
    linux)
        DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/$VERSION/download/moonlock-linux-x64"
        ;;
    *)
        echo "Unsupported operating system: $OS"
        exit 1
        ;;
esac

echo "🚀 Installing Moonlock CLI..."
echo "Platform: $OS-$ARCH"
echo "Download URL: $DOWNLOAD_URL"

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Download binary
echo "📥 Downloading..."
if command -v curl >/dev/null 2>&1; then
    curl -L -o "$TEMP_DIR/$BINARY_NAME" "$DOWNLOAD_URL"
elif command -v wget >/dev/null 2>&1; then
    wget -O "$TEMP_DIR/$BINARY_NAME" "$DOWNLOAD_URL"
else
    echo "❌ curl or wget is required to download the binary"
    exit 1
fi

# Make executable
chmod +x "$TEMP_DIR/$BINARY_NAME"

# Install to system
echo "📦 Installing to $INSTALL_DIR..."
if [ -w "$INSTALL_DIR" ]; then
    mv "$TEMP_DIR/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
else
    echo "🔒 Requesting sudo access to install to $INSTALL_DIR..."
    sudo mv "$TEMP_DIR/$BINARY_NAME" "$INSTALL_DIR/$BINARY_NAME"
fi

echo "✅ Moonlock CLI installed successfully!"
echo "🎉 Run '$BINARY_NAME --help' to get started"

# Verify installation
if command -v $BINARY_NAME >/dev/null 2>&1; then
    echo "🔍 Verified: $(which $BINARY_NAME)"
    $BINARY_NAME --version
else
    echo "⚠️  Warning: $BINARY_NAME not found in PATH"
    echo "   You may need to restart your terminal or add $INSTALL_DIR to your PATH"
fi
EOF

chmod +x packages/install.sh

# Create package info
echo "📋 Creating package information..."
cat > packages/package-info.json << EOF
{
  "name": "moonlock-cli",
  "version": "$(node -p "require('./package.json').version")",
  "description": "$(node -p "require('./package.json').description")",
  "built_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platforms": {
    "macos-arm64": {
      "file": "moonlock-macos-arm64",
      "size": "$(stat -f%z packages/binaries/moonlock-macos-arm64 2>/dev/null || stat -c%s packages/binaries/moonlock-macos-arm64)"
    },
    "macos-x64": {
      "file": "moonlock-macos-x64", 
      "size": "$(stat -f%z packages/binaries/moonlock-macos-x64 2>/dev/null || stat -c%s packages/binaries/moonlock-macos-x64)"
    },
    "linux-x64": {
      "file": "moonlock-linux-x64",
      "size": "$(stat -f%z packages/binaries/moonlock-linux-x64 2>/dev/null || stat -c%s packages/binaries/moonlock-linux-x64)"
    },
    "windows-x64": {
      "file": "moonlock-win-x64.exe",
      "size": "$(stat -f%z packages/binaries/moonlock-win-x64.exe 2>/dev/null || stat -c%s packages/binaries/moonlock-win-x64.exe)"
    }
  },
  "install": {
    "script": "install.sh",
    "curl": "curl -fsSL https://raw.githubusercontent.com/moonlock/cli/main/install.sh | bash"
  }
}
EOF

echo ""
echo "✅ Packaging completed successfully!"
echo ""
echo "📦 Available packages:"
ls -la packages/
echo ""
echo "🚀 Installation options:"
echo "   • Direct download: packages/binaries/"
echo "   • Platform packages: packages/moonlock-{platform}.tar.gz"
echo "   • Universal installer: bash packages/install.sh"
echo "   • NPM package: npm install packages/moonlock-cli.tar.gz"
echo ""
echo "🔐 Checksums available in: packages/checksums.txt"