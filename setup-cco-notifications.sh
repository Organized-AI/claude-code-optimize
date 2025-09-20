#!/bin/bash
# Setup script for CCO macOS Notifications

echo "🔔 Setting up CCO macOS Notifications"
echo "======================================"

CCO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Test the notification system
echo "🧪 Testing notification system..."
cd "$CCO_DIR"
python3 cco_macos_notifier.py --test

if [ $? -eq 0 ]; then
    echo "✅ Notification test successful!"
else
    echo "❌ Notification test failed!"
    exit 1
fi

echo ""
echo "🎯 Available Notification Commands:"
echo ""
echo "📱 Quick Start:"
echo "  source cco-slash-commands.sh     # Load commands"
echo "  cco-notify-test                  # Test notifications"
echo "  cco-notify                       # Start full monitoring"
echo "  cco-notify-silent                # Start threshold-only monitoring"
echo ""
echo "🔔 Notification Features:"
echo "  • Token usage: 25%, 50%, 75%, 85%, 95% thresholds"
echo "  • Time milestones: 1h, 2h, 3h, 4h, 4.5h sessions"
echo "  • Regular updates: Every 5 minutes (optional)"
echo "  • Session start/stop notifications"
echo "  • Native macOS notifications with sounds"
echo ""
echo "⚙️  Customization Options:"
echo "  cco-notify --interval 600        # Update every 10 minutes"
echo "  cco-notify-silent --interval 900 # Check thresholds every 15 minutes"
echo ""
echo "🎵 Notification Sounds:"
echo "  • Token thresholds: Basso (urgent)"
echo "  • Time milestones: Tink (gentle)"
echo "  • Regular updates: Glass (subtle)"
echo ""
echo "✅ Setup complete! Try: cco-notify-test"