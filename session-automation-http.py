#!/usr/bin/env python3
"""
Session Automation with HTTP API Integration & Precision Detection
==================================================================

Enhanced with SessionCoordinator integration for precision 5-hour session detection.
Coordinates with specialized agents for <5 second accuracy and >90% validation confidence.

New Features:
- Precision session detection with multi-source coordination
- SessionCoordinator integration for agent orchestration
- Enhanced Claude Desktop monitoring
- Real-time validation and token correlation
"""

import json
import time
import threading
import subprocess
import requests
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, List
import psutil
import logging
import os
import signal
import sys

# Add current directory for imports
sys.path.append(str(Path(__file__).parent))

# Import coordination system
try:
    from SessionCoordinator import SessionCoordinator, SessionContext
    from precision_session_detector import PrecisionSessionDetector
    from session_accuracy_validator import SessionAccuracyValidator
    from token_precision_tracker import TokenPrecisionTracker
    PRECISION_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Precision components not available: {e}")
    PRECISION_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('session-automation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DashboardAPIClient:
    """HTTP API client for dashboard communication"""
    
    def __init__(self, base_url: str = "https://moonlock-dashboard-8twh1qdrw-jordaaans-projects.vercel.app"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ClaudeCodeAutomation/1.0'
        })
        
    def send_session_update(self, data: Dict) -> bool:
        """Send session update to dashboard API"""
        try:
            event_type = data.get("type")
            
            # Handle different event types
            if event_type == "session_started":
                # Create a new session
                session_data = {
                    "name": f"Claude Code Session - {data.get('session_id', 'unknown')}",
                    "duration": 3600,  # Default 1 hour
                    "tokenBudget": 100000  # Default budget
                }
                response = self.session.post(
                    f"{self.base_url}/api/sessions",
                    json=session_data,
                    timeout=10
                )
                
            elif event_type == "session_ended":
                # Update session status to completed
                session_id = data.get("session_id")
                if session_id:
                    response = self.session.patch(
                        f"{self.base_url}/api/sessions?id={session_id}",
                        json={"status": "completed"},
                        timeout=10
                    )
                else:
                    logger.warning("No session ID for end event")
                    return False
                    
            elif event_type == "session_update":
                # Send token usage update
                session_id = data.get("session_id")
                metrics = data.get("metrics", {})
                if session_id and metrics:
                    token_data = {
                        "sessionId": session_id,
                        "tokensUsed": metrics.get("total_tokens", 0),
                        "cost": metrics.get("total_cost", 0.0)
                    }
                    response = self.session.post(
                        f"{self.base_url}/api/tokens?usage=true",
                        json=token_data,
                        timeout=10
                    )
                else:
                    logger.warning("Insufficient data for session update")
                    return False
            else:
                logger.warning(f"Unknown event type: {event_type}")
                return False
            
            if response.status_code == 200:
                logger.info(f"Session update sent successfully: {data.get('type')}")
                return True
            else:
                logger.warning(f"API returned status {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            logger.error("Failed to connect to dashboard API")
            return False
        except requests.exceptions.Timeout:
            logger.error("API request timed out")
            return False
        except Exception as e:
            logger.error(f"API error: {e}")
            return False
    
    def check_health(self) -> bool:
        """Check if dashboard API is healthy"""
        try:
            response = self.session.get(
                f"{self.base_url}/api/health",
                timeout=5
            )
            return response.status_code == 200
        except:
            return False


class EnhancedSessionMonitor:
    """Enhanced session monitoring with precision detection coordination"""
    
    def __init__(self):
        self.api_client = DashboardAPIClient()
        self.claude_path = Path.home() / ".claude"
        self.projects_path = self.claude_path / "projects"
        self.current_session = None
        self.session_start_time = None
        self.monitoring = False
        self.metrics_cache = {}
        
        # Precision detection components
        self.session_coordinator = None
        self.precision_detector = None
        self.validator = None
        self.token_tracker = None
        self.precision_enabled = PRECISION_AVAILABLE
        
        # Initialize precision components
        if self.precision_enabled:
            self._initialize_precision_components()
            
    def _initialize_precision_components(self):
        """Initialize precision detection components"""
        try:
            logger.info("🎯 Initializing precision detection components...")
            
            # Initialize SessionCoordinator
            self.session_coordinator = SessionCoordinator()
            if not self.session_coordinator.initialize():
                raise Exception("Failed to initialize SessionCoordinator")
                
            # Initialize precision detector
            self.precision_detector = PrecisionSessionDetector()
            
            # Initialize validator
            self.validator = SessionAccuracyValidator()
            
            # Initialize token tracker
            self.token_tracker = TokenPrecisionTracker()
            
            # Register with coordinator as agents
            self.session_coordinator.register_agent('detection', self.precision_detector)
            self.session_coordinator.register_agent('validation', self.validator)
            self.session_coordinator.register_agent('token', self.token_tracker)
            
            # Start coordination
            self.session_coordinator.start_coordination()
            
            logger.info("✅ Precision detection initialized with <5s accuracy target")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize precision components: {e}")
            self.precision_enabled = False
        
    def detect_claude_code_process(self) -> tuple[bool, Optional[Dict]]:
        """Detect Claude Code process with detailed info"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time', 'memory_info', 'cpu_percent']):
            try:
                info = proc.info
                name = info['name']
                cmdline = info.get('cmdline', [])
                
                # Multiple detection patterns
                patterns = ['claude', 'claude-code', 'claude code', 'claude.app']
                
                if any(pattern in name.lower() for pattern in patterns):
                    return True, {
                        "pid": info['pid'],
                        "name": name,
                        "start_time": datetime.fromtimestamp(info['create_time']).isoformat(),
                        "memory_mb": info['memory_info'].rss / 1024 / 1024 if info.get('memory_info') else 0,
                        "cpu_percent": proc.cpu_percent()
                    }
                
                # Check command line
                if cmdline:
                    cmdline_str = ' '.join(cmdline).lower()
                    if any(pattern in cmdline_str for pattern in patterns):
                        return True, {
                            "pid": info['pid'],
                            "name": name,
                            "start_time": datetime.fromtimestamp(info['create_time']).isoformat(),
                            "memory_mb": info['memory_info'].rss / 1024 / 1024 if info.get('memory_info') else 0,
                            "cpu_percent": proc.cpu_percent()
                        }
                        
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return False, None
    
    def parse_jsonl_metrics(self) -> Dict:
        """Parse JSONL files for detailed metrics"""
        metrics = {
            "total_tokens": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_tokens": 0,
            "total_cost": 0.0,
            "turn_count": 0,
            "models_used": set(),
            "latest_activity": None,
            "session_files": []
        }
        
        if not self.projects_path.exists():
            return metrics
        
        # Find recent JSONL files (last 24 hours)
        cutoff_time = datetime.now() - timedelta(hours=24)
        jsonl_files = []
        
        for jsonl_file in self.projects_path.glob("**/*.jsonl"):
            try:
                mtime = datetime.fromtimestamp(jsonl_file.stat().st_mtime)
                if mtime > cutoff_time:
                    jsonl_files.append(jsonl_file)
            except:
                continue
        
        # Parse each file
        for jsonl_file in jsonl_files:
            try:
                with open(jsonl_file, 'r') as f:
                    for line in f:
                        try:
                            data = json.loads(line.strip())
                            
                            # Extract usage metrics
                            if "usage" in data:
                                usage = data["usage"]
                                metrics["total_tokens"] += usage.get("total_tokens", 0)
                                metrics["input_tokens"] += usage.get("input_tokens", 0)
                                metrics["output_tokens"] += usage.get("output_tokens", 0)
                                metrics["cache_tokens"] += usage.get("cache_creation_input_tokens", 0) + usage.get("cache_read_input_tokens", 0)
                            
                            # Extract cost
                            if "cost" in data:
                                metrics["total_cost"] += float(data["cost"])
                            elif "total_cost_usd" in data:
                                metrics["total_cost"] += float(data["total_cost_usd"])
                            
                            # Extract model
                            if "model" in data:
                                metrics["models_used"].add(data["model"])
                            
                            # Count turns
                            if "role" in data or "type" in data:
                                metrics["turn_count"] += 1
                            
                            # Track latest activity
                            if "timestamp" in data:
                                timestamp = datetime.fromisoformat(data["timestamp"])
                                if not metrics["latest_activity"] or timestamp > metrics["latest_activity"]:
                                    metrics["latest_activity"] = timestamp
                                    
                        except json.JSONDecodeError:
                            continue
                
                metrics["session_files"].append(str(jsonl_file))
                
            except Exception as e:
                logger.warning(f"Error parsing {jsonl_file}: {e}")
        
        # Convert set to list for JSON serialization
        metrics["models_used"] = list(metrics["models_used"])
        
        # Convert datetime to ISO format
        if metrics["latest_activity"]:
            metrics["latest_activity"] = metrics["latest_activity"].isoformat()
        
        return metrics
    
    def create_calendar_event(self, session_data: Dict):
        """Create calendar event for session"""
        try:
            start_time = datetime.fromisoformat(session_data.get("start_time", datetime.now().isoformat()))
            duration = session_data.get("duration_seconds", 3600)
            end_time = start_time + timedelta(seconds=duration)
            
            # AppleScript for Calendar.app
            applescript = f'''
            tell application "Calendar"
                if not (exists calendar "Claude Code Sessions") then
                    make new calendar with properties {{name:"Claude Code Sessions"}}
                end if
                
                tell calendar "Claude Code Sessions"
                    set newEvent to make new event with properties {{summary:"Claude Code Session", start date:date "{start_time.strftime('%B %d, %Y %I:%M:%S %p')}", end date:date "{end_time.strftime('%B %d, %Y %I:%M:%S %p')}"}}
                    set description of newEvent to "Session ID: {session_data.get('session_id', 'unknown')}\\nTokens: {session_data.get('metrics', {}).get('total_tokens', 0)}\\nCost: ${session_data.get('metrics', {}).get('total_cost', 0):.4f}"
                end tell
            end tell
            '''
            
            result = subprocess.run(
                ['osascript', '-e', applescript],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info("Calendar event created successfully")
            else:
                logger.error(f"Failed to create calendar event: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Calendar integration error: {e}")
    
    def monitor_sessions(self):
        """Main monitoring loop with precision detection integration"""
        self.monitoring = True
        last_process_state = False
        last_health_check = time.time()
        health_check_interval = 30
        
        logger.info("Session monitoring started")
        
        # Start precision detection if available
        if self.precision_enabled and self.precision_detector:
            logger.info("🎯 Starting precision detection with <5s accuracy target")
            def precision_callback(event_type, data):
                self._handle_precision_event(event_type, data)
            self.precision_detector.start_detection(callback=precision_callback)
        
        # Initial health check
        if self.api_client.check_health():
            logger.info("Dashboard API is online")
        else:
            logger.warning("Dashboard API is offline - will retry")
        
        while self.monitoring:
            try:
                # Check process status
                is_running, process_info = self.detect_claude_code_process()
                
                # Session state change detection
                if is_running != last_process_state:
                    if is_running:
                        # Session started - use precision detection if available
                        if self.precision_enabled:
                            logger.info("🎯 Claude Code detected - precision validation in progress...")
                        else:
                            # Fallback to legacy detection
                            self.session_start_time = datetime.now()
                            self.current_session = f"session_{int(time.time())}"
                            
                            session_data = {
                                "type": "session_started",
                                "session_id": self.current_session,
                                "start_time": self.session_start_time.isoformat(),
                                "process_info": process_info,
                                "source": "automation_monitor"
                            }
                            
                            self.api_client.send_session_update(session_data)
                            logger.info(f"Session started: {self.current_session}")
                        
                    else:
                        # Session ended
                        if self.current_session:
                            duration = (datetime.now() - self.session_start_time).total_seconds()
                            metrics = self.parse_jsonl_metrics()
                            
                            session_data = {
                                "type": "session_ended",
                                "session_id": self.current_session,
                                "start_time": self.session_start_time.isoformat(),
                                "end_time": datetime.now().isoformat(),
                                "duration_seconds": duration,
                                "metrics": metrics,
                                "source": "automation_monitor"
                            }
                            
                            self.api_client.send_session_update(session_data)
                            logger.info(f"Session ended: {self.current_session} (duration: {duration:.0f}s)")
                            
                            # Create calendar event
                            self.create_calendar_event(session_data)
                            
                            self.current_session = None
                            self.session_start_time = None
                
                last_process_state = is_running
                
                # Send periodic updates if session is active
                if is_running and self.current_session:
                    metrics = self.parse_jsonl_metrics()
                    
                    # Only send if metrics changed significantly
                    if metrics != self.metrics_cache:
                        update_data = {
                            "type": "session_update",
                            "session_id": self.current_session,
                            "duration_seconds": (datetime.now() - self.session_start_time).total_seconds(),
                            "metrics": metrics,
                            "process_info": process_info,
                            "timestamp": datetime.now().isoformat(),
                            "source": "automation_monitor"
                        }
                        
                        self.api_client.send_session_update(update_data)
                        self.metrics_cache = metrics
                
                # Periodic health check
                if time.time() - last_health_check > health_check_interval:
                    if self.api_client.check_health():
                        logger.debug("Dashboard API health check passed")
                    else:
                        logger.warning("Dashboard API health check failed")
                    last_health_check = time.time()
                
                # Sleep interval
                time.sleep(5)
                
            except KeyboardInterrupt:
                logger.info("Monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                time.sleep(10)
        
        logger.info("Session monitoring stopped")
    
    def _handle_precision_event(self, event_type: str, data: Dict):
        """Handle precision detection events"""
        try:
            if event_type == 'session_start':
                # High-confidence session start detected
                session_id = data.get('id')
                confidence = data.get('confidence', 0.0)
                
                logger.info(f"✅ Precision session validated: {session_id} (confidence: {confidence:.2%})")
                
                # Update current session tracking
                self.current_session = session_id
                self.session_start_time = datetime.fromisoformat(data.get('start_time', datetime.now().isoformat()))
                
                # Send enhanced session data to dashboard
                enhanced_session_data = {
                    "type": "precision_session_started",
                    "session_id": session_id,
                    "start_time": self.session_start_time.isoformat(),
                    "confidence": confidence,
                    "sources": data.get('sources', []),
                    "precision_timestamp": datetime.now().isoformat(),
                    "validation_passed": True,
                    "source": "precision_monitor"
                }
                
                self.api_client.send_session_update(enhanced_session_data)
                
            elif event_type == 'session_end':
                session_id = data.get('id')
                if session_id == self.current_session:
                    duration = data.get('duration', 0)
                    logger.info(f"✅ Precision session completed: {session_id} (duration: {duration:.0f}s)")
                    
                    # Get final metrics
                    metrics = self.parse_jsonl_metrics()
                    
                    completion_data = {
                        "type": "precision_session_ended",
                        "session_id": session_id,
                        "end_time": datetime.now().isoformat(),
                        "duration_seconds": duration,
                        "metrics": metrics,
                        "source": "precision_monitor"
                    }
                    
                    self.api_client.send_session_update(completion_data)
                    
                    # Create calendar event with precision data
                    enhanced_session_data = {
                        **completion_data,
                        'start_time': self.session_start_time.isoformat() if self.session_start_time else None
                    }
                    self.create_calendar_event(enhanced_session_data)
                    
                    self.current_session = None
                    self.session_start_time = None
                    
            elif event_type == 'session_update':
                # Real-time session updates
                session_id = data.get('id')
                if session_id == self.current_session:
                    logger.debug(f"📊 Session update: {session_id}")
                    
        except Exception as e:
            logger.error(f"Error handling precision event: {e}")
    
    def stop(self):
        """Stop monitoring"""
        self.monitoring = False
        
        # Stop precision components
        if self.precision_enabled:
            if self.precision_detector:
                self.precision_detector.stop_detection()
            if self.session_coordinator:
                self.session_coordinator.stop()
            logger.info("✅ Precision detection stopped")


def main():
    """Main entry point"""
    monitor = EnhancedSessionMonitor()
    
    # Signal handlers for graceful shutdown
    def signal_handler(signum, frame):
        logger.info(f"Received signal {signum}, shutting down...")
        monitor.stop()
        exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start monitoring
    try:
        monitor.monitor_sessions()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        exit(1)


if __name__ == "__main__":
    main()