#!/usr/bin/env python3
"""
Local to Vercel Bridge - Sends local Claude Code data to deployed dashboard
"""

import json
import time
import asyncio
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional

try:
    import httpx
    import websockets
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(["pip3", "install", "httpx", "websockets"])
    import httpx
    import websockets

# Add src to path
sys.path.append('src')
from simple_tracker import SimplifiedTracker

class VercelBridge:
    """Bridges local Claude Code data to Vercel dashboard"""
    
    def __init__(self):
        self.tracker = SimplifiedTracker()
        # Your actual Vercel deployment URL
        self.dashboard_url = "https://moonlock-dashboard-9kneovnvn-jordaaans-projects.vercel.app"
        self.api_base = f"{self.dashboard_url}/api"
        
    async def send_to_dashboard(self, session_data: Dict) -> bool:
        """Send session data to dashboard API"""
        try:
            async with httpx.AsyncClient(timeout=10, verify=False) as client:
                # Try the claude-code endpoint first
                endpoints = [
                    "/claude-code/live-status",
                    "/sessions/current",
                    "/session-update"
                ]
                
                for endpoint in endpoints:
                    try:
                        # Format data for the dashboard
                        if endpoint == "/claude-code/live-status":
                            # This endpoint expects a POST with session data
                            response = await client.post(
                                f"{self.api_base}{endpoint}",
                                json=self.format_for_claude_code_api(session_data)
                            )
                        else:
                            response = await client.post(
                                f"{self.api_base}{endpoint}",
                                json=session_data
                            )
                        
                        if response.status_code in [200, 201, 204]:
                            print(f"✅ Sent to {endpoint}")
                            return True
                        else:
                            print(f"⚠️ {endpoint} returned {response.status_code}")
                            
                    except Exception as e:
                        print(f"Failed {endpoint}: {e}")
                        continue
                
                print("❌ All endpoints failed")
                return False
                
        except Exception as e:
            print(f"Error sending to dashboard: {e}")
            return False
    
    def format_for_claude_code_api(self, session_data: Dict) -> Dict:
        """Format data to match ClaudeCodeMonitor expectations"""
        if session_data.get("status") == "active" and session_data.get("session"):
            session = session_data["session"]
            
            # Create a session window format
            return {
                "isActive": True,
                "activeSessionId": session.get("session_id", "unknown"),
                "activeSince": int(time.time() * 1000),  # milliseconds
                "currentWindow": {
                    "sessionId": session.get("session_id", "unknown"),
                    "projectId": session.get("project", "default"),
                    "startTime": int(time.time() * 1000),
                    "endTime": int((time.time() + 18000) * 1000),  # 5 hours later
                    "status": "active",
                    "tokenUsage": {
                        "inputTokens": session.get("tokens", 0) // 2,
                        "outputTokens": session.get("tokens", 0) // 2,
                        "cacheReadTokens": 0,
                        "cacheCreationTokens": 0,
                        "totalTokens": session.get("tokens", 0)
                    },
                    "costEstimate": session.get("cost_usd", 0.0),
                    "messages": [],
                    "lastActivity": int(time.time() * 1000),
                    "efficiency": 0.8,  # Mock efficiency
                    "conversationContext": f"Project: {session.get('project', 'unknown')}"
                },
                "remainingTime": 18000000,  # 5 hours in ms
                "conversationContext": f"Working on {session.get('project', 'unknown')}",
                "lastMessage": None
            }
        else:
            return {
                "isActive": False,
                "activeSessionId": None,
                "activeSince": None,
                "currentWindow": None,
                "remainingTime": 0,
                "conversationContext": "",
                "lastMessage": None
            }
    
    async def update_loop(self):
        """Main loop to continuously update dashboard"""
        print("🌉 Local to Vercel Bridge Started")
        print(f"📊 Dashboard: {self.dashboard_url}")
        print(f"📁 Monitoring: {self.tracker.claude_projects}")
        print("")
        
        last_status = None
        
        while True:
            try:
                # Get current session status
                status = self.tracker.get_session_status()
                
                # Only send if status changed
                status_key = f"{status['status']}_{status.get('session', {}).get('session_id', 'none')}"
                
                if status_key != last_status:
                    # Send to dashboard
                    success = await self.send_to_dashboard(status)
                    
                    if status["status"] == "active":
                        session = status["session"]
                        print(f"🟢 ACTIVE: {session['session_id']} | "
                              f"{session['tokens']} tokens | "
                              f"${session['cost_usd']:.4f}")
                        if success:
                            print("   ✅ Dashboard updated")
                    else:
                        print("⚫ No active session")
                        if success:
                            print("   ✅ Dashboard cleared")
                    
                    last_status = status_key
                
                await asyncio.sleep(5)
                
            except KeyboardInterrupt:
                print("\n👋 Bridge shutting down")
                break
            except Exception as e:
                print(f"Error in update loop: {e}")
                await asyncio.sleep(10)

async def test_api():
    """Test if we can reach the dashboard API"""
    bridge = VercelBridge()
    
    print("🧪 Testing Dashboard API Connection")
    print("=" * 50)
    
    # Test with a mock active session
    test_data = {
        "status": "active",
        "session": {
            "session_id": "test_123",
            "tokens": 1500,
            "cost_usd": 0.045,
            "model": "claude-sonnet-4",
            "messages": 10,
            "project": "test_project"
        },
        "confidence": 95,
        "freshness": "live",
        "source": "test"
    }
    
    success = await bridge.send_to_dashboard(test_data)
    
    if success:
        print("✅ Successfully connected to dashboard!")
        print("   Check your dashboard for test data")
    else:
        print("❌ Could not connect to dashboard")
        print("   The dashboard may need to be configured to accept external data")
    
    # Clear test data
    await asyncio.sleep(2)
    clear_data = {"status": "inactive"}
    await bridge.send_to_dashboard(clear_data)

async def main():
    """Main entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        await test_api()
    else:
        bridge = VercelBridge()
        await bridge.update_loop()

if __name__ == "__main__":
    asyncio.run(main())
