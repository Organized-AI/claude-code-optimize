#!/usr/bin/env python3
"""
Detection Agent for Claude Code Optimizer
==========================================

Specialized agent for multi-source Claude activity detection with sub-second precision.

Core Responsibilities:
- Monitor Claude Desktop (~/Library/Application Support/Claude/)
- Monitor Claude Code CLI (~/.claude/projects/)  
- Detect browser claude.ai sessions
- Process monitoring across all Claude interfaces
- Real-time file watching with watchdog
- Network activity detection
- Cross-platform session correlation
- <5 second detection accuracy

Agent Architecture:
- precision_session_detector.py: Main multi-source coordinator
- claude_desktop_monitor.py: Specialized Desktop app monitoring
- Real-time detection with confidence scoring
- Event correlation and validation
"""

import os
import sys
import json
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
import subprocess
import psutil
import logging
from collections import defaultdict, deque
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure agent logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [DETECTION-AGENT] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('logs/detection-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DetectionAgent:
    """
    Specialized Detection Agent
    
    Coordinates multi-source Claude activity detection with precision timing.
    """
    
    def __init__(self):
        self.agent_id = f"detection-agent-{int(time.time())}"
        self.startup_time = datetime.now()
        
        # Core detection components
        self.detector = None
        self.desktop_monitor = None
        
        # Agent state
        self.is_running = False
        self.detection_thread = None
        self.metrics = {
            'detections_count': 0,
            'accuracy_score': 0.0,
            'last_detection': None,
            'sources_active': set()
        }
        
        # Detection callbacks
        self.callbacks = []
        
    def initialize(self):
        """Initialize detection agent"""
        logger.info(f"Initializing Detection Agent {self.agent_id}")
        
        # Create logs directory
        os.makedirs('logs', exist_ok=True)
        
        # Import and initialize precision detector
        try:
            from precision_session_detector import PrecisionSessionDetector
            self.detector = PrecisionSessionDetector()
            logger.info("✅ Precision session detector initialized")
        except ImportError as e:
            logger.error(f"❌ Failed to import precision detector: {e}")
            return False
            
        # Initialize Claude Desktop monitor
        try:
            self.desktop_monitor = ClaudeDesktopMonitor()
            logger.info("✅ Claude Desktop monitor initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize desktop monitor: {e}")
            
        # Setup detection callback
        def detection_callback(event_type, data):
            self._handle_detection_event(event_type, data)
            
        # Start detection systems
        try:
            self.detector.start_detection(callback=detection_callback)
            if self.desktop_monitor:
                self.desktop_monitor.start_monitoring()
            logger.info("✅ Detection systems started")
        except Exception as e:
            logger.error(f"❌ Failed to start detection systems: {e}")
            return False
            
        self.is_running = True
        logger.info(f"🚀 Detection Agent {self.agent_id} fully initialized")
        return True
        
    def start_detection_loop(self):
        """Start main detection loop"""
        if not self.is_running:
            logger.error("Agent not initialized")
            return
            
        self.detection_thread = threading.Thread(
            target=self._detection_loop,
            daemon=True
        )
        self.detection_thread.start()
        logger.info("Detection loop started")
        
    def _detection_loop(self):
        """Main detection coordination loop"""
        while self.is_running:
            try:
                # Collect detection status from all sources
                status = self._collect_detection_status()
                
                # Update agent metrics
                self._update_metrics(status)
                
                # Coordinate with other agents if needed
                self._coordinate_with_agents(status)
                
                time.sleep(1)  # 1-second precision loop
                
            except Exception as e:
                logger.error(f"Detection loop error: {e}")
                time.sleep(5)
                
    def _collect_detection_status(self) -> Dict:
        """Collect status from all detection sources"""
        status = {
            'timestamp': datetime.now(),
            'sources': {},
            'active_sessions': []
        }
        
        # Get precision detector status
        if self.detector:
            detector_metrics = self.detector.get_detection_metrics()
            status['sources']['precision_detector'] = detector_metrics
            
            current_session = self.detector.get_current_session()
            if current_session:
                status['active_sessions'].append(current_session)
                
        # Get desktop monitor status
        if self.desktop_monitor:
            desktop_status = self.desktop_monitor.get_status()
            status['sources']['desktop_monitor'] = desktop_status
            
        return status
        
    def _update_metrics(self, status: Dict):
        """Update agent performance metrics"""
        # Count active sources
        active_sources = set()
        for source_name, source_data in status['sources'].items():
            if source_data.get('sources'):
                for source in source_data['sources'].values():
                    if source.get('is_active'):
                        active_sources.add(source_name)
                        
        self.metrics['sources_active'] = active_sources
        
        # Update detection count
        if status['active_sessions']:
            self.metrics['detections_count'] += 1
            self.metrics['last_detection'] = status['timestamp']
            
        # Calculate accuracy score (simplified)
        if len(active_sources) >= 2:
            self.metrics['accuracy_score'] = min(0.95, 0.8 + len(active_sources) * 0.05)
        elif len(active_sources) == 1:
            self.metrics['accuracy_score'] = 0.8
        else:
            self.metrics['accuracy_score'] = 0.0
            
    def _coordinate_with_agents(self, status: Dict):
        """Coordinate detection data with other agents"""
        # This would integrate with the HOA (Handoff Orchestrator Agent)
        # For now, we'll log coordination events
        
        if status['active_sessions']:
            logger.info(f"🔄 Coordinating session detection with other agents: "
                       f"{len(status['active_sessions'])} sessions")
                       
    def _handle_detection_event(self, event_type: str, data: Dict):
        """Handle detection events from precision detector"""
        logger.info(f"🎯 Detection event: {event_type}")
        
        # Process event based on type
        if event_type == 'session_start':
            self._handle_session_start(data)
        elif event_type == 'session_end':
            self._handle_session_end(data)
        elif event_type == 'session_update':
            self._handle_session_update(data)
            
        # Notify callbacks
        for callback in self.callbacks:
            try:
                callback(event_type, data)
            except Exception as e:
                logger.error(f"Callback error: {e}")
                
    def _handle_session_start(self, data: Dict):
        """Handle session start detection"""
        logger.info(f"🚀 Session started: {data.get('id')} "
                   f"(confidence: {data.get('confidence', 0):.2%})")
                   
        # Create detection report
        report = {
            'agent_id': self.agent_id,
            'event_type': 'session_start',
            'session_id': data.get('id'),
            'timestamp': data.get('start_time'),
            'confidence': data.get('confidence'),
            'sources': data.get('sources', []),
            'validation_passed': data.get('confidence', 0) >= 0.90
        }
        
        self._send_to_dashboard(report)
        
    def _handle_session_end(self, data: Dict):
        """Handle session end detection"""
        logger.info(f"🛑 Session ended: {data.get('id')} "
                   f"(duration: {data.get('duration', 0):.0f}s)")
                   
        report = {
            'agent_id': self.agent_id,
            'event_type': 'session_end',
            'session_id': data.get('id'),
            'duration': data.get('duration'),
            'end_time': data.get('end_time')
        }
        
        self._send_to_dashboard(report)
        
    def _handle_session_update(self, data: Dict):
        """Handle session update detection"""
        logger.debug(f"📊 Session update: {data.get('id')}")
        
    def _send_to_dashboard(self, report: Dict):
        """Send report to dashboard API"""
        try:
            # This would integrate with the dashboard API
            logger.info(f"📤 Sending report to dashboard: {report['event_type']}")
            
            # For now, save to file for integration
            report_path = Path('logs') / 'detection-reports.jsonl'
            with open(report_path, 'a') as f:
                f.write(json.dumps(report, default=str) + '\n')
                
        except Exception as e:
            logger.error(f"Failed to send dashboard report: {e}")
            
    def add_callback(self, callback):
        """Add detection event callback"""
        self.callbacks.append(callback)
        
    def get_agent_status(self) -> Dict:
        """Get comprehensive agent status"""
        return {
            'agent_id': self.agent_id,
            'status': 'running' if self.is_running else 'stopped',
            'startup_time': self.startup_time.isoformat(),
            'uptime_seconds': (datetime.now() - self.startup_time).total_seconds(),
            'metrics': dict(self.metrics),
            'detector_status': self.detector.get_detection_metrics() if self.detector else None,
            'desktop_monitor_status': self.desktop_monitor.get_status() if self.desktop_monitor else None
        }
        
    def stop(self):
        """Stop detection agent"""
        logger.info("Stopping Detection Agent")
        
        self.is_running = False
        
        if self.detector:
            self.detector.stop_detection()
            
        if self.desktop_monitor:
            self.desktop_monitor.stop_monitoring()
            
        if self.detection_thread:
            self.detection_thread.join(timeout=5)
            
        logger.info("✅ Detection Agent stopped")


class ClaudeDesktopMonitor:
    """
    Specialized Claude Desktop application monitor
    
    Monitors:
    - Application Support folder: ~/Library/Application Support/Claude/
    - Process monitoring for Claude.app
    - Window focus detection
    - File system events
    """
    
    def __init__(self):
        self.app_support_path = Path.home() / "Library" / "Application Support" / "Claude"
        self.is_monitoring = False
        self.file_observer = None
        self.status = {
            'app_running': False,
            'window_active': False,
            'recent_activity': None,
            'files_modified': []
        }
        
    def start_monitoring(self):
        """Start monitoring Claude Desktop"""
        if self.is_monitoring:
            return
            
        logger.info("Starting Claude Desktop monitoring")
        
        # Setup file system monitoring
        self._setup_file_monitoring()
        
        # Start monitoring thread
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            daemon=True
        )
        self.monitor_thread.start()
        
        logger.info("✅ Claude Desktop monitoring started")
        
    def _setup_file_monitoring(self):
        """Setup file system monitoring for Application Support"""
        if not self.app_support_path.exists():
            logger.warning(f"Claude app support path not found: {self.app_support_path}")
            return
            
        class ClaudeDesktopHandler(FileSystemEventHandler):
            def __init__(self, monitor):
                self.monitor = monitor
                
            def on_modified(self, event):
                if not event.is_directory:
                    self.monitor._handle_file_event('modified', event.src_path)
                    
            def on_created(self, event):
                if not event.is_directory:
                    self.monitor._handle_file_event('created', event.src_path)
                    
        self.file_observer = Observer()
        self.file_observer.schedule(
            ClaudeDesktopHandler(self),
            str(self.app_support_path),
            recursive=True
        )
        self.file_observer.start()
        
    def _handle_file_event(self, event_type: str, file_path: str):
        """Handle file system events"""
        logger.debug(f"Claude Desktop file event: {event_type} - {file_path}")
        
        self.status['recent_activity'] = datetime.now()
        self.status['files_modified'].append({
            'event': event_type,
            'path': file_path,
            'timestamp': datetime.now()
        })
        
        # Keep only recent events
        cutoff = datetime.now() - timedelta(minutes=5)
        self.status['files_modified'] = [
            event for event in self.status['files_modified']
            if event['timestamp'] > cutoff
        ]
        
    def _monitoring_loop(self):
        """Main monitoring loop for Claude Desktop"""
        while self.is_monitoring:
            try:
                # Check process status
                self.status['app_running'] = self._check_process()
                
                # Check window focus
                self.status['window_active'] = self._check_window_focus()
                
                time.sleep(2)  # Check every 2 seconds
                
            except Exception as e:
                logger.error(f"Desktop monitoring error: {e}")
                time.sleep(5)
                
    def _check_process(self) -> bool:
        """Check if Claude Desktop process is running"""
        app_names = ["Claude", "Claude.app", "Claude Desktop"]
        
        for proc in psutil.process_iter(['name']):
            try:
                name = proc.info['name']
                if any(app_name.lower() in name.lower() for app_name in app_names):
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return False
        
    def _check_window_focus(self) -> bool:
        """Check if Claude Desktop has window focus"""
        try:
            script = '''
            tell application "System Events"
                set frontApp to name of first application process whose frontmost is true
            end tell
            '''
            
            result = subprocess.run(
                ['osascript', '-e', script],
                capture_output=True,
                text=True,
                timeout=1
            )
            
            if result.returncode == 0:
                front_app = result.stdout.strip()
                return 'claude' in front_app.lower()
                
        except Exception as e:
            logger.debug(f"Window focus check error: {e}")
            
        return False
        
    def get_status(self) -> Dict:
        """Get current monitoring status"""
        return {
            'monitoring': self.is_monitoring,
            'app_running': self.status['app_running'],
            'window_active': self.status['window_active'],
            'recent_activity': self.status['recent_activity'].isoformat() if self.status['recent_activity'] else None,
            'recent_files': len(self.status['files_modified']),
            'app_support_exists': self.app_support_path.exists()
        }
        
    def stop_monitoring(self):
        """Stop monitoring"""
        self.is_monitoring = False
        
        if self.file_observer:
            self.file_observer.stop()
            self.file_observer.join()
            
        logger.info("✅ Claude Desktop monitoring stopped")


def main():
    """Main entry point for detection agent"""
    agent = DetectionAgent()
    
    try:
        # Initialize agent
        if not agent.initialize():
            logger.error("Failed to initialize detection agent")
            return 1
            
        # Start detection loop
        agent.start_detection_loop()
        
        # Add test callback
        def test_callback(event_type, data):
            print(f"\n🎯 DETECTION CALLBACK: {event_type}")
            print(f"   Data: {json.dumps(data, default=str, indent=2)}")
            
        agent.add_callback(test_callback)
        
        logger.info("Detection agent running. Press Ctrl+C to stop.")
        
        # Status reporting loop
        while agent.is_running:
            time.sleep(30)
            status = agent.get_agent_status()
            logger.info(f"Agent Status: {status['metrics']}")
            
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
        agent.stop()
        return 0
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        agent.stop()
        return 1


if __name__ == "__main__":
    sys.exit(main())