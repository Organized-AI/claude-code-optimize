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
        self.app = FastAPI(title="Claude Session Monitor", version="1.0.0")
        self.connected_clients: List[WebSocket] = []
        
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
            """Get current monitoring status"""
            return {
                "status": "running",
                "connected_clients": len(self.connected_clients),
                "port": self.port,
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
            """Get dashboard configuration"""
            return {
                "real_time_enabled": True,
                "session_tracking": True,
                "five_hour_blocks": True,
                "auto_refresh": 5000,  # 5 seconds
                "dashboard_url": "https://claude-code-optimizer-dashboard.netlify.app",
                "localhost_port": self.port
            }
        
        @self.app.post("/api/netlify-sync")
        async def sync_to_netlify(background_tasks: BackgroundTasks):
            """Sync current data to Netlify dashboard"""
            background_tasks.add_task(self._sync_to_netlify)
            return {"status": "sync_started"}
    
    async def _handle_websocket(self, websocket: WebSocket):
        """Handle WebSocket connections for real-time updates"""
        await websocket.accept()
        self.connected_clients.append(websocket)
        
        try:
            # Send initial data
            initial_data = {
                "type": "initial_data",
                "active_sessions": self._get_active_sessions(),
                "recent_sessions": self._get_recent_sessions(10),
                "analytics": self._get_session_analytics(),
                "five_hour_blocks": self._get_five_hour_blocks(5)
            }
            await websocket.send_text(json.dumps(initial_data))
            
            # Keep connection alive
            while True:
                await websocket.receive_text()
                
        except WebSocketDisconnect:
            self.connected_clients.remove(websocket)
    
    async def _broadcast_update(self, update_data: Dict):
        """Broadcast updates to all connected clients"""
        if not self.connected_clients:
            return
            
        message = json.dumps({
            "type": "session_update", 
            **update_data
        })
        
        # Remove disconnected clients
        connected_clients = []
        for client in self.connected_clients:
            try:
                await client.send_text(message)
                connected_clients.append(client)
            except:
                pass  # Client disconnected
        
        self.connected_clients = connected_clients
    
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
    
    def start(self):
        """Start the dashboard server"""
        print(f"🚀 Starting dashboard server on port {self.port}...")
        print(f"📊 Dashboard available at: http://localhost:{self.port}")
        print(f"🔗 WebSocket endpoint: ws://localhost:{self.port}/ws")
        
        # Start background sync task
        def background_sync():
            while True:
                time.sleep(30)  # Sync every 30 seconds
                asyncio.create_task(self._sync_to_netlify())
        
        sync_thread = threading.Thread(target=background_sync, daemon=True)
        sync_thread.start()
        
        # Start the server
        uvicorn.run(
            self.app,
            host="0.0.0.0",
            port=self.port,
            log_level="info",
            access_log=False
        )

def main():
    """Main function to start the dashboard server"""
    server = DashboardServer(port=3001)
    
    try:
        server.start()
    except KeyboardInterrupt:
        print("\n🛑 Stopping dashboard server...")

if __name__ == "__main__":
    main()
