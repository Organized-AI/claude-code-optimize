#!/usr/bin/env python3
"""
ccusage-Compatible Reporting API
Provides ccusage-style endpoints while maintaining existing functionality
"""

import json
import sqlite3
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import pandas as pd
from pathlib import Path

class ReportResponse(BaseModel):
    """Standard response format for all reports"""
    data: List[Dict[str, Any]]
    summary: Dict[str, Any]
    metadata: Dict[str, Any]
    generated_at: str

class ReportsAPI:
    """ccusage-compatible reporting endpoints"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.router = APIRouter(prefix="/api/reports", tags=["reports"])
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup ccusage-compatible report routes"""
        
        @self.router.get("/daily", response_model=ReportResponse)
        async def daily_report(
            date_filter: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
            format: str = Query("json", description="Output format: json or csv")
        ):
            """Daily usage report compatible with ccusage"""
            target_date = date.fromisoformat(date_filter) if date_filter else date.today()
            return self._generate_daily_report(target_date, format)
        
        @self.router.get("/weekly", response_model=ReportResponse)
        async def weekly_report(
            week_start: Optional[str] = Query(None, description="Week start date YYYY-MM-DD"),
            format: str = Query("json", description="Output format: json or csv")
        ):
            """Weekly usage report compatible with ccusage"""
            if week_start:
                start_date = date.fromisoformat(week_start)
            else:
                # Get Monday of current week
                today = date.today()
                start_date = today - timedelta(days=today.weekday())
            
            return self._generate_weekly_report(start_date, format)
        
        @self.router.get("/monthly", response_model=ReportResponse)
        async def monthly_report(
            month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
            format: str = Query("json", description="Output format: json or csv")
        ):
            """Monthly usage report compatible with ccusage"""
            if month:
                year, month_num = month.split('-')
                target_date = date(int(year), int(month_num), 1)
            else:
                target_date = date.today().replace(day=1)
            
            return self._generate_monthly_report(target_date, format)
        
        @self.router.get("/sessions", response_model=ReportResponse)
        async def sessions_report(
            start_date: Optional[str] = Query(None),
            end_date: Optional[str] = Query(None),
            session_type: Optional[str] = Query(None),
            format: str = Query("json", description="Output format: json or csv")
        ):
            """Session-based report compatible with ccusage"""
            return self._generate_sessions_report(start_date, end_date, session_type, format)
        
        @self.router.get("/blocks", response_model=ReportResponse)
        async def blocks_report(
            start_date: Optional[str] = Query(None),
            end_date: Optional[str] = Query(None),
            format: str = Query("json", description="Output format: json or csv")
        ):
            """5-hour blocks report compatible with ccusage"""
            return self._generate_blocks_report(start_date, end_date, format)
        
        @self.router.get("/summary", response_model=ReportResponse)
        async def summary_report(
            period: str = Query("today", description="Period: today, week, month"),
            format: str = Query("json", description="Output format: json or csv")
        ):
            """High-level summary report"""
            return self._generate_summary_report(period, format)
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection with row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _generate_daily_report(self, target_date: date, format: str) -> ReportResponse:
        """Generate ccusage-compatible daily report"""
        try:
            conn = self._get_connection()
            
            # Get sessions for the day
            cursor = conn.execute("""
                SELECT 
                    id,
                    session_type,
                    start_time,
                    end_time,
                    real_input_tokens,
                    real_output_tokens,
                    real_total_tokens,
                    estimated_tokens,
                    total_messages,
                    models_used,
                    conversation_id,
                    project_path,
                    is_active,
                    five_hour_block_id
                FROM real_sessions
                WHERE DATE(start_time) = ?
                ORDER BY start_time
            """, (target_date,))
            
            sessions = [dict(row) for row in cursor.fetchall()]
            
            # Calculate summary statistics
            total_tokens = sum(s['real_total_tokens'] or s['estimated_tokens'] or 0 for s in sessions)
            total_input_tokens = sum(s['real_input_tokens'] or 0 for s in sessions)
            total_output_tokens = sum(s['real_output_tokens'] or 0 for s in sessions)
            total_sessions = len(sessions)
            total_messages = sum(s['total_messages'] or 0 for s in sessions)
            
            # Session type breakdown
            session_types = {}
            for session in sessions:
                stype = session['session_type'] or 'unknown'
                if stype not in session_types:
                    session_types[stype] = {
                        'count': 0,
                        'tokens': 0,
                        'messages': 0
                    }
                session_types[stype]['count'] += 1
                session_types[stype]['tokens'] += session['real_total_tokens'] or session['estimated_tokens'] or 0
                session_types[stype]['messages'] += session['total_messages'] or 0
            
            # Model usage breakdown
            model_usage = {}
            for session in sessions:
                if session['models_used']:
                    try:
                        models = json.loads(session['models_used'])
                        for model in models:
                            if model not in model_usage:
                                model_usage[model] = 0
                            model_usage[model] += 1
                    except:
                        pass
            
            summary = {
                'date': target_date.isoformat(),
                'total_sessions': total_sessions,
                'total_tokens': total_tokens,
                'total_input_tokens': total_input_tokens,
                'total_output_tokens': total_output_tokens,
                'total_messages': total_messages,
                'session_types': session_types,
                'model_usage': model_usage,
                'avg_tokens_per_session': round(total_tokens / total_sessions, 2) if total_sessions > 0 else 0,
                'avg_messages_per_session': round(total_messages / total_sessions, 2) if total_sessions > 0 else 0
            }
            
            metadata = {
                'report_type': 'daily',
                'date_range': target_date.isoformat(),
                'record_count': total_sessions,
                'data_source': 'claude_usage.db',
                'real_token_percentage': self._calculate_real_token_percentage(sessions)
            }
            
            conn.close()
            
            return ReportResponse(
                data=sessions,
                summary=summary,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating daily report: {str(e)}")
    
    def _generate_weekly_report(self, start_date: date, format: str) -> ReportResponse:
        """Generate ccusage-compatible weekly report"""
        try:
            end_date = start_date + timedelta(days=7)
            conn = self._get_connection()
            
            # Get sessions for the week
            cursor = conn.execute("""
                SELECT 
                    DATE(start_time) as session_date,
                    session_type,
                    COUNT(*) as session_count,
                    SUM(real_total_tokens) as real_tokens,
                    SUM(estimated_tokens) as estimated_tokens,
                    SUM(total_messages) as total_messages,
                    AVG(CASE WHEN end_time IS NOT NULL 
                        THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
                        ELSE NULL END) as avg_duration_minutes
                FROM real_sessions
                WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
                GROUP BY DATE(start_time), session_type
                ORDER BY session_date, session_type
            """, (start_date, end_date))
            
            daily_breakdown = [dict(row) for row in cursor.fetchall()]
            
            # Calculate weekly totals
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    SUM(real_input_tokens) as total_input_tokens,
                    SUM(real_output_tokens) as total_output_tokens,
                    SUM(total_messages) as total_messages,
                    COUNT(DISTINCT five_hour_block_id) as blocks_used
                FROM real_sessions
                WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
            """, (start_date, end_date))
            
            totals = dict(cursor.fetchone())
            
            summary = {
                'week_start': start_date.isoformat(),
                'week_end': end_date.isoformat(),
                'total_sessions': totals['total_sessions'],
                'total_tokens': totals['total_tokens'] or 0,
                'total_input_tokens': totals['total_input_tokens'] or 0,
                'total_output_tokens': totals['total_output_tokens'] or 0,
                'total_messages': totals['total_messages'] or 0,
                'blocks_used': totals['blocks_used'] or 0,
                'daily_breakdown': daily_breakdown
            }
            
            metadata = {
                'report_type': 'weekly',
                'date_range': f"{start_date.isoformat()} to {end_date.isoformat()}",
                'record_count': len(daily_breakdown),
                'data_source': 'claude_usage.db'
            }
            
            conn.close()
            
            return ReportResponse(
                data=daily_breakdown,
                summary=summary,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating weekly report: {str(e)}")
    
    def _generate_monthly_report(self, target_date: date, format: str) -> ReportResponse:
        """Generate ccusage-compatible monthly report"""
        try:
            # Get first day of month and first day of next month
            start_date = target_date.replace(day=1)
            if start_date.month == 12:
                end_date = start_date.replace(year=start_date.year + 1, month=1)
            else:
                end_date = start_date.replace(month=start_date.month + 1)
            
            conn = self._get_connection()
            
            # Weekly breakdown within the month
            cursor = conn.execute("""
                SELECT 
                    strftime('%W', start_time) as week_number,
                    COUNT(*) as session_count,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    SUM(total_messages) as total_messages,
                    COUNT(DISTINCT session_type) as session_types_used
                FROM real_sessions
                WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
                GROUP BY strftime('%W', start_time)
                ORDER BY week_number
            """, (start_date, end_date))
            
            weekly_breakdown = [dict(row) for row in cursor.fetchall()]
            
            # Monthly totals and trends
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    SUM(real_input_tokens) as total_input_tokens,
                    SUM(real_output_tokens) as total_output_tokens,
                    SUM(total_messages) as total_messages,
                    COUNT(DISTINCT session_type) as unique_session_types,
                    COUNT(DISTINCT five_hour_block_id) as blocks_used,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens_per_session
                FROM real_sessions
                WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
            """, (start_date, end_date))
            
            totals = dict(cursor.fetchone())
            
            summary = {
                'month': target_date.strftime('%Y-%m'),
                'total_sessions': totals['total_sessions'],
                'total_tokens': totals['total_tokens'] or 0,
                'total_input_tokens': totals['total_input_tokens'] or 0,
                'total_output_tokens': totals['total_output_tokens'] or 0,
                'total_messages': totals['total_messages'] or 0,
                'unique_session_types': totals['unique_session_types'] or 0,
                'blocks_used': totals['blocks_used'] or 0,
                'avg_tokens_per_session': round(totals['avg_tokens_per_session'] or 0, 2),
                'weekly_breakdown': weekly_breakdown
            }
            
            metadata = {
                'report_type': 'monthly',
                'date_range': f"{start_date.isoformat()} to {end_date.isoformat()}",
                'record_count': len(weekly_breakdown),
                'data_source': 'claude_usage.db'
            }
            
            conn.close()
            
            return ReportResponse(
                data=weekly_breakdown,
                summary=summary,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating monthly report: {str(e)}")
    
    def _generate_sessions_report(self, start_date: Optional[str], end_date: Optional[str], 
                                session_type: Optional[str], format: str) -> ReportResponse:
        """Generate detailed sessions report"""
        try:
            conn = self._get_connection()
            
            # Build dynamic query
            where_clauses = []
            params = []
            
            if start_date:
                where_clauses.append("DATE(start_time) >= ?")
                params.append(start_date)
            
            if end_date:
                where_clauses.append("DATE(start_time) <= ?")
                params.append(end_date)
            
            if session_type:
                where_clauses.append("session_type = ?")
                params.append(session_type)
            
            where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"
            
            cursor = conn.execute(f"""
                SELECT 
                    id,
                    session_type,
                    start_time,
                    end_time,
                    CASE WHEN end_time IS NOT NULL 
                        THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
                        ELSE NULL END as duration_minutes,
                    real_input_tokens,
                    real_output_tokens,
                    real_total_tokens,
                    estimated_tokens,
                    COALESCE(real_total_tokens, estimated_tokens, 0) as effective_tokens,
                    total_messages,
                    models_used,
                    conversation_id,
                    project_path,
                    five_hour_block_id,
                    is_active,
                    token_extraction_method
                FROM real_sessions
                WHERE {where_clause}
                ORDER BY start_time DESC
            """, params)
            
            sessions = [dict(row) for row in cursor.fetchall()]
            
            # Calculate summary
            total_sessions = len(sessions)
            total_tokens = sum(s['effective_tokens'] for s in sessions)
            total_input_tokens = sum(s['real_input_tokens'] or 0 for s in sessions)
            total_output_tokens = sum(s['real_output_tokens'] or 0 for s in sessions)
            total_messages = sum(s['total_messages'] or 0 for s in sessions)
            
            # Efficiency metrics
            real_token_count = sum(1 for s in sessions if s['real_total_tokens'] is not None)
            real_token_percentage = (real_token_count / total_sessions * 100) if total_sessions > 0 else 0
            
            avg_duration = None
            if sessions:
                durations = [s['duration_minutes'] for s in sessions if s['duration_minutes'] is not None]
                avg_duration = sum(durations) / len(durations) if durations else None
            
            summary = {
                'total_sessions': total_sessions,
                'total_tokens': total_tokens,
                'total_input_tokens': total_input_tokens,
                'total_output_tokens': total_output_tokens,
                'total_messages': total_messages,
                'avg_tokens_per_session': round(total_tokens / total_sessions, 2) if total_sessions > 0 else 0,
                'avg_messages_per_session': round(total_messages / total_sessions, 2) if total_sessions > 0 else 0,
                'avg_duration_minutes': round(avg_duration, 2) if avg_duration else None,
                'real_token_percentage': round(real_token_percentage, 2),
                'filters_applied': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'session_type': session_type
                }
            }
            
            metadata = {
                'report_type': 'sessions',
                'date_range': f"{start_date or 'earliest'} to {end_date or 'latest'}",
                'record_count': total_sessions,
                'data_source': 'claude_usage.db'
            }
            
            conn.close()
            
            return ReportResponse(
                data=sessions,
                summary=summary,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating sessions report: {str(e)}")
    
    def _generate_blocks_report(self, start_date: Optional[str], end_date: Optional[str], format: str) -> ReportResponse:
        """Generate 5-hour blocks report"""
        try:
            conn = self._get_connection()
            
            # Build dynamic query for blocks
            where_clauses = []
            params = []
            
            if start_date:
                where_clauses.append("DATE(start_time) >= ?")
                params.append(start_date)
            
            if end_date:
                where_clauses.append("DATE(start_time) <= ?")
                params.append(end_date)
            
            where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"
            
            cursor = conn.execute(f"""
                SELECT 
                    id,
                    start_time,
                    end_time,
                    session_type,
                    total_sessions,
                    total_tokens,
                    efficiency_score,
                    is_complete,
                    CASE WHEN end_time IS NOT NULL 
                        THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
                        ELSE (julianday('now') - julianday(start_time)) * 24 * 60 END as duration_minutes
                FROM five_hour_blocks
                WHERE {where_clause}
                ORDER BY start_time DESC
            """, params)
            
            blocks = [dict(row) for row in cursor.fetchall()]
            
            # Calculate block statistics
            total_blocks = len(blocks)
            completed_blocks = sum(1 for b in blocks if b['is_complete'])
            total_sessions_in_blocks = sum(b['total_sessions'] or 0 for b in blocks)
            total_tokens_in_blocks = sum(b['total_tokens'] or 0 for b in blocks)
            
            avg_efficiency = None
            if blocks:
                efficiency_scores = [b['efficiency_score'] for b in blocks if b['efficiency_score'] is not None]
                avg_efficiency = sum(efficiency_scores) / len(efficiency_scores) if efficiency_scores else None
            
            avg_duration = None
            if blocks:
                durations = [b['duration_minutes'] for b in blocks if b['duration_minutes'] is not None]
                avg_duration = sum(durations) / len(durations) if durations else None
            
            summary = {
                'total_blocks': total_blocks,
                'completed_blocks': completed_blocks,
                'completion_rate': round(completed_blocks / total_blocks * 100, 2) if total_blocks > 0 else 0,
                'total_sessions': total_sessions_in_blocks,
                'total_tokens': total_tokens_in_blocks,
                'avg_sessions_per_block': round(total_sessions_in_blocks / total_blocks, 2) if total_blocks > 0 else 0,
                'avg_tokens_per_block': round(total_tokens_in_blocks / total_blocks, 2) if total_blocks > 0 else 0,
                'avg_efficiency_score': round(avg_efficiency, 2) if avg_efficiency else None,
                'avg_duration_minutes': round(avg_duration, 2) if avg_duration else None
            }
            
            metadata = {
                'report_type': 'blocks',
                'date_range': f"{start_date or 'earliest'} to {end_date or 'latest'}",
                'record_count': total_blocks,
                'data_source': 'claude_usage.db'
            }
            
            conn.close()
            
            return ReportResponse(
                data=blocks,
                summary=summary,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating blocks report: {str(e)}")
    
    def _generate_summary_report(self, period: str, format: str) -> ReportResponse:
        """Generate high-level summary report"""
        try:
            conn = self._get_connection()
            
            # Determine date range based on period
            now = datetime.now()
            if period == 'today':
                start_date = now.date()
                end_date = start_date + timedelta(days=1)
            elif period == 'week':
                start_date = now.date() - timedelta(days=now.weekday())
                end_date = start_date + timedelta(days=7)
            elif period == 'month':
                start_date = now.date().replace(day=1)
                if start_date.month == 12:
                    end_date = start_date.replace(year=start_date.year + 1, month=1)
                else:
                    end_date = start_date.replace(month=start_date.month + 1)
            else:
                raise HTTPException(status_code=400, detail="Invalid period. Use 'today', 'week', or 'month'")
            
            # Get comprehensive summary data
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    SUM(real_input_tokens) as total_input_tokens,
                    SUM(real_output_tokens) as total_output_tokens,
                    SUM(total_messages) as total_messages,
                    COUNT(DISTINCT session_type) as unique_session_types,
                    COUNT(DISTINCT conversation_id) as unique_conversations,
                    COUNT(DISTINCT five_hour_block_id) as blocks_used,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens_per_session,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_sessions
                FROM real_sessions
                WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
            """, (start_date, end_date))
            
            summary_data = dict(cursor.fetchone())
            
            # Session type breakdown
            cursor = conn.execute("""
                SELECT 
                    session_type,
                    COUNT(*) as count,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as tokens
                FROM real_sessions
                WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
                GROUP BY session_type
                ORDER BY tokens DESC
            """, (start_date, end_date))
            
            session_types = [dict(row) for row in cursor.fetchall()]
            
            # Model usage
            cursor = conn.execute("""
                SELECT models_used, COUNT(*) as usage_count
                FROM real_sessions
                WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
                AND models_used IS NOT NULL
                GROUP BY models_used
            """, (start_date, end_date))
            
            model_usage_raw = cursor.fetchall()
            model_usage = {}
            for row in model_usage_raw:
                try:
                    models = json.loads(row[0])
                    for model in models:
                        model_usage[model] = model_usage.get(model, 0) + row[1]
                except:
                    pass
            
            summary = {
                'period': period,
                'date_range': f"{start_date.isoformat()} to {end_date.isoformat()}",
                'overview': summary_data,
                'session_types': session_types,
                'model_usage': model_usage,
                'efficiency_metrics': {
                    'tokens_per_session': round(summary_data['avg_tokens_per_session'] or 0, 2),
                    'messages_per_session': round((summary_data['total_messages'] or 0) / max(summary_data['total_sessions'], 1), 2),
                    'sessions_per_block': round((summary_data['total_sessions'] or 0) / max(summary_data['blocks_used'], 1), 2),
                    'real_token_percentage': self._calculate_real_token_percentage_for_period(start_date, end_date)
                }
            }
            
            metadata = {
                'report_type': 'summary',
                'period': period,
                'date_range': f"{start_date.isoformat()} to {end_date.isoformat()}",
                'data_source': 'claude_usage.db'
            }
            
            conn.close()
            
            return ReportResponse(
                data=[summary],  # Wrap in list for consistency
                summary=summary,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating summary report: {str(e)}")
    
    def _calculate_real_token_percentage(self, sessions: List[Dict]) -> float:
        """Calculate percentage of sessions with real token data"""
        if not sessions:
            return 0.0
        
        real_token_sessions = sum(1 for s in sessions if s.get('real_total_tokens') is not None)
        return round(real_token_sessions / len(sessions) * 100, 2)
    
    def _calculate_real_token_percentage_for_period(self, start_date: date, end_date: date) -> float:
        """Calculate real token percentage for a date range"""
        try:
            conn = self._get_connection()
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN real_total_tokens IS NOT NULL THEN 1 END) as real_token_sessions
                FROM real_sessions
                WHERE DATE(start_time) >= ? AND DATE(start_time) < ?
            """, (start_date, end_date))
            
            result = cursor.fetchone()
            total = result[0]
            real = result[1]
            
            conn.close()
            
            return round(real / total * 100, 2) if total > 0 else 0.0
        except:
            return 0.0
