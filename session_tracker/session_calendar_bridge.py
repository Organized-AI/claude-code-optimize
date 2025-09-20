#!/usr/bin/env python3
"""
Claude Code Optimizer - Session Calendar Bridge
===============================================

Bridge between existing session tracking system and calendar integration.
Automatically creates calendar events when sessions start/end and updates
session records with calendar information.
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import threading
import time

try:
    from calendar_api import CalendarAPI
    CALENDAR_AVAILABLE = True
except ImportError:
    CALENDAR_AVAILABLE = False
    logging.warning("Calendar integration not available")

logger = logging.getLogger(__name__)


class SessionCalendarBridge:
    """
    Bridge between session tracking and calendar integration
    
    Automatically:
    - Creates calendar events when sessions start
    - Updates calendar events when sessions change
    - Tracks session progress in calendar descriptions
    - Manages 5-hour block compliance
    - Provides real-time session monitoring
    """
    
    def __init__(self, database_path: str, config: Dict = None):
        """Initialize the bridge"""
        self.database_path = database_path
        self.config = config or {}
        
        # Calendar API
        self.calendar_api = None
        if CALENDAR_AVAILABLE:
            try:
                self.calendar_api = CalendarAPI(database_path, config)
                logger.info("✅ Calendar API initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Calendar API: {e}")
                
        # Monitoring state
        self.is_monitoring = False
        self.monitor_thread = None
        self.last_check = datetime.now()
        
        # Session state cache
        self.active_sessions = {}
        self.session_calendar_map = {}  # session_id -> calendar_event_id
        
        # Setup logging
        self._setup_logging()
        
    def _setup_logging(self):
        """Setup bridge logging"""
        log_dir = Path.home() / ".cache" / "claude_optimizer" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = log_dir / "session_calendar_bridge.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(
            logging.Formatter('%(asctime)s [BRIDGE] %(levelname)s: %(message)s')
        )
        logger.addHandler(file_handler)
        
    def start_monitoring(self):
        """Start monitoring session changes for calendar updates"""
        if self.is_monitoring:
            logger.warning("Bridge monitoring already running")
            return
            
        if not self.calendar_api:
            logger.error("Calendar API not available - bridge cannot start")
            return
            
        logger.info("🌉 Starting session-calendar bridge monitoring")
        self.is_monitoring = True
        
        # Start monitoring thread
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        # Load existing session state
        self._load_existing_sessions()
        
        logger.info("✅ Session-calendar bridge monitoring started")
        
    def stop_monitoring(self):
        """Stop monitoring"""
        if not self.is_monitoring:
            return
            
        logger.info("🛑 Stopping session-calendar bridge monitoring")
        self.is_monitoring = False
        
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
            
        logger.info("✅ Session-calendar bridge monitoring stopped")
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.is_monitoring:
            try:
                # Check for session changes
                self._check_session_changes()
                
                # Update active session progress
                self._update_active_session_progress()
                
                # Check 5-hour block compliance
                self._check_5hour_block_compliance()
                
                # Sleep before next check
                time.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in bridge monitoring loop: {e}")
                time.sleep(60)  # Wait longer on error
                
    def _load_existing_sessions(self):
        """Load existing active sessions"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, session_type, start_time, estimated_tokens, metadata
                FROM real_sessions 
                WHERE is_active = 1
                ORDER BY start_time DESC
            """)
            
            for row in cursor.fetchall():
                session_id = row[0]
                session_data = {
                    'id': session_id,
                    'session_type': row[1],
                    'start_time': datetime.fromisoformat(row[2]) if row[2] else None,
                    'estimated_tokens': row[3] or 0,
                    'metadata': json.loads(row[4]) if row[4] else {}
                }
                
                self.active_sessions[session_id] = session_data
                
            conn.close()
            
            logger.info(f"📋 Loaded {len(self.active_sessions)} active sessions")
            
        except Exception as e:
            logger.error(f"Error loading existing sessions: {e}")
            
    def _check_session_changes(self):
        """Check for new, ended, or modified sessions"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Check for new active sessions
            cursor.execute("""
                SELECT id, session_type, start_time, estimated_tokens, metadata, 
                       conversation_id, last_token_update
                FROM real_sessions 
                WHERE is_active = 1 AND last_token_update > ?
                ORDER BY start_time DESC
            """, (self.last_check,))
            
            new_or_updated = cursor.fetchall()
            
            for row in new_or_updated:
                session_id = row[0]
                session_data = {
                    'id': session_id,
                    'session_type': row[1],
                    'start_time': datetime.fromisoformat(row[2]) if row[2] else None,
                    'estimated_tokens': row[3] or 0,
                    'metadata': json.loads(row[4]) if row[4] else {},
                    'conversation_id': row[5],
                    'last_update': datetime.fromisoformat(row[6]) if row[6] else None
                }
                
                if session_id not in self.active_sessions:
                    # New session - create calendar event
                    self._handle_new_session(session_data)
                else:
                    # Updated session - update calendar event
                    self._handle_session_update(session_data)
                    
                self.active_sessions[session_id] = session_data
                
            # Check for ended sessions
            cursor.execute("""
                SELECT id FROM real_sessions 
                WHERE is_active = 0 AND last_token_update > ?
            """, (self.last_check,))
            
            ended_sessions = [row[0] for row in cursor.fetchall()]
            
            for session_id in ended_sessions:
                if session_id in self.active_sessions:
                    self._handle_session_end(session_id)
                    del self.active_sessions[session_id]
                    
            conn.close()
            self.last_check = datetime.now()
            
        except Exception as e:
            logger.error(f"Error checking session changes: {e}")
            
    def _handle_new_session(self, session_data: Dict):
        """Handle new session - create calendar event"""
        try:
            session_id = session_data['id']
            start_time = session_data.get('start_time')
            
            if not start_time:
                start_time = datetime.now()
                
            # Determine session template based on session type
            template_map = {
                'claude_code_cli': 'coding',
                'claude_desktop': 'coding',
                'planning': 'planning',
                'testing': 'testing',
                'documentation': 'polish'
            }
            
            template_name = template_map.get(
                session_data.get('session_type', ''), 
                'coding'
            )
            
            # Create calendar event
            result = self.calendar_api.create_session_event(
                template_name=template_name,
                start_time=start_time,
                custom_title=f"Live Session: {session_data.get('conversation_id', session_id)[:8]}...",
                export_options={'google': True, 'ical': False}  # Live sessions don't need iCal
            )
            
            if result['success']:
                event_id = result['event']['event_id']
                self.session_calendar_map[session_id] = event_id
                
                # Update session record with calendar info
                self._update_session_calendar_info(session_id, event_id)
                
                logger.info(f"📅 Created calendar event for new session: {session_id}")
                
            else:
                logger.warning(f"Failed to create calendar event for session {session_id}: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error handling new session: {e}")
            
    def _handle_session_update(self, session_data: Dict):
        """Handle session update - update calendar event"""
        try:
            session_id = session_data['id']
            event_id = self.session_calendar_map.get(session_id)
            
            if not event_id:
                logger.debug(f"No calendar event found for session {session_id}")
                return
                
            # Get current session progress
            progress_info = self._calculate_session_progress(session_data)
            
            # Update calendar event description with progress
            updated_description = self._format_session_progress_description(session_data, progress_info)
            
            # Note: For simplicity, we're not updating Google Calendar events in real-time
            # This could be added as an enhancement
            
            logger.debug(f"📊 Updated progress for session {session_id}: {progress_info['duration_minutes']} minutes")
            
        except Exception as e:
            logger.error(f"Error handling session update: {e}")
            
    def _handle_session_end(self, session_id: str):
        """Handle session end - finalize calendar event"""
        try:
            event_id = self.session_calendar_map.get(session_id)
            
            if event_id:
                # Get final session data
                final_data = self._get_final_session_data(session_id)
                
                if final_data:
                    # Calculate final duration and update calendar event
                    duration = final_data.get('duration_minutes', 0)
                    tokens = final_data.get('total_tokens', 0)
                    
                    logger.info(f"📅 Session ended: {session_id} ({duration} minutes, {tokens} tokens)")
                    
                # Remove from tracking
                if session_id in self.session_calendar_map:
                    del self.session_calendar_map[session_id]
                    
            else:
                logger.debug(f"No calendar event to finalize for session {session_id}")
                
        except Exception as e:
            logger.error(f"Error handling session end: {e}")
            
    def _update_active_session_progress(self):
        """Update progress for all active sessions"""
        current_time = datetime.now()
        
        for session_id, session_data in self.active_sessions.items():
            try:
                start_time = session_data.get('start_time')
                if start_time:
                    duration = (current_time - start_time).total_seconds() / 60  # minutes
                    
                    # Update session with current duration
                    self._update_session_duration(session_id, duration)
                    
            except Exception as e:
                logger.error(f"Error updating session progress for {session_id}: {e}")
                
    def _check_5hour_block_compliance(self):
        """Check if current sessions comply with 5-hour blocks"""
        try:
            # Get current day usage
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            tomorrow = today + timedelta(days=1)
            
            usage = self.calendar_api._get_token_usage_for_period(today, tomorrow)
            
            # Check if approaching limits
            daily_limit = 19146
            current_usage = usage['total_tokens']
            utilization = (current_usage / daily_limit) * 100
            
            if utilization > 80:  # 80% threshold
                logger.warning(f"⚡ High token usage: {utilization:.1f}% of daily limit")
                
                # Optionally send notification or take action
                self._handle_high_usage_warning(utilization, current_usage, daily_limit)
                
        except Exception as e:
            logger.error(f"Error checking 5-hour block compliance: {e}")
            
    def _calculate_session_progress(self, session_data: Dict) -> Dict[str, Any]:
        """Calculate current session progress"""
        start_time = session_data.get('start_time')
        if not start_time:
            return {'duration_minutes': 0, 'estimated_tokens': 0}
            
        current_time = datetime.now()
        duration_minutes = (current_time - start_time).total_seconds() / 60
        
        # Estimate current token usage based on duration
        base_rate = 20  # tokens per minute
        estimated_current_tokens = int(duration_minutes * base_rate)
        
        return {
            'duration_minutes': duration_minutes,
            'estimated_tokens': estimated_current_tokens,
            'start_time': start_time.isoformat(),
            'current_time': current_time.isoformat()
        }
        
    def _format_session_progress_description(self, session_data: Dict, progress: Dict) -> str:
        """Format session progress for calendar description"""
        duration = progress['duration_minutes']
        estimated_tokens = progress['estimated_tokens']
        
        description_parts = [
            f"🔴 LIVE SESSION - {session_data.get('session_type', 'coding').upper()}",
            f"",
            f"⏱️ Duration: {duration:.0f} minutes",
            f"🎯 Estimated Tokens: {estimated_tokens:,}",
            f"📊 Session ID: {session_data['id']}",
            f"💬 Conversation: {session_data.get('conversation_id', 'N/A')}",
            f"",
            f"🤖 Auto-generated by Claude Code Optimizer",
            f"🔗 Session tracking with real-time updates"
        ]
        
        return '\n'.join(description_parts)
        
    def _update_session_calendar_info(self, session_id: str, event_id: str):
        """Update session record with calendar information"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get existing metadata
            cursor.execute("SELECT metadata FROM real_sessions WHERE id = ?", (session_id,))
            result = cursor.fetchone()
            
            metadata = json.loads(result[0]) if result and result[0] else {}
            metadata['calendar_event_id'] = event_id
            metadata['calendar_integrated'] = True
            metadata['calendar_integration_time'] = datetime.now().isoformat()
            
            # Update metadata
            cursor.execute("""
                UPDATE real_sessions 
                SET metadata = ? 
                WHERE id = ?
            """, (json.dumps(metadata), session_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error updating session calendar info: {e}")
            
    def _update_session_duration(self, session_id: str, duration_minutes: float):
        """Update session with current duration"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get existing metadata
            cursor.execute("SELECT metadata FROM real_sessions WHERE id = ?", (session_id,))
            result = cursor.fetchone()
            
            metadata = json.loads(result[0]) if result and result[0] else {}
            metadata['current_duration_minutes'] = duration_minutes
            metadata['last_progress_update'] = datetime.now().isoformat()
            
            # Update metadata
            cursor.execute("""
                UPDATE real_sessions 
                SET metadata = ? 
                WHERE id = ?
            """, (json.dumps(metadata), session_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error updating session duration: {e}")
            
    def _get_final_session_data(self, session_id: str) -> Optional[Dict]:
        """Get final session data after session ends"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT start_time, end_time, real_total_tokens, estimated_tokens, metadata
                FROM real_sessions 
                WHERE id = ?
            """, (session_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                start_time = datetime.fromisoformat(result[0]) if result[0] else None
                end_time = datetime.fromisoformat(result[1]) if result[1] else None
                
                duration_minutes = 0
                if start_time and end_time:
                    duration_minutes = (end_time - start_time).total_seconds() / 60
                    
                return {
                    'start_time': start_time,
                    'end_time': end_time,
                    'duration_minutes': duration_minutes,
                    'total_tokens': result[2] or result[3] or 0,
                    'metadata': json.loads(result[4]) if result[4] else {}
                }
                
            return None
            
        except Exception as e:
            logger.error(f"Error getting final session data: {e}")
            return None
            
    def _handle_high_usage_warning(self, utilization: float, current_usage: int, daily_limit: int):
        """Handle high token usage warning"""
        logger.warning(f"🚨 High token usage alert: {utilization:.1f}%")
        
        # Calculate remaining tokens and time estimate
        remaining_tokens = daily_limit - current_usage
        
        # Log warning with recommendations
        if utilization > 90:
            logger.warning("🛑 CRITICAL: Approaching daily token limit!")
            logger.info("💡 Recommendations:")
            logger.info("   - Consider ending current session")
            logger.info("   - Plan shorter sessions for remainder of day")
            logger.info("   - Focus on testing/polish phases (lower token usage)")
            
        elif utilization > 80:
            logger.warning("⚠️ WARNING: High token usage detected")
            logger.info("💡 Recommendations:")
            logger.info(f"   - Approximately {remaining_tokens:,} tokens remaining")
            logger.info("   - Consider 5-hour block optimization")
            logger.info("   - Monitor session length closely")
            
    def create_planned_session_events(self, session_plan: Dict) -> Dict[str, Any]:
        """Create calendar events for a planned session sequence"""
        if not self.calendar_api:
            return {'success': False, 'error': 'Calendar API not available'}
            
        try:
            # Extract session plan details
            start_time = datetime.fromisoformat(session_plan['start_time'])
            session_types = session_plan.get('session_types', ['planning', 'coding', 'testing', 'polish'])
            
            # Create 5-hour productivity block
            result = self.calendar_api.create_5_hour_productivity_block(
                start_time=start_time,
                session_sequence=session_types,
                export_options={'google': True, 'ical': True}
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error creating planned session events: {e}")
            return {'success': False, 'error': str(e)}
            
    def get_bridge_status(self) -> Dict[str, Any]:
        """Get current bridge status"""
        return {
            'monitoring': self.is_monitoring,
            'calendar_api_available': self.calendar_api is not None,
            'active_sessions': len(self.active_sessions),
            'session_calendar_mappings': len(self.session_calendar_map),
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'bridge_uptime': (datetime.now() - self.last_check).total_seconds() if self.last_check else 0
        }


def main():
    """Test the session-calendar bridge"""
    # Initialize bridge
    database_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
    
    bridge = SessionCalendarBridge(database_path)
    
    # Get status
    status = bridge.get_bridge_status()
    print(f"Bridge Status: {json.dumps(status, indent=2)}")
    
    # Start monitoring for 30 seconds (test)
    if bridge.calendar_api:
        print("✅ Starting bridge monitoring (30 second test)")
        bridge.start_monitoring()
        
        try:
            time.sleep(30)
        except KeyboardInterrupt:
            pass
        finally:
            bridge.stop_monitoring()
            
        print("✅ Bridge monitoring test completed")
    else:
        print("❌ Calendar API not available - bridge cannot start")


if __name__ == "__main__":
    main()