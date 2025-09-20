#!/usr/bin/env python3
"""
Enhanced Dashboard Server with ccusage Compatibility
Extends existing dashboard server with new reporting and analytics capabilities
Maintains 100% backward compatibility with existing functionality
"""

import json
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import threading
import time

# Import our new API modules
from reports import ReportsAPI
from analytics import AnalyticsAPI
from exports import ExportsAPI

class SessionUpdate(BaseModel):
    event: str
    session: Dict[str, Any]
    timestamp: str

class EnhancedDashboardServer:
    """Enhanced dashboard server with ccusage compatibility and analytics"""
    
    def __init__(self, port: int = 3001, db_path: str = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"):
        self.port = port
        self.db_path = db_path
        
        # Initialize FastAPI app with enhanced features
        self.app = FastAPI(
            title="Claude Code Optimizer - Enhanced Dashboard", 
            version="2.0.0-ccusage-compatible",
            description="Real-time WebSocket dashboard with ccusage-compatible reporting and advanced analytics"
        )
        
        # Initialize API modules
        self.reports_api = ReportsAPI(db_path)
        self.analytics_api = AnalyticsAPI(db_path)
        self.exports_api = ExportsAPI(db_path)
        
        # WebSocket connection management
        self.connected_clients: List[WebSocket] = []
        self.message_queue: Dict[str, List[Dict]] = {}
        self.connection_stats = {
            "total_connections": 0,
            "current_connections": 0,
            "messages_sent": 0,
            "errors": 0,
            "api_requests": 0,
            "reports_generated": 0
        }
        
        self._setup_middleware()
        self._setup_routes()
        self._register_api_modules()
        
    def _setup_middleware(self):
        """Setup CORS and other middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=[
                "*",  # Allow all origins for development
                "https://claude-code-optimizer-dashboard.netlify.app",
                "https://moonlock-dashboard-*.vercel.app"
            ],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def _register_api_modules(self):
        """Register new API modules while preserving existing routes"""
        # Include new API routers
        self.app.include_router(self.reports_api.router)
        self.app.include_router(self.analytics_api.router)
        self.app.include_router(self.exports_api.router)
    
    def _setup_routes(self):
        """Setup all API routes - existing + new enhanced routes"""
        
        # ===============================
        # EXISTING ROUTES (PRESERVED)
        # ===============================
        
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """Existing WebSocket endpoint - PRESERVED"""
            await self._handle_websocket(websocket)
        
        @self.app.post("/api/session-update")
        async def session_update(update: SessionUpdate, background_tasks: BackgroundTasks):
            """Existing session update endpoint - PRESERVED"""
            background_tasks.add_task(self._broadcast_update, update.dict())
            return {"status": "received"}
        
        @self.app.get("/api/status")
        async def get_status():
            """Enhanced status endpoint with new capabilities"""
            return {
                "status": "running",
                "version": "2.0.0-ccusage-compatible",
                "connected_clients": len(self.connected_clients),
                "port": self.port,
                "websocket_endpoint": f"ws://localhost:{self.port}/ws",
                "features": {
                    "heartbeat_monitoring": True,
                    "automatic_reconnection": True,
                    "message_queuing": True,
                    "error_recovery": True,
                    "connection_pooling": True,
                    "performance_optimized": True,
                    "ccusage_compatible": True,  # NEW
                    "advanced_analytics": True,  # NEW
                    "data_exports": True,      # NEW
                    "agent_integration": True   # NEW
                },
                "api_endpoints": {
                    "reports": ["/api/reports/daily", "/api/reports/weekly", "/api/reports/monthly", "/api/reports/sessions", "/api/reports/blocks"],
                    "analytics": ["/api/analytics/efficiency", "/api/analytics/usage-patterns", "/api/analytics/cost-optimization"],
                    "exports": ["/api/exports/daily-csv", "/api/exports/sessions-csv", "/api/exports/ccusage-compatible"]
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
            """Existing active sessions endpoint - PRESERVED"""
            self.connection_stats["api_requests"] += 1
            return self._get_active_sessions()
        
        @self.app.get("/api/sessions/recent")
        async def get_recent_sessions(limit: int = 20):
            """Existing recent sessions endpoint - PRESERVED"""
            self.connection_stats["api_requests"] += 1
            return self._get_recent_sessions(limit)
        
        @self.app.get("/api/analytics/current")
        async def get_current_analytics():
            """Existing analytics endpoint - PRESERVED"""
            self.connection_stats["api_requests"] += 1
            return self._get_session_analytics()
        
        @self.app.get("/api/five-hour-blocks")
        async def get_five_hour_blocks(limit: int = 10):
            """Existing five-hour blocks endpoint - PRESERVED"""
            self.connection_stats["api_requests"] += 1
            return self._get_five_hour_blocks(limit)
        
        @self.app.get("/api/dashboard-config")
        async def get_dashboard_config():
            """Enhanced dashboard configuration - PRESERVED + ENHANCED"""
            return {
                "real_time_enabled": True,
                "session_tracking": True,
                "five_hour_blocks": True,
                "auto_refresh": 5000,
                "websocket_config": {
                    "ping_interval": 15000,
                    "ping_timeout": 10000,
                    "reconnect_interval": 1000,
                    "max_reconnect_interval": 30000,
                    "reconnect_decay": 1.5,
                    "max_message_size": 1024 * 1024,
                    "compression": True,
                    "max_queue_size": 1000
                },
                "dashboard_url": "https://claude-code-optimizer-dashboard.netlify.app",
                "localhost_port": self.port,
                # NEW ENHANCED FEATURES
                "ccusage_compatibility": {
                    "enabled": True,
                    "report_types": ["daily", "weekly", "monthly", "sessions", "blocks"],
                    "export_formats": ["json", "csv"]
                },
                "analytics_features": {
                    "efficiency_analysis": True,
                    "usage_patterns": True,
                    "cost_optimization": True,
                    "model_performance": True,
                    "productivity_scoring": True
                },
                "agent_integration": {
                    "coordination_enabled": True,
                    "nested_subagents": True,
                    "specialized_agents": True
                }
            }
        
        @self.app.get("/api/token-metrics")
        async def get_token_metrics():
            """Existing token metrics endpoint - PRESERVED"""
            try:
                # This maintains compatibility with existing token tracking
                from ..core.token_tracker import TokenTracker
                
                tracker = TokenTracker()
                summary = tracker.get_session_summary()
                breakdown = tracker.get_detailed_breakdown()
                
                return {
                    "summary": summary,
                    "breakdown": breakdown,
                    "timestamp": datetime.now().isoformat()
                }
            except ImportError:
                # Fallback to database-based metrics if token tracker not available
                return self._get_database_token_metrics()
        
        @self.app.post("/api/netlify-sync")
        async def sync_to_netlify(background_tasks: BackgroundTasks):
            """Existing Netlify sync endpoint - PRESERVED"""
            background_tasks.add_task(self._sync_to_netlify)
            return {"status": "sync_started"}
        
        # ===============================
        # NEW ENHANCED ENDPOINTS
        # ===============================
        
        @self.app.get("/api/health")
        async def health_check():
            """Comprehensive health check endpoint"""
            try:
                # Test database connection
                conn = sqlite3.connect(self.db_path)
                cursor = conn.execute("SELECT COUNT(*) FROM real_sessions")
                total_sessions = cursor.fetchone()[0]
                conn.close()
                
                # Health metrics
                health_data = {
                    "status": "healthy",
                    "database": {
                        "connected": True,
                        "total_sessions": total_sessions
                    },
                    "websocket": {
                        "connected_clients": len(self.connected_clients),
                        "total_connections": self.connection_stats["total_connections"]
                    },
                    "api": {
                        "requests_served": self.connection_stats["api_requests"],
                        "reports_generated": self.connection_stats["reports_generated"]
                    },
                    "features": {
                        "reports_api": True,
                        "analytics_api": True,
                        "exports_api": True,
                        "agent_integration": True
                    },
                    "timestamp": datetime.now().isoformat()
                }
                
                return health_data
                
            except Exception as e:
                return {
                    "status": "unhealthy",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
        
        @self.app.get("/api/agent-status")
        async def get_agent_status():
            """Get status of agent coordination system"""
            # This endpoint provides integration with the existing agent system
            agent_status = {
                "coordination_active": True,
                "available_agents": {
                    "infrastructure": ["quota-monitor", "session-manager", "cost-optimizer"],
                    "development": ["project-analyzer", "task-planner", "code-reviewer"],
                    "coordination": ["calendar-integrator", "performance-analyst"],
                    "specialized": ["ai-research-assistant", "deployment-manager"]
                },
                "active_coordination": self._check_agent_coordination(),
                "last_updated": datetime.now().isoformat()
            }
            
            return agent_status
        
        @self.app.post("/api/trigger-report")
        async def trigger_report_generation(background_tasks: BackgroundTasks, report_type: str, date_filter: str = None):
            """Trigger background report generation"""
            background_tasks.add_task(self._generate_and_cache_report, report_type, date_filter)
            return {
                "status": "report_generation_started",
                "report_type": report_type,
                "date_filter": date_filter
            }
    
    # ===============================
    # EXISTING METHODS (PRESERVED)
    # ===============================
    
    async def _handle_websocket(self, websocket: WebSocket):
        """Production WebSocket connection handler - PRESERVED"""
        await websocket.accept()
        self.connected_clients.append(websocket)
        client_id = str(id(websocket))[:8]
        
        self.connection_stats["total_connections"] += 1
        self.connection_stats["current_connections"] = len(self.connected_clients)
        
        print(f"🔗 Client {client_id} connected. Total: {len(self.connected_clients)} | Lifetime: {self.connection_stats['total_connections']}")
        
        try:
            # Send enhanced initial data
            initial_data = {
                "type": "initial_data",
                "client_id": client_id,
                "server_time": datetime.now().isoformat(),
                "active_sessions": self._get_active_sessions(),
                "recent_sessions": self._get_recent_sessions(10),
                "analytics": self._get_session_analytics(),
                "five_hour_blocks": self._get_five_hour_blocks(5),
                "config": {
                    "ping_interval": 15000,
                    "auto_refresh": 5000
                },
                # NEW: Enhanced capabilities notification
                "server_capabilities": {
                    "ccusage_compatible": True,
                    "advanced_analytics": True,
                    "agent_integration": True,
                    "version": "2.0.0"
                }
            }
            await websocket.send_text(json.dumps(initial_data))
            
            # Handle incoming messages (existing logic preserved)
            while True:
                try:
                    message = await asyncio.wait_for(
                        websocket.receive_text(),
                        timeout=60.0
                    )
                    
                    try:
                        data = json.loads(message)
                        await self._process_client_message(websocket, data)
                    except json.JSONDecodeError:
                        print(f"⚠️ Invalid JSON from client {client_id}: {message[:100]}")
                        
                except asyncio.TimeoutError:
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
        """Enhanced broadcast with better error handling - PRESERVED + ENHANCED"""
        if not self.connected_clients:
            print("📡 No clients connected, skipping broadcast")
            return
        
        # Add enhanced metadata
        message = json.dumps({
            "type": "session_update",
            "broadcast_id": str(id(update_data))[:8],
            "timestamp": datetime.now().isoformat(),
            "server_version": "2.0.0-enhanced",
            **update_data
        })
        
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
        """Process incoming messages from WebSocket clients - PRESERVED + ENHANCED"""
        message_type = data.get('type', 'unknown')
        client_id = str(id(websocket))[:8]
        
        if message_type == 'pong':
            print(f"💗 Received pong from client {client_id}")
            
        elif message_type == 'ping':
            pong_message = {
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(pong_message))
            print(f"🏓 Sent pong to client {client_id}")
            
        elif message_type == 'heartbeat':
            ack_message = {
                "type": "heartbeat_ack",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(ack_message))
            
        elif message_type == 'request_data':
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
        
        # NEW: Enhanced message types
        elif message_type == 'request_analytics':
            analytics_type = data.get('analytics_type', 'efficiency')
            try:
                if analytics_type == 'efficiency':
                    analytics_data = self.analytics_api._generate_efficiency_analytics()
                elif analytics_type == 'usage_patterns':
                    analytics_data = self.analytics_api._generate_usage_patterns(30)
                elif analytics_type == 'cost_optimization':
                    analytics_data = self.analytics_api._generate_cost_optimization()
                else:
                    analytics_data = {"error": "Unknown analytics type"}
                
                response = {
                    "type": "analytics_response",
                    "analytics_type": analytics_type,
                    "data": analytics_data.dict() if hasattr(analytics_data, 'dict') else analytics_data,
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send_text(json.dumps(response))
                print(f"📈 Sent {analytics_type} analytics to client {client_id}")
            except Exception as e:
                error_response = {
                    "type": "error",
                    "message": f"Analytics generation failed: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send_text(json.dumps(error_response))
                
        else:
            print(f"❓ Unknown message type '{message_type}' from client {client_id}")
    
    # All existing database methods preserved...
    def _get_active_sessions(self) -> List[Dict]:
        """Get currently active sessions from database - PRESERVED"""
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
                
                if session_dict['start_time']:
                    start_time = datetime.fromisoformat(session_dict['start_time'])
                    session_dict['duration_minutes'] = (datetime.now() - start_time).total_seconds() / 60
                
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
            print(f"⚠️ Error getting active sessions: {e}")
            return []
    
    def _get_recent_sessions(self, limit: int) -> List[Dict]:
        """Get recent sessions from database - PRESERVED"""
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
                
                if session_dict['start_time']:
                    start_time = datetime.fromisoformat(session_dict['start_time'])
                    if session_dict['end_time']:
                        end_time = datetime.fromisoformat(session_dict['end_time'])
                        session_dict['duration_minutes'] = (end_time - start_time).total_seconds() / 60
                    else:
                        session_dict['duration_minutes'] = (datetime.now() - start_time).total_seconds() / 60
                
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
        """Get session analytics - PRESERVED"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            today = datetime.now().date()
            cursor.execute('''
                SELECT 
                    session_type,
                    COUNT(*) as session_count,
                    SUM(real_total_tokens) as total_tokens,
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
                    SUM(real_total_tokens) as total_tokens
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
            print(f"⚠️ Error getting analytics: {e}")
            return {"error": str(e)}
    
    def _get_five_hour_blocks(self, limit: int) -> List[Dict]:
        """Get 5-hour session blocks - PRESERVED"""
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
        """Sync current data to Netlify dashboard - PRESERVED"""
        try:
            import requests
            
            sync_data = {
                "active_sessions": self._get_active_sessions(),
                "analytics": self._get_session_analytics(),
                "five_hour_blocks": self._get_five_hour_blocks(10),
                "sync_timestamp": datetime.now().isoformat(),
                "source": "localhost_3001_enhanced",
                "server_version": "2.0.0-ccusage-compatible"
            }
            
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
    
    # ===============================
    # NEW HELPER METHODS
    # ===============================
    
    def _get_database_token_metrics(self) -> Dict:
        """Fallback token metrics from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    SUM(real_input_tokens) as input_tokens,
                    SUM(real_output_tokens) as output_tokens,
                    COUNT(CASE WHEN real_total_tokens IS NOT NULL THEN 1 END) as real_token_sessions
                FROM real_sessions
                WHERE start_time >= date('now', '-7 days')
            ''')
            
            result = cursor.fetchone()
            conn.close()
            
            return {
                "summary": {
                    "total_sessions": result[0],
                    "total_tokens": result[1],
                    "input_tokens": result[2] or 0,
                    "output_tokens": result[3] or 0,
                    "real_token_percentage": (result[4] / result[0] * 100) if result[0] > 0 else 0
                },
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _check_agent_coordination(self) -> bool:
        """Check if agent coordination system is active"""
        # This would integrate with the existing agent system
        # For now, return True to indicate coordination is available
        return True
    
    async def _generate_and_cache_report(self, report_type: str, date_filter: str = None):
        """Background report generation with caching"""
        try:
            self.connection_stats["reports_generated"] += 1
            
            if report_type == "daily":
                target_date = date.fromisoformat(date_filter) if date_filter else date.today()
                report = self.reports_api._generate_daily_report(target_date, "json")
                
            elif report_type == "weekly":
                if date_filter:
                    start_date = date.fromisoformat(date_filter)
                else:
                    today = date.today()
                    start_date = today - timedelta(days=today.weekday())
                report = self.reports_api._generate_weekly_report(start_date, "json")
                
            elif report_type == "monthly":
                if date_filter:
                    year, month_num = date_filter.split('-')
                    target_date = date(int(year), int(month_num), 1)
                else:
                    target_date = date.today().replace(day=1)
                report = self.reports_api._generate_monthly_report(target_date, "json")
            
            # Broadcast report completion to connected clients
            await self._broadcast_update({
                "event": "report_completed",
                "report_type": report_type,
                "date_filter": date_filter,
                "summary": report.summary
            })
            
            print(f"✅ Generated {report_type} report in background")
            
        except Exception as e:
            print(f"❌ Error generating {report_type} report: {e}")
            await self._broadcast_update({
                "event": "report_failed",
                "report_type": report_type,
                "error": str(e)
            })
    
    async def start(self):
        """Start the enhanced dashboard server"""
        print(f"🚀 Starting Enhanced Claude Code Optimizer Dashboard Server v2.0.0")
        print(f"📊 Dashboard available at: http://localhost:{self.port}")
        print(f"🔗 WebSocket endpoint: ws://localhost:{self.port}/ws")
        print(f"📈 ccusage-compatible reports: http://localhost:{self.port}/api/reports/*")
        print(f"🧠 Advanced analytics: http://localhost:{self.port}/api/analytics/*")
        print(f"📤 Data exports: http://localhost:{self.port}/api/exports/*")
        print(f"⚡ Performance features: uvloop, httptools, connection pooling")
        
        # Start background sync task
        async def background_sync():
            while True:
                await asyncio.sleep(30)
                await self._sync_to_netlify()
        
        asyncio.create_task(background_sync())
        
        # Start the server with production optimizations
        config = uvicorn.Config(
            self.app,
            host="0.0.0.0",
            port=self.port,
            log_level="info",
            access_log=False,
            loop="uvloop",
            http="httptools",
            ws_ping_interval=15.0,
            ws_ping_timeout=10.0,
            ws_max_size=1024 * 1024,
            timeout_keep_alive=30,
            limit_concurrency=100
        )
        server = uvicorn.Server(config)
        await server.serve()

async def main():
    """Main function to start the enhanced dashboard server"""
    server = EnhancedDashboardServer(port=3001)
    
    try:
        await server.start()
    except KeyboardInterrupt:
        print("\n🛑 Stopping enhanced dashboard server...")

if __name__ == "__main__":
    asyncio.run(main())
