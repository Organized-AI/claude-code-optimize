# Claude Code Power User Implementation Guide

## 🎯 Overview

This guide provides step-by-step implementation for the Claude Code optimization system. Designed for developers who need maximum productivity within the new weekly rate limits starting August 28, 2025.

## 📋 Prerequisites

### System Requirements
- Python 3.10+
- Node.js (for Claude Code CLI)
- Git
- Google account (for calendar integration)

### Claude Code Setup
```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Install Python SDK
pip install claude-code-sdk

# Verify installation
claude-code --version
```

### Plan Identification
Determine your current plan for proper limit configuration:

| Plan | Monthly Cost | Sonnet 4 Weekly | Opus 4 Weekly |
|------|--------------|-----------------|---------------|
| Pro | $20 | 40-80 hours | 0 hours |
| Max | $100 | 140-280 hours | 15-35 hours |
| Max | $200 | 240-480 hours | 24-40 hours |

## 🚀 Phase 1: Foundation Setup (Day 1)

### Step 1: Initialize Usage Tracking

```python
# usage_tracker.py
import sqlite3
import json
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class SessionRecord:
    session_id: str
    start_time: datetime
    end_time: Optional[datetime]
    model_used: str
    total_cost_usd: float
    duration_ms: int
    num_turns: int
    session_type: str
    efficiency_score: float

class ClaudeUsageTracker:
    def __init__(self, db_path="claude_usage.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database for usage tracking"""
        conn = sqlite3.connect(self.db_path)
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                total_cost_usd REAL,
                duration_ms INTEGER,
                num_turns INTEGER,
                model_used TEXT,
                session_type TEXT,
                efficiency_score REAL
            );
            
            CREATE TABLE IF NOT EXISTS weekly_usage (
                week_start DATE PRIMARY KEY,
                sonnet_hours REAL DEFAULT 0,
                opus_hours REAL DEFAULT 0,
                total_cost_usd REAL DEFAULT 0,
                efficiency_avg REAL DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS daily_budget (
                date DATE PRIMARY KEY,
                sonnet_allocated REAL,
                opus_allocated REAL,
                sonnet_used REAL DEFAULT 0,
                opus_used REAL DEFAULT 0
            );
        ''')
        conn.commit()
        conn.close()
    
    def log_session(self, session_data: dict):
        """Log completed session to database"""
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            INSERT OR REPLACE INTO sessions 
            (id, start_time, end_time, total_cost_usd, duration_ms, num_turns, 
             model_used, session_type, efficiency_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session_data['id'],
            session_data['start_time'],
            session_data.get('end_time'),
            session_data.get('total_cost_usd', 0),
            session_data.get('duration_ms', 0),
            session_data.get('num_turns', 0),
            session_data.get('model_used', 'unknown'),
            session_data.get('session_type', 'general'),
            session_data.get('efficiency_score', 5.0)
        ))
        conn.commit()
        conn.close()
    
    def get_weekly_usage(self) -> dict:
        """Get current week's usage statistics"""
        conn = sqlite3.connect(self.db_path)
        
        # Get start of current week (Monday)
        today = datetime.now()
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        cursor = conn.execute('''
            SELECT 
                SUM(CASE WHEN model_used LIKE '%sonnet%' THEN duration_ms/3600000.0 ELSE 0 END) as sonnet_hours,
                SUM(CASE WHEN model_used LIKE '%opus%' THEN duration_ms/3600000.0 ELSE 0 END) as opus_hours,
                SUM(total_cost_usd) as total_cost,
                AVG(efficiency_score) as avg_efficiency
            FROM sessions 
            WHERE start_time >= ?
        ''', (week_start,))
        
        result = cursor.fetchone()
        conn.close()
        
        return {
            'sonnet_hours': result[0] or 0,
            'opus_hours': result[1] or 0,
            'total_cost': result[2] or 0,
            'avg_efficiency': result[3] or 5.0,
            'week_start': week_start
        }
```

### Step 2: Create Configuration Manager

```python
# config_manager.py
import json
import os
from dataclasses import dataclass, asdict
from typing import Dict, Optional

@dataclass
class PlanLimits:
    sonnet_hours_weekly: float
    opus_hours_weekly: float
    monthly_cost: float
    plan_name: str

@dataclass
class UserConfig:
    plan_type: str
    limits: PlanLimits
    calendar_integration: bool
    google_calendar_id: Optional[str]
    notification_thresholds: Dict[str, float]
    session_preferences: Dict[str, any]

class ConfigManager:
    def __init__(self, config_path="claude_config.json"):
        self.config_path = config_path
        self.config = self.load_config()
    
    def load_config(self) -> UserConfig:
        """Load configuration from file or create default"""
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as f:
                data = json.load(f)
                return UserConfig(**data)
        else:
            # Create default config
            default_config = UserConfig(
                plan_type="max_200",
                limits=PlanLimits(
                    sonnet_hours_weekly=480,
                    opus_hours_weekly=40,
                    monthly_cost=200,
                    plan_name="Max $200"
                ),
                calendar_integration=False,
                google_calendar_id=None,
                notification_thresholds={
                    "warning": 0.7,  # 70% usage
                    "critical": 0.9  # 90% usage
                },
                session_preferences={
                    "default_session_type": "implementation",
                    "break_intervals": [1.5, 3.0],  # Hours
                    "max_session_duration": 5.0,
                    "preferred_model": "sonnet"
                }
            )
            self.save_config(default_config)
            return default_config
    
    def save_config(self, config: UserConfig):
        """Save configuration to file"""
        with open(self.config_path, 'w') as f:
            json.dump(asdict(config), f, indent=2, default=str)
        self.config = config
    
    def update_plan(self, plan_type: str):
        """Update plan configuration"""
        plan_limits = {
            "pro": PlanLimits(80, 0, 20, "Pro"),
            "max_100": PlanLimits(280, 35, 100, "Max $100"),
            "max_200": PlanLimits(480, 40, 200, "Max $200")
        }
        
        if plan_type in plan_limits:
            self.config.plan_type = plan_type
            self.config.limits = plan_limits[plan_type]
            self.save_config(self.config)
            return True
        return False
```

### Step 3: CLI Interface Setup

```python
# cli.py
import click
import asyncio
from datetime import datetime
from claude_optimizer import ClaudeUsageTracker, ConfigManager

@click.group()
def cli():
    """Claude Code Power User Optimization CLI"""
    pass

@cli.command()
def status():
    """Show current usage status and weekly limits"""
    tracker = ClaudeUsageTracker()
    config = ConfigManager()
    
    usage = tracker.get_weekly_usage()
    limits = config.config.limits
    
    # Calculate percentages
    sonnet_pct = (usage['sonnet_hours'] / limits.sonnet_hours_weekly) * 100
    opus_pct = (usage['opus_hours'] / limits.opus_hours_weekly) * 100 if limits.opus_hours_weekly > 0 else 0
    
    # Status colors
    def get_status_color(percentage):
        if percentage < 60:
            return "green"
        elif percentage < 85:
            return "yellow"
        else:
            return "red"
    
    click.echo(f"\n🤖 Claude Code Usage Status - {config.config.limits.plan_name}")
    click.echo("=" * 50)
    
    # Sonnet usage
    sonnet_color = get_status_color(sonnet_pct)
    click.echo(f"📊 Sonnet 4: {usage['sonnet_hours']:.1f}h / {limits.sonnet_hours_weekly}h ({sonnet_pct:.1f}%)")
    click.echo(f"   Status: {sonnet_color.upper()}")
    
    # Opus usage (if available)
    if limits.opus_hours_weekly > 0:
        opus_color = get_status_color(opus_pct)
        click.echo(f"🧠 Opus 4: {usage['opus_hours']:.1f}h / {limits.opus_hours_weekly}h ({opus_pct:.1f}%)")
        click.echo(f"   Status: {opus_color.upper()}")
    
    # Efficiency
    click.echo(f"⚡ Efficiency: {usage['avg_efficiency']:.1f}/10.0")
    
    # Days until reset
    today = datetime.now()
    days_until_monday = (7 - today.weekday()) % 7
    if days_until_monday == 0:
        days_until_monday = 7
    
    click.echo(f"📅 Reset in: {days_until_monday} days")
    
    # Recommendations
    click.echo("\n💡 Recommendations:")
    if sonnet_pct > 85:
        click.echo("   - ⚠️  Sonnet usage critical - consider Opus for complex tasks")
    if opus_pct > 85:
        click.echo("   - 🚨 Opus usage critical - reserve for emergencies only")
    if usage['avg_efficiency'] < 6:
        click.echo("   - 📈 Low efficiency - review session planning")

@cli.command()
@click.option('--plan', type=click.Choice(['pro', 'max_100', 'max_200']), help='Your Claude Code plan')
def setup(plan):
    """Initial setup and configuration"""
    config = ConfigManager()
    
    if not plan:
        click.echo("Current plans and limits:")
        click.echo("pro: $20/month - 80h Sonnet weekly")
        click.echo("max_100: $100/month - 280h Sonnet, 35h Opus weekly")
        click.echo("max_200: $200/month - 480h Sonnet, 40h Opus weekly")
        plan = click.prompt('Enter your plan', type=click.Choice(['pro', 'max_100', 'max_200']))
    
    if config.update_plan(plan):
        click.echo(f"✅ Configuration updated for {plan}")
        
        # Initialize database
        tracker = ClaudeUsageTracker()
        click.echo("✅ Usage tracking database initialized")
        
        # Calendar integration prompt
        if click.confirm('Setup Google Calendar integration?'):
            calendar_id = click.prompt('Enter your Google Calendar ID (or primary)')
            config.config.calendar_integration = True
            config.config.google_calendar_id = calendar_id
            config.save_config(config.config)
            click.echo("✅ Calendar integration configured")
        
        click.echo("\n🎉 Setup complete! Use 'claude-optimize status' to view usage.")
    else:
        click.echo("❌ Invalid plan specified")

@cli.command()
@click.argument('project_path')
def analyze(project_path):
    """Analyze project complexity and generate plan"""
    click.echo(f"🔍 Analyzing project at: {project_path}")
    
    # This would integrate with the actual Claude Code analysis
    # For now, show example output
    click.echo("\n📊 Project Analysis Results:")
    click.echo("   Complexity Score: 7/10")
    click.echo("   Estimated Sessions: 8")
    click.echo("   Recommended Model Mix: 70% Sonnet, 30% Opus")
    click.echo("   Total Estimated Time: 24 hours")
    
    if click.confirm('Generate calendar blocks?'):
        click.echo("📅 Calendar integration not yet implemented")
        click.echo("   Manual scheduling recommended for now")

if __name__ == '__main__':
    cli()
```

## 📅 Phase 2: Calendar Integration (Day 2-3)

### Step 1: Google Calendar Setup

```python
# calendar_integration.py
import os
import pickle
from datetime import datetime, timedelta
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']

class GoogleCalendarIntegration:
    def __init__(self, credentials_path="credentials.json", token_path="token.pickle"):
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.service = self.authenticate()
    
    def authenticate(self):
        """Authenticate with Google Calendar API"""
        creds = None
        
        # Load existing token
        if os.path.exists(self.token_path):
            with open(self.token_path, 'rb') as token:
                creds = pickle.load(token)
        
        # If no valid credentials, go through OAuth flow
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save credentials for future use
            with open(self.token_path, 'wb') as token:
                pickle.dump(creds, token)
        
        return build('calendar', 'v3', credentials=creds)
    
    def create_coding_block(self, session_plan: dict, calendar_id='primary'):
        """Create calendar event for coding session"""
        
        event = {
            'summary': f'Claude Code - {session_plan["type"]} Session',
            'description': f'''
🤖 Claude Code Session
Model: {session_plan.get("model", "sonnet")}
Duration: {session_plan.get("duration", 4)} hours
Complexity: {session_plan.get("complexity", 5)}/10

Focus Areas:
{chr(10).join(f"• {task}" for task in session_plan.get("tasks", []))}

Break Schedule:
{chr(10).join(f"• {break_time}h" for break_time in session_plan.get("breaks", []))}

Session Type: {session_plan.get("type", "implementation")}
            ''',
            'start': {
                'dateTime': session_plan["start_time"].isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': session_plan["end_time"].isoformat(),
                'timeZone': 'UTC',
            },
            'colorId': self.get_session_color(session_plan.get("type", "implementation")),
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 15},  # 15 min before
                    {'method': 'popup', 'minutes': 5},   # 5 min before
                ],
            },
        }
        
        result = self.service.events().insert(
            calendarId=calendar_id, 
            body=event
        ).execute()
        
        return result.get('htmlLink')
    
    def get_session_color(self, session_type: str) -> str:
        """Get color ID for different session types"""
        colors = {
            "planning": "9",      # Blue
            "implementation": "2", # Green  
            "testing": "5",       # Yellow
            "review": "3",        # Purple
            "debugging": "11",    # Red
            "refactoring": "6"    # Orange
        }
        return colors.get(session_type, "2")  # Default to green
    
    def create_weekly_schedule(self, session_plans: list, calendar_id='primary'):
        """Create full week of coding sessions"""
        
        created_events = []
        
        for plan in session_plans:
            try:
                event_link = self.create_coding_block(plan, calendar_id)
                created_events.append({
                    "session": plan,
                    "calendar_link": event_link
                })
            except Exception as e:
                print(f"Failed to create event for {plan.get('type', 'unknown')}: {e}")
        
        return created_events
```

### Step 2: Automated Session Planning

```python
# session_planner.py
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Dict
import math

@dataclass
class SessionPlan:
    session_type: str
    start_time: datetime
    end_time: datetime
    model: str
    complexity: int
    tasks: List[str]
    breaks: List[float]
    estimated_tokens: int
    success_criteria: List[str]

class IntelligentSessionPlanner:
    def __init__(self, config_manager, usage_tracker):
        self.config = config_manager
        self.tracker = usage_tracker
        
        # Session type templates
        self.session_templates = {
            "planning": {
                "duration": 1.5,
                "model": "opus",
                "complexity_range": (7, 10),
                "break_points": [],
                "focus": "High-level design and architecture"
            },
            "implementation": {
                "duration": 4.0,
                "model": "sonnet", 
                "complexity_range": (4, 7),
                "break_points": [1.5, 3.0],
                "focus": "Core development work"
            },
            "testing": {
                "duration": 2.5,
                "model": "sonnet",
                "complexity_range": (3, 6),
                "break_points": [1.25],
                "focus": "Test creation and validation"
            },
            "review": {
                "duration": 1.0,
                "model": "sonnet",
                "complexity_range": (2, 5),
                "break_points": [],
                "focus": "Code review and documentation"
            },
            "debugging": {
                "duration": 2.0,
                "model": "sonnet",
                "complexity_range": (5, 8),
                "break_points": [1.0],
                "focus": "Issue investigation and resolution"
            },
            "refactoring": {
                "duration": 3.0,
                "model": "opus",
                "complexity_range": (6, 9),
                "break_points": [1.5],
                "focus": "Code restructuring and optimization"
            }
        }
    
    def generate_weekly_plan(self, project_requirements: dict) -> List[SessionPlan]:
        """Generate optimal weekly session plan"""
        
        # Analyze current usage
        current_usage = self.tracker.get_weekly_usage()
        limits = self.config.config.limits
        
        # Calculate available quota
        available_quota = {
            "sonnet": limits.sonnet_hours_weekly - current_usage['sonnet_hours'],
            "opus": limits.opus_hours_weekly - current_usage['opus_hours']
        }
        
        # Generate session sequence based on project needs
        sessions = []
        current_time = datetime.now()
        
        # Always start with planning if quota allows
        if available_quota["opus"] >= 2:
            planning_session = self.create_session_plan(
                session_type="planning",
                start_time=self.get_next_optimal_time(current_time, "planning"),
                project_context=project_requirements
            )
            sessions.append(planning_session)
            available_quota["opus"] -= planning_session.end_time.hour - planning_session.start_time.hour
        
        # Generate implementation sessions
        impl_hours_needed = project_requirements.get("estimated_implementation_hours", 12)
        sessions_needed = math.ceil(impl_hours_needed / 4)  # 4-hour blocks
        
        for i in range(sessions_needed):
            if available_quota["sonnet"] >= 4:
                impl_session = self.create_session_plan(
                    session_type="implementation",
                    start_time=self.get_next_optimal_time(
                        sessions[-1].end_time if sessions else current_time,
                        "implementation"
                    ),
                    project_context=project_requirements,
                    session_number=i + 1
                )
                sessions.append(impl_session)
                available_quota["sonnet"] -= 4
        
        # Add testing sessions
        if available_quota["sonnet"] >= 2.5:
            testing_session = self.create_session_plan(
                session_type="testing",
                start_time=self.get_next_optimal_time(
                    sessions[-1].end_time if sessions else current_time,
                    "testing"
                ),
                project_context=project_requirements
            )
            sessions.append(testing_session)
        
        return sessions
    
    def create_session_plan(self, session_type: str, start_time: datetime, 
                           project_context: dict, session_number: int = 1) -> SessionPlan:
        """Create detailed session plan"""
        
        template = self.session_templates[session_type]
        duration_hours = template["duration"]
        end_time = start_time + timedelta(hours=duration_hours)
        
        # Generate tasks based on session type and project context
        tasks = self.generate_session_tasks(session_type, project_context, session_number)
        
        # Calculate break points in absolute time
        break_times = [
            start_time + timedelta(hours=bp) 
            for bp in template["break_points"]
        ]
        
        return SessionPlan(
            session_type=session_type,
            start_time=start_time,
            end_time=end_time,
            model=template["model"],
            complexity=self.estimate_complexity(session_type, project_context),
            tasks=tasks,
            breaks=template["break_points"],
            estimated_tokens=self.estimate_token_usage(session_type, project_context),
            success_criteria=self.generate_success_criteria(session_type, tasks)
        )
    
    def get_next_optimal_time(self, after_time: datetime, session_type: str) -> datetime:
        """Find next optimal time for session type"""
        
        # Optimal time windows
        optimal_windows = {
            "planning": (9, 11),      # Morning clarity
            "implementation": (10, 16), # Peak focus hours
            "testing": (14, 17),      # Afternoon systematization
            "review": (16, 18),       # End of day reflection
            "debugging": (10, 15),    # Peak problem-solving
            "refactoring": (9, 12)    # Morning architectural thinking
        }
        
        start_hour, end_hour = optimal_windows.get(session_type, (10, 16))
        
        # Find next available slot
        candidate_time = after_time.replace(minute=0, second=0, microsecond=0)
        
        # If too late in the day, move to next day
        if candidate_time.hour >= end_hour:
            candidate_time = candidate_time.replace(hour=start_hour) + timedelta(days=1)
        elif candidate_time.hour < start_hour:
            candidate_time = candidate_time.replace(hour=start_hour)
        
        # Skip weekends for work sessions (optional)
        while candidate_time.weekday() >= 5:  # Saturday = 5, Sunday = 6
            candidate_time += timedelta(days=1)
            candidate_time = candidate_time.replace(hour=start_hour)
        
        return candidate_time
    
    def estimate_token_usage(self, session_type: str, project_context: dict) -> int:
        """Estimate token usage for session"""
        
        base_tokens = {
            "planning": 15000,      # High-context architectural thinking
            "implementation": 8000,  # Moderate context coding
            "testing": 6000,        # Structured test generation
            "review": 4000,         # Focused review tasks
            "debugging": 10000,     # Variable context investigation
            "refactoring": 12000    # Complex codebase analysis
        }
        
        base = base_tokens.get(session_type, 8000)
        
        # Adjust for project complexity
        complexity_multiplier = project_context.get("complexity_score", 5) / 5
        codebase_multiplier = min(project_context.get("codebase_size", 1000) / 1000, 3)
        
        return int(base * complexity_multiplier * codebase_multiplier)
```

## 🎯 Phase 3: Advanced Optimization (Day 4-7)

### Real-time Dashboard

```python
# dashboard.py
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import pandas as pd

class ClaudeCodeDashboard:
    def __init__(self, usage_tracker, config_manager):
        self.tracker = usage_tracker
        self.config = config_manager
    
    def render_dashboard(self):
        st.set_page_config(
            page_title="Claude Code Optimizer",
            page_icon="🤖",
            layout="wide"
        )
        
        st.title("🤖 Claude Code Power User Dashboard")
        st.markdown("*Real-time usage tracking and optimization*")
        
        # Main metrics
        self.render_usage_overview()
        
        # Charts and analysis
        col1, col2 = st.columns(2)
        
        with col1:
            self.render_usage_timeline()
        
        with col2:
            self.render_efficiency_trends()
        
        # Recommendations
        self.render_recommendations()
        
        # Weekly planning
        self.render_weekly_planner()
    
    def render_usage_overview(self):
        """Render main usage metrics"""
        
        usage = self.tracker.get_weekly_usage()
        limits = self.config.config.limits
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            sonnet_pct = (usage['sonnet_hours'] / limits.sonnet_hours_weekly) * 100
            st.metric(
                "Sonnet 4 Usage",
                f"{usage['sonnet_hours']:.1f}h",
                f"{sonnet_pct:.1f}% of weekly limit"
            )
            
            # Progress bar
            st.progress(min(sonnet_pct / 100, 1.0))
        
        with col2:
            if limits.opus_hours_weekly > 0:
                opus_pct = (usage['opus_hours'] / limits.opus_hours_weekly) * 100
                st.metric(
                    "Opus 4 Usage", 
                    f"{usage['opus_hours']:.1f}h",
                    f"{opus_pct:.1f}% of weekly limit"
                )
                st.progress(min(opus_pct / 100, 1.0))
            else:
                st.metric("Opus 4 Usage", "N/A", "Not available on current plan")
        
        with col3:
            st.metric(
                "Efficiency Score",
                f"{usage['avg_efficiency']:.1f}/10",
                "Average session efficiency"
            )
        
        with col4:
            # Calculate days until reset
            today = datetime.now()
            days_until_reset = (7 - today.weekday()) % 7
            if days_until_reset == 0:
                days_until_reset = 7
            
            st.metric(
                "Reset In",
                f"{days_until_reset} days",
                "Until weekly limits reset"
            )
    
    def render_recommendations(self):
        """Render AI-powered recommendations"""
        
        st.subheader("💡 Optimization Recommendations")
        
        usage = self.tracker.get_weekly_usage()
        limits = self.config.config.limits
        
        recommendations = []
        
        # Usage-based recommendations
        sonnet_pct = (usage['sonnet_hours'] / limits.sonnet_hours_weekly) * 100
        if sonnet_pct > 85:
            recommendations.append({
                "type": "warning",
                "title": "Sonnet Usage Critical",
                "message": "Consider switching to Opus for complex tasks to preserve Sonnet quota"
            })
        
        if limits.opus_hours_weekly > 0:
            opus_pct = (usage['opus_hours'] / limits.opus_hours_weekly) * 100
            if opus_pct > 85:
                recommendations.append({
                    "type": "error",
                    "title": "Opus Usage Critical", 
                    "message": "Reserve remaining Opus quota for emergency architecture decisions only"
                })
        
        # Efficiency recommendations
        if usage['avg_efficiency'] < 6:
            recommendations.append({
                "type": "info",
                "title": "Efficiency Below Optimal",
                "message": "Review session planning and context optimization strategies"
            })
        
        # Display recommendations
        for rec in recommendations:
            if rec["type"] == "error":
                st.error(f"🚨 {rec['title']}: {rec['message']}")
            elif rec["type"] == "warning":
                st.warning(f"⚠️ {rec['title']}: {rec['message']}")
            else:
                st.info(f"💡 {rec['title']}: {rec['message']}")
        
        if not recommendations:
            st.success("✅ All systems optimal! Usage is within recommended parameters.")

def main():
    """Main dashboard entry point"""
    from claude_optimizer import ClaudeUsageTracker, ConfigManager
    
    tracker = ClaudeUsageTracker()
    config = ConfigManager()
    dashboard = ClaudeCodeDashboard(tracker, config)
    
    dashboard.render_dashboard()

if __name__ == "__main__":
    main()
```

## 🎯 Success Metrics

### Week 1 Targets
- [ ] Setup completion time: < 30 minutes
- [ ] First optimized session with tracking
- [ ] Usage visibility dashboard operational
- [ ] Calendar integration configured

### Week 2 Targets  
- [ ] 80%+ planning accuracy on time estimates
- [ ] 15%+ token usage reduction through optimization
- [ ] Real-time quota monitoring active
- [ ] Emergency procedures tested

### Month 1 Targets
- [ ] 90%+ weekly quota utilization efficiency
- [ ] 25%+ productivity gain vs unoptimized usage
- [ ] Sustainable development velocity established
- [ ] Team coordination patterns (if applicable)

## 🚨 Troubleshooting

### Common Issues

**Issue**: "Can't connect to Claude Code CLI"
**Solution**: 
```bash
# Verify installation
npm list -g @anthropic-ai/claude-code

# Reinstall if needed
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code
```

**Issue**: "Usage tracking not working"
**Solution**:
```python
# Reset database
import os
if os.path.exists("claude_usage.db"):
    os.remove("claude_usage.db")

# Reinitialize
from claude_optimizer import ClaudeUsageTracker
tracker = ClaudeUsageTracker()
```

**Issue**: "Calendar integration fails"
**Solution**:
1. Verify Google Calendar API is enabled
2. Check credentials.json file exists
3. Delete token.pickle and re-authenticate

### Getting Help

- Review [CLAUDE.md](../CLAUDE.md) for comprehensive system overview
- Check [Community Insights](community_insights_solutions.md) for user-reported issues
- Join discussions at GitHub Issues

---

**Ready to transform your Claude Code usage? Start with the setup script and begin your optimization journey today.**
