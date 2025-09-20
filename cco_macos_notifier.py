#!/usr/bin/env python3
"""
CCO macOS Notification Service
Provides live session monitoring with native macOS notifications
Shows token percentage and time to session end
"""

import subprocess
import time
import json
import sqlite3
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

class CCONotificationService:
    def __init__(self, db_path="claude_usage.db", notification_interval=300):  # 5 minutes default
        self.db_path = db_path
        self.notification_interval = notification_interval
        self.last_notification = None
        self.session_start_tokens = None
        self.session_start_time = None
        
        # Notification thresholds for token usage (percentages of 5-hour limit)
        self.token_thresholds = [25, 50, 75, 85, 95]
        self.notified_thresholds = set()
        
        # Time-based notification milestones (hours)
        self.time_thresholds = [1.0, 2.0, 3.0, 4.0, 4.5]
        self.notified_time_thresholds = set()
    
    def send_macos_notification(self, title, message, subtitle="", sound="default"):
        """Send native macOS notification using osascript"""
        try:
            # Build the AppleScript command
            script = f'''
            display notification "{message}" with title "{title}" subtitle "{subtitle}" sound name "{sound}"
            '''
            
            # Execute the AppleScript
            subprocess.run(['osascript', '-e', script], 
                          capture_output=True, check=True)
            print(f"✅ Notification sent: {title} - {message}")
            return True
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to send notification: {e}")
            return False
        except Exception as e:
            print(f"❌ Notification error: {e}")
            return False
    
    def get_current_session_data(self):
        """Extract current session data from CCO simple status"""
        try:
            # Run cco_simple.py status and parse output
            result = subprocess.run([
                sys.executable, "cco_simple.py", "status"
            ], capture_output=True, text=True, cwd=os.path.dirname(__file__))
            
            if result.returncode != 0:
                return None
            
            output = result.stdout
            session_data = {}
            
            # Parse the status output
            for line in output.split('\n'):
                if 'Duration:' in line:
                    duration_str = line.split('Duration:')[1].strip().split()[0]
                    session_data['duration_hours'] = float(duration_str)
                elif 'Tokens:' in line:
                    tokens_str = line.split('Tokens:')[1].strip().replace(',', '')
                    session_data['tokens'] = int(tokens_str)
                elif 'Model:' in line:
                    session_data['model'] = line.split('Model:')[1].strip()
                elif 'Time remaining:' in line:
                    remaining_str = line.split('Time remaining:')[1].strip().split('h')[0]
                    session_data['time_remaining'] = float(remaining_str)
                elif '5-hour block progress:' in line:
                    # Extract percentage from "2.3h / 5.0h (46%)"
                    progress_part = line.split('(')[1].split('%')[0]
                    session_data['block_progress_percent'] = int(progress_part)
            
            return session_data
            
        except Exception as e:
            print(f"Error getting session data: {e}")
            return None
    
    def calculate_token_percentage(self, current_tokens, duration_hours):
        """Calculate token usage as percentage of typical 5-hour limit"""
        # Estimate tokens per hour and project to 5-hour limit
        if duration_hours > 0:
            tokens_per_hour = current_tokens / duration_hours
            estimated_5h_tokens = tokens_per_hour * 5
            # Assume ~50k tokens as reasonable 5-hour limit for notifications
            percentage = (estimated_5h_tokens / 50000) * 100
            return min(percentage, 100)  # Cap at 100%
        return 0
    
    def format_time_remaining(self, hours):
        """Format hours as human-readable time"""
        if hours >= 1:
            return f"{hours:.1f}h"
        else:
            minutes = int(hours * 60)
            return f"{minutes}m"
    
    def should_notify_token_threshold(self, token_percentage):
        """Check if we should notify for token usage threshold"""
        for threshold in self.token_thresholds:
            if token_percentage >= threshold and threshold not in self.notified_thresholds:
                self.notified_thresholds.add(threshold)
                return True, threshold
        return False, None
    
    def should_notify_time_threshold(self, duration_hours):
        """Check if we should notify for time threshold"""
        for threshold in self.time_thresholds:
            if duration_hours >= threshold and threshold not in self.notified_time_thresholds:
                self.notified_time_thresholds.add(threshold)
                return True, threshold
        return False, None
    
    def generate_progress_notification(self, session_data):
        """Generate progress notification based on session data"""
        duration = session_data.get('duration_hours', 0)
        tokens = session_data.get('tokens', 0)
        time_remaining = session_data.get('time_remaining', 0)
        block_progress = session_data.get('block_progress_percent', 0)
        model = session_data.get('model', 'Unknown')
        
        # Calculate token percentage
        token_percentage = self.calculate_token_percentage(tokens, duration)
        
        # Check thresholds
        notify_token, token_threshold = self.should_notify_token_threshold(token_percentage)
        notify_time, time_threshold = self.should_notify_time_threshold(duration)
        
        if notify_token:
            title = f"🔥 {token_threshold}% Token Usage"
            message = f"{tokens:,} tokens • {self.format_time_remaining(time_remaining)} left"
            subtitle = f"{model} • {block_progress}% of 5h block"
            self.send_macos_notification(title, message, subtitle, "Basso")
            return True
        
        elif notify_time:
            title = f"⏰ {time_threshold}h Session Milestone"
            message = f"{tokens:,} tokens • {self.format_time_remaining(time_remaining)} left"
            subtitle = f"{model} • {token_percentage:.0f}% estimated usage"
            self.send_macos_notification(title, message, subtitle, "Tink")
            return True
        
        return False
    
    def send_regular_update(self, session_data):
        """Send regular progress update notification"""
        duration = session_data.get('duration_hours', 0)
        tokens = session_data.get('tokens', 0)
        time_remaining = session_data.get('time_remaining', 0)
        block_progress = session_data.get('block_progress_percent', 0)
        model = session_data.get('model', 'Unknown')
        
        token_percentage = self.calculate_token_percentage(tokens, duration)
        
        title = f"📊 CCO Session Update"
        message = f"{tokens:,} tokens ({token_percentage:.0f}%) • {self.format_time_remaining(time_remaining)} left"
        subtitle = f"{model} • {block_progress}% of 5h block"
        
        self.send_macos_notification(title, message, subtitle, "Glass")
    
    def monitor_session(self, regular_updates=True):
        """Main monitoring loop"""
        print("🚀 CCO macOS Notification Service Started")
        print("=" * 50)
        print(f"📱 Monitoring interval: {self.notification_interval} seconds")
        print(f"🔔 Regular updates: {'Enabled' if regular_updates else 'Disabled'}")
        print(f"🎯 Token thresholds: {self.token_thresholds}%")
        print(f"⏰ Time thresholds: {self.time_thresholds}h")
        print("=" * 50)
        print("Press Ctrl+C to stop monitoring")
        print()
        
        try:
            while True:
                session_data = self.get_current_session_data()
                
                if session_data:
                    print(f"📊 {datetime.now().strftime('%H:%M:%S')} - "
                          f"{session_data.get('tokens', 0):,} tokens, "
                          f"{session_data.get('duration_hours', 0):.1f}h, "
                          f"{session_data.get('time_remaining', 0):.1f}h left")
                    
                    # Check for threshold notifications
                    if not self.generate_progress_notification(session_data):
                        # Send regular update if enabled and enough time has passed
                        if regular_updates:
                            now = datetime.now()
                            if (self.last_notification is None or 
                                (now - self.last_notification).seconds >= self.notification_interval):
                                self.send_regular_update(session_data)
                                self.last_notification = now
                else:
                    print(f"⚠️  {datetime.now().strftime('%H:%M:%S')} - No active session detected")
                
                time.sleep(30)  # Check every 30 seconds
                
        except KeyboardInterrupt:
            print("\n🛑 CCO Notification Service Stopped")
            self.send_macos_notification(
                "🛑 CCO Monitor Stopped",
                "Notification service has been stopped",
                "Claude Code Optimizer"
            )

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='CCO macOS Notification Service')
    parser.add_argument('--interval', '-i', type=int, default=300,
                       help='Notification interval in seconds (default: 300)')
    parser.add_argument('--no-regular-updates', action='store_true',
                       help='Disable regular update notifications')
    parser.add_argument('--test', action='store_true',
                       help='Send test notification and exit')
    
    args = parser.parse_args()
    
    notifier = CCONotificationService(notification_interval=args.interval)
    
    if args.test:
        print("🧪 Sending test notification...")
        session_data = notifier.get_current_session_data()
        if session_data:
            notifier.send_regular_update(session_data)
        else:
            notifier.send_macos_notification(
                "🧪 CCO Test Notification",
                "Notification system is working!",
                "No active session detected"
            )
        return
    
    # Send startup notification
    notifier.send_macos_notification(
        "🚀 CCO Monitor Started",
        "Session monitoring with notifications enabled",
        "Claude Code Optimizer"
    )
    
    # Start monitoring
    notifier.monitor_session(regular_updates=not args.no_regular_updates)

if __name__ == "__main__":
    main()