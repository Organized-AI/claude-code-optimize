#!/usr/bin/env python3
"""
Simple Dashboard Sender - Sends real data to your Vercel dashboard
"""

import asyncio
import json
import time
from datetime import datetime
from typing import Dict, Optional

try:
    import websockets
    import httpx
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(["pip3", "install", "websockets", "httpx"])
    import websockets
    import httpx

class DashboardSender:
    def __init__(self):
        self.dashboard_url = "moonlock-dashboard-9kneovnvn-jordaaans-projects.vercel.app"
        self.ws_url = f"wss://{self.dashboard_url}/ws"
        self.api_url = f"https://{self.dashboard_url}/api"
        self.ws = None
        self.connected = False
        
    async def connect_websocket(self) -> bool:
        """Try to connect WebSocket (with relaxed SSL for Vercel)"""
        try:
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            self.ws = await websockets.connect(
                self.ws_url,
                ssl=ssl_context,
                ping_interval=20,
                ping_timeout=10
            )
            self.connected = True
            print(f"✅ Connected to dashboard via WebSocket")
            return True
            
        except Exception as e:
            print(f"⚠️ WebSocket failed ({e}), will use HTTP fallback")
            self.connected = False
            return False
    
    async def send_via_websocket(self, data: Dict) -> bool:
        """Send data via WebSocket"""
        if not self.connected or not self.ws:
            return False
            
        try:
            message = {
                "type": "session_update",
                "timestamp": datetime.now().isoformat(),
                **data
            }
            await self.ws.send(json.dumps(message))
            return True
        except Exception as e:
            print(f"WebSocket send error: {e}")
            self.connected = False
            return False
    
    async def send_via_http(self, data: Dict) -> bool:
        """Send data via HTTP as fallback"""
        try:
            async with httpx.AsyncClient(verify=False) as client:
                response = await client.post(
                    f"{self.api_url}/session-update",
                    json={
                        "timestamp": datetime.now().isoformat(),
                        **data
                    },
                    timeout=10
                )
                return response.status_code == 200
        except Exception as e:
            print(f"HTTP send error: {e}")
            return False
    
    async def send_update(self, data: Dict) -> bool:
        """Send update via WebSocket or HTTP"""
        # Try WebSocket first
        if await self.send_via_websocket(data):
            return True
        
        # Fall back to HTTP
        return await self.send_via_http(data)
    
    async def send_heartbeat(self):
        """Keep connection alive"""
        while True:
            if self.connected and self.ws:
                try:
                    await self.ws.ping()
                except:
                    self.connected = False
            await asyncio.sleep(30)

async def main():
    """Main loop that combines tracking and sending"""
    import sys
    sys.path.append('..')
    from simple_tracker import SimplifiedTracker
    
    tracker = SimplifiedTracker()
    sender = DashboardSender()
    
    print("🚀 Starting Claude Code Dashboard Updater")
    print(f"📊 Dashboard: https://{sender.dashboard_url}")
    
    # Try to connect WebSocket
    await sender.connect_websocket()
    
    # Start heartbeat
    asyncio.create_task(sender.send_heartbeat())
    
    while True:
        try:
            # Get current status
            status = tracker.get_session_status()
            
            # Prepare dashboard data
            dashboard_data = {
                "is_active": status["status"] == "active",
                "confidence": status["confidence"],
                "freshness": status["freshness"],
                "source": status["source"],
                "timestamp": datetime.now().isoformat()
            }
            
            if status["session"]:
                dashboard_data["session"] = status["session"]
            
            # Send to dashboard
            success = await sender.send_update(dashboard_data)
            
            if success:
                if status["status"] == "active":
                    print(f"📤 Sent active session to dashboard")
                else:
                    print(f"📤 Sent inactive status to dashboard")
            else:
                print(f"❌ Failed to send to dashboard")
            
            # Reconnect if needed
            if not sender.connected:
                await sender.connect_websocket()
            
            await asyncio.sleep(5)
            
        except KeyboardInterrupt:
            print("\n👋 Shutting down")
            if sender.ws:
                await sender.ws.close()
            break
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(10)

if __name__ == "__main__":
    asyncio.run(main())
