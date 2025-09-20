#!/usr/bin/env python3
"""
Token Agent for Claude Code Optimizer
======================================

Specialized agent for real-time token tracking and precision correlation.

Core Responsibilities:
- Real-time token correlation with exact session timing
- Token velocity tracking with microsecond precision
- JSONL parsing and monitoring
- Claude Code limits integration (Pro/Max5x/Max20x)
- Weekly limit projections and consumption analysis
- Predictive analytics for quota management
- Enhanced dashboard token metrics

Agent Architecture:
- token_precision_tracker.py: Core tracking engine
- Real-time JSONL monitoring with watchdog
- Token velocity calculation and trend analysis
- Integration with session timing for precise correlation
"""

import os
import sys
import json
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging
from collections import deque, defaultdict
import statistics
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure agent logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [TOKEN-AGENT] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('logs/token-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TokenAgent:
    """
    Specialized Token Agent
    
    Provides real-time token tracking with microsecond precision correlation
    to session timing for accurate quota management and predictive analytics.
    """
    
    def __init__(self):
        self.agent_id = f"token-agent-{int(time.time())}"
        self.startup_time = datetime.now()
        
        # Core token tracking components
        self.token_tracker = None
        self.projects_path = Path.home() / ".claude" / "projects"
        self.file_observer = None
        
        # Agent state
        self.is_running = False
        self.monitoring_thread = None
        self.analysis_thread = None
        
        # Real-time metrics
        self.real_time_metrics = {
            'current_session_id': None,
            'tokens_this_minute': 0,
            'velocity_samples': deque(maxlen=60),  # Last 60 samples
            'last_token_event': None,
            'active_models': set(),
            'quota_alerts': []
        }
        
        # Performance tracking
        self.performance_metrics = {
            'total_tokens_tracked': 0,
            'events_processed': 0,
            'correlation_accuracy': 0.0,
            'prediction_accuracy': 0.0,
            'last_update': None
        }
        
        # Callbacks for other agents
        self.token_callbacks = []
        
    def initialize(self):
        """Initialize token agent"""
        logger.info(f"Initializing Token Agent {self.agent_id}")
        
        # Create logs directory
        os.makedirs('logs', exist_ok=True)
        
        # Import and initialize token precision tracker
        try:
            from token_precision_tracker import TokenPrecisionTracker
            self.token_tracker = TokenPrecisionTracker()
            logger.info("✅ Token precision tracker initialized")
        except ImportError as e:
            logger.error(f"❌ Failed to import token tracker: {e}")
            return False
            
        # Setup real-time JSONL monitoring
        if not self._setup_jsonl_monitoring():
            logger.warning("⚠️ JSONL monitoring setup failed")
            
        self.is_running = True
        logger.info(f"🚀 Token Agent {self.agent_id} fully initialized")
        return True
        
    def start_token_service(self):
        """Start comprehensive token tracking service"""
        if not self.is_running:
            logger.error("Agent not initialized")
            return
            
        # Start monitoring thread for real-time tracking
        self.monitoring_thread = threading.Thread(
            target=self._monitoring_loop,
            daemon=True
        )
        self.monitoring_thread.start()
        
        # Start analysis thread for predictive analytics
        self.analysis_thread = threading.Thread(
            target=self._analysis_loop,
            daemon=True
        )
        self.analysis_thread.start()
        
        logger.info("Token tracking service started")
        
    def _setup_jsonl_monitoring(self) -> bool:
        """Setup real-time JSONL file monitoring"""
        if not self.projects_path.exists():
            logger.warning(f"Claude projects path not found: {self.projects_path}")
            return False
            
        class TokenJSONLHandler(FileSystemEventHandler):
            def __init__(self, agent):
                self.agent = agent
                
            def on_modified(self, event):
                if event.src_path.endswith('.jsonl'):
                    self.agent._handle_jsonl_modification(event.src_path)
                    
            def on_created(self, event):
                if event.src_path.endswith('.jsonl'):
                    self.agent._handle_new_jsonl_session(event.src_path)
                    
        try:
            self.file_observer = Observer()
            self.file_observer.schedule(
                TokenJSONLHandler(self),
                str(self.projects_path),
                recursive=True
            )
            self.file_observer.start()
            logger.info("✅ Real-time JSONL monitoring started")
            return True
        except Exception as e:
            logger.error(f"Failed to setup JSONL monitoring: {e}")
            return False
            
    def _handle_jsonl_modification(self, file_path: str):
        """Handle JSONL file modifications with microsecond precision"""
        try:
            path = Path(file_path)
            session_id = path.stem
            
            # Get precise modification time
            stat_info = path.stat()
            mod_time = datetime.fromtimestamp(stat_info.st_mtime)
            
            # Process new content since last read
            self._process_new_jsonl_content(path, session_id, mod_time)
            
        except Exception as e:
            logger.error(f"Error handling JSONL modification: {e}")
            
    def _handle_new_jsonl_session(self, file_path: str):
        """Handle new JSONL session creation"""
        path = Path(file_path)
        session_id = path.stem
        
        logger.info(f"🆕 New session detected: {session_id}")
        
        # Start tracking for new session
        self.token_tracker.start_tracking(session_id)
        self.real_time_metrics['current_session_id'] = session_id
        
        # Notify other agents
        self._notify_token_event('session_start', {
            'session_id': session_id,
            'file_path': file_path,
            'timestamp': datetime.now()
        })
        
    def _process_new_jsonl_content(self, path: Path, session_id: str, mod_time: datetime):
        """Process new content in JSONL file with precision timing"""
        try:
            # Read file and find new content
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Process each line that might contain token data
            for line in content.strip().split('\n'):
                if not line.strip():
                    continue
                    
                try:
                    data = json.loads(line)
                    
                    # Check for token usage data
                    if self._has_token_usage(data):
                        self._process_token_event(session_id, data, mod_time)
                        
                except json.JSONDecodeError:
                    continue
                    
        except Exception as e:
            logger.error(f"Error processing JSONL content: {e}")
            
    def _has_token_usage(self, data: Dict) -> bool:
        """Check if data contains token usage information"""
        return (
            'usage' in data and 
            data['usage'] and 
            any(key in data['usage'] for key in ['input_tokens', 'output_tokens'])
        )
        
    def _process_token_event(self, session_id: str, data: Dict, timestamp: datetime):
        """Process token usage event with precision timing"""
        try:
            # Record with token tracker
            self.token_tracker.record_token_event(session_id, data)
            
            # Update real-time metrics
            self._update_real_time_metrics(session_id, data, timestamp)
            
            # Update performance metrics
            self.performance_metrics['events_processed'] += 1
            self.performance_metrics['last_update'] = timestamp
            
            usage = data.get('usage', {})
            total_tokens = (usage.get('input_tokens', 0) + 
                          usage.get('output_tokens', 0) +
                          usage.get('cache_creation_input_tokens', 0))
                          
            self.performance_metrics['total_tokens_tracked'] += total_tokens
            
            # Notify other agents
            self._notify_token_event('token_usage', {
                'session_id': session_id,
                'tokens': total_tokens,
                'timestamp': timestamp,
                'model': data.get('model'),
                'usage_details': usage
            })
            
            logger.debug(f"📊 Token event: {total_tokens} tokens for {session_id}")
            
        except Exception as e:
            logger.error(f"Error processing token event: {e}")
            
    def _update_real_time_metrics(self, session_id: str, data: Dict, timestamp: datetime):
        """Update real-time metrics with microsecond precision"""
        usage = data.get('usage', {})
        total_tokens = (usage.get('input_tokens', 0) + 
                       usage.get('output_tokens', 0) +
                       usage.get('cache_creation_input_tokens', 0))
        
        # Update current minute counter
        current_minute = timestamp.replace(second=0, microsecond=0)
        if hasattr(self, '_last_minute') and self._last_minute == current_minute:
            self.real_time_metrics['tokens_this_minute'] += total_tokens
        else:
            self.real_time_metrics['tokens_this_minute'] = total_tokens
            self._last_minute = current_minute
            
        # Add velocity sample
        self.real_time_metrics['velocity_samples'].append({
            'timestamp': timestamp,
            'tokens': total_tokens,
            'session_id': session_id
        })
        
        # Update model tracking
        if 'model' in data:
            self.real_time_metrics['active_models'].add(data['model'])
            
        self.real_time_metrics['last_token_event'] = timestamp
        
    def _monitoring_loop(self):
        """Main monitoring loop for continuous token tracking"""
        while self.is_running:
            try:
                # Check for quota alerts
                self._check_quota_status()
                
                # Update velocity calculations
                self._update_velocity_metrics()
                
                # Clean old samples
                self._cleanup_old_samples()
                
                # Generate real-time reports
                self._generate_real_time_report()
                
                time.sleep(1)  # 1-second precision monitoring
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(5)
                
    def _analysis_loop(self):
        """Analysis loop for predictive analytics"""
        while self.is_running:
            try:
                # Perform weekly projection analysis
                self._analyze_weekly_projections()
                
                # Update quota predictions
                self._update_quota_predictions()
                
                # Analyze token efficiency trends
                self._analyze_efficiency_trends()
                
                # Generate predictive reports
                self._generate_predictive_report()
                
                time.sleep(60)  # Analysis every minute
                
            except Exception as e:
                logger.error(f"Analysis loop error: {e}")
                time.sleep(60)
                
    def _check_quota_status(self):
        """Check current quota status and generate alerts"""
        if not self.real_time_metrics['current_session_id']:
            return
            
        session_id = self.real_time_metrics['current_session_id']
        quota_status = self.token_tracker.get_quota_status(session_id)
        
        if quota_status['status'] in ['warning', 'critical']:
            alert = {
                'timestamp': datetime.now(),
                'session_id': session_id,
                'status': quota_status['status'],
                'usage_percentage': quota_status['usage']['token_percentage'],
                'plan': quota_status['plan']
            }
            
            # Add to alerts if not already present
            if not any(a['status'] == alert['status'] and 
                      a['session_id'] == alert['session_id'] 
                      for a in self.real_time_metrics['quota_alerts'][-5:]):
                self.real_time_metrics['quota_alerts'].append(alert)
                
                logger.warning(f"⚠️ Quota alert: {quota_status['status']} "
                             f"({quota_status['usage']['token_percentage']:.1f}%)")
                
    def _update_velocity_metrics(self):
        """Update token velocity calculations"""
        samples = list(self.real_time_metrics['velocity_samples'])
        if len(samples) < 2:
            return
            
        # Calculate tokens per minute over different time windows
        now = datetime.now()
        windows = [60, 300, 900]  # 1, 5, 15 minutes
        
        for window_seconds in windows:
            cutoff = now - timedelta(seconds=window_seconds)
            recent_samples = [s for s in samples if s['timestamp'] > cutoff]
            
            if recent_samples:
                total_tokens = sum(s['tokens'] for s in recent_samples)
                duration_minutes = window_seconds / 60
                velocity = total_tokens / duration_minutes if duration_minutes > 0 else 0
                
                # Store in metrics for dashboard
                self.real_time_metrics[f'velocity_{window_seconds}s'] = velocity
                
    def _cleanup_old_samples(self):
        """Remove old velocity samples to prevent memory growth"""
        cutoff = datetime.now() - timedelta(minutes=60)
        
        while (self.real_time_metrics['velocity_samples'] and 
               self.real_time_metrics['velocity_samples'][0]['timestamp'] < cutoff):
            self.real_time_metrics['velocity_samples'].popleft()
            
        # Clean old quota alerts
        self.real_time_metrics['quota_alerts'] = [
            alert for alert in self.real_time_metrics['quota_alerts']
            if (datetime.now() - alert['timestamp']).total_seconds() < 3600  # Keep for 1 hour
        ]
        
    def _generate_real_time_report(self):
        """Generate real-time token tracking report"""
        if datetime.now().second % 10 != 0:  # Every 10 seconds
            return
            
        report = {
            'agent_id': self.agent_id,
            'timestamp': datetime.now(),
            'real_time_metrics': dict(self.real_time_metrics),
            'performance_metrics': dict(self.performance_metrics)
        }
        
        # Convert sets to lists for JSON serialization
        if 'active_models' in report['real_time_metrics']:
            report['real_time_metrics']['active_models'] = list(
                report['real_time_metrics']['active_models']
            )
            
        # Save report
        report_path = Path('logs') / 'token-reports.jsonl'
        with open(report_path, 'a') as f:
            f.write(json.dumps(report, default=str) + '\n')
            
    def _analyze_weekly_projections(self):
        """Analyze weekly usage patterns and projections"""
        weekly_analysis = self.token_tracker.get_weekly_analysis()
        
        if weekly_analysis['usage']['tokens'] > 0:
            logger.debug(f"📈 Weekly projection: "
                        f"{weekly_analysis['projections']['projected_weekly_tokens']:,} tokens")
                        
    def _update_quota_predictions(self):
        """Update quota usage predictions"""
        if not self.real_time_metrics['current_session_id']:
            return
            
        session_id = self.real_time_metrics['current_session_id']
        velocity = self.token_tracker.get_current_velocity(session_id)
        
        if velocity['tokens_per_minute'] > 0:
            # Predict when current session might hit limits
            logger.debug(f"🔮 Predicted 5hr usage: {velocity['estimated_5h_usage']:,} tokens")
            
    def _analyze_efficiency_trends(self):
        """Analyze token efficiency trends"""
        if not self.real_time_metrics['current_session_id']:
            return
            
        session_id = self.real_time_metrics['current_session_id']
        session_metrics = self.token_tracker.get_session_metrics(session_id)
        
        if session_metrics and session_metrics.cache_efficiency > 0:
            logger.debug(f"⚡ Cache efficiency: {session_metrics.cache_efficiency:.1f}%")
            
    def _generate_predictive_report(self):
        """Generate predictive analytics report"""
        if datetime.now().minute % 5 != 0:  # Every 5 minutes
            return
            
        if not self.real_time_metrics['current_session_id']:
            return
            
        session_id = self.real_time_metrics['current_session_id']
        predictions = {
            'agent_id': self.agent_id,
            'timestamp': datetime.now(),
            'session_id': session_id,
            'quota_status': self.token_tracker.get_quota_status(session_id),
            'velocity_metrics': self.token_tracker.get_current_velocity(session_id),
            'weekly_analysis': self.token_tracker.get_weekly_analysis()
        }
        
        # Save predictions
        predictions_path = Path('logs') / 'token-predictions.jsonl'
        with open(predictions_path, 'a') as f:
            f.write(json.dumps(predictions, default=str) + '\n')
            
    def _notify_token_event(self, event_type: str, data: Dict):
        """Notify other agents of token events"""
        for callback in self.token_callbacks:
            try:
                callback(event_type, data)
            except Exception as e:
                logger.error(f"Token callback error: {e}")
                
    def get_current_session_metrics(self) -> Optional[Dict]:
        """Get comprehensive current session metrics"""
        if not self.real_time_metrics['current_session_id']:
            return None
            
        session_id = self.real_time_metrics['current_session_id']
        session_metrics = self.token_tracker.get_session_metrics(session_id)
        
        if not session_metrics:
            return None
            
        return {
            'session_id': session_id,
            'basic_metrics': {
                'total_tokens': session_metrics.total_tokens,
                'duration_minutes': session_metrics.duration_minutes,
                'tokens_per_minute': session_metrics.tokens_per_minute,
                'message_count': session_metrics.message_count,
                'total_cost': session_metrics.total_cost
            },
            'token_breakdown': {
                'input_tokens': session_metrics.input_tokens,
                'output_tokens': session_metrics.output_tokens,
                'cache_creation_tokens': session_metrics.cache_creation_tokens,
                'cache_read_tokens': session_metrics.cache_read_tokens
            },
            'efficiency_metrics': {
                'cache_efficiency': session_metrics.cache_efficiency,
                'cost_per_message': session_metrics.total_cost / max(1, session_metrics.message_count)
            },
            'quota_status': self.token_tracker.get_quota_status(session_id),
            'velocity_data': self.token_tracker.get_current_velocity(session_id),
            'real_time_data': dict(self.real_time_metrics)
        }
        
    def add_token_callback(self, callback):
        """Add callback for token events"""
        self.token_callbacks.append(callback)
        
    def get_agent_status(self) -> Dict:
        """Get comprehensive agent status"""
        return {
            'agent_id': self.agent_id,
            'status': 'running' if self.is_running else 'stopped',
            'startup_time': self.startup_time.isoformat(),
            'performance_metrics': dict(self.performance_metrics),
            'real_time_metrics': dict(self.real_time_metrics),
            'current_session': self.get_current_session_metrics()
        }
        
    def stop(self):
        """Stop token agent"""
        logger.info("Stopping Token Agent")
        
        self.is_running = False
        
        if self.file_observer:
            self.file_observer.stop()
            self.file_observer.join()
            
        if self.token_tracker:
            self.token_tracker.stop_monitoring()
            
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
            
        if self.analysis_thread:
            self.analysis_thread.join(timeout=5)
            
        logger.info("✅ Token Agent stopped")


def main():
    """Main entry point for token agent"""
    agent = TokenAgent()
    
    try:
        # Initialize agent
        if not agent.initialize():
            logger.error("Failed to initialize token agent")
            return 1
            
        # Start token service
        agent.start_token_service()
        
        # Add test callback
        def token_callback(event_type, data):
            print(f"\n📊 TOKEN EVENT: {event_type}")
            print(f"   Data: {json.dumps(data, default=str, indent=2)}")
            
        agent.add_token_callback(token_callback)
        
        logger.info("Token agent running. Press Ctrl+C to stop.")
        
        # Status reporting
        while agent.is_running:
            time.sleep(30)
            status = agent.get_agent_status()
            logger.info(f"Token tracking: {status['performance_metrics']['total_tokens_tracked']} tokens")
            
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
        agent.stop()
        return 0
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        agent.stop()
        return 1


if __name__ == "__main__":
    sys.exit(main())