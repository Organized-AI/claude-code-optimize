"""
Output formatters for Claude Code Optimizer CLI
Provides ccusage-compatible formatting with rich enhancements.
"""

import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, BarColumn, TextColumn
from rich.text import Text

class OutputFormatter:
    """Handles all CLI output formatting."""
    
    def __init__(self, format_type: str = 'table', no_color: bool = False):
        self.format_type = format_type
        self.console = Console(color_system=None if no_color else 'auto')
    
    def format_daily_report(self, data: Dict[str, Any]) -> None:
        """Format daily usage report - ccusage compatible."""
        if not data:
            self.console.print("[red]No data available[/]")
            return
            
        if self.format_type == 'json':
            self.console.print(json.dumps(data, indent=2))
            return
        
        summary = data.get('summary', {})
        by_model = data.get('by_model', {})
        
        # Header (ccusage style)
        self.console.print("═" * 67)
        self.console.print(f"{'DAILY USAGE REPORT':^67}")
        self.console.print(f"{data.get('date', 'Today'):^67}")
        self.console.print("═" * 67)
        
        # Summary
        sessions = summary.get('total_sessions', 0)
        duration = summary.get('total_duration_hours', 0)
        tokens = summary.get('total_tokens', 0)
        efficiency = data.get('efficiency_score', 0)
        
        self.console.print(f"Sessions: {sessions}")
        self.console.print(f"Total Duration: {duration:.1f} hours")
        self.console.print(f"Total Tokens: {tokens:,}")
        self.console.print(f"Efficiency Score: {efficiency:.1f}/10 {'🌟' if efficiency >= 7 else '⭐' if efficiency >= 4 else '💫'}")
        
        if by_model:
            self.console.print("\nModel Breakdown:")
            for model, model_data in by_model.items():
                model_duration = model_data.get('duration_hours', 0)
                model_tokens = model_data.get('total_tokens', 0)
                percentage = (model_tokens / tokens * 100) if tokens > 0 else 0
                
                self.console.print(f"  {model.title()}: {model_tokens:,} tokens ({percentage:.1f}%) - {model_duration:.1f} hours")
        
        self.console.print("═" * 67)
    
    def format_weekly_report(self, data: Dict[str, Any]) -> None:
        """Format weekly usage report with quota status."""
        if not data:
            self.console.print("[red]No data available[/]")
            return
            
        if self.format_type == 'json':
            self.console.print(json.dumps(data, indent=2))
            return
        
        summary = data.get('summary', {})
        by_model = data.get('by_model', {})
        by_project = data.get('by_project', {})
        quota_status = data.get('quota_status', {})
        
        # Header
        week_start = data.get('week_start', 'This Week')
        self.console.print("═" * 67)
        self.console.print(f"{'WEEKLY USAGE REPORT':^67}")
        self.console.print(f"{week_start + ' - Present':^67}")
        self.console.print("═" * 67)
        
        # Summary with quota status
        sessions = summary.get('total_sessions', 0)
        duration = summary.get('total_duration_hours', 0)
        tokens = summary.get('total_tokens', 0)
        efficiency = data.get('efficiency_score', 0)
        
        self.console.print(f"Total Sessions: {sessions}")
        self.console.print(f"Total Duration: {duration:.1f} hours")
        self.console.print(f"Total Tokens: {tokens:,}")
        
        # Quota status with traffic light
        status = quota_status.get('status', 'green')
        message = quota_status.get('message', 'Safe')
        max_percent = quota_status.get('max_percent', 0)
        
        status_emoji = {'green': '🟢', 'yellow': '🟡', 'red': '🔴'}.get(status, '⚪')
        self.console.print(f"\nQuota Status: {status_emoji} {status.upper()} ({max_percent:.1f}% of weekly limit)")
        self.console.print(f"  {message}")
        
        # Model breakdown with quotas
        if by_model:
            self.console.print("\nModel Distribution:")
            sonnet_hours = by_model.get('sonnet', {}).get('duration_hours', 0)
            opus_hours = by_model.get('opus', {}).get('duration_hours', 0)
            haiku_hours = by_model.get('haiku', {}).get('duration_hours', 0)
            
            if sonnet_hours > 0:
                sonnet_percent = (sonnet_hours / 432) * 100
                sonnet_status = '✅' if sonnet_percent < 70 else '⚠️' if sonnet_percent < 85 else '🚨'
                self.console.print(f"  Sonnet: {sonnet_hours:.1f}h / 432h ({sonnet_percent:.1f}%) {sonnet_status}")
            
            if opus_hours > 0:
                opus_percent = (opus_hours / 36) * 100
                opus_status = '✅' if opus_percent < 70 else '⚠️' if opus_percent < 85 else '🚨'
                self.console.print(f"  Opus: {opus_hours:.1f}h / 36h ({opus_percent:.1f}%) {opus_status}")
            
            if haiku_hours > 0:
                self.console.print(f"  Haiku: {haiku_hours:.1f}h (unlimited) ✅")
        
        # Top projects
        if by_project:
            self.console.print("\nTop Projects:")
            sorted_projects = sorted(by_project.items(), key=lambda x: x[1]['duration_hours'], reverse=True)
            for i, (project, project_data) in enumerate(sorted_projects[:5]):
                project_duration = project_data.get('duration_hours', 0)
                project_percent = (project_duration / duration * 100) if duration > 0 else 0
                self.console.print(f"  {project}: {project_duration:.1f} hours ({project_percent:.1f}%)")
        
        self.console.print(f"\nEfficiency Score: {efficiency:.1f}/10 {'🌟' if efficiency >= 7 else '⭐' if efficiency >= 4 else '💫'}")
        self.console.print("═" * 67)
    
    def format_sessions_list(self, sessions: List[Dict[str, Any]]) -> None:
        """Format session history list."""
        if not sessions:
            self.console.print("[yellow]No sessions found[/]")
            return
            
        if self.format_type == 'json':
            self.console.print(json.dumps(sessions, indent=2))
            return
        
        # Create table
        table = Table(title="Session History")
        table.add_column("Date", style="cyan")
        table.add_column("Duration", justify="right")
        table.add_column("Model", style="green")
        table.add_column("Tokens", justify="right", style="blue")
        table.add_column("Project", style="magenta")
        
        for session in sessions:
            date = session.get('start_time', '')[:10] if session.get('start_time') else 'Unknown'
            duration = f"{session.get('duration_hours', 0):.1f}h"
            model = session.get('model', 'Unknown').title()
            tokens = f"{session.get('total_tokens', 0):,}"
            project = session.get('project_name', 'Unknown')
            
            table.add_row(date, duration, model, tokens, project)
        
        self.console.print(table)
    
    def format_current_status(self, data: Dict[str, Any]) -> None:
        """Format current session status."""
        if not data:
            self.console.print("[red]No status data available[/]")
            return
            
        if self.format_type == 'json':
            self.console.print(json.dumps(data, indent=2))
            return
        
        if data.get('active_session'):
            # Active session
            duration = data.get('duration_hours', 0)
            model = data.get('model', 'Unknown').title()
            tokens = data.get('tokens_used', 0)
            project = data.get('project_name', 'Unknown')
            
            self.console.print("🟢 [bold green]Active Session[/]")
            self.console.print(f"  Duration: {duration:.1f} hours")
            self.console.print(f"  Model: {model}")
            self.console.print(f"  Tokens: {tokens:,}")
            self.console.print(f"  Project: {project}")
            
            # Time until 5-hour limit
            remaining = max(0, 5.0 - duration)
            if remaining < 1.0:
                self.console.print(f"  ⚠️ [yellow]Time remaining: {remaining:.1f}h (break recommended soon)[/]")
            else:
                self.console.print(f"  Time remaining: {remaining:.1f}h")
        else:
            # No active session
            self.console.print("⚪ [dim]No active session[/]")
            
            last_session = data.get('last_session')
            if last_session:
                self.console.print("\nLast Session:")
                end_time = last_session.get('end_time', '')[:16] if last_session.get('end_time') else 'Unknown'
                model = last_session.get('model', 'Unknown').title()
                tokens = last_session.get('tokens_used', 0)
                
                self.console.print(f"  Ended: {end_time}")
                self.console.print(f"  Model: {model}")
                self.console.print(f"  Tokens: {tokens:,}")
    
    def format_traffic_light_status(self, data: Dict[str, Any]) -> None:
        """Format quota traffic light status."""
        if not data:
            self.console.print("[red]No quota data available[/]")
            return
            
        if self.format_type == 'json':
            self.console.print(json.dumps(data, indent=2))
            return
        
        usage = data.get('usage', {})
        limits = data.get('limits', {})
        percentages = data.get('percentages', {})
        traffic_light = data.get('traffic_light', {})
        
        # Main status
        emoji = traffic_light.get('emoji', '⚪')
        status = traffic_light.get('status', 'unknown').upper()
        message = traffic_light.get('message', 'Status unknown')
        
        panel = Panel(
            f"{emoji} [bold]{status}[/]\n{message}",
            title="Weekly Quota Status",
            border_style=traffic_light.get('status', 'white')
        )
        self.console.print(panel)
        
        # Detailed breakdown
        self.console.print("\nQuota Details:")
        
        for model in ['sonnet', 'opus']:
            if model in usage:
                used = usage[model]
                limit = limits.get(model, 0)
                percent = percentages.get(model, 0)
                
                if limit == float('inf'):
                    self.console.print(f"  {model.title()}: {used:.1f}h (unlimited) ✅")
                else:
                    status_emoji = '✅' if percent < 70 else '⚠️' if percent < 85 else '🚨'
                    self.console.print(f"  {model.title()}: {used:.1f}h / {limit}h ({percent:.1f}%) {status_emoji}")
        
        # Recommendations based on status
        self.console.print("\nRecommendations:")
        if traffic_light.get('status') == 'red':
            self.console.print("  • Switch to Haiku for simple tasks")
            self.console.print("  • Consider shorter sessions")
            self.console.print("  • Plan remaining work carefully")
        elif traffic_light.get('status') == 'yellow':
            self.console.print("  • Prefer Sonnet over Opus when possible")
            self.console.print("  • Monitor usage closely")
            self.console.print("  • Consider project prioritization")
        else:
            self.console.print("  • All models available for optimal results")
            self.console.print("  • Normal usage patterns recommended")
    
    def format_simple_message(self, message: str, style: str = "white") -> None:
        """Format a simple message with optional styling."""
        if self.format_type == 'json':
            self.console.print(json.dumps({"message": message}))
        else:
            self.console.print(f"[{style}]{message}[/]")
    
    def format_error(self, error: str) -> None:
        """Format error message."""
        if self.format_type == 'json':
            self.console.print(json.dumps({"error": error}))
        else:
            self.console.print(f"[red]Error: {error}[/]")

def format_simple_output(data: Any, format_type: str = 'table') -> str:
    """Utility function for simple formatting."""
    if format_type == 'json':
        return json.dumps(data, indent=2, default=str)
    else:
        return str(data)