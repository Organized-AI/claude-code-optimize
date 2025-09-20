#!/usr/bin/env python3
"""
Live Data API Bridge for Claude Code Optimizer - FIXED VERSION
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
    
    def __init__(self, db_path: str = "./claude_usage.db", port: int = 3002):
        self.db_path = db_path
        self.port = port
        self.app = FastAPI(
            title="Claude Code Live Data API",
            version="1.0.1",
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
            
            # Get most recent session (active or not)
            cursor.execute("""
                SELECT * FROM real_sessions 
                ORDER BY start_time DESC LIMIT 1
            """)
            latest_session = cursor.fetchone()
            
            # Get total tokens from all sessions
            cursor.execute("""
                SELECT 
                    SUM(real_total_tokens) as total_real_tokens,
                    SUM(billable_tokens) as total_billable,
                    SUM(cost_estimate) as total_cost,
                    COUNT(*) as session_count
                FROM real_sessions
            """)
            totals = cursor.fetchone()
            
            conn.close()
            
            # Format session data
            session_data = {}
            if latest_session:
                session_data = {
                    "activeSessionId": latest_session[0],
                    "conversationId": latest_session[1],
                    "startTime": latest_session[3],
                    "endTime": latest_session[4],
                    "realTokens": latest_session[7] or 0,  # real_total_tokens
                    "inputTokens": latest_session[5] or 0,  # real_input_tokens  
                    "outputTokens": latest_session[6] or 0, # real_output_tokens
                    "billableTokens": latest_session[14] or 0, # billable_tokens
                    "cacheCreationTokens": latest_session[16] or 0, # cache_creation_tokens
                    "cacheReadTokens": latest_session[17] or 0, # cache_read_tokens
                    "totalCacheTokens": (latest_session[16] or 0) + (latest_session[17] or 0),
                    "costEstimate": latest_session[18] or 0.0, # cost_estimate
                    "modelUsed": latest_session[11] or "Unknown", # models_used
                    "isActive": bool(latest_session[12]) if latest_session[12] is not None else False,
                    "sessionType": latest_session[2] or "Unknown"
                }
            else:
                session_data = {
                    "activeSessionId": "No sessions found",
                    "realTokens": 0,
                    "totalCost": 0.0,
                    "sessionCount": 0,
                    "isActive": False
                }
                
            # Add global totals
            if totals:
                session_data["globalTotals"] = {
                    "totalRealTokens": totals[0] or 0,
                    "totalBillableTokens": totals[1] or 0,
                    "totalCost": totals[2] or 0.0,
                    "totalSessions": totals[3] or 0
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
                WHERE is_complete = 0
                ORDER BY start_time DESC LIMIT 1
            """)
            current_block = cursor.fetchone()
            
            # Get weekly totals (last 7 days)
            week_ago = datetime.now() - timedelta(days=7)
            cursor.execute("""
                SELECT 
                    SUM(real_total_tokens) as weekly_real_tokens,
                    SUM(billable_tokens) as weekly_billable_tokens,
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
            five_hour_billable = 0
            time_remaining = 300  # 5 hours in minutes
            
            if current_block:
                # Use billable_tokens as the primary metric (column index 5)
                five_hour_billable = current_block[5] or 0  # billable_tokens
                five_hour_tokens = current_block[4] or 0   # total_tokens
                
                # Use billable tokens for the calculation (more accurate for limits)
                # Assuming a limit of 200k billable tokens per 5-hour block
                five_hour_usage = min((five_hour_billable / 200000) * 100, 100)
                
                # Calculate time remaining in current block
                start_time = datetime.fromisoformat(current_block[1])
                elapsed = datetime.now() - start_time
                time_remaining = max(300 - int(elapsed.total_seconds() / 60), 0)
            
            # Weekly calculations
            weekly_billable = weekly_data[1] if weekly_data[1] else 0
            weekly_real_tokens = weekly_data[0] if weekly_data[0] else 0
            weekly_sessions = weekly_data[2] if weekly_data[2] else 0
            
            # Use billable tokens for weekly limit (more realistic)
            # Assuming weekly limit of 1M billable tokens
            weekly_usage = min((weekly_billable / 1000000) * 100, 100)
            
            return {
                "fiveHourLimit": {
                    "usage_percentage": round(five_hour_usage, 1),
                    "total_tokens": five_hour_tokens,
                    "billable_tokens": five_hour_billable,
                    "time_remaining_minutes": time_remaining,
                    "limit_tokens": 200000,
                    "is_complete": bool(current_block[9]) if current_block and current_block[9] is not None else False
                },
                "weeklyLimit": {
                    "usage_percentage": round(weekly_usage, 1),
                    "total_tokens": weekly_real_tokens,
                    "billable_tokens": weekly_billable,
                    "total_sessions": weekly_sessions,
                    "days_remaining": 7 - datetime.now().weekday(),
                    "limit_tokens": 1000000
                }
            }
            
        except Exception as e:
            return {
                "error": f"Rate limit data error: {str(e)}",
                "fiveHourLimit": {"usage_percentage": 0, "total_tokens": 0, "billable_tokens": 0},
                "weeklyLimit": {"usage_percentage": 0, "total_tokens": 0, "billable_tokens": 0}
            }
    
    def _get_analytics_data(self) -> Dict:
        """Get analytics data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get session efficiency trends (last 7 days)
            cursor.execute("""
                SELECT 
                    DATE(start_time) as date,
                    AVG(CASE 
                        WHEN billable_tokens > 0 AND cost_estimate > 0 
                        THEN billable_tokens / cost_estimate 
                        ELSE 0 
                    END) as tokens_per_dollar,
                    COUNT(*) as session_count,
                    SUM(billable_tokens) as daily_billable_tokens,
                    SUM(cost_estimate) as daily_cost
                FROM real_sessions 
                WHERE start_time >= date('now', '-7 days')
                GROUP BY DATE(start_time)
                ORDER BY date DESC
            """)
            efficiency_data = cursor.fetchall()
            
            # Get model usage distribution
            cursor.execute("""
                SELECT 
                    models_used,
                    COUNT(*) as usage_count,
                    SUM(billable_tokens) as total_billable,
                    SUM(cost_estimate) as total_cost
                FROM real_sessions 
                WHERE models_used IS NOT NULL
                GROUP BY models_used
                ORDER BY usage_count DESC
            """)
            model_data = cursor.fetchall()
            
            conn.close()
            
            return {
                "efficiencyTrends": [
                    {
                        "date": row[0],
                        "tokensPerDollar": round(row[1], 2) if row[1] else 0,
                        "sessionCount": row[2],
                        "dailyBillableTokens": row[3] or 0,
                        "dailyCost": round(row[4], 2) if row[4] else 0.0
                    }
                    for row in efficiency_data
                ],
                "modelUsage": [
                    {
                        "model": row[0],
                        "sessionCount": row[1],
                        "totalBillableTokens": row[2] or 0,
                        "totalCost": round(row[3], 2) if row[3] else 0.0
                    }
                    for row in model_data
                ],
                "totalAnalyzedSessions": len(efficiency_data)
            }
            
        except Exception as e:
            return {
                "error": f"Analytics error: {str(e)}",
                "efficiencyTrends": [],
                "modelUsage": []
            }
    
    def run(self):
        """Start the API server"""
        print(f"🚀 Starting Live Data API on http://localhost:{self.port}")
        print(f"📊 Dashboard data: http://localhost:{self.port}/session-data")
        print(f"⚡ Rate limits: http://localhost:{self.port}/rate-limits")
        print(f"📈 Analytics: http://localhost:{self.port}/analytics")
        print(f"🔗 CORS enabled for all origins")
        print(f"💾 Database: {self.db_path}")
        
        uvicorn.run(
            self.app,
            host="0.0.0.0",
            port=self.port,
            log_level="info"
        )

if __name__ == "__main__":
    api = LiveDataAPI()
    api.run()
