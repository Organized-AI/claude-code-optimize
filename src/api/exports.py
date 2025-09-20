#!/usr/bin/env python3
"""
Data Export API
Provides CSV and JSON export functionality for all report types
"""

import json
import csv
import io
from datetime import datetime, date
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
import pandas as pd
from reports import ReportsAPI

class ExportsAPI:
    """Data export functionality for reports and analytics"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.reports_api = ReportsAPI(db_path)
        self.router = APIRouter(prefix="/api/exports", tags=["exports"])
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup export routes"""
        
        @self.router.get("/daily-csv")
        async def export_daily_csv(
            date_filter: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
        ):
            """Export daily report as CSV"""
            target_date = date.fromisoformat(date_filter) if date_filter else date.today()
            report = self.reports_api._generate_daily_report(target_date, "csv")
            return self._create_csv_response(report.data, f"daily_report_{target_date.isoformat()}.csv")
        
        @self.router.get("/weekly-csv")
        async def export_weekly_csv(
            week_start: Optional[str] = Query(None, description="Week start date YYYY-MM-DD")
        ):
            """Export weekly report as CSV"""
            if week_start:
                start_date = date.fromisoformat(week_start)
            else:
                today = date.today()
                start_date = today - timedelta(days=today.weekday())
            
            report = self.reports_api._generate_weekly_report(start_date, "csv")
            return self._create_csv_response(report.data, f"weekly_report_{start_date.isoformat()}.csv")
        
        @self.router.get("/monthly-csv")
        async def export_monthly_csv(
            month: Optional[str] = Query(None, description="Month in YYYY-MM format")
        ):
            """Export monthly report as CSV"""
            if month:
                year, month_num = month.split('-')
                target_date = date(int(year), int(month_num), 1)
            else:
                target_date = date.today().replace(day=1)
            
            report = self.reports_api._generate_monthly_report(target_date, "csv")
            return self._create_csv_response(report.data, f"monthly_report_{target_date.strftime('%Y-%m')}.csv")
        
        @self.router.get("/sessions-csv")
        async def export_sessions_csv(
            start_date: Optional[str] = Query(None),
            end_date: Optional[str] = Query(None),
            session_type: Optional[str] = Query(None)
        ):
            """Export sessions report as CSV"""
            report = self.reports_api._generate_sessions_report(start_date, end_date, session_type, "csv")
            filename = f"sessions_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            return self._create_csv_response(report.data, filename)
        
        @self.router.get("/blocks-csv")
        async def export_blocks_csv(
            start_date: Optional[str] = Query(None),
            end_date: Optional[str] = Query(None)
        ):
            """Export 5-hour blocks report as CSV"""
            report = self.reports_api._generate_blocks_report(start_date, end_date, "csv")
            filename = f"blocks_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            return self._create_csv_response(report.data, filename)
        
        @self.router.get("/full-export-json")
        async def export_full_json(
            start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
            end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD")
        ):
            """Export comprehensive data as JSON"""
            export_data = await self._generate_full_export(start_date, end_date)
            filename = f"claude_optimizer_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            return self._create_json_response(export_data, filename)
        
        @self.router.get("/full-export-csv")
        async def export_full_csv(
            start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
            end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD")
        ):
            """Export comprehensive sessions data as CSV"""
            report = self.reports_api._generate_sessions_report(start_date, end_date, None, "csv")
            filename = f"claude_optimizer_sessions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            return self._create_csv_response(report.data, filename)
        
        @self.router.get("/analytics-json")
        async def export_analytics_json():
            """Export analytics data as JSON"""
            from .analytics import AnalyticsAPI
            analytics_api = AnalyticsAPI(self.db_path)
            
            # Gather all analytics
            analytics_data = {
                'efficiency': analytics_api._generate_efficiency_analytics(),
                'usage_patterns': analytics_api._generate_usage_patterns(30),
                'cost_optimization': analytics_api._generate_cost_optimization(),
                'model_performance': analytics_api._generate_model_performance(),
                'productivity_score': analytics_api._generate_productivity_score(),
                'health_check': analytics_api._generate_health_check(),
                'export_metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'export_type': 'comprehensive_analytics',
                    'data_source': 'claude_usage.db'
                }
            }
            
            filename = f"claude_analytics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            return self._create_json_response(analytics_data, filename)
        
        @self.router.get("/ccusage-compatible")
        async def export_ccusage_compatible(
            report_type: str = Query(..., description="Report type: daily, weekly, monthly, sessions"),
            date_filter: Optional[str] = Query(None, description="Date filter (format varies by report type)"),
            format: str = Query("json", description="Output format: json or csv")
        ):
            """Export data in ccusage-compatible format"""
            
            if report_type == "daily":
                target_date = date.fromisoformat(date_filter) if date_filter else date.today()
                report = self.reports_api._generate_daily_report(target_date, format)
                
                # Transform to ccusage format
                ccusage_data = self._transform_to_ccusage_format(report, "daily")
                
                if format == "csv":
                    filename = f"ccusage_daily_{target_date.isoformat()}.csv"
                    return self._create_csv_response(ccusage_data, filename)
                else:
                    filename = f"ccusage_daily_{target_date.isoformat()}.json"
                    return self._create_json_response(ccusage_data, filename)
            
            elif report_type == "weekly":
                if date_filter:
                    start_date = date.fromisoformat(date_filter)
                else:
                    today = date.today()
                    start_date = today - timedelta(days=today.weekday())
                
                report = self.reports_api._generate_weekly_report(start_date, format)
                ccusage_data = self._transform_to_ccusage_format(report, "weekly")
                
                if format == "csv":
                    filename = f"ccusage_weekly_{start_date.isoformat()}.csv"
                    return self._create_csv_response(ccusage_data, filename)
                else:
                    filename = f"ccusage_weekly_{start_date.isoformat()}.json"
                    return self._create_json_response(ccusage_data, filename)
            
            elif report_type == "monthly":
                if date_filter:
                    year, month_num = date_filter.split('-')
                    target_date = date(int(year), int(month_num), 1)
                else:
                    target_date = date.today().replace(day=1)
                
                report = self.reports_api._generate_monthly_report(target_date, format)
                ccusage_data = self._transform_to_ccusage_format(report, "monthly")
                
                if format == "csv":
                    filename = f"ccusage_monthly_{target_date.strftime('%Y-%m')}.csv"
                    return self._create_csv_response(ccusage_data, filename)
                else:
                    filename = f"ccusage_monthly_{target_date.strftime('%Y-%m')}.json"
                    return self._create_json_response(ccusage_data, filename)
            
            elif report_type == "sessions":
                report = self.reports_api._generate_sessions_report(None, None, None, format)
                ccusage_data = self._transform_to_ccusage_format(report, "sessions")
                
                if format == "csv":
                    filename = f"ccusage_sessions_{datetime.now().strftime('%Y%m%d')}.csv"
                    return self._create_csv_response(ccusage_data, filename)
                else:
                    filename = f"ccusage_sessions_{datetime.now().strftime('%Y%m%d')}.json"
                    return self._create_json_response(ccusage_data, filename)
            
            else:
                raise HTTPException(status_code=400, detail="Invalid report type. Use: daily, weekly, monthly, or sessions")
    
    def _create_csv_response(self, data: List[Dict], filename: str) -> StreamingResponse:
        """Create CSV streaming response"""
        if not data:
            raise HTTPException(status_code=404, detail="No data available for export")
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        
        for row in data:
            # Handle JSON fields by converting to string
            clean_row = {}
            for key, value in row.items():
                if isinstance(value, (dict, list)):
                    clean_row[key] = json.dumps(value)
                elif value is None:
                    clean_row[key] = ''
                else:
                    clean_row[key] = str(value)
            writer.writerow(clean_row)
        
        output.seek(0)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    def _create_json_response(self, data: Any, filename: str) -> StreamingResponse:
        """Create JSON streaming response"""
        json_content = json.dumps(data, indent=2, default=str)
        
        return StreamingResponse(
            io.BytesIO(json_content.encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    async def _generate_full_export(self, start_date: Optional[str], end_date: Optional[str]) -> Dict:
        """Generate comprehensive export data"""
        export_data = {
            'export_metadata': {
                'generated_at': datetime.now().isoformat(),
                'version': '1.0',
                'data_source': 'claude_usage.db',
                'date_range': {
                    'start': start_date,
                    'end': end_date
                }
            }
        }
        
        # Add all report types
        try:
            # Sessions report
            sessions_report = self.reports_api._generate_sessions_report(start_date, end_date, None, "json")
            export_data['sessions'] = {
                'data': sessions_report.data,
                'summary': sessions_report.summary,
                'metadata': sessions_report.metadata
            }
            
            # Blocks report
            blocks_report = self.reports_api._generate_blocks_report(start_date, end_date, "json")
            export_data['five_hour_blocks'] = {
                'data': blocks_report.data,
                'summary': blocks_report.summary,
                'metadata': blocks_report.metadata
            }
            
            # Daily reports for the period
            if start_date and end_date:
                start_dt = date.fromisoformat(start_date)
                end_dt = date.fromisoformat(end_date)
                
                daily_reports = []
                current_date = start_dt
                while current_date <= end_dt:
                    try:
                        daily_report = self.reports_api._generate_daily_report(current_date, "json")
                        if daily_report.data:  # Only include days with data
                            daily_reports.append({
                                'date': current_date.isoformat(),
                                'summary': daily_report.summary,
                                'sessions': daily_report.data
                            })
                    except:
                        pass  # Skip days with no data
                    
                    current_date += timedelta(days=1)
                
                export_data['daily_breakdown'] = daily_reports
            
        except Exception as e:
            export_data['export_errors'] = [str(e)]
        
        return export_data
    
    def _transform_to_ccusage_format(self, report_data: Any, report_type: str) -> Dict:
        """Transform report data to ccusage-compatible format"""
        
        # ccusage-style format structure
        ccusage_format = {
            'report_type': report_type,
            'generated_at': datetime.now().isoformat(),
            'version': '1.0',
            'claude_code_optimizer_enhanced': True,  # Mark as enhanced version
            'data': report_data.data,
            'summary': report_data.summary,
            'metadata': report_data.metadata
        }
        
        # Add ccusage-specific fields based on report type
        if report_type == "daily":
            ccusage_format['daily_stats'] = {
                'date': report_data.summary.get('date'),
                'total_sessions': report_data.summary.get('total_sessions', 0),
                'total_tokens': report_data.summary.get('total_tokens', 0),
                'total_cost_estimate': self._estimate_cost(report_data.summary.get('total_tokens', 0)),
                'session_breakdown': report_data.summary.get('session_types', {})
            }
        
        elif report_type == "weekly":
            ccusage_format['weekly_stats'] = {
                'week_start': report_data.summary.get('week_start'),
                'week_end': report_data.summary.get('week_end'),
                'total_sessions': report_data.summary.get('total_sessions', 0),
                'total_tokens': report_data.summary.get('total_tokens', 0),
                'total_cost_estimate': self._estimate_cost(report_data.summary.get('total_tokens', 0)),
                'daily_breakdown': report_data.summary.get('daily_breakdown', [])
            }
        
        elif report_type == "monthly":
            ccusage_format['monthly_stats'] = {
                'month': report_data.summary.get('month'),
                'total_sessions': report_data.summary.get('total_sessions', 0),
                'total_tokens': report_data.summary.get('total_tokens', 0),
                'total_cost_estimate': self._estimate_cost(report_data.summary.get('total_tokens', 0)),
                'weekly_breakdown': report_data.summary.get('weekly_breakdown', [])
            }
        
        elif report_type == "sessions":
            ccusage_format['session_stats'] = {
                'total_sessions': report_data.summary.get('total_sessions', 0),
                'total_tokens': report_data.summary.get('total_tokens', 0),
                'total_cost_estimate': self._estimate_cost(report_data.summary.get('total_tokens', 0)),
                'efficiency_metrics': {
                    'avg_tokens_per_session': report_data.summary.get('avg_tokens_per_session', 0),
                    'avg_duration_minutes': report_data.summary.get('avg_duration_minutes'),
                    'real_token_percentage': report_data.summary.get('real_token_percentage', 0)
                }
            }
        
        return ccusage_format
    
    def _estimate_cost(self, total_tokens: int) -> float:
        """Estimate cost based on token count (rough approximation)"""
        # Rough cost estimate assuming mix of models
        # This is a simplified calculation for ccusage compatibility
        if total_tokens == 0:
            return 0.0
        
        # Assume 70% Sonnet ($0.003/1k), 30% Opus ($0.015/1k)
        sonnet_tokens = total_tokens * 0.7
        opus_tokens = total_tokens * 0.3
        
        sonnet_cost = (sonnet_tokens / 1000) * 0.003
        opus_cost = (opus_tokens / 1000) * 0.015
        
        return round(sonnet_cost + opus_cost, 4)
