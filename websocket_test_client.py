#!/usr/bin/env python3
"""
WebSocket Test Client for Dashboard Server
Tests connection stability, reconnection logic, and message handling
"""

import asyncio
import websockets
import json
import time
import signal
import sys
from datetime import datetime
from typing import Optional

class WebSocketTestClient:
    def __init__(self, uri: str = "ws://localhost:3001/ws"):
        self.uri = uri
        self.websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.running = True
        self.reconnect_interval = 1
        self.max_reconnect_interval = 30
        self.reconnect_attempts = 0
        self.connected = False
        self.messages_received = 0
        self.last_heartbeat = None
        
    async def connect(self):
        """Establish WebSocket connection with error handling"""
        try:
            print(f"🔗 Connecting to {self.uri}...")
            self.websocket = await websockets.connect(
                self.uri,
                ping_interval=20,  # Send ping every 20 seconds
                ping_timeout=10,   # Wait 10 seconds for pong
                close_timeout=10   # Wait 10 seconds for close
            )
            self.connected = True
            self.reconnect_attempts = 0
            self.reconnect_interval = 1
            print(f"✅ Connected to WebSocket server")
            return True
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            self.connected = False
            return False
    
    async def disconnect(self):
        """Gracefully disconnect WebSocket"""
        if self.websocket and not self.websocket.closed:
            print("🔌 Disconnecting WebSocket...")
            await self.websocket.close()
        self.connected = False
    
    async def send_heartbeat(self):
        """Send heartbeat message to keep connection alive"""
        if self.websocket and self.connected:
            try:
                heartbeat_msg = {
                    "type": "heartbeat",
                    "timestamp": datetime.now().isoformat(),
                    "client_id": "test_client"
                }
                await self.websocket.send(json.dumps(heartbeat_msg))
                self.last_heartbeat = time.time()
                print(f"💓 Heartbeat sent at {datetime.now().strftime('%H:%M:%S')}")
                
            except Exception as e:
                print(f"❌ Heartbeat failed: {e}")
                self.connected = False
    
    async def listen_for_messages(self):
        """Listen for incoming WebSocket messages"""
        try:
            async for message in self.websocket:
                self.messages_received += 1
                try:
                    data = json.loads(message)
                    message_type = data.get('type', 'unknown')
                    timestamp = datetime.now().strftime('%H:%M:%S')
                    
                    if message_type == 'initial_data':
                        print(f"📊 [{timestamp}] Received initial data:")
                        print(f"   - Active sessions: {len(data.get('active_sessions', []))}")
                        print(f"   - Recent sessions: {len(data.get('recent_sessions', []))}")
                        print(f"   - Five-hour blocks: {len(data.get('five_hour_blocks', []))}")
                        
                    elif message_type == 'session_update':
                        print(f"🔄 [{timestamp}] Session update received:")
                        event = data.get('event', 'unknown')
                        session = data.get('session', {})
                        print(f"   - Event: {event}")
                        print(f"   - Session ID: {session.get('session_id', 'N/A')[:8]}...")
                        
                    else:
                        print(f"📨 [{timestamp}] Message ({message_type}): {len(message)} chars")
                        
                except json.JSONDecodeError:
                    print(f"📨 [{timestamp}] Raw message: {message[:100]}...")
                    
        except websockets.exceptions.ConnectionClosed as e:
            print(f"🔌 Connection closed: {e}")
            self.connected = False
            
        except Exception as e:
            print(f"❌ Error receiving message: {e}")
            self.connected = False
    
    async def reconnect_loop(self):
        """Handle automatic reconnection with exponential backoff"""
        while self.running:
            if not self.connected:
                print(f"🔄 Attempting reconnection #{self.reconnect_attempts + 1}...")
                
                if await self.connect():
                    # Start listening for messages
                    asyncio.create_task(self.listen_for_messages())
                else:
                    self.reconnect_attempts += 1
                    self.reconnect_interval = min(
                        self.max_reconnect_interval,
                        self.reconnect_interval * 1.5
                    )
                    print(f"⏳ Waiting {self.reconnect_interval:.1f}s before next attempt...")
                    await asyncio.sleep(self.reconnect_interval)
            
            await asyncio.sleep(1)
    
    async def heartbeat_loop(self):
        """Send periodic heartbeats"""
        while self.running:
            if self.connected:
                await self.send_heartbeat()
            await asyncio.sleep(15)  # Heartbeat every 15 seconds
    
    async def status_monitor(self):
        """Monitor connection status and statistics"""
        start_time = time.time()
        
        while self.running:
            uptime = time.time() - start_time
            status_emoji = "🟢" if self.connected else "🔴"
            
            print(f"\n{status_emoji} Status Report ({datetime.now().strftime('%H:%M:%S')})")
            print(f"   Uptime: {uptime:.1f}s")
            print(f"   Connected: {self.connected}")
            print(f"   Messages received: {self.messages_received}")
            print(f"   Reconnect attempts: {self.reconnect_attempts}")
            
            if self.last_heartbeat:
                heartbeat_age = time.time() - self.last_heartbeat
                print(f"   Last heartbeat: {heartbeat_age:.1f}s ago")
            
            await asyncio.sleep(30)  # Status update every 30 seconds
    
    async def run_test(self, duration: int = 300):
        """Run comprehensive WebSocket test"""
        print(f"🚀 Starting WebSocket test for {duration} seconds...")
        print(f"🎯 Target: {self.uri}")
        
        # Set up signal handler for graceful shutdown
        def signal_handler(signum, frame):
            print(f"\n🛑 Received signal {signum}, shutting down...")
            self.running = False
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Start all monitoring tasks
        tasks = [
            asyncio.create_task(self.reconnect_loop()),
            asyncio.create_task(self.heartbeat_loop()),
            asyncio.create_task(self.status_monitor())
        ]
        
        try:
            # Run for specified duration
            await asyncio.sleep(duration)
            
        except KeyboardInterrupt:
            print("\n⏹️  Test interrupted by user")
            
        finally:
            print("\n🔄 Cleaning up...")
            self.running = False
            
            # Cancel all tasks
            for task in tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            # Disconnect WebSocket
            await self.disconnect()
            
            # Final statistics
            print(f"\n📊 Test Results:")
            print(f"   Messages received: {self.messages_received}")
            print(f"   Reconnection attempts: {self.reconnect_attempts}")
            print(f"   Final connection status: {'Connected' if self.connected else 'Disconnected'}")

async def main():
    """Main test function"""
    if len(sys.argv) > 1:
        duration = int(sys.argv[1])
    else:
        duration = 60  # Default 1 minute test
    
    client = WebSocketTestClient()
    await client.run_test(duration)

if __name__ == "__main__":
    asyncio.run(main())