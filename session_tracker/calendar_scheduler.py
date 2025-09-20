#!/usr/bin/env python3
"""
Claude Code Optimizer - Calendar Scheduler
==========================================

5-hour block scheduling system with rate limit optimization and session planning.
Handles timezone conversions, conflict detection, and optimal session distribution.
"""

import sqlite3
import logging
import pytz
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import json
import math
from collections import defaultdict

from calendar_integration import (
    SessionTemplate, SchedulingBlock, CalendarEvent,
    SessionTemplateManager, GoogleCalendarManager, ICalExporter
)

logger = logging.getLogger(__name__)


class FiveHourBlockScheduler:
    """5-hour block scheduler with rate limit optimization"""
    
    def __init__(self, database_path: str, timezone_name: str = None):
        """Initialize the scheduler"""
        self.database_path = database_path
        self.timezone = pytz.timezone(timezone_name or self._detect_local_timezone())
        
        # Rate limit configuration
        self.daily_token_limit = 19146  # Current sustainable limit
        self.block_duration_hours = 5.0
        self.max_blocks_per_day = 2  # Conservative approach
        
        # Session management
        self.template_manager = SessionTemplateManager()
        
        # Calendar integration
        self.google_calendar = None
        self.ical_exporter = ICalExporter() if ICalExporter else None
        
        # Initialize database
        self._init_database()
        
    def _detect_local_timezone(self) -> str:
        """Detect local timezone"""
        try:
            local_tz = datetime.now().astimezone().tzinfo
            return str(local_tz)
        except:
            return "UTC"
            
    def _init_database(self):
        """Initialize scheduler database tables"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Create scheduling blocks table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scheduling_blocks (
                    id TEXT PRIMARY KEY,
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    total_duration_hours REAL,
                    allocated_tokens INTEGER DEFAULT 0,
                    max_tokens INTEGER DEFAULT 19146,
                    sessions_json TEXT DEFAULT '[]',
                    efficiency_score REAL DEFAULT 0.0,
                    is_complete BOOLEAN DEFAULT FALSE,
                    timezone_name TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata_json TEXT DEFAULT '{}'
                )
            """)
            
            # Create calendar events table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS calendar_events (
                    event_id TEXT PRIMARY KEY,
                    title TEXT,
                    description TEXT,
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    location TEXT DEFAULT '',
                    color TEXT DEFAULT 'blue',
                    session_template TEXT DEFAULT '',
                    block_id TEXT,
                    google_event_id TEXT,
                    ical_exported BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata_json TEXT DEFAULT '{}'
                )
            """)
            
            # Create recurring templates table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS recurring_templates (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    template_type TEXT,
                    recurrence_rule TEXT,
                    start_date DATE,
                    end_date DATE,
                    preferred_times_json TEXT DEFAULT '[]',
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata_json TEXT DEFAULT '{}'
                )
            """)
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Scheduler database initialized")
            
        except Exception as e:
            logger.error(f"Error initializing scheduler database: {e}")
            
    def create_5_hour_block(self, start_time: datetime, 
                           block_type: str = "productivity") -> Optional[SchedulingBlock]:
        """Create a new 5-hour scheduling block"""
        try:
            # Ensure start_time is timezone-aware
            if start_time.tzinfo is None:
                start_time = self.timezone.localize(start_time)
            elif start_time.tzinfo != self.timezone:
                start_time = start_time.astimezone(self.timezone)
                
            # Calculate end time
            end_time = start_time + timedelta(hours=self.block_duration_hours)
            
            # Check for conflicts with existing blocks
            conflicts = self._check_block_conflicts(start_time, end_time)
            if conflicts:
                logger.warning(f"Block conflicts detected: {len(conflicts)} overlapping blocks")
                return None
                
            # Create block
            block_id = f"block_{int(start_time.timestamp())}"
            block = SchedulingBlock(
                block_id=block_id,
                start_time=start_time,
                end_time=end_time,
                total_duration_hours=self.block_duration_hours,
                max_tokens=self.daily_token_limit // self.max_blocks_per_day
            )
            
            # Save to database
            self._save_block_to_database(block)
            
            logger.info(f"✅ Created 5-hour block: {block_id} ({start_time} - {end_time})")
            return block
            
        except Exception as e:
            logger.error(f"Error creating 5-hour block: {e}")
            return None
            
    def optimize_session_schedule(self, block: SchedulingBlock, 
                                session_types: List[str] = None) -> List[CalendarEvent]:
        """Optimize session schedule within a 5-hour block"""
        try:
            if session_types is None:
                # Default optimal session sequence
                session_types = ['planning', 'coding', 'testing', 'polish']
                
            events = []
            current_time = block.start_time
            remaining_time = block.get_remaining_time()
            
            # Calculate optimal time allocation
            time_allocation = self._calculate_optimal_allocation(
                remaining_time, session_types
            )
            
            for session_type, allocated_minutes in time_allocation.items():
                if allocated_minutes <= 0:
                    continue
                    
                # Get template and adjust duration
                template = self.template_manager.get_template(session_type)
                if not template:
                    continue
                    
                # Create adjusted template for allocated time
                adjusted_template = self._adjust_template_duration(
                    template, allocated_minutes
                )
                
                # Create calendar event
                event = self.template_manager.create_session_from_template(
                    session_type, current_time
                )
                
                if event:
                    # Adjust event duration to match allocation
                    event.end_time = current_time + timedelta(minutes=allocated_minutes)
                    event.block_id = block.block_id
                    
                    # Update metadata with optimization info
                    event.metadata.update({
                        'allocated_minutes': allocated_minutes,
                        'optimization_sequence': len(events) + 1,
                        'block_utilization': allocated_minutes / (block.total_duration_hours * 60)
                    })
                    
                    events.append(event)
                    block.sessions.append(asdict(event))
                    
                    # Move to next session start time
                    current_time = event.end_time
                    
            # Update block efficiency score
            block.efficiency_score = self._calculate_efficiency_score(block, events)
            
            # Save updated block
            self._save_block_to_database(block)
            
            logger.info(f"✅ Optimized schedule for block {block.block_id}: "
                       f"{len(events)} sessions, efficiency {block.efficiency_score:.2f}")
            
            return events
            
        except Exception as e:
            logger.error(f"Error optimizing session schedule: {e}")
            return []
            
    def schedule_recurring_sessions(self, template_name: str, 
                                  days_of_week: List[int],
                                  preferred_time: str,
                                  start_date: datetime = None,
                                  end_date: datetime = None,
                                  weeks: int = 4) -> List[CalendarEvent]:
        """Schedule recurring sessions (e.g., weekly coding blocks)"""
        try:
            if start_date is None:
                start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            if end_date is None:
                end_date = start_date + timedelta(weeks=weeks)
                
            # Parse preferred time
            preferred_hour, preferred_minute = self._parse_time_string(preferred_time)
            
            events = []
            current_date = start_date
            
            while current_date <= end_date:
                # Check if current day is in preferred days
                if current_date.weekday() in days_of_week:
                    session_time = current_date.replace(
                        hour=preferred_hour, 
                        minute=preferred_minute
                    )
                    
                    # Ensure timezone
                    if session_time.tzinfo is None:
                        session_time = self.timezone.localize(session_time)
                        
                    # Create event from template
                    event = self.template_manager.create_session_from_template(
                        template_name, session_time
                    )
                    
                    if event:
                        # Check for conflicts
                        conflicts = self._check_event_conflicts(event)
                        if not conflicts:
                            events.append(event)
                        else:
                            logger.warning(f"Conflict detected for {session_time}, skipping")
                            
                current_date += timedelta(days=1)
                
            logger.info(f"✅ Scheduled {len(events)} recurring {template_name} sessions")
            return events
            
        except Exception as e:
            logger.error(f"Error scheduling recurring sessions: {e}")
            return []
            
    def create_calendar_events(self, events: List[CalendarEvent], 
                             export_ical: bool = True) -> Dict[str, Any]:
        """Create calendar events in Google Calendar and/or export iCal"""
        results = {
            'google_calendar': {'success': 0, 'failed': 0, 'errors': []},
            'ical_export': {'success': False, 'path': '', 'error': ''},
            'events_created': []
        }
        
        try:
            # Google Calendar integration
            if self.google_calendar and self.google_calendar.is_authenticated:
                for event in events:
                    google_event_id = self.google_calendar.create_event(event)
                    if google_event_id:
                        # Save event to database
                        self._save_event_to_database(event, google_event_id)
                        results['google_calendar']['success'] += 1
                        results['events_created'].append(event.event_id)
                    else:
                        results['google_calendar']['failed'] += 1
                        results['google_calendar']['errors'].append(f"Failed to create {event.title}")
                        
            # iCal export
            if export_ical and self.ical_exporter:
                export_path = self.ical_exporter.create_calendar_export(events)
                if export_path:
                    results['ical_export']['success'] = True
                    results['ical_export']['path'] = export_path
                    
                    # Mark events as exported
                    for event in events:
                        self._update_event_ical_status(event.event_id, True)
                else:
                    results['ical_export']['error'] = "Failed to create iCal export"
                    
            logger.info(f"✅ Calendar events created: {results['google_calendar']['success']} Google Calendar, "
                       f"iCal export: {results['ical_export']['success']}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error creating calendar events: {e}")
            results['google_calendar']['errors'].append(str(e))
            results['ical_export']['error'] = str(e)
            return results
            
    def suggest_optimal_schedule(self, target_date: datetime = None,
                               session_preferences: Dict = None) -> Dict[str, Any]:
        """Suggest optimal schedule for a day based on preferences and constraints"""
        try:
            if target_date is None:
                target_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                
            if session_preferences is None:
                session_preferences = {
                    'preferred_start_time': '09:00',
                    'preferred_end_time': '17:00',
                    'break_duration_minutes': 60,
                    'max_continuous_work_hours': 3,
                    'session_types': ['planning', 'coding', 'testing', 'polish']
                }
                
            # Analyze existing commitments
            day_start = target_date
            day_end = target_date + timedelta(days=1)
            
            existing_events = self._get_existing_events_for_day(day_start, day_end)
            available_slots = self._find_available_time_slots(
                day_start, day_end, existing_events, session_preferences
            )
            
            # Generate suggestions
            suggestions = []
            
            for slot in available_slots:
                if slot['duration_hours'] >= 3:  # Minimum for productive block
                    # Create optimized block for this slot
                    block = SchedulingBlock(
                        block_id=f"suggested_{int(slot['start'].timestamp())}",
                        start_time=slot['start'],
                        end_time=slot['end'],
                        total_duration_hours=min(slot['duration_hours'], 5.0)
                    )
                    
                    # Optimize sessions for this block
                    optimized_events = self.optimize_session_schedule(
                        block, session_preferences.get('session_types')
                    )
                    
                    if optimized_events:
                        suggestions.append({
                            'block': block,
                            'events': optimized_events,
                            'efficiency_score': block.efficiency_score,
                            'slot_info': slot
                        })
                        
            # Sort by efficiency score
            suggestions.sort(key=lambda x: x['efficiency_score'], reverse=True)
            
            result = {
                'target_date': target_date.isoformat(),
                'available_slots_count': len(available_slots),
                'suggestions_count': len(suggestions),
                'best_suggestion': suggestions[0] if suggestions else None,
                'all_suggestions': suggestions,
                'existing_events_count': len(existing_events)
            }
            
            logger.info(f"✅ Generated {len(suggestions)} schedule suggestions for {target_date.date()}")
            return result
            
        except Exception as e:
            logger.error(f"Error generating schedule suggestions: {e}")
            return {'error': str(e)}
            
    def _calculate_optimal_allocation(self, total_time: timedelta, 
                                    session_types: List[str]) -> Dict[str, int]:
        """Calculate optimal time allocation for session types"""
        total_minutes = int(total_time.total_seconds() / 60)
        
        # Default allocation weights
        allocation_weights = {
            'planning': 0.15,     # 15% - Setup and planning
            'coding': 0.60,       # 60% - Main development work
            'testing': 0.20,      # 20% - Testing and validation
            'polish': 0.05        # 5% - Cleanup and documentation
        }
        
        # Adjust weights based on available session types
        available_weights = {
            session_type: allocation_weights.get(session_type, 0.25)
            for session_type in session_types
        }
        
        # Normalize weights
        total_weight = sum(available_weights.values())
        if total_weight > 0:
            normalized_weights = {
                session_type: weight / total_weight
                for session_type, weight in available_weights.items()
            }
        else:
            # Equal allocation if no weights
            normalized_weights = {
                session_type: 1.0 / len(session_types)
                for session_type in session_types
            }
            
        # Calculate minutes per session type
        allocation = {}
        remaining_minutes = total_minutes
        
        for session_type in session_types[:-1]:  # All but last
            allocated = int(total_minutes * normalized_weights[session_type])
            allocation[session_type] = allocated
            remaining_minutes -= allocated
            
        # Assign remaining time to last session
        if session_types:
            allocation[session_types[-1]] = remaining_minutes
            
        return allocation
        
    def _calculate_efficiency_score(self, block: SchedulingBlock, 
                                  events: List[CalendarEvent]) -> float:
        """Calculate efficiency score for a scheduling block"""
        try:
            if not events:
                return 0.0
                
            # Factors for efficiency calculation
            factors = {
                'time_utilization': 0.3,     # How well time is utilized
                'session_balance': 0.25,     # Balance of session types
                'transition_efficiency': 0.2, # Smooth transitions between sessions
                'token_optimization': 0.25   # Optimal token usage distribution
            }
            
            # Calculate time utilization
            total_session_time = sum(
                (event.end_time - event.start_time).total_seconds() / 3600
                for event in events
            )
            time_utilization = min(1.0, total_session_time / block.total_duration_hours)
            
            # Calculate session balance (prefer diverse session types)
            session_types = [event.session_template for event in events]
            unique_types = len(set(session_types))
            session_balance = min(1.0, unique_types / 4)  # Optimal: 4 different types
            
            # Calculate transition efficiency (prefer logical session order)
            ideal_order = ['planning', 'coding', 'testing', 'polish']
            transition_score = self._calculate_transition_score(session_types, ideal_order)
            
            # Calculate token optimization
            estimated_tokens = sum(
                event.metadata.get('estimated_tokens', 0) for event in events
            )
            token_utilization = min(1.0, estimated_tokens / block.max_tokens)
            
            # Combine factors
            efficiency_score = (
                factors['time_utilization'] * time_utilization +
                factors['session_balance'] * session_balance +
                factors['transition_efficiency'] * transition_score +
                factors['token_optimization'] * token_utilization
            )
            
            return round(efficiency_score, 3)
            
        except Exception as e:
            logger.error(f"Error calculating efficiency score: {e}")
            return 0.0
            
    def _calculate_transition_score(self, actual_order: List[str], 
                                  ideal_order: List[str]) -> float:
        """Calculate how well the session order matches the ideal flow"""
        if not actual_order:
            return 0.0
            
        # Create index mapping for ideal order
        ideal_indices = {session_type: i for i, session_type in enumerate(ideal_order)}
        
        # Calculate order score
        score = 0.0
        for i in range(len(actual_order) - 1):
            current_session = actual_order[i]
            next_session = actual_order[i + 1]
            
            current_idx = ideal_indices.get(current_session, len(ideal_order))
            next_idx = ideal_indices.get(next_session, len(ideal_order))
            
            # Reward forward progress, penalize backward progress
            if next_idx > current_idx:
                score += 1.0
            elif next_idx == current_idx:
                score += 0.5
            # Backward transition gets 0 points
            
        # Normalize by number of transitions
        max_score = len(actual_order) - 1
        return score / max_score if max_score > 0 else 1.0
        
    def _check_block_conflicts(self, start_time: datetime, 
                             end_time: datetime) -> List[Dict]:
        """Check for conflicting scheduling blocks"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, start_time, end_time FROM scheduling_blocks
                WHERE (start_time < ? AND end_time > ?) OR
                      (start_time < ? AND end_time > ?) OR
                      (start_time >= ? AND end_time <= ?)
            """, (end_time, start_time, start_time, end_time, start_time, end_time))
            
            conflicts = []
            for row in cursor.fetchall():
                conflicts.append({
                    'id': row[0],
                    'start_time': datetime.fromisoformat(row[1]),
                    'end_time': datetime.fromisoformat(row[2])
                })
                
            conn.close()
            return conflicts
            
        except Exception as e:
            logger.error(f"Error checking block conflicts: {e}")
            return []
            
    def _check_event_conflicts(self, event: CalendarEvent) -> List[Dict]:
        """Check for conflicting calendar events"""
        conflicts = []
        
        # Check Google Calendar if available
        if self.google_calendar and self.google_calendar.is_authenticated:
            google_conflicts = self.google_calendar.check_conflicts(
                event.start_time, event.end_time
            )
            conflicts.extend(google_conflicts)
            
        # Check local database
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT event_id, title, start_time, end_time FROM calendar_events
                WHERE (start_time < ? AND end_time > ?) OR
                      (start_time < ? AND end_time > ?) OR
                      (start_time >= ? AND end_time <= ?)
            """, (
                event.end_time, event.start_time,
                event.start_time, event.end_time,
                event.start_time, event.end_time
            ))
            
            for row in cursor.fetchall():
                conflicts.append({
                    'id': row[0],
                    'title': row[1],
                    'start': datetime.fromisoformat(row[2]),
                    'end': datetime.fromisoformat(row[3])
                })
                
            conn.close()
            
        except Exception as e:
            logger.error(f"Error checking event conflicts: {e}")
            
        return conflicts
        
    def _save_block_to_database(self, block: SchedulingBlock):
        """Save scheduling block to database"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO scheduling_blocks (
                    id, start_time, end_time, total_duration_hours,
                    allocated_tokens, max_tokens, sessions_json,
                    efficiency_score, is_complete, timezone_name, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                block.block_id,
                block.start_time.isoformat(),
                block.end_time.isoformat(),
                block.total_duration_hours,
                block.allocated_tokens,
                block.max_tokens,
                json.dumps(block.sessions),
                block.efficiency_score,
                block.is_complete,
                str(self.timezone),
                json.dumps({})
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error saving block to database: {e}")
            
    def _save_event_to_database(self, event: CalendarEvent, google_event_id: str = None):
        """Save calendar event to database"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO calendar_events (
                    event_id, title, description, start_time, end_time,
                    location, color, session_template, block_id,
                    google_event_id, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id,
                event.title,
                event.description,
                event.start_time.isoformat(),
                event.end_time.isoformat(),
                event.location,
                event.color,
                event.session_template,
                event.block_id,
                google_event_id,
                json.dumps(event.metadata)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error saving event to database: {e}")
            
    def _update_event_ical_status(self, event_id: str, exported: bool):
        """Update iCal export status for event"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE calendar_events SET ical_exported = ? WHERE event_id = ?
            """, (exported, event_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error updating iCal status: {e}")
            
    def _get_existing_events_for_day(self, day_start: datetime, 
                                   day_end: datetime) -> List[Dict]:
        """Get existing events for a specific day"""
        events = []
        
        # Check Google Calendar
        if self.google_calendar and self.google_calendar.is_authenticated:
            google_events = self.google_calendar.list_events(day_start, day_end)
            events.extend(google_events)
            
        # Check local database
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT title, start_time, end_time FROM calendar_events
                WHERE start_time >= ? AND start_time < ?
                ORDER BY start_time
            """, (day_start.isoformat(), day_end.isoformat()))
            
            for row in cursor.fetchall():
                events.append({
                    'summary': row[0],
                    'start': {'dateTime': row[1]},
                    'end': {'dateTime': row[2]}
                })
                
            conn.close()
            
        except Exception as e:
            logger.error(f"Error getting existing events: {e}")
            
        return events
        
    def _find_available_time_slots(self, day_start: datetime, day_end: datetime,
                                 existing_events: List[Dict],
                                 preferences: Dict) -> List[Dict]:
        """Find available time slots in a day"""
        # Parse preferred working hours
        pref_start = self._parse_time_string(preferences.get('preferred_start_time', '09:00'))
        pref_end = self._parse_time_string(preferences.get('preferred_end_time', '17:00'))
        
        work_start = day_start.replace(hour=pref_start[0], minute=pref_start[1])
        work_end = day_start.replace(hour=pref_end[0], minute=pref_end[1])
        
        # Create list of busy periods
        busy_periods = []
        for event in existing_events:
            start_str = event.get('start', {}).get('dateTime', '')
            end_str = event.get('end', {}).get('dateTime', '')
            
            if start_str and end_str:
                start_time = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
                
                # Convert to local timezone
                if start_time.tzinfo:
                    start_time = start_time.astimezone(self.timezone)
                    end_time = end_time.astimezone(self.timezone)
                    
                busy_periods.append((start_time, end_time))
                
        # Sort busy periods
        busy_periods.sort(key=lambda x: x[0])
        
        # Find available slots
        available_slots = []
        current_time = work_start
        
        for busy_start, busy_end in busy_periods:
            # Check if there's a gap before this busy period
            if current_time < busy_start:
                slot_duration = (busy_start - current_time).total_seconds() / 3600
                if slot_duration >= 1.0:  # Minimum 1 hour slot
                    available_slots.append({
                        'start': current_time,
                        'end': busy_start,
                        'duration_hours': slot_duration
                    })
                    
            current_time = max(current_time, busy_end)
            
        # Check for slot after last busy period
        if current_time < work_end:
            slot_duration = (work_end - current_time).total_seconds() / 3600
            if slot_duration >= 1.0:
                available_slots.append({
                    'start': current_time,
                    'end': work_end,
                    'duration_hours': slot_duration
                })
                
        return available_slots
        
    def _parse_time_string(self, time_string: str) -> Tuple[int, int]:
        """Parse time string (HH:MM) to hour and minute"""
        try:
            parts = time_string.split(':')
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            return hour, minute
        except:
            return 9, 0  # Default to 9:00 AM
            
    def _adjust_template_duration(self, template: SessionTemplate, 
                                new_duration_minutes: int) -> SessionTemplate:
        """Adjust template duration while maintaining proportions"""
        # Calculate scaling factor
        scale_factor = new_duration_minutes / template.duration_minutes
        
        # Create adjusted template
        adjusted_template = SessionTemplate(
            name=template.name,
            duration_minutes=new_duration_minutes,
            description=template.description,
            color=template.color,
            prep_time_minutes=max(5, int(template.prep_time_minutes * scale_factor)),
            buffer_time_minutes=max(5, int(template.buffer_time_minutes * scale_factor)),
            checklist=template.checklist.copy(),
            default_reminders=template.default_reminders.copy()
        )
        
        return adjusted_template
        
    def setup_google_calendar(self, credentials_file: str = None) -> bool:
        """Setup Google Calendar integration"""
        try:
            self.google_calendar = GoogleCalendarManager(credentials_file)
            return self.google_calendar.authenticate()
        except Exception as e:
            logger.error(f"Error setting up Google Calendar: {e}")
            return False
            
    def export_schedule_to_ical(self, block_id: str = None, 
                              filename: str = None) -> str:
        """Export schedule to iCal file"""
        try:
            if not self.ical_exporter:
                logger.error("iCal exporter not available")
                return ""
                
            # Get events to export
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            if block_id:
                cursor.execute("""
                    SELECT * FROM calendar_events WHERE block_id = ?
                    ORDER BY start_time
                """, (block_id,))
            else:
                cursor.execute("""
                    SELECT * FROM calendar_events
                    ORDER BY start_time
                """)
                
            events = []
            for row in cursor.fetchall():
                event = CalendarEvent(
                    event_id=row[0],
                    title=row[1],
                    description=row[2],
                    start_time=datetime.fromisoformat(row[3]),
                    end_time=datetime.fromisoformat(row[4]),
                    location=row[5],
                    color=row[6],
                    session_template=row[7],
                    block_id=row[8],
                    metadata=json.loads(row[10]) if row[10] else {}
                )
                events.append(event)
                
            conn.close()
            
            if events:
                export_path = self.ical_exporter.create_calendar_export(events, filename)
                logger.info(f"✅ iCal export created: {export_path}")
                return export_path
            else:
                logger.warning("No events found to export")
                return ""
                
        except Exception as e:
            logger.error(f"Error exporting to iCal: {e}")
            return ""


def main():
    """Test the calendar scheduler"""
    # Test scheduler initialization
    database_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
    
    scheduler = FiveHourBlockScheduler(database_path)
    
    # Create a test 5-hour block for tomorrow at 9 AM
    tomorrow_9am = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    block = scheduler.create_5_hour_block(tomorrow_9am)
    if block:
        print(f"✅ Created test block: {block.block_id}")
        
        # Optimize the schedule
        events = scheduler.optimize_session_schedule(block)
        print(f"✅ Optimized schedule: {len(events)} sessions")
        
        # Export to iCal
        export_path = scheduler.export_schedule_to_ical(block.block_id)
        if export_path:
            print(f"✅ iCal export created: {export_path}")
            
        # Generate suggestions for tomorrow
        suggestions = scheduler.suggest_optimal_schedule(tomorrow_9am.replace(hour=0))
        print(f"✅ Generated {suggestions['suggestions_count']} schedule suggestions")
        
    else:
        print("❌ Failed to create test block")


if __name__ == "__main__":
    main()