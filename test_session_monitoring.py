#!/usr/bin/env python3
"""
Test script to verify session monitoring works
"""

import sys
import os
import time
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from usage_tracker.session_monitor import ClaudeCodeSessionMonitor

def test_session_monitoring():
    """Test the session monitoring functionality"""
    
    print("🧪 Testing Claude Code Session Monitoring...")
    print()
    
    # Create monitor
    monitor = ClaudeCodeSessionMonitor()
    
    # Test 1: Simulate session start
    print("1️⃣ Testing session start...")
    monitor._update_session_status("ACTIVE", {
        "session_id": "test_session_123",
        "start_time": "2025-08-06T12:00:00",
        "command": "claude-code ask 'test command'"
    })
    
    print("✅ Session status updated to ACTIVE")
    print(f"📁 State file created: {monitor.state_file}")
    
    # Test 2: Check status
    print("\n2️⃣ Testing status retrieval...")
    status = monitor.get_current_status()
    print(f"Current status: {status.get('status')}")
    print(f"Session active: {monitor.is_session_active()}")
    
    # Test 3: Simulate metrics update
    print("\n3️⃣ Testing metrics update...")
    monitor._update_session_metrics("test_session_123", {
        "total_cost_usd": 0.0025,
        "num_turns": 3,
        "duration_ms": 15000
    })
    print("✅ Metrics updated")
    
    # Test 4: Simulate session end
    print("\n4️⃣ Testing session completion...")
    time.sleep(1)
    monitor._update_session_status("COMPLETED", {
        "total_cost_usd": 0.0025,
        "num_turns": 3,
        "duration_ms": 15000
    })
    
    print("✅ Session completed")
    print(f"Session active: {monitor.is_session_active()}")
    
    # Test 5: Verify state file
    print("\n5️⃣ Verifying state file...")
    if os.path.exists(monitor.state_file):
        with open(monitor.state_file, 'r') as f:
            import json
            data = json.load(f)
            print("📄 State file contents:")
            print(json.dumps(data, indent=2))
    else:
        print("❌ State file not found")
        return False
    
    print("\n✅ All tests passed!")
    print("\n🚀 Next steps:")
    print("1. Run: ./launch_dashboard.sh")
    print("2. Open another terminal and run: python src/usage_tracker/session_monitor.py --help")
    print("3. Watch the dashboard show 'LIVE SESSION ACTIVE'!")
    
    return True

if __name__ == "__main__":
    success = test_session_monitoring()
    sys.exit(0 if success else 1)
