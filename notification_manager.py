#!/usr/bin/env python3
"""
Notification Manager for Claude Code Optimizer
==============================================

Enhanced macOS notification system with precision timing and custom scheduling.

Features:
- Rich macOS notifications with custom sounds
- Scheduled notifications for session milestones
- Notification history and analytics
- Integration with session timing and validation
- Custom notification templates for different events
"""

import subprocess
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field
from collections import deque
from enum import Enum
import threading
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [NOTIFICATION-MANAGER] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('logs/notification-manager.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class NotificationType(Enum):
    """Notification types with different behaviors"""
    SESSION_START = "session_start"
    SESSION_END = "session_end" 
    MILESTONE = "milestone"
    VALIDATION = "validation"
    ERROR = "error"
    INFO = "info"


@dataclass
class NotificationTemplate:
    """Notification template with customizable content"""
    notification_type: NotificationType
    title_template: str
    message_template: str
    sound: str = 'Ping'
    priority: int = 1  # 1=low, 2=medium, 3=high
    
    def format(self, **kwargs) -> Dict:
        """Format template with provided data"""
        return {
            'title': self.title_template.format(**kwargs),
            'message': self.message_template.format(**kwargs),
            'sound': self.sound,
            'priority': self.priority,
            'type': self.notification_type.value
        }


@dataclass 
class ScheduledNotification:
    """Scheduled notification with timing"""
    notification_id: str
    notification_data: Dict
    scheduled_time: datetime
    sent: bool = False
    sent_time: Optional[datetime] = None
    retries: int = 0
    max_retries: int = 3


@dataclass
class NotificationRecord:
    """Record of sent notification"""
    notification_id: str
    timestamp: datetime
    notification_type: str
    title: str
    message: str
    sound: str
    success: bool
    response_time_ms: Optional[float] = None
    retry_count: int = 0


class NotificationManager:
    """
    Enhanced macOS Notification Manager
    
    Manages precision-timed notifications for Claude session tracking
    with custom scheduling, templates, and analytics.
    """
    
    def __init__(self, app_name: str = "Claude Code Optimizer"):
        self.app_name = app_name
        self.notification_id_counter = 0
        
        # Notification storage
        self.notification_history = deque(maxlen=200)
        self.scheduled_notifications: Dict[str, ScheduledNotification] = {}
        
        # Templates
        self.templates = self._create_default_templates()
        
        # Threading for scheduled notifications
        self.is_running = False
        self.scheduler_thread = None
        self.check_interval = 5.0  # Check every 5 seconds
        
        # Analytics
        self.stats = {
            'total_sent': 0,
            'total_failed': 0,
            'total_scheduled': 0,
            'success_rate': 0.0,
            'average_response_time': 0.0
        }
        
        logger.info(f"📱 NotificationManager initialized for {app_name}")
        
    def _create_default_templates(self) -> Dict[NotificationType, NotificationTemplate]:
        """Create default notification templates"""
        return {
            NotificationType.SESSION_START: NotificationTemplate(
                notification_type=NotificationType.SESSION_START,
                title_template="🚀 5-Hour Claude Session Started",
                message_template="High-confidence session detected ({confidence:.1%})\nSession: {session_id}\nTimer: {duration} hours",
                sound='Glass',
                priority=3
            ),
            
            NotificationType.SESSION_END: NotificationTemplate(
                notification_type=NotificationType.SESSION_END,
                title_template="🎉 Claude Session Complete!",
                message_template="Session: {session_id}\nDuration: {duration:.1f} hours\nTokens: {tokens:,}\nCheck dashboard for stats!",
                sound='Fanfare',
                priority=3
            ),
            
            NotificationType.MILESTONE: NotificationTemplate(
                notification_type=NotificationType.MILESTONE,
                title_template="{milestone_title}",
                message_template="{milestone_message}\n{time_remaining} remaining",
                sound='Ping',
                priority=2
            ),
            
            NotificationType.VALIDATION: NotificationTemplate(
                notification_type=NotificationType.VALIDATION,
                title_template="🎯 Session Validation {status}",
                message_template="Confidence: {confidence:.1%}\nSources: {sources}\n{reason}",
                sound='Purr',
                priority=2
            ),
            
            NotificationType.ERROR: NotificationTemplate(
                notification_type=NotificationType.ERROR,
                title_template="⚠️ Claude Optimizer Error",
                message_template="{error_message}",
                sound='Basso',
                priority=3
            ),
            
            NotificationType.INFO: NotificationTemplate(
                notification_type=NotificationType.INFO,
                title_template="ℹ️ Claude Optimizer",
                message_template="{info_message}",
                sound='Ping',
                priority=1
            )
        }
        
    def send_notification(self, notification_type: NotificationType, 
                         data: Dict, immediate: bool = True) -> Optional[str]:
        """
        Send notification using template
        
        Args:
            notification_type: Type of notification
            data: Data for template formatting
            immediate: Send immediately or return notification_id for scheduling
            
        Returns:
            Notification ID if successful
        """
        
        # Generate notification ID
        self.notification_id_counter += 1
        notification_id = f"notif_{int(time.time())}_{self.notification_id_counter}"
        
        # Get template
        template = self.templates.get(notification_type)
        if not template:
            logger.error(f"No template found for {notification_type}")
            return None
            
        # Format notification
        try:
            notification_data = template.format(**data)
            notification_data['notification_id'] = notification_id
        except KeyError as e:
            logger.error(f"Template formatting error: missing key {e}")
            return None
            
        if immediate:
            # Send immediately
            success = self._send_macos_notification(notification_data)
            return notification_id if success else None
        else:
            # Return for scheduling
            return notification_id, notification_data
            
    def send_custom_notification(self, title: str, message: str, 
                                sound: str = 'Ping', priority: int = 1) -> bool:
        """Send custom notification without template"""
        
        notification_id = f"custom_{int(time.time())}_{self.notification_id_counter}"
        self.notification_id_counter += 1
        
        notification_data = {
            'notification_id': notification_id,
            'title': title,
            'message': message,
            'sound': sound,
            'priority': priority,
            'type': 'custom'
        }
        
        return self._send_macos_notification(notification_data)
        
    def schedule_notification(self, notification_type: NotificationType,
                            data: Dict, delay_seconds: float) -> Optional[str]:
        """Schedule notification for future delivery"""
        
        # Create notification data
        result = self.send_notification(notification_type, data, immediate=False)
        if not result:
            return None
            
        notification_id, notification_data = result
        scheduled_time = datetime.now() + timedelta(seconds=delay_seconds)
        
        # Create scheduled notification
        scheduled_notification = ScheduledNotification(
            notification_id=notification_id,
            notification_data=notification_data,
            scheduled_time=scheduled_time
        )
        
        self.scheduled_notifications[notification_id] = scheduled_notification
        self.stats['total_scheduled'] += 1
        
        # Start scheduler if not running
        if not self.is_running:
            self.start_scheduler()
            
        logger.info(f"📅 Notification scheduled: {notification_id} for {scheduled_time}")
        return notification_id
        
    def schedule_milestone_notifications(self, session_data: Dict) -> List[str]:
        """Schedule milestone notifications for 5-hour session"""
        
        session_id = session_data.get('session_id')
        start_time = datetime.fromisoformat(session_data.get('start_time', datetime.now().isoformat()))
        duration_hours = session_data.get('duration_hours', 5.0)
        
        milestones = [
            {'percentage': 25, 'title': '⚡ 25% Progress - 1.25 Hours In!', 'message': 'Great momentum!'},
            {'percentage': 50, 'title': '🎯 Halfway There - 2.5 Hours!', 'message': 'Excellent focus!'},
            {'percentage': 75, 'title': '🔥 75% Complete - Final Stretch!', 'message': 'Amazing progress!'},
            {'percentage': 90, 'title': '🏁 90% Done - Almost There!', 'message': 'Outstanding session!'},
            {'percentage': 100, 'title': '🎉 5-Hour Session Complete!', 'message': 'Incredible achievement!'}
        ]
        
        scheduled_ids = []
        total_seconds = duration_hours * 3600
        
        for milestone in milestones:
            # Calculate delay
            milestone_seconds = (milestone['percentage'] / 100) * total_seconds
            delay = milestone_seconds
            
            # Calculate remaining time
            remaining_seconds = total_seconds - milestone_seconds
            remaining_hours = remaining_seconds / 3600
            
            milestone_data = {
                'milestone_title': milestone['title'],
                'milestone_message': milestone['message'],
                'time_remaining': f"{remaining_hours:.1f} hours",
                'session_id': session_id,
                'percentage': milestone['percentage']
            }
            
            notification_id = self.schedule_notification(
                NotificationType.MILESTONE,
                milestone_data,
                delay
            )
            
            if notification_id:
                scheduled_ids.append(notification_id)
                
        logger.info(f"📅 Scheduled {len(scheduled_ids)} milestone notifications for {session_id}")
        return scheduled_ids
        
    def start_scheduler(self):
        """Start notification scheduler thread"""
        if self.is_running:
            return
            
        self.is_running = True
        self.scheduler_thread = threading.Thread(
            target=self._scheduler_loop,
            daemon=True
        )
        self.scheduler_thread.start()
        logger.info("🔄 Notification scheduler started")
        
    def _scheduler_loop(self):
        """Main scheduler loop"""
        while self.is_running:
            try:
                current_time = datetime.now()
                due_notifications = []
                
                # Find due notifications
                for notification_id, scheduled_notif in self.scheduled_notifications.items():
                    if (not scheduled_notif.sent and 
                        current_time >= scheduled_notif.scheduled_time):
                        due_notifications.append(notification_id)
                        
                # Send due notifications
                for notification_id in due_notifications:
                    self._send_scheduled_notification(notification_id)
                    
                # Clean up old notifications
                self._cleanup_old_scheduled_notifications()
                
                time.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
                time.sleep(self.check_interval)
                
    def _send_scheduled_notification(self, notification_id: str):
        """Send scheduled notification"""
        if notification_id not in self.scheduled_notifications:
            return
            
        scheduled_notif = self.scheduled_notifications[notification_id]
        
        if scheduled_notif.sent:
            return
            
        # Attempt to send
        success = self._send_macos_notification(scheduled_notif.notification_data)
        
        if success:
            scheduled_notif.sent = True
            scheduled_notif.sent_time = datetime.now()
            logger.info(f"📱 Scheduled notification sent: {notification_id}")
        else:
            scheduled_notif.retries += 1
            if scheduled_notif.retries >= scheduled_notif.max_retries:
                logger.error(f"❌ Scheduled notification failed after {scheduled_notif.retries} retries: {notification_id}")
                scheduled_notif.sent = True  # Mark as sent to stop retries
            else:
                # Reschedule for retry in 30 seconds
                scheduled_notif.scheduled_time = datetime.now() + timedelta(seconds=30)
                logger.warning(f"🔄 Retrying scheduled notification in 30s: {notification_id}")
                
    def _send_macos_notification(self, notification_data: Dict) -> bool:
        """Send notification via macOS"""
        try:
            start_time = time.time()
            
            title = notification_data.get('title', 'Claude Code Optimizer')
            message = notification_data.get('message', '')
            sound = notification_data.get('sound', 'Ping')
            
            # Build AppleScript
            sound_script = f'sound name "{sound}"' if sound else ''
            
            applescript = f'''
            display notification "{message}" with title "{title}" subtitle "{self.app_name}" {sound_script}
            '''
            
            # Execute notification
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            response_time = (time.time() - start_time) * 1000  # milliseconds
            success = result.returncode == 0
            
            # Record notification
            record = NotificationRecord(
                notification_id=notification_data.get('notification_id', 'unknown'),
                timestamp=datetime.now(),
                notification_type=notification_data.get('type', 'unknown'),
                title=title,
                message=message,
                sound=sound,
                success=success,
                response_time_ms=response_time
            )
            
            self.notification_history.append(record)
            
            # Update stats
            if success:
                self.stats['total_sent'] += 1
            else:
                self.stats['total_failed'] += 1
                logger.error(f"❌ Notification failed: {result.stderr}")
                
            self._update_stats()
            
            return success
            
        except Exception as e:
            logger.error(f"macOS notification error: {e}")
            
            # Record failed notification
            record = NotificationRecord(
                notification_id=notification_data.get('notification_id', 'unknown'),
                timestamp=datetime.now(),
                notification_type=notification_data.get('type', 'unknown'),
                title=notification_data.get('title', ''),
                message=notification_data.get('message', ''),
                sound=notification_data.get('sound', ''),
                success=False
            )
            
            self.notification_history.append(record)
            self.stats['total_failed'] += 1
            self._update_stats()
            
            return False
            
    def _update_stats(self):
        """Update notification statistics"""
        total = self.stats['total_sent'] + self.stats['total_failed']
        if total > 0:
            self.stats['success_rate'] = self.stats['total_sent'] / total
            
        # Calculate average response time
        successful_notifications = [r for r in self.notification_history 
                                  if r.success and r.response_time_ms]
        if successful_notifications:
            self.stats['average_response_time'] = sum(
                r.response_time_ms for r in successful_notifications
            ) / len(successful_notifications)
            
    def _cleanup_old_scheduled_notifications(self):
        """Clean up old scheduled notifications"""
        cutoff_time = datetime.now() - timedelta(hours=24)
        
        to_remove = []
        for notification_id, scheduled_notif in self.scheduled_notifications.items():
            if (scheduled_notif.sent and 
                scheduled_notif.sent_time and 
                scheduled_notif.sent_time < cutoff_time):
                to_remove.append(notification_id)
                
        for notification_id in to_remove:
            del self.scheduled_notifications[notification_id]
            
    def cancel_scheduled_notification(self, notification_id: str) -> bool:
        """Cancel scheduled notification"""
        if notification_id in self.scheduled_notifications:
            del self.scheduled_notifications[notification_id]
            logger.info(f"❌ Cancelled scheduled notification: {notification_id}")
            return True
        return False
        
    def get_notification_stats(self) -> Dict:
        """Get comprehensive notification statistics"""
        return {
            **self.stats,
            'scheduled_count': len(self.scheduled_notifications),
            'pending_count': sum(1 for n in self.scheduled_notifications.values() if not n.sent),
            'history_count': len(self.notification_history),
            'last_notification': self.notification_history[-1].timestamp.isoformat() 
                               if self.notification_history else None
        }
        
    def get_notification_history(self, limit: int = 20) -> List[Dict]:
        """Get recent notification history"""
        return [
            {
                'notification_id': record.notification_id,
                'timestamp': record.timestamp.isoformat(),
                'type': record.notification_type,
                'title': record.title,
                'success': record.success,
                'response_time_ms': record.response_time_ms
            }
            for record in list(self.notification_history)[-limit:]
        ]
        
    def stop_scheduler(self):
        """Stop notification scheduler"""
        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        logger.info("✅ Notification scheduler stopped")


def main():
    """Test notification manager"""
    manager = NotificationManager()
    
    # Test immediate notification
    success = manager.send_notification(
        NotificationType.SESSION_START,
        {
            'confidence': 0.95,
            'session_id': 'test_session_123',
            'duration': 5
        }
    )
    
    print(f"Immediate notification: {'✅' if success else '❌'}")
    
    # Test scheduled notification
    notification_id = manager.schedule_notification(
        NotificationType.INFO,
        {'info_message': 'This is a test scheduled notification'},
        delay_seconds=10
    )
    
    print(f"Scheduled notification: {notification_id}")
    
    # Test milestone scheduling
    session_data = {
        'session_id': 'test_session_milestones',
        'start_time': datetime.now().isoformat(),
        'duration_hours': 0.02  # 1.2 minutes for testing
    }
    
    milestone_ids = manager.schedule_milestone_notifications(session_data)
    print(f"Scheduled {len(milestone_ids)} milestone notifications")
    
    # Wait for scheduled notifications
    import time
    print("Waiting for scheduled notifications...")
    time.sleep(15)
    
    # Show stats
    stats = manager.get_notification_stats()
    print(f"\nNotification Stats:")
    print(f"  Total sent: {stats['total_sent']}")
    print(f"  Success rate: {stats['success_rate']:.1%}")
    print(f"  Scheduled: {stats['scheduled_count']}")
    
    manager.stop_scheduler()


if __name__ == "__main__":
    main()