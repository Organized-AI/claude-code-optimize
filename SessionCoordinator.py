#!/usr/bin/env python3
"""
Session Coordinator for Claude Code Optimizer
==============================================

Master coordination system for precision 5-hour session detection.
Coordinates all specialized agents for seamless integration.

Agent Coordination:
- detection-agent: Multi-source Claude activity detection
- validation-agent: >90% confidence validation
- token-agent: Real-time token correlation
- timer-agent: 5hr productivity block timers
- dashboard-agent: Enhanced dashboard APIs

Critical Accuracy: <5 second session start precision, >90% validation confidence
"""

import asyncio
import json
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Callable
import logging
from dataclasses import dataclass, field
from collections import defaultdict, deque
from enum import Enum
import uuid

# Configure coordinator logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [SESSION-COORDINATOR] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('logs/session-coordinator.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SessionState(Enum):
    """Session lifecycle states"""
    DETECTING = "detecting"
    VALIDATING = "validating"
    ACTIVE = "active"
    COMPLETING = "completing"
    COMPLETED = "completed"
    REJECTED = "rejected"


@dataclass
class SessionContext:
    """Complete session context with all agent data"""
    session_id: str
    state: SessionState = SessionState.DETECTING
    start_time: Optional[datetime] = None
    confidence: float = 0.0
    
    # Agent data
    detection_data: Dict = field(default_factory=dict)
    validation_data: Dict = field(default_factory=dict)
    token_data: Dict = field(default_factory=dict)
    timer_data: Dict = field(default_factory=dict)
    dashboard_data: Dict = field(default_factory=dict)
    
    # Coordination metadata
    agents_reporting: List[str] = field(default_factory=list)
    accuracy_score: float = 0.0
    precision_timestamp: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'session_id': self.session_id,
            'state': self.state.value,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'confidence': self.confidence,
            'detection_data': self.detection_data,
            'validation_data': self.validation_data,
            'token_data': self.token_data,
            'timer_data': self.timer_data,
            'dashboard_data': self.dashboard_data,
            'agents_reporting': self.agents_reporting,
            'accuracy_score': self.accuracy_score,
            'precision_timestamp': self.precision_timestamp.isoformat() if self.precision_timestamp else None
        }


class SessionCoordinator:
    """
    Master Session Coordinator
    
    Orchestrates all specialized agents for precision 5-hour session detection
    with <5 second accuracy and >90% confidence validation.
    """
    
    def __init__(self):
        self.coordinator_id = f"session-coordinator-{int(time.time())}"
        self.startup_time = datetime.now()
        
        # Active sessions
        self.active_sessions: Dict[str, SessionContext] = {}
        self.session_history = deque(maxlen=100)
        
        # Agent connections
        self.registered_agents = {}
        self.agent_callbacks = defaultdict(list)
        
        # Coordination state
        self.is_running = False
        self.coordination_thread = None
        self.precision_thread = None
        
        # Performance metrics
        self.metrics = {
            'total_sessions': 0,
            'precision_detections': 0,
            'validation_passes': 0,
            'validation_rejections': 0,
            'accuracy_score': 0.0,
            'average_detection_time': 0.0,
            'agents_coordinated': 0
        }
        
        # Precision requirements
        self.PRECISION_THRESHOLD_SECONDS = 5
        self.CONFIDENCE_THRESHOLD = 0.90
        self.REQUIRED_AGENTS = ['detection', 'validation', 'token']
        
        logger.info(f"SessionCoordinator {self.coordinator_id} initialized")
        
    def initialize(self):
        """Initialize coordination system"""
        logger.info("🚀 Initializing Session Coordinator")
        
        # Create logs directory
        Path('logs').mkdir(exist_ok=True)
        
        # Initialize agent communication
        self._setup_agent_communication()
        
        # Load existing infrastructure
        self._integrate_existing_components()
        
        self.is_running = True
        logger.info("✅ Session Coordinator initialized")
        return True
        
    def start_coordination(self):
        """Start master coordination system"""
        if not self.is_running:
            logger.error("Coordinator not initialized")
            return False
            
        # Start coordination thread
        self.coordination_thread = threading.Thread(
            target=self._coordination_loop,
            daemon=True
        )
        self.coordination_thread.start()
        
        # Start precision monitoring thread
        self.precision_thread = threading.Thread(
            target=self._precision_monitoring_loop,
            daemon=True
        )
        self.precision_thread.start()
        
        logger.info("🎯 Session coordination started - targeting <5s precision with >90% confidence")
        return True
        
    def register_agent(self, agent_type: str, agent_instance) -> bool:
        """Register specialized agent with coordinator"""
        try:
            self.registered_agents[agent_type] = {
                'instance': agent_instance,
                'status': 'active',
                'last_heartbeat': datetime.now(),
                'session_count': 0
            }
            
            # Set up agent callbacks
            if hasattr(agent_instance, 'add_callback'):
                callback = lambda event_type, data: self._handle_agent_event(agent_type, event_type, data)
                agent_instance.add_callback(callback)
                
            self.metrics['agents_coordinated'] += 1
            logger.info(f"✅ Registered {agent_type} agent")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register {agent_type} agent: {e}")
            return False
            
    def _handle_agent_event(self, agent_type: str, event_type: str, data: Dict):
        """Handle events from registered agents"""
        logger.debug(f"📨 Event from {agent_type}: {event_type}")
        
        try:
            # Route to appropriate handler based on agent type
            if agent_type == 'detection':
                self._handle_detection_event(event_type, data)
            elif agent_type == 'validation':
                self._handle_validation_event(event_type, data)
            elif agent_type == 'token':
                self._handle_token_event(event_type, data)
            elif agent_type == 'timer':
                self._handle_timer_event(event_type, data)
            elif agent_type == 'dashboard':
                self._handle_dashboard_event(event_type, data)
                
        except Exception as e:
            logger.error(f"Error handling {agent_type} event: {e}")
            
    def _handle_detection_event(self, event_type: str, data: Dict):
        """Handle detection agent events"""
        if event_type == 'session_start':
            session_id = data.get('id') or data.get('session_id')
            if not session_id:
                session_id = f"session_{int(time.time()*1000)}"
                
            # Create new session context
            context = SessionContext(
                session_id=session_id,
                state=SessionState.DETECTING,
                start_time=datetime.now(),
                detection_data=data,
                precision_timestamp=datetime.now()
            )
            
            context.agents_reporting.append('detection')
            self.active_sessions[session_id] = context
            
            logger.info(f"🎯 New session detected: {session_id} (confidence: {data.get('confidence', 0):.2%})")
            
            # Trigger validation process
            self._initiate_session_validation(context)
            
        elif event_type == 'session_update':
            session_id = data.get('id') or data.get('session_id')
            if session_id in self.active_sessions:
                context = self.active_sessions[session_id]
                context.detection_data.update(data)
                
        elif event_type == 'session_end':
            session_id = data.get('id') or data.get('session_id')
            if session_id in self.active_sessions:
                self._complete_session(session_id, data)
                
    def _handle_validation_event(self, event_type: str, data: Dict):
        """Handle validation agent events"""
        if event_type == 'validation_complete':
            validation_id = data.get('validation_id')
            session_id = self._find_session_by_validation(validation_id)
            
            if session_id and session_id in self.active_sessions:
                context = self.active_sessions[session_id]
                context.validation_data = data
                context.confidence = data.get('confidence', 0.0)
                
                if 'validation' not in context.agents_reporting:
                    context.agents_reporting.append('validation')
                    
                # Check if validation passes threshold
                if data.get('approved', False) and context.confidence >= self.CONFIDENCE_THRESHOLD:
                    logger.info(f"✅ Session {session_id} validated (confidence: {context.confidence:.2%})")
                    context.state = SessionState.ACTIVE
                    self._initiate_precision_timer(context)
                    self.metrics['validation_passes'] += 1
                else:
                    logger.warning(f"❌ Session {session_id} rejected (confidence: {context.confidence:.2%})")
                    context.state = SessionState.REJECTED
                    self.metrics['validation_rejections'] += 1
                    
    def _handle_token_event(self, event_type: str, data: Dict):
        """Handle token agent events"""
        session_id = data.get('session_id')
        if session_id and session_id in self.active_sessions:
            context = self.active_sessions[session_id]
            
            if event_type == 'session_start':
                context.token_data = data
                if 'token' not in context.agents_reporting:
                    context.agents_reporting.append('token')
                    
            elif event_type == 'token_usage':
                if 'token_events' not in context.token_data:
                    context.token_data['token_events'] = []
                context.token_data['token_events'].append(data)
                context.token_data['last_update'] = datetime.now()
                
    def _handle_timer_event(self, event_type: str, data: Dict):
        """Handle timer agent events"""
        if event_type == 'timer_started':
            session_id = data.get('session_id')
            if session_id and session_id in self.active_sessions:
                context = self.active_sessions[session_id]
                context.timer_data = data
                if 'timer' not in context.agents_reporting:
                    context.agents_reporting.append('timer')
                    
        elif event_type == 'timer_completed':
            session_id = data.get('session_id')
            if session_id and session_id in self.active_sessions:
                self._complete_session(session_id, data)
                
    def _handle_dashboard_event(self, event_type: str, data: Dict):
        """Handle dashboard agent events"""
        session_id = data.get('session_id')
        if session_id and session_id in self.active_sessions:
            context = self.active_sessions[session_id]
            context.dashboard_data.update(data)
            
    def _initiate_session_validation(self, context: SessionContext):
        """Initiate validation process for detected session"""
        logger.info(f"🔍 Initiating validation for session {context.session_id}")
        
        # Prepare validation request
        validation_request = {
            'session_id': context.session_id,
            'detection_data': context.detection_data,
            'timestamp': datetime.now(),
            'precision_requirement': self.PRECISION_THRESHOLD_SECONDS,
            'confidence_threshold': self.CONFIDENCE_THRESHOLD
        }
        
        # Send to validation agent
        if 'validation' in self.registered_agents:
            try:
                validation_agent = self.registered_agents['validation']['instance']
                if hasattr(validation_agent, 'validate_session_detection'):
                    result = validation_agent.validate_session_detection(validation_request)
                    self._handle_validation_event('validation_complete', result)
            except Exception as e:
                logger.error(f"Validation initiation error: {e}")
                
    def _initiate_precision_timer(self, context: SessionContext):
        """Initiate 5-hour precision timer for validated session"""
        logger.info(f"⏱️ Starting 5hr timer for session {context.session_id}")
        
        # Prepare timer request
        timer_request = {
            'session_data': {
                'id': context.session_id,
                'start_time': context.start_time,
                'confidence': context.confidence
            },
            'validation_result': context.validation_data
        }
        
        # Send to timer agent
        if 'timer' in self.registered_agents:
            try:
                timer_agent = self.registered_agents['timer']['instance']
                if hasattr(timer_agent, 'start_session_timer'):
                    result = timer_agent.start_session_timer(
                        timer_request['session_data'],
                        timer_request['validation_result']
                    )
                    context.timer_data = result
                    
                    # Start token tracking
                    self._initiate_token_tracking(context)
                    
            except Exception as e:
                logger.error(f"Timer initiation error: {e}")
                
    def _initiate_token_tracking(self, context: SessionContext):
        """Initiate real-time token tracking for session"""
        logger.info(f"📊 Starting token tracking for session {context.session_id}")
        
        # Send to token agent
        if 'token' in self.registered_agents:
            try:
                token_agent = self.registered_agents['token']['instance']
                if hasattr(token_agent, 'start_tracking'):
                    token_agent.start_tracking(
                        context.session_id,
                        context.start_time
                    )
            except Exception as e:
                logger.error(f"Token tracking initiation error: {e}")
                
    def _complete_session(self, session_id: str, completion_data: Dict):
        """Complete session and update metrics"""
        if session_id not in self.active_sessions:
            return
            
        context = self.active_sessions[session_id]
        context.state = SessionState.COMPLETED
        
        # Calculate session metrics
        if context.start_time:
            duration = datetime.now() - context.start_time
            context.dashboard_data['duration'] = duration.total_seconds()
            
        # Calculate accuracy score
        context.accuracy_score = self._calculate_session_accuracy(context)
        
        # Move to history
        self.session_history.append(context)
        del self.active_sessions[session_id]
        
        # Update metrics
        self.metrics['total_sessions'] += 1
        self._update_performance_metrics()
        
        logger.info(f"✅ Session {session_id} completed (accuracy: {context.accuracy_score:.2%})")
        
    def _calculate_session_accuracy(self, context: SessionContext) -> float:
        """Calculate session accuracy score"""
        accuracy_factors = []
        
        # Confidence score
        accuracy_factors.append(context.confidence)
        
        # Agent reporting completeness
        reporting_score = len(context.agents_reporting) / len(self.REQUIRED_AGENTS)
        accuracy_factors.append(reporting_score)
        
        # Precision timing
        if context.precision_timestamp and context.start_time:
            timing_diff = abs((context.precision_timestamp - context.start_time).total_seconds())
            timing_score = max(0, 1 - (timing_diff / self.PRECISION_THRESHOLD_SECONDS))
            accuracy_factors.append(timing_score)
            
        return sum(accuracy_factors) / len(accuracy_factors) if accuracy_factors else 0.0
        
    def _coordination_loop(self):
        """Main coordination loop"""
        while self.is_running:
            try:
                # Check agent health
                self._check_agent_health()
                
                # Update active sessions
                self._update_active_sessions()
                
                # Cleanup completed sessions
                self._cleanup_old_sessions()
                
                # Generate coordination reports
                self._generate_coordination_report()
                
                time.sleep(1)  # 1-second coordination precision
                
            except Exception as e:
                logger.error(f"Coordination loop error: {e}")
                time.sleep(5)
                
    def _precision_monitoring_loop(self):
        """Precision monitoring and accuracy tracking"""
        while self.is_running:
            try:
                # Monitor precision requirements
                self._monitor_precision_compliance()
                
                # Update accuracy metrics
                self._update_accuracy_metrics()
                
                # Check for performance degradation
                self._check_performance_degradation()
                
                time.sleep(5)  # Precision monitoring every 5 seconds
                
            except Exception as e:
                logger.error(f"Precision monitoring error: {e}")
                time.sleep(10)
                
    def _monitor_precision_compliance(self):
        """Monitor compliance with precision requirements"""
        for session_id, context in self.active_sessions.items():
            if context.state == SessionState.DETECTING:
                detection_age = (datetime.now() - (context.precision_timestamp or datetime.now())).total_seconds()
                
                if detection_age > self.PRECISION_THRESHOLD_SECONDS:
                    logger.warning(f"⚠️ Session {session_id} exceeding precision threshold: {detection_age:.1f}s")
                    
    def _setup_agent_communication(self):
        """Setup communication channels with agents"""
        logger.info("🔗 Setting up agent communication")
        
    def _integrate_existing_components(self):
        """Integrate with existing Claude Code Optimizer components"""
        logger.info("🔧 Integrating with existing components")
        
        # Check for existing session-automation-http.py
        session_automation_path = Path("session-automation-http.py")
        if session_automation_path.exists():
            logger.info("✅ Found existing session-automation-http.py")
            
        # Check for existing dashboard
        dashboard_path = Path("dashboard-server/server.js")
        if dashboard_path.exists():
            logger.info("✅ Found existing dashboard server")
            
    def _find_session_by_validation(self, validation_id: str) -> Optional[str]:
        """Find session ID by validation ID"""
        for session_id, context in self.active_sessions.items():
            if context.validation_data.get('validation_id') == validation_id:
                return session_id
        return None
        
    def _check_agent_health(self):
        """Check health of registered agents"""
        now = datetime.now()
        for agent_type, agent_info in self.registered_agents.items():
            last_heartbeat = agent_info['last_heartbeat']
            if (now - last_heartbeat).total_seconds() > 60:  # 60 seconds timeout
                logger.warning(f"⚠️ Agent {agent_type} appears inactive")
                
    def _update_active_sessions(self):
        """Update active session states"""
        for session_id, context in list(self.active_sessions.items()):
            # Check for stalled sessions
            if context.start_time:
                age = (datetime.now() - context.start_time).total_seconds()
                if age > 21600:  # 6 hours - longer than 5hr timer
                    logger.info(f"🧹 Cleaning up stalled session {session_id}")
                    self._complete_session(session_id, {'reason': 'stalled'})
                    
    def _cleanup_old_sessions(self):
        """Clean up old session data"""
        # Keep session history reasonable
        while len(self.session_history) > 100:
            self.session_history.popleft()
            
    def _generate_coordination_report(self):
        """Generate coordination status report"""
        if datetime.now().second % 30 == 0:  # Every 30 seconds
            report = {
                'coordinator_id': self.coordinator_id,
                'timestamp': datetime.now(),
                'active_sessions': len(self.active_sessions),
                'registered_agents': list(self.registered_agents.keys()),
                'metrics': dict(self.metrics),
                'session_states': {
                    session_id: context.state.value 
                    for session_id, context in self.active_sessions.items()
                }
            }
            
            # Save report
            report_path = Path('logs') / 'coordination-reports.jsonl'
            with open(report_path, 'a') as f:
                f.write(json.dumps(report, default=str) + '\n')
                
    def _update_accuracy_metrics(self):
        """Update overall accuracy metrics"""
        if self.session_history:
            total_accuracy = sum(session.accuracy_score for session in self.session_history)
            self.metrics['accuracy_score'] = total_accuracy / len(self.session_history)
            
    def _check_performance_degradation(self):
        """Check for performance degradation"""
        if self.metrics['validation_rejections'] > self.metrics['validation_passes']:
            logger.warning("⚠️ High validation rejection rate detected")
            
    def _update_performance_metrics(self):
        """Update performance metrics"""
        if self.session_history:
            # Calculate average detection time
            detection_times = []
            for session in self.session_history:
                if session.start_time and session.precision_timestamp:
                    detection_time = abs((session.start_time - session.precision_timestamp).total_seconds())
                    detection_times.append(detection_time)
                    
            if detection_times:
                self.metrics['average_detection_time'] = sum(detection_times) / len(detection_times)
                
    def get_coordination_status(self) -> Dict:
        """Get comprehensive coordination status"""
        return {
            'coordinator_id': self.coordinator_id,
            'status': 'running' if self.is_running else 'stopped',
            'startup_time': self.startup_time.isoformat(),
            'active_sessions': {
                session_id: context.to_dict()
                for session_id, context in self.active_sessions.items()
            },
            'registered_agents': {
                agent_type: {
                    'status': info['status'],
                    'last_heartbeat': info['last_heartbeat'].isoformat(),
                    'session_count': info['session_count']
                }
                for agent_type, info in self.registered_agents.items()
            },
            'metrics': dict(self.metrics),
            'precision_requirements': {
                'threshold_seconds': self.PRECISION_THRESHOLD_SECONDS,
                'confidence_threshold': self.CONFIDENCE_THRESHOLD,
                'required_agents': self.REQUIRED_AGENTS
            }
        }
        
    def stop(self):
        """Stop coordination system"""
        logger.info("Stopping Session Coordinator")
        
        self.is_running = False
        
        # Complete any active sessions
        for session_id in list(self.active_sessions.keys()):
            self._complete_session(session_id, {'reason': 'coordinator_shutdown'})
            
        # Stop threads
        if self.coordination_thread:
            self.coordination_thread.join(timeout=5)
        if self.precision_thread:
            self.precision_thread.join(timeout=5)
            
        logger.info("✅ Session Coordinator stopped")


def main():
    """Main entry point for session coordinator"""
    coordinator = SessionCoordinator()
    
    try:
        # Initialize coordinator
        if not coordinator.initialize():
            logger.error("Failed to initialize coordinator")
            return 1
            
        # Start coordination
        if not coordinator.start_coordination():
            logger.error("Failed to start coordination")
            return 1
            
        logger.info("Session Coordinator running. Press Ctrl+C to stop.")
        
        # Status reporting loop
        while coordinator.is_running:
            time.sleep(30)
            status = coordinator.get_coordination_status()
            logger.info(f"Coordinating {status['metrics']['agents_coordinated']} agents, "
                       f"{len(status['active_sessions'])} active sessions")
            
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
        coordinator.stop()
        return 0
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        coordinator.stop()
        return 1


if __name__ == "__main__":
    exit(main())