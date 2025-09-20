#!/bin/bash
# Install permanent CCO commands in shell profile

CCO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CCO_COMMANDS_SCRIPT="$CCO_DIR/cco-slash-commands.sh"

echo "🔧 Installing Permanent CCO Commands"
echo "====================================="
echo "CCO Directory: $CCO_DIR"
echo ""

# Function to add sourcing to a profile file
add_to_profile() {
    local profile_file="$1"
    local profile_name="$2"
    
    # Check if already added
    if grep -q "cco-slash-commands.sh" "$profile_file" 2>/dev/null; then
        echo "✅ CCO commands already in $profile_name"
        return 0
    fi
    
    echo "📝 Adding CCO commands to $profile_name..."
    
    # Add sourcing line to profile
    cat >> "$profile_file" << EOF

# Claude Code Optimizer Commands - Auto-sourced
if [ -f "$CCO_COMMANDS_SCRIPT" ]; then
    source "$CCO_COMMANDS_SCRIPT"
fi
EOF
    
    echo "✅ Added to $profile_name"
}

# Install in common shell profiles
if [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ]; then
    # Bash profiles
    add_to_profile "$HOME/.bash_profile" ".bash_profile"
    add_to_profile "$HOME/.bashrc" ".bashrc"
fi

if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ] || [[ "$SHELL" == *"zsh"* ]]; then
    # Zsh profiles
    add_to_profile "$HOME/.zshrc" ".zshrc"
    add_to_profile "$HOME/.zprofile" ".zprofile"
fi

# Generic profile (works for most shells)
add_to_profile "$HOME/.profile" ".profile"

echo ""
echo "🎯 Creating CCO commands symlinks in /usr/local/bin..."

# Create symlinks for individual commands (requires sudo)
if command -v sudo >/dev/null 2>&1; then
    # Create wrapper script for each command
    cat > /tmp/cco-wrapper << 'EOF'
#!/bin/bash
CCO_DIR="$(dirname "$(readlink -f "$0")" 2>/dev/null || echo "/usr/local/bin")"
# Find the actual CCO directory by looking for cco_simple.py
for dir in "$HOME"/.claude* "$HOME"/*/Claude* "$HOME"/*/*/Claude* /tmp /opt /usr/local; do
    if [ -f "$dir/cco_simple.py" ]; then
        CCO_DIR="$dir"
        break
    fi
done

if [ ! -f "$CCO_DIR/cco_simple.py" ]; then
    echo "❌ Error: Could not find cco_simple.py"
    echo "   Please run this script from the CCO directory"
    exit 1
fi

cd "$CCO_DIR"
python3 cco_simple.py "$@"
EOF

    # Install the wrapper as cco command
    if sudo cp /tmp/cco-wrapper /usr/local/bin/cco 2>/dev/null; then
        sudo chmod +x /usr/local/bin/cco
        echo "✅ Installed 'cco' command globally"
        
        # Create aliases for common commands
        for cmd in status limits quota blocks daily sessions; do
            sudo ln -sf /usr/local/bin/cco "/usr/local/bin/cco-$cmd" 2>/dev/null
        done
        echo "✅ Created command aliases (cco-status, cco-limits, etc.)"
    else
        echo "⚠️  Could not install global commands (no sudo access)"
    fi
    
    rm -f /tmp/cco-wrapper
else
    echo "⚠️  sudo not available - skipping global command installation"
fi

echo ""
echo "🚀 Installation Complete!"
echo "========================="
echo ""
echo "✅ CCO commands will be available in new shell sessions"
echo "✅ Current session: source the commands manually with:"
echo "   source $CCO_COMMANDS_SCRIPT"
echo ""
echo "🎯 Test commands:"
echo "   cco-status      # Check current session"
echo "   cco-limits      # View quota status"
echo "   cco-quick       # Quick overview"
echo ""
echo "📝 Manual activation for current session:"
source "$CCO_COMMANDS_SCRIPT"
echo ""
echo "🎉 CCO commands are now active!"