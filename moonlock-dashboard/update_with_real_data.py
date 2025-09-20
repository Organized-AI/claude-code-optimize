#!/usr/bin/env python3
"""
Real-time Dashboard Data Updater
Continuously updates moonlock dashboard with real session data
"""

import json
import time
from pathlib import Path
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from session_tracker.update_dashboard_with_real_data import get_real_session_data

def update_dashboard_continuously():
    """Continuously update dashboard with real data"""
    print("🔄 Starting real-time dashboard data updater...")
    print("📊 Updates every 10 seconds")
    print("Press Ctrl+C to stop")
    
    while True:
        try:
            real_data = get_real_session_data()
            
            if real_data:
                # Write to JSON file for dashboard consumption
                output_file = Path("../moonlock-dashboard/real-session-data.json")
                with open(output_file, "w") as f:
                    json.dump(real_data, f, indent=2)
                
                # Print current status
                if real_data['isActive']:
                    session_id = real_data['activeSessionId'][:8]
                    tokens = real_data['currentWindow']['tokenUsage']['totalTokens']
                    efficiency = real_data['currentWindow']['efficiency']
                    print(f"📡 {time.strftime('%H:%M:%S')} - Session {session_id}: {tokens:,} tokens, {efficiency:.1f}% efficiency")
                else:
                    print(f"📡 {time.strftime('%H:%M:%S')} - No active sessions")
            
            time.sleep(10)  # Update every 10 seconds
            
        except KeyboardInterrupt:
            print("\n🛑 Stopping dashboard updater...")
            break
        except Exception as e:
            print(f"⚠️ Error updating dashboard: {e}")
            time.sleep(10)

if __name__ == "__main__":
    update_dashboard_continuously()
