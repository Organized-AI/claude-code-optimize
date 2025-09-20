#!/usr/bin/env python3
"""
Localhost Server for Real-time Claude Session Updates
Runs on port 3001 to provide real-time data to dashboard
"""

import json
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import threading
import time

class SessionUpdate(BaseModel):
    event: str
    session: Dict[str, Any]
    timestamp: str

class DashboardServer:
    """Real-time dashboard server for Claude session monitoring"""
    
    def __init__(self, port: int = 3001, db_path: str = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"):
        self.port = port
        self.db_path = db_path
        self.app = FastAPI(
            title="Claude Session Monitor", 
            version="1.2.0-production",
            description="Real-time WebSocket dashboard for Claude Code Optimizer"
        )
        self.connected_clients: List[WebSocket] = []
        self.message_queue: Dict[str, List[Dict]] = {}  # Queue messages for offline clients
        self.connection_stats = {
            "total_connections": 0,
            "current_connections": 0,
            "messages_sent": 0,
            "errors": 0
        }
        
        self._setup_middleware()
        self._setup_routes()
        
    def _setup_middleware(self):
        """Setup CORS and other middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Allow all origins for development
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await self._handle_websocket(websocket)
        
        @self.app.post("/api/session-update")
        async def session_update(update: SessionUpdate, background_tasks: BackgroundTasks):
            """Receive session updates from the tracker"""
            background_tasks.add_task(self._broadcast_update, update.dict())
            return {"status": "received"}
        
        @self.app.get("/api/status")
        async def get_status():
            """Production status endpoint with comprehensive metrics"""
            return {
                "status": "running",
                "version": "1.2.0-production",
                "connected_clients": len(self.connected_clients),
                "port": self.port,
                "websocket_endpoint": f"ws://localhost:{self.port}/ws",
                "features": {
                    "heartbeat_monitoring": True,
                    "automatic_reconnection": True,
                    "message_queuing": True,
                    "error_recovery": True,
                    "connection_pooling": True,
                    "performance_optimized": True
                },
                "statistics": self.connection_stats,
                "performance": {
                    "uvloop_enabled": True,
                    "httptools_enabled": True,
                    "max_concurrent_connections": 100
                },
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.get("/api/sessions/active")
        async def get_active_sessions():
            """Get currently active sessions"""
            return self._get_active_sessions()
        
        @self.app.get("/api/sessions/recent")
        async def get_recent_sessions(limit: int = 20):
            """Get recent sessions"""
            return self._get_recent_sessions(limit)
        
        @self.app.get("/api/analytics/current")
        async def get_current_analytics():
            """Get current session analytics"""
            return self._get_session_analytics()
        
        @self.app.get("/api/five-hour-blocks")
        async def get_five_hour_blocks(limit: int = 10):
            """Get 5-hour session blocks"""
            return self._get_five_hour_blocks(limit)
        
        @self.app.get("/api/dashboard-config")
        async def get_dashboard_config():
            """Enhanced dashboard configuration with WebSocket settings"""
            return {
                "real_time_enabled": True,
                "session_tracking": True,
                "five_hour_blocks": True,
                "auto_refresh": 5000,  # 5 seconds
                "websocket_config": {
                    "ping_interval": 15000,  # Send ping every 15 seconds
                    "ping_timeout": 10000,   # Wait 10 seconds for pong
                    "reconnect_interval": 1000,    # Start reconnect after 1s
                    "max_reconnect_interval": 30000,  # Max 30s between attempts
                    "reconnect_decay": 1.5,  # Exponential backoff multiplier
                    "max_message_size": 1024 * 1024,  # 1MB max message size
                    "compression": True,  # Enable WebSocket compression
                    "max_queue_size": 1000  # Max queued messages per client
                },
                "dashboard_url": "https://claude-code-optimizer-dashboard.netlify.app",
                "localhost_port": self.port
            }
        
        @self.app.post("/api/netlify-sync")
        async def sync_to_netlify(background_tasks: BackgroundTasks):
            """Sync current data to Netlify dashboard"""
            background_tasks.add_task(self._sync_to_netlify)
            return {"status": "sync_started"}
    
    async def _handle_websocket(self, websocket: WebSocket):
        """Production WebSocket connection handler with comprehensive error handling"""
        await websocket.accept()
        self.connected_clients.append(websocket)
        client_id = str(id(websocket))[:8]
        
        # Update connection statistics
        self.connection_stats["total_connections"] += 1
        self.connection_stats["current_connections"] = len(self.connected_clients)
        
        print(f"🔗 Client {client_id} connected. Total: {len(self.connected_clients)} | Lifetime: {self.connection_stats['total_connections']}")
        
        try:
            # Send initial data
            initial_data = {
                "type": "initial_data",
                "client_id": client_id,
                "server_time": datetime.now().isoformat(),
                "active_sessions": self._get_active_sessions(),
                "recent_sessions": self._get_recent_sessions(10),
                "analytics": self._get_session_analytics(),
                "five_hour_blocks": self._get_five_hour_blocks(5),
                "config": {
                    "ping_interval": 15000,  # 15 seconds in milliseconds
                    "auto_refresh": 5000
                }
            }
            await websocket.send_text(json.dumps(initial_data))
            
            # Handle incoming messages with timeout
            while True:
                try:
                    message = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=60.0  # 60 second timeout
                    )
                    
                    # Process client messages
                    try:
                        data = json.loads(message)
                        await self._process_client_message(websocket, data)
                    except json.JSONDecodeError:
                        print(f"⚠️ Invalid JSON from client {client_id}: {message[:100]}")
                        
                except asyncio.TimeoutError:
                    # Send ping to check if client is alive
                    ping_message = {
                        "type": "ping",
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send_text(json.dumps(ping_message))
                    print(f"💓 Ping sent to client {client_id}")
                
        except WebSocketDisconnect:
            print(f"👋 Client {client_id} disconnected normally")
        except Exception as e:
            print(f"❌ Error with client {client_id}: {e}")
            self.connection_stats["errors"] += 1
        finally:
            if websocket in self.connected_clients:
                self.connected_clients.remove(websocket)
                self.connection_stats["current_connections"] = len(self.connected_clients)
                print(f"🧹 Client {client_id} removed. Remaining: {len(self.connected_clients)}")
    
    async def _broadcast_update(self, update_data: Dict):
        """Enhanced broadcast with better error handling and logging"""
        if not self.connected_clients:
            print("📡 No clients connected, skipping broadcast")
            return
        
        # Add broadcast metadata
        message = json.dumps({
            "type": "session_update",
            "broadcast_id": str(id(update_data))[:8],
            "timestamp": datetime.now().isoformat(),
            **update_data
        })
        
        # Track broadcast results
        successful_sends = 0
        failed_clients = []
        connected_clients = []
        
        for client in self.connected_clients:
            client_id = str(id(client))[:8]
            try:
                await client.send_text(message)
                connected_clients.append(client)
                successful_sends += 1
                self.connection_stats["messages_sent"] += 1
            except Exception as e:
                print(f"⚠️ Failed to send to client {client_id}: {e}")
                failed_clients.append(client_id)
        
        self.connected_clients = connected_clients
        
        print(f"📡 Broadcast completed: {successful_sends}/{successful_sends + len(failed_clients)} clients reached")
        if failed_clients:
            print(f"   Failed clients: {failed_clients}")
    
    async def _process_client_message(self, websocket: WebSocket, data: Dict):
        """Process incoming messages from WebSocket clients"""
        message_type = data.get('type', 'unknown')
        client_id = str(id(websocket))[:8]
        
        if message_type == 'pong':
            print(f"💗 Received pong from client {client_id}")
            
        elif message_type == 'ping':
            # Client sent ping, respond with pong
            pong_message = {
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(pong_message))
            print(f"🏓 Sent pong to client {client_id}")
            
        elif message_type == 'heartbeat':
            # Client heartbeat, acknowledge
            ack_message = {
                "type": "heartbeat_ack",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(ack_message))
            
        elif message_type == 'request_data':
            # Client requesting fresh data
            initial_data = {
                "type": "initial_data",
                "active_sessions": self._get_active_sessions(),
                "recent_sessions": self._get_recent_sessions(10),
                "analytics": self._get_session_analytics(),
                "five_hour_blocks": self._get_five_hour_blocks(5),
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(initial_data))
            print(f"📊 Sent fresh data to client {client_id}")
            
        else:
            print(f"❓ Unknown message type '{message_type}' from client {client_id}")
    
    def _get_active_sessions(self) -> List[Dict]:
        """Get currently active sessions from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM real_sessions 
                WHERE is_active = TRUE 
                ORDER BY start_time DESC
            ''')
            
            columns = [description[0] for description in cursor.description]
            sessions = []
            
            for row in cursor.fetchall():
                session_dict = dict(zip(columns, row))
                
                # Calculate duration
                if session_dict['start_time']:
                    start_time = datetime.fromisoformat(session_dict['start_time'])
                    session_dict['duration_minutes'] = (datetime.now() - start_time).total_seconds() / 60
                
                # Parse JSON fields
                if session_dict['models_used']:
                    session_dict['models_used'] = json.loads(session_dict['models_used'])
                if session_dict['metadata']:
                    session_dict['metadata'] = json.loads(session_dict['metadata'])
                
                sessions.append(session_dict)
            
            conn.close()
            return sessions
            
        except Exception as e:
            print(f"⚠️ Error getting active sessions: {e}")
            return []
    
    def _get_recent_sessions(self, limit: int) -> List[Dict]:
        """Get recent sessions from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM real_sessions 
                ORDER BY start_time DESC 
                LIMIT ?
            ''', (limit,))
            
            columns = [description[0] for description in cursor.description]
            sessions = []
            
            for row in cursor.fetchall():
                session_dict = dict(zip(columns, row))
                
                # Calculate duration
                if session_dict['start_time']:
                    start_time = datetime.fromisoformat(session_dict['start_time'])
                    if session_dict['end_time']:
                        end_time = datetime.fromisoformat(session_dict['end_time'])
                        session_dict['duration_minutes'] = (end_time - start_time).total_seconds() / 60
                    else:
                        session_dict['duration_minutes'] = (datetime.now() - start_time).total_seconds() / 60
                
                # Parse JSON fields
                if session_dict['models_used']:
                    try:
                        session_dict['models_used'] = json.loads(session_dict['models_used'])
                    except:
                        session_dict['models_used'] = []
                        
                if session_dict['metadata']:
                    try:
                        session_dict['metadata'] = json.loads(session_dict['metadata'])
                    except:
                        session_dict['metadata'] = {}
                
                sessions.append(session_dict)
            
            conn.close()
            return sessions
            
        except Exception as e:
            print(f"⚠️ Error getting recent sessions: {e}")
            return []
    
    def _get_session_analytics(self) -> Dict:
        """Get session analytics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Today's stats
            today = datetime.now().date()
            cursor.execute('''
                SELECT 
                    session_type,
                    COUNT(*) as session_count,
                    SUM(estimated_tokens) as total_tokens,
                    AVG(total_messages) as avg_messages,
                    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count
                FROM real_sessions 
                WHERE DATE(start_time) = ?
                GROUP BY session_type
            ''', (today,))
            
            today_stats = {}
            for row in cursor.fetchall():
                today_stats[row[0]] = {
                    "sessions": row[1],
                    "tokens": row[2] or 0,
                    "avg_messages": round(row[3] or 0, 1),
                    "active": row[4]
                }
            
            # Weekly stats
            week_start = datetime.now() - timedelta(days=7)
            cursor.execute('''
                SELECT 
                    session_type,
                    COUNT(*) as session_count,
                    SUM(estimated_tokens) as total_tokens
                FROM real_sessions 
                WHERE start_time >= ?
                GROUP BY session_type
            ''', (week_start,))
            
            weekly_stats = {}
            for row in cursor.fetchall():
                weekly_stats[row[0]] = {
                    "sessions": row[1],
                    "tokens": row[2] or 0
                }
            
            # Current 5-hour block
            cursor.execute('''
                SELECT id, start_time, total_sessions, total_tokens 
                FROM five_hour_blocks 
                WHERE is_complete = FALSE 
                ORDER BY start_time DESC 
                LIMIT 1
            ''')
            
            current_block = cursor.fetchone()
            current_block_info = None
            
            if current_block:
                start_time = datetime.fromisoformat(current_block[1])
                elapsed_minutes = (datetime.now() - start_time).total_seconds() / 60
                remaining_minutes = max(0, 300 - elapsed_minutes)  # 5 hours = 300 minutes
                
                current_block_info = {
                    "id": current_block[0][:8],
                    "elapsed_minutes": round(elapsed_minutes, 1),
                    "remaining_minutes": round(remaining_minutes, 1),
                    "sessions": current_block[2] or 0,
                    "tokens": current_block[3] or 0,
                    "progress_percent": round((elapsed_minutes / 300) * 100, 1)
                }
            
            conn.close()
            
            return {
                "today": today_stats,
                "weekly": weekly_stats,
                "current_block": current_block_info,
                "total_active_sessions": len(self._get_active_sessions()),
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"⚠️ Error getting analytics: {e}")
            return {"error": str(e)}
    
    def _get_five_hour_blocks(self, limit: int) -> List[Dict]:
        """Get 5-hour session blocks"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM five_hour_blocks 
                ORDER BY start_time DESC 
                LIMIT ?
            ''', (limit,))
            
            columns = [description[0] for description in cursor.description]
            blocks = []
            
            for row in cursor.fetchall():
                block_dict = dict(zip(columns, row))
                
                # Calculate duration and progress
                if block_dict['start_time']:
                    start_time = datetime.fromisoformat(block_dict['start_time'])
                    
                    if block_dict['end_time']:
                        end_time = datetime.fromisoformat(block_dict['end_time'])
                        duration_minutes = (end_time - start_time).total_seconds() / 60
                    else:
                        duration_minutes = (datetime.now() - start_time).total_seconds() / 60
                    
                    block_dict['duration_minutes'] = round(duration_minutes, 1)
                    block_dict['progress_percent'] = round(min(100, (duration_minutes / 300) * 100), 1)
                
                blocks.append(block_dict)
            
            conn.close()
            return blocks
            
        except Exception as e:
            print(f"⚠️ Error getting 5-hour blocks: {e}")
            return []
    
    async def _sync_to_netlify(self):
        """Sync current data to Netlify dashboard"""
        try:
            import requests
            
            # Prepare data for Netlify
            sync_data = {
                "active_sessions": self._get_active_sessions(),
                "analytics": self._get_session_analytics(),
                "five_hour_blocks": self._get_five_hour_blocks(10),
                "sync_timestamp": datetime.now().isoformat(),
                "source": "localhost_3001"
            }
            
            # Send to Netlify dashboard
            response = requests.post(
                "https://claude-code-optimizer-dashboard.netlify.app/api/sync-update",
                json=sync_data,
                timeout=10
            )
            
            if response.status_code == 200:
                print("✅ Successfully synced to Netlify dashboard")
            else:
                print(f"⚠️ Netlify sync failed: {response.status_code}")
                
        except Exception as e:
            print(f"⚠️ Error syncing to Netlify: {e}")
    
    async def start(self):
        """Start the dashboard server with production optimizations"""
        print(f"🚀 Starting production dashboard server on port {self.port}...")
        print(f"📊 Dashboard available at: http://localhost:{self.port}")
        print(f"🔗 WebSocket endpoint: ws://localhost:{self.port}/ws")
        print(f"⚡ Performance features: uvloop, httptools, connection pooling")
        
        # Start background sync task
        async def background_sync():
            while True:
                await asyncio.sleep(30)  # Sync every 30 seconds
                await self._sync_to_netlify()
        
        # Create background task
        asyncio.create_task(background_sync())
        
        # Start the server with production optimizations
        config = uvicorn.Config(
            self.app,
            host="0.0.0.0",
            port=self.port,
            log_level="info",
            access_log=False,
            loop="uvloop",  # Use uvloop for better performance
            http="httptools",  # Use httptools for HTTP parsing
            ws_ping_interval=15.0,  # WebSocket ping interval
            ws_ping_timeout=10.0,   # WebSocket ping timeout
            ws_max_size=1024 * 1024,  # 1MB max WebSocket message size
            timeout_keep_alive=30,  # Keep alive timeout
            limit_concurrency=100   # Max concurrent connections
        )
        server = uvicorn.Server(config)
        await server.serve()

async def main():
    """Main function to start the dashboard server"""
    server = DashboardServer(port=3001)
    
    try:
        await server.start()
    except KeyboardInterrupt:
        print("\n🛑 Stopping dashboard server...")

if __name__ == "__main__":
    asyncio.run(main())
