# Week 2: Advanced Features - Implementation Plan

## 🚀 **Week 2 Objectives**
Implement advanced Claude Code optimization features including Eric's Project Index system, validation workflows, comprehensive session tracking, and calendar automation.

## 📅 **Daily Implementation Schedule**

### **Day 8-10: Core Systems Implementation**

#### **Eric's Project Index System**
```python
# project_index_system.py
"""
Eric's Project Index System - Advanced project understanding and context
"""

import json
import ast
import os
from pathlib import Path
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
import hashlib

@dataclass
class FunctionSignature:
    name: str
    args: List[str]
    return_type: Optional[str]
    docstring: Optional[str]
    complexity: int
    dependencies: List[str]

@dataclass
class FileAnalysis:
    path: str
    type: str
    functions: List[FunctionSignature]
    imports: List[str]
    exports: List[str]
    lines_of_code: int
    complexity_score: int
    last_modified: float
    git_hash: Optional[str]

@dataclass
class ProjectIndex:
    project_name: str
    root_path: str
    files: List[FileAnalysis]
    dependency_graph: Dict[str, List[str]]
    entry_points: List[str]
    test_coverage: Dict[str, float]
    build_commands: List[str]
    deployment_config: Dict[str, str]
    created_at: str
    last_updated: str

class ProjectIndexer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.ignore_patterns = {'.git', '__pycache__', 'node_modules', '.next', 'dist', 'build'}
    
    def create_comprehensive_index(self) -> ProjectIndex:
        """Create a comprehensive project index"""
        print("🔍 Analyzing project structure...")
        
        files = self._analyze_all_files()
        dependency_graph = self._build_dependency_graph(files)
        entry_points = self._identify_entry_points(files)
        test_coverage = self._calculate_test_coverage(files)
        build_commands = self._extract_build_commands()
        deployment_config = self._extract_deployment_config()
        
        return ProjectIndex(
            project_name=self.project_root.name,
            root_path=str(self.project_root),
            files=files,
            dependency_graph=dependency_graph,
            entry_points=entry_points,
            test_coverage=test_coverage,
            build_commands=build_commands,
            deployment_config=deployment_config,
            created_at=datetime.now().isoformat(),
            last_updated=datetime.now().isoformat()
        )
    
    def _analyze_python_file(self, file_path: Path) -> FileAnalysis:
        """Analyze Python file for functions, imports, complexity"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            functions = []
            imports = []
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    functions.append(self._extract_function_signature(node))
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    imports.extend(self._extract_imports(node))
            
            return FileAnalysis(
                path=str(file_path.relative_to(self.project_root)),
                type="python",
                functions=functions,
                imports=imports,
                exports=self._extract_exports(tree),
                lines_of_code=len(content.splitlines()),
                complexity_score=self._calculate_complexity(tree),
                last_modified=file_path.stat().st_mtime,
                git_hash=self._get_git_hash(file_path)
            )
        except Exception as e:
            print(f"⚠️ Error analyzing {file_path}: {e}")
            return None
    
    def save_index(self, index: ProjectIndex, output_path: str = ".claude-project-index.json"):
        """Save project index to JSON file"""
        with open(self.project_root / output_path, 'w') as f:
            json.dump(asdict(index), f, indent=2, default=str)
        print(f"💾 Project index saved to {output_path}")

# CLI Usage
if __name__ == "__main__":
    import sys
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    indexer = ProjectIndexer(project_path)
    index = indexer.create_comprehensive_index()
    indexer.save_index(index)
    
    print(f"✅ Project index complete for {index.project_name}")
    print(f"📁 {len(index.files)} files analyzed")
    print(f"🔗 {len(index.dependency_graph)} dependencies mapped")
```

#### **Blind Validation Subagent Workflows**
```python
# validation_agents.py
"""
Blind Validation Subagent System - Quality assurance without bias
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import subprocess
import json
import tempfile
import os

class ValidationAgent(ABC):
    """Base class for validation agents"""
    
    @abstractmethod
    def validate(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Perform validation and return results"""
        pass

class SyntaxValidationAgent(ValidationAgent):
    """Validates code syntax without seeing original context"""
    
    def validate(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        file_ext = context.get('file_extension', '.py')
        
        with tempfile.NamedTemporaryFile(mode='w', suffix=file_ext, delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            if file_ext == '.py':
                result = subprocess.run(['python', '-m', 'py_compile', temp_file], 
                                      capture_output=True, text=True)
                return {
                    'agent': 'syntax',
                    'valid': result.returncode == 0,
                    'errors': result.stderr if result.returncode != 0 else None,
                    'warnings': []
                }
            elif file_ext in ['.js', '.ts']:
                # Use Node.js syntax check
                result = subprocess.run(['node', '--check', temp_file], 
                                      capture_output=True, text=True)
                return {
                    'agent': 'syntax',
                    'valid': result.returncode == 0,
                    'errors': result.stderr if result.returncode != 0 else None,
                    'warnings': []
                }
        finally:
            os.unlink(temp_file)

class SecurityValidationAgent(ValidationAgent):
    """Validates code for security issues"""
    
    def validate(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        security_issues = []
        
        # Check for common security anti-patterns
        dangerous_patterns = [
            ('eval(', 'Use of eval() can be dangerous'),
            ('exec(', 'Use of exec() can be dangerous'),
            ('subprocess.shell=True', 'Shell=True in subprocess can be risky'),
            ('sql =', 'Potential SQL injection risk'),
            ('password', 'Hardcoded password detected'),
            ('api_key', 'Hardcoded API key detected'),
        ]
        
        for pattern, message in dangerous_patterns:
            if pattern in code.lower():
                security_issues.append({
                    'pattern': pattern,
                    'message': message,
                    'severity': 'high' if pattern in ['eval(', 'exec('] else 'medium'
                })
        
        return {
            'agent': 'security',
            'valid': len(security_issues) == 0,
            'issues': security_issues,
            'score': max(0, 100 - len(security_issues) * 10)
        }

class PerformanceValidationAgent(ValidationAgent):
    """Validates code for performance issues"""
    
    def validate(self, code: str, context: Dict[str, Any]) -> Dict[str, Any]:
        performance_issues = []
        
        # Check for performance anti-patterns
        perf_patterns = [
            ('for.*in.*range.*len', 'Use enumerate() instead of range(len())'),
            (r'\+\=.*str', 'String concatenation in loop is inefficient'),
            ('\.append.*for.*in', 'Consider list comprehension'),
            ('time.sleep', 'Synchronous sleep may block execution'),
        ]
        
        import re
        for pattern, message in perf_patterns:
            if re.search(pattern, code):
                performance_issues.append({
                    'pattern': pattern,
                    'message': message,
                    'severity': 'medium'
                })
        
        return {
            'agent': 'performance',
            'valid': len(performance_issues) == 0,
            'issues': performance_issues,
            'score': max(0, 100 - len(performance_issues) * 15)
        }

class BlindValidationOrchestrator:
    """Orchestrates multiple validation agents without sharing context"""
    
    def __init__(self):
        self.agents = [
            SyntaxValidationAgent(),
            SecurityValidationAgent(),
            PerformanceValidationAgent(),
        ]
    
    def validate_code(self, code: str, file_path: str) -> Dict[str, Any]:
        """Run all validation agents on code"""
        context = {
            'file_extension': os.path.splitext(file_path)[1],
            'file_size': len(code),
            'line_count': len(code.splitlines())
        }
        
        results = []
        overall_valid = True
        
        for agent in self.agents:
            try:
                result = agent.validate(code, context)
                results.append(result)
                if not result.get('valid', True):
                    overall_valid = False
            except Exception as e:
                results.append({
                    'agent': agent.__class__.__name__,
                    'valid': False,
                    'error': str(e)
                })
                overall_valid = False
        
        return {
            'overall_valid': overall_valid,
            'validation_results': results,
            'summary': self._generate_summary(results)
        }
    
    def _generate_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate validation summary"""
        total_agents = len(results)
        passed_agents = sum(1 for r in results if r.get('valid', False))
        
        return {
            'pass_rate': passed_agents / total_agents,
            'total_issues': sum(len(r.get('issues', [])) for r in results),
            'average_score': sum(r.get('score', 0) for r in results if 'score' in r) / total_agents
        }

# Usage example
def validate_project_files(project_root: str):
    """Validate all code files in project"""
    orchestrator = BlindValidationOrchestrator()
    results = {}
    
    for root, dirs, files in os.walk(project_root):
        for file in files:
            if file.endswith(('.py', '.js', '.ts')):
                file_path = os.path.join(root, file)
                with open(file_path, 'r') as f:
                    code = f.read()
                
                validation_result = orchestrator.validate_code(code, file_path)
                results[file_path] = validation_result
    
    return results
```

### **Day 11-12: Calendar Automation**

#### **Google Calendar Integration**
```python
# calendar_automation.py
"""
Google Calendar Integration for Claude Code Sessions
"""

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import pickle
import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import json

class CalendarManager:
    """Manages Google Calendar integration for coding sessions"""
    
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self, credentials_path: str = 'credentials.json'):
        self.credentials_path = credentials_path
        self.service = self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Google Calendar API"""
        creds = None
        
        if os.path.exists('token.pickle'):
            with open('token.pickle', 'rb') as token:
                creds = pickle.load(token)
        
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, self.SCOPES)
                creds = flow.run_local_server(port=0)
            
            with open('token.pickle', 'wb') as token:
                pickle.dump(creds, token)
        
        return build('calendar', 'v3', credentials=creds)
    
    def create_coding_block(self, 
                           title: str,
                           start_time: datetime,
                           duration: timedelta,
                           description: str,
                           project: str,
                           block_type: str) -> str:
        """Create a coding block event in calendar"""
        
        end_time = start_time + duration
        
        event = {
            'summary': f'🧑‍💻 {title}',
            'description': f"""
Project: {project}
Block Type: {block_type}
Description: {description}

--- Claude Code Session ---
Auto-generated by Claude Code Optimizer
            """.strip(),
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/New_York',  # Adjust as needed
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'America/New_York',
            },
            'extendedProperties': {
                'private': {
                    'claude_code': 'true',
                    'project': project,
                    'block_type': block_type,
                    'created_by': 'claude_code_optimizer'
                }
            },
            'colorId': self._get_color_id(block_type)
        }
        
        result = self.service.events().insert(calendarId='primary', body=event).execute()
        return result.get('id')
    
    def _get_color_id(self, block_type: str) -> str:
        """Get color ID based on block type"""
        color_mapping = {
            'planning': '1',    # Lavender
            'coding': '10',     # Green
            'testing': '11',    # Red
            'documentation': '5', # Yellow
            'review': '6',      # Orange
            'debugging': '4'    # Pink
        }
        return color_mapping.get(block_type, '1')
    
    def find_free_slots(self, 
                       duration: timedelta,
                       start_date: datetime,
                       end_date: datetime,
                       working_hours: tuple = (9, 17)) -> List[datetime]:
        """Find available time slots for coding sessions"""
        
        # Get existing events
        events_result = self.service.events().list(
            calendarId='primary',
            timeMin=start_date.isoformat() + 'Z',
            timeMax=end_date.isoformat() + 'Z',
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        # Convert events to busy periods
        busy_periods = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            
            if 'T' in start:  # DateTime event
                busy_periods.append((
                    datetime.fromisoformat(start.replace('Z', '+00:00')),
                    datetime.fromisoformat(end.replace('Z', '+00:00'))
                ))
        
        # Find free slots
        free_slots = []
        current_time = start_date
        
        while current_time < end_date:
            # Check if within working hours
            if working_hours[0] <= current_time.hour < working_hours[1]:
                slot_end = current_time + duration
                
                # Check if slot is free
                is_free = True
                for busy_start, busy_end in busy_periods:
                    if (current_time < busy_end and slot_end > busy_start):
                        is_free = False
                        break
                
                if is_free and slot_end.hour <= working_hours[1]:
                    free_slots.append(current_time)
            
            current_time += timedelta(minutes=30)  # Check every 30 minutes
        
        return free_slots[:10]  # Return first 10 available slots

class AutoScheduler:
    """Automatically schedules coding sessions based on project needs"""
    
    def __init__(self, calendar_manager: CalendarManager):
        self.calendar = calendar_manager
        self.project_index = None
    
    def load_project_index(self, index_path: str):
        """Load project index for intelligent scheduling"""
        with open(index_path, 'r') as f:
            self.project_index = json.load(f)
    
    def schedule_project_work(self, 
                             project_path: str,
                             deadline: datetime,
                             total_hours: int) -> List[str]:
        """Automatically schedule work for a project"""
        
        if not self.project_index:
            self.load_project_index(f"{project_path}/.claude-project-index.json")
        
        # Analyze project complexity
        complexity_score = self._calculate_project_complexity()
        
        # Generate recommended schedule
        schedule = self._generate_schedule(complexity_score, total_hours, deadline)
        
        # Create calendar events
        event_ids = []
        for session in schedule:
            event_id = self.calendar.create_coding_block(
                title=session['title'],
                start_time=session['start_time'],
                duration=session['duration'],
                description=session['description'],
                project=self.project_index['project_name'],
                block_type=session['type']
            )
            event_ids.append(event_id)
        
        return event_ids
    
    def _calculate_project_complexity(self) -> float:
        """Calculate project complexity score"""
        if not self.project_index:
            return 1.0
        
        factors = {
            'file_count': len(self.project_index['files']) * 0.1,
            'dependency_complexity': len(self.project_index['dependency_graph']) * 0.2,
            'avg_file_complexity': sum(f['complexity_score'] for f in self.project_index['files']) / len(self.project_index['files']) * 0.3,
            'lines_of_code': sum(f['lines_of_code'] for f in self.project_index['files']) * 0.001
        }
        
        return min(10.0, sum(factors.values()))
    
    def _generate_schedule(self, 
                          complexity: float,
                          total_hours: int,
                          deadline: datetime) -> List[Dict[str, Any]]:
        """Generate optimal work schedule"""
        
        # Calculate session distribution based on complexity
        sessions = []
        
        if complexity < 3.0:
            # Simple project - longer coding sessions
            session_pattern = [
                {'type': 'planning', 'ratio': 0.1, 'duration': 1},
                {'type': 'coding', 'ratio': 0.7, 'duration': 3},
                {'type': 'testing', 'ratio': 0.15, 'duration': 2},
                {'type': 'documentation', 'ratio': 0.05, 'duration': 1}
            ]
        else:
            # Complex project - more planning and testing
            session_pattern = [
                {'type': 'planning', 'ratio': 0.2, 'duration': 2},
                {'type': 'coding', 'ratio': 0.5, 'duration': 2},
                {'type': 'testing', 'ratio': 0.2, 'duration': 2},
                {'type': 'review', 'ratio': 0.1, 'duration': 1}
            ]
        
        # Schedule sessions
        current_date = datetime.now()
        days_available = (deadline - current_date).days
        
        for pattern in session_pattern:
            session_hours = total_hours * pattern['ratio']
            session_count = int(session_hours / pattern['duration'])
            
            for i in range(session_count):
                # Find optimal time slot
                free_slots = self.calendar.find_free_slots(
                    duration=timedelta(hours=pattern['duration']),
                    start_date=current_date,
                    end_date=deadline
                )
                
                if free_slots:
                    sessions.append({
                        'title': f"{pattern['type'].title()} Session",
                        'type': pattern['type'],
                        'start_time': free_slots[i % len(free_slots)],
                        'duration': timedelta(hours=pattern['duration']),
                        'description': f"Automated {pattern['type']} session for {self.project_index.get('project_name', 'project')}"
                    })
        
        return sessions

# Usage example
def setup_project_automation(project_path: str, deadline: str, total_hours: int):
    """Set up automatic scheduling for a project"""
    
    # Initialize calendar manager
    calendar_manager = CalendarManager()
    scheduler = AutoScheduler(calendar_manager)
    
    # Schedule project work
    deadline_dt = datetime.fromisoformat(deadline)
    event_ids = scheduler.schedule_project_work(project_path, deadline_dt, total_hours)
    
    print(f"✅ Scheduled {len(event_ids)} sessions for project")
    return event_ids

# CLI Usage
if __name__ == "__main__":
    import sys
    if len(sys.argv) != 4:
        print("Usage: python calendar_automation.py <project_path> <deadline> <total_hours>")
        sys.exit(1)
    
    project_path, deadline, total_hours = sys.argv[1], sys.argv[2], int(sys.argv[3])
    setup_project_automation(project_path, deadline, total_hours)
```

### **Day 13-14: Intelligence Layer**

#### **Token Monitoring Dashboard**
```python
# token_monitor.py
"""
Real-time Token Usage Monitoring and Optimization
"""

import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import matplotlib.pyplot as plt
import pandas as pd
from collections import defaultdict

@dataclass
class TokenUsage:
    session_id: str
    timestamp: datetime
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost: float
    task_type: str
    success: bool
    efficiency_score: float

class TokenMonitor:
    """Monitors and analyzes token usage patterns"""
    
    def __init__(self, data_file: str = "~/.claude-token-usage.json"):
        self.data_file = os.path.expanduser(data_file)
        self.usage_data: List[TokenUsage] = []
        self.load_data()
    
    def load_data(self):
        """Load existing token usage data"""
        try:
            with open(self.data_file, 'r') as f:
                data = json.load(f)
                self.usage_data = [
                    TokenUsage(**item) for item in data
                ]
        except FileNotFoundError:
            self.usage_data = []
    
    def save_data(self):
        """Save token usage data"""
        with open(self.data_file, 'w') as f:
            json.dump([asdict(usage) for usage in self.usage_data], f, default=str, indent=2)
    
    def log_usage(self, 
                  session_id: str,
                  model: str,
                  input_tokens: int,
                  output_tokens: int,
                  task_type: str,
                  success: bool,
                  cost: Optional[float] = None):
        """Log token usage for a session"""
        
        total_tokens = input_tokens + output_tokens
        efficiency_score = self._calculate_efficiency(input_tokens, output_tokens, success)
        
        if cost is None:
            cost = self._estimate_cost(model, input_tokens, output_tokens)
        
        usage = TokenUsage(
            session_id=session_id,
            timestamp=datetime.now(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            cost=cost,
            task_type=task_type,
            success=success,
            efficiency_score=efficiency_score
        )
        
        self.usage_data.append(usage)
        self.save_data()
    
    def _calculate_efficiency(self, input_tokens: int, output_tokens: int, success: bool) -> float:
        """Calculate efficiency score"""
        if not success:
            return 0.0
        
        # Higher efficiency = more output per input token
        ratio = output_tokens / max(input_tokens, 1)
        
        # Normalize to 0-100 scale
        return min(100.0, ratio * 50)
    
    def _estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost based on model pricing"""
        pricing = {
            'claude-sonnet-4': {'input': 0.003, 'output': 0.015},  # per 1K tokens
            'claude-opus-4': {'input': 0.015, 'output': 0.075},
            'claude-haiku': {'input': 0.00025, 'output': 0.00125}
        }
        
        model_pricing = pricing.get(model, pricing['claude-sonnet-4'])
        
        input_cost = (input_tokens / 1000) * model_pricing['input']
        output_cost = (output_tokens / 1000) * model_pricing['output']
        
        return input_cost + output_cost
    
    def get_daily_usage(self, days: int = 7) -> Dict[str, Any]:
        """Get daily usage statistics"""
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_usage = [u for u in self.usage_data if u.timestamp >= cutoff_date]
        
        daily_stats = defaultdict(lambda: {
            'total_tokens': 0,
            'total_cost': 0,
            'session_count': 0,
            'success_rate': 0,
            'avg_efficiency': 0
        })
        
        for usage in recent_usage:
            day_key = usage.timestamp.strftime('%Y-%m-%d')
            daily_stats[day_key]['total_tokens'] += usage.total_tokens
            daily_stats[day_key]['total_cost'] += usage.cost
            daily_stats[day_key]['session_count'] += 1
            daily_stats[day_key]['success_rate'] += 1 if usage.success else 0
            daily_stats[day_key]['avg_efficiency'] += usage.efficiency_score
        
        # Calculate averages
        for day_data in daily_stats.values():
            count = day_data['session_count']
            if count > 0:
                day_data['success_rate'] = (day_data['success_rate'] / count) * 100
                day_data['avg_efficiency'] = day_data['avg_efficiency'] / count
        
        return dict(daily_stats)
    
    def generate_optimization_report(self) -> Dict[str, Any]:
        """Generate optimization recommendations"""
        if not self.usage_data:
            return {"message": "No usage data available"}
        
        recent_usage = self.usage_data[-100:]  # Last 100 sessions
        
        # Analyze patterns
        task_efficiency = defaultdict(list)
        model_efficiency = defaultdict(list)
        
        for usage in recent_usage:
            task_efficiency[usage.task_type].append(usage.efficiency_score)
            model_efficiency[usage.model].append(usage.efficiency_score)
        
        # Calculate averages
        task_avg_efficiency = {
            task: sum(scores) / len(scores)
            for task, scores in task_efficiency.items()
        }
        
        model_avg_efficiency = {
            model: sum(scores) / len(scores)
            for model, scores in model_efficiency.items()
        }
        
        # Generate recommendations
        recommendations = []
        
        # Task-based recommendations
        worst_task = min(task_avg_efficiency.items(), key=lambda x: x[1])
        if worst_task[1] < 50:
            recommendations.append({
                'type': 'task_optimization',
                'message': f"Consider breaking down {worst_task[0]} tasks into smaller chunks",
                'impact': 'high'
            })
        
        # Model-based recommendations
        best_model = max(model_avg_efficiency.items(), key=lambda x: x[1])
        recommendations.append({
            'type': 'model_selection',
            'message': f"Use {best_model[0]} more often (highest efficiency: {best_model[1]:.1f})",
            'impact': 'medium'
        })
        
        # Cost optimization
        total_cost = sum(usage.cost for usage in recent_usage)
        avg_daily_cost = total_cost / 7  # Assuming 7 days of data
        
        if avg_daily_cost > 10:  # $10/day threshold
            recommendations.append({
                'type': 'cost_optimization',
                'message': f"Daily cost is ${avg_daily_cost:.2f}. Consider using more efficient models for simple tasks",
                'impact': 'high'
            })
        
        return {
            'task_efficiency': task_avg_efficiency,
            'model_efficiency': model_avg_efficiency,
            'total_cost_7_days': total_cost,
            'avg_daily_cost': avg_daily_cost,
            'recommendations': recommendations
        }
    
    def create_dashboard(self, output_file: str = "token_dashboard.html"):
        """Create HTML dashboard for token usage"""
        
        daily_usage = self.get_daily_usage(30)  # Last 30 days
        optimization_report = self.generate_optimization_report()
        
        # Convert to DataFrame for easier plotting
        df = pd.DataFrame(daily_usage).T
        df.index = pd.to_datetime(df.index)
        
        # Create plots
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
        
        # Daily token usage
        ax1.plot(df.index, df['total_tokens'], marker='o')
        ax1.set_title('Daily Token Usage')
        ax1.set_ylabel('Tokens')
        ax1.tick_params(axis='x', rotation=45)
        
        # Daily cost
        ax2.plot(df.index, df['total_cost'], marker='o', color='red')
        ax2.set_title('Daily Cost')
        ax2.set_ylabel('Cost ($)')
        ax2.tick_params(axis='x', rotation=45)
        
        # Success rate
        ax3.plot(df.index, df['success_rate'], marker='o', color='green')
        ax3.set_title('Success Rate')
        ax3.set_ylabel('Success Rate (%)')
        ax3.tick_params(axis='x', rotation=45)
        
        # Efficiency score
        ax4.plot(df.index, df['avg_efficiency'], marker='o', color='orange')
        ax4.set_title('Average Efficiency')
        ax4.set_ylabel('Efficiency Score')
        ax4.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.savefig('token_usage_charts.png', dpi=300, bbox_inches='tight')
        
        # Generate HTML dashboard
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Claude Code Token Usage Dashboard</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .metric {{ display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
        .recommendation {{ background-color: #f0f8ff; padding: 10px; margin: 5px 0; border-left: 4px solid #007acc; }}
        .high {{ border-left-color: #ff4444; }}
        .medium {{ border-left-color: #ffaa00; }}
        .low {{ border-left-color: #44ff44; }}
    </style>
</head>
<body>
    <h1>🤖 Claude Code Token Usage Dashboard</h1>
    
    <h2>📊 Current Metrics</h2>
    <div class="metric">
        <h3>Weekly Cost</h3>
        <p>${optimization_report['total_cost_7_days']:.2f}</p>
    </div>
    <div class="metric">
        <h3>Daily Average</h3>
        <p>${optimization_report['avg_daily_cost']:.2f}</p>
    </div>
    
    <h2>🎯 Optimization Recommendations</h2>
        """
        
        for rec in optimization_report['recommendations']:
            html_content += f"""
    <div class="recommendation {rec['impact']}">
        <strong>{rec['type'].replace('_', ' ').title()}:</strong> {rec['message']}
    </div>
            """
        
        html_content += """
    <h2>📈 Usage Charts</h2>
    <img src="token_usage_charts.png" alt="Token Usage Charts" style="max-width: 100%;">
    
    <h2>📋 Model Efficiency</h2>
    <table border="1" style="border-collapse: collapse; width: 100%;">
        <tr><th>Model</th><th>Efficiency Score</th></tr>
        """
        
        for model, efficiency in optimization_report['model_efficiency'].items():
            html_content += f"<tr><td>{model}</td><td>{efficiency:.1f}</td></tr>"
        
        html_content += """
    </table>
</body>
</html>
        """
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        print(f"📊 Dashboard created: {output_file}")

# Usage example
def monitor_session_example():
    """Example of monitoring a coding session"""
    monitor = TokenMonitor()
    
    # Simulate session logging
    monitor.log_usage(
        session_id="session_001",
        model="claude-sonnet-4",
        input_tokens=1500,
        output_tokens=800,
        task_type="coding",
        success=True
    )
    
    # Generate dashboard
    monitor.create_dashboard()
    
    # Print optimization report
    report = monitor.generate_optimization_report()
    print("🎯 Optimization Report:")
    for rec in report['recommendations']:
        print(f"  • {rec['message']}")

if __name__ == "__main__":
    monitor_session_example()
```

## 🎯 **Week 2 Deliverables**
1. **Project Index System**: Comprehensive project analysis and understanding
2. **Validation Agents**: Blind quality assurance system
3. **Session Tracking**: Advanced monitoring and analytics
4. **Calendar Integration**: Automated scheduling system
5. **Token Monitor**: Real-time usage optimization
6. **Intelligence Dashboard**: Performance insights and recommendations

## 📊 **Success Metrics**
- [ ] Project indexing completes in under 30 seconds for medium projects
- [ ] Validation agents catch 95%+ of common issues
- [ ] Calendar integration schedules optimal work blocks
- [ ] Token monitoring provides actionable insights
- [ ] Overall efficiency improvement of 30%+

---
*Week 2 establishes the intelligent automation layer for Claude Code optimization.*