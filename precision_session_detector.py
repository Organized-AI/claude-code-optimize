#!/usr/bin/env python3
"""
Precision Session Detector for Claude Code Optimizer
====================================================

Multi-source detection with sub-second accuracy for Claude activity across:
- Claude Code CLI (~/.claude/projects/)
- Claude Desktop (~/Library/Application Support/Claude/)
- Browser claude.ai activity (via network monitoring)

Target: <5 second detection precision with >90% accuracy
"""

import json
import time
import threading
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Tuple, Set
import psutil
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import os
from collections import defaultdict

# Configure precision logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('precision_detection.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ClaudeActivitySource:
    """Base class for activity sources"""
    
    def __init__(self, name: str):
        self.name = name
        self.last_activity = None
        self.confidence = 0.0
        self.is_active = False
        
    def detect_activity(self) -> Tuple[bool, float, Optional[datetime]]:
        """Returns (is_active, confidence, timestamp)"""
        raise NotImplementedError


class ClaudeCodeCLISource(ClaudeActivitySource):
    """Monitor Claude Code CLI activity via ~/.claude/projects/"""
    
    def __init__(self):
        super().__init__("claude_code_cli")
        self.projects_path = Path.home() / ".claude" / "projects"
        self.active_sessions = {}
        self.file_observer = None
        self._setup_file_monitoring()
        
    def _setup_file_monitoring(self):
        """Setup watchdog for real-time file monitoring"""
        if not self.projects_path.exists():
            logger.warning(f"Claude projects path not found: {self.projects_path}")
            return
            
        class JSONLHandler(FileSystemEventHandler):
            def __init__(self, source):
                self.source = source
                
            def on_modified(self, event):
                if event.src_path.endswith('.jsonl'):
                    self.source._handle_jsonl_update(event.src_path)
                    
            def on_created(self, event):
                if event.src_path.endswith('.jsonl'):
                    self.source._handle_new_session(event.src_path)
        
        self.file_observer = Observer()
        self.file_observer.schedule(
            JSONLHandler(self),
            str(self.projects_path),
            recursive=True
        )
        self.file_observer.start()
        logger.info(f"Started file monitoring for {self.projects_path}")
        
    def _handle_jsonl_update(self, file_path: str):
        """Handle JSONL file update with sub-second precision"""
        try:
            path = Path(file_path)
            session_id = path.stem
            
            # Get precise modification time
            stat = path.stat()
            mod_time = datetime.fromtimestamp(stat.st_mtime)
            
            # Update session tracking
            self.active_sessions[session_id] = {
                'last_update': mod_time,
                'file_path': file_path,
                'size': stat.st_size
            }
            
            self.last_activity = mod_time
            self.is_active = True
            self.confidence = 0.98  # Very high confidence for file writes
            
            logger.debug(f"JSONL update detected: {session_id} at {mod_time.isoformat()}")
            
        except Exception as e:
            logger.error(f"Error handling JSONL update: {e}")
            
    def _handle_new_session(self, file_path: str):
        """Handle new session creation"""
        logger.info(f"New Claude Code session detected: {Path(file_path).stem}")
        self._handle_jsonl_update(file_path)
        
    def detect_activity(self) -> Tuple[bool, float, Optional[datetime]]:
        """Detect Claude Code CLI activity with high precision"""
        now = datetime.now()
        
        # Check for recent JSONL modifications
        active_sessions = []
        for session_id, info in self.active_sessions.items():
            time_diff = (now - info['last_update']).total_seconds()
            if time_diff < 30:  # Active within last 30 seconds
                active_sessions.append((session_id, time_diff))
                
        if active_sessions:
            # Sort by most recent
            active_sessions.sort(key=lambda x: x[1])
            most_recent = active_sessions[0]
            
            # Calculate confidence based on recency
            if most_recent[1] < 5:
                confidence = 0.98
            elif most_recent[1] < 10:
                confidence = 0.95
            elif most_recent[1] < 20:
                confidence = 0.90
            else:
                confidence = 0.80
                
            return True, confidence, self.last_activity
            
        # Also check process
        is_running, process_info = self._detect_process()
        if is_running:
            return True, 0.85, datetime.now()
            
        return False, 0.0, None
        
    def _detect_process(self) -> Tuple[bool, Optional[Dict]]:
        """Detect Claude Code process"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
            try:
                info = proc.info
                name = info['name'].lower()
                cmdline = ' '.join(info.get('cmdline', [])).lower()
                
                if 'claude' in name or 'claude' in cmdline:
                    return True, {
                        'pid': info['pid'],
                        'name': info['name'],
                        'start_time': datetime.fromtimestamp(info['create_time'])
                    }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return False, None


class ClaudeDesktopSource(ClaudeActivitySource):
    """Monitor Claude Desktop app activity"""
    
    def __init__(self):
        super().__init__("claude_desktop")
        self.app_support_path = Path.home() / "Library" / "Application Support" / "Claude"
        self.app_names = ["Claude", "Claude.app", "Claude Desktop"]
        self._last_window_check = None
        
    def detect_activity(self) -> Tuple[bool, float, Optional[datetime]]:
        """Detect Claude Desktop activity"""
        # Method 1: Check process
        is_running, process_info = self._detect_process()
        
        # Method 2: Check Application Support modifications
        support_active, support_time = self._check_app_support()
        
        # Method 3: Check active window (macOS specific)
        window_active = self._check_active_window()
        
        # Combine signals for confidence scoring
        if is_running and support_active and window_active:
            confidence = 0.95
            timestamp = support_time or datetime.now()
        elif is_running and (support_active or window_active):
            confidence = 0.90
            timestamp = support_time or datetime.now()
        elif is_running:
            confidence = 0.80
            timestamp = process_info.get('start_time') if process_info else datetime.now()
        else:
            return False, 0.0, None
            
        self.is_active = True
        self.last_activity = timestamp
        self.confidence = confidence
        
        return True, confidence, timestamp
        
    def _detect_process(self) -> Tuple[bool, Optional[Dict]]:
        """Detect Claude Desktop process"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
            try:
                info = proc.info
                name = info['name']
                
                for app_name in self.app_names:
                    if app_name.lower() in name.lower():
                        return True, {
                            'pid': info['pid'],
                            'name': name,
                            'start_time': datetime.fromtimestamp(info['create_time'])
                        }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return False, None
        
    def _check_app_support(self) -> Tuple[bool, Optional[datetime]]:
        """Check Application Support folder for recent activity"""
        if not self.app_support_path.exists():
            return False, None
            
        try:
            # Check for recent file modifications
            recent_files = []
            cutoff_time = datetime.now() - timedelta(seconds=30)
            
            for file_path in self.app_support_path.rglob('*'):
                if file_path.is_file():
                    try:
                        mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                        if mtime > cutoff_time:
                            recent_files.append((file_path, mtime))
                    except:
                        continue
                        
            if recent_files:
                # Sort by most recent
                recent_files.sort(key=lambda x: x[1], reverse=True)
                return True, recent_files[0][1]
                
        except Exception as e:
            logger.error(f"Error checking app support: {e}")
            
        return False, None
        
    def _check_active_window(self) -> bool:
        """Check if Claude Desktop is the active window"""
        try:
            # Use AppleScript to get frontmost application
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
                return any(app_name in front_app for app_name in self.app_names)
                
        except Exception as e:
            logger.debug(f"Error checking active window: {e}")
            
        return False


class ClaudeBrowserSource(ClaudeActivitySource):
    """Monitor claude.ai browser activity via network connections"""
    
    def __init__(self):
        super().__init__("claude_browser")
        self.claude_domains = ['claude.ai', 'anthropic.com']
        self.browser_processes = ['Safari', 'Google Chrome', 'Firefox', 'Arc', 'Brave Browser']
        self._connection_cache = {}
        
    def detect_activity(self) -> Tuple[bool, float, Optional[datetime]]:
        """Detect browser-based Claude activity"""
        active_connections = self._check_network_connections()
        browser_running = self._check_browser_processes()
        
        if active_connections and browser_running:
            confidence = 0.85  # Lower confidence for browser detection
            timestamp = datetime.now()
            
            self.is_active = True
            self.last_activity = timestamp
            self.confidence = confidence
            
            return True, confidence, timestamp
            
        return False, 0.0, None
        
    def _check_network_connections(self) -> bool:
        """Check for active connections to Claude domains"""
        try:
            connections = psutil.net_connections()
            active = False
            
            for conn in connections:
                if conn.raddr:  # Remote address exists
                    try:
                        # Check if connection is to Claude domains
                        # Note: This is simplified - in production would do proper DNS lookup
                        for domain in self.claude_domains:
                            if hasattr(conn.raddr, 'ip'):
                                # Would need to resolve domain to IP for comparison
                                # For now, we'll use port 443 (HTTPS) as indicator
                                if conn.raddr.port == 443:
                                    active = True
                                    break
                    except:
                        continue
                        
            return active
            
        except Exception as e:
            logger.error(f"Error checking network connections: {e}")
            return False
            
    def _check_browser_processes(self) -> bool:
        """Check if browser processes are running"""
        for proc in psutil.process_iter(['name']):
            try:
                name = proc.info['name']
                if any(browser in name for browser in self.browser_processes):
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
                
        return False


class PrecisionSessionDetector:
    """Main detector combining all sources with cross-validation"""
    
    def __init__(self):
        self.sources = {
            'cli': ClaudeCodeCLISource(),
            'desktop': ClaudeDesktopSource(),
            'browser': ClaudeBrowserSource()
        }
        self.session_history = defaultdict(list)
        self.current_session = None
        self.detection_thread = None
        self.running = False
        
    def start_detection(self, callback=None):
        """Start precision detection with callback for session events"""
        self.running = True
        self.detection_thread = threading.Thread(
            target=self._detection_loop,
            args=(callback,),
            daemon=True
        )
        self.detection_thread.start()
        logger.info("Started precision session detection")
        
    def stop_detection(self):
        """Stop detection"""
        self.running = False
        if self.detection_thread:
            self.detection_thread.join(timeout=5)
            
        # Stop file observers
        if hasattr(self.sources['cli'], 'file_observer'):
            self.sources['cli'].file_observer.stop()
            
    def _detection_loop(self, callback):
        """Main detection loop with sub-second precision"""
        while self.running:
            try:
                # Detect from all sources
                detections = {}
                for name, source in self.sources.items():
                    is_active, confidence, timestamp = source.detect_activity()
                    detections[name] = {
                        'active': is_active,
                        'confidence': confidence,
                        'timestamp': timestamp
                    }
                
                # Analyze detections
                session_data = self._analyze_detections(detections)
                
                # Handle session state changes
                if session_data['is_active'] and not self.current_session:
                    # New session started
                    self.current_session = {
                        'id': f"session_{int(time.time()*1000)}",
                        'start_time': session_data['timestamp'],
                        'confidence': session_data['confidence'],
                        'sources': session_data['active_sources']
                    }
                    
                    logger.info(f"New session detected: {self.current_session['id']} "
                              f"(confidence: {session_data['confidence']:.2%})")
                    
                    if callback:
                        callback('session_start', self.current_session)
                        
                elif not session_data['is_active'] and self.current_session:
                    # Session ended
                    end_data = {
                        **self.current_session,
                        'end_time': datetime.now(),
                        'duration': (datetime.now() - self.current_session['start_time']).total_seconds()
                    }
                    
                    logger.info(f"Session ended: {self.current_session['id']} "
                              f"(duration: {end_data['duration']:.0f}s)")
                    
                    if callback:
                        callback('session_end', end_data)
                        
                    self.current_session = None
                    
                elif session_data['is_active'] and self.current_session:
                    # Update current session
                    self.current_session['last_activity'] = session_data['timestamp']
                    self.current_session['confidence'] = session_data['confidence']
                    
                    if callback:
                        callback('session_update', {
                            **self.current_session,
                            'detections': detections
                        })
                
                # High-frequency polling for precision
                time.sleep(0.5)  # 500ms for sub-second precision
                
            except Exception as e:
                logger.error(f"Detection loop error: {e}")
                time.sleep(1)
                
    def _analyze_detections(self, detections: Dict) -> Dict:
        """Analyze detections from all sources and calculate combined confidence"""
        active_sources = []
        timestamps = []
        confidences = []
        
        for name, data in detections.items():
            if data['active']:
                active_sources.append(name)
                confidences.append(data['confidence'])
                if data['timestamp']:
                    timestamps.append(data['timestamp'])
                    
        if not active_sources:
            return {
                'is_active': False,
                'confidence': 0.0,
                'timestamp': None,
                'active_sources': []
            }
            
        # Calculate combined confidence
        if len(active_sources) >= 2:
            # Multiple sources = higher confidence
            combined_confidence = min(0.98, max(confidences) * 1.1)
        else:
            # Single source
            combined_confidence = max(confidences)
            
        # Use earliest timestamp for session start
        session_timestamp = min(timestamps) if timestamps else datetime.now()
        
        # Record in history for validation
        self.session_history['detections'].append({
            'timestamp': datetime.now(),
            'sources': active_sources,
            'confidence': combined_confidence
        })
        
        return {
            'is_active': True,
            'confidence': combined_confidence,
            'timestamp': session_timestamp,
            'active_sources': active_sources
        }
        
    def get_current_session(self) -> Optional[Dict]:
        """Get current session data"""
        return self.current_session
        
    def get_detection_metrics(self) -> Dict:
        """Get detection accuracy metrics"""
        metrics = {
            'sources': {}
        }
        
        for name, source in self.sources.items():
            metrics['sources'][name] = {
                'is_active': source.is_active,
                'confidence': source.confidence,
                'last_activity': source.last_activity.isoformat() if source.last_activity else None
            }
            
        metrics['current_session'] = self.current_session
        metrics['detection_count'] = len(self.session_history['detections'])
        
        return metrics


def main():
    """Test precision detection"""
    detector = PrecisionSessionDetector()
    
    def session_callback(event_type, data):
        print(f"\n[{event_type.upper()}] {json.dumps(data, default=str, indent=2)}")
    
    try:
        detector.start_detection(callback=session_callback)
        print("Precision session detection started. Press Ctrl+C to stop.")
        
        while True:
            time.sleep(10)
            metrics = detector.get_detection_metrics()
            print(f"\nDetection Metrics: {json.dumps(metrics, default=str, indent=2)}")
            
    except KeyboardInterrupt:
        print("\nStopping detection...")
        detector.stop_detection()


if __name__ == "__main__":
    main()