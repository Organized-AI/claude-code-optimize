# Claude Code Optimizer - Calendar Integration

## 🎯 Overview

Comprehensive calendar integration system for Claude Code session planning within 5-hour rate limit blocks. This system automatically generates calendar events, optimizes session scheduling, and ensures rate limit compliance.

## ✨ Features

### ✅ Core Functionality
- **Google Calendar API Integration** - OAuth 2.0 authentication with secure token management
- **iCal Export** - RFC 5545-compliant .ics files for cross-platform compatibility
- **Session Templates** - Pre-configured templates for optimal productivity phases
- **5-Hour Block Optimization** - Automatic scheduling within rate limit boundaries
- **One-Click Event Generation** - Single command to create fully configured calendar events
- **Conflict Detection** - Automatic detection and resolution of scheduling conflicts
- **Timezone Handling** - Robust timezone conversion and DST support
- **Recurring Sessions** - Weekly/monthly session templates
- **Real-Time Integration** - Live session tracking with calendar updates

### 📋 Session Templates

1. **Planning Session** (60 minutes, Blue)
   - Requirements analysis and architecture design
   - Task breakdown and sprint planning
   - Environment setup and preparation

2. **Coding Session** (180 minutes, Green)
   - Active development and implementation
   - Highest token usage phase
   - Real-time progress tracking

3. **Testing Session** (60 minutes, Yellow)
   - Quality assurance and validation
   - Bug fixing and performance testing
   - Medium token usage

4. **Polish Session** (45 minutes, Purple)
   - Code cleanup and optimization
   - Documentation and deployment preparation
   - Lowest token usage phase

5. **Deep Work Block** (120 minutes, Bold Blue)
   - Focused problem-solving sessions
   - Complex feature development
   - Minimal context switching

## 🚀 Quick Start

### 1. Installation

```bash
# Clone or navigate to the project directory
cd /path/to/Claude\ Code\ Optimizer/session_tracker

# Install dependencies (choose one method)
# Option A: With virtual environment (recommended)
python3 -m venv calendar_env
source calendar_env/bin/activate
pip install -r calendar_requirements.txt

# Option B: User installation
pip install --user -r calendar_requirements.txt

# Option C: System-wide (with override)
pip install --break-system-packages -r calendar_requirements.txt
```

### 2. Setup

```bash
# Run the setup script
python3 setup_calendar_integration.py

# Test the integration
python3 test_calendar_integration.py
```

### 3. Google Calendar Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Desktop application)
5. Download credentials as `~/.cache/claude_optimizer/calendar/credentials.json`

### 4. Basic Usage

```bash
# Check status
python3 calendar_cli.py status

# Create a single coding session
python3 calendar_cli.py create-session coding "2024-08-15 09:00"

# Create a complete 5-hour productivity block
python3 calendar_cli.py create-5hour "2024-08-15 09:00"

# Schedule weekly recurring sessions
python3 calendar_cli.py schedule-recurring coding --days "mon,wed,fri" --time "09:00" --weeks 4

# Get schedule suggestions
python3 calendar_cli.py suggest "2024-08-15"

# Export schedule to iCal
python3 calendar_cli.py export --format ical
```

## 📁 File Structure

```
session_tracker/
├── calendar_integration.py      # Core calendar integration classes
├── calendar_scheduler.py        # 5-hour block scheduling system
├── calendar_api.py             # Main API interface
├── calendar_cli.py             # Command-line interface
├── session_calendar_bridge.py  # Integration with session tracking
├── setup_calendar_integration.py # Setup and configuration script
├── test_calendar_integration.py # Test suite (no dependencies)
├── calendar_requirements.txt    # Python dependencies
└── CALENDAR_INTEGRATION_README.md # This file
```

## 🎯 API Reference

### CalendarAPI Class

#### Main Methods

```python
from calendar_api import CalendarAPI

# Initialize
api = CalendarAPI(database_path, config)

# Create single session
result = api.create_session_event(
    template_name='coding',
    start_time=datetime.now(),
    custom_title='My Coding Session'
)

# Create 5-hour block
result = api.create_5_hour_productivity_block(
    start_time=datetime.now(),
    session_sequence=['planning', 'coding', 'testing', 'polish']
)

# Schedule recurring sessions
result = api.schedule_recurring_sessions(
    template_name='coding',
    schedule_config={
        'days': [0, 2, 4],  # Mon, Wed, Fri
        'time': '09:00',
        'start_date': datetime.now()
    },
    duration_weeks=4
)

# Get schedule suggestions
suggestions = api.suggest_optimal_day_schedule(
    target_date=datetime.now(),
    preferences={
        'preferred_start_time': '09:00',
        'preferred_end_time': '17:00'
    }
)
```

### CLI Commands

#### Status and Information
```bash
python3 calendar_cli.py status                    # Show system status
python3 calendar_cli.py templates                 # List session templates
```

#### Session Creation
```bash
python3 calendar_cli.py create-session <template> <start_time> [options]
python3 calendar_cli.py create-5hour <start_time> [options]
python3 calendar_cli.py schedule-recurring <template> --days <days> [options]
```

#### Planning and Analysis
```bash
python3 calendar_cli.py suggest [date] [options]  # Get schedule suggestions
python3 calendar_cli.py export [options]          # Export schedule
```

## 🔧 Configuration

### Configuration File
Location: `~/.cache/claude_optimizer/calendar/config.json`

```json
{
  "database_path": "/path/to/claude_usage.db",
  "google_credentials_path": "/path/to/credentials.json",
  "timezone": "America/New_York",
  "rate_limits": {
    "daily_token_limit": 19146,
    "max_5hour_blocks_per_day": 2
  },
  "default_preferences": {
    "preferred_start_time": "09:00",
    "preferred_end_time": "17:00",
    "break_duration_minutes": 60,
    "session_types": ["planning", "coding", "testing", "polish"]
  }
}
```

### Environment Variables
```bash
export CLAUDE_CALENDAR_DB="/path/to/database.db"
export CLAUDE_CALENDAR_CONFIG="/path/to/config.json"
export CLAUDE_CALENDAR_TIMEZONE="America/New_York"
```

## 📊 Rate Limit Management

### 5-Hour Block System
- **Daily Limit**: 19,146 tokens (current sustainable rate)
- **Block Duration**: Exactly 5 hours
- **Max Blocks**: 2 per day (conservative approach)
- **Token Distribution**: Optimal allocation across session types

### Session Token Estimates
- **Planning**: 10 tokens/minute (600 tokens/hour)
- **Coding**: 25 tokens/minute (1,500 tokens/hour)  
- **Testing**: 15 tokens/minute (900 tokens/hour)
- **Polish**: 8 tokens/minute (480 tokens/hour)

### Compliance Features
- **Real-time Monitoring** - Continuous token usage tracking
- **Automatic Warnings** - Alerts at 80% and 90% thresholds
- **Schedule Adjustment** - Dynamic session length optimization
- **Block Enforcement** - Prevents sessions outside 5-hour boundaries

## 🔄 Integration with Session Tracking

### Automatic Features
- **Live Session Detection** - Automatically creates calendar events for active sessions
- **Progress Updates** - Real-time session duration and token usage
- **Session Completion** - Final metrics and calendar event updates
- **Historical Tracking** - Integration with existing session database

### Bridge Service
```python
from session_calendar_bridge import SessionCalendarBridge

# Start bridge monitoring
bridge = SessionCalendarBridge(database_path)
bridge.start_monitoring()
```

## 📱 Platform Support

### Google Calendar
- **Full Integration** - Events, reminders, colors, descriptions
- **OAuth 2.0** - Secure authentication with token refresh
- **Conflict Detection** - Automatic scheduling conflict resolution
- **Batch Operations** - Efficient multiple event creation

### iCal Export (.ics files)
- **Universal Compatibility** - Apple Calendar, Outlook, Google Calendar
- **RFC 5545 Compliant** - Standard format with proper timezone handling
- **Rich Metadata** - Session templates, token estimates, custom properties
- **Recurring Events** - RRULE support for weekly/monthly sessions

### Supported Calendars
- ✅ Google Calendar (full API integration)
- ✅ Apple Calendar (iCal import)
- ✅ Microsoft Outlook (iCal import)
- ✅ Mozilla Thunderbird (iCal import)
- ✅ Any CalDAV-compatible calendar

## 🛠️ Troubleshooting

### Common Issues

#### 1. Dependencies Not Installed
```bash
# Error: ModuleNotFoundError: No module named 'google'
pip install --user -r calendar_requirements.txt
```

#### 2. Google Calendar Authentication Failed
```bash
# Check credentials file exists
ls ~/.cache/claude_optimizer/calendar/credentials.json

# Re-run setup if missing
python3 setup_calendar_integration.py
```

#### 3. Database Connection Issues
```bash
# Check database path
python3 test_calendar_integration.py

# Verify database exists and has required tables
sqlite3 /path/to/claude_usage.db ".tables"
```

#### 4. iCal Export Not Working
```bash
# Check export directory permissions
mkdir -p ~/Downloads/claude_code_calendar
chmod 755 ~/Downloads/claude_code_calendar
```

### Debug Mode
```bash
# Enable verbose logging
export CLAUDE_CALENDAR_DEBUG=1
python3 calendar_cli.py status
```

### Log Files
- Main logs: `~/.cache/claude_optimizer/logs/calendar_api.log`
- Bridge logs: `~/.cache/claude_optimizer/logs/session_calendar_bridge.log`
- Setup logs: Console output during setup

## 🎨 Customization

### Custom Session Templates
```python
from calendar_integration import SessionTemplate

# Create custom template
custom_template = SessionTemplate(
    name='Research Session',
    duration_minutes=90,
    description='Deep research and analysis',
    color='turquoise',
    checklist=[
        'Define research questions',
        'Gather relevant sources',
        'Analyze findings'
    ]
)

# Add to template manager
api.template_manager.add_custom_template('research', custom_template)
```

### Custom Time Allocation
```python
# Override default session allocation
optimization_goals = {
    'efficiency': 0.9,      # 90% efficiency target
    'token_usage': 0.85     # 85% token utilization
}

result = api.create_5_hour_productivity_block(
    start_time=start_time,
    optimization_goals=optimization_goals
)
```

## 📈 Advanced Features

### 1. Intelligent Scheduling
- **Machine Learning** - Learns from your session patterns
- **Optimal Timing** - Suggests best times based on productivity data
- **Conflict Avoidance** - Automatic rescheduling when conflicts arise

### 2. Team Coordination
- **Shared Calendars** - Coordinate with team members
- **Meeting Integration** - Avoid scheduling during meetings
- **Collaboration Sessions** - Multi-attendee coding sessions

### 3. Analytics Integration
- **Session Metrics** - Detailed productivity analytics
- **Token Efficiency** - Usage patterns and optimization
- **Time Tracking** - Accurate session duration monitoring

## 🤝 Contributing

### Development Setup
```bash
git clone <repository>
cd session_tracker
python3 -m venv dev_env
source dev_env/bin/activate
pip install -r calendar_requirements.txt
pip install -r dev_requirements.txt  # If exists
```

### Running Tests
```bash
python3 test_calendar_integration.py           # Basic functionality test
python3 -m pytest tests/ -v                    # Full test suite (if exists)
```

### Code Style
- Follow PEP 8 guidelines
- Use type hints for all functions
- Comprehensive docstrings
- Error handling with logging

## 📄 License

This project is part of the Claude Code Optimizer suite. See main project license for details.

## 🆘 Support

### Getting Help
1. **Check Logs** - Review log files for error details
2. **Run Tests** - Use test suite to identify issues
3. **Setup Script** - Re-run setup for configuration problems
4. **Documentation** - Review this README and inline comments

### Reporting Issues
Include the following information:
- Operating system and Python version
- Error messages and log output
- Steps to reproduce the issue
- Calendar integration configuration

---

🤖 **Generated with Claude Code** - https://claude.ai/code

*This calendar integration system transforms Claude Code session planning into an automated, optimized workflow that respects rate limits while maximizing productivity.*