#!/usr/bin/env python3
"""
Enhanced Real-time Dashboard Server with Robust WebSocket Infrastructure
- Heartbeat/ping-pong mechanism for connection health monitoring
- Automatic reconnection support with exponential backoff
- Message queuing for offline clients
- Comprehensive error handling and logging
- Connection pool management with client tracking
"""

import json
import sqlite3
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Set, Optional
from dataclasses import dataclass, asdict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import uuid
import time
from collections import deque

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class WebSocketClient:
    """WebSocket client connection info"""
    id: str
    websocket: WebSocket
    connected_at: datetime
    last_ping: Optional[datetime] = None
    last_pong: Optional[datetime] = None
    missed_pings: int = 0
    message_queue: deque = None
    
    def __post_init__(self):
        if self.message_queue is None:
            self.message_queue = deque(maxlen=100)  # Keep last 100 messages

class SessionUpdate(BaseModel):
    event: str
    session: Dict[str, Any]
    timestamp: str

class EnhancedDashboardServer:
    """Enhanced real-time dashboard server with robust WebSocket infrastructure"""
    
    def __init__(self, port: int = 3001, db_path: str = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"):
        self.port = port
        self.db_path = db_path
        self.app = FastAPI(title="Enhanced Claude Session Monitor", version="2.0.0")
        self.clients: Dict[str, WebSocketClient] = {}
        self.message_history: deque = deque(maxlen=1000)  # Keep last 1000 messages
        
        # Configuration
        self.ping_interval = 15  # Send ping every 15 seconds
        self.ping_timeout = 10   # Wait 10 seconds for pong response
        self.max_missed_pings = 3  # Disconnect after 3 missed pongs
        self.sync_interval = 30    # Sync to Netlify every 30 seconds
        
        # Background tasks
        self._background_tasks: Set[asyncio.Task] = set()
        self._shutdown_event = asyncio.Event()
        
        self._setup_middleware()
        self._setup_routes()
        
    def _setup_middleware(self):
        """Setup CORS and other middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _setup_routes(self):
        """Setup API routes with enhanced error handling"""
        
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await self._handle_websocket_connection(websocket)
        
        @self.app.post("/api/session-update")
        async def session_update(update: SessionUpdate):
            """Receive session updates and broadcast to all clients"""
            try:
                await self._broadcast_update(update.dict())
                return {"status": "received", "clients_notified": len(self.clients)}
            except Exception as e:
                logger.error(f"Error processing session update: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/status")
        async def get_status():
            """Enhanced status endpoint with connection details"""
            return {
                "status": "running",
                "connected_clients": len(self.clients),
                "active_clients": len([c for c in self.clients.values() if c.websocket.client_state.name == 'CONNECTED']),
                "port": self.port,
                "ping_interval": self.ping_interval,
                "message_history_size": len(self.message_history),
                "uptime": self._get_uptime(),
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.get("/api/clients")
        async def get_clients():
            """Get detailed client connection information"""
            return {
                "clients": [
                    {
                        "id": client.id[:8],
                        "connected_at": client.connected_at.isoformat(),
                        "last_ping": client.last_ping.isoformat() if client.last_ping else None,
                        "last_pong": client.last_pong.isoformat() if client.last_pong else None,
                        "missed_pings": client.missed_pings,
                        "queued_messages": len(client.message_queue),
                        "connection_state": client.websocket.client_state.name
                    }
                    for client in self.clients.values()
                ],
                "total_clients": len(self.clients)
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
            """Get enhanced dashboard configuration"""
            return {
                "real_time_enabled": True,
                "session_tracking": True,
                "five_hour_blocks": True,
                "auto_refresh": 5000,
                "websocket_config": {
                    "ping_interval": self.ping_interval * 1000,  # Convert to milliseconds
                    "ping_timeout": self.ping_timeout * 1000,
                    "max_missed_pings": self.max_missed_pings,
                    "reconnect_interval": 1000,
                    "max_reconnect_interval": 30000
                },
                "dashboard_url": "https://claude-code-optimizer-dashboard.netlify.app",
                "localhost_port": self.port
            }
        
        @self.app.post("/api/netlify-sync")
        async def sync_to_netlify():
            """Manually trigger sync to Netlify dashboard"""
            try:
                await self._sync_to_netlify()
                return {"status": "sync_completed", "timestamp": datetime.now().isoformat()}
            except Exception as e:
                logger.error(f"Manual Netlify sync failed: {e}")
                raise HTTPException(status_code=500, detail=str(e))

    async def _handle_websocket_connection(self, websocket: WebSocket):
        """Enhanced WebSocket connection handler with robust error handling"""
        client_id = str(uuid.uuid4())
        
        try:
            await websocket.accept()
            
            # Create client object
            client = WebSocketClient(
                id=client_id,
                websocket=websocket,
                connected_at=datetime.now()
            )
            
            self.clients[client_id] = client
            logger.info(f"Client {client_id[:8]} connected. Total clients: {len(self.clients)}")
            
            # Send initial data
            await self._send_initial_data(client)
            
            # Send any queued messages
            await self._send_queued_messages(client)
            
            # Handle incoming messages
            await self._handle_client_messages(client)
            
        except WebSocketDisconnect:
            logger.info(f"Client {client_id[:8]} disconnected normally")
            
        except Exception as e:
            logger.error(f"Error handling client {client_id[:8]}: {e}")
            
        finally:
            # Clean up client
            if client_id in self.clients:
                del self.clients[client_id]
                logger.info(f"Client {client_id[:8]} removed. Remaining clients: {len(self.clients)}")
    
    async def _handle_client_messages(self, client: WebSocketClient):
        """Handle incoming messages from WebSocket client"""
        try:
            while True:
                try:
                    # Wait for message with timeout
                    message = await asyncio.wait_for(
                        client.websocket.receive_text(),
                        timeout=60.0  # 60 second timeout
                    )
                    
                    # Parse message
                    try:
                        data = json.loads(message)
                        await self._process_client_message(client, data)
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON from client {client.id[:8]}: {message[:100]}")
                        
                except asyncio.TimeoutError:
                    # Send ping to check if client is still alive
                    await self._send_ping(client)
                    
                except WebSocketDisconnect:
                    break
                    
        except Exception as e:
            logger.error(f"Error handling messages for client {client.id[:8]}: {e}")
            raise
    
    async def _process_client_message(self, client: WebSocketClient, data: Dict):
        """Process incoming client message"""
        message_type = data.get('type', 'unknown')
        
        if message_type == 'pong':
            # Client responded to ping
            client.last_pong = datetime.now()
            client.missed_pings = 0
            logger.debug(f"Received pong from client {client.id[:8]}")
            
        elif message_type == 'ping':
            # Client sent ping, respond with pong
            await self._send_pong(client)
            
        elif message_type == 'heartbeat':
            # Client heartbeat
            await self._send_message(client, {
                "type": "heartbeat_ack",
                "timestamp": datetime.now().isoformat()
            })
            
        elif message_type == 'request_data':
            # Client requesting fresh data
            await self._send_initial_data(client)
            
        else:
            logger.debug(f"Unknown message type '{message_type}' from client {client.id[:8]}")
    
    async def _send_initial_data(self, client: WebSocketClient):
        """Send initial data to newly connected client"""
        try:
            initial_data = {
                "type": "initial_data",
                "client_id": client.id,
                "server_time": datetime.now().isoformat(),
                "active_sessions": self._get_active_sessions(),
                "recent_sessions": self._get_recent_sessions(10),
                "analytics": self._get_session_analytics(),
                "five_hour_blocks": self._get_five_hour_blocks(5),
                "config": {
                    "ping_interval": self.ping_interval * 1000,
                    "expected_ping_timeout": self.ping_timeout * 1000
                }
            }
            
            await self._send_message(client, initial_data)
            logger.info(f"Sent initial data to client {client.id[:8]}")
            
        except Exception as e:
            logger.error(f"Error sending initial data to client {client.id[:8]}: {e}")
    
    async def _send_queued_messages(self, client: WebSocketClient):
        """Send any queued messages to client"""
        try:
            while client.message_queue:
                message = client.message_queue.popleft()
                await self._send_message(client, message)
                
        except Exception as e:
            logger.error(f"Error sending queued messages to client {client.id[:8]}: {e}")
    
    async def _send_message(self, client: WebSocketClient, message: Dict):
        """Send message to specific client with error handling"""
        try:
            await client.websocket.send_text(json.dumps(message))
            return True
            
        except Exception as e:
            logger.error(f"Error sending message to client {client.id[:8]}: {e}")
            # Queue message for later delivery
            client.message_queue.append(message)
            return False
    
    async def _send_ping(self, client: WebSocketClient):
        """Send ping to client"""
        try:
            ping_message = {
                "type": "ping",
                "timestamp": datetime.now().isoformat()
            }
            
            if await self._send_message(client, ping_message):
                client.last_ping = datetime.now()
                logger.debug(f"Sent ping to client {client.id[:8]}")
            else:
                client.missed_pings += 1
                
        except Exception as e:
            logger.error(f"Error sending ping to client {client.id[:8]}: {e}")
            client.missed_pings += 1
    
    async def _send_pong(self, client: WebSocketClient):
        """Send pong response to client"""
        pong_message = {
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }
        await self._send_message(client, pong_message)
    
    async def _broadcast_update(self, update_data: Dict):
        """Enhanced broadcast with message queuing and error handling"""
        if not self.clients:
            logger.debug("No clients connected, skipping broadcast")
            return
        
        # Add to message history
        broadcast_message = {
            "type": "session_update",
            "broadcast_id": str(uuid.uuid4())[:8],
            "timestamp": datetime.now().isoformat(),
            **update_data
        }
        
        self.message_history.append(broadcast_message)
        
        # Broadcast to all clients
        successful_sends = 0
        failed_clients = []
        
        for client_id, client in list(self.clients.items()):
            try:
                if await self._send_message(client, broadcast_message):
                    successful_sends += 1
                else:
                    failed_clients.append(client_id[:8])
                    
            except Exception as e:
                logger.error(f"Error broadcasting to client {client_id[:8]}: {e}")
                failed_clients.append(client_id[:8])
        
        logger.info(f"Broadcast completed: {successful_sends}/{len(self.clients)} clients reached")
        if failed_clients:
            logger.warning(f"Failed to reach clients: {failed_clients}")
    
    async def _connection_monitor_task(self):
        """Background task to monitor client connections"""
        logger.info("Connection monitor started")
        
        while not self._shutdown_event.is_set():
            try:
                current_time = datetime.now()
                disconnected_clients = []
                
                for client_id, client in list(self.clients.items()):
                    # Check for missed pings
                    if client.missed_pings >= self.max_missed_pings:
                        logger.warning(f"Client {client_id[:8]} missed {client.missed_pings} pings, disconnecting")
                        disconnected_clients.append(client_id)
                        continue
                    
                    # Check if we need to send a ping
                    if (not client.last_ping or 
                        (current_time - client.last_ping).total_seconds() >= self.ping_interval):
                        await self._send_ping(client)
                    
                    # Check for stale connections (no pong response)
                    if (client.last_ping and 
                        (not client.last_pong or client.last_pong < client.last_ping) and
                        (current_time - client.last_ping).total_seconds() > self.ping_timeout):
                        client.missed_pings += 1
                
                # Clean up disconnected clients
                for client_id in disconnected_clients:
                    if client_id in self.clients:
                        try:
                            await self.clients[client_id].websocket.close()
                        except:
                            pass
                        del self.clients[client_id]
                        logger.info(f"Removed stale client {client_id[:8]}")
                
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in connection monitor: {e}")
                await asyncio.sleep(10)
    
    async def _netlify_sync_task(self):
        """Background task for Netlify synchronization"""
        logger.info("Netlify sync task started")
        
        while not self._shutdown_event.is_set():
            try:
                await self._sync_to_netlify()
                await asyncio.sleep(self.sync_interval)
                
            except Exception as e:
                logger.error(f"Error in Netlify sync task: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _sync_to_netlify(self):
        """Sync current data to Netlify dashboard"""
        try:
            import httpx
            
            sync_data = {
                "active_sessions": self._get_active_sessions(),
                "analytics": self._get_session_analytics(),
                "five_hour_blocks": self._get_five_hour_blocks(10),
                "server_status": {
                    "connected_clients": len(self.clients),
                    "uptime": self._get_uptime(),
                    "last_sync": datetime.now().isoformat()
                },
                "sync_timestamp": datetime.now().isoformat(),
                "source": "enhanced_localhost_3001"
            }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://claude-code-optimizer-dashboard.netlify.app/api/sync-update",
                    json=sync_data
                )
                
                if response.status_code == 200:
                    logger.debug("Successfully synced to Netlify dashboard")
                else:
                    logger.warning(f"Netlify sync returned status {response.status_code}")
                    
        except ImportError:
            logger.warning("httpx not installed, using requests for Netlify sync")
            # Fallback to requests
            try:
                import requests
                sync_data = {
                    "active_sessions": self._get_active_sessions(),
                    "analytics": self._get_session_analytics(),
                    "five_hour_blocks": self._get_five_hour_blocks(10),
                    "sync_timestamp": datetime.now().isoformat(),
                    "source": "enhanced_localhost_3001"
                }
                
                response = requests.post(
                    "https://claude-code-optimizer-dashboard.netlify.app/api/sync-update",
                    json=sync_data,
                    timeout=10
                )
                
                if response.status_code == 200:
                    logger.debug("Successfully synced to Netlify dashboard")
                else:
                    logger.warning(f"Netlify sync returned status {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Requests fallback failed: {e}")
                
        except Exception as e:
            logger.error(f"Error syncing to Netlify: {e}")
    
    def _get_uptime(self) -> float:
        """Get server uptime in seconds"""
        if not hasattr(self, '_start_time'):
            self._start_time = time.time()
        return time.time() - self._start_time
    
    # Database methods remain the same as original implementation
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
            logger.error(f"Error getting active sessions: {e}")
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
            logger.error(f"Error getting recent sessions: {e}")
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
                remaining_minutes = max(0, 300 - elapsed_minutes)
                
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
            logger.error(f"Error getting analytics: {e}")
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
            logger.error(f"Error getting 5-hour blocks: {e}")
            return []
    
    async def start_background_tasks(self):
        """Start all background tasks"""
        self._start_time = time.time()
        
        # Start connection monitoring
        monitor_task = asyncio.create_task(self._connection_monitor_task())
        self._background_tasks.add(monitor_task)
        monitor_task.add_done_callback(self._background_tasks.discard)
        
        # Start Netlify sync
        sync_task = asyncio.create_task(self._netlify_sync_task())
        self._background_tasks.add(sync_task)
        sync_task.add_done_callback(self._background_tasks.discard)
        
        logger.info("All background tasks started")
    
    async def stop_background_tasks(self):
        """Stop all background tasks"""
        logger.info("Stopping background tasks...")
        self._shutdown_event.set()
        
        # Cancel all tasks
        for task in self._background_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self._background_tasks:
            await asyncio.gather(*self._background_tasks, return_exceptions=True)
        
        logger.info("Background tasks stopped")
    
    def start(self):
        """Start the enhanced dashboard server"""
        print(f"🚀 Starting Enhanced Dashboard Server v2.0...")
        print(f"📊 Dashboard available at: http://localhost:{self.port}")
        print(f"🔗 WebSocket endpoint: ws://localhost:{self.port}/ws")
        print(f"💓 Ping interval: {self.ping_interval}s")
        print(f"⏰ Sync interval: {self.sync_interval}s")
        
        @self.app.on_event("startup")
        async def startup_event():
            await self.start_background_tasks()
        
        @self.app.on_event("shutdown")
        async def shutdown_event():
            await self.stop_background_tasks()
        
        # Start the server
        uvicorn.run(
            self.app,
            host="0.0.0.0",
            port=self.port,
            log_level="info",
            access_log=True
        )

def main():
    """Main function to start the enhanced dashboard server"""
    server = EnhancedDashboardServer(port=3001)
    
    try:
        server.start()
    except KeyboardInterrupt:
        print("\n🛑 Stopping enhanced dashboard server...")

if __name__ == "__main__":
    main()