#!/usr/bin/env python3
"""
Token Precision Tracker for Claude Code Optimizer
==================================================

Real-time token correlation with exact session timing for precise 5hr limit tracking.

Features:
- Real-time token correlation with session start timestamps
- Token velocity tracking (tokens/minute during active session)
- Weekly limit projection based on consumption rate
- Enhanced Claude Code limits integration
- Predictive analytics for quota management
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, NamedTuple
from dataclasses import dataclass, field
from collections import defaultdict, deque
import statistics
import threading
import logging

logger = logging.getLogger(__name__)


@dataclass
class TokenEvent:
    """Single token usage event"""
    timestamp: datetime
    session_id: str
    input_tokens: int
    output_tokens: int
    cache_creation_tokens: int
    cache_read_tokens: int
    model: str
    cost_usd: float = 0.0
    
    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens + self.cache_creation_tokens
    
    @property
    def billable_tokens(self) -> int:
        """Tokens that count toward limits (excludes cache reads)"""
        return self.input_tokens + self.output_tokens + self.cache_creation_tokens


@dataclass
class SessionMetrics:
    """Comprehensive session token metrics"""
    session_id: str
    start_time: datetime
    last_activity: Optional[datetime] = None
    total_tokens: int = 0
    billable_tokens: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_tokens: int = 0
    cache_read_tokens: int = 0
    total_cost: float = 0.0
    message_count: int = 0
    models_used: List[str] = field(default_factory=list)
    token_events: List[TokenEvent] = field(default_factory=list)
    
    @property
    def duration_minutes(self) -> float:
        """Session duration in minutes"""
        if not self.last_activity:
            return 0.0
        return (self.last_activity - self.start_time).total_seconds() / 60
    
    @property
    def tokens_per_minute(self) -> float:
        """Current token velocity"""
        if self.duration_minutes <= 0:
            return 0.0
        return self.total_tokens / self.duration_minutes
    
    @property
    def cache_efficiency(self) -> float:
        """Cache read efficiency percentage"""
        total_input = self.input_tokens + self.cache_creation_tokens
        if total_input <= 0:
            return 0.0
        return (self.cache_read_tokens / (self.cache_read_tokens + total_input)) * 100


@dataclass
class QuotaLimits:
    """Claude Code quota limits by plan"""
    messages_per_5h: int
    tokens_per_5h: Optional[int] = None  # Estimated based on typical usage
    weekly_hours: Dict[str, int] = field(default_factory=dict)
    
    
class ClaudeCodeLimits:
    """Claude Code limits by plan type"""
    
    PLANS = {
        'pro': QuotaLimits(
            messages_per_5h=45,
            tokens_per_5h=1_500_000,  # Conservative estimate
            weekly_hours={'sonnet-4': 80}
        ),
        'max5x': QuotaLimits(
            messages_per_5h=225,
            tokens_per_5h=7_500_000,  # Conservative estimate
            weekly_hours={'sonnet-4': 280, 'opus-4': 35}
        ),
        'max20x': QuotaLimits(
            messages_per_5h=900,
            tokens_per_5h=30_000_000,  # Conservative estimate  
            weekly_hours={'sonnet-4': 480, 'opus-4': 40}
        )
    }
    
    @classmethod
    def detect_plan(cls, message_count: int, tokens_used: int) -> str:
        """Detect likely plan based on usage patterns"""
        # Simple heuristic - could be enhanced with ML
        if message_count > 225 or tokens_used > 7_500_000:
            return 'max20x'
        elif message_count > 45 or tokens_used > 1_500_000:
            return 'max5x'
        else:
            return 'pro'


class TokenPrecisionTracker:
    """Real-time token tracking with session correlation"""
    
    # Model pricing (per million tokens)
    MODEL_PRICING = {
        'claude-sonnet-4': {'input': 3.0, 'output': 15.0},
        'claude-sonnet-3.5': {'input': 3.0, 'output': 15.0},
        'claude-opus-4': {'input': 15.0, 'output': 75.0},
        'claude-haiku-3': {'input': 0.25, 'output': 1.25}
    }
    
    def __init__(self):
        self.sessions = {}  # session_id -> SessionMetrics
        self.current_session_id = None
        self.projects_path = Path.home() / ".claude" / "projects"
        self.token_history = deque(maxlen=1000)  # Rolling history
        self.monitoring_thread = None
        self.monitoring = False
        self._lock = threading.Lock()
        
        # Weekly tracking
        self.weekly_usage = defaultdict(lambda: {
            'tokens': 0,
            'cost': 0.0,
            'messages': 0,
            'hours_used': 0.0
        })
        
    def start_tracking(self, session_id: str, start_time: datetime = None):
        """Start tracking a new session"""
        if not start_time:
            start_time = datetime.now()
            
        with self._lock:
            self.current_session_id = session_id
            self.sessions[session_id] = SessionMetrics(
                session_id=session_id,
                start_time=start_time
            )
            
        logger.info(f"Started token tracking for session {session_id}")
        
        # Start monitoring thread if not already running
        if not self.monitoring:
            self.start_monitoring()
            
    def stop_tracking(self, session_id: str = None):
        """Stop tracking current or specified session"""
        if not session_id:
            session_id = self.current_session_id
            
        if session_id and session_id in self.sessions:
            session = self.sessions[session_id]
            session.last_activity = datetime.now()
            
            logger.info(f"Stopped tracking session {session_id}: "
                       f"{session.total_tokens} tokens, {session.message_count} messages")
            
            if session_id == self.current_session_id:
                self.current_session_id = None
                
    def record_token_event(self, session_id: str, token_data: Dict):
        """Record a token usage event"""
        try:
            # Parse token data from JSONL format
            usage = token_data.get('usage', {})
            
            event = TokenEvent(
                timestamp=datetime.now(),
                session_id=session_id,
                input_tokens=usage.get('input_tokens', 0),
                output_tokens=usage.get('output_tokens', 0),
                cache_creation_tokens=usage.get('cache_creation_input_tokens', 0),
                cache_read_tokens=usage.get('cache_read_input_tokens', 0),
                model=token_data.get('model', 'unknown'),
                cost_usd=self._calculate_cost(usage, token_data.get('model', ''))
            )
            
            with self._lock:
                if session_id not in self.sessions:
                    logger.warning(f"Recording tokens for unknown session {session_id}")
                    # Auto-create session
                    self.sessions[session_id] = SessionMetrics(
                        session_id=session_id,
                        start_time=event.timestamp
                    )
                
                session = self.sessions[session_id]
                self._update_session_metrics(session, event)
                
            self.token_history.append(event)
            
            logger.debug(f"Recorded token event: {event.total_tokens} tokens "
                        f"for session {session_id}")
                        
        except Exception as e:
            logger.error(f"Error recording token event: {e}")
            
    def _update_session_metrics(self, session: SessionMetrics, event: TokenEvent):
        """Update session metrics with new token event"""
        session.last_activity = event.timestamp
        session.total_tokens += event.total_tokens
        session.billable_tokens += event.billable_tokens
        session.input_tokens += event.input_tokens
        session.output_tokens += event.output_tokens
        session.cache_creation_tokens += event.cache_creation_tokens
        session.cache_read_tokens += event.cache_read_tokens
        session.total_cost += event.cost_usd
        session.message_count += 1
        
        if event.model not in session.models_used:
            session.models_used.append(event.model)
            
        session.token_events.append(event)
        
        # Update weekly tracking
        week_key = event.timestamp.strftime('%Y-W%U')
        self.weekly_usage[week_key]['tokens'] += event.total_tokens
        self.weekly_usage[week_key]['cost'] += event.cost_usd
        self.weekly_usage[week_key]['messages'] += 1
        
    def _calculate_cost(self, usage: Dict, model: str) -> float:
        """Calculate cost for token usage"""
        if not usage:
            return 0.0
            
        # Normalize model name
        model_key = self._normalize_model_name(model)
        pricing = self.MODEL_PRICING.get(model_key, {'input': 3.0, 'output': 15.0})
        
        input_tokens = usage.get('input_tokens', 0) + usage.get('cache_creation_input_tokens', 0)
        output_tokens = usage.get('output_tokens', 0)
        
        cost = (input_tokens * pricing['input'] / 1_000_000 + 
                output_tokens * pricing['output'] / 1_000_000)
        
        return cost
        
    def _normalize_model_name(self, model: str) -> str:
        """Normalize model name for pricing lookup"""
        if 'sonnet-4' in model.lower():
            return 'claude-sonnet-4'
        elif 'sonnet-3.5' in model.lower():
            return 'claude-sonnet-3.5'
        elif 'opus' in model.lower():
            return 'claude-opus-4'
        elif 'haiku' in model.lower():
            return 'claude-haiku-3'
        else:
            return 'claude-sonnet-4'  # Default
            
    def start_monitoring(self):
        """Start monitoring JSONL files for token events"""
        if self.monitoring:
            return
            
        self.monitoring = True
        self.monitoring_thread = threading.Thread(
            target=self._monitoring_loop,
            daemon=True
        )
        self.monitoring_thread.start()
        logger.info("Started token monitoring")
        
    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
            
    def _monitoring_loop(self):
        """Main monitoring loop for JSONL files"""
        last_check = {}  # file_path -> last_size
        
        while self.monitoring:
            try:
                if not self.projects_path.exists():
                    time.sleep(5)
                    continue
                    
                # Check all JSONL files for changes
                for jsonl_file in self.projects_path.glob("**/*.jsonl"):
                    try:
                        current_size = jsonl_file.stat().st_size
                        last_size = last_check.get(str(jsonl_file), 0)
                        
                        if current_size > last_size:
                            # File has grown, check for new content
                            self._process_jsonl_updates(jsonl_file, last_size)
                            
                        last_check[str(jsonl_file)] = current_size
                        
                    except Exception as e:
                        logger.debug(f"Error checking {jsonl_file}: {e}")
                        continue
                        
                time.sleep(2)  # Check every 2 seconds
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(5)
                
    def _process_jsonl_updates(self, jsonl_file: Path, last_size: int):
        """Process new content in JSONL file"""
        try:
            session_id = jsonl_file.stem
            
            with open(jsonl_file, 'r', encoding='utf-8') as f:
                f.seek(last_size)  # Start from where we left off
                
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                        
                    try:
                        data = json.loads(line)
                        
                        # Check if this line contains token usage
                        if 'usage' in data and data['usage']:
                            self.record_token_event(session_id, data)
                            
                    except json.JSONDecodeError:
                        continue
                        
        except Exception as e:
            logger.error(f"Error processing JSONL updates: {e}")
            
    def get_session_metrics(self, session_id: str = None) -> Optional[SessionMetrics]:
        """Get metrics for current or specified session"""
        if not session_id:
            session_id = self.current_session_id
            
        if session_id in self.sessions:
            return self.sessions[session_id]
        return None
        
    def get_current_velocity(self, session_id: str = None) -> Dict:
        """Get current token velocity metrics"""
        session = self.get_session_metrics(session_id)
        if not session:
            return {'tokens_per_minute': 0.0, 'estimated_5h_usage': 0}
            
        current_velocity = session.tokens_per_minute
        
        # Project usage for 5 hours
        estimated_5h = current_velocity * 300  # 5 hours = 300 minutes
        
        return {
            'tokens_per_minute': current_velocity,
            'estimated_5h_usage': int(estimated_5h),
            'current_total': session.total_tokens,
            'duration_minutes': session.duration_minutes
        }
        
    def get_quota_status(self, session_id: str = None) -> Dict:
        """Get current quota status with limit projections"""
        session = self.get_session_metrics(session_id)
        if not session:
            return {'plan': 'unknown', 'status': 'no_session'}
            
        # Detect plan
        detected_plan = ClaudeCodeLimits.detect_plan(
            session.message_count, session.total_tokens
        )
        limits = ClaudeCodeLimits.PLANS[detected_plan]
        
        # Calculate usage percentages
        message_pct = (session.message_count / limits.messages_per_5h) * 100
        token_pct = 0
        if limits.tokens_per_5h:
            token_pct = (session.total_tokens / limits.tokens_per_5h) * 100
            
        # Time remaining projection
        velocity = self.get_current_velocity(session_id)
        
        if velocity['tokens_per_minute'] > 0:
            minutes_until_limit = (limits.tokens_per_5h - session.total_tokens) / velocity['tokens_per_minute']
            time_until_limit = max(0, minutes_until_limit)
        else:
            time_until_limit = float('inf')
            
        # Status determination
        if message_pct >= 95 or token_pct >= 95:
            status = 'critical'
        elif message_pct >= 80 or token_pct >= 80:
            status = 'warning'
        elif message_pct >= 50 or token_pct >= 50:
            status = 'moderate'
        else:
            status = 'healthy'
            
        return {
            'plan': detected_plan,
            'status': status,
            'limits': {
                'messages_per_5h': limits.messages_per_5h,
                'tokens_per_5h': limits.tokens_per_5h
            },
            'usage': {
                'messages': session.message_count,
                'message_percentage': message_pct,
                'tokens': session.total_tokens,
                'token_percentage': token_pct
            },
            'projections': {
                'tokens_per_minute': velocity['tokens_per_minute'],
                'estimated_5h_total': velocity['estimated_5h_usage'],
                'minutes_until_limit': time_until_limit if time_until_limit != float('inf') else None
            },
            'efficiency': {
                'cache_percentage': session.cache_efficiency,
                'cost_per_message': session.total_cost / max(1, session.message_count)
            }
        }
        
    def get_weekly_analysis(self) -> Dict:
        """Get weekly usage analysis and projections"""
        current_week = datetime.now().strftime('%Y-W%U')
        current_usage = self.weekly_usage.get(current_week, {
            'tokens': 0, 'cost': 0.0, 'messages': 0, 'hours_used': 0.0
        })
        
        # Calculate weekly velocity
        week_start = datetime.now() - timedelta(days=datetime.now().weekday())
        days_elapsed = (datetime.now() - week_start).days + 1
        
        if days_elapsed > 0:
            daily_average = current_usage['tokens'] / days_elapsed
            projected_weekly = daily_average * 7
        else:
            projected_weekly = 0
            
        return {
            'current_week': current_week,
            'usage': current_usage,
            'projections': {
                'daily_average': daily_average if 'daily_average' in locals() else 0,
                'projected_weekly_tokens': projected_weekly if 'projected_weekly' in locals() else 0
            },
            'days_elapsed': days_elapsed
        }
        
    def export_metrics(self, session_id: str = None, format: str = 'json') -> str:
        """Export session metrics in specified format"""
        session = self.get_session_metrics(session_id)
        if not session:
            return "{}" if format == 'json' else "No session data"
            
        data = {
            'session_id': session.session_id,
            'start_time': session.start_time.isoformat(),
            'last_activity': session.last_activity.isoformat() if session.last_activity else None,
            'duration_minutes': session.duration_minutes,
            'tokens': {
                'total': session.total_tokens,
                'billable': session.billable_tokens,
                'input': session.input_tokens,
                'output': session.output_tokens,
                'cache_creation': session.cache_creation_tokens,
                'cache_read': session.cache_read_tokens
            },
            'cost': session.total_cost,
            'messages': session.message_count,
            'models': session.models_used,
            'velocity': session.tokens_per_minute,
            'cache_efficiency': session.cache_efficiency,
            'quota_status': self.get_quota_status(session_id)
        }
        
        if format == 'json':
            return json.dumps(data, indent=2, default=str)
        else:
            return str(data)


def main():
    """Test token tracking"""
    tracker = TokenPrecisionTracker()
    
    # Simulate session
    session_id = f"test_session_{int(time.time())}"
    tracker.start_tracking(session_id)
    
    # Simulate token events
    test_usage = {
        'input_tokens': 1000,
        'output_tokens': 500,
        'cache_creation_input_tokens': 200,
        'cache_read_input_tokens': 300
    }
    
    tracker.record_token_event(session_id, {
        'usage': test_usage,
        'model': 'claude-sonnet-4-20250514'
    })
    
    # Get metrics
    metrics = tracker.get_session_metrics(session_id)
    velocity = tracker.get_current_velocity(session_id)
    quota = tracker.get_quota_status(session_id)
    
    print("Session Metrics:")
    print(f"  Total tokens: {metrics.total_tokens}")
    print(f"  Velocity: {velocity['tokens_per_minute']:.1f} tokens/min")
    print(f"  Quota status: {quota['status']} ({quota['plan']})")
    print(f"  Message usage: {quota['usage']['message_percentage']:.1f}%")


if __name__ == "__main__":
    main()