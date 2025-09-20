#!/usr/bin/env python3
"""
Bulletproof Claude Process Monitoring with PID Tracking
Reliable detection of Claude Code sessions and lifecycle management
"""

import psutil
import os
import time
import logging
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, asdict
import threading
from queue import Queue
import signal

@dataclass
class ProcessInfo:
    """Claude process information"""
    pid: int
    name: str
    cmdline: List[str]
    create_time: float
    status: str
    memory_mb: float
    cpu_percent: float
    working_directory: str
    user: str
    detected_at: datetime

@dataclass 
class SessionState:
    """Claude Code session state"""
    session_id: str
    process_info: ProcessInfo
    start_time: datetime
    last_activity: datetime
    status: str  # 'starting', 'active', 'idle', 'ending'
    data_directory: Optional[str] = None
    project_path: Optional[str] = None
    conversation_id: Optional[str] = None

class ClaudeProcessMonitor:
    """Monitors Claude Code processes with bulletproof detection"""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = self._load_config(config)
        self.setup_logging()
        
        # Process tracking
        self.tracked_processes: Dict[int, ProcessInfo] = {}
        self.active_sessions: Dict[str, SessionState] = {}
        self.process_history: List[ProcessInfo] = []
        
        # Detection patterns
        self.claude_patterns = [
            "claude-code",
            "claude_code", 
            "claude-desktop",
            "/Applications/Claude.app",
            "anthropic",
            "claude"
        ]
        
        # Monitoring state
        self.is_monitoring = False
        self.monitor_thread = None
        self.event_queue = Queue()
        
        # Callbacks
        self.session_callbacks = {
            'session_start': [],
            'session_end': [],
            'session_activity': [],
            'process_change': []
        }
        
    def _load_config(self, config: Optional[Dict]) -> Dict:
        """Load monitoring configuration"""
        default_config = {
            "scan_interval": 2.0,  # seconds
            "activity_timeout": 300,  # 5 minutes
            "min_session_duration": 10,  # seconds
            "memory_threshold_mb": 50,
            "cpu_threshold_percent": 1.0,
            "data_directories": [
                "~/.claude",
                "~/.anthropic", 
                "~/Library/Application Support/Claude",
                "~/AppData/Local/Claude"
            ],
            "exclude_processes": [
                "claude-updater",
                "claude-installer"
            ]
        }
        
        if config:
            default_config.update(config)
        
        return default_config
    
    def setup_logging(self):
        """Setup process monitor logging"""
        self.logger = logging.getLogger('ClaudeProcessMonitor')
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def start_monitoring(self):
        """Start process monitoring"""
        if self.is_monitoring:
            self.logger.warning("Process monitoring already active")
            return
        
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        
        self.logger.info("Claude process monitoring started")
    
    def stop_monitoring(self):
        """Stop process monitoring"""
        self.is_monitoring = False
        
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        self.logger.info("Claude process monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.is_monitoring:
            try:
                self._scan_processes()
                self._update_session_states()
                self._cleanup_stale_sessions()
                time.sleep(self.config["scan_interval"])
                
            except Exception as e:
                self.logger.error(f"Monitoring loop error: {e}")
                time.sleep(5)  # Longer sleep on error
    
    def _scan_processes(self):
        """Scan for Claude processes"""
        current_pids = set()
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time', 
                                        'status', 'memory_info', 'cpu_percent',
                                        'cwd', 'username']):
            try:
                info = proc.info
                pid = info['pid']
                
                if self._is_claude_process(proc, info):
                    current_pids.add(pid)
                    
                    if pid not in self.tracked_processes:
                        # New Claude process detected
                        process_info = self._create_process_info(proc, info)
                        self.tracked_processes[pid] = process_info
                        self.process_history.append(process_info)
                        
                        self.logger.info(f"New Claude process detected: PID {pid}")
                        self._handle_process_start(process_info)
                    else:
                        # Update existing process
                        self._update_process_info(pid, proc, info)
                        
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                # Process disappeared or access denied
                continue
        
        # Check for processes that have ended
        ended_pids = set(self.tracked_processes.keys()) - current_pids
        for pid in ended_pids:
            process_info = self.tracked_processes.pop(pid)
            self.logger.info(f"Claude process ended: PID {pid}")
            self._handle_process_end(process_info)
    
    def _is_claude_process(self, proc, info: Dict) -> bool:
        """Check if process is Claude-related"""
        try:
            # Check process name
            name = info.get('name', '').lower()
            cmdline = info.get('cmdline', [])
            
            # Skip excluded processes
            for exclude in self.config['exclude_processes']:
                if exclude.lower() in name:
                    return False
            
            # Check against Claude patterns
            for pattern in self.claude_patterns:
                if pattern.lower() in name:
                    return True
                
                # Check command line arguments
                for arg in cmdline:
                    if pattern.lower() in arg.lower():
                        return True
            
            # Check working directory
            try:
                cwd = info.get('cwd', '')
                if cwd and any(pattern in cwd.lower() for pattern in self.claude_patterns):
                    return True
            except:
                pass
            
            # Memory and CPU heuristics (for processes that might be Claude but not obviously named)
            memory_mb = (info.get('memory_info', {}).get('rss', 0) or 0) / (1024 * 1024)
            cpu_percent = info.get('cpu_percent', 0) or 0
            
            if (memory_mb > self.config['memory_threshold_mb'] and 
                cpu_percent > self.config['cpu_threshold_percent']):
                # Additional checks for potential Claude processes
                if any(keyword in str(cmdline).lower() for keyword in ['ai', 'chat', 'assistant']):
                    return True
            
            return False
            
        except Exception as e:
            self.logger.debug(f"Error checking process {info.get('pid')}: {e}")
            return False
    
    def _create_process_info(self, proc, info: Dict) -> ProcessInfo:
        """Create ProcessInfo from psutil data"""
        memory_mb = 0
        try:
            memory_info = info.get('memory_info')
            if memory_info:
                memory_mb = memory_info.rss / (1024 * 1024)
        except:
            pass
        
        return ProcessInfo(
            pid=info['pid'],
            name=info.get('name', ''),
            cmdline=info.get('cmdline', []),
            create_time=info.get('create_time', time.time()),
            status=info.get('status', 'unknown'),
            memory_mb=memory_mb,
            cpu_percent=info.get('cpu_percent', 0) or 0,
            working_directory=info.get('cwd', ''),
            user=info.get('username', ''),
            detected_at=datetime.now()
        )
    
    def _update_process_info(self, pid: int, proc, info: Dict):
        """Update existing process information"""
        if pid in self.tracked_processes:
            process_info = self.tracked_processes[pid]
            
            # Update dynamic fields
            try:
                memory_info = info.get('memory_info')
                if memory_info:
                    process_info.memory_mb = memory_info.rss / (1024 * 1024)
            except:
                pass
            
            process_info.cpu_percent = info.get('cpu_percent', 0) or 0
            process_info.status = info.get('status', 'unknown')
    
    def _handle_process_start(self, process_info: ProcessInfo):
        """Handle new Claude process detection"""
        # Create session state
        session_id = self._generate_session_id(process_info)
        
        session_state = SessionState(
            session_id=session_id,
            process_info=process_info,
            start_time=datetime.now(),
            last_activity=datetime.now(),
            status='starting'
        )
        
        # Try to detect data directory and project path
        session_state.data_directory = self._detect_data_directory(process_info)
        session_state.project_path = self._detect_project_path(process_info)
        
        self.active_sessions[session_id] = session_state
        
        # Notify callbacks
        self._notify_callbacks('session_start', session_state)
        
        # Queue event
        self.event_queue.put({
            'type': 'session_start',
            'session_id': session_id,
            'timestamp': datetime.now(),
            'process_info': asdict(process_info)
        })
    
    def _handle_process_end(self, process_info: ProcessInfo):
        """Handle Claude process termination"""
        # Find corresponding session
        session_to_end = None
        for session_id, session_state in self.active_sessions.items():
            if session_state.process_info.pid == process_info.pid:
                session_to_end = session_id
                break
        
        if session_to_end:
            session_state = self.active_sessions.pop(session_to_end)
            session_state.status = 'ended'
            
            # Check minimum session duration
            duration = (datetime.now() - session_state.start_time).total_seconds()
            if duration >= self.config['min_session_duration']:
                # Notify callbacks
                self._notify_callbacks('session_end', session_state)
                
                # Queue event
                self.event_queue.put({
                    'type': 'session_end',
                    'session_id': session_to_end,
                    'timestamp': datetime.now(),
                    'duration_seconds': duration
                })
            else:
                self.logger.debug(f"Session {session_to_end} too short, ignoring")
    
    def _update_session_states(self):
        """Update activity status for all sessions"""
        now = datetime.now()
        
        for session_id, session_state in self.active_sessions.items():
            # Check if process is still active
            if session_state.process_info.pid in self.tracked_processes:
                process_info = self.tracked_processes[session_state.process_info.pid]
                
                # Update based on CPU activity
                if process_info.cpu_percent > 1.0:
                    session_state.last_activity = now
                    if session_state.status != 'active':
                        session_state.status = 'active'
                        self._notify_callbacks('session_activity', session_state)
                else:
                    # Check for idle timeout
                    idle_time = (now - session_state.last_activity).total_seconds()
                    if idle_time > self.config['activity_timeout']:
                        if session_state.status != 'idle':
                            session_state.status = 'idle'
                            self.logger.info(f"Session {session_id} marked as idle")
    
    def _cleanup_stale_sessions(self):
        """Clean up sessions for processes that no longer exist"""
        stale_sessions = []
        
        for session_id, session_state in self.active_sessions.items():
            if session_state.process_info.pid not in self.tracked_processes:
                stale_sessions.append(session_id)
        
        for session_id in stale_sessions:
            session_state = self.active_sessions.pop(session_id)
            self.logger.warning(f"Cleaning up stale session: {session_id}")
            
            # Treat as ended session
            self._notify_callbacks('session_end', session_state)
    
    def _generate_session_id(self, process_info: ProcessInfo) -> str:
        """Generate unique session ID"""
        timestamp = int(time.time())
        return f"cc_session_{timestamp}_{process_info.pid}"
    
    def _detect_data_directory(self, process_info: ProcessInfo) -> Optional[str]:
        """Detect Claude data directory"""
        # Check configured data directories
        for data_dir_pattern in self.config['data_directories']:
            data_dir = Path(data_dir_pattern).expanduser()
            if data_dir.exists():
                return str(data_dir)
        
        # Check working directory
        if process_info.working_directory:
            return process_info.working_directory
        
        return None
    
    def _detect_project_path(self, process_info: ProcessInfo) -> Optional[str]:
        """Detect current project path from command line"""
        for arg in process_info.cmdline:
            if os.path.exists(arg) and os.path.isdir(arg):
                return arg
        
        return process_info.working_directory
    
    def _notify_callbacks(self, event_type: str, session_state: SessionState):
        """Notify registered callbacks"""
        for callback in self.session_callbacks.get(event_type, []):
            try:
                callback(session_state)
            except Exception as e:
                self.logger.error(f"Callback error for {event_type}: {e}")
    
    def register_callback(self, event_type: str, callback):
        """Register callback for session events"""
        if event_type in self.session_callbacks:
            self.session_callbacks[event_type].append(callback)
        else:
            self.logger.error(f"Unknown event type: {event_type}")
    
    def get_active_sessions(self) -> Dict[str, SessionState]:
        """Get all active sessions"""
        return self.active_sessions.copy()
    
    def get_session_by_id(self, session_id: str) -> Optional[SessionState]:
        """Get specific session by ID"""
        return self.active_sessions.get(session_id)
    
    def get_process_history(self) -> List[ProcessInfo]:
        """Get process detection history"""
        return self.process_history.copy()
    
    def get_monitoring_stats(self) -> Dict:
        """Get monitoring statistics"""
        return {
            "is_monitoring": self.is_monitoring,
            "tracked_processes": len(self.tracked_processes),
            "active_sessions": len(self.active_sessions),
            "total_processes_seen": len(self.process_history),
            "config": self.config
        }
    
    def force_session_end(self, session_id: str) -> bool:
        """Force end a session"""
        if session_id in self.active_sessions:
            session_state = self.active_sessions.pop(session_id)
            session_state.status = 'force_ended'
            
            self._notify_callbacks('session_end', session_state)
            self.logger.info(f"Force ended session: {session_id}")
            return True
        
        return False

async def main():
    """Test the Claude process monitor"""
    monitor = ClaudeProcessMonitor()
    
    # Register test callbacks
    def on_session_start(session: SessionState):
        print(f"🚀 Session started: {session.session_id}")
        print(f"   Process: {session.process_info.name} (PID: {session.process_info.pid})")
        print(f"   Project: {session.project_path}")
    
    def on_session_end(session: SessionState):
        duration = (datetime.now() - session.start_time).total_seconds()
        print(f"🏁 Session ended: {session.session_id}")
        print(f"   Duration: {duration:.1f} seconds")
    
    def on_session_activity(session: SessionState):
        print(f"📈 Session activity: {session.session_id} -> {session.status}")
    
    monitor.register_callback('session_start', on_session_start)
    monitor.register_callback('session_end', on_session_end)
    monitor.register_callback('session_activity', on_session_activity)
    
    try:
        monitor.start_monitoring()
        
        # Monitor for a while
        await asyncio.sleep(60)
        
        # Print stats
        stats = monitor.get_monitoring_stats()
        print(f"\nMonitoring Stats: {json.dumps(stats, indent=2)}")
        
        # Print active sessions
        active = monitor.get_active_sessions()
        print(f"\nActive Sessions: {len(active)}")
        for session_id, session in active.items():
            print(f"  {session_id}: {session.status}")
        
    finally:
        monitor.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())