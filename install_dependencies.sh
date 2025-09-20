#!/bin/bash
# Claude Code Optimizer - Dependency Installation Script
# Run this to install all required packages for the precision detection system

echo "🔧 Installing Claude Code Optimizer Dependencies..."
echo "=================================================="

# Change to project directory
cd "/Users/supabowl/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer"

# Install Python dependencies
echo "📦 Installing Python packages..."
pip3 install -r requirements.txt

# Check if installation was successful
echo ""
echo "🧪 Testing imports..."
python3 -c "
import sys
missing = []
try:
    import psutil
    print('✅ psutil imported successfully')
except ImportError:
    missing.append('psutil')
    print('❌ psutil import failed')

try:
    import watchdog
    print('✅ watchdog imported successfully')
except ImportError:
    missing.append('watchdog')
    print('❌ watchdog import failed')

try:
    import requests
    print('✅ requests imported successfully')
except ImportError:
    missing.append('requests')
    print('❌ requests import failed')

try:
    import plyer
    print('✅ plyer imported successfully')
except ImportError:
    missing.append('plyer')
    print('❌ plyer import failed')

if missing:
    print(f'\\n❌ Missing packages: {missing}')
    print('Try: pip3 install --user ' + ' '.join(missing))
    sys.exit(1)
else:
    print('\\n✅ All dependencies installed successfully!')
"

# If tests pass, create logs directory
if [ $? -eq 0 ]; then
    echo ""
    echo "📁 Creating logs directory..."
    mkdir -p logs
    
    echo ""
    echo "🎉 Installation complete! You can now run:"
    echo "   python3 test_precision_integration.py"
    echo "   python3 SessionCoordinator.py"
    echo "   python3 precision_session_detector.py"
else
    echo ""
    echo "❌ Installation failed. Please check error messages above."
fi
