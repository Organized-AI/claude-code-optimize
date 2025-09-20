"""
Usage tracking and monitoring for Claude Code optimization.

This module provides real-time usage tracking, efficiency scoring,
and budget management for Claude Code sessions.
"""

import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class UsageTracker:
    """Track and analyze Claude Code usage patterns"""
    
    def __init__(self, db_path: str = "claude_usage.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize the usage tracking database"""
        conn = sqlite3.connect(self.db_path)
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS usage_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                model_used TEXT,
                total_cost_usd REAL,
                duration_ms INTEGER,
                num_turns INTEGER,
                session_type TEXT,
                efficiency_score REAL,
                project_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS weekly_usage_summary (
                week_start DATE PRIMARY KEY,
                sonnet_hours REAL DEFAULT 0,
                opus_hours REAL DEFAULT 0,
                total_cost_usd REAL DEFAULT 0,
                sessions_count INTEGER DEFAULT 0,
                avg_efficiency REAL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def get_weekly_usage(self) -> Dict[str, float]:
        """Get current weekly usage statistics"""
        
        week_start = self._get_week_start()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute('''
            SELECT 
                SUM(CASE WHEN model_used LIKE '%sonnet%' THEN duration_ms/3600000.0 ELSE 0 END) as sonnet_hours,
                SUM(CASE WHEN model_used LIKE '%opus%' THEN duration_ms/3600000.0 ELSE 0 END) as opus_hours,
                SUM(total_cost_usd) as total_cost,
                COUNT(*) as session_count
            FROM usage_sessions 
            WHERE start_time >= ?
        ''', (week_start,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result and result[0] is not None:
            return {
                "sonnet_hours": result[0] or 0.0,
                "opus_hours": result[1] or 0.0,
                "total_cost_usd": result[2] or 0.0,
                "session_count": result[3] or 0
            }
        
        return {
            "sonnet_hours": 0.0,
            "opus_hours": 0.0,
            "total_cost_usd": 0.0,
            "session_count": 0
        }
    
    def log_session(self, session_data: Dict):
        """Log a completed Claude Code session"""
        
        conn = sqlite3.connect(self.db_path)
        
        # Calculate efficiency score
        efficiency = self._calculate_efficiency_score(session_data)
        
        conn.execute('''
            INSERT OR REPLACE INTO usage_sessions 
            (session_id, start_time, end_time, model_used, total_cost_usd, 
             duration_ms, num_turns, session_type, efficiency_score, project_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session_data.get("session_id", "unknown"),
            session_data.get("start_time", datetime.now()),
            session_data.get("end_time", datetime.now()),
            session_data.get("model_used", "unknown"),
            session_data.get("total_cost_usd", 0.0),
            session_data.get("duration_ms", 0),
            session_data.get("num_turns", 0),
            session_data.get("session_type", "unknown"),
            efficiency,
            session_data.get("project_name", "unknown")
        ))
        
        conn.commit()
        conn.close()
        
        # Update weekly summary
        self._update_weekly_summary()
    
    def _calculate_efficiency_score(self, session_data: Dict) -> float:
        """Calculate efficiency score for a session (1-10 scale)"""
        
        duration_ms = session_data.get("duration_ms", 1000)
        num_turns = session_data.get("num_turns", 1)
        cost = session_data.get("total_cost_usd", 0.1)
        
        # Basic efficiency calculation
        # More turns per minute = more productive
        # Lower cost per turn = more efficient
        
        duration_minutes = duration_ms / 60000.0
        turns_per_minute = num_turns / max(duration_minutes, 1)
        cost_per_turn = cost / max(num_turns, 1)
        
        # Normalize to 1-10 scale
        efficiency = min(10, max(1, (turns_per_minute * 2) - (cost_per_turn * 10) + 5))
        
        return round(efficiency, 1)
    
    def get_weekly_efficiency_score(self) -> float:
        """Get average efficiency score for the current week"""
        
        week_start = self._get_week_start()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute('''
            SELECT AVG(efficiency_score) 
            FROM usage_sessions 
            WHERE start_time >= ? AND efficiency_score > 0
        ''', (week_start,))
        
        result = cursor.fetchone()
        conn.close()
        
        return round(result[0] if result[0] else 7.0, 1)
    
    def get_daily_usage_last_7_days(self) -> List[Dict]:
        """Get daily usage for the last 7 days"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute('''
            SELECT 
                DATE(start_time) as date,
                SUM(CASE WHEN model_used LIKE '%sonnet%' THEN duration_ms/3600000.0 ELSE 0 END) as sonnet_hours,
                SUM(CASE WHEN model_used LIKE '%opus%' THEN duration_ms/3600000.0 ELSE 0 END) as opus_hours,
                COUNT(*) as sessions
            FROM usage_sessions 
            WHERE start_time >= date('now', '-7 days')
            GROUP BY DATE(start_time)
            ORDER BY date
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        return [
            {
                "date": row[0],
                "sonnet_hours": row[1] or 0.0,
                "opus_hours": row[2] or 0.0,
                "sessions": row[3] or 0
            }
            for row in results
        ]
    
    def _update_weekly_summary(self):
        """Update the weekly usage summary"""
        
        week_start = self._get_week_start()
        usage = self.get_weekly_usage()
        efficiency = self.get_weekly_efficiency_score()
        
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            INSERT OR REPLACE INTO weekly_usage_summary
            (week_start, sonnet_hours, opus_hours, total_cost_usd, sessions_count, avg_efficiency)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            week_start,
            usage["sonnet_hours"],
            usage["opus_hours"],
            usage["total_cost_usd"],
            usage["session_count"],
            efficiency
        ))
        
        conn.commit()
        conn.close()
    
    def _get_week_start(self) -> datetime:
        """Get the start of the current week (Monday)"""
        
        today = datetime.now().date()
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
        
        return datetime.combine(week_start, datetime.min.time())
    
    def get_usage_predictions(self) -> Dict:
        """Predict weekly usage based on current patterns"""
        
        usage = self.get_weekly_usage()
        current_day = datetime.now().weekday() + 1  # 1-7 scale
        
        if current_day == 0:
            current_day = 7
        
        # Simple linear projection
        days_remaining = 7 - current_day
        
        if days_remaining > 0:
            daily_sonnet_rate = usage["sonnet_hours"] / current_day
            daily_opus_rate = usage["opus_hours"] / current_day
            
            projected_sonnet = usage["sonnet_hours"] + (daily_sonnet_rate * days_remaining)
            projected_opus = usage["opus_hours"] + (daily_opus_rate * days_remaining)
        else:
            projected_sonnet = usage["sonnet_hours"]
            projected_opus = usage["opus_hours"]
        
        return {
            "projected_sonnet_hours": projected_sonnet,
            "projected_opus_hours": projected_opus,
            "days_remaining": days_remaining,
            "current_pace": "on_track" if projected_sonnet < 400 else "high"
        }
    
    def get_efficiency_trends(self) -> Dict:
        """Analyze efficiency trends over time"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute('''
            SELECT 
                DATE(start_time) as date,
                AVG(efficiency_score) as avg_efficiency,
                COUNT(*) as session_count
            FROM usage_sessions 
            WHERE start_time >= date('now', '-30 days') AND efficiency_score > 0
            GROUP BY DATE(start_time)
            ORDER BY date
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        if not results:
            return {"trend": "stable", "recent_avg": 7.0, "improvement": 0.0}
        
        # Calculate trend
        recent_scores = [row[1] for row in results[-7:]]  # Last 7 days
        older_scores = [row[1] for row in results[-14:-7]]  # Previous 7 days
        
        recent_avg = sum(recent_scores) / len(recent_scores) if recent_scores else 7.0
        older_avg = sum(older_scores) / len(older_scores) if older_scores else recent_avg
        
        improvement = recent_avg - older_avg
        
        if improvement > 0.5:
            trend = "improving"
        elif improvement < -0.5:
            trend = "declining"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "recent_avg": round(recent_avg, 1),
            "improvement": round(improvement, 1),
            "data_points": len(results)
        }
