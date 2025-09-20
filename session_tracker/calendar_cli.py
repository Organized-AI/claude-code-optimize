#!/usr/bin/env python3
"""
Claude Code Optimizer - Calendar CLI
====================================

Command-line interface for calendar integration and session planning.
Provides easy access to all calendar features with simple commands.
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any

try:
    from calendar_api import CalendarAPI
except ImportError:
    print("❌ Calendar API not available. Please install requirements:")
    print("pip install -r calendar_requirements.txt")
    sys.exit(1)


class CalendarCLI:
    """Command-line interface for calendar integration"""
    
    def __init__(self, database_path: str = None, config_file: str = None):
        """Initialize CLI"""
        # Default database path
        if database_path is None:
            default_db = Path(__file__).parent.parent / "claude_usage.db"
            database_path = str(default_db)
            
        # Load configuration
        config = self._load_config(config_file) if config_file else {}
        
        # Initialize API
        try:
            self.api = CalendarAPI(database_path, config)
            print(f"✅ Calendar API initialized (Database: {database_path})")
        except Exception as e:
            print(f"❌ Failed to initialize Calendar API: {e}")
            sys.exit(1)
            
    def _load_config(self, config_file: str) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Warning: Could not load config file {config_file}: {e}")
            return {}
            
    def _parse_datetime(self, date_str: str) -> datetime:
        """Parse datetime string in various formats"""
        formats = [
            '%Y-%m-%d %H:%M',
            '%Y-%m-%d %H:%M:%S', 
            '%m/%d/%Y %H:%M',
            '%m/%d/%Y %I:%M %p',
            '%Y-%m-%d',
            '%m/%d/%Y'
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                # If no time specified, default to 9 AM
                if dt.hour == 0 and dt.minute == 0 and '%H' not in fmt:
                    dt = dt.replace(hour=9)
                return dt
            except ValueError:
                continue
                
        raise ValueError(f"Could not parse datetime: {date_str}")
        
    def _print_json(self, data: Any, indent: int = 2):
        """Pretty print JSON data"""
        print(json.dumps(data, indent=indent, default=str))
        
    def _print_success(self, message: str):
        """Print success message"""
        print(f"✅ {message}")
        
    def _print_error(self, message: str):
        """Print error message"""
        print(f"❌ {message}")
        
    def _print_warning(self, message: str):
        """Print warning message"""
        print(f"⚠️ {message}")
        
    # ================== COMMAND HANDLERS ==================
    
    def status(self, args):
        """Show API status and capabilities"""
        print("📊 Calendar Integration Status")
        print("=" * 50)
        
        status = self.api.get_api_status()
        
        if status['status'] == 'operational':
            self._print_success("API is operational")
        else:
            self._print_error(f"API status: {status['status']}")
            
        # Google Calendar status
        google = status.get('google_calendar', {})
        print(f"\n📅 Google Calendar:")
        print(f"   Available: {google.get('available', False)}")
        print(f"   Authenticated: {google.get('authenticated', False)}")
        if google.get('calendar_id'):
            print(f"   Calendar ID: {google['calendar_id']}")
            
        # iCal export status
        ical = status.get('ical_export', {})
        print(f"\n📄 iCal Export:")
        print(f"   Available: {ical.get('available', False)}")
        
        # Session templates
        templates = status.get('session_templates', {})
        print(f"\n🎯 Session Templates ({templates.get('template_count', 0)} available):")
        for template in templates.get('available_templates', []):
            print(f"   • {template}")
            
        # Rate limits
        rate_limits = status.get('rate_limits', {})
        print(f"\n⚡ Rate Limits:")
        print(f"   Daily Token Limit: {rate_limits.get('daily_token_limit', 0):,}")
        print(f"   Max 5-Hour Blocks/Day: {rate_limits.get('max_5hour_blocks_per_day', 0)}")
        
        current_usage = rate_limits.get('current_usage', {})
        if current_usage:
            print(f"   Current Usage: {current_usage.get('current_tokens', 0):,} tokens")
            print(f"   Remaining: {current_usage.get('remaining_tokens', 0):,} tokens")
            print(f"   Utilization: {current_usage.get('utilization_percentage', 0):.1f}%")
            
    def create_session(self, args):
        """Create a single session event"""
        try:
            start_time = self._parse_datetime(args.start_time)
            
            result = self.api.create_session_event(
                template_name=args.template,
                start_time=start_time,
                custom_title=args.title,
                duration_override=args.duration,
                export_options={'google': not args.no_google, 'ical': not args.no_ical}
            )
            
            if result['success']:
                event = result['event']
                self._print_success(f"Session created: {event['title']}")
                print(f"   Template: {event['session_template']}")
                print(f"   Time: {event['start_time']} - {event['end_time']}")
                
                # Calendar results
                cal_results = result['calendar_results']
                google_success = cal_results['google_calendar']['success']
                ical_success = cal_results['ical_export']['success']
                
                print(f"   Google Calendar: {google_success} events created")
                print(f"   iCal Export: {'Yes' if ical_success else 'No'}")
                
                if ical_success and cal_results['ical_export']['path']:
                    print(f"   iCal File: {cal_results['ical_export']['path']}")
                    
            else:
                self._print_error(f"Failed to create session: {result.get('error')}")
                
                # Show conflicts if any
                if 'conflicts' in result:
                    conflicts = result['conflicts']
                    if conflicts['has_conflicts']:
                        print("\n📅 Scheduling Conflicts:")
                        for conflict in conflicts['all_conflicts']:
                            print(f"   • {conflict.get('title', 'Unknown')} ({conflict.get('start')} - {conflict.get('end')})")
                            
                # Show suggestions if any
                if 'suggested_times' in result:
                    print("\n💡 Suggested Alternative Times:")
                    for i, suggestion in enumerate(result['suggested_times'][:3]):
                        print(f"   {i+1}. {suggestion['start_time']} (Efficiency: {suggestion['efficiency_score']:.2f})")
                        
        except ValueError as e:
            self._print_error(f"Invalid date/time format: {e}")
        except Exception as e:
            self._print_error(f"Error creating session: {e}")
            
    def create_5hour_block(self, args):
        """Create a 5-hour productivity block"""
        try:
            start_time = self._parse_datetime(args.start_time)
            
            # Parse session sequence
            session_sequence = None
            if args.sessions:
                session_sequence = [s.strip() for s in args.sessions.split(',')]
                
            result = self.api.create_5_hour_productivity_block(
                start_time=start_time,
                session_sequence=session_sequence,
                export_options={'google': not args.no_google, 'ical': not args.no_ical}
            )
            
            if result['success']:
                block = result['block']
                events = result['events']
                
                self._print_success(f"5-hour productivity block created: {block['block_id']}")
                print(f"   Time: {block['start_time']} - {block['end_time']}")
                print(f"   Sessions: {len(events)}")
                print(f"   Efficiency Score: {result['efficiency_score']:.2f}")
                print(f"   Estimated Tokens: {result['total_estimated_tokens']:,}")
                
                # Show session breakdown
                print(f"\n📋 Session Schedule:")
                for i, event in enumerate(events, 1):
                    print(f"   {i}. {event['title']}")
                    print(f"      {event['start_time']} - {event['end_time']}")
                    print(f"      Template: {event['session_template']}")
                    
                # Calendar results
                cal_results = result['calendar_results']
                google_success = cal_results['google_calendar']['success']
                ical_success = cal_results['ical_export']['success']
                
                print(f"\n📅 Calendar Integration:")
                print(f"   Google Calendar: {google_success} events created")
                print(f"   iCal Export: {'Yes' if ical_success else 'No'}")
                
                if ical_success and cal_results['ical_export']['path']:
                    print(f"   iCal File: {cal_results['ical_export']['path']}")
                    
            else:
                self._print_error(f"Failed to create 5-hour block: {result.get('error')}")
                
                # Show suggested blocks if available
                if 'suggested_blocks' in result:
                    print("\n💡 Suggested Alternative 5-Hour Blocks:")
                    for i, suggestion in enumerate(result['suggested_blocks'][:3]):
                        print(f"   {i+1}. {suggestion['start_time']} - {suggestion['end_time']}")
                        print(f"      Efficiency: {suggestion['efficiency_score']:.2f}")
                        
        except ValueError as e:
            self._print_error(f"Invalid date/time format: {e}")
        except Exception as e:
            self._print_error(f"Error creating 5-hour block: {e}")
            
    def schedule_recurring(self, args):
        """Schedule recurring sessions"""
        try:
            # Parse days of week
            day_names = {
                'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                'friday': 4, 'saturday': 5, 'sunday': 6,
                'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6
            }
            
            days_of_week = []
            for day_str in args.days.split(','):
                day_str = day_str.strip().lower()
                if day_str.isdigit():
                    days_of_week.append(int(day_str))
                elif day_str in day_names:
                    days_of_week.append(day_names[day_str])
                else:
                    raise ValueError(f"Invalid day: {day_str}")
                    
            # Parse start date
            start_date = datetime.now()
            if args.start_date:
                start_date = self._parse_datetime(args.start_date)
                
            schedule_config = {
                'days': days_of_week,
                'time': args.time,
                'start_date': start_date
            }
            
            result = self.api.schedule_recurring_sessions(
                template_name=args.template,
                schedule_config=schedule_config,
                duration_weeks=args.weeks
            )
            
            if result['success']:
                self._print_success(f"Recurring sessions scheduled: {result['total_events_created']} events")
                print(f"   Template: {result['template_name']}")
                print(f"   Duration: {result['duration_weeks']} weeks")
                
                # Show weekly breakdown
                events_by_week = result['events_by_week']
                print(f"\n📅 Weekly Schedule:")
                for week_start, week_events in events_by_week.items():
                    print(f"   Week of {week_start}: {len(week_events)} sessions")
                    
                # Calendar results
                cal_results = result['calendar_results']
                google_success = cal_results['google_calendar']['success']
                ical_success = cal_results['ical_export']['success']
                
                print(f"\n📊 Calendar Integration:")
                print(f"   Google Calendar: {google_success} events created")
                print(f"   iCal Export: {'Yes' if ical_success else 'No'}")
                
                if ical_success and cal_results['ical_export']['path']:
                    print(f"   iCal File: {cal_results['ical_export']['path']}")
                    
            else:
                self._print_error(f"Failed to schedule recurring sessions: {result.get('error')}")
                
        except ValueError as e:
            self._print_error(f"Invalid input: {e}")
        except Exception as e:
            self._print_error(f"Error scheduling recurring sessions: {e}")
            
    def suggest_schedule(self, args):
        """Suggest optimal schedule for a day"""
        try:
            target_date = datetime.now()
            if args.date:
                target_date = self._parse_datetime(args.date)
                
            preferences = {}
            if args.start_time:
                preferences['preferred_start_time'] = args.start_time
            if args.end_time:
                preferences['preferred_end_time'] = args.end_time
            if args.break_duration:
                preferences['break_duration_minutes'] = args.break_duration
                
            result = self.api.suggest_optimal_day_schedule(target_date, preferences)
            
            if result['success']:
                best = result.get('best_suggestion')
                all_suggestions = result.get('all_suggestions', [])
                
                print(f"📋 Schedule Suggestions for {target_date.date()}")
                print("=" * 50)
                
                if best:
                    block = best['block']
                    events = best['events']
                    
                    print(f"🏆 Best Suggestion (Efficiency: {best['efficiency_score']:.2f}):")
                    print(f"   Time Block: {block.start_time} - {block.end_time}")
                    print(f"   Sessions: {len(events)}")
                    
                    for i, event in enumerate(events, 1):
                        print(f"   {i}. {event.session_template}: {event.start_time} - {event.end_time}")
                        
                    # Rate limit info
                    rate_info = best.get('rate_limit_analysis', {})
                    if rate_info:
                        print(f"\n⚡ Rate Limit Analysis:")
                        print(f"   Estimated Tokens: {rate_info.get('estimated_tokens', 0):,}")
                        print(f"   Utilization: {rate_info.get('utilization_percentage', 0):.1f}%")
                        print(f"   Compliant: {'Yes' if rate_info.get('compliant', False) else 'No'}")
                        
                print(f"\n📊 Total Suggestions: {len(all_suggestions)}")
                
                if args.show_all and len(all_suggestions) > 1:
                    print(f"\n📋 All Suggestions:")
                    for i, suggestion in enumerate(all_suggestions, 1):
                        print(f"   {i}. Efficiency: {suggestion['efficiency_score']:.2f}")
                        print(f"      Time: {suggestion['block'].start_time} - {suggestion['block'].end_time}")
                        
            else:
                self._print_error(f"Failed to generate suggestions: {result.get('error')}")
                
        except ValueError as e:
            self._print_error(f"Invalid date format: {e}")
        except Exception as e:
            self._print_error(f"Error generating suggestions: {e}")
            
    def export_schedule(self, args):
        """Export schedule to file"""
        try:
            # Parse date range
            start_date = datetime.now()
            end_date = start_date + timedelta(days=30)
            
            if args.start_date:
                start_date = self._parse_datetime(args.start_date)
            if args.end_date:
                end_date = self._parse_datetime(args.end_date)
                
            result = self.api.export_schedule(
                export_format=args.format,
                date_range=(start_date, end_date),
                filename=args.filename
            )
            
            if result['success']:
                self._print_success(f"Schedule exported to {args.format.upper()}")
                print(f"   File: {result['export_path']}")
                print(f"   Date Range: {result['date_range'][0]} to {result['date_range'][1]}")
                
            else:
                self._print_error(f"Export failed: {result.get('error')}")
                
        except ValueError as e:
            self._print_error(f"Invalid date format: {e}")
        except Exception as e:
            self._print_error(f"Error exporting schedule: {e}")
            
    def list_templates(self, args):
        """List available session templates"""
        templates = self.api.template_manager.get_all_templates()
        
        print("🎯 Available Session Templates")
        print("=" * 50)
        
        for name, template in templates.items():
            print(f"\n📝 {name.upper()}")
            print(f"   Name: {template.name}")
            print(f"   Duration: {template.duration_minutes} minutes")
            print(f"   Color: {template.color}")
            print(f"   Description: {template.description}")
            
            if template.checklist:
                print(f"   Checklist ({len(template.checklist)} items):")
                for item in template.checklist[:3]:  # Show first 3 items
                    print(f"     • {item}")
                if len(template.checklist) > 3:
                    print(f"     ... and {len(template.checklist) - 3} more")


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Claude Code Optimizer - Calendar Integration CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Show status
  %(prog)s status
  
  # Create a coding session tomorrow at 9 AM
  %(prog)s create-session coding "2024-08-15 09:00"
  
  # Create a 5-hour productivity block
  %(prog)s create-5hour "2024-08-15 09:00" --sessions "planning,coding,testing,polish"
  
  # Schedule weekly coding sessions
  %(prog)s schedule-recurring coding --days "mon,wed,fri" --time "09:00" --weeks 4
  
  # Get schedule suggestions for tomorrow
  %(prog)s suggest "2024-08-15"
  
  # Export schedule to iCal
  %(prog)s export --format ical --filename "my_schedule.ics"
        """
    )
    
    parser.add_argument('--database', help='Database path')
    parser.add_argument('--config', help='Configuration file path')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show API status')
    
    # Create session command
    session_parser = subparsers.add_parser('create-session', help='Create a session event')
    session_parser.add_argument('template', choices=['planning', 'coding', 'testing', 'polish', 'deep_work'],
                               help='Session template')
    session_parser.add_argument('start_time', help='Start time (YYYY-MM-DD HH:MM)')
    session_parser.add_argument('--title', help='Custom title')
    session_parser.add_argument('--duration', type=int, help='Duration override (minutes)')
    session_parser.add_argument('--no-google', action='store_true', help='Skip Google Calendar')
    session_parser.add_argument('--no-ical', action='store_true', help='Skip iCal export')
    
    # Create 5-hour block command
    block_parser = subparsers.add_parser('create-5hour', help='Create 5-hour productivity block')
    block_parser.add_argument('start_time', help='Start time (YYYY-MM-DD HH:MM)')
    block_parser.add_argument('--sessions', help='Session sequence (comma-separated)')
    block_parser.add_argument('--no-google', action='store_true', help='Skip Google Calendar')
    block_parser.add_argument('--no-ical', action='store_true', help='Skip iCal export')
    
    # Schedule recurring command
    recurring_parser = subparsers.add_parser('schedule-recurring', help='Schedule recurring sessions')
    recurring_parser.add_argument('template', choices=['planning', 'coding', 'testing', 'polish', 'deep_work'],
                                 help='Session template')
    recurring_parser.add_argument('--days', required=True, help='Days of week (0=Mon, 6=Sun or names)')
    recurring_parser.add_argument('--time', default='09:00', help='Time (HH:MM)')
    recurring_parser.add_argument('--weeks', type=int, default=4, help='Number of weeks')
    recurring_parser.add_argument('--start-date', help='Start date (YYYY-MM-DD)')
    
    # Suggest schedule command
    suggest_parser = subparsers.add_parser('suggest', help='Suggest optimal schedule')
    suggest_parser.add_argument('date', nargs='?', help='Target date (YYYY-MM-DD)')
    suggest_parser.add_argument('--start-time', help='Preferred start time (HH:MM)')
    suggest_parser.add_argument('--end-time', help='Preferred end time (HH:MM)')
    suggest_parser.add_argument('--break-duration', type=int, help='Break duration (minutes)')
    suggest_parser.add_argument('--show-all', action='store_true', help='Show all suggestions')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export schedule')
    export_parser.add_argument('--format', choices=['ical', 'json'], default='ical', help='Export format')
    export_parser.add_argument('--filename', help='Output filename')
    export_parser.add_argument('--start-date', help='Start date (YYYY-MM-DD)')
    export_parser.add_argument('--end-date', help='End date (YYYY-MM-DD)')
    
    # List templates command
    templates_parser = subparsers.add_parser('templates', help='List session templates')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
        
    # Initialize CLI
    try:
        cli = CalendarCLI(args.database, args.config)
    except Exception as e:
        print(f"❌ Failed to initialize CLI: {e}")
        return
        
    # Execute command
    command_handlers = {
        'status': cli.status,
        'create-session': cli.create_session,
        'create-5hour': cli.create_5hour_block,
        'schedule-recurring': cli.schedule_recurring,
        'suggest': cli.suggest_schedule,
        'export': cli.export_schedule,
        'templates': cli.list_templates
    }
    
    handler = command_handlers.get(args.command)
    if handler:
        handler(args)
    else:
        print(f"❌ Unknown command: {args.command}")


if __name__ == "__main__":
    main()