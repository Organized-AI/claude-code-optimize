#!/usr/bin/env python3
"""
Live Data API Bridge for Claude Code Optimizer - Main Database Version
Serves real session data from main claude_usage.db with CORS headers for dashboard
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

class LiveDataAPI:
    """API bridge for real-time session data from main database"""
    
    # Token pricing (approximate rates per 1K tokens)
    TOKEN_RATES = {
        "claude-sonnet-4": {"input": 0.003, "output": 0.015},
        "sonnet": {"input": 0.003, "output": 0.015},
        "claude-opus": {"input": 0.015, "output": 0.075},
        "opus": {"input": 0.015, "output": 0.075},
        "default": {"input": 0.003, "output": 0.015}
    }
    
    def __init__(self, db_path: str = "./claude_usage.db", port: int = 3002):
        self.db_path = db_path
        self.port = port
        self.app = FastAPI(
            title="Claude Code Live Data API",
            version="2.0.0",
            description="Live session data for Claude Code Optimizer Dashboard - Main DB"
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
    
    def _calculate_cost(self, input_tokens: int, output_tokens: int, model: str = "sonnet") -> float:
        """Calculate cost based on token usage and model"""
        model_key = model.lower() if model else "default"
        rates = self.TOKEN_RATES.get(model_key, self.TOKEN_RATES["default"])
        
        input_cost = (input_tokens / 1000) * rates["input"]
        output_cost = (output_tokens / 1000) * rates["output"]
        
        return round(input_cost + output_cost, 4)
    
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
        """Get all data needed for dashboard from main database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get most recent session (active or not)
            cursor.execute("""
                SELECT 
                    id, conversation_id, session_type, start_time, end_time,
                    real_input_tokens, real_output_tokens, real_total_tokens,
                    estimated_tokens, models_used, is_active, real_cost,
                    estimated_cost, cache_creation_tokens, cache_read_tokens, total_cache_tokens
                FROM sessions 
                ORDER BY start_time DESC LIMIT 1
            """)
            latest_session = cursor.fetchone()
            
            # Get total tokens from all sessions
            cursor.execute("""
                SELECT 
                    SUM(real_total_tokens) as total_real_tokens,
                    SUM(estimated_tokens) as total_estimated,
                    SUM(real_cost) as total_cost,
                    COUNT(*) as session_count
                FROM sessions
            """)
            totals = cursor.fetchone()
            
            # Cache data is now included in latest_session query
            
            conn.close()
            
            # Format session data with cost calculation
            session_data = {}
            if latest_session:
                # Calculate real-time cost
                input_tokens = int(latest_session[5]) if latest_session[5] else 0
                output_tokens = int(latest_session[6]) if latest_session[6] else 0
                model_used = latest_session[9] or "sonnet"
                calculated_cost = self._calculate_cost(input_tokens, output_tokens, model_used)
                
                session_data = {
                    "activeSessionId": latest_session[0],
                    "conversationId": latest_session[1],
                    "sessionType": latest_session[2],
                    "startTime": latest_session[3],
                    "endTime": latest_session[4],
                    "inputTokens": input_tokens,
                    "outputTokens": output_tokens,
                    "realTokens": latest_session[7] or 0,
                    "estimatedTokens": latest_session[8] or 0,
                    "billableTokens": latest_session[8] or 0,  # Using estimated as billable
                    "modelUsed": model_used,
                    "isActive": bool(latest_session[10]),
                    "costEstimate": calculated_cost if calculated_cost > 0 else (latest_session[11] or latest_session[12] or 0.0),
                    "cacheCreationTokens": latest_session[13] or 0,
                    "cacheReadTokens": latest_session[14] or 0,
                    "totalCacheTokens": latest_session[15] or 0
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
                "dataSource": "main_database"
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
        """Get current rate limit status from main database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get current 5-hour block with specific columns
            cursor.execute("""
                SELECT id, start_time, total_tokens, total_sessions, billable_tokens, 
                       total_cost, efficiency_score, is_complete, created_at, updated_at
                FROM five_hour_blocks 
                WHERE is_complete = 0
                ORDER BY start_time DESC LIMIT 1
            """)
            current_block = cursor.fetchone()
            
            # Get weekly totals (last 7 days)
            week_ago = datetime.now() - timedelta(days=7)
            cursor.execute("""
                SELECT 
                    SUM(real_total_tokens) as weekly_real,
                    SUM(estimated_tokens) as weekly_billable,
                    COUNT(*) as session_count
                FROM sessions
                WHERE start_time >= ?
            """, (week_ago.isoformat(),))
            weekly_totals = cursor.fetchone()
            
            conn.close()
            
            # Format rate limit data with type safety
            five_hour_data = {}
            if current_block:
                block_start = datetime.fromisoformat(current_block[1])
                block_end = block_start + timedelta(hours=5)
                time_remaining = (block_end - datetime.now()).total_seconds() / 60
                
                # Type-safe token extraction with fallbacks
                total_tokens = int(current_block[2]) if current_block[2] and str(current_block[2]).isdigit() else 0
                billable_tokens = int(current_block[4]) if current_block[4] and str(current_block[4]).isdigit() else 0
                
                # Use total_tokens if billable_tokens is 0 (fallback)
                effective_tokens = billable_tokens if billable_tokens > 0 else total_tokens
                
                five_hour_data = {
                    "usage_percentage": (effective_tokens / 200000 * 100) if effective_tokens > 0 else 0,
                    "total_tokens": total_tokens,
                    "billable_tokens": effective_tokens,
                    "time_remaining_minutes": max(0, int(time_remaining)),
                    "limit_tokens": 200000,
                    "is_complete": bool(current_block[7])
                }
            else:
                five_hour_data = {
                    "usage_percentage": 0,
                    "total_tokens": 0,
                    "billable_tokens": 0,
                    "time_remaining_minutes": 300,
                    "limit_tokens": 200000,
                    "is_complete": False
                }
            
            # Weekly data with type safety
            weekly_real = int(weekly_totals[0]) if weekly_totals and weekly_totals[0] and str(weekly_totals[0]).replace('.','').isdigit() else 0
            weekly_billable = int(weekly_totals[1]) if weekly_totals and weekly_totals[1] and str(weekly_totals[1]).replace('.','').isdigit() else 0
            weekly_sessions = int(weekly_totals[2]) if weekly_totals and weekly_totals[2] else 0
            
            # Use real tokens if billable is 0
            weekly_effective = weekly_billable if weekly_billable > 0 else weekly_real
            
            weekly_data = {
                "usage_percentage": (weekly_effective / 1000000 * 100) if weekly_effective > 0 else 0,
                "total_tokens": weekly_real,
                "billable_tokens": weekly_effective,
                "total_sessions": weekly_sessions,
                "days_remaining": 7 - (datetime.now() - week_ago).days,
                "limit_tokens": 1000000
            }
            
            return {
                "fiveHourLimit": five_hour_data,
                "weeklyLimit": weekly_data
            }
            
        except Exception as e:
            return {
                "error": f"Rate limit error: {str(e)}",
                "fiveHourLimit": {"usage_percentage": 0, "billable_tokens": 0},
                "weeklyLimit": {"usage_percentage": 0, "billable_tokens": 0}
            }
    
    def _get_analytics_data(self) -> Dict:
        """Get analytics data from main database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get efficiency trends by day
            cursor.execute("""
                SELECT 
                    DATE(start_time) as date,
                    COUNT(*) as session_count,
                    SUM(estimated_tokens) as daily_billable,
                    SUM(real_cost) as daily_cost
                FROM sessions
                WHERE start_time >= datetime('now', '-7 days')
                GROUP BY DATE(start_time)
                ORDER BY date DESC
            """)
            
            daily_trends = []
            for row in cursor.fetchall():
                tokens_per_dollar = (row[2] / row[3]) if row[3] and row[3] > 0 else 0
                daily_trends.append({
                    "date": row[0],
                    "sessionCount": row[1],
                    "dailyBillableTokens": row[2] or 0,
                    "dailyCost": row[3] or 0,
                    "tokensPerDollar": round(tokens_per_dollar, 2)
                })
            
            # Get model usage stats
            cursor.execute("""
                SELECT 
                    models_used as model,
                    COUNT(*) as session_count,
                    SUM(estimated_tokens) as total_billable,
                    SUM(real_cost) as total_cost
                FROM sessions
                GROUP BY models_used
                ORDER BY session_count DESC
            """)
            
            model_usage = []
            for row in cursor.fetchall():
                model_usage.append({
                    "model": row[0] or "Unknown",
                    "sessionCount": row[1],
                    "totalBillableTokens": row[2] or 0,
                    "totalCost": row[3] or 0
                })
            
            conn.close()
            
            return {
                "efficiencyTrends": daily_trends,
                "modelUsage": model_usage,
                "totalAnalyzedSessions": sum(m["sessionCount"] for m in model_usage)
            }
            
        except Exception as e:
            return {
                "error": f"Analytics error: {str(e)}",
                "efficiencyTrends": [],
                "modelUsage": []
            }
    
    def run(self):
        """Start the API server"""
        print(f"🚀 Starting Live Data API on port {self.port}")
        print(f"📊 Using database: {self.db_path}")
        uvicorn.run(self.app, host="0.0.0.0", port=self.port)


if __name__ == "__main__":
    api = LiveDataAPI()
    api.run()