#!/usr/bin/env python3
"""
Advanced Analytics API
Provides intelligent analytics and insights for Claude Code optimization
"""

import json
import sqlite3
from datetime import datetime, timedelta, date
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import numpy as np
from collections import defaultdict

class AnalyticsResponse(BaseModel):
    """Standard response format for analytics endpoints"""
    analytics: Dict[str, Any]
    insights: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    generated_at: str

class AnalyticsAPI:
    """Advanced analytics for Claude Code optimization"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.router = APIRouter(prefix="/api/analytics", tags=["analytics"])
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup analytics routes"""
        
        @self.router.get("/efficiency", response_model=AnalyticsResponse)
        async def efficiency_analytics():
            """Analyze session efficiency and optimization opportunities"""
            return self._generate_efficiency_analytics()
        
        @self.router.get("/usage-patterns", response_model=AnalyticsResponse)
        async def usage_patterns(
            days: int = Query(30, description="Number of days to analyze")
        ):
            """Analyze usage patterns and trends"""
            return self._generate_usage_patterns(days)
        
        @self.router.get("/cost-optimization", response_model=AnalyticsResponse)
        async def cost_optimization():
            """Analyze cost optimization opportunities"""
            return self._generate_cost_optimization()
        
        @self.router.get("/model-performance", response_model=AnalyticsResponse)
        async def model_performance():
            """Analyze model usage and performance"""
            return self._generate_model_performance()
        
        @self.router.get("/session-insights", response_model=AnalyticsResponse)
        async def session_insights(
            session_type: Optional[str] = Query(None, description="Filter by session type")
        ):
            """Deep insights into session performance"""
            return self._generate_session_insights(session_type)
        
        @self.router.get("/time-analysis", response_model=AnalyticsResponse)
        async def time_analysis():
            """Analyze time-based usage patterns"""
            return self._generate_time_analysis()
        
        @self.router.get("/productivity-score", response_model=AnalyticsResponse)
        async def productivity_score():
            """Calculate and analyze productivity metrics"""
            return self._generate_productivity_score()
        
        @self.router.get("/health-check", response_model=AnalyticsResponse)
        async def health_check():
            """System health and data quality analysis"""
            return self._generate_health_check()
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection with row factory"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _generate_efficiency_analytics(self) -> AnalyticsResponse:
        """Generate efficiency analytics with optimization insights"""
        try:
            conn = self._get_connection()
            
            # Get session efficiency data
            cursor = conn.execute("""
                SELECT 
                    session_type,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens,
                    AVG(total_messages) as avg_messages,
                    AVG(CASE WHEN end_time IS NOT NULL 
                        THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
                        ELSE NULL END) as avg_duration_minutes,
                    COUNT(*) as session_count,
                    COUNT(CASE WHEN real_total_tokens IS NOT NULL THEN 1 END) as real_token_sessions
                FROM real_sessions
                WHERE start_time >= date('now', '-30 days')
                GROUP BY session_type
                HAVING session_count >= 3
                ORDER BY avg_tokens DESC
            """)
            
            efficiency_data = [dict(row) for row in cursor.fetchall()]
            
            # Calculate efficiency metrics
            for session_data in efficiency_data:
                session_data['tokens_per_minute'] = (
                    session_data['avg_tokens'] / session_data['avg_duration_minutes'] 
                    if session_data['avg_duration_minutes'] else 0
                )
                session_data['messages_per_minute'] = (
                    session_data['avg_messages'] / session_data['avg_duration_minutes'] 
                    if session_data['avg_duration_minutes'] else 0
                )
                session_data['real_token_percentage'] = (
                    session_data['real_token_sessions'] / session_data['session_count'] * 100
                )
            
            # Get 5-hour block efficiency
            cursor = conn.execute("""
                SELECT 
                    AVG(efficiency_score) as avg_efficiency,
                    AVG(total_sessions) as avg_sessions_per_block,
                    AVG(total_tokens) as avg_tokens_per_block,
                    COUNT(*) as total_blocks
                FROM five_hour_blocks
                WHERE start_time >= date('now', '-30 days')
                AND efficiency_score IS NOT NULL
            """)
            
            block_efficiency = dict(cursor.fetchone() or {})
            
            # Generate insights
            insights = []
            recommendations = []
            
            # Efficiency insights
            if efficiency_data:
                most_efficient = max(efficiency_data, key=lambda x: x['tokens_per_minute'])
                least_efficient = min(efficiency_data, key=lambda x: x['tokens_per_minute'])
                
                insights.append({
                    'type': 'efficiency',
                    'title': 'Most Efficient Session Type',
                    'description': f"{most_efficient['session_type']} sessions generate {most_efficient['tokens_per_minute']:.1f} tokens per minute",
                    'data': most_efficient
                })
                
                if least_efficient['tokens_per_minute'] < most_efficient['tokens_per_minute'] * 0.5:
                    recommendations.append({
                        'type': 'optimization',
                        'priority': 'high',
                        'title': 'Optimize Low-Efficiency Sessions',
                        'description': f"{least_efficient['session_type']} sessions are {(most_efficient['tokens_per_minute'] / least_efficient['tokens_per_minute'] - 1) * 100:.0f}% less efficient",
                        'action': f"Consider breaking down {least_efficient['session_type']} sessions into smaller, focused tasks"
                    })
            
            # Real token data insights
            real_token_avg = np.mean([s['real_token_percentage'] for s in efficiency_data]) if efficiency_data else 0
            if real_token_avg < 80:
                recommendations.append({
                    'type': 'data_quality',
                    'priority': 'medium',
                    'title': 'Improve Token Tracking Accuracy',
                    'description': f"Only {real_token_avg:.1f}% of sessions have real token data",
                    'action': 'Enable conversation file monitoring for more accurate token tracking'
                })
            
            analytics = {
                'session_efficiency': efficiency_data,
                'block_efficiency': block_efficiency,
                'overall_metrics': {
                    'avg_efficiency_score': block_efficiency.get('avg_efficiency', 0),
                    'avg_tokens_per_minute': np.mean([s['tokens_per_minute'] for s in efficiency_data]) if efficiency_data else 0,
                    'real_token_coverage': real_token_avg
                }
            }
            
            metadata = {
                'analysis_period': '30 days',
                'session_types_analyzed': len(efficiency_data),
                'total_blocks_analyzed': block_efficiency.get('total_blocks', 0)
            }
            
            conn.close()
            
            return AnalyticsResponse(
                analytics=analytics,
                insights=insights,
                recommendations=recommendations,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating efficiency analytics: {str(e)}")
    
    def _generate_usage_patterns(self, days: int) -> AnalyticsResponse:
        """Analyze usage patterns and trends"""
        try:
            conn = self._get_connection()
            start_date = datetime.now() - timedelta(days=days)
            
            # Daily usage patterns
            cursor = conn.execute("""
                SELECT 
                    DATE(start_time) as usage_date,
                    COUNT(*) as session_count,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens,
                    COUNT(DISTINCT session_type) as session_types_used
                FROM real_sessions
                WHERE start_time >= ?
                GROUP BY DATE(start_time)
                ORDER BY usage_date
            """, (start_date,))
            
            daily_patterns = [dict(row) for row in cursor.fetchall()]
            
            # Hourly patterns
            cursor = conn.execute("""
                SELECT 
                    strftime('%H', start_time) as hour,
                    COUNT(*) as session_count,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens
                FROM real_sessions
                WHERE start_time >= ?
                GROUP BY strftime('%H', start_time)
                ORDER BY hour
            """, (start_date,))
            
            hourly_patterns = [dict(row) for row in cursor.fetchall()]
            
            # Weekly patterns
            cursor = conn.execute("""
                SELECT 
                    CASE strftime('%w', start_time)
                        WHEN '0' THEN 'Sunday'
                        WHEN '1' THEN 'Monday'
                        WHEN '2' THEN 'Tuesday'
                        WHEN '3' THEN 'Wednesday'
                        WHEN '4' THEN 'Thursday'
                        WHEN '5' THEN 'Friday'
                        WHEN '6' THEN 'Saturday'
                    END as day_of_week,
                    COUNT(*) as session_count,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens
                FROM real_sessions
                WHERE start_time >= ?
                GROUP BY strftime('%w', start_time)
                ORDER BY strftime('%w', start_time)
            """, (start_date,))
            
            weekly_patterns = [dict(row) for row in cursor.fetchall()]
            
            # Calculate trends
            insights = []
            recommendations = []
            
            if len(daily_patterns) > 7:
                # Calculate trend
                recent_week = daily_patterns[-7:]
                previous_week = daily_patterns[-14:-7] if len(daily_patterns) >= 14 else []
                
                if previous_week:
                    recent_avg = np.mean([d['session_count'] for d in recent_week])
                    previous_avg = np.mean([d['session_count'] for d in previous_week])
                    trend = ((recent_avg - previous_avg) / previous_avg) * 100
                    
                    insights.append({
                        'type': 'trend',
                        'title': 'Usage Trend',
                        'description': f"Session count {'increased' if trend > 0 else 'decreased'} by {abs(trend):.1f}% this week",
                        'data': {'trend_percentage': trend, 'recent_avg': recent_avg, 'previous_avg': previous_avg}
                    })
            
            # Find peak usage hours
            if hourly_patterns:
                peak_hour = max(hourly_patterns, key=lambda x: x['session_count'])
                insights.append({
                    'type': 'pattern',
                    'title': 'Peak Usage Hour',
                    'description': f"Most active at {peak_hour['hour']}:00 with {peak_hour['session_count']} sessions",
                    'data': peak_hour
                })
            
            # Find best productivity day
            if weekly_patterns:
                best_day = max(weekly_patterns, key=lambda x: x['avg_tokens'])
                insights.append({
                    'type': 'pattern',
                    'title': 'Most Productive Day',
                    'description': f"{best_day['day_of_week']} averages {best_day['avg_tokens']:.0f} tokens per session",
                    'data': best_day
                })
            
            analytics = {
                'daily_patterns': daily_patterns,
                'hourly_patterns': hourly_patterns,
                'weekly_patterns': weekly_patterns,
                'summary_stats': {
                    'total_days_analyzed': len(daily_patterns),
                    'avg_sessions_per_day': np.mean([d['session_count'] for d in daily_patterns]) if daily_patterns else 0,
                    'avg_tokens_per_day': np.mean([d['total_tokens'] for d in daily_patterns]) if daily_patterns else 0
                }
            }
            
            metadata = {
                'analysis_period': f"{days} days",
                'start_date': start_date.isoformat(),
                'end_date': datetime.now().isoformat()
            }
            
            conn.close()
            
            return AnalyticsResponse(
                analytics=analytics,
                insights=insights,
                recommendations=recommendations,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating usage patterns: {str(e)}")
    
    def _generate_cost_optimization(self) -> AnalyticsResponse:
        """Analyze cost optimization opportunities"""
        try:
            conn = self._get_connection()
            
            # Model usage analysis (for cost optimization)
            cursor = conn.execute("""
                SELECT 
                    models_used,
                    COUNT(*) as session_count,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens
                FROM real_sessions
                WHERE start_time >= date('now', '-30 days')
                AND models_used IS NOT NULL
                GROUP BY models_used
                ORDER BY total_tokens DESC
            """)
            
            model_usage_raw = [dict(row) for row in cursor.fetchall()]
            
            # Parse model usage
            model_costs = {
                'claude-3-opus': 0.015,    # per 1k input tokens
                'claude-3-sonnet': 0.003,  # per 1k input tokens
                'claude-3-haiku': 0.00025  # per 1k input tokens
            }
            
            model_analysis = []
            total_potential_savings = 0
            
            for usage in model_usage_raw:
                try:
                    models = json.loads(usage['models_used'])
                    for model in models:
                        if model in model_costs:
                            estimated_cost = (usage['total_tokens'] / 1000) * model_costs[model]
                            
                            # Calculate potential savings if using Sonnet instead of Opus
                            if model == 'claude-3-opus':
                                sonnet_cost = (usage['total_tokens'] / 1000) * model_costs['claude-3-sonnet']
                                potential_savings = estimated_cost - sonnet_cost
                                total_potential_savings += potential_savings
                            else:
                                potential_savings = 0
                            
                            model_analysis.append({
                                'model': model,
                                'sessions': usage['session_count'],
                                'total_tokens': usage['total_tokens'],
                                'estimated_cost': estimated_cost,
                                'potential_savings': potential_savings
                            })
                except json.JSONDecodeError:
                    continue
            
            # Session type cost analysis
            cursor = conn.execute("""
                SELECT 
                    session_type,
                    COUNT(*) as session_count,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens
                FROM real_sessions
                WHERE start_time >= date('now', '-30 days')
                GROUP BY session_type
                ORDER BY total_tokens DESC
            """)
            
            session_type_costs = [dict(row) for row in cursor.fetchall()]
            
            # Generate insights and recommendations
            insights = []
            recommendations = []
            
            if total_potential_savings > 0:
                insights.append({
                    'type': 'cost_savings',
                    'title': 'Opus to Sonnet Optimization',
                    'description': f"Could save ${total_potential_savings:.2f} by using Sonnet for appropriate tasks",
                    'data': {'potential_monthly_savings': total_potential_savings}
                })
                
                recommendations.append({
                    'type': 'cost_optimization',
                    'priority': 'high',
                    'title': 'Switch Simple Tasks to Sonnet',
                    'description': 'Use Claude 3 Sonnet for routine tasks like code review, documentation, and simple analysis',
                    'action': 'Configure task complexity detection to automatically route simpler tasks to Sonnet'
                })
            
            # Find high-token session types for optimization
            if session_type_costs:
                highest_cost_type = max(session_type_costs, key=lambda x: x['total_tokens'])
                if highest_cost_type['avg_tokens'] > 50000:  # High token usage
                    recommendations.append({
                        'type': 'session_optimization',
                        'priority': 'medium',
                        'title': f"Optimize {highest_cost_type['session_type']} Sessions",
                        'description': f"These sessions average {highest_cost_type['avg_tokens']:.0f} tokens",
                        'action': 'Consider breaking large sessions into smaller, focused chunks'
                    })
            
            analytics = {
                'model_analysis': model_analysis,
                'session_type_costs': session_type_costs,
                'cost_summary': {
                    'total_potential_savings': total_potential_savings,
                    'highest_cost_model': max(model_analysis, key=lambda x: x['estimated_cost'])['model'] if model_analysis else None,
                    'highest_cost_session_type': highest_cost_type['session_type'] if session_type_costs else None
                }
            }
            
            metadata = {
                'analysis_period': '30 days',
                'models_analyzed': len(model_analysis),
                'session_types_analyzed': len(session_type_costs)
            }
            
            conn.close()
            
            return AnalyticsResponse(
                analytics=analytics,
                insights=insights,
                recommendations=recommendations,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating cost optimization: {str(e)}")
    
    def _generate_model_performance(self) -> AnalyticsResponse:
        """Analyze model usage and performance patterns"""
        try:
            conn = self._get_connection()
            
            # Model performance by session type
            cursor = conn.execute("""
                SELECT 
                    session_type,
                    models_used,
                    COUNT(*) as usage_count,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens,
                    AVG(total_messages) as avg_messages,
                    AVG(CASE WHEN end_time IS NOT NULL 
                        THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
                        ELSE NULL END) as avg_duration_minutes
                FROM real_sessions
                WHERE start_time >= date('now', '-30 days')
                AND models_used IS NOT NULL
                GROUP BY session_type, models_used
                HAVING usage_count >= 2
                ORDER BY session_type, avg_tokens DESC
            """)
            
            performance_data = [dict(row) for row in cursor.fetchall()]
            
            # Parse and organize model performance
            model_performance = defaultdict(lambda: {
                'total_sessions': 0,
                'total_tokens': 0,
                'avg_tokens_per_session': 0,
                'avg_duration': 0,
                'session_types': defaultdict(int)
            })
            
            for perf in performance_data:
                try:
                    models = json.loads(perf['models_used'])
                    for model in models:
                        model_performance[model]['total_sessions'] += perf['usage_count']
                        model_performance[model]['total_tokens'] += perf['avg_tokens'] * perf['usage_count']
                        model_performance[model]['session_types'][perf['session_type']] += perf['usage_count']
                        
                        if perf['avg_duration_minutes']:
                            if model_performance[model]['avg_duration'] == 0:
                                model_performance[model]['avg_duration'] = perf['avg_duration_minutes']
                            else:
                                model_performance[model]['avg_duration'] = (
                                    (model_performance[model]['avg_duration'] + perf['avg_duration_minutes']) / 2
                                )
                except json.JSONDecodeError:
                    continue
            
            # Calculate averages
            for model, data in model_performance.items():
                data['avg_tokens_per_session'] = data['total_tokens'] / data['total_sessions'] if data['total_sessions'] > 0 else 0
                data['session_types'] = dict(data['session_types'])
            
            # Generate insights
            insights = []
            recommendations = []
            
            if model_performance:
                # Find most used model
                most_used = max(model_performance.items(), key=lambda x: x[1]['total_sessions'])
                insights.append({
                    'type': 'model_usage',
                    'title': 'Most Used Model',
                    'description': f"{most_used[0]} used in {most_used[1]['total_sessions']} sessions",
                    'data': most_used[1]
                })
                
                # Find most efficient model (lowest tokens per session)
                most_efficient = min(
                    [(k, v) for k, v in model_performance.items() if v['avg_tokens_per_session'] > 0],
                    key=lambda x: x[1]['avg_tokens_per_session']
                )
                
                insights.append({
                    'type': 'efficiency',
                    'title': 'Most Efficient Model',
                    'description': f"{most_efficient[0]} averages {most_efficient[1]['avg_tokens_per_session']:.0f} tokens per session",
                    'data': most_efficient[1]
                })
            
            analytics = {
                'model_performance': dict(model_performance),
                'performance_comparison': performance_data,
                'summary': {
                    'models_analyzed': len(model_performance),
                    'total_model_sessions': sum(data['total_sessions'] for data in model_performance.values()),
                    'avg_session_diversity': len(model_performance) / max(1, sum(data['total_sessions'] for data in model_performance.values()))
                }
            }
            
            metadata = {
                'analysis_period': '30 days',
                'models_found': len(model_performance),
                'session_types_analyzed': len(set(perf['session_type'] for perf in performance_data))
            }
            
            conn.close()
            
            return AnalyticsResponse(
                analytics=analytics,
                insights=insights,
                recommendations=recommendations,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating model performance: {str(e)}")
    
    def _generate_session_insights(self, session_type: Optional[str]) -> AnalyticsResponse:
        """Generate deep insights into session performance"""
        try:
            conn = self._get_connection()
            
            # Build query with optional session type filter
            where_clause = "WHERE start_time >= date('now', '-30 days')"
            params = []
            
            if session_type:
                where_clause += " AND session_type = ?"
                params.append(session_type)
            
            # Session performance analysis
            cursor = conn.execute(f"""
                SELECT 
                    id,
                    session_type,
                    start_time,
                    end_time,
                    COALESCE(real_total_tokens, estimated_tokens, 0) as tokens,
                    total_messages,
                    CASE WHEN end_time IS NOT NULL 
                        THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
                        ELSE NULL END as duration_minutes,
                    is_active,
                    token_extraction_method
                FROM real_sessions
                {where_clause}
                ORDER BY start_time DESC
            """, params)
            
            sessions = [dict(row) for row in cursor.fetchall()]
            
            if not sessions:
                raise HTTPException(status_code=404, detail="No sessions found for analysis")
            
            # Calculate session insights
            completed_sessions = [s for s in sessions if s['duration_minutes'] is not None]
            
            insights = []
            recommendations = []
            
            # Duration analysis
            if completed_sessions:
                durations = [s['duration_minutes'] for s in completed_sessions]
                avg_duration = np.mean(durations)
                median_duration = np.median(durations)
                
                insights.append({
                    'type': 'duration',
                    'title': 'Session Duration Analysis',
                    'description': f"Average: {avg_duration:.1f} min, Median: {median_duration:.1f} min",
                    'data': {
                        'average': avg_duration,
                        'median': median_duration,
                        'min': min(durations),
                        'max': max(durations),
                        'std_dev': np.std(durations)
                    }
                })
                
                # Long session warning
                long_sessions = [s for s in completed_sessions if s['duration_minutes'] > 120]
                if len(long_sessions) > len(completed_sessions) * 0.2:  # >20% are long sessions
                    recommendations.append({
                        'type': 'session_management',
                        'priority': 'medium',
                        'title': 'Consider Shorter Sessions',
                        'description': f"{len(long_sessions)} sessions exceeded 2 hours",
                        'action': 'Break complex tasks into shorter, focused sessions for better efficiency'
                    })
            
            # Token efficiency analysis
            token_values = [s['tokens'] for s in sessions if s['tokens'] > 0]
            if token_values:
                avg_tokens = np.mean(token_values)
                token_efficiency = []
                
                for session in completed_sessions:
                    if session['duration_minutes'] and session['tokens']:
                        efficiency = session['tokens'] / session['duration_minutes']
                        token_efficiency.append(efficiency)
                
                if token_efficiency:
                    avg_efficiency = np.mean(token_efficiency)
                    insights.append({
                        'type': 'efficiency',
                        'title': 'Token Efficiency',
                        'description': f"Average {avg_efficiency:.1f} tokens per minute",
                        'data': {
                            'avg_tokens_per_minute': avg_efficiency,
                            'avg_tokens_per_session': avg_tokens,
                            'efficiency_distribution': {
                                'low': len([e for e in token_efficiency if e < avg_efficiency * 0.7]),
                                'medium': len([e for e in token_efficiency if avg_efficiency * 0.7 <= e <= avg_efficiency * 1.3]),
                                'high': len([e for e in token_efficiency if e > avg_efficiency * 1.3])
                            }
                        }
                    })
            
            # Data quality analysis
            real_token_sessions = len([s for s in sessions if s['token_extraction_method'] != 'estimated'])
            real_token_percentage = real_token_sessions / len(sessions) * 100
            
            insights.append({
                'type': 'data_quality',
                'title': 'Token Data Quality',
                'description': f"{real_token_percentage:.1f}% of sessions have real token data",
                'data': {
                    'real_token_percentage': real_token_percentage,
                    'estimated_sessions': len(sessions) - real_token_sessions,
                    'real_sessions': real_token_sessions
                }
            })
            
            analytics = {
                'session_summary': {
                    'total_sessions': len(sessions),
                    'completed_sessions': len(completed_sessions),
                    'active_sessions': len([s for s in sessions if s['is_active']]),
                    'avg_tokens': avg_tokens if token_values else 0,
                    'avg_duration': avg_duration if completed_sessions else None
                },
                'performance_metrics': {
                    'token_efficiency': token_efficiency if 'token_efficiency' in locals() else [],
                    'duration_distribution': {
                        'short': len([s for s in completed_sessions if s['duration_minutes'] < 30]),
                        'medium': len([s for s in completed_sessions if 30 <= s['duration_minutes'] <= 120]),
                        'long': len([s for s in completed_sessions if s['duration_minutes'] > 120])
                    } if completed_sessions else {},
                    'real_token_coverage': real_token_percentage
                }
            }
            
            metadata = {
                'analysis_period': '30 days',
                'session_type_filter': session_type,
                'sessions_analyzed': len(sessions)
            }
            
            conn.close()
            
            return AnalyticsResponse(
                analytics=analytics,
                insights=insights,
                recommendations=recommendations,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating session insights: {str(e)}")
    
    def _generate_time_analysis(self) -> AnalyticsResponse:
        """Analyze time-based usage patterns and productivity"""
        try:
            conn = self._get_connection()
            
            # Hourly productivity analysis
            cursor = conn.execute("""
                SELECT 
                    strftime('%H', start_time) as hour,
                    COUNT(*) as session_count,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens,
                    AVG(total_messages) as avg_messages,
                    AVG(CASE WHEN end_time IS NOT NULL 
                        THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
                        ELSE NULL END) as avg_duration_minutes
                FROM real_sessions
                WHERE start_time >= date('now', '-30 days')
                GROUP BY strftime('%H', start_time)
                ORDER BY hour
            """)
            
            hourly_data = [dict(row) for row in cursor.fetchall()]
            
            # Daily productivity analysis
            cursor = conn.execute("""
                SELECT 
                    DATE(start_time) as date,
                    COUNT(*) as session_count,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens,
                    SUM(total_messages) as total_messages
                FROM real_sessions
                WHERE start_time >= date('now', '-30 days')
                GROUP BY DATE(start_time)
                ORDER BY date
            """)
            
            daily_data = [dict(row) for row in cursor.fetchall()]
            
            # Calculate productivity insights
            insights = []
            recommendations = []
            
            if hourly_data:
                # Find peak productivity hours
                peak_tokens_hour = max(hourly_data, key=lambda x: x['avg_tokens'])
                peak_sessions_hour = max(hourly_data, key=lambda x: x['session_count'])
                
                insights.append({
                    'type': 'peak_productivity',
                    'title': 'Peak Token Production Hour',
                    'description': f"{peak_tokens_hour['hour']}:00 - {peak_tokens_hour['avg_tokens']:.0f} avg tokens",
                    'data': peak_tokens_hour
                })
                
                insights.append({
                    'type': 'peak_activity',
                    'title': 'Peak Activity Hour',
                    'description': f"{peak_sessions_hour['hour']}:00 - {peak_sessions_hour['session_count']} sessions",
                    'data': peak_sessions_hour
                })
                
                # Analyze work patterns
                work_hours = [h for h in hourly_data if 9 <= int(h['hour']) <= 17]  # 9 AM to 5 PM
                off_hours = [h for h in hourly_data if int(h['hour']) < 9 or int(h['hour']) > 17]
                
                if work_hours and off_hours:
                    work_avg = np.mean([h['avg_tokens'] for h in work_hours])
                    off_avg = np.mean([h['avg_tokens'] for h in off_hours])
                    
                    if off_avg > work_avg * 1.2:  # 20% more productive off-hours
                        insights.append({
                            'type': 'work_pattern',
                            'title': 'Off-Hours Productivity',
                            'description': f"Off-hours sessions are {((off_avg / work_avg - 1) * 100):.0f}% more productive",
                            'data': {'work_hours_avg': work_avg, 'off_hours_avg': off_avg}
                        })
            
            if daily_data and len(daily_data) >= 14:
                # Calculate weekly productivity trend
                recent_week = daily_data[-7:]
                previous_week = daily_data[-14:-7]
                
                recent_avg = np.mean([d['total_tokens'] for d in recent_week])
                previous_avg = np.mean([d['total_tokens'] for d in previous_week])
                
                trend = ((recent_avg - previous_avg) / previous_avg) * 100 if previous_avg > 0 else 0
                
                insights.append({
                    'type': 'productivity_trend',
                    'title': 'Weekly Productivity Trend',
                    'description': f"Token production {'increased' if trend > 0 else 'decreased'} by {abs(trend):.1f}%",
                    'data': {'trend_percentage': trend, 'recent_avg': recent_avg, 'previous_avg': previous_avg}
                })
                
                if trend < -20:  # 20% decrease
                    recommendations.append({
                        'type': 'productivity_recovery',
                        'priority': 'high',
                        'title': 'Address Productivity Decline',
                        'description': f"Token production down {abs(trend):.1f}% this week",
                        'action': 'Review session patterns and consider adjusting work schedule or session structure'
                    })
            
            analytics = {
                'hourly_patterns': hourly_data,
                'daily_patterns': daily_data,
                'productivity_summary': {
                    'peak_hour': peak_tokens_hour['hour'] if hourly_data else None,
                    'most_active_hour': peak_sessions_hour['hour'] if hourly_data else None,
                    'avg_daily_tokens': np.mean([d['total_tokens'] for d in daily_data]) if daily_data else 0,
                    'avg_daily_sessions': np.mean([d['session_count'] for d in daily_data]) if daily_data else 0
                }
            }
            
            metadata = {
                'analysis_period': '30 days',
                'hours_analyzed': len(hourly_data),
                'days_analyzed': len(daily_data)
            }
            
            conn.close()
            
            return AnalyticsResponse(
                analytics=analytics,
                insights=insights,
                recommendations=recommendations,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating time analysis: {str(e)}")
    
    def _generate_productivity_score(self) -> AnalyticsResponse:
        """Calculate comprehensive productivity score and metrics"""
        try:
            conn = self._get_connection()
            
            # Get last 30 days of data for scoring
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    AVG(COALESCE(real_total_tokens, estimated_tokens, 0)) as avg_tokens_per_session,
                    AVG(total_messages) as avg_messages_per_session,
                    AVG(CASE WHEN end_time IS NOT NULL 
                        THEN (julianday(end_time) - julianday(start_time)) * 24 * 60 
                        ELSE NULL END) as avg_duration_minutes,
                    COUNT(CASE WHEN real_total_tokens IS NOT NULL THEN 1 END) as real_token_sessions,
                    COUNT(DISTINCT session_type) as session_type_diversity,
                    COUNT(DISTINCT DATE(start_time)) as active_days
                FROM real_sessions
                WHERE start_time >= date('now', '-30 days')
            """)
            
            metrics = dict(cursor.fetchone())
            
            # Get 5-hour block efficiency
            cursor = conn.execute("""
                SELECT 
                    AVG(efficiency_score) as avg_block_efficiency,
                    COUNT(CASE WHEN is_complete = 1 THEN 1 END) as completed_blocks,
                    COUNT(*) as total_blocks
                FROM five_hour_blocks
                WHERE start_time >= date('now', '-30 days')
            """)
            
            block_metrics = dict(cursor.fetchone())
            
            # Calculate component scores (0-100)
            scores = {}
            
            # 1. Session Frequency Score (0-25 points)
            daily_sessions = metrics['total_sessions'] / max(metrics['active_days'], 1)
            if daily_sessions >= 5:
                scores['frequency'] = 25
            elif daily_sessions >= 3:
                scores['frequency'] = 20
            elif daily_sessions >= 2:
                scores['frequency'] = 15
            elif daily_sessions >= 1:
                scores['frequency'] = 10
            else:
                scores['frequency'] = 5
            
            # 2. Token Efficiency Score (0-25 points)
            if metrics['avg_duration_minutes'] and metrics['avg_duration_minutes'] > 0:
                tokens_per_minute = metrics['avg_tokens_per_session'] / metrics['avg_duration_minutes']
                if tokens_per_minute >= 100:
                    scores['efficiency'] = 25
                elif tokens_per_minute >= 75:
                    scores['efficiency'] = 20
                elif tokens_per_minute >= 50:
                    scores['efficiency'] = 15
                elif tokens_per_minute >= 25:
                    scores['efficiency'] = 10
                else:
                    scores['efficiency'] = 5
            else:
                scores['efficiency'] = 10  # Default for incomplete data
            
            # 3. Data Quality Score (0-25 points)
            if metrics['total_sessions'] > 0:
                real_token_percentage = metrics['real_token_sessions'] / metrics['total_sessions'] * 100
                if real_token_percentage >= 90:
                    scores['data_quality'] = 25
                elif real_token_percentage >= 70:
                    scores['data_quality'] = 20
                elif real_token_percentage >= 50:
                    scores['data_quality'] = 15
                elif real_token_percentage >= 30:
                    scores['data_quality'] = 10
                else:
                    scores['data_quality'] = 5
            else:
                scores['data_quality'] = 0
            
            # 4. Block Management Score (0-25 points)
            if block_metrics['total_blocks'] and block_metrics['total_blocks'] > 0:
                completion_rate = block_metrics['completed_blocks'] / block_metrics['total_blocks'] * 100
                avg_efficiency = block_metrics['avg_block_efficiency'] or 0
                
                block_score = (completion_rate * 0.6 + avg_efficiency * 0.4) / 4  # Scale to 0-25
                scores['block_management'] = min(25, max(0, block_score))
            else:
                scores['block_management'] = 0
            
            # Calculate overall score
            total_score = sum(scores.values())
            
            # Determine grade
            if total_score >= 85:
                grade = 'A+'
                performance_level = 'Exceptional'
            elif total_score >= 75:
                grade = 'A'
                performance_level = 'Excellent'
            elif total_score >= 65:
                grade = 'B+'
                performance_level = 'Very Good'
            elif total_score >= 55:
                grade = 'B'
                performance_level = 'Good'
            elif total_score >= 45:
                grade = 'C+'
                performance_level = 'Average'
            elif total_score >= 35:
                grade = 'C'
                performance_level = 'Below Average'
            else:
                grade = 'D'
                performance_level = 'Needs Improvement'
            
            # Generate insights and recommendations
            insights = []
            recommendations = []
            
            insights.append({
                'type': 'overall_performance',
                'title': f'Productivity Grade: {grade}',
                'description': f'{performance_level} - {total_score:.1f}/100 points',
                'data': {'score': total_score, 'grade': grade, 'level': performance_level}
            })
            
            # Specific recommendations based on lowest scores
            lowest_score_area = min(scores.items(), key=lambda x: x[1])
            
            if lowest_score_area[0] == 'frequency' and lowest_score_area[1] < 15:
                recommendations.append({
                    'type': 'frequency_improvement',
                    'priority': 'high',
                    'title': 'Increase Session Frequency',
                    'description': f'Only {daily_sessions:.1f} sessions per day on average',
                    'action': 'Aim for 3-5 shorter, focused sessions daily for better consistency'
                })
            
            elif lowest_score_area[0] == 'efficiency' and lowest_score_area[1] < 15:
                tokens_per_minute = metrics['avg_tokens_per_session'] / metrics['avg_duration_minutes'] if metrics['avg_duration_minutes'] else 0
                recommendations.append({
                    'type': 'efficiency_improvement',
                    'priority': 'high',
                    'title': 'Improve Token Efficiency',
                    'description': f'Currently {tokens_per_minute:.1f} tokens per minute',
                    'action': 'Focus on clear, specific prompts and avoid overly complex single sessions'
                })
            
            elif lowest_score_area[0] == 'data_quality' and lowest_score_area[1] < 15:
                recommendations.append({
                    'type': 'data_quality_improvement',
                    'priority': 'medium',
                    'title': 'Enable Real Token Tracking',
                    'description': f'Only {real_token_percentage:.1f}% real token data',
                    'action': 'Configure conversation file monitoring for accurate token counts'
                })
            
            analytics = {
                'productivity_score': {
                    'total_score': total_score,
                    'grade': grade,
                    'performance_level': performance_level,
                    'component_scores': scores
                },
                'metrics_breakdown': metrics,
                'block_metrics': block_metrics,
                'benchmarks': {
                    'target_daily_sessions': 3,
                    'target_tokens_per_minute': 75,
                    'target_real_token_percentage': 90,
                    'target_block_completion_rate': 80
                }
            }
            
            metadata = {
                'scoring_period': '30 days',
                'last_calculated': datetime.now().isoformat(),
                'score_components': list(scores.keys())
            }
            
            conn.close()
            
            return AnalyticsResponse(
                analytics=analytics,
                insights=insights,
                recommendations=recommendations,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating productivity score: {str(e)}")
    
    def _generate_health_check(self) -> AnalyticsResponse:
        """Generate system health and data quality analysis"""
        try:
            conn = self._get_connection()
            
            # Database health checks
            cursor = conn.execute("SELECT COUNT(*) as total_sessions FROM real_sessions")
            total_sessions = cursor.fetchone()[0]
            
            cursor = conn.execute("SELECT COUNT(*) as recent_sessions FROM real_sessions WHERE start_time >= date('now', '-7 days')")
            recent_sessions = cursor.fetchone()[0]
            
            cursor = conn.execute("SELECT COUNT(*) as active_sessions FROM real_sessions WHERE is_active = 1")
            active_sessions = cursor.fetchone()[0]
            
            # Data quality checks
            cursor = conn.execute("""
                SELECT 
                    COUNT(CASE WHEN real_total_tokens IS NOT NULL THEN 1 END) as real_token_count,
                    COUNT(CASE WHEN real_total_tokens IS NULL THEN 1 END) as estimated_token_count,
                    COUNT(CASE WHEN end_time IS NULL AND is_active = 0 THEN 1 END) as incomplete_sessions,
                    COUNT(CASE WHEN models_used IS NULL OR models_used = '' THEN 1 END) as missing_model_data
                FROM real_sessions
                WHERE start_time >= date('now', '-30 days')
            """)
            
            quality_metrics = dict(cursor.fetchone())
            total_recent = quality_metrics['real_token_count'] + quality_metrics['estimated_token_count']
            
            # 5-hour blocks health
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_blocks,
                    COUNT(CASE WHEN is_complete = 1 THEN 1 END) as completed_blocks,
                    COUNT(CASE WHEN efficiency_score IS NULL THEN 1 END) as blocks_without_scores
                FROM five_hour_blocks
                WHERE start_time >= date('now', '-30 days')
            """)
            
            block_health = dict(cursor.fetchone())
            
            # Generate health insights
            insights = []
            recommendations = []
            health_score = 100  # Start with perfect score, deduct for issues
            
            # Check data recency
            if recent_sessions == 0:
                insights.append({
                    'type': 'data_staleness',
                    'title': 'No Recent Activity',
                    'description': 'No sessions recorded in the last 7 days',
                    'severity': 'warning'
                })
                health_score -= 30
            elif recent_sessions < 5:
                insights.append({
                    'type': 'low_activity',
                    'title': 'Low Activity Detected',
                    'description': f'Only {recent_sessions} sessions in the last 7 days',
                    'severity': 'info'
                })
                health_score -= 10
            
            # Check token data quality
            if total_recent > 0:
                real_token_percentage = quality_metrics['real_token_count'] / total_recent * 100
                if real_token_percentage < 50:
                    insights.append({
                        'type': 'data_quality',
                        'title': 'Low Real Token Coverage',
                        'description': f'Only {real_token_percentage:.1f}% of sessions have real token data',
                        'severity': 'warning'
                    })
                    health_score -= 20
                    
                    recommendations.append({
                        'type': 'monitoring_improvement',
                        'priority': 'high',
                        'title': 'Enable Conversation File Monitoring',
                        'description': 'Most sessions are using estimated token counts',
                        'action': 'Configure JSONL conversation file monitoring for accurate token tracking'
                    })
            
            # Check for incomplete sessions
            if quality_metrics['incomplete_sessions'] > total_recent * 0.1:  # >10% incomplete
                insights.append({
                    'type': 'incomplete_sessions',
                    'title': 'High Incomplete Session Rate',
                    'description': f"{quality_metrics['incomplete_sessions']} sessions lack end times",
                    'severity': 'warning'
                })
                health_score -= 15
            
            # Check model data
            if quality_metrics['missing_model_data'] > total_recent * 0.2:  # >20% missing
                insights.append({
                    'type': 'missing_metadata',
                    'title': 'Missing Model Information',
                    'description': f"{quality_metrics['missing_model_data']} sessions lack model data",
                    'severity': 'info'
                })
                health_score -= 10
            
            # Check active sessions
            if active_sessions > 5:
                insights.append({
                    'type': 'cleanup_needed',
                    'title': 'Multiple Active Sessions',
                    'description': f'{active_sessions} sessions marked as active',
                    'severity': 'warning'
                })
                health_score -= 5
                
                recommendations.append({
                    'type': 'data_cleanup',
                    'priority': 'medium',
                    'title': 'Clean Up Stale Active Sessions',
                    'description': 'Multiple sessions are marked as active',
                    'action': 'Review and close any stale active sessions'
                })
            
            # Determine overall health status
            if health_score >= 90:
                health_status = 'Excellent'
                status_color = 'green'
            elif health_score >= 75:
                health_status = 'Good'
                status_color = 'blue'
            elif health_score >= 60:
                health_status = 'Fair'
                status_color = 'yellow'
            else:
                health_status = 'Poor'
                status_color = 'red'
            
            analytics = {
                'health_score': health_score,
                'health_status': health_status,
                'status_color': status_color,
                'database_metrics': {
                    'total_sessions': total_sessions,
                    'recent_sessions': recent_sessions,
                    'active_sessions': active_sessions
                },
                'data_quality': {
                    'real_token_percentage': quality_metrics['real_token_count'] / max(total_recent, 1) * 100,
                    'incomplete_session_percentage': quality_metrics['incomplete_sessions'] / max(total_recent, 1) * 100,
                    'missing_model_percentage': quality_metrics['missing_model_data'] / max(total_recent, 1) * 100
                },
                'block_health': block_health,
                'system_status': {
                    'monitoring_active': recent_sessions > 0,
                    'data_quality_good': quality_metrics['real_token_count'] / max(total_recent, 1) > 0.5,
                    'blocks_functioning': block_health['total_blocks'] > 0
                }
            }
            
            metadata = {
                'check_timestamp': datetime.now().isoformat(),
                'analysis_period': '30 days',
                'issues_found': len([i for i in insights if i['severity'] in ['warning', 'error']])
            }
            
            conn.close()
            
            return AnalyticsResponse(
                analytics=analytics,
                insights=insights,
                recommendations=recommendations,
                metadata=metadata,
                generated_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating health check: {str(e)}")
