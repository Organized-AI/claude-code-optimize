#!/usr/bin/env python3
"""
Five Hour Precision Timer for Claude Code Optimizer
===================================================

Precision 5-hour session timers with validated starts (>90% confidence only).
Real-time progress tracking, milestone alerts, and calendar integration.

Features:
- >90% confidence requirement before timer start
- Real-time progress tracking with sub-second precision
- Milestone notifications (25%, 50%, 75%, 90%, 100%)
- macOS notification scheduling with custom sounds
- AppleScript calendar integration for productivity blocks
- Integration with SessionCoordinator and validation agents
"""

import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Callable
from dataclasses import dataclass
from collections import deque
import json
import logging
import subprocess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [PRECISION-TIMER] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('logs/precision-timer.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class TimerMilestone:
    """Timer milestone definition"""
    percentage: int
    notification_title: str
    notification_message: str
    sound: str = 'Ping'
    triggered: bool = False
    trigger_time: Optional[datetime] = None


@dataclass
class PrecisionTimer:
    """Precision timer instance"""
    timer_id: str
    session_id: str
    start_time: datetime
    duration_hours: float
    confidence: float
    validation_data: Dict
    
    # Timer state
    status: str = 'active'  # active, completed, stopped
    elapsed_seconds: float = 0.0
    remaining_seconds: float = 0.0
    progress_percentage: float = 0.0
    
    # Milestones
    milestones: List[TimerMilestone] = None
    milestones_reached: List[int] = None
    
    # Callbacks
    callbacks: List[Callable] = None
    
    def __post_init__(self):
        if self.milestones is None:
            self.milestones = self._create_default_milestones()
        if self.milestones_reached is None:
            self.milestones_reached = []
        if self.callbacks is None:
            self.callbacks = []
            
        # Calculate total duration in seconds
        self.total_seconds = self.duration_hours * 3600
        
    def _create_default_milestones(self) -> List[TimerMilestone]:
        """Create default milestone notifications"""
        return [
            TimerMilestone(
                percentage=25,
                notification_title="⚡ 25% Progress - 1.25 Hours In!",
                notification_message="Great momentum! 3.75 hours remaining",
                sound='Glass'
            ),
            TimerMilestone(
                percentage=50,
                notification_title="🎯 Halfway There - 2.5 Hours!",
                notification_message="Excellent focus! 2.5 hours left",
                sound='Ping'
            ),
            TimerMilestone(
                percentage=75,
                notification_title="🔥 75% Complete - Final Stretch!",
                notification_message="Amazing progress! Just 1.25 hours to go",
                sound='Purr'
            ),
            TimerMilestone(
                percentage=90,
                notification_title="🏁 90% Done - Almost There!",
                notification_message="Outstanding session! Only 30 minutes left",
                sound='Hero'
            ),
            TimerMilestone(
                percentage=100,
                notification_title="🎉 5-Hour Session Complete!",
                notification_message="Incredible deep work session finished! Check dashboard for stats.",
                sound='Fanfare'
            )
        ]
        
    def update_progress(self) -> bool:
        """Update timer progress and check milestones"""
        now = datetime.now()
        self.elapsed_seconds = (now - self.start_time).total_seconds()
        self.remaining_seconds = max(0, self.total_seconds - self.elapsed_seconds)
        self.progress_percentage = min(100.0, (self.elapsed_seconds / self.total_seconds) * 100)
        
        # Check completion
        if self.progress_percentage >= 100.0:
            self.status = 'completed'
            
        # Check milestones
        milestones_triggered = []
        for milestone in self.milestones:
            if (not milestone.triggered and 
                self.progress_percentage >= milestone.percentage):
                milestone.triggered = True
                milestone.trigger_time = now
                milestones_triggered.append(milestone)
                
                if milestone.percentage not in self.milestones_reached:
                    self.milestones_reached.append(milestone.percentage)
                    
        # Notify callbacks of milestone triggers
        for milestone in milestones_triggered:
            for callback in self.callbacks:
                try:
                    callback('milestone_reached', {
                        'timer_id': self.timer_id,
                        'session_id': self.session_id,
                        'milestone': milestone,
                        'progress': self.progress_percentage,
                        'remaining_seconds': self.remaining_seconds
                    })
                except Exception as e:
                    logger.error(f"Callback error: {e}")
                    
        return len(milestones_triggered) > 0
        
    def get_formatted_time_remaining(self) -> str:
        """Get human-readable time remaining"""
        if self.remaining_seconds <= 0:
            return "0:00:00"
            
        hours = int(self.remaining_seconds // 3600)
        minutes = int((self.remaining_seconds % 3600) // 60)
        seconds = int(self.remaining_seconds % 60)
        
        return f"{hours}:{minutes:02d}:{seconds:02d}"
        
    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""
        return {
            'timer_id': self.timer_id,
            'session_id': self.session_id,
            'start_time': self.start_time.isoformat(),
            'duration_hours': self.duration_hours,
            'confidence': self.confidence,
            'status': self.status,
            'elapsed_seconds': self.elapsed_seconds,
            'remaining_seconds': self.remaining_seconds,
            'progress_percentage': self.progress_percentage,
            'milestones_reached': self.milestones_reached,
            'time_remaining_formatted': self.get_formatted_time_remaining()
        }


class NotificationManager:
    """Enhanced macOS notification manager"""
    
    def __init__(self):
        self.app_name = "Claude Code Optimizer"
        self.notification_history = deque(maxlen=50)
        
    def send_notification(self, title: str, message: str, sound: str = 'Ping') -> bool:
        """Send macOS notification with sound"""
        try:
            # Use AppleScript for rich notifications
            sound_script = f'sound name "{sound}"' if sound else ''
            
            applescript = f'''
            display notification "{message}" with title "{title}" subtitle "{self.app_name}" {sound_script}
            '''
            
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            success = result.returncode == 0
            
            # Log notification
            notification_record = {
                'timestamp': datetime.now(),
                'title': title,
                'message': message,
                'sound': sound,
                'success': success
            }
            self.notification_history.append(notification_record)
            
            if success:
                logger.info(f"📱 Notification sent: {title}")
            else:
                logger.error(f"❌ Notification failed: {result.stderr}")
                
            return success
            
        except Exception as e:
            logger.error(f"Notification error: {e}")
            return False
            
    def get_notification_history(self) -> List[Dict]:
        """Get recent notification history"""
        return [
            {
                **record,
                'timestamp': record['timestamp'].isoformat()
            }
            for record in self.notification_history
        ]


class CalendarManager:
    """AppleScript calendar integration manager"""
    
    def __init__(self, calendar_name: str = "Claude 5hr Sessions"):
        self.calendar_name = calendar_name
        
    def create_session_event(self, timer: PrecisionTimer) -> bool:
        """Create calendar event for 5-hour session"""
        try:
            start_time = timer.start_time
            end_time = start_time + timedelta(hours=timer.duration_hours)
            
            # AppleScript for Calendar.app
            applescript = f'''
            tell application "Calendar"
                if not (exists calendar "{self.calendar_name}") then
                    make new calendar with properties {{name:"{self.calendar_name}"}}
                end if
                
                tell calendar "{self.calendar_name}"
                    set newEvent to make new event with properties {{
                        summary:"🚀 Claude 5hr Productivity Block",
                        start date:date "{start_time.strftime('%B %d, %Y %I:%M:%S %p')}",
                        end date:date "{end_time.strftime('%B %d, %Y %I:%M:%S %p')}"
                    }}
                    
                    set description of newEvent to "Session: {timer.session_id}
Timer: {timer.timer_id}
Confidence: {timer.confidence:.1%}
                    
🎯 5-Hour Deep Work Session
⚡ Real-time progress tracking
📊 Token metrics correlation
🔔 Milestone notifications enabled
                    
Generated by Claude Code Optimizer Precision Timer"
                    
                    -- Add 5-minute warning alarm
                    set alarms of newEvent to {{make new sound alarm with properties {{trigger interval:-300}}}}
                end tell
            end tell
            '''
            
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            success = result.returncode == 0
            
            if success:
                logger.info(f"📅 Calendar event created for timer {timer.timer_id}")
            else:
                logger.error(f"❌ Calendar creation failed: {result.stderr}")
                
            return success
            
        except Exception as e:
            logger.error(f"Calendar integration error: {e}")
            return False


class FiveHourPrecisionTimer:
    """
    Main precision timer manager
    
    Manages validated 5-hour session timers with milestone notifications,
    calendar integration, and real-time progress tracking.
    """
    
    def __init__(self):
        self.timer_id_counter = 0
        self.active_timers: Dict[str, PrecisionTimer] = {}
        self.timer_history = deque(maxlen=100)
        
        # Managers
        self.notification_manager = NotificationManager()
        self.calendar_manager = CalendarManager()
        
        # Threading
        self.is_running = False
        self.update_thread = None
        self.update_interval = 1.0  # 1 second precision
        
        # Callbacks
        self.timer_callbacks = []
        
        logger.info("🕐 Five Hour Precision Timer initialized")
        
    def start_timer(self, session_id: str, confidence: float, validation_data: Dict,
                   duration_hours: float = 5.0) -> Optional[str]:
        """
        Start precision timer for validated session
        
        Args:
            session_id: Session identifier
            confidence: Validation confidence score
            validation_data: Complete validation results
            duration_hours: Timer duration (default 5 hours)
            
        Returns:
            Timer ID if started successfully, None otherwise
        """
        
        # Validate confidence threshold
        if confidence < 0.90:
            logger.warning(f"❌ Timer rejected: confidence {confidence:.1%} below 90% threshold")
            return None
            
        # Generate timer ID
        self.timer_id_counter += 1
        timer_id = f"timer_{int(time.time())}_{self.timer_id_counter}"
        
        # Create precision timer
        timer = PrecisionTimer(
            timer_id=timer_id,
            session_id=session_id,
            start_time=datetime.now(),
            duration_hours=duration_hours,
            confidence=confidence,
            validation_data=validation_data
        )
        
        # Add progress callback
        def timer_callback(event_type, data):
            self._handle_timer_event(event_type, data)
        timer.callbacks.append(timer_callback)
        
        # Store timer
        self.active_timers[timer_id] = timer
        
        # Start update thread if not running
        if not self.is_running:
            self.start_update_loop()
            
        # Create calendar event
        self.calendar_manager.create_session_event(timer)
        
        # Send start notification
        self.notification_manager.send_notification(
            title="🚀 5-Hour Claude Session Started",
            message=f"High-confidence session detected ({confidence:.1%})\n"
                   f"Session: {session_id[:8]}...\n"
                   f"Timer: {duration_hours} hours with milestone alerts",
            sound='Glass'
        )
        
        # Notify callbacks
        for callback in self.timer_callbacks:
            try:
                callback('timer_started', timer.to_dict())
            except Exception as e:
                logger.error(f"Timer callback error: {e}")
                
        logger.info(f"✅ Timer started: {timer_id} for session {session_id} "
                   f"(confidence: {confidence:.2%})")
        
        return timer_id
        
    def stop_timer(self, timer_id: str, reason: str = 'manual_stop') -> bool:
        """Stop specific timer"""
        if timer_id not in self.active_timers:
            logger.warning(f"Timer {timer_id} not found")
            return False
            
        timer = self.active_timers[timer_id]
        timer.status = 'stopped'
        
        # Move to history
        self.timer_history.append(timer)
        del self.active_timers[timer_id]
        
        # Notify callbacks
        for callback in self.timer_callbacks:
            try:
                callback('timer_stopped', {
                    **timer.to_dict(),
                    'stop_reason': reason
                })
            except Exception as e:
                logger.error(f"Timer callback error: {e}")
                
        logger.info(f"⏹️ Timer stopped: {timer_id} ({reason})")
        return True
        
    def start_update_loop(self):
        """Start timer update loop"""
        if self.is_running:
            return
            
        self.is_running = True
        self.update_thread = threading.Thread(
            target=self._update_loop,
            daemon=True
        )
        self.update_thread.start()
        logger.info("🔄 Timer update loop started")
        
    def _update_loop(self):
        """Main timer update loop with precision timing"""
        while self.is_running:
            try:
                current_time = time.time()
                
                # Update all active timers
                completed_timers = []
                
                for timer_id, timer in self.active_timers.items():
                    # Update progress
                    milestones_triggered = timer.update_progress()
                    
                    # Check if completed
                    if timer.status == 'completed':
                        completed_timers.append(timer_id)
                        
                # Handle completed timers
                for timer_id in completed_timers:
                    self._complete_timer(timer_id)
                    
                # Maintain precise timing
                elapsed = time.time() - current_time
                sleep_time = max(0, self.update_interval - elapsed)
                time.sleep(sleep_time)
                
            except Exception as e:
                logger.error(f"Timer update loop error: {e}")
                time.sleep(self.update_interval)
                
    def _complete_timer(self, timer_id: str):
        """Handle timer completion"""
        if timer_id not in self.active_timers:
            return
            
        timer = self.active_timers[timer_id]
        completion_time = datetime.now()
        actual_duration = (completion_time - timer.start_time).total_seconds()
        
        # Move to history
        timer.status = 'completed'
        self.timer_history.append(timer)
        del self.active_timers[timer_id]
        
        # Send completion notification
        self.notification_manager.send_notification(
            title="🎉 5-Hour Claude Session Complete!",
            message=f"Session: {timer.session_id[:8]}...\n"
                   f"Duration: {actual_duration/3600:.1f} hours\n"
                   f"Milestones: {len(timer.milestones_reached)}/5\n"
                   f"Check dashboard for complete stats!",
            sound='Fanfare'
        )
        
        # Notify callbacks
        completion_data = {
            **timer.to_dict(),
            'completion_time': completion_time.isoformat(),
            'actual_duration_seconds': actual_duration
        }
        
        for callback in self.timer_callbacks:
            try:
                callback('timer_completed', completion_data)
            except Exception as e:
                logger.error(f"Timer callback error: {e}")
                
        logger.info(f"🎉 Timer completed: {timer_id} "
                   f"(actual duration: {actual_duration/3600:.1f}h)")
                   
    def _handle_timer_event(self, event_type: str, data: Dict):
        """Handle timer events (milestones, etc.)"""
        if event_type == 'milestone_reached':
            milestone = data['milestone']
            timer_id = data['timer_id']
            
            # Send milestone notification
            self.notification_manager.send_notification(
                title=milestone.notification_title,
                message=milestone.notification_message,
                sound=milestone.sound
            )
            
            logger.info(f"🎯 Milestone reached: {milestone.percentage}% for {timer_id}")
            
    def get_active_timers_status(self) -> Dict:
        """Get status of all active timers"""
        return {
            'active_count': len(self.active_timers),
            'timers': {
                timer_id: timer.to_dict()
                for timer_id, timer in self.active_timers.items()
            }
        }
        
    def get_timer_history(self, limit: int = 10) -> List[Dict]:
        """Get recent timer history"""
        return [
            timer.to_dict() if hasattr(timer, 'to_dict') else timer
            for timer in list(self.timer_history)[-limit:]
        ]
        
    def add_timer_callback(self, callback: Callable):
        """Add callback for timer events"""
        self.timer_callbacks.append(callback)
        
    def stop_all_timers(self):
        """Stop all active timers and update loop"""
        # Stop all timers
        for timer_id in list(self.active_timers.keys()):
            self.stop_timer(timer_id, 'shutdown')
            
        # Stop update loop
        self.is_running = False
        if self.update_thread:
            self.update_thread.join(timeout=5)
            
        logger.info("✅ All timers stopped")


def main():
    """Test precision timer system"""
    timer_manager = FiveHourPrecisionTimer()
    
    # Add test callback
    def test_callback(event_type, data):
        print(f"\n🕐 TIMER EVENT: {event_type}")
        print(f"   Data: {json.dumps(data, default=str, indent=2)}")
        
    timer_manager.add_timer_callback(test_callback)
    
    # Test timer with high confidence
    test_session_id = f"test_session_{int(time.time())}"
    test_validation = {
        'confidence': 0.95,
        'approved': True,
        'sources': ['claude_code_cli', 'claude_desktop']
    }
    
    timer_id = timer_manager.start_timer(
        session_id=test_session_id,
        confidence=0.95,
        validation_data=test_validation,
        duration_hours=0.1  # 6 minutes for testing
    )
    
    if timer_id:
        print(f"✅ Test timer started: {timer_id}")
        print("Timer will complete in 6 minutes with milestone notifications")
        
        try:
            # Run for test duration
            import time
            time.sleep(360)  # 6 minutes
            
        except KeyboardInterrupt:
            print("\nStopping test...")
            
        finally:
            timer_manager.stop_all_timers()
            
    else:
        print("❌ Failed to start test timer")


if __name__ == "__main__":
    main()