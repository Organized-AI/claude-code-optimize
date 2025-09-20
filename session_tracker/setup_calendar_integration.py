#!/usr/bin/env python3
"""
Claude Code Optimizer - Calendar Integration Setup
==================================================

Setup script for calendar integration with Google Calendar API and iCal export.
Handles OAuth setup, dependency installation, and system configuration.
"""

import os
import sys
import json
import sqlite3
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

def print_step(step: str, description: str):
    """Print setup step"""
    print(f"\n📋 Step {step}: {description}")
    print("-" * 60)

def print_success(message: str):
    """Print success message"""
    print(f"✅ {message}")

def print_error(message: str):
    """Print error message"""
    print(f"❌ {message}")

def print_warning(message: str):
    """Print warning message"""
    print(f"⚠️ {message}")

def print_info(message: str):
    """Print info message"""
    print(f"ℹ️ {message}")

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print_error(f"Python 3.7+ required. Current version: {version.major}.{version.minor}")
        return False
    print_success(f"Python version OK: {version.major}.{version.minor}.{version.micro}")
    return True

def install_dependencies():
    """Install required dependencies"""
    requirements_file = Path(__file__).parent / "calendar_requirements.txt"
    
    if not requirements_file.exists():
        print_error(f"Requirements file not found: {requirements_file}")
        return False
        
    print_info("Installing calendar integration dependencies...")
    
    try:
        # Install requirements
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print_success("Dependencies installed successfully")
            return True
        else:
            print_error(f"Dependency installation failed: {result.stderr}")
            return False
            
    except Exception as e:
        print_error(f"Error installing dependencies: {e}")
        return False

def setup_directories():
    """Setup required directories"""
    base_dir = Path.home() / ".cache" / "claude_optimizer"
    directories = [
        base_dir,
        base_dir / "calendar",
        base_dir / "logs",
        Path.home() / "Downloads" / "claude_code_calendar"
    ]
    
    for directory in directories:
        try:
            directory.mkdir(parents=True, exist_ok=True)
            print_success(f"Directory created: {directory}")
        except Exception as e:
            print_error(f"Failed to create directory {directory}: {e}")
            return False
            
    return True

def setup_database_tables(database_path: str):
    """Setup additional database tables for calendar integration"""
    try:
        conn = sqlite3.connect(database_path)
        cursor = conn.cursor()
        
        # Check existing tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = [row[0] for row in cursor.fetchall()]
        
        tables_created = 0
        
        # Create scheduling_blocks table if not exists
        if 'scheduling_blocks' not in existing_tables:
            cursor.execute("""
                CREATE TABLE scheduling_blocks (
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
            tables_created += 1
            print_success("Created scheduling_blocks table")
            
        # Create calendar_events table if not exists
        if 'calendar_events' not in existing_tables:
            cursor.execute("""
                CREATE TABLE calendar_events (
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
            tables_created += 1
            print_success("Created calendar_events table")
            
        # Create recurring_templates table if not exists
        if 'recurring_templates' not in existing_tables:
            cursor.execute("""
                CREATE TABLE recurring_templates (
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
            tables_created += 1
            print_success("Created recurring_templates table")
            
        conn.commit()
        conn.close()
        
        if tables_created > 0:
            print_success(f"Database setup complete: {tables_created} tables created")
        else:
            print_info("Database tables already exist")
            
        return True
        
    except Exception as e:
        print_error(f"Database setup failed: {e}")
        return False

def setup_google_calendar_credentials():
    """Setup Google Calendar API credentials"""
    print_info("Setting up Google Calendar integration...")
    
    credentials_dir = Path.home() / ".cache" / "claude_optimizer" / "calendar"
    credentials_file = credentials_dir / "credentials.json"
    
    if credentials_file.exists():
        print_success("Google Calendar credentials already exist")
        return True
        
    print_info("""
To set up Google Calendar integration:

1. Go to the Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Desktop application"
   - Download the JSON file
5. Save the JSON file as: {}
6. Run the setup again to complete authentication

Google Calendar integration is optional. You can skip this step and use iCal export only.
    """.format(credentials_file))
    
    while True:
        choice = input("\nDo you want to setup Google Calendar now? (y/n/skip): ").lower().strip()
        
        if choice in ['y', 'yes']:
            print_info(f"Please save your Google Calendar credentials to: {credentials_file}")
            input("Press Enter when you have saved the credentials file...")
            
            if credentials_file.exists():
                print_success("Google Calendar credentials found")
                return True
            else:
                print_warning("Credentials file not found. You can set this up later.")
                return False
                
        elif choice in ['n', 'no', 'skip']:
            print_info("Skipping Google Calendar setup. You can configure this later.")
            return False
            
        else:
            print_warning("Please enter 'y', 'n', or 'skip'")

def create_configuration_file():
    """Create default configuration file"""
    config_dir = Path.home() / ".cache" / "claude_optimizer" / "calendar"
    config_file = config_dir / "config.json"
    
    if config_file.exists():
        print_info("Configuration file already exists")
        return True
        
    default_config = {
        "database_path": str(Path(__file__).parent.parent / "claude_usage.db"),
        "google_credentials_path": str(config_dir / "credentials.json"),
        "timezone": "UTC",
        "rate_limits": {
            "daily_token_limit": 19146,
            "max_5hour_blocks_per_day": 2
        },
        "default_preferences": {
            "preferred_start_time": "09:00",
            "preferred_end_time": "17:00",
            "break_duration_minutes": 60,
            "session_types": ["planning", "coding", "testing", "polish"]
        },
        "export_settings": {
            "default_format": "ical",
            "auto_export": True,
            "export_directory": str(Path.home() / "Downloads" / "claude_code_calendar")
        }
    }
    
    try:
        with open(config_file, 'w') as f:
            json.dump(default_config, f, indent=2)
            
        print_success(f"Configuration file created: {config_file}")
        return True
        
    except Exception as e:
        print_error(f"Failed to create configuration file: {e}")
        return False

def test_calendar_integration(database_path: str):
    """Test calendar integration functionality"""
    print_info("Testing calendar integration...")
    
    try:
        # Import and test basic functionality
        sys.path.insert(0, str(Path(__file__).parent))
        
        from calendar_api import CalendarAPI
        
        # Initialize API
        api = CalendarAPI(database_path)
        
        # Test API status
        status = api.get_api_status()
        
        if status['status'] == 'operational':
            print_success("Calendar API initialized successfully")
            
            # Test session templates
            templates = api.template_manager.list_templates()
            print_success(f"Session templates loaded: {len(templates)} available")
            
            # Test database connectivity
            db_status = status.get('database', {})
            if db_status.get('connected', False):
                print_success("Database connectivity confirmed")
            else:
                print_warning("Database connectivity issues detected")
                
            # Test Google Calendar (if configured)
            google_status = status.get('google_calendar', {})
            if google_status.get('authenticated', False):
                print_success("Google Calendar authentication successful")
            else:
                print_info("Google Calendar not configured (iCal export available)")
                
            # Test iCal export capability
            ical_status = status.get('ical_export', {})
            if ical_status.get('available', False):
                print_success("iCal export capability confirmed")
            else:
                print_warning("iCal export not available")
                
            return True
            
        else:
            print_error(f"Calendar API initialization failed: {status.get('error', 'Unknown error')}")
            return False
            
    except ImportError as e:
        print_error(f"Import error: {e}")
        print_info("Some dependencies may not be installed correctly")
        return False
    except Exception as e:
        print_error(f"Calendar integration test failed: {e}")
        return False

def create_cli_shortcut():
    """Create command-line shortcut for calendar CLI"""
    try:
        cli_script = Path(__file__).parent / "calendar_cli.py"
        
        # Make CLI script executable
        if cli_script.exists():
            os.chmod(cli_script, 0o755)
            print_success("Calendar CLI script is executable")
            
            print_info(f"""
Calendar CLI is ready! You can use it with:

python3 {cli_script} --help

Common commands:
- python3 {cli_script} status
- python3 {cli_script} create-session coding "2024-08-15 09:00"
- python3 {cli_script} create-5hour "2024-08-15 09:00"
- python3 {cli_script} templates

For convenience, you can create an alias:
alias claude-calendar="python3 {cli_script}"
            """)
            
            return True
        else:
            print_warning("Calendar CLI script not found")
            return False
            
    except Exception as e:
        print_error(f"Failed to setup CLI shortcut: {e}")
        return False

def main():
    """Main setup function"""
    print("""
╔══════════════════════════════════════════════════════════════╗
║           Claude Code Optimizer - Calendar Integration      ║
║                         Setup Script                        ║
╚══════════════════════════════════════════════════════════════╝

This script will set up comprehensive calendar integration for
Claude Code session planning within 5-hour rate limit blocks.

Features:
✅ Google Calendar API integration with OAuth 2.0
✅ iCal export for cross-platform compatibility
✅ Session templates for optimal productivity phases
✅ 5-hour block scheduling within rate limits
✅ Automated calendar event generation
✅ Timezone handling and conflict detection
✅ Recurring session templates
✅ Integration with existing session tracking
    """)
    
    # Detect database path
    possible_db_paths = [
        Path(__file__).parent.parent / "claude_usage.db",
        Path(__file__).parent / "claude_usage.db",
        Path.cwd() / "claude_usage.db"
    ]
    
    database_path = None
    for path in possible_db_paths:
        if path.exists():
            database_path = str(path)
            break
            
    if not database_path:
        print_error("Claude usage database not found. Please ensure the session tracking system is set up.")
        print_info("Expected locations:")
        for path in possible_db_paths:
            print(f"  - {path}")
        return False
        
    print_success(f"Database found: {database_path}")
    
    # Setup steps
    steps = [
        ("1", "Check Python version", check_python_version),
        ("2", "Install dependencies", install_dependencies),
        ("3", "Setup directories", setup_directories),
        ("4", "Setup database tables", lambda: setup_database_tables(database_path)),
        ("5", "Setup Google Calendar credentials", setup_google_calendar_credentials),
        ("6", "Create configuration file", create_configuration_file),
        ("7", "Test calendar integration", lambda: test_calendar_integration(database_path)),
        ("8", "Setup CLI shortcut", create_cli_shortcut)
    ]
    
    success_count = 0
    total_steps = len(steps)
    
    for step_num, description, func in steps:
        print_step(step_num, description)
        
        try:
            if func():
                success_count += 1
            else:
                print_warning(f"Step {step_num} completed with warnings")
        except Exception as e:
            print_error(f"Step {step_num} failed: {e}")
            
    # Summary
    print("\n" + "="*60)
    print("📊 SETUP SUMMARY")
    print("="*60)
    
    if success_count == total_steps:
        print_success(f"🎉 All {total_steps} setup steps completed successfully!")
        print_info("""
Calendar integration is ready! You can now:

1. Create session events:
   python3 calendar_cli.py create-session coding "2024-08-15 09:00"

2. Create 5-hour productivity blocks:
   python3 calendar_cli.py create-5hour "2024-08-15 09:00"

3. Schedule recurring sessions:
   python3 calendar_cli.py schedule-recurring coding --days "mon,wed,fri" --time "09:00"

4. Get schedule suggestions:
   python3 calendar_cli.py suggest tomorrow

5. Export to iCal:
   python3 calendar_cli.py export --format ical

Run 'python3 calendar_cli.py --help' for complete usage information.
        """)
        
    elif success_count >= total_steps - 2:
        print_success(f"✅ Setup mostly complete: {success_count}/{total_steps} steps successful")
        print_info("Calendar integration should work with some limitations.")
        
    else:
        print_warning(f"⚠️ Partial setup: {success_count}/{total_steps} steps successful")
        print_info("Some features may not work correctly. Check the errors above.")
        
    print("\nFor support or issues, check the documentation or logs in:")
    print(f"  {Path.home() / '.cache' / 'claude_optimizer' / 'logs'}")
    
    return success_count >= total_steps - 1


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Setup failed with unexpected error: {e}")
        sys.exit(1)