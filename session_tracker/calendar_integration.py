#!/usr/bin/env python3
"""
Claude Code Optimizer - Calendar Integration System
===================================================

Comprehensive calendar integration for Claude Code session planning within 5-hour rate limit blocks.
Provides Google Calendar API integration, iCal export, session templates, and 5-hour block optimization.

Features:
- Google Calendar API integration with OAuth 2.0
- iCal export for cross-platform compatibility  
- Session templates for optimal productivity phases
- 5-hour block scheduling within rate limits
- Automated calendar event generation
- Timezone handling and conflict detection
- Recurring session templates
- Integration with existing session tracking
"""

import os
import json
import sqlite3
import pickle
import logging
import pytz
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from uuid import uuid4
import threading
import time

# Google Calendar API imports
try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_CALENDAR_AVAILABLE = True
except ImportError:
    GOOGLE_CALENDAR_AVAILABLE = False
    logging.warning("Google Calendar API not available. Install with: pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib")

# iCal generation imports
try:
    from icalendar import Calendar, Event, vCalAddress, vText, vDDDTypes
    ICAL_AVAILABLE = True
except ImportError:
    ICAL_AVAILABLE = False
    logging.warning("iCal support not available. Install with: pip install icalendar")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [CALENDAR-INTEGRATION] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


@dataclass
class SessionTemplate:
    """Session template for different productivity phases"""
    name: str
    duration_minutes: int
    description: str
    color: str  # Calendar color
    prep_time_minutes: int = 15
    buffer_time_minutes: int = 15
    checklist: List[str] = None
    default_reminders: List[int] = None  # Minutes before start
    
    def __post_init__(self):
        if self.checklist is None:
            self.checklist = []
        if self.default_reminders is None:
            self.default_reminders = [15, 5]  # 15 and 5 minutes before


@dataclass
class SchedulingBlock:
    """5-hour scheduling block for rate limit compliance"""
    block_id: str
    start_time: datetime
    end_time: datetime
    total_duration_hours: float = 5.0
    allocated_tokens: int = 0
    max_tokens: int = 19146  # Current sustainable daily limit
    sessions: List[Dict] = None
    efficiency_score: float = 0.0
    is_complete: bool = False
    
    def __post_init__(self):
        if self.sessions is None:
            self.sessions = []
            
    def get_remaining_time(self) -> timedelta:
        """Get remaining time in the block"""
        allocated_minutes = sum(
            session.get('duration_minutes', 0) + 
            session.get('prep_time_minutes', 0) + 
            session.get('buffer_time_minutes', 0)
            for session in self.sessions
        )
        total_minutes = self.total_duration_hours * 60
        return timedelta(minutes=max(0, total_minutes - allocated_minutes))
        
    def get_token_usage_estimate(self) -> int:
        """Estimate token usage for this block"""
        return sum(session.get('estimated_tokens', 0) for session in self.sessions)


@dataclass
class CalendarEvent:
    """Calendar event representation"""
    event_id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    location: str = ""
    attendees: List[str] = None
    reminders: List[int] = None
    color: str = "blue"
    recurring: bool = False
    recurrence_rule: str = ""
    session_template: str = ""
    block_id: str = ""
    metadata: Dict = None
    
    def __post_init__(self):
        if self.attendees is None:
            self.attendees = []
        if self.reminders is None:
            self.reminders = [15, 5]
        if self.metadata is None:
            self.metadata = {}


class GoogleCalendarManager:
    """Google Calendar API manager with OAuth 2.0 authentication"""
    
    # Calendar API scopes - read/write access to calendars
    SCOPES = ['https://www.googleapis.com/auth/calendar']
    
    def __init__(self, credentials_file: str = None, token_file: str = None):
        """Initialize Google Calendar manager"""
        self.base_dir = Path.home() / ".cache" / "claude_optimizer" / "calendar"
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
        self.credentials_file = credentials_file or self.base_dir / "credentials.json"
        self.token_file = token_file or self.base_dir / "token.pickle"
        
        self.service = None
        self.calendar_id = None
        self.is_authenticated = False
        
        if not GOOGLE_CALENDAR_AVAILABLE:
            raise ImportError("Google Calendar API dependencies not installed")
            
    def authenticate(self) -> bool:
        """Authenticate with Google Calendar API using OAuth 2.0"""
        try:
            creds = None
            
            # Load existing token
            if self.token_file.exists():
                with open(self.token_file, 'rb') as token:
                    creds = pickle.load(token)
                    
            # If no valid credentials, run OAuth flow
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    try:
                        creds.refresh(Request())
                    except Exception as e:
                        logger.warning(f"Token refresh failed: {e}")
                        creds = None
                        
                if not creds:
                    if not self.credentials_file.exists():
                        logger.error(f"Google Calendar credentials not found at {self.credentials_file}")
                        logger.info("To set up Google Calendar integration:")
                        logger.info("1. Go to https://console.cloud.google.com/")
                        logger.info("2. Create a new project or select existing")
                        logger.info("3. Enable the Google Calendar API")
                        logger.info("4. Create OAuth 2.0 credentials (Desktop application)")
                        logger.info(f"5. Download and save as {self.credentials_file}")
                        return False
                        
                    flow = InstalledAppFlow.from_client_secrets_file(
                        str(self.credentials_file), self.SCOPES
                    )
                    creds = flow.run_local_server(port=0)
                    
                # Save credentials for next run
                with open(self.token_file, 'wb') as token:
                    pickle.dump(creds, token)
                    
            # Build service
            self.service = build('calendar', 'v3', credentials=creds)
            self.is_authenticated = True
            
            # Get or create Claude Code calendar
            self.calendar_id = self._get_or_create_calendar()
            
            logger.info("✅ Google Calendar authentication successful")
            return True
            
        except Exception as e:
            logger.error(f"Google Calendar authentication failed: {e}")
            return False
            
    def _get_or_create_calendar(self) -> str:
        """Get or create the Claude Code calendar"""
        try:
            calendar_name = "Claude Code Sessions"
            
            # List existing calendars
            calendars_result = self.service.calendarList().list().execute()
            calendars = calendars_result.get('items', [])
            
            # Look for existing calendar
            for calendar in calendars:
                if calendar['summary'] == calendar_name:
                    logger.info(f"Found existing calendar: {calendar_name}")
                    return calendar['id']
                    
            # Create new calendar
            calendar_body = {
                'summary': calendar_name,
                'description': 'Claude Code Optimizer - 5-hour productivity blocks and session planning',
                'timeZone': str(datetime.now().astimezone().tzinfo)
            }
            
            created_calendar = self.service.calendars().insert(body=calendar_body).execute()
            calendar_id = created_calendar['id']
            
            logger.info(f"✅ Created new calendar: {calendar_name} ({calendar_id})")
            return calendar_id
            
        except Exception as e:
            logger.error(f"Error managing calendar: {e}")
            return 'primary'  # Fallback to primary calendar
            
    def create_event(self, event: CalendarEvent) -> Optional[str]:
        """Create calendar event"""
        if not self.is_authenticated or not self.service:
            logger.error("Not authenticated with Google Calendar")
            return None
            
        try:
            # Convert to Google Calendar event format
            event_body = {
                'summary': event.title,
                'description': self._format_event_description(event),
                'start': {
                    'dateTime': event.start_time.isoformat(),
                    'timeZone': str(event.start_time.tzinfo) if event.start_time.tzinfo else 'UTC'
                },
                'end': {
                    'dateTime': event.end_time.isoformat(),
                    'timeZone': str(event.end_time.tzinfo) if event.end_time.tzinfo else 'UTC'
                },
                'location': event.location,
                'colorId': self._get_color_id(event.color),
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'popup', 'minutes': minutes}
                        for minutes in event.reminders
                    ]
                }
            }
            
            # Add attendees if specified
            if event.attendees:
                event_body['attendees'] = [
                    {'email': email} for email in event.attendees
                ]
                
            # Add recurrence if specified
            if event.recurring and event.recurrence_rule:
                event_body['recurrence'] = [event.recurrence_rule]
                
            # Create the event
            created_event = self.service.events().insert(
                calendarId=self.calendar_id,
                body=event_body
            ).execute()
            
            google_event_id = created_event['id']
            logger.info(f"✅ Created Google Calendar event: {event.title} ({google_event_id})")
            
            return google_event_id
            
        except HttpError as e:
            logger.error(f"Google Calendar API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating calendar event: {e}")
            return None
            
    def update_event(self, google_event_id: str, event: CalendarEvent) -> bool:
        """Update existing calendar event"""
        if not self.is_authenticated or not self.service:
            return False
            
        try:
            # Get existing event
            existing_event = self.service.events().get(
                calendarId=self.calendar_id,
                eventId=google_event_id
            ).execute()
            
            # Update fields
            existing_event.update({
                'summary': event.title,
                'description': self._format_event_description(event),
                'start': {
                    'dateTime': event.start_time.isoformat(),
                    'timeZone': str(event.start_time.tzinfo) if event.start_time.tzinfo else 'UTC'
                },
                'end': {
                    'dateTime': event.end_time.isoformat(),
                    'timeZone': str(event.end_time.tzinfo) if event.end_time.tzinfo else 'UTC'
                },
                'location': event.location,
                'colorId': self._get_color_id(event.color)
            })
            
            # Update the event
            self.service.events().update(
                calendarId=self.calendar_id,
                eventId=google_event_id,
                body=existing_event
            ).execute()
            
            logger.info(f"✅ Updated Google Calendar event: {google_event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating calendar event: {e}")
            return False
            
    def delete_event(self, google_event_id: str) -> bool:
        """Delete calendar event"""
        if not self.is_authenticated or not self.service:
            return False
            
        try:
            self.service.events().delete(
                calendarId=self.calendar_id,
                eventId=google_event_id
            ).execute()
            
            logger.info(f"✅ Deleted Google Calendar event: {google_event_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting calendar event: {e}")
            return False
            
    def list_events(self, start_time: datetime, end_time: datetime) -> List[Dict]:
        """List events in time range"""
        if not self.is_authenticated or not self.service:
            return []
            
        try:
            events_result = self.service.events().list(
                calendarId=self.calendar_id,
                timeMin=start_time.isoformat(),
                timeMax=end_time.isoformat(),
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            return events_result.get('items', [])
            
        except Exception as e:
            logger.error(f"Error listing calendar events: {e}")
            return []
            
    def check_conflicts(self, start_time: datetime, end_time: datetime) -> List[Dict]:
        """Check for conflicting events in time range"""
        events = self.list_events(start_time, end_time)
        conflicts = []
        
        for event in events:
            event_start = datetime.fromisoformat(
                event['start'].get('dateTime', event['start'].get('date'))
            )
            event_end = datetime.fromisoformat(
                event['end'].get('dateTime', event['end'].get('date'))
            )
            
            # Check for overlap
            if (start_time < event_end and end_time > event_start):
                conflicts.append({
                    'id': event['id'],
                    'title': event.get('summary', 'Untitled'),
                    'start': event_start,
                    'end': event_end
                })
                
        return conflicts
        
    def _format_event_description(self, event: CalendarEvent) -> str:
        """Format event description with metadata"""
        description_parts = [event.description]
        
        if event.session_template:
            description_parts.append(f"\n🎯 Session Type: {event.session_template}")
            
        if event.block_id:
            description_parts.append(f"📊 5-Hour Block: {event.block_id}")
            
        if event.metadata:
            description_parts.append(f"\n📝 Session Details:")
            for key, value in event.metadata.items():
                description_parts.append(f"  • {key}: {value}")
                
        description_parts.append(f"\n🤖 Generated by Claude Code Optimizer")
        description_parts.append(f"🔗 Generated with Claude Code (https://claude.ai/code)")
        
        return '\n'.join(description_parts)
        
    def _get_color_id(self, color: str) -> str:
        """Convert color name to Google Calendar color ID"""
        color_map = {
            'blue': '1',
            'green': '2',
            'purple': '3',
            'red': '4',
            'yellow': '5',
            'orange': '6',
            'turquoise': '7',
            'gray': '8',
            'bold_blue': '9',
            'bold_green': '10',
            'bold_red': '11'
        }
        return color_map.get(color.lower(), '1')  # Default to blue


class ICalExporter:
    """iCal/ICS file export functionality for cross-platform compatibility"""
    
    def __init__(self):
        if not ICAL_AVAILABLE:
            raise ImportError("iCal dependencies not installed")
            
        self.calendar_name = "Claude Code Sessions"
        self.organizer_email = "claude-code-optimizer@localhost"
        
    def create_calendar_export(self, events: List[CalendarEvent], 
                             filename: str = None) -> str:
        """Create iCal export file with all events"""
        try:
            # Create calendar
            cal = Calendar()
            cal.add('prodid', '-//Claude Code Optimizer//Calendar Integration//EN')
            cal.add('version', '2.0')
            cal.add('calscale', 'GREGORIAN')
            cal.add('method', 'PUBLISH')
            cal.add('x-wr-calname', self.calendar_name)
            cal.add('x-wr-caldesc', 'Claude Code Optimizer - 5-hour productivity blocks and session planning')
            
            # Add timezone info
            timezone = pytz.timezone(str(datetime.now().astimezone().tzinfo))
            cal.add('x-wr-timezone', str(timezone))
            
            # Add events
            for event in events:
                ical_event = self._create_ical_event(event)
                cal.add_component(ical_event)
                
            # Generate filename if not provided
            if not filename:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"claude_code_sessions_{timestamp}.ics"
                
            # Ensure .ics extension
            if not filename.endswith('.ics'):
                filename += '.ics'
                
            # Write to file
            export_dir = Path.home() / "Downloads" / "claude_code_calendar"
            export_dir.mkdir(parents=True, exist_ok=True)
            
            export_path = export_dir / filename
            with open(export_path, 'wb') as f:
                f.write(cal.to_ical())
                
            logger.info(f"✅ iCal export created: {export_path}")
            return str(export_path)
            
        except Exception as e:
            logger.error(f"Error creating iCal export: {e}")
            return ""
            
    def create_single_event_export(self, event: CalendarEvent, 
                                 filename: str = None) -> str:
        """Create iCal export for a single event"""
        return self.create_calendar_export([event], filename)
        
    def _create_ical_event(self, event: CalendarEvent) -> Event:
        """Create iCal event from CalendarEvent"""
        ical_event = Event()
        
        # Basic event info
        ical_event.add('uid', event.event_id)
        ical_event.add('dtstart', event.start_time)
        ical_event.add('dtend', event.end_time)
        ical_event.add('dtstamp', datetime.now(timezone.utc))
        ical_event.add('summary', event.title)
        ical_event.add('description', self._format_ical_description(event))
        
        if event.location:
            ical_event.add('location', event.location)
            
        # Add organizer
        organizer = vCalAddress(f'MAILTO:{self.organizer_email}')
        organizer.params['cn'] = vText('Claude Code Optimizer')
        ical_event['organizer'] = organizer
        
        # Add attendees
        for attendee_email in event.attendees:
            attendee = vCalAddress(f'MAILTO:{attendee_email}')
            attendee.params['cn'] = vText(attendee_email.split('@')[0])
            attendee.params['ROLE'] = vText('REQ-PARTICIPANT')
            ical_event.add('attendee', attendee)
            
        # Add reminders (alarms)
        for minutes in event.reminders:
            alarm = Event()
            alarm.add('action', 'DISPLAY')
            alarm.add('description', f'{event.title} reminder')
            alarm.add('trigger', timedelta(minutes=-minutes))
            ical_event.add_component(alarm)
            
        # Add recurrence if specified
        if event.recurring and event.recurrence_rule:
            ical_event.add('rrule', event.recurrence_rule)
            
        # Add custom properties
        ical_event.add('x-session-template', event.session_template)
        ical_event.add('x-block-id', event.block_id)
        ical_event.add('x-color', event.color)
        
        # Add metadata as extended properties
        for key, value in event.metadata.items():
            ical_event.add(f'x-{key.lower().replace(" ", "-")}', str(value))
            
        return ical_event
        
    def _format_ical_description(self, event: CalendarEvent) -> str:
        """Format iCal event description"""
        description_parts = [event.description]
        
        if event.session_template:
            description_parts.append(f"\\n\\nSession Type: {event.session_template}")
            
        if event.block_id:
            description_parts.append(f"5-Hour Block: {event.block_id}")
            
        if event.metadata:
            description_parts.append(f"\\n\\nSession Details:")
            for key, value in event.metadata.items():
                description_parts.append(f"  • {key}: {value}")
                
        description_parts.append(f"\\n\\nGenerated by Claude Code Optimizer")
        description_parts.append(f"Generated with Claude Code (https://claude.ai/code)")
        
        return '\\n'.join(description_parts)


class SessionTemplateManager:
    """Manages session templates for different productivity phases"""
    
    def __init__(self):
        self.templates = self._create_default_templates()
        
    def _create_default_templates(self) -> Dict[str, SessionTemplate]:
        """Create default session templates"""
        return {
            'planning': SessionTemplate(
                name='Planning Session',
                duration_minutes=60,
                description='Requirements analysis, architecture design, task breakdown and sprint planning',
                color='blue',
                prep_time_minutes=15,
                buffer_time_minutes=15,
                checklist=[
                    'Review project requirements and goals',
                    'Break down complex tasks into manageable chunks',
                    'Estimate time and complexity for each task',
                    'Identify potential blockers and dependencies',
                    'Set clear success criteria for the session',
                    'Prepare development environment and tools'
                ],
                default_reminders=[30, 15, 5]
            ),
            'coding': SessionTemplate(
                name='Coding Session',
                duration_minutes=180,  # 3 hours
                description='Active development and implementation within rate limits',
                color='green',
                prep_time_minutes=30,
                buffer_time_minutes=15,
                checklist=[
                    'Environment setup and dependency check',
                    'Review planned tasks and priorities',
                    'Set up version control and branching',
                    'Configure debugging and testing tools',
                    'Start with highest priority/impact tasks',
                    'Maintain regular commits with clear messages',
                    'Monitor token usage and rate limits',
                    'Document key decisions and trade-offs'
                ],
                default_reminders=[30, 15, 5]
            ),
            'testing': SessionTemplate(
                name='Testing & QA Session',
                duration_minutes=60,
                description='Quality assurance, debugging, validation and test coverage',
                color='yellow',
                prep_time_minutes=15,
                buffer_time_minutes=15,
                checklist=[
                    'Run comprehensive test suite',
                    'Verify all new features work as expected',
                    'Test edge cases and error conditions',
                    'Check cross-platform compatibility',
                    'Validate performance requirements',
                    'Review code coverage and quality metrics',
                    'Fix any critical bugs discovered',
                    'Update test documentation'
                ],
                default_reminders=[15, 5]
            ),
            'polish': SessionTemplate(
                name='Polish & Documentation',
                duration_minutes=45,
                description='Code cleanup, optimization, documentation and final preparations',
                color='purple',
                prep_time_minutes=15,
                buffer_time_minutes=15,
                checklist=[
                    'Clean up code and remove debug statements',
                    'Optimize performance bottlenecks',
                    'Update documentation and README files',
                    'Verify all TODO items are addressed',
                    'Format code according to style guidelines',
                    'Prepare deployment or release notes',
                    'Archive session logs and metrics',
                    'Plan next session priorities'
                ],
                default_reminders=[15, 5]
            ),
            'deep_work': SessionTemplate(
                name='Deep Work Block',
                duration_minutes=120,  # 2 hours
                description='Focused deep work session for complex problem solving',
                color='bold_blue',
                prep_time_minutes=30,
                buffer_time_minutes=30,
                checklist=[
                    'Clear workspace of distractions',
                    'Set specific deep work objectives',
                    'Disable non-essential notifications',
                    'Prepare research materials and references',
                    'Set clear break boundaries and timing',
                    'Focus on single complex problem or feature',
                    'Minimize context switching',
                    'Document breakthrough insights'
                ],
                default_reminders=[30, 10]
            )
        }
        
    def get_template(self, template_name: str) -> Optional[SessionTemplate]:
        """Get session template by name"""
        return self.templates.get(template_name)
        
    def list_templates(self) -> List[str]:
        """List all available template names"""
        return list(self.templates.keys())
        
    def get_all_templates(self) -> Dict[str, SessionTemplate]:
        """Get all templates"""
        return self.templates.copy()
        
    def add_custom_template(self, name: str, template: SessionTemplate):
        """Add custom session template"""
        self.templates[name] = template
        logger.info(f"Added custom template: {name}")
        
    def create_session_from_template(self, template_name: str, 
                                   start_time: datetime,
                                   custom_title: str = None) -> Optional[CalendarEvent]:
        """Create calendar event from session template"""
        template = self.get_template(template_name)
        if not template:
            logger.error(f"Template not found: {template_name}")
            return None
            
        # Calculate times including prep and buffer
        prep_start = start_time - timedelta(minutes=template.prep_time_minutes)
        session_start = start_time
        session_end = start_time + timedelta(minutes=template.duration_minutes)
        buffer_end = session_end + timedelta(minutes=template.buffer_time_minutes)
        
        # Create event
        event_title = custom_title or f"{template.name} - {template.duration_minutes}min"
        
        event = CalendarEvent(
            event_id=str(uuid4()),
            title=event_title,
            description=self._format_template_description(template),
            start_time=prep_start,
            end_time=buffer_end,
            color=template.color,
            reminders=template.default_reminders,
            session_template=template_name,
            metadata={
                'template_name': template.name,
                'session_duration_minutes': template.duration_minutes,
                'prep_time_minutes': template.prep_time_minutes,
                'buffer_time_minutes': template.buffer_time_minutes,
                'checklist_items': len(template.checklist),
                'estimated_tokens': self._estimate_tokens_for_template(template)
            }
        )
        
        return event
        
    def _format_template_description(self, template: SessionTemplate) -> str:
        """Format template description for calendar event"""
        description_parts = [
            template.description,
            f"\n🎯 Duration: {template.duration_minutes} minutes",
            f"⏰ Prep Time: {template.prep_time_minutes} minutes",
            f"📝 Buffer Time: {template.buffer_time_minutes} minutes"
        ]
        
        if template.checklist:
            description_parts.append(f"\n✅ Session Checklist:")
            for item in template.checklist:
                description_parts.append(f"  • {item}")
                
        return '\n'.join(description_parts)
        
    def _estimate_tokens_for_template(self, template: SessionTemplate) -> int:
        """Estimate token usage for template duration"""
        # Token usage estimates based on session type and duration
        tokens_per_minute = {
            'planning': 10,      # Lower token usage for planning
            'coding': 25,        # Higher token usage for coding
            'testing': 15,       # Medium token usage for testing
            'polish': 8,         # Lower token usage for cleanup
            'deep_work': 30      # Highest token usage for complex work
        }
        
        template_key = template.name.lower().split()[0]
        rate = tokens_per_minute.get(template_key, 20)  # Default 20 tokens/minute
        
        return template.duration_minutes * rate


# Continue in next part due to length...