#!/usr/bin/env python3
"""
Real-time Claude Code Activity Tracker
Monitors all Claude Code interactions and activities
"""

import time
import logging
from datetime import datetime
from typing import Dict, List

class ActivityTracker:
    """Tracks Claude Code activity in real-time"""
    
    def __init__(self):
        self.logger = logging.getLogger('ActivityTracker')
        self.activities = []
        self.last_activity = None
    
    def track_activity(self, activity_type: str, details: Dict):
        """Track a new activity"""
        activity = {
            'timestamp': datetime.now(),
            'type': activity_type,
            'details': details
        }
        
        self.activities.append(activity)
        self.last_activity = activity
        
        self.logger.debug(f"Activity tracked: {activity_type}")
    
    def get_recent_activities(self, limit: int = 10) -> List[Dict]:
        """Get recent activities"""
        return self.activities[-limit:]
    
    def is_active(self) -> bool:
        """Check if system is currently active"""
        if not self.last_activity:
            return False
        
        time_since_last = (datetime.now() - self.last_activity['timestamp']).seconds
        return time_since_last < 300  # Active if activity within 5 minutes

if __name__ == "__main__":
    tracker = ActivityTracker()
    print("Activity tracker ready")