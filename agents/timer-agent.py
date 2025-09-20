#!/usr/bin/env python3
"""
Timer Agent for Claude Code Optimizer
======================================

Specialized agent for precision 5-hour session timers and notifications.

Core Responsibilities:
- Precision 5-hour session timers (validated starts only >90% confidence)
- Real-time progress tracking with milestone alerts
- macOS notifications with custom scheduling
- AppleScript calendar integration for 5hr productivity blocks
- Enhanced notification management
- Calendar event automation

Agent Architecture:
- five_hour_precision_timer.py: Core timer engine
- notification_manager.py: Enhanced macOS notifications
- Calendar integration with AppleScript
- Progress tracking with milestone notifications
- Precision timing with sub-second accuracy
"""

import os
import sys
import json
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import subprocess
import logging
from collections import deque

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure agent logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [TIMER-AGENT] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('logs/timer-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class TimerAgent:
    """
    Specialized Timer Agent
    
    Manages precision 5-hour session timers with validated starts,
    milestone notifications, and calendar integration.
    """
    
    def __init__(self):
        self.agent_id = f"timer-agent-{int(time.time())}"
        self.startup_time = datetime.now()
        
        # Core timer components
        self.precision_timer = None
        self.notification_manager = None
        
        # Agent state
        self.is_running = False
        self.timer_thread = None
        self.notification_thread = None
        
        # Active timers
        self.active_timers = {}
        self.timer_history = deque(maxlen=50)
        
        # Notification scheduling
        self.scheduled_notifications = []
        self.milestone_percentages = [25, 50, 75, 90, 100]
        
        # Performance metrics
        self.metrics = {
            'timers_started': 0,
            'timers_completed': 0,
            'notifications_sent': 0,
            'calendar_events_created': 0,
            'average_session_duration': 0.0,
            'validation_rejections': 0
        }
        
        # Callbacks for other agents
        self.timer_callbacks = []
        
    def initialize(self):
        """Initialize timer agent"""
        logger.info(f"Initializing Timer Agent {self.agent_id}")
        
        # Create logs directory
        os.makedirs('logs', exist_ok=True)
        
        # Initialize precision timer
        try:
            self.precision_timer = FiveHourPrecisionTimer()
            logger.info("✅ Precision timer initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize precision timer: {e}")
            return False
            
        # Initialize notification manager
        try:
            self.notification_manager = NotificationManager()
            logger.info("✅ Notification manager initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize notification manager: {e}")
            return False
            
        self.is_running = True
        logger.info(f"🚀 Timer Agent {self.agent_id} fully initialized")
        return True
        
    def start_timer_service(self):
        """Start comprehensive timer service"""
        if not self.is_running:
            logger.error("Agent not initialized")
            return
            
        # Start timer management thread
        self.timer_thread = threading.Thread(
            target=self._timer_management_loop,
            daemon=True
        )
        self.timer_thread.start()
        
        # Start notification thread
        self.notification_thread = threading.Thread(
            target=self._notification_loop,
            daemon=True
        )
        self.notification_thread.start()
        
        logger.info("Timer service started")
        
    def start_session_timer(self, session_data: Dict, validation_result: Dict) -> Dict:
        """
        Start 5-hour timer for validated session
        
        Args:
            session_data: Session information from detection
            validation_result: Validation result with confidence scoring
            
        Returns:
            Timer start result
        """
        logger.info(f"🕐 Timer start request for session {session_data.get('id')}")
        
        # Validate confidence threshold
        if not validation_result.get('approved', False):
            self.metrics['validation_rejections'] += 1
            logger.warning(f"❌ Timer rejected: {validation_result.get('approval_reason')}")
            return {
                'success': False,
                'reason': 'validation_failed',
                'details': validation_result.get('approval_reason'),
                'confidence': validation_result.get('confidence', 0.0)
            }
            
        confidence = validation_result.get('confidence', 0.0)
        if confidence < 0.90:
            self.metrics['validation_rejections'] += 1
            logger.warning(f"❌ Timer rejected: confidence {confidence:.1%} below 90% threshold")
            return {
                'success': False,
                'reason': 'confidence_too_low',
                'confidence': confidence,
                'threshold': 0.90
            }
            
        # Create timer
        timer_id = f"timer_{session_data.get('id', int(time.time()))}"
        start_time = datetime.now()
        
        timer_config = {
            'id': timer_id,
            'session_id': session_data.get('id'),
            'start_time': start_time,
            'duration_hours': 5,
            'confidence': confidence,
            'validation_data': validation_result,
            'status': 'active',
            'milestones_reached': [],
            'notifications_sent': []
        }
        
        # Start precision timer
        self.precision_timer.start_timer(timer_config)
        self.active_timers[timer_id] = timer_config
        
        # Schedule milestone notifications
        self._schedule_milestone_notifications(timer_config)
        
        # Create calendar event
        self._create_calendar_event(timer_config)
        
        # Send start notification
        self._send_session_start_notification(timer_config)
        
        # Update metrics
        self.metrics['timers_started'] += 1
        
        logger.info(f"✅ Timer started: {timer_id} (confidence: {confidence:.2%})")
        
        # Notify other agents
        self._notify_timer_event('timer_started', timer_config)
        
        return {
            'success': True,
            'timer_id': timer_id,
            'start_time': start_time.isoformat(),
            'confidence': confidence,
            'milestones_scheduled': len(self.milestone_percentages)
        }
        
    def _schedule_milestone_notifications(self, timer_config: Dict):
        """Schedule milestone notifications for 5-hour session"""
        start_time = timer_config['start_time']
        duration_hours = timer_config['duration_hours']
        duration_seconds = duration_hours * 3600
        
        for percentage in self.milestone_percentages:
            milestone_seconds = (percentage / 100) * duration_seconds
            notification_time = start_time + timedelta(seconds=milestone_seconds)
            
            notification = {
                'timer_id': timer_config['id'],
                'notification_time': notification_time,
                'percentage': percentage,
                'type': 'milestone',
                'scheduled': True,
                'sent': False
            }
            
            self.scheduled_notifications.append(notification)
            
        logger.debug(f"📅 Scheduled {len(self.milestone_percentages)} milestone notifications")
        
    def _create_calendar_event(self, timer_config: Dict):
        """Create macOS calendar event for 5-hour session"""
        try:
            start_time = timer_config['start_time']
            end_time = start_time + timedelta(hours=timer_config['duration_hours'])
            session_id = timer_config['session_id']
            confidence = timer_config['confidence']
            
            # AppleScript to create calendar event
            applescript = f'''
            tell application "Calendar"
                if not (exists calendar "Claude 5hr Sessions") then
                    make new calendar with properties {{name:"Claude 5hr Sessions"}}
                end if
                
                tell calendar "Claude 5hr Sessions"
                    set newEvent to make new event with properties {{
                        summary:"🚀 Claude 5hr Productivity Block",
                        start date:date "{start_time.strftime('%B %d, %Y %I:%M:%S %p')}",
                        end date:date "{end_time.strftime('%B %d, %Y %I:%M:%S %p')}"
                    }}
                    
                    set description of newEvent to "Session: {session_id}
Confidence: {confidence:.1%}
Timer: {timer_config['id']}
                    
🎯 5-Hour Deep Work Session
⚡ Real-time token tracking active
📊 Progress notifications enabled
                    
Generated by Claude Code Optimizer"
                    
                    set alarms of newEvent to {{make new sound alarm with properties {{trigger interval:-300}}}}
                end tell
            end tell
            '''
            
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                self.metrics['calendar_events_created'] += 1
                logger.info(f"📅 Calendar event created for {timer_config['id']}")
                timer_config['calendar_created'] = True
            else:
                logger.error(f"Failed to create calendar event: {result.stderr}")
                timer_config['calendar_created'] = False
                
        except Exception as e:
            logger.error(f"Calendar integration error: {e}")
            timer_config['calendar_created'] = False
            
    def _send_session_start_notification(self, timer_config: Dict):
        """Send session start notification"""
        confidence = timer_config['confidence']
        session_id = timer_config.get('session_id', 'Unknown')
        
        title = "🚀 5-Hour Claude Session Started"
        message = (f"High-confidence session detected ({confidence:.1%})\n"
                  f"Session: {session_id[:8]}...\n"
                  f"Timer: {timer_config['duration_hours']} hours\n"
                  f"Progress notifications enabled")
                  
        success = self.notification_manager.send_notification(
            title=title,
            message=message,
            sound='Glass'  # macOS system sound
        )
        
        if success:
            self.metrics['notifications_sent'] += 1
            timer_config['notifications_sent'].append({
                'type': 'start',
                'timestamp': datetime.now(),
                'success': True
            })
            
    def _timer_management_loop(self):
        """Main timer management loop"""
        while self.is_running:
            try:
                # Update active timers
                self._update_active_timers()
                
                # Check for completed timers
                self._check_completed_timers()
                
                # Process scheduled notifications
                self._process_scheduled_notifications()
                
                # Clean up old timers
                self._cleanup_old_timers()
                
                time.sleep(1)  # 1-second precision
                
            except Exception as e:
                logger.error(f"Timer management error: {e}")
                time.sleep(5)
                
    def _notification_loop(self):
        """Notification processing loop"""
        while self.is_running:
            try:
                # Process pending notifications
                now = datetime.now()
                
                for notification in self.scheduled_notifications:
                    if (not notification['sent'] and 
                        notification['scheduled'] and
                        now >= notification['notification_time']):
                        
                        self._send_milestone_notification(notification)
                        
                time.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                logger.error(f"Notification loop error: {e}")
                time.sleep(10)
                
    def _update_active_timers(self):
        """Update status of active timers"""
        now = datetime.now()
        
        for timer_id, timer_config in self.active_timers.items():
            if timer_config['status'] != 'active':
                continue
                
            # Calculate progress
            elapsed = (now - timer_config['start_time']).total_seconds()
            total_seconds = timer_config['duration_hours'] * 3600
            progress_percentage = (elapsed / total_seconds) * 100
            
            timer_config['elapsed_seconds'] = elapsed
            timer_config['progress_percentage'] = min(100, progress_percentage)
            timer_config['remaining_seconds'] = max(0, total_seconds - elapsed)
            
            # Update precision timer
            self.precision_timer.update_timer(timer_id, timer_config)
            
    def _check_completed_timers(self):
        """Check for completed timers"""
        completed_timers = []
        
        for timer_id, timer_config in self.active_timers.items():
            if timer_config.get('progress_percentage', 0) >= 100:
                completed_timers.append(timer_id)
                
        for timer_id in completed_timers:
            self._complete_timer(timer_id)
            
    def _complete_timer(self, timer_id: str):
        """Complete a timer and send completion notification"""
        if timer_id not in self.active_timers:
            return
            
        timer_config = self.active_timers[timer_id]
        timer_config['status'] = 'completed'
        timer_config['completion_time'] = datetime.now()
        
        # Calculate final stats
        duration = timer_config['completion_time'] - timer_config['start_time']
        timer_config['actual_duration_seconds'] = duration.total_seconds()
        
        # Send completion notification
        self._send_completion_notification(timer_config)
        
        # Add to history
        self.timer_history.append(timer_config)
        
        # Update metrics
        self.metrics['timers_completed'] += 1
        self._update_average_duration()
        
        # Remove from active timers
        del self.active_timers[timer_id]
        
        logger.info(f"✅ Timer completed: {timer_id}")
        
        # Notify other agents
        self._notify_timer_event('timer_completed', timer_config)
        
    def _send_milestone_notification(self, notification: Dict):
        """Send milestone progress notification"""
        try:
            timer_id = notification['timer_id']
            percentage = notification['percentage']
            
            # Find timer config
            timer_config = self.active_timers.get(timer_id)
            if not timer_config:
                return
                
            remaining_minutes = timer_config.get('remaining_seconds', 0) / 60
            
            # Customize message by milestone
            if percentage == 25:
                title = "⚡ 25% Progress - 1.25 Hours In!"
                message = f"Great momentum! {remaining_minutes:.0f} minutes remaining"
            elif percentage == 50:
                title = "🎯 Halfway There - 2.5 Hours!"
                message = f"Excellent focus! {remaining_minutes:.0f} minutes left"
            elif percentage == 75:
                title = "🔥 75% Complete - Final Stretch!"
                message = f"Amazing progress! Just {remaining_minutes:.0f} minutes to go"
            elif percentage == 90:
                title = "🏁 90% Done - Almost There!"
                message = f"Outstanding session! Only {remaining_minutes:.0f} minutes left"
            elif percentage == 100:
                title = "🎉 5-Hour Session Complete!"
                message = "Incredible deep work session finished! Check your dashboard for stats."
            else:
                title = f"📊 {percentage}% Progress Update"
                message = f"{remaining_minutes:.0f} minutes remaining in session"
                
            success = self.notification_manager.send_notification(
                title=title,
                message=message,
                sound='Ping'
            )
            
            if success:
                notification['sent'] = True
                notification['sent_time'] = datetime.now()
                self.metrics['notifications_sent'] += 1
                
                # Add to timer config
                timer_config['milestones_reached'].append(percentage)
                timer_config['notifications_sent'].append({
                    'type': 'milestone',
                    'percentage': percentage,
                    'timestamp': datetime.now(),
                    'success': True
                })
                
                logger.info(f"📱 Milestone notification sent: {percentage}% for {timer_id}")
                
        except Exception as e:
            logger.error(f"Error sending milestone notification: {e}")
            
    def _send_completion_notification(self, timer_config: Dict):
        """Send session completion notification with stats"""
        try:
            session_id = timer_config.get('session_id', 'Unknown')
            actual_duration = timer_config.get('actual_duration_seconds', 0) / 3600
            
            title = "🎉 5-Hour Claude Session Complete!"
            message = (f"Session: {session_id[:8]}...\n"
                      f"Duration: {actual_duration:.1f} hours\n"
                      f"Milestones: {len(timer_config['milestones_reached'])}/5\n"
                      f"Check dashboard for token stats!")
                      
            success = self.notification_manager.send_notification(
                title=title,
                message=message,
                sound='Hero'  # macOS celebration sound
            )
            
            if success:
                self.metrics['notifications_sent'] += 1
                
        except Exception as e:
            logger.error(f"Error sending completion notification: {e}")
            
    def _process_scheduled_notifications(self):
        """Process any due notifications"""
        now = datetime.now()
        
        # Clean up sent notifications
        self.scheduled_notifications = [
            n for n in self.scheduled_notifications 
            if not n['sent'] or (now - n.get('sent_time', now)).total_seconds() < 3600
        ]
        
    def _cleanup_old_timers(self):
        """Clean up old timer data"""
        # Remove very old scheduled notifications
        cutoff = datetime.now() - timedelta(hours=24)
        self.scheduled_notifications = [
            n for n in self.scheduled_notifications
            if n['notification_time'] > cutoff
        ]
        
    def _update_average_duration(self):
        """Update average session duration metric"""
        if self.timer_history:
            total_duration = sum(
                t.get('actual_duration_seconds', 0) 
                for t in self.timer_history
                if t.get('actual_duration_seconds')
            )
            count = len([t for t in self.timer_history if t.get('actual_duration_seconds')])
            
            if count > 0:
                self.metrics['average_session_duration'] = total_duration / count / 3600  # Convert to hours
                
    def _notify_timer_event(self, event_type: str, data: Dict):
        """Notify other agents of timer events"""
        for callback in self.timer_callbacks:
            try:
                callback(event_type, data)
            except Exception as e:
                logger.error(f"Timer callback error: {e}")
                
    def get_active_timers_status(self) -> Dict:
        """Get status of all active timers"""
        return {
            'active_count': len(self.active_timers),
            'timers': {
                timer_id: {
                    'session_id': config.get('session_id'),
                    'progress_percentage': config.get('progress_percentage', 0),
                    'remaining_seconds': config.get('remaining_seconds', 0),
                    'milestones_reached': len(config.get('milestones_reached', [])),
                    'confidence': config.get('confidence', 0.0)
                }
                for timer_id, config in self.active_timers.items()
            }
        }
        
    def add_timer_callback(self, callback):
        """Add callback for timer events"""
        self.timer_callbacks.append(callback)
        
    def get_agent_status(self) -> Dict:
        """Get comprehensive agent status"""
        return {
            'agent_id': self.agent_id,
            'status': 'running' if self.is_running else 'stopped',
            'startup_time': self.startup_time.isoformat(),
            'metrics': dict(self.metrics),
            'active_timers': self.get_active_timers_status(),
            'scheduled_notifications': len(self.scheduled_notifications),
            'timer_history_count': len(self.timer_history)
        }
        
    def stop(self):
        """Stop timer agent"""
        logger.info("Stopping Timer Agent")
        
        self.is_running = False
        
        # Complete any active timers gracefully
        for timer_id in list(self.active_timers.keys()):
            timer_config = self.active_timers[timer_id]
            timer_config['status'] = 'stopped'
            
        if self.precision_timer:
            self.precision_timer.stop_all_timers()
            
        if self.timer_thread:
            self.timer_thread.join(timeout=5)
            
        if self.notification_thread:
            self.notification_thread.join(timeout=5)
            
        logger.info("✅ Timer Agent stopped")


class FiveHourPrecisionTimer:
    """Core precision timer engine"""
    
    def __init__(self):
        self.active_timers = {}
        
    def start_timer(self, timer_config: Dict):
        """Start a precision timer"""
        timer_id = timer_config['id']
        self.active_timers[timer_id] = timer_config
        logger.debug(f"Started precision timer: {timer_id}")
        
    def update_timer(self, timer_id: str, timer_config: Dict):
        """Update timer state"""
        if timer_id in self.active_timers:
            self.active_timers[timer_id].update(timer_config)
            
    def stop_all_timers(self):
        """Stop all active timers"""
        self.active_timers.clear()


class NotificationManager:
    """Enhanced macOS notification manager"""
    
    def __init__(self):
        self.app_name = "Claude Code Optimizer"
        
    def send_notification(self, title: str, message: str, sound: str = None) -> bool:
        """Send macOS notification"""
        try:
            # Use AppleScript for rich notifications
            sound_script = f'sound name "{sound}"' if sound else ''
            
            applescript = f'''
            display notification "{message}" with title "{title}" subtitle "Claude Session Timer" {sound_script}
            '''
            
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            return result.returncode == 0
            
        except Exception as e:
            logger.error(f"Notification error: {e}")
            return False


def main():
    """Main entry point for timer agent"""
    agent = TimerAgent()
    
    try:
        # Initialize agent
        if not agent.initialize():
            logger.error("Failed to initialize timer agent")
            return 1
            
        # Start timer service
        agent.start_timer_service()
        
        # Test timer start
        test_session = {'id': f"test_session_{int(time.time())}"}
        test_validation = {
            'approved': True,
            'confidence': 0.95,
            'approval_reason': 'High confidence test session'
        }
        
        result = agent.start_session_timer(test_session, test_validation)
        print(f"\n🕐 Test Timer Result:")
        print(f"   Success: {result['success']}")
        print(f"   Timer ID: {result.get('timer_id')}")
        print(f"   Confidence: {result.get('confidence', 0):.2%}")
        
        logger.info("Timer agent running. Press Ctrl+C to stop.")
        
        # Status reporting
        while agent.is_running:
            time.sleep(30)
            status = agent.get_agent_status()
            logger.info(f"Timers: {status['active_timers']['active_count']} active, "
                       f"{status['metrics']['timers_completed']} completed")
            
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