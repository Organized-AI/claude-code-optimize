#!/usr/bin/env python3
"""
Core session management for Claude Code optimization
"""
import os
import yaml
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any

class ClaudeCodeSessionManager:
    """Core session management for Claude Code optimization"""
    
    def __init__(self, project_path: str = None):
        self.project_path = Path(project_path) if project_path else Path.cwd()
        self.config_dir = Path(__file__).parent.parent.parent / "config"
        self.settings = self.load_settings()
        self.session_history = []
        
    def load_settings(self) -> Dict:
        """Load configuration settings"""
        settings_file = self.config_dir / "settings.yaml"
        try:
            with open(settings_file, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            return self.create_default_settings()
    
    def create_default_settings(self) -> Dict:
        """Create default settings configuration"""
        default_settings = {
            'token_limits': {
                'weekly_limit': 500000,
                'daily_budget': 71429,
                'emergency_reserve': 100000,
                'warning_threshold': 0.8
            },
            'session_types': {
                'planning': {
                    'duration': 120,
                    'token_budget': 25000,
                    'model': 'sonnet',
                    'description': 'Project planning and architecture'
                },
                'coding': {
                    'duration': 240,
                    'token_budget': 75000,
                    'model': 'sonnet',
                    'description': 'Feature implementation and development'
                },
                'testing': {
                    'duration': 180,
                    'token_budget': 45000,
                    'model': 'sonnet',
                    'description': 'Testing and quality assurance'
                },
                'review': {
                    'duration': 90,
                    'token_budget': 20000,
                    'model': 'sonnet',
                    'description': 'Code review and optimization'
                }
            },
            'working_hours': {
                'start': '09:00',
                'end': '17:00',
                'timezone': 'America/Los_Angeles'
            }
        }
        
        # Save default settings
        settings_file = self.config_dir / "settings.yaml"
        settings_file.parent.mkdir(parents=True, exist_ok=True)
        with open(settings_file, 'w') as f:
            yaml.dump(default_settings, f, default_flow_style=False)
        
        return default_settings
    
    def start_session(self, session_type: str, project_path: str = None) -> Dict:
        """Start a new Claude Code session"""
        session_config = self.settings['session_types'].get(session_type, {})
        
        session = {
            'id': f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'type': session_type,
            'project_path': project_path or str(self.project_path),
            'start_time': datetime.now().isoformat(),
            'duration': session_config.get('duration', 120),
            'token_budget': session_config.get('token_budget', 50000),
            'model': session_config.get('model', 'sonnet'),
            'status': 'active'
        }
        
        self.session_history.append(session)
        self.save_session_history()
        
        return session
    
    def end_session(self, session_id: str, tokens_used: int = 0) -> Dict:
        """End a Claude Code session"""
        for session in self.session_history:
            if session['id'] == session_id:
                session['end_time'] = datetime.now().isoformat()
                session['tokens_used'] = tokens_used
                session['status'] = 'completed'
                session['efficiency'] = self.calculate_efficiency(session)
                break
        
        self.save_session_history()
        return session
    
    def calculate_efficiency(self, session: Dict) -> float:
        """Calculate session efficiency score"""
        if 'tokens_used' not in session or session['tokens_used'] == 0:
            return 0.0
        
        budget = session['token_budget']
        used = session['tokens_used']
        
        # Efficiency = how well we used our budget (not over, not way under)
        if used <= budget:
            return min(1.0, used / budget)
        else:
            # Penalize going over budget
            return max(0.0, 1.0 - ((used - budget) / budget))
    
    def get_token_usage_summary(self) -> Dict:
        """Get current token usage summary"""
        weekly_limit = self.settings['token_limits']['weekly_limit']
        
        # Calculate usage from last 7 days
        week_ago = datetime.now() - timedelta(days=7)
        recent_sessions = [
            s for s in self.session_history 
            if 'end_time' in s and datetime.fromisoformat(s['end_time']) > week_ago
        ]
        
        total_used = sum(s.get('tokens_used', 0) for s in recent_sessions)
        remaining = weekly_limit - total_used
        
        return {
            'weekly_limit': weekly_limit,
            'total_used': total_used,
            'remaining': remaining,
            'usage_percentage': (total_used / weekly_limit) * 100,
            'sessions_this_week': len(recent_sessions)
        }
    
    def save_session_history(self):
        """Save session history to file"""
        history_file = self.project_path / ".claude_sessions.json"
        with open(history_file, 'w') as f:
            json.dump(self.session_history, f, indent=2, default=str)
    
    def load_session_history(self):
        """Load session history from file"""
        history_file = self.project_path / ".claude_sessions.json"
        if history_file.exists():
            with open(history_file, 'r') as f:
                self.session_history = json.load(f)

if __name__ == "__main__":
    manager = ClaudeCodeSessionManager()
    print("✅ Session Manager initialized")
    print("Token Usage:", manager.get_token_usage_summary())