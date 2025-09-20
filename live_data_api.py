#!/usr/bin/env python3
"""
Live Data API Bridge for Claude Code Optimizer
Serves real session data with CORS headers for Vercel dashboard
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

class LiveDataAPI:
    """API bridge for real-time session data"""
    
    def __init__(self, db_path: str = "./session_tracker/claude_usage.db", port: int = 3002):
        self.db_path = db_path
        self.port = port
        self.app = FastAPI(
            title="Claude Code Live Data API",
            version="1.0.0",
            description="Live session data for Claude Code Optimizer Dashboard"
        )
        
        # Allow all origins for development
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # In production, specify your Vercel domain
            allow_credentials=True,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["*"],
        )
        
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.get("/")
        async def root():
            return {"status": "Live Data API Running", "timestamp": datetime.now().isoformat()}
        
        @self.app.get("/session-data")
        async def get_session_data():
            """Get current session data for dashboard"""
            return self._get_dashboard_data()
        
        @self.app.get("/rate-limits")
        async def get_rate_limits():
            """Get current rate limit status"""
            return self._get_rate_limit_data()
        
        @self.app.get("/analytics")
        async def get_analytics():
            """Get session analytics"""
            return self._get_analytics_data()
            
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint"""
            try:
                # Test database connection
                conn = sqlite3.connect(self.db_path)
                conn.execute("SELECT 1")
                conn.close()
                return {"status": "healthy", "database": "connected"}
            except Exception as e:
                return {"status": "unhealthy", "error": str(e)}
    
    def _get_dashboard_data(self) -> Dict:
        """Get all data needed for dashboard"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get active session data
            cursor.execute("""
                SELECT * FROM real_sessions 
                WHERE is_active = 1 OR end_time IS NULL
                ORDER BY start_time DESC LIMIT 1
            """)
            active_session = cursor.fetchone()
            
            # Get total tokens from all sessions
            cursor.execute("""
                SELECT 
                    SUM(real_total_tokens) as total_tokens,
                    SUM(billable_tokens) as total_billable,
                    SUM(cost_estimate) as total_cost,
                    COUNT(*) as session_count
                FROM real_sessions
            """)
            totals = cursor.fetchone()
            
            conn.close()
            
            # Format active session data
            session_data = {}
            if active_session:
                session_data = {
                    "activeSessionId": active_session[0],
                    "conversationId": active_session[1],
                    "startTime": active_session[3],
                    "realTokens": active_session[7],  # real_total_tokens
                    "inputTokens": active_session[5],  # real_input_tokens  
                    "outputTokens": active_session[6], # real_output_tokens
                    "billableTokens": active_session[14], # billable_tokens
                    "cacheTokens": active_session[16] + active_session[17], # cache total
                    "costEstimate": active_session[18], # cost_estimate
                    "modelUsed": active_session[11], # models_used
                    "isActive": bool(active_session[12])
                }
            else:
                session_data = {
                    "activeSessionId": "No active session",
                    "realTokens": totals[0] if totals[0] else 0,
                    "totalCost": totals[2] if totals[2] else 0.0,
                    "sessionCount": totals[3] if totals[3] else 0,
                    "isActive": False
                }
                
            return {
                "sessionData": session_data,
                "lastUpdate": datetime.now().isoformat(),
                "dataSource": "live_database"
            }
            
        except Exception as e:
            return {
                "error": f"Database error: {str(e)}",
                "sessionData": {
                    "activeSessionId": "Error loading data",
                    "realTokens": 0,
                    "isActive": False
                },
                "lastUpdate": datetime.now().isoformat(),
                "dataSource": "error"
            }
    
    def _get_rate_limit_data(self) -> Dict:
        """Get current rate limit status"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current 5-hour block
            cursor.execute("""
                SELECT * FROM five_hour_blocks 
                WHERE is_complete = FALSE
                ORDER BY start_time DESC LIMIT 1
            """)
            current_block = cursor.fetchone()
            
            # Get weekly totals (last 7 days)
            week_ago = datetime.now() - timedelta(days=7)
            cursor.execute("""
                SELECT 
                    SUM(total_tokens) as weekly_tokens,
                    COUNT(*) as weekly_sessions,
                    SUM(cost_estimate) as weekly_cost
                FROM real_sessions 
                WHERE start_time >= ?
            """, (week_ago.isoformat(),))
            weekly_data = cursor.fetchone()
            
            conn.close()
            
            # Calculate rate limit percentages
            five_hour_usage = 0.0
            five_hour_tokens = 0
            time_remaining = 300  # 5 hours in minutes
            
            if current_block:
                five_hour_tokens = current_block[4]  # total_tokens
                # Assuming a generous limit of 500k tokens per 5-hour block
                five_hour_usage = min((five_hour_tokens / 500000) * 100, 100)
                
                # Calculate time remaining in current block
                start_time = datetime.fromisoformat(current_block[1])
                elapsed = datetime.now() - start_time
                time_remaining = max(300 - int(elapsed.total_seconds() / 60), 0)
            
            weekly_tokens = weekly_data[0] if weekly_data[0] else 0
            # Assuming weekly limit of 2M tokens
            weekly_usage = min((weekly_tokens / 2000000) * 100, 100)
            
            return {
                "fiveHourLimit": {
                    "usage_percentage": five_hour_usage,
                    "total_tokens": five_hour_tokens,
                    "time_remaining_minutes": time_remaining,
                    "limit_tokens": 500000
                },
                "weeklyLimit": {
                    "usage_percentage": weekly_usage,
                    "total_tokens": weekly_tokens,
                    "total_sessions": weekly_data[1] if weekly_data[1] else 0,
                    "days_remaining": 7 - (datetime.now().weekday()),
                    "limit_tokens": 2000000
                }
            }
            
        except Exception as e:
            return {
                "error": f"Rate limit data error: {str(e)}",
                "fiveHourLimit": {"usage_percentage": 0, "total_tokens": 0},
                "weeklyLimit": {"usage_percentage": 0, "total_tokens": 0}
            }
    
    def _get_analytics_data(self) -> Dict:
        """Get analytics data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get session efficiency trends
            cursor.execute("""
                SELECT 
                    DATE(start_time) as date,
                    AVG(CASE 
                        WHEN real_total_tokens > 0 AND cost_estimate > 0 
                        THEN real_total_tokens / cost_estimate 
                        ELSE 0 
                    END) as efficiency,
                    COUNT(*) as session_count
                FROM real_sessions 
                WHERE start_time >= date('now', '-7 days')
                GROUP BY DATE(start_time)
                ORDER BY date DESC
            """)
            efficiency_data = cursor.fetchall()
            
            conn.close()
            
            return {
                "efficiencyTrends": [
                    {
                        "date": row[0],
                        "efficiency": round(row[1], 2),
                        "sessionCount": row[2]
                    }
                    for row in efficiency_data
                ],
                "totalSessions": len(efficiency_data)
            }
            
        except Exception as e:
            return {
                "error": f"Analytics error: {str(e)}",
                "efficiencyTrends": []
            }
    
    def run(self):
        """Start the API server"""
        print(f"🚀 Starting Live Data API on http://localhost:{self.port}")
        print(f"📊 Dashboard data: http://localhost:{self.port}/session-data")
        print(f"⚡ Rate limits: http://localhost:{self.port}/rate-limits")
        print(f"🔗 CORS enabled for all origins")
        
        uvicorn.run(
            self.app,
            host="0.0.0.0",
            port=self.port,
            log_level="info"
        )

if __name__ == "__main__":
    api = LiveDataAPI()
    api.run()
