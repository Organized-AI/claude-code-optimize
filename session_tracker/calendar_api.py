#!/usr/bin/env python3
"""
Claude Code Optimizer - Calendar API
====================================

Main API interface for calendar integration with session tracking system.
Provides one-click calendar event generation and 5-hour block optimization.
"""

import os
import json
import sqlite3
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import asdict
import threading
import time

from calendar_integration import (
    CalendarEvent, SessionTemplate, SchedulingBlock,
    GoogleCalendarManager, ICalExporter, SessionTemplateManager
)
from calendar_scheduler import FiveHourBlockScheduler

logger = logging.getLogger(__name__)


class CalendarAPI:
    """
    Main calendar integration API for Claude Code Optimizer
    
    Provides unified interface for:
    - One-click calendar event generation
    - 5-hour block optimization
    - Session template management
    - Rate limit compliance scheduling
    - Integration with existing session tracking
    """
    
    def __init__(self, database_path: str, config: Dict = None):
        """Initialize calendar API"""
        self.database_path = database_path
        self.config = config or {}
        
        # Initialize components
        self.scheduler = FiveHourBlockScheduler(database_path)
        self.template_manager = SessionTemplateManager()
        
        # Calendar integration status
        self.google_calendar_available = False
        self.ical_export_available = True
        
        # Setup logging
        self._setup_logging()
        
        # Initialize API
        self._initialize_api()
        
    def _setup_logging(self):
        """Setup API logging"""
        log_dir = Path.home() / ".cache" / "claude_optimizer" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = log_dir / "calendar_api.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(
            logging.Formatter('%(asctime)s [CALENDAR-API] %(levelname)s: %(message)s')
        )
        logger.addHandler(file_handler)
        
    def _initialize_api(self):
        """Initialize API components"""
        try:
            # Setup Google Calendar if credentials available
            credentials_path = self.config.get('google_credentials_path')
            if credentials_path and Path(credentials_path).exists():
                self.google_calendar_available = self.scheduler.setup_google_calendar(credentials_path)
                
            # Verify database connection
            self._verify_database()
            
            logger.info("✅ Calendar API initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Calendar API: {e}")
            
    def _verify_database(self):
        """Verify database connection and required tables"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Check for required tables
            required_tables = ['real_sessions', 'five_hour_blocks']
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            existing_tables = [row[0] for row in cursor.fetchall()]
            
            for table in required_tables:
                if table not in existing_tables:
                    logger.warning(f"Required table missing: {table}")
                    
            conn.close()
            
        except Exception as e:
            logger.error(f"Database verification failed: {e}")
            
    # ================== MAIN API METHODS ==================
    
    def create_session_event(self, template_name: str, start_time: datetime,
                           custom_title: str = None, duration_override: int = None,
                           export_options: Dict = None) -> Dict[str, Any]:
        """
        Create a calendar event from session template (ONE-CLICK GENERATION)
        
        Args:
            template_name: Name of session template ('planning', 'coding', 'testing', 'polish')
            start_time: When the session should start
            custom_title: Optional custom title for the event
            duration_override: Override template duration (minutes)
            export_options: Options for calendar export {'google': True, 'ical': True}
            
        Returns:
            Dict with creation results and event details
        """
        try:
            export_options = export_options or {'google': True, 'ical': True}
            
            # Get session template
            template = self.template_manager.get_template(template_name)
            if not template:
                return {
                    'success': False,
                    'error': f'Template not found: {template_name}',
                    'available_templates': self.template_manager.list_templates()
                }
                
            # Create event from template
            event = self.template_manager.create_session_from_template(
                template_name, start_time, custom_title
            )
            
            if not event:
                return {
                    'success': False,
                    'error': 'Failed to create event from template'
                }
                
            # Apply duration override if specified
            if duration_override:
                original_duration = (event.end_time - event.start_time).total_seconds() / 60
                new_end_time = event.start_time + timedelta(minutes=duration_override)
                event.end_time = new_end_time
                
                # Update metadata
                event.metadata['duration_override'] = duration_override
                event.metadata['original_duration'] = original_duration
                
            # Check for conflicts
            conflicts = self.check_scheduling_conflicts(event.start_time, event.end_time)
            if conflicts['has_conflicts']:
                return {
                    'success': False,
                    'error': 'Scheduling conflicts detected',
                    'conflicts': conflicts,
                    'suggested_times': self.suggest_alternative_times(
                        event.start_time, int((event.end_time - event.start_time).total_seconds() / 60)
                    )
                }
                
            # Validate rate limit compliance
            rate_limit_check = self.check_rate_limit_compliance(event.start_time, event.end_time)
            if not rate_limit_check['compliant']:
                return {
                    'success': False,
                    'error': 'Rate limit compliance violation',
                    'rate_limit_info': rate_limit_check,
                    'suggested_blocks': self.suggest_compliant_5hour_blocks(event.start_time.date())
                }
                
            # Create calendar events
            creation_results = self.scheduler.create_calendar_events(
                [event], export_options.get('ical', True)
            )
            
            # Integrate with session tracking
            session_integration = self._integrate_with_session_tracking(event)
            
            # Log session event creation
            self._log_session_event_creation(event, creation_results)
            
            return {
                'success': True,
                'event': asdict(event),
                'calendar_results': creation_results,
                'session_integration': session_integration,
                'rate_limit_compliance': rate_limit_check,
                'template_used': template_name
            }
            
        except Exception as e:
            logger.error(f"Error creating session event: {e}")
            return {
                'success': False,
                'error': str(e)
            }
            
    def create_5_hour_productivity_block(self, start_time: datetime,
                                       session_sequence: List[str] = None,
                                       optimization_goals: Dict = None,
                                       export_options: Dict = None) -> Dict[str, Any]:
        """
        Create optimized 5-hour productivity block with automatic session scheduling
        
        Args:
            start_time: When the 5-hour block should start
            session_sequence: List of session types in preferred order
            optimization_goals: Goals for optimization {'efficiency': 0.8, 'token_usage': 0.9}
            export_options: Export options for calendar integration
            
        Returns:
            Dict with block creation results and all session events
        """
        try:
            session_sequence = session_sequence or ['planning', 'coding', 'testing', 'polish']
            optimization_goals = optimization_goals or {'efficiency': 0.8, 'token_usage': 0.9}
            export_options = export_options or {'google': True, 'ical': True}
            
            # Check rate limit compliance for full 5-hour block
            end_time = start_time + timedelta(hours=5)
            rate_limit_check = self.check_rate_limit_compliance(start_time, end_time)
            
            if not rate_limit_check['compliant']:
                return {
                    'success': False,
                    'error': 'Rate limit violation for 5-hour block',
                    'rate_limit_info': rate_limit_check,
                    'suggested_blocks': self.suggest_compliant_5hour_blocks(start_time.date())
                }
                
            # Create 5-hour scheduling block
            block = self.scheduler.create_5_hour_block(start_time)
            if not block:
                return {
                    'success': False,
                    'error': 'Failed to create 5-hour block (conflicts detected)',
                    'conflicts': self.check_scheduling_conflicts(start_time, end_time)
                }
                
            # Optimize session schedule within the block
            optimized_events = self.scheduler.optimize_session_schedule(block, session_sequence)
            
            if not optimized_events:
                return {
                    'success': False,
                    'error': 'Failed to optimize session schedule'
                }
                
            # Validate optimization meets goals
            optimization_results = self._validate_optimization_goals(
                block, optimized_events, optimization_goals
            )
            
            # Create calendar events
            creation_results = self.scheduler.create_calendar_events(
                optimized_events, export_options.get('ical', True)
            )
            
            # Integrate each session with tracking system
            session_integrations = []
            for event in optimized_events:
                integration = self._integrate_with_session_tracking(event)
                session_integrations.append(integration)
                
            # Update five_hour_blocks table in main database
            self._update_five_hour_blocks_table(block, optimized_events)
            
            # Log 5-hour block creation
            self._log_5hour_block_creation(block, optimized_events, creation_results)
            
            return {
                'success': True,
                'block': asdict(block),
                'events': [asdict(event) for event in optimized_events],
                'calendar_results': creation_results,
                'optimization_results': optimization_results,
                'session_integrations': session_integrations,
                'efficiency_score': block.efficiency_score,
                'total_estimated_tokens': sum(
                    event.metadata.get('estimated_tokens', 0) for event in optimized_events
                )
            }
            
        except Exception as e:
            logger.error(f"Error creating 5-hour productivity block: {e}")
            return {
                'success': False,
                'error': str(e)
            }
            
    def schedule_recurring_sessions(self, template_name: str,
                                  schedule_config: Dict,
                                  duration_weeks: int = 4) -> Dict[str, Any]:
        """
        Schedule recurring sessions (e.g., weekly coding blocks)
        
        Args:
            template_name: Session template to use
            schedule_config: Configuration {'days': [1,3,5], 'time': '09:00', 'timezone': 'US/Pacific'}
            duration_weeks: How many weeks to schedule
            
        Returns:
            Dict with all created recurring events
        """
        try:
            # Parse schedule configuration
            days_of_week = schedule_config.get('days', [1, 3, 5])  # Mon, Wed, Fri
            preferred_time = schedule_config.get('time', '09:00')
            start_date = schedule_config.get('start_date', datetime.now())
            
            # Schedule recurring sessions
            events = self.scheduler.schedule_recurring_sessions(
                template_name, days_of_week, preferred_time, start_date, 
                weeks=duration_weeks
            )
            
            if not events:
                return {
                    'success': False,
                    'error': 'No recurring sessions could be scheduled (conflicts detected)'
                }
                
            # Group events by week for better organization
            events_by_week = self._group_events_by_week(events)
            
            # Create calendar events in batches
            creation_results = self.scheduler.create_calendar_events(events, True)
            
            # Integrate with session tracking
            session_integrations = []
            for event in events:
                integration = self._integrate_with_session_tracking(event)
                session_integrations.append(integration)
                
            # Store recurring template configuration
            self._store_recurring_template(template_name, schedule_config, duration_weeks)
            
            # Log recurring session creation
            self._log_recurring_sessions_creation(template_name, events, creation_results)
            
            return {
                'success': True,
                'template_name': template_name,
                'total_events_created': len(events),
                'events_by_week': events_by_week,
                'calendar_results': creation_results,
                'session_integrations': session_integrations,
                'schedule_config': schedule_config,
                'duration_weeks': duration_weeks
            }
            
        except Exception as e:
            logger.error(f"Error scheduling recurring sessions: {e}")
            return {
                'success': False,
                'error': str(e)
            }
            
    def suggest_optimal_day_schedule(self, target_date: datetime,
                                   preferences: Dict = None) -> Dict[str, Any]:
        """
        Suggest optimal schedule for a specific day
        
        Args:
            target_date: Date to generate schedule for
            preferences: User preferences {'work_hours': '09:00-17:00', 'break_duration': 60}
            
        Returns:
            Dict with suggested schedule and alternatives
        """
        try:
            preferences = preferences or {
                'preferred_start_time': '09:00',
                'preferred_end_time': '17:00',
                'break_duration_minutes': 60,
                'max_continuous_work_hours': 3,
                'session_types': ['planning', 'coding', 'testing', 'polish']
            }
            
            # Generate schedule suggestions
            suggestions = self.scheduler.suggest_optimal_schedule(target_date, preferences)
            
            if 'error' in suggestions:
                return {
                    'success': False,
                    'error': suggestions['error']
                }
                
            # Enhance suggestions with rate limit analysis
            enhanced_suggestions = []
            for suggestion in suggestions['all_suggestions']:
                rate_limit_analysis = self._analyze_suggestion_rate_limits(suggestion)
                enhanced_suggestion = {
                    **suggestion,
                    'rate_limit_analysis': rate_limit_analysis
                }
                enhanced_suggestions.append(enhanced_suggestion)
                
            # Find best suggestion that meets rate limits
            best_compliant_suggestion = self._find_best_compliant_suggestion(enhanced_suggestions)
            
            return {
                'success': True,
                'target_date': target_date.isoformat(),
                'best_suggestion': best_compliant_suggestion,
                'all_suggestions': enhanced_suggestions,
                'preferences_used': preferences,
                'rate_limit_status': self._get_current_rate_limit_status(target_date)
            }
            
        except Exception as e:
            logger.error(f"Error generating day schedule suggestions: {e}")
            return {
                'success': False,
                'error': str(e)
            }
            
    def check_scheduling_conflicts(self, start_time: datetime, 
                                 end_time: datetime) -> Dict[str, Any]:
        """
        Check for scheduling conflicts in given time range
        
        Args:
            start_time: Start of time range to check
            end_time: End of time range to check
            
        Returns:
            Dict with conflict information
        """
        try:
            # Check Google Calendar conflicts
            google_conflicts = []
            if self.scheduler.google_calendar and self.scheduler.google_calendar.is_authenticated:
                google_conflicts = self.scheduler.google_calendar.check_conflicts(start_time, end_time)
                
            # Check local database conflicts
            local_conflicts = self.scheduler._check_event_conflicts(
                CalendarEvent(
                    event_id='temp_check',
                    title='Conflict Check',
                    description='',
                    start_time=start_time,
                    end_time=end_time
                )
            )
            
            # Check 5-hour block conflicts
            block_conflicts = self.scheduler._check_block_conflicts(start_time, end_time)
            
            all_conflicts = google_conflicts + local_conflicts + block_conflicts
            
            return {
                'has_conflicts': len(all_conflicts) > 0,
                'conflict_count': len(all_conflicts),
                'google_calendar_conflicts': google_conflicts,
                'local_conflicts': local_conflicts,
                'block_conflicts': block_conflicts,
                'all_conflicts': all_conflicts
            }
            
        except Exception as e:
            logger.error(f"Error checking scheduling conflicts: {e}")
            return {
                'has_conflicts': True,
                'error': str(e)
            }
            
    def check_rate_limit_compliance(self, start_time: datetime, 
                                  end_time: datetime) -> Dict[str, Any]:
        """
        Check if scheduled time complies with 5-hour rate limits
        
        Args:
            start_time: Start of session/block
            end_time: End of session/block
            
        Returns:
            Dict with compliance information
        """
        try:
            duration_hours = (end_time - start_time).total_seconds() / 3600
            
            # Get current token usage for the day
            day_start = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            current_usage = self._get_token_usage_for_period(day_start, day_end)
            
            # Estimate token usage for this session/block
            estimated_tokens = self._estimate_token_usage_for_duration(duration_hours)
            
            # Check against daily limit
            projected_usage = current_usage['total_tokens'] + estimated_tokens
            daily_limit = 19146  # Current sustainable limit
            
            # Check 5-hour block compliance
            five_hour_compliance = self._check_5hour_block_compliance(start_time, end_time)
            
            return {
                'compliant': projected_usage <= daily_limit and five_hour_compliance['compliant'],
                'current_usage': current_usage,
                'estimated_tokens': estimated_tokens,
                'projected_total': projected_usage,
                'daily_limit': daily_limit,
                'remaining_tokens': max(0, daily_limit - projected_usage),
                'utilization_percentage': (projected_usage / daily_limit) * 100,
                'five_hour_compliance': five_hour_compliance,
                'duration_hours': duration_hours
            }
            
        except Exception as e:
            logger.error(f"Error checking rate limit compliance: {e}")
            return {
                'compliant': False,
                'error': str(e)
            }
            
    def suggest_alternative_times(self, preferred_start: datetime, 
                                duration_minutes: int, 
                                search_days: int = 7) -> List[Dict]:
        """
        Suggest alternative times when preferred time has conflicts
        
        Args:
            preferred_start: Originally preferred start time
            duration_minutes: Duration of session in minutes
            search_days: How many days ahead to search
            
        Returns:
            List of alternative time suggestions
        """
        try:
            alternatives = []
            
            # Search each day for available slots
            for day_offset in range(search_days):
                search_date = preferred_start.date() + timedelta(days=day_offset)
                search_start = datetime.combine(search_date, preferred_start.time())
                
                # Get suggestions for this day
                day_suggestions = self.scheduler.suggest_optimal_schedule(search_start)
                
                if day_suggestions.get('all_suggestions'):
                    for suggestion in day_suggestions['all_suggestions']:
                        # Check if any slot can accommodate our duration
                        for slot in suggestion.get('slot_info', {}).get('slots', []):
                            slot_duration_minutes = slot.get('duration_hours', 0) * 60
                            if slot_duration_minutes >= duration_minutes:
                                alternative = {
                                    'date': search_date.isoformat(),
                                    'start_time': slot['start'].isoformat(),
                                    'end_time': (slot['start'] + timedelta(minutes=duration_minutes)).isoformat(),
                                    'available_duration_minutes': slot_duration_minutes,
                                    'efficiency_score': suggestion.get('efficiency_score', 0),
                                    'conflicts': self.check_scheduling_conflicts(
                                        slot['start'], 
                                        slot['start'] + timedelta(minutes=duration_minutes)
                                    )
                                }
                                alternatives.append(alternative)
                                
            # Sort by efficiency score and date proximity
            alternatives.sort(key=lambda x: (
                x['conflicts']['has_conflicts'],  # Conflict-free first
                -x['efficiency_score'],           # Higher efficiency first
                abs((datetime.fromisoformat(x['start_time']) - preferred_start).total_seconds())  # Closer to preferred time
            ))
            
            return alternatives[:10]  # Return top 10 alternatives
            
        except Exception as e:
            logger.error(f"Error suggesting alternative times: {e}")
            return []
            
    def suggest_compliant_5hour_blocks(self, target_date: datetime.date) -> List[Dict]:
        """
        Suggest 5-hour blocks that comply with rate limits
        
        Args:
            target_date: Date to suggest blocks for
            
        Returns:
            List of compliant 5-hour block suggestions
        """
        try:
            suggestions = []
            
            # Common 5-hour block start times
            suggested_start_times = [
                datetime.combine(target_date, datetime.min.time().replace(hour=8)),   # 8 AM - 1 PM
                datetime.combine(target_date, datetime.min.time().replace(hour=9)),   # 9 AM - 2 PM
                datetime.combine(target_date, datetime.min.time().replace(hour=10)),  # 10 AM - 3 PM
                datetime.combine(target_date, datetime.min.time().replace(hour=13)),  # 1 PM - 6 PM
                datetime.combine(target_date, datetime.min.time().replace(hour=14)),  # 2 PM - 7 PM
            ]
            
            for start_time in suggested_start_times:
                end_time = start_time + timedelta(hours=5)
                
                # Check rate limit compliance
                compliance = self.check_rate_limit_compliance(start_time, end_time)
                
                # Check conflicts
                conflicts = self.check_scheduling_conflicts(start_time, end_time)
                
                if compliance['compliant'] and not conflicts['has_conflicts']:
                    # Generate optimized session schedule preview
                    temp_block = SchedulingBlock(
                        block_id=f"preview_{int(start_time.timestamp())}",
                        start_time=start_time,
                        end_time=end_time
                    )
                    
                    preview_events = self.scheduler.optimize_session_schedule(temp_block)
                    
                    suggestion = {
                        'start_time': start_time.isoformat(),
                        'end_time': end_time.isoformat(),
                        'compliance_info': compliance,
                        'conflicts': conflicts,
                        'efficiency_score': temp_block.efficiency_score,
                        'session_preview': [
                            {
                                'template': event.session_template,
                                'start': event.start_time.isoformat(),
                                'end': event.end_time.isoformat(),
                                'estimated_tokens': event.metadata.get('estimated_tokens', 0)
                            }
                            for event in preview_events
                        ]
                    }
                    suggestions.append(suggestion)
                    
            # Sort by efficiency score
            suggestions.sort(key=lambda x: x['efficiency_score'], reverse=True)
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error suggesting compliant 5-hour blocks: {e}")
            return []
            
    def export_schedule(self, export_format: str = 'ical', 
                       date_range: Tuple[datetime, datetime] = None,
                       filename: str = None) -> Dict[str, Any]:
        """
        Export schedule in specified format
        
        Args:
            export_format: Format to export ('ical', 'json', 'csv')
            date_range: Date range to export (start, end)
            filename: Custom filename for export
            
        Returns:
            Dict with export results
        """
        try:
            if date_range is None:
                # Default to next 30 days
                start_date = datetime.now()
                end_date = start_date + timedelta(days=30)
                date_range = (start_date, end_date)
                
            if export_format.lower() == 'ical':
                # Export to iCal
                export_path = self.scheduler.export_schedule_to_ical(filename=filename)
                
                return {
                    'success': bool(export_path),
                    'format': 'ical',
                    'export_path': export_path,
                    'date_range': [date_range[0].isoformat(), date_range[1].isoformat()]
                }
                
            elif export_format.lower() == 'json':
                # Export to JSON
                export_data = self._export_schedule_to_json(date_range, filename)
                
                return {
                    'success': export_data is not None,
                    'format': 'json',
                    'export_path': export_data.get('path') if export_data else None,
                    'data': export_data.get('data') if export_data else None
                }
                
            else:
                return {
                    'success': False,
                    'error': f'Unsupported export format: {export_format}',
                    'supported_formats': ['ical', 'json']
                }
                
        except Exception as e:
            logger.error(f"Error exporting schedule: {e}")
            return {
                'success': False,
                'error': str(e)
            }
            
    def get_api_status(self) -> Dict[str, Any]:
        """
        Get current API status and capabilities
        
        Returns:
            Dict with API status information
        """
        try:
            # Check Google Calendar status
            google_status = {
                'available': self.google_calendar_available,
                'authenticated': False,
                'calendar_id': None
            }
            
            if self.scheduler.google_calendar:
                google_status['authenticated'] = self.scheduler.google_calendar.is_authenticated
                google_status['calendar_id'] = self.scheduler.google_calendar.calendar_id
                
            # Check database status
            database_status = self._check_database_status()
            
            # Get session template info
            templates_info = {
                'available_templates': self.template_manager.list_templates(),
                'template_count': len(self.template_manager.get_all_templates())
            }
            
            # Get recent activity
            recent_activity = self._get_recent_activity()
            
            return {
                'api_version': '1.0.0',
                'status': 'operational',
                'google_calendar': google_status,
                'ical_export': {'available': self.ical_export_available},
                'database': database_status,
                'session_templates': templates_info,
                'recent_activity': recent_activity,
                'rate_limits': {
                    'daily_token_limit': 19146,
                    'max_5hour_blocks_per_day': 2,
                    'current_usage': self._get_current_rate_limit_status()
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting API status: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
            
    # ================== HELPER METHODS ==================
    
    def _integrate_with_session_tracking(self, event: CalendarEvent) -> Dict[str, Any]:
        """Integrate calendar event with existing session tracking system"""
        try:
            # Create session record in real_sessions table
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            session_id = f"calendar_{event.event_id}"
            
            cursor.execute("""
                INSERT OR REPLACE INTO real_sessions (
                    id, session_type, start_time, end_time,
                    conversation_id, estimated_tokens, is_active,
                    metadata, five_hour_block_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                event.session_template,
                event.start_time,
                event.end_time,
                event.event_id,
                event.metadata.get('estimated_tokens', 0),
                False,  # Not active yet
                json.dumps(event.metadata),
                event.block_id
            ))
            
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'session_id': session_id,
                'integrated': True
            }
            
        except Exception as e:
            logger.error(f"Error integrating with session tracking: {e}")
            return {
                'success': False,
                'error': str(e)
            }
            
    def _validate_optimization_goals(self, block: SchedulingBlock, 
                                   events: List[CalendarEvent],
                                   goals: Dict) -> Dict[str, Any]:
        """Validate that optimization meets specified goals"""
        try:
            results = {
                'goals_met': True,
                'efficiency_target': goals.get('efficiency', 0.8),
                'efficiency_achieved': block.efficiency_score,
                'efficiency_met': block.efficiency_score >= goals.get('efficiency', 0.8),
                'token_target': goals.get('token_usage', 0.9),
                'token_achieved': 0.0,
                'token_met': True
            }
            
            # Calculate token usage efficiency
            total_estimated_tokens = sum(
                event.metadata.get('estimated_tokens', 0) for event in events
            )
            
            if block.max_tokens > 0:
                token_efficiency = total_estimated_tokens / block.max_tokens
                results['token_achieved'] = token_efficiency
                results['token_met'] = token_efficiency >= goals.get('token_usage', 0.9)
                
            results['goals_met'] = results['efficiency_met'] and results['token_met']
            
            return results
            
        except Exception as e:
            logger.error(f"Error validating optimization goals: {e}")
            return {'goals_met': False, 'error': str(e)}
            
    def _update_five_hour_blocks_table(self, block: SchedulingBlock, 
                                     events: List[CalendarEvent]):
        """Update the main five_hour_blocks table"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            total_tokens = sum(
                event.metadata.get('estimated_tokens', 0) for event in events
            )
            
            cursor.execute("""
                INSERT OR REPLACE INTO five_hour_blocks (
                    id, start_time, end_time, session_type,
                    total_sessions, total_tokens, efficiency_score, is_complete
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                block.block_id,
                block.start_time,
                block.end_time,
                'optimized_productivity_block',
                len(events),
                total_tokens,
                block.efficiency_score,
                False
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error updating five_hour_blocks table: {e}")
            
    def _log_session_event_creation(self, event: CalendarEvent, results: Dict):
        """Log session event creation"""
        logger.info(f"📅 Session event created: {event.title}")
        logger.info(f"   Template: {event.session_template}")
        logger.info(f"   Time: {event.start_time} - {event.end_time}")
        logger.info(f"   Google Calendar: {results['google_calendar']['success']} created")
        logger.info(f"   iCal Export: {results['ical_export']['success']}")
        
    def _log_5hour_block_creation(self, block: SchedulingBlock, 
                                events: List[CalendarEvent], results: Dict):
        """Log 5-hour block creation"""
        logger.info(f"🏗️ 5-hour productivity block created: {block.block_id}")
        logger.info(f"   Time: {block.start_time} - {block.end_time}")
        logger.info(f"   Sessions: {len(events)}")
        logger.info(f"   Efficiency Score: {block.efficiency_score:.2f}")
        logger.info(f"   Google Calendar: {results['google_calendar']['success']} events created")
        logger.info(f"   iCal Export: {results['ical_export']['success']}")
        
    def _log_recurring_sessions_creation(self, template_name: str, 
                                       events: List[CalendarEvent], results: Dict):
        """Log recurring sessions creation"""
        logger.info(f"🔁 Recurring sessions created: {template_name}")
        logger.info(f"   Total Events: {len(events)}")
        logger.info(f"   Date Range: {events[0].start_time.date()} to {events[-1].start_time.date()}")
        logger.info(f"   Google Calendar: {results['google_calendar']['success']} events created")
        logger.info(f"   iCal Export: {results['ical_export']['success']}")
        
    def _group_events_by_week(self, events: List[CalendarEvent]) -> Dict[str, List]:
        """Group events by week for better organization"""
        weeks = {}
        
        for event in events:
            # Get start of week (Monday)
            start_of_week = event.start_time.date() - timedelta(days=event.start_time.weekday())
            week_key = start_of_week.isoformat()
            
            if week_key not in weeks:
                weeks[week_key] = []
                
            weeks[week_key].append(asdict(event))
            
        return weeks
        
    def _store_recurring_template(self, template_name: str, config: Dict, weeks: int):
        """Store recurring template configuration"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            template_id = f"recurring_{template_name}_{int(datetime.now().timestamp())}"
            
            cursor.execute("""
                INSERT INTO recurring_templates (
                    id, name, template_type, recurrence_rule,
                    start_date, end_date, preferred_times_json, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                template_id,
                f"Recurring {template_name}",
                template_name,
                f"FREQ=WEEKLY;BYDAY={','.join(map(str, config.get('days', [])))}",
                datetime.now().date(),
                (datetime.now() + timedelta(weeks=weeks)).date(),
                json.dumps([config.get('time', '09:00')]),
                json.dumps(config)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing recurring template: {e}")
            
    def _get_token_usage_for_period(self, start_time: datetime, 
                                  end_time: datetime) -> Dict[str, Any]:
        """Get token usage for specified time period"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as session_count,
                    SUM(COALESCE(real_total_tokens, estimated_tokens, 0)) as total_tokens,
                    SUM(COALESCE(real_input_tokens, 0)) as input_tokens,
                    SUM(COALESCE(real_output_tokens, 0)) as output_tokens
                FROM real_sessions 
                WHERE start_time >= ? AND start_time < ?
            """, (start_time, end_time))
            
            result = cursor.fetchone()
            conn.close()
            
            return {
                'session_count': result[0] or 0,
                'total_tokens': result[1] or 0,
                'input_tokens': result[2] or 0,
                'output_tokens': result[3] or 0,
                'period_start': start_time.isoformat(),
                'period_end': end_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting token usage: {e}")
            return {
                'session_count': 0,
                'total_tokens': 0,
                'input_tokens': 0,
                'output_tokens': 0
            }
            
    def _estimate_token_usage_for_duration(self, duration_hours: float) -> int:
        """Estimate token usage for given duration"""
        # Base estimation: 20 tokens per minute of active work
        base_rate = 20  # tokens per minute
        active_work_percentage = 0.7  # 70% of time is active work
        
        active_minutes = duration_hours * 60 * active_work_percentage
        return int(active_minutes * base_rate)
        
    def _check_5hour_block_compliance(self, start_time: datetime, 
                                    end_time: datetime) -> Dict[str, Any]:
        """Check if session fits within 5-hour block constraints"""
        try:
            duration_hours = (end_time - start_time).total_seconds() / 3600
            
            # Check if this would be within a valid 5-hour block
            day_start = start_time.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            # Get existing 5-hour blocks for the day
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, start_time, end_time, total_tokens 
                FROM five_hour_blocks
                WHERE start_time >= ? AND start_time < ?
            """, (day_start, day_end))
            
            existing_blocks = cursor.fetchall()
            conn.close()
            
            # Check if session fits within existing block
            fits_existing_block = False
            for block in existing_blocks:
                block_start = datetime.fromisoformat(block[1])
                block_end = datetime.fromisoformat(block[2])
                
                if start_time >= block_start and end_time <= block_end:
                    fits_existing_block = True
                    break
                    
            # Check if we can create a new 5-hour block
            can_create_new_block = len(existing_blocks) < 2  # Max 2 blocks per day
            
            return {
                'compliant': fits_existing_block or (can_create_new_block and duration_hours <= 5),
                'fits_existing_block': fits_existing_block,
                'can_create_new_block': can_create_new_block,
                'existing_blocks_count': len(existing_blocks),
                'duration_hours': duration_hours,
                'max_blocks_per_day': 2
            }
            
        except Exception as e:
            logger.error(f"Error checking 5-hour block compliance: {e}")
            return {'compliant': False, 'error': str(e)}
            
    def _analyze_suggestion_rate_limits(self, suggestion: Dict) -> Dict[str, Any]:
        """Analyze rate limit compliance for a schedule suggestion"""
        try:
            events = suggestion.get('events', [])
            
            total_estimated_tokens = 0
            for event in events:
                if hasattr(event, 'metadata'):
                    total_estimated_tokens += event.metadata.get('estimated_tokens', 0)
                    
            block_info = suggestion.get('block', {})
            max_tokens = getattr(block_info, 'max_tokens', 9573)  # Half daily limit per block
            
            return {
                'estimated_tokens': total_estimated_tokens,
                'max_tokens_per_block': max_tokens,
                'utilization_percentage': (total_estimated_tokens / max_tokens) * 100 if max_tokens > 0 else 0,
                'compliant': total_estimated_tokens <= max_tokens
            }
            
        except Exception as e:
            logger.error(f"Error analyzing suggestion rate limits: {e}")
            return {'compliant': False, 'error': str(e)}
            
    def _find_best_compliant_suggestion(self, suggestions: List[Dict]) -> Optional[Dict]:
        """Find best suggestion that meets rate limit compliance"""
        compliant_suggestions = [
            s for s in suggestions 
            if s.get('rate_limit_analysis', {}).get('compliant', False)
        ]
        
        if compliant_suggestions:
            # Sort by efficiency score
            compliant_suggestions.sort(
                key=lambda x: x.get('efficiency_score', 0), 
                reverse=True
            )
            return compliant_suggestions[0]
            
        return None
        
    def _get_current_rate_limit_status(self, target_date: datetime = None) -> Dict[str, Any]:
        """Get current rate limit status"""
        if target_date is None:
            target_date = datetime.now()
            
        day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        current_usage = self._get_token_usage_for_period(day_start, day_end)
        daily_limit = 19146
        
        return {
            'current_tokens': current_usage['total_tokens'],
            'daily_limit': daily_limit,
            'remaining_tokens': max(0, daily_limit - current_usage['total_tokens']),
            'utilization_percentage': (current_usage['total_tokens'] / daily_limit) * 100,
            'date': target_date.date().isoformat()
        }
        
    def _check_database_status(self) -> Dict[str, Any]:
        """Check database connectivity and status"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Check if we can query the database
            cursor.execute("SELECT COUNT(*) FROM real_sessions")
            session_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM five_hour_blocks")
            block_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM calendar_events")
            event_count = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'connected': True,
                'session_count': session_count,
                'block_count': block_count,
                'event_count': event_count,
                'database_path': self.database_path
            }
            
        except Exception as e:
            logger.error(f"Database status check failed: {e}")
            return {
                'connected': False,
                'error': str(e)
            }
            
    def _get_recent_activity(self) -> Dict[str, Any]:
        """Get recent calendar API activity"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get recent events (last 7 days)
            week_ago = datetime.now() - timedelta(days=7)
            
            cursor.execute("""
                SELECT COUNT(*) FROM calendar_events 
                WHERE created_at >= ?
            """, (week_ago,))
            recent_events = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM scheduling_blocks 
                WHERE created_at >= ?
            """, (week_ago,))
            recent_blocks = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'recent_events_created': recent_events,
                'recent_blocks_created': recent_blocks,
                'period_days': 7
            }
            
        except Exception as e:
            logger.error(f"Error getting recent activity: {e}")
            return {
                'recent_events_created': 0,
                'recent_blocks_created': 0
            }
            
    def _export_schedule_to_json(self, date_range: Tuple[datetime, datetime], 
                               filename: str = None) -> Optional[Dict]:
        """Export schedule to JSON format"""
        try:
            # Get events in date range
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM calendar_events
                WHERE start_time >= ? AND start_time <= ?
                ORDER BY start_time
            """, (date_range[0], date_range[1]))
            
            events_data = []
            for row in cursor.fetchall():
                event_data = {
                    'event_id': row[0],
                    'title': row[1],
                    'description': row[2],
                    'start_time': row[3],
                    'end_time': row[4],
                    'location': row[5],
                    'color': row[6],
                    'session_template': row[7],
                    'block_id': row[8],
                    'google_event_id': row[9],
                    'ical_exported': bool(row[10]),
                    'created_at': row[11],
                    'metadata': json.loads(row[12]) if row[12] else {}
                }
                events_data.append(event_data)
                
            conn.close()
            
            export_data = {
                'export_info': {
                    'created_at': datetime.now().isoformat(),
                    'date_range': [date_range[0].isoformat(), date_range[1].isoformat()],
                    'event_count': len(events_data),
                    'format': 'json'
                },
                'events': events_data
            }
            
            # Save to file if filename provided
            if filename:
                export_dir = Path.home() / "Downloads" / "claude_code_calendar"
                export_dir.mkdir(parents=True, exist_ok=True)
                
                if not filename.endswith('.json'):
                    filename += '.json'
                    
                export_path = export_dir / filename
                with open(export_path, 'w') as f:
                    json.dump(export_data, f, indent=2)
                    
                return {
                    'path': str(export_path),
                    'data': export_data
                }
                
            return {'data': export_data}
            
        except Exception as e:
            logger.error(f"Error exporting to JSON: {e}")
            return None


def main():
    """Test the Calendar API"""
    # Initialize API
    database_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
    
    api = CalendarAPI(database_path)
    
    # Get API status
    status = api.get_api_status()
    print(f"API Status: {status['status']}")
    print(f"Available Templates: {status['session_templates']['available_templates']}")
    
    # Test creating a single session event
    tomorrow_9am = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    result = api.create_session_event(
        template_name='coding',
        start_time=tomorrow_9am,
        custom_title='Test Coding Session'
    )
    
    if result['success']:
        print(f"✅ Created session event: {result['event']['title']}")
    else:
        print(f"❌ Failed to create session: {result.get('error')}")
        
    # Test creating a 5-hour productivity block
    block_result = api.create_5_hour_productivity_block(
        start_time=tomorrow_9am,
        session_sequence=['planning', 'coding', 'testing', 'polish']
    )
    
    if block_result['success']:
        print(f"✅ Created 5-hour block with {len(block_result['events'])} sessions")
        print(f"Efficiency Score: {block_result['efficiency_score']}")
    else:
        print(f"❌ Failed to create 5-hour block: {block_result.get('error')}")
        
    # Test schedule suggestions
    suggestions = api.suggest_optimal_day_schedule(tomorrow_9am)
    if suggestions['success']:
        print(f"✅ Generated {len(suggestions['all_suggestions'])} schedule suggestions")
    else:
        print(f"❌ Failed to generate suggestions: {suggestions.get('error')}")


if __name__ == "__main__":
    main()