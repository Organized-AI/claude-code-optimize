#!/usr/bin/env python3
"""
Test Calendar Integration (No External Dependencies)
===================================================

Test version of calendar integration that demonstrates functionality
without requiring external dependencies.
"""

import os
import json
import sqlite3
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from uuid import uuid4

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [CALENDAR-TEST] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


@dataclass
class SessionTemplate:
    """Session template for different productivity phases"""
    name: str
    duration_minutes: int
    description: str
    color: str
    prep_time_minutes: int = 15
    buffer_time_minutes: int = 15
    checklist: List[str] = None
    default_reminders: List[int] = None
    
    def __post_init__(self):
        if self.checklist is None:
            self.checklist = []
        if self.default_reminders is None:
            self.default_reminders = [15, 5]


@dataclass
class CalendarEvent:
    """Calendar event representation"""
    event_id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    location: str = ""
    color: str = "blue"
    session_template: str = ""
    block_id: str = ""
    metadata: Dict = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class SchedulingBlock:
    """5-hour scheduling block"""
    block_id: str
    start_time: datetime
    end_time: datetime
    total_duration_hours: float = 5.0
    sessions: List[Dict] = None
    efficiency_score: float = 0.0
    
    def __post_init__(self):
        if self.sessions is None:
            self.sessions = []


class TestSessionTemplateManager:
    """Test version of session template manager"""
    
    def __init__(self):
        self.templates = {
            'planning': SessionTemplate(
                name='Planning Session',
                duration_minutes=60,
                description='Requirements analysis, architecture design, task breakdown',
                color='blue',
                checklist=[
                    'Review project requirements',
                    'Break down tasks',
                    'Set success criteria'
                ]
            ),
            'coding': SessionTemplate(
                name='Coding Session',
                duration_minutes=180,
                description='Active development and implementation',
                color='green',
                checklist=[
                    'Environment setup',
                    'Start with highest priority tasks',
                    'Monitor token usage'
                ]
            ),
            'testing': SessionTemplate(
                name='Testing Session',
                duration_minutes=60,
                description='Quality assurance and validation',
                color='yellow',
                checklist=[
                    'Run comprehensive tests',
                    'Check edge cases',
                    'Validate performance'
                ]
            ),
            'polish': SessionTemplate(
                name='Polish Session',
                duration_minutes=45,
                description='Code cleanup and documentation',
                color='purple',
                checklist=[
                    'Clean up code',
                    'Update documentation',
                    'Prepare deployment'
                ]
            )
        }
        
    def get_template(self, name: str) -> Optional[SessionTemplate]:
        return self.templates.get(name)
        
    def list_templates(self) -> List[str]:
        return list(self.templates.keys())
        
    def create_session_from_template(self, template_name: str, start_time: datetime) -> Optional[CalendarEvent]:
        template = self.get_template(template_name)
        if not template:
            return None
            
        event = CalendarEvent(
            event_id=str(uuid4()),
            title=f"{template.name} - {template.duration_minutes}min",
            description=template.description,
            start_time=start_time,
            end_time=start_time + timedelta(minutes=template.duration_minutes + template.prep_time_minutes + template.buffer_time_minutes),
            color=template.color,
            session_template=template_name,
            metadata={
                'template_name': template.name,
                'estimated_tokens': template.duration_minutes * 20  # 20 tokens per minute estimate
            }
        )
        
        return event


class TestICalExporter:
    """Test version of iCal exporter"""
    
    def create_calendar_export(self, events: List[CalendarEvent], filename: str = None) -> str:
        """Create a simple text export instead of iCal"""
        try:
            if not filename:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                filename = f"claude_code_sessions_{timestamp}.txt"
                
            export_dir = Path.home() / "Downloads" / "claude_code_calendar"
            export_dir.mkdir(parents=True, exist_ok=True)
            
            export_path = export_dir / filename
            
            with open(export_path, 'w') as f:
                f.write("Claude Code Optimizer - Session Schedule\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Generated: {datetime.now().isoformat()}\n")
                f.write(f"Total Events: {len(events)}\n\n")
                
                for i, event in enumerate(events, 1):
                    f.write(f"Event {i}: {event.title}\n")
                    f.write(f"  Start: {event.start_time}\n")
                    f.write(f"  End: {event.end_time}\n")
                    f.write(f"  Template: {event.session_template}\n")
                    f.write(f"  Description: {event.description}\n")
                    f.write(f"  Estimated Tokens: {event.metadata.get('estimated_tokens', 0)}\n")
                    f.write("\n")
                    
            logger.info(f"✅ Test export created: {export_path}")
            return str(export_path)
            
        except Exception as e:
            logger.error(f"Error creating test export: {e}")
            return ""


class TestCalendarScheduler:
    """Test version of calendar scheduler"""
    
    def __init__(self, database_path: str):
        self.database_path = database_path
        self.template_manager = TestSessionTemplateManager()
        self.ical_exporter = TestICalExporter()
        
    def create_5_hour_block(self, start_time: datetime) -> Optional[SchedulingBlock]:
        """Create a test 5-hour block"""
        try:
            end_time = start_time + timedelta(hours=5)
            block_id = f"test_block_{int(start_time.timestamp())}"
            
            block = SchedulingBlock(
                block_id=block_id,
                start_time=start_time,
                end_time=end_time
            )
            
            logger.info(f"✅ Created test 5-hour block: {block_id}")
            return block
            
        except Exception as e:
            logger.error(f"Error creating 5-hour block: {e}")
            return None
            
    def optimize_session_schedule(self, block: SchedulingBlock, session_types: List[str] = None) -> List[CalendarEvent]:
        """Create optimized session schedule"""
        try:
            if session_types is None:
                session_types = ['planning', 'coding', 'testing', 'polish']
                
            events = []
            current_time = block.start_time
            
            # Simple time allocation
            time_per_session = (5 * 60) // len(session_types)  # minutes per session
            
            for session_type in session_types:
                event = self.template_manager.create_session_from_template(session_type, current_time)
                if event:
                    # Adjust duration to fit allocation
                    event.end_time = current_time + timedelta(minutes=time_per_session)
                    event.block_id = block.block_id
                    
                    events.append(event)
                    block.sessions.append(asdict(event))
                    
                    current_time = event.end_time
                    
            # Calculate efficiency score
            block.efficiency_score = len(events) / len(session_types) if session_types else 0
            
            logger.info(f"✅ Optimized schedule: {len(events)} sessions")
            return events
            
        except Exception as e:
            logger.error(f"Error optimizing schedule: {e}")
            return []
            
    def create_calendar_events(self, events: List[CalendarEvent], export_ical: bool = True) -> Dict[str, Any]:
        """Create calendar events (test mode)"""
        results = {
            'test_export': {'success': False, 'path': ''},
            'events_created': []
        }
        
        try:
            # Create test export
            if export_ical:
                export_path = self.ical_exporter.create_calendar_export(events)
                results['test_export']['success'] = bool(export_path)
                results['test_export']['path'] = export_path
                
            results['events_created'] = [event.event_id for event in events]
            
            logger.info(f"✅ Test calendar events created: {len(events)} events")
            return results
            
        except Exception as e:
            logger.error(f"Error creating test calendar events: {e}")
            return results


class TestCalendarAPI:
    """Test version of calendar API"""
    
    def __init__(self, database_path: str):
        self.database_path = database_path
        self.scheduler = TestCalendarScheduler(database_path)
        self.template_manager = TestSessionTemplateManager()
        
    def create_session_event(self, template_name: str, start_time: datetime, custom_title: str = None) -> Dict[str, Any]:
        """Create a test session event"""
        try:
            event = self.template_manager.create_session_from_template(template_name, start_time)
            
            if not event:
                return {'success': False, 'error': f'Template not found: {template_name}'}
                
            if custom_title:
                event.title = custom_title
                
            # Simulate calendar creation
            results = self.scheduler.create_calendar_events([event], True)
            
            return {
                'success': True,
                'event': asdict(event),
                'test_results': results,
                'template_used': template_name
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def create_5_hour_productivity_block(self, start_time: datetime, session_sequence: List[str] = None) -> Dict[str, Any]:
        """Create test 5-hour productivity block"""
        try:
            session_sequence = session_sequence or ['planning', 'coding', 'testing', 'polish']
            
            block = self.scheduler.create_5_hour_block(start_time)
            if not block:
                return {'success': False, 'error': 'Failed to create block'}
                
            events = self.scheduler.optimize_session_schedule(block, session_sequence)
            if not events:
                return {'success': False, 'error': 'Failed to optimize schedule'}
                
            results = self.scheduler.create_calendar_events(events, True)
            
            return {
                'success': True,
                'block': asdict(block),
                'events': [asdict(event) for event in events],
                'test_results': results,
                'efficiency_score': block.efficiency_score,
                'total_estimated_tokens': sum(event.metadata.get('estimated_tokens', 0) for event in events)
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def get_api_status(self) -> Dict[str, Any]:
        """Get test API status"""
        return {
            'status': 'test_mode',
            'session_templates': {
                'available_templates': self.template_manager.list_templates(),
                'template_count': len(self.template_manager.list_templates())
            },
            'test_export': {'available': True},
            'database': {'path': self.database_path}
        }


def test_calendar_integration():
    """Test the calendar integration system"""
    print("🧪 Testing Calendar Integration System")
    print("=" * 60)
    
    # Initialize test API
    database_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
    api = TestCalendarAPI(database_path)
    
    # Test 1: API Status
    print("\n📊 Test 1: API Status")
    status = api.get_api_status()
    print(f"Status: {status['status']}")
    print(f"Templates: {status['session_templates']['available_templates']}")
    
    # Test 2: Create Single Session
    print("\n📅 Test 2: Create Single Session Event")
    tomorrow_9am = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    session_result = api.create_session_event(
        template_name='coding',
        start_time=tomorrow_9am,
        custom_title='Test Coding Session'
    )
    
    if session_result['success']:
        print(f"✅ Session created: {session_result['event']['title']}")
        print(f"   Time: {session_result['event']['start_time']} - {session_result['event']['end_time']}")
        print(f"   Estimated tokens: {session_result['event']['metadata']['estimated_tokens']}")
    else:
        print(f"❌ Session creation failed: {session_result.get('error')}")
        
    # Test 3: Create 5-Hour Block
    print("\n🏗️ Test 3: Create 5-Hour Productivity Block")
    block_result = api.create_5_hour_productivity_block(
        start_time=tomorrow_9am,
        session_sequence=['planning', 'coding', 'testing', 'polish']
    )
    
    if block_result['success']:
        print(f"✅ 5-hour block created: {block_result['block']['block_id']}")
        print(f"   Efficiency Score: {block_result['efficiency_score']}")
        print(f"   Total Estimated Tokens: {block_result['total_estimated_tokens']:,}")
        print(f"   Sessions: {len(block_result['events'])}")
        
        for i, event in enumerate(block_result['events'], 1):
            print(f"   {i}. {event['title']} ({event['session_template']})")
            
        # Check export
        test_results = block_result['test_results']
        if test_results['test_export']['success']:
            print(f"   📄 Export created: {test_results['test_export']['path']}")
            
    else:
        print(f"❌ 5-hour block creation failed: {block_result.get('error')}")
        
    # Test 4: Session Templates
    print("\n🎯 Test 4: Session Templates")
    templates = api.template_manager.templates
    
    for name, template in templates.items():
        print(f"   📝 {name.upper()}: {template.duration_minutes}min ({template.color})")
        print(f"      {template.description}")
        print(f"      Checklist: {len(template.checklist)} items")
        
    print("\n✅ Calendar Integration Test Complete!")
    print("\nNext Steps:")
    print("1. Install dependencies: pip install --user -r calendar_requirements.txt")
    print("2. Setup Google Calendar API credentials (optional)")
    print("3. Run setup script: python3 setup_calendar_integration.py")
    print("4. Use CLI: python3 calendar_cli.py --help")


def test_database_integration():
    """Test database integration"""
    print("\n🗄️ Testing Database Integration")
    
    database_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
    
    if not Path(database_path).exists():
        print(f"❌ Database not found: {database_path}")
        return False
        
    try:
        conn = sqlite3.connect(database_path)
        cursor = conn.cursor()
        
        # Check existing tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"✅ Database connected: {len(tables)} tables found")
        
        required_tables = ['real_sessions', 'five_hour_blocks']
        for table in required_tables:
            if table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   📊 {table}: {count} records")
            else:
                print(f"   ⚠️ {table}: table missing")
                
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False


def main():
    """Main test function"""
    try:
        # Test database first
        if test_database_integration():
            # Test calendar integration
            test_calendar_integration()
        else:
            print("❌ Database test failed - calendar integration may not work properly")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")


if __name__ == "__main__":
    main()