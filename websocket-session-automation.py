#!/usr/bin/env python3
"""
WebSocket & Session Automation System
Complete implementation for Claude Code session monitoring with calendar integration
"""

import asyncio
import websockets
import json
import subprocess
import threading
import time
import os
import signal
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, List, Any
import aiohttp
import psutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('websocket-automation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WebSocketConnectionManager:
    """Manages stable WebSocket connections with automatic reconnection"""
    
    def __init__(self, dashboard_url: str = "wss://claude-code-optimizer-dashboard.vercel.app/ws"):
        self.dashboard_url = dashboard_url
        self.connection = None
        self.connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.reconnect_delay = 1  # Start with 1 second
        self.heartbeat_interval = 30
        self.message_queue = []
        self.running = True
        
    async def connect(self):
        """Establish WebSocket connection with retry logic"""
        import ssl
        
        # Create SSL context that accepts self-signed certificates for Vercel
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        while self.running and self.reconnect_attempts < self.max_reconnect_attempts:
            try:
                logger.info(f"Attempting WebSocket connection to {self.dashboard_url}")
                
                # Try with standard SSL first, fallback to unverified if needed
                try:
                    self.connection = await websockets.connect(
                        self.dashboard_url,
                        ping_interval=20,
                        ping_timeout=10,
                        close_timeout=10
                    )
                except ssl.SSLError:
                    logger.warning("SSL verification failed, attempting with relaxed SSL")
                    self.connection = await websockets.connect(
                        self.dashboard_url,
                        ping_interval=20,
                        ping_timeout=10,
                        close_timeout=10,
                        ssl=ssl_context
                    )
                self.connected = True
                self.reconnect_attempts = 0
                self.reconnect_delay = 1
                logger.info("WebSocket connection established successfully")
                
                # Send queued messages
                await self.flush_message_queue()
                
                # Start heartbeat
                asyncio.create_task(self.heartbeat())
                
                return True
                
            except Exception as e:
                self.connected = False
                self.reconnect_attempts += 1
                logger.error(f"WebSocket connection failed: {e}")
                
                if self.reconnect_attempts < self.max_reconnect_attempts:
                    await asyncio.sleep(self.reconnect_delay)
                    self.reconnect_delay = min(self.reconnect_delay * 2, 60)  # Exponential backoff
                else:
                    logger.error("Max reconnection attempts reached")
                    return False
    
    async def heartbeat(self):
        """Send periodic heartbeat to keep connection alive"""
        while self.connected and self.connection:
            try:
                await self.connection.ping()
                await asyncio.sleep(self.heartbeat_interval)
            except Exception as e:
                logger.warning(f"Heartbeat failed: {e}")
                self.connected = False
                await self.reconnect()
                break
    
    async def reconnect(self):
        """Handle reconnection logic"""
        if self.connection:
            try:
                await self.connection.close()
            except:
                pass
        self.connection = None
        self.connected = False
        await self.connect()
    
    async def send_message(self, message: Dict):
        """Send message with queueing and retry"""
        if not self.connected or not self.connection:
            logger.warning("WebSocket not connected, queueing message")
            self.message_queue.append(message)
            await self.reconnect()
            return
        
        try:
            await self.connection.send(json.dumps(message))
            logger.debug(f"Sent message: {message.get('type', 'unknown')}")
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            self.message_queue.append(message)
            await self.reconnect()
    
    async def flush_message_queue(self):
        """Send all queued messages"""
        if self.connected and self.connection and self.message_queue:
            logger.info(f"Flushing {len(self.message_queue)} queued messages")
            while self.message_queue:
                message = self.message_queue.pop(0)
                try:
                    await self.connection.send(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send queued message: {e}")
                    self.message_queue.insert(0, message)
                    break
    
    async def close(self):
        """Clean shutdown"""
        self.running = False
        if self.connection:
            await self.connection.close()


class ClaudeCodeSessionDetector:
    """Detects and monitors Claude Code sessions in real-time"""
    
    def __init__(self, ws_manager: WebSocketConnectionManager):
        self.ws_manager = ws_manager
        self.active_session = None
        self.session_start_time = None
        self.monitoring = False
        self.claude_code_path = Path.home() / ".claude"
        self.projects_path = self.claude_code_path / "projects"
        
    def detect_claude_code_process(self) -> bool:
        """Check if Claude Code is running"""
        for proc in psutil.process_iter(['name', 'cmdline']):
            try:
                name = proc.info['name']
                cmdline = proc.info.get('cmdline', [])
                
                # Check for Claude Code process patterns
                if 'claude' in name.lower() or 'claude-code' in name.lower():
                    return True
                    
                # Check command line arguments
                if cmdline and any('claude' in str(arg).lower() for arg in cmdline):
                    return True
                    
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return False
    
    def parse_jsonl_files(self) -> Dict:
        """Parse JSONL files for session metrics"""
        metrics = {
            "total_tokens": 0,
            "total_cost": 0.0,
            "session_count": 0,
            "latest_activity": None
        }
        
        if not self.projects_path.exists():
            return metrics
        
        # Find all JSONL files
        jsonl_files = list(self.projects_path.glob("**/*.jsonl"))
        
        for jsonl_file in jsonl_files:
            try:
                # Get file modification time
                mtime = datetime.fromtimestamp(jsonl_file.stat().st_mtime)
                
                # Only process recent files (last 24 hours)
                if datetime.now() - mtime > timedelta(hours=24):
                    continue
                
                with open(jsonl_file, 'r') as f:
                    for line in f:
                        try:
                            data = json.loads(line.strip())
                            
                            # Extract metrics
                            if "usage" in data:
                                usage = data["usage"]
                                metrics["total_tokens"] += usage.get("total_tokens", 0)
                                
                            if "cost" in data:
                                metrics["total_cost"] += data["cost"]
                                
                            if "timestamp" in data:
                                timestamp = datetime.fromisoformat(data["timestamp"])
                                if not metrics["latest_activity"] or timestamp > metrics["latest_activity"]:
                                    metrics["latest_activity"] = timestamp
                                    
                        except json.JSONDecodeError:
                            continue
                            
            except Exception as e:
                logger.warning(f"Error parsing {jsonl_file}: {e}")
        
        return metrics
    
    async def monitor_sessions(self):
        """Main monitoring loop"""
        self.monitoring = True
        last_process_state = False
        session_id = None
        
        while self.monitoring:
            try:
                # Check if Claude Code is running
                is_running = self.detect_claude_code_process()
                
                # Session state changed
                if is_running != last_process_state:
                    if is_running:
                        # Session started
                        session_id = f"session_{int(time.time())}"
                        self.session_start_time = datetime.now()
                        self.active_session = session_id
                        
                        await self.ws_manager.send_message({
                            "type": "session_started",
                            "session_id": session_id,
                            "timestamp": self.session_start_time.isoformat(),
                            "source": "process_detection"
                        })
                        
                        logger.info(f"Claude Code session started: {session_id}")
                        
                    else:
                        # Session ended
                        if self.active_session:
                            duration = (datetime.now() - self.session_start_time).total_seconds()
                            
                            # Parse final metrics
                            metrics = self.parse_jsonl_files()
                            
                            await self.ws_manager.send_message({
                                "type": "session_ended",
                                "session_id": self.active_session,
                                "duration_seconds": duration,
                                "metrics": metrics,
                                "timestamp": datetime.now().isoformat()
                            })
                            
                            logger.info(f"Claude Code session ended: {self.active_session} (duration: {duration}s)")
                            
                            self.active_session = None
                            self.session_start_time = None
                
                last_process_state = is_running
                
                # If session is active, send periodic updates
                if is_running and self.active_session:
                    metrics = self.parse_jsonl_files()
                    
                    await self.ws_manager.send_message({
                        "type": "session_update",
                        "session_id": self.active_session,
                        "metrics": metrics,
                        "duration_seconds": (datetime.now() - self.session_start_time).total_seconds(),
                        "timestamp": datetime.now().isoformat()
                    })
                
                # Check every 5 seconds
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Session monitoring error: {e}")
                await asyncio.sleep(10)
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring = False


class CalendarAutomation:
    """Automates calendar integration for Claude Code sessions"""
    
    def __init__(self):
        self.calendar_events = []
        self.weekly_quota = 1000000  # 1M tokens per week
        self.optimal_session_duration = 3600  # 1 hour
        
    def create_calendar_event(self, session_data: Dict) -> bool:
        """Create calendar event using AppleScript"""
        try:
            # Extract session info
            start_time = datetime.fromisoformat(session_data.get("timestamp", datetime.now().isoformat()))
            duration = session_data.get("duration_seconds", self.optimal_session_duration)
            end_time = start_time + timedelta(seconds=duration)
            
            # Create AppleScript
            applescript = f'''
            tell application "Calendar"
                tell calendar "Claude Code Sessions"
                    set newEvent to make new event with properties {{summary:"Claude Code Session", start date:date "{start_time.strftime('%B %d, %Y %I:%M:%S %p')}", end date:date "{end_time.strftime('%B %d, %Y %I:%M:%S %p')}"}}
                    set description of newEvent to "Automated Claude Code session tracking\\nSession ID: {session_data.get('session_id', 'unknown')}\\nTokens: {session_data.get('metrics', {}).get('total_tokens', 0)}"
                end tell
            end tell
            '''
            
            # Execute AppleScript
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("Calendar event created successfully")
                return True
            else:
                logger.error(f"AppleScript error: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to create calendar event: {e}")
            return False
    
    def generate_ical_file(self, sessions: List[Dict]) -> str:
        """Generate iCal file for session schedule"""
        ical_content = """BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Claude Code Optimizer//Session Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Claude Code Sessions
X-WR-TIMEZONE:America/Los_Angeles
"""
        
        for session in sessions:
            start_time = datetime.fromisoformat(session.get("timestamp", datetime.now().isoformat()))
            duration = session.get("duration_seconds", self.optimal_session_duration)
            end_time = start_time + timedelta(seconds=duration)
            
            ical_content += f"""
BEGIN:VEVENT
UID:{session.get('session_id', 'unknown')}@claudecode.local
DTSTAMP:{datetime.now().strftime('%Y%m%dT%H%M%SZ')}
DTSTART:{start_time.strftime('%Y%m%dT%H%M%S')}
DTEND:{end_time.strftime('%Y%m%dT%H%M%S')}
SUMMARY:Claude Code Session
DESCRIPTION:Session ID: {session.get('session_id', 'unknown')}\\nTokens: {session.get('metrics', {}).get('total_tokens', 0)}
STATUS:CONFIRMED
END:VEVENT
"""
        
        ical_content += "END:VCALENDAR"
        
        # Save to file
        ical_path = Path("claude_code_sessions.ics")
        ical_path.write_text(ical_content)
        logger.info(f"iCal file generated: {ical_path}")
        
        return str(ical_path)
    
    def optimize_session_schedule(self) -> List[Dict]:
        """Generate optimized session schedule based on quota"""
        schedule = []
        now = datetime.now()
        
        # Calculate optimal sessions per week
        avg_tokens_per_session = 50000  # Average based on historical data
        sessions_per_week = self.weekly_quota // avg_tokens_per_session
        sessions_per_day = max(1, sessions_per_week // 7)
        
        # Generate schedule for next 7 days
        for day in range(7):
            date = now + timedelta(days=day)
            
            # Schedule sessions during productive hours (9 AM - 6 PM)
            for session_num in range(sessions_per_day):
                start_hour = 9 + (session_num * 3)  # 3-hour intervals
                
                if start_hour < 18:  # Before 6 PM
                    session_time = date.replace(hour=start_hour, minute=0, second=0, microsecond=0)
                    
                    schedule.append({
                        "session_id": f"scheduled_{int(session_time.timestamp())}",
                        "timestamp": session_time.isoformat(),
                        "duration_seconds": self.optimal_session_duration,
                        "type": "scheduled",
                        "metrics": {
                            "estimated_tokens": avg_tokens_per_session
                        }
                    })
        
        logger.info(f"Generated optimized schedule with {len(schedule)} sessions")
        return schedule


class AutomationOrchestrator:
    """Main orchestrator for all automation components"""
    
    def __init__(self):
        self.ws_manager = WebSocketConnectionManager()
        self.session_detector = ClaudeCodeSessionDetector(self.ws_manager)
        self.calendar_automation = CalendarAutomation()
        self.running = True
        
    async def start(self):
        """Start all automation systems"""
        logger.info("Starting WebSocket & Session Automation System")
        
        # Connect to WebSocket
        connected = await self.ws_manager.connect()
        if not connected:
            logger.error("Failed to establish WebSocket connection")
            return
        
        # Start monitoring tasks
        tasks = [
            asyncio.create_task(self.session_detector.monitor_sessions()),
            asyncio.create_task(self.handle_calendar_automation()),
            asyncio.create_task(self.monitor_health())
        ]
        
        try:
            await asyncio.gather(*tasks)
        except KeyboardInterrupt:
            logger.info("Shutting down automation system")
            await self.shutdown()
    
    async def handle_calendar_automation(self):
        """Handle calendar event creation for sessions"""
        while self.running:
            try:
                # Generate optimized schedule weekly
                if datetime.now().weekday() == 0 and datetime.now().hour == 0:  # Monday at midnight
                    schedule = self.calendar_automation.optimize_session_schedule()
                    
                    # Generate iCal file
                    ical_path = self.calendar_automation.generate_ical_file(schedule)
                    
                    # Send schedule to dashboard
                    await self.ws_manager.send_message({
                        "type": "schedule_generated",
                        "schedule": schedule,
                        "ical_path": ical_path,
                        "timestamp": datetime.now().isoformat()
                    })
                
                await asyncio.sleep(3600)  # Check every hour
                
            except Exception as e:
                logger.error(f"Calendar automation error: {e}")
                await asyncio.sleep(300)
    
    async def monitor_health(self):
        """Monitor system health and report status"""
        while self.running:
            try:
                health_status = {
                    "type": "health_status",
                    "websocket_connected": self.ws_manager.connected,
                    "session_monitoring": self.session_detector.monitoring,
                    "message_queue_size": len(self.ws_manager.message_queue),
                    "active_session": self.session_detector.active_session,
                    "timestamp": datetime.now().isoformat()
                }
                
                await self.ws_manager.send_message(health_status)
                
                # Log health status
                if self.ws_manager.connected:
                    logger.info("System healthy: WebSocket connected, monitoring active")
                else:
                    logger.warning("WebSocket disconnected, attempting reconnection")
                
                await asyncio.sleep(30)  # Health check every 30 seconds
                
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def shutdown(self):
        """Clean shutdown of all systems"""
        self.running = False
        self.session_detector.stop_monitoring()
        await self.ws_manager.close()
        logger.info("Automation system shut down successfully")


def main():
    """Main entry point"""
    orchestrator = AutomationOrchestrator()
    
    # Setup signal handlers
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, initiating shutdown")
        asyncio.create_task(orchestrator.shutdown())
        exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run the orchestrator
    try:
        asyncio.run(orchestrator.start())
    except KeyboardInterrupt:
        logger.info("Automation system terminated by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        exit(1)


if __name__ == "__main__":
    main()