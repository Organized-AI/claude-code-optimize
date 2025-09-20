# Claude Code SDK Technical Implementation Guide

## Overview

Based on comprehensive analysis of the [Claude Code Python SDK](https://github.com/anthropics/claude-code-sdk-python) and official documentation, this guide provides a complete technical implementation for power users facing the new weekly rate limits starting August 28, 2025.

## Core SDK Architecture

### Installation & Prerequisites

```bash
# Install Claude Code SDK
pip install claude-code-sdk

# Prerequisites
# - Python 3.10+
# - Node.js
# - Claude Code CLI: npm install -g @anthropic-ai/claude-code
```

### Key Components

```python
from claude_code_sdk import (
    query,                    # One-shot queries
    ClaudeSDKClient,         # Interactive sessions
    ClaudeCodeOptions,       # Configuration
    AssistantMessage,        # Response types
    ResultMessage,           # Cost/usage tracking
    TextBlock,               # Content blocks
)
```

## Power User Implementation Patterns

### 1. Session Management for Weekly Limits

```python
import asyncio
import json
import sqlite3
from datetime import datetime, timedelta
from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions

class PowerUserSessionManager:
    def __init__(self, db_path="claude_usage.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize usage tracking database"""
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                total_cost_usd REAL,
                duration_ms INTEGER,
                num_turns INTEGER,
                model_used TEXT,
                session_type TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS weekly_usage (
                week_start DATE PRIMARY KEY,
                sonnet_hours REAL DEFAULT 0,
                opus_hours REAL DEFAULT 0,
                total_cost_usd REAL DEFAULT 0
            )
        ''')
        conn.commit()
        conn.close()
    
    async def create_optimized_session(self, 
                                     task_type: str,
                                     estimated_duration: int = None,
                                     preferred_model: str = "sonnet"):
        """Create session with usage optimization"""
        
        # Check weekly limits first
        usage = self.get_weekly_usage()
        
        # Max weekly limits based on plan
        limits = {
            "pro": {"sonnet": 80, "opus": 0},      # $20 plan
            "max_100": {"sonnet": 280, "opus": 35}, # $100 plan  
            "max_200": {"sonnet": 480, "opus": 40}  # $200 plan
        }
        
        current_plan = self.detect_plan()
        if usage[f"{preferred_model}_hours"] >= limits[current_plan][preferred_model]:
            raise Exception(f"Weekly {preferred_model} limit reached")
        
        # Configure session based on task type
        options = self.get_optimized_options(task_type, preferred_model)
        
        return ClaudeSDKClient(options=options)
    
    def get_optimized_options(self, task_type: str, model: str) -> ClaudeCodeOptions:
        """Get optimized configuration based on task type"""
        
        base_options = {
            "max_thinking_tokens": 8000,
            "model": f"claude-{model}-4-20250514"
        }
        
        # Task-specific optimizations
        if task_type == "planning":
            base_options.update({
                "max_turns": 3,
                "system_prompt": "You are an expert software architect. Provide concise, actionable plans.",
                "allowed_tools": ["Read", "View"]
            })
        elif task_type == "coding":
            base_options.update({
                "max_turns": 10,
                "allowed_tools": ["Read", "Write", "Bash", "View"],
                "permission_mode": "acceptEdits"
            })
        elif task_type == "testing":
            base_options.update({
                "max_turns": 5,
                "allowed_tools": ["Read", "Write", "Bash"],
                "system_prompt": "Focus on comprehensive testing and validation."
            })
        
        return ClaudeCodeOptions(**base_options)
```

### 2. Usage Tracking and Cost Optimization

```python
class UsageTracker:
    def __init__(self, session_manager):
        self.session_manager = session_manager
    
    async def track_session(self, client: ClaudeSDKClient, 
                           session_id: str, task_type: str):
        """Track session usage in real-time"""
        
        start_time = datetime.now()
        total_cost = 0.0
        
        try:
            # Monitor session
            async for message in client.receive_messages():
                if isinstance(message, ResultMessage):
                    # Extract usage data
                    session_data = {
                        "id": session_id,
                        "start_time": start_time,
                        "end_time": datetime.now(),
                        "total_cost_usd": message.total_cost_usd or 0,
                        "duration_ms": message.duration_ms,
                        "num_turns": message.num_turns,
                        "model_used": self.extract_model_from_session(message),
                        "session_type": task_type
                    }
                    
                    # Save to database
                    self.save_session_data(session_data)
                    
                    # Update weekly totals
                    self.update_weekly_usage(session_data)
                    
                    return session_data
                    
        except Exception as e:
            print(f"Session tracking error: {e}")
            return None
    
    def get_efficiency_score(self, session_data: dict) -> float:
        """Calculate efficiency score (output quality vs cost)"""
        
        # Basic efficiency calculation
        if session_data["total_cost_usd"] == 0:
            return 100.0
        
        # Factor in turns vs duration vs cost
        efficiency = (
            session_data["num_turns"] * 1000 /  # More turns = more work
            (session_data["duration_ms"] / 1000) /  # Less time = more efficient
            session_data["total_cost_usd"]  # Lower cost = more efficient
        )
        
        return min(efficiency * 10, 100.0)  # Cap at 100
    
    def get_weekly_recommendations(self) -> dict:
        """Provide optimization recommendations"""
        
        usage = self.session_manager.get_weekly_usage()
        
        recommendations = {
            "model_optimization": [],
            "time_management": [],
            "cost_efficiency": []
        }
        
        # Analyze usage patterns
        if usage["opus_hours"] > usage["sonnet_hours"] * 0.5:
            recommendations["model_optimization"].append(
                "Consider using Sonnet 4 for routine tasks to preserve Opus 4 quota"
            )
        
        if usage["sonnet_hours"] > 200:  # High usage
            recommendations["time_management"].append(
                "Schedule focused 2-hour blocks instead of many short sessions"
            )
        
        return recommendations
```

### 3. Calendar Integration for Automated Scheduling

```python
import calendar
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

class ClaudeCodeScheduler:
    def __init__(self, calendar_service):
        self.calendar_service = calendar_service
        self.session_manager = PowerUserSessionManager()
    
    async def analyze_codebase_and_schedule(self, project_path: str, 
                                          deadline: datetime = None):
        """Analyze codebase complexity and create optimized schedule"""
        
        # Use Claude to analyze project complexity
        options = ClaudeCodeOptions(
            allowed_tools=["Read", "View", "GlobTool"],
            max_turns=3,
            system_prompt="Analyze this codebase and estimate effort required for development tasks."
        )
        
        async with ClaudeSDKClient(options=options) as client:
            await client.query(f"""
            Analyze the codebase at {project_path} and provide:
            1. Complexity assessment (1-10 scale)
            2. Estimated time blocks needed for:
               - Planning and architecture (hours)
               - Implementation (hours) 
               - Testing and debugging (hours)
               - Documentation and review (hours)
            3. Recommended model usage (Sonnet vs Opus for each phase)
            4. Suggested session structure
            
            Format as JSON for programmatic parsing.
            """)
            
            analysis = None
            async for message in client.receive_response():
                if isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            # Parse JSON response
                            analysis = self.parse_analysis(block.text)
                            break
        
        if analysis:
            return self.create_calendar_blocks(analysis, deadline)
        
        return None
    
    def create_calendar_blocks(self, analysis: dict, deadline: datetime):
        """Create calendar events based on analysis"""
        
        blocks = []
        current_time = datetime.now()
        
        # Planning phase
        planning_duration = analysis.get("planning_hours", 2)
        planning_event = {
            'summary': f'Claude Code Planning - {analysis["project_name"]}',
            'start': {
                'dateTime': current_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': (current_time + timedelta(hours=planning_duration)).isoformat(),
                'timeZone': 'UTC',
            },
            'description': f"""
            Task: Project planning and architecture
            Model: {analysis.get("planning_model", "claude-sonnet-4")}
            Estimated duration: {planning_duration} hours
            Session type: planning
            """
        }
        blocks.append(planning_event)
        
        # Implementation phases
        impl_hours = analysis.get("implementation_hours", 8)
        block_size = 2  # 2-hour focused blocks
        
        for i in range(0, impl_hours, block_size):
            start_time = current_time + timedelta(days=1 + i//8, hours=(i%8))
            duration = min(block_size, impl_hours - i)
            
            impl_event = {
                'summary': f'Claude Code Implementation Block {i//block_size + 1}',
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': (start_time + timedelta(hours=duration)).isoformat(),
                    'timeZone': 'UTC',
                },
                'description': f"""
                Task: Implementation block {i//block_size + 1}
                Model: {analysis.get("implementation_model", "claude-sonnet-4")}
                Duration: {duration} hours
                Session type: coding
                """
            }
            blocks.append(impl_event)
        
        # Create events in calendar
        for block in blocks:
            event = self.calendar_service.events().insert(
                calendarId='primary', 
                body=block
            ).execute()
            print(f'Event created: {event.get("htmlLink")}')
        
        return blocks
```

### 4. Advanced MCP Integration

```python
# Custom MCP server for project analysis
class ProjectAnalysisMCP:
    def __init__(self):
        self.mcp_config = {
            "mcpServers": {
                "project_analyzer": {
                    "command": "node",
                    "args": ["./mcp_servers/project_analyzer.js"],
                    "env": {
                        "ANALYSIS_MODE": "comprehensive"
                    }
                },
                "calendar_integration": {
                    "command": "python",
                    "args": ["./mcp_servers/calendar_server.py"]
                }
            }
        }
    
    def get_options_with_mcp(self) -> ClaudeCodeOptions:
        """Configure Claude Code with custom MCP servers"""
        
        return ClaudeCodeOptions(
            mcp_servers=self.mcp_config["mcpServers"],
            allowed_tools=[
                "Read", "Write", "Bash", "View",
                "mcp__project_analyzer__analyze_complexity",
                "mcp__project_analyzer__estimate_effort",
                "mcp__calendar_integration__create_blocks"
            ],
            permission_mode="acceptEdits"
        )
```

## Rate Limit Management Strategies

### Weekly Limit Thresholds (Starting August 28, 2025)

Based on TechCrunch reporting and community feedback:

- **Pro ($20/month)**: 40-80 hours Sonnet 4 weekly
- **Max ($100/month)**: 140-280 hours Sonnet 4, 15-35 hours Opus 4 weekly  
- **Max ($200/month)**: 240-480 hours Sonnet 4, 24-40 hours Opus 4 weekly

### Smart Usage Patterns

```python
class RateLimitManager:
    def __init__(self):
        self.usage_patterns = {
            "morning_peak": {"multiplier": 1.2, "recommended": False},
            "afternoon_optimal": {"multiplier": 1.0, "recommended": True},
            "evening_efficient": {"multiplier": 0.8, "recommended": True},
            "overnight_batch": {"multiplier": 0.6, "recommended": True}
        }
    
    def get_optimal_session_time(self, estimated_duration: int) -> datetime:
        """Recommend optimal time based on usage patterns"""
        
        now = datetime.now()
        
        # Prefer off-peak hours for long sessions
        if estimated_duration > 3:
            # Schedule for evening or overnight
            optimal_start = now.replace(hour=20, minute=0, second=0)
            if optimal_start < now:
                optimal_start += timedelta(days=1)
            return optimal_start
        
        # Regular sessions can run during optimal hours
        optimal_start = now.replace(hour=14, minute=0, second=0)
        if optimal_start < now:
            optimal_start += timedelta(days=1)
        
        return optimal_start
    
    def should_use_opus(self, task_complexity: int, remaining_opus_hours: float) -> bool:
        """Decide whether to use Opus based on complexity and remaining quota"""
        
        # Reserve Opus for high-complexity tasks
        if task_complexity >= 8 and remaining_opus_hours > 5:
            return True
        
        # Use Opus sparingly for complex refactoring
        if task_complexity >= 6 and remaining_opus_hours > 10:
            return True
        
        return False
```

## Error Handling and Resilience

```python
from claude_code_sdk import (
    ClaudeSDKError, CLINotFoundError, 
    CLIConnectionError, ProcessError, CLIJSONDecodeError
)

class ResilientClaudeSession:
    def __init__(self, max_retries: int = 3):
        self.max_retries = max_retries
    
    async def execute_with_retry(self, task_func, *args, **kwargs):
        """Execute Claude task with automatic retry and fallback"""
        
        for attempt in range(self.max_retries):
            try:
                return await task_func(*args, **kwargs)
                
            except CLIConnectionError:
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                raise
                
            except ProcessError as e:
                if e.exit_code == 429:  # Rate limited
                    print("Rate limit hit, scheduling for later...")
                    return self.schedule_for_later(task_func, *args, **kwargs)
                raise
                
            except CLIJSONDecodeError:
                # Try with simpler output format
                if 'options' in kwargs:
                    kwargs['options'].max_turns = 1
                continue
                
        raise Exception("Max retries exceeded")
```

## Best Practices Summary

1. **Session Planning**: Always estimate token usage before starting
2. **Model Selection**: Use Sonnet 4 for routine tasks, reserve Opus 4 for complex problems
3. **Time Boxing**: Implement 2-hour focused blocks with breaks
4. **Usage Tracking**: Monitor weekly consumption in real-time
5. **Fallback Strategies**: Have alternative approaches for rate-limited scenarios
6. **MCP Integration**: Leverage external tools for enhanced capabilities
7. **Calendar Integration**: Automate scheduling based on project analysis

## Community Insights

Based on Hacker News discussions and user feedback:

- **5% of users** will be affected by weekly limits (per Anthropic)
- Users report **$120/day** in API equivalent usage on $200 subscriptions
- **Context optimization** is crucial for token efficiency
- **Batch processing** during off-peak hours recommended
- **Session chaining** using `--resume` and `--continue` reduces context loading

This implementation provides a robust foundation for power users to maximize their Claude Code efficiency while staying within the new weekly rate limits.