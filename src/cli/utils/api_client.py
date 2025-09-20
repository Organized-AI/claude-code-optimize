"""
API client for Claude Code Optimizer CLI
Interfaces with existing dashboard APIs for consistent data access.
"""

import json
import sqlite3
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

class APIClient:
    """Client for accessing Claude Code Optimizer data."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.timeout = 10
        
        # Fallback to direct database access if API unavailable
        self.database_fallback = True
        self.db_path = None
        
    def set_database_path(self, db_path: Path):
        """Set database path for fallback access."""
        self.db_path = db_path
        
    def _api_request(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """Make API request with fallback to database."""
        try:
            response = self.session.get(f"{self.base_url}{endpoint}")
            response.raise_for_status()
            return response.json()
        except Exception:
            if self.database_fallback and self.db_path:
                return self._database_fallback(endpoint)
            return None
    
    def _database_fallback(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """Fallback to direct database access."""
        if not self.db_path or not self.db_path.exists():
            return None
            
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                if endpoint == '/api/reports/daily':
                    return self._get_daily_report(cursor)
                elif endpoint == '/api/reports/weekly':
                    return self._get_weekly_report(cursor)
                elif endpoint == '/api/status/current':
                    return self._get_current_status(cursor)
                elif endpoint == '/api/limits/weekly':
                    return self._get_weekly_limits(cursor)
                
        except Exception:
            return None
        
        return None
    
    def _get_daily_report(self, cursor) -> Dict[str, Any]:
        """Get daily usage report from database."""
        today = datetime.now().date()
        
        cursor.execute("""
            SELECT 
                model,
                SUM(CAST((julianday(end_time) - julianday(start_time)) * 24 AS REAL)) as duration_hours,
                SUM(total_tokens) as total_tokens,
                COUNT(*) as session_count
            FROM sessions 
            WHERE DATE(start_time) = ?
            GROUP BY model
        """, (today,))
        
        model_data = {}
        total_duration = 0
        total_tokens = 0
        total_sessions = 0
        
        for row in cursor.fetchall():
            model = row['model'].lower()
            duration = row['duration_hours'] or 0
            tokens = row['total_tokens'] or 0
            sessions = row['session_count'] or 0
            
            model_data[model] = {
                'duration_hours': duration,
                'total_tokens': tokens,
                'session_count': sessions
            }
            
            total_duration += duration
            total_tokens += tokens
            total_sessions += sessions
        
        return {
            'date': today.isoformat(),
            'summary': {
                'total_sessions': total_sessions,
                'total_duration_hours': total_duration,
                'total_tokens': total_tokens
            },
            'by_model': model_data,
            'efficiency_score': self._calculate_efficiency_score(total_tokens, total_duration)
        }
    
    def _get_weekly_report(self, cursor) -> Dict[str, Any]:
        """Get weekly usage report from database."""
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())
        
        cursor.execute("""
            SELECT 
                model,
                SUM(CAST((julianday(end_time) - julianday(start_time)) * 24 AS REAL)) as duration_hours,
                SUM(total_tokens) as total_tokens,
                COUNT(*) as session_count,
                project_name
            FROM sessions 
            WHERE DATE(start_time) >= ?
            GROUP BY model, project_name
            ORDER BY duration_hours DESC
        """, (week_start,))
        
        model_totals = {}
        project_totals = {}
        total_duration = 0
        total_tokens = 0
        total_sessions = 0
        
        for row in cursor.fetchall():
            model = row['model'].lower()
            duration = row['duration_hours'] or 0
            tokens = row['total_tokens'] or 0
            sessions = row['session_count'] or 0
            project = row['project_name'] or 'Unknown'
            
            # Model totals
            if model not in model_totals:
                model_totals[model] = {'duration_hours': 0, 'total_tokens': 0, 'session_count': 0}
            
            model_totals[model]['duration_hours'] += duration
            model_totals[model]['total_tokens'] += tokens
            model_totals[model]['session_count'] += sessions
            
            # Project totals
            if project not in project_totals:
                project_totals[project] = {'duration_hours': 0, 'total_tokens': 0, 'session_count': 0}
                
            project_totals[project]['duration_hours'] += duration
            project_totals[project]['total_tokens'] += tokens
            project_totals[project]['session_count'] += sessions
            
            total_duration += duration
            total_tokens += tokens
            total_sessions += sessions
        
        # Calculate quota status
        quota_status = self._calculate_quota_status(model_totals)
        
        return {
            'week_start': week_start.isoformat(),
            'summary': {
                'total_sessions': total_sessions,
                'total_duration_hours': total_duration,
                'total_tokens': total_tokens
            },
            'by_model': model_totals,
            'by_project': dict(sorted(project_totals.items(), 
                                    key=lambda x: x[1]['duration_hours'], reverse=True)),
            'quota_status': quota_status,
            'efficiency_score': self._calculate_efficiency_score(total_tokens, total_duration)
        }
    
    def _get_current_status(self, cursor) -> Dict[str, Any]:
        """Get current session status."""
        # Check for active session (started within last 6 hours, no end time)
        six_hours_ago = datetime.now() - timedelta(hours=6)
        
        cursor.execute("""
            SELECT session_id, start_time, model, total_tokens, project_name
            FROM sessions 
            WHERE start_time > ? AND end_time IS NULL
            ORDER BY start_time DESC
            LIMIT 1
        """, (six_hours_ago,))
        
        row = cursor.fetchone()
        if row:
            start_time = datetime.fromisoformat(row['start_time'])
            duration = (datetime.now() - start_time).total_seconds() / 3600
            
            return {
                'active_session': True,
                'session_id': row['session_id'],
                'start_time': row['start_time'],
                'duration_hours': duration,
                'model': row['model'],
                'tokens_used': row['total_tokens'] or 0,
                'project_name': row['project_name']
            }
        else:
            return {
                'active_session': False,
                'last_session': self._get_last_session(cursor)
            }
    
    def _get_last_session(self, cursor) -> Optional[Dict[str, Any]]:
        """Get last completed session."""
        cursor.execute("""
            SELECT session_id, start_time, end_time, model, total_tokens, project_name
            FROM sessions 
            WHERE end_time IS NOT NULL
            ORDER BY end_time DESC
            LIMIT 1
        """)
        
        row = cursor.fetchone()
        if row:
            return {
                'session_id': row['session_id'],
                'start_time': row['start_time'],
                'end_time': row['end_time'],
                'model': row['model'],
                'tokens_used': row['total_tokens'] or 0,
                'project_name': row['project_name']
            }
        return None
    
    def _get_weekly_limits(self, cursor) -> Dict[str, Any]:
        """Get weekly quota limits and usage."""
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())
        
        cursor.execute("""
            SELECT 
                model,
                SUM(CAST((julianday(end_time) - julianday(start_time)) * 24 AS REAL)) as duration_hours
            FROM sessions 
            WHERE DATE(start_time) >= ?
            GROUP BY model
        """, (week_start,))
        
        usage = {'sonnet': 0, 'opus': 0, 'haiku': 0}
        for row in cursor.fetchall():
            model = row['model'].lower()
            duration = row['duration_hours'] or 0
            if model in usage:
                usage[model] = duration
        
        limits = {'sonnet': 432, 'opus': 36, 'haiku': float('inf')}
        
        return {
            'week_start': week_start.isoformat(),
            'usage': usage,
            'limits': limits,
            'percentages': {
                model: (usage[model] / limits[model] * 100) if limits[model] != float('inf') else 0
                for model in usage
            },
            'traffic_light': self._get_traffic_light_status(usage, limits)
        }
    
    def _calculate_quota_status(self, model_totals: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate quota status from model totals."""
        sonnet_hours = model_totals.get('sonnet', {}).get('duration_hours', 0)
        opus_hours = model_totals.get('opus', {}).get('duration_hours', 0)
        
        sonnet_percent = (sonnet_hours / 432) * 100
        opus_percent = (opus_hours / 36) * 100
        max_percent = max(sonnet_percent, opus_percent)
        
        if max_percent > 85:
            status = 'red'
            message = 'Critical - Use with extreme caution'
        elif max_percent > 70:
            status = 'yellow'
            message = 'Warning - Plan sessions carefully'
        else:
            status = 'green'
            message = 'Safe - Normal usage recommended'
        
        return {
            'status': status,
            'message': message,
            'sonnet_percent': sonnet_percent,
            'opus_percent': opus_percent,
            'max_percent': max_percent
        }
    
    def _get_traffic_light_status(self, usage: Dict[str, float], limits: Dict[str, float]) -> Dict[str, Any]:
        """Get traffic light status for quotas."""
        sonnet_percent = (usage['sonnet'] / limits['sonnet']) * 100
        opus_percent = (usage['opus'] / limits['opus']) * 100
        max_percent = max(sonnet_percent, opus_percent)
        
        if max_percent > 85:
            return {
                'status': 'red',
                'emoji': '🔴',
                'message': 'Critical - Use with extreme caution'
            }
        elif max_percent > 70:
            return {
                'status': 'yellow', 
                'emoji': '🟡',
                'message': 'Warning - Plan sessions carefully'
            }
        else:
            return {
                'status': 'green',
                'emoji': '🟢',
                'message': 'Safe - Normal usage recommended'
            }
    
    def _calculate_efficiency_score(self, total_tokens: int, total_duration: float) -> float:
        """Calculate efficiency score (tokens per hour)."""
        if total_duration <= 0:
            return 0.0
        
        tokens_per_hour = total_tokens / total_duration
        # Normalize to 1-10 scale (1000 tokens/hour = score of 1)
        return min(10.0, tokens_per_hour / 1000)
    
    # Public API methods
    def get_daily_report(self) -> Optional[Dict[str, Any]]:
        """Get daily usage report."""
        return self._api_request('/api/reports/daily')
    
    def get_weekly_report(self) -> Optional[Dict[str, Any]]:
        """Get weekly usage report."""
        return self._api_request('/api/reports/weekly')
    
    def get_sessions(self, days: int = 7) -> Optional[List[Dict[str, Any]]]:
        """Get session history."""
        data = self._api_request(f'/api/reports/sessions?days={days}')
        return data.get('sessions', []) if data else None
    
    def get_current_status(self) -> Optional[Dict[str, Any]]:
        """Get current session status."""
        return self._api_request('/api/status/current')
    
    def get_weekly_limits(self) -> Optional[Dict[str, Any]]:
        """Get weekly quota limits."""
        return self._api_request('/api/limits/weekly')