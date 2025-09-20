#!/usr/bin/env python3
"""
Claude Code Session Monitor with Enhanced JSONL Parsing
Real-time detection and metrics extraction from Claude Code sessions
"""

import json
import os
import time
import threading
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, List, Tuple
from collections import defaultdict
import hashlib
import requests
import psutil
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class JSONLFileHandler(FileSystemEventHandler):
    """Monitors JSONL files for real-time updates"""
    
    def __init__(self, callback):
        self.callback = callback
        self.file_positions = {}
        
    def on_modified(self, event):
        if event.src_path.endswith('.jsonl'):
            self.process_file_changes(event.src_path)
    
    def on_created(self, event):
        if event.src_path.endswith('.jsonl'):
            self.process_file_changes(event.src_path)
    
    def process_file_changes(self, file_path):
        """Process new lines in JSONL file"""
        try:
            # Get last known position
            last_pos = self.file_positions.get(file_path, 0)
            
            with open(file_path, 'r') as f:
                # Seek to last position
                f.seek(last_pos)
                
                # Read new lines
                new_lines = []
                for line in f:
                    if line.strip():
                        try:
                            data = json.loads(line.strip())
                            new_lines.append(data)
                        except json.JSONDecodeError:
                            continue
                
                # Update position
                self.file_positions[file_path] = f.tell()
                
                # Callback with new data
                if new_lines:
                    self.callback(file_path, new_lines)
                    
        except Exception as e:
            print(f"Error processing {file_path}: {e}")


class ClaudeCodeMetricsExtractor:
    """Extracts detailed metrics from Claude Code JSONL files"""
    
    def __init__(self):
        self.claude_path = Path.home() / ".claude"
        self.projects_path = self.claude_path / "projects"
        self.session_metrics = defaultdict(dict)
        self.current_session = None
        
    def extract_session_id(self, file_path: str) -> str:
        """Extract session ID from file path or content"""
        # Try to extract from path
        path = Path(file_path)
        
        # Check if path contains timestamp or session identifier
        parent_name = path.parent.name
        if parent_name.startswith("session_") or parent_name.isdigit():
            return parent_name
        
        # Generate session ID from file creation time
        stat = path.stat()
        creation_time = int(stat.st_ctime)
        return f"session_{creation_time}"
    
    def parse_claude_code_entry(self, entry: Dict) -> Dict:
        """Parse a single JSONL entry for metrics"""
        metrics = {
            "timestamp": None,
            "tokens": {},
            "cost": 0.0,
            "model": None,
            "turn_type": None,
            "error": None
        }
        
        # Extract timestamp
        if "timestamp" in entry:
            metrics["timestamp"] = entry["timestamp"]
        elif "created_at" in entry:
            metrics["timestamp"] = entry["created_at"]
        
        # Extract token usage
        if "usage" in entry:
            usage = entry["usage"]
            metrics["tokens"] = {
                "input": usage.get("input_tokens", 0),
                "output": usage.get("output_tokens", 0),
                "total": usage.get("total_tokens", 0),
                "cache_read": usage.get("cache_creation_input_tokens", 0),
                "cache_write": usage.get("cache_read_input_tokens", 0)
            }
        
        # Extract cost
        if "cost" in entry:
            metrics["cost"] = float(entry["cost"])
        elif "total_cost_usd" in entry:
            metrics["cost"] = float(entry["total_cost_usd"])
        
        # Extract model information
        if "model" in entry:
            metrics["model"] = entry["model"]
        elif "model_name" in entry:
            metrics["model_name"] = entry["model_name"]
        
        # Extract turn type (user/assistant)
        if "role" in entry:
            metrics["turn_type"] = entry["role"]
        elif "type" in entry:
            metrics["turn_type"] = entry["type"]
        
        # Check for errors
        if "error" in entry:
            metrics["error"] = entry["error"]
        
        return metrics
    
    def aggregate_session_metrics(self, session_id: str, entries: List[Dict]) -> Dict:
        """Aggregate metrics for a session"""
        aggregated = {
            "session_id": session_id,
            "start_time": None,
            "end_time": None,
            "duration_seconds": 0,
            "total_tokens": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_tokens": 0,
            "total_cost": 0.0,
            "turn_count": 0,
            "models_used": set(),
            "error_count": 0,
            "average_response_time": 0,
            "token_velocity": 0  # Tokens per minute
        }
        
        response_times = []
        last_timestamp = None
        
        for entry in entries:
            metrics = self.parse_claude_code_entry(entry)
            
            # Update timestamps
            if metrics["timestamp"]:
                timestamp = datetime.fromisoformat(metrics["timestamp"])
                if not aggregated["start_time"] or timestamp < aggregated["start_time"]:
                    aggregated["start_time"] = timestamp
                if not aggregated["end_time"] or timestamp > aggregated["end_time"]:
                    aggregated["end_time"] = timestamp
                
                # Calculate response time
                if last_timestamp:
                    response_times.append((timestamp - last_timestamp).total_seconds())
                last_timestamp = timestamp
            
            # Aggregate tokens
            if metrics["tokens"]:
                aggregated["total_tokens"] += metrics["tokens"].get("total", 0)
                aggregated["input_tokens"] += metrics["tokens"].get("input", 0)
                aggregated["output_tokens"] += metrics["tokens"].get("output", 0)
                aggregated["cache_tokens"] += metrics["tokens"].get("cache_read", 0)
            
            # Aggregate cost
            aggregated["total_cost"] += metrics["cost"]
            
            # Track models
            if metrics["model"]:
                aggregated["models_used"].add(metrics["model"])
            
            # Count turns
            if metrics["turn_type"] in ["user", "assistant"]:
                aggregated["turn_count"] += 1
            
            # Count errors
            if metrics["error"]:
                aggregated["error_count"] += 1
        
        # Calculate derived metrics
        if aggregated["start_time"] and aggregated["end_time"]:
            duration = (aggregated["end_time"] - aggregated["start_time"]).total_seconds()
            aggregated["duration_seconds"] = duration
            
            if duration > 0:
                aggregated["token_velocity"] = (aggregated["total_tokens"] / duration) * 60
        
        if response_times:
            aggregated["average_response_time"] = sum(response_times) / len(response_times)
        
        # Convert set to list for JSON serialization
        aggregated["models_used"] = list(aggregated["models_used"])
        
        # Convert datetime to ISO format
        if aggregated["start_time"]:
            aggregated["start_time"] = aggregated["start_time"].isoformat()
        if aggregated["end_time"]:
            aggregated["end_time"] = aggregated["end_time"].isoformat()
        
        return aggregated
    
    def scan_all_sessions(self) -> List[Dict]:
        """Scan all JSONL files and extract session metrics"""
        all_sessions = []
        
        if not self.projects_path.exists():
            return all_sessions
        
        # Find all JSONL files
        jsonl_files = list(self.projects_path.glob("**/*.jsonl"))
        
        for jsonl_file in jsonl_files:
            try:
                session_id = self.extract_session_id(str(jsonl_file))
                entries = []
                
                with open(jsonl_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            try:
                                entries.append(json.loads(line.strip()))
                            except json.JSONDecodeError:
                                continue
                
                if entries:
                    session_metrics = self.aggregate_session_metrics(session_id, entries)
                    session_metrics["file_path"] = str(jsonl_file)
                    all_sessions.append(session_metrics)
                    
            except Exception as e:
                print(f"Error processing {jsonl_file}: {e}")
        
        # Sort by start time (most recent first)
        all_sessions.sort(key=lambda x: x.get("start_time", ""), reverse=True)
        
        return all_sessions


class ClaudeCodeProcessMonitor:
    """Monitors Claude Code process and active sessions"""
    
    def __init__(self, dashboard_url: str = "https://claude-code-optimizer-dashboard.vercel.app"):
        self.dashboard_url = dashboard_url
        self.metrics_extractor = ClaudeCodeMetricsExtractor()
        self.file_observer = None
        self.monitoring = False
        self.current_session = None
        self.session_start_time = None
        
    def detect_claude_code_process(self) -> Tuple[bool, Optional[Dict]]:
        """Detect if Claude Code is running and get process info"""
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time', 'memory_info']):
            try:
                info = proc.info
                name = info['name']
                cmdline = info.get('cmdline', [])
                
                # Check for Claude Code patterns
                if any(pattern in name.lower() for pattern in ['claude', 'claude-code', 'claude code']):
                    return True, {
                        "pid": info['pid'],
                        "name": name,
                        "start_time": datetime.fromtimestamp(info['create_time']).isoformat(),
                        "memory_mb": info['memory_info'].rss / 1024 / 1024 if info.get('memory_info') else 0
                    }
                
                # Check command line
                if cmdline:
                    cmdline_str = ' '.join(cmdline).lower()
                    if any(pattern in cmdline_str for pattern in ['claude-code', 'claude code', 'claude.app']):
                        return True, {
                            "pid": info['pid'],
                            "name": name,
                            "start_time": datetime.fromtimestamp(info['create_time']).isoformat(),
                            "memory_mb": info['memory_info'].rss / 1024 / 1024 if info.get('memory_info') else 0
                        }
                        
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return False, None
    
    def setup_file_monitoring(self):
        """Setup real-time JSONL file monitoring"""
        if not self.metrics_extractor.projects_path.exists():
            os.makedirs(self.metrics_extractor.projects_path, exist_ok=True)
        
        self.file_observer = Observer()
        handler = JSONLFileHandler(self.on_jsonl_update)
        self.file_observer.schedule(handler, str(self.metrics_extractor.projects_path), recursive=True)
        self.file_observer.start()
    
    def on_jsonl_update(self, file_path: str, new_entries: List[Dict]):
        """Handle real-time JSONL updates"""
        session_id = self.metrics_extractor.extract_session_id(file_path)
        
        # Aggregate metrics for the new entries
        metrics = self.metrics_extractor.aggregate_session_metrics(session_id, new_entries)
        
        # Send update to dashboard
        self.send_metrics_update(metrics)
    
    def send_metrics_update(self, metrics: Dict):
        """Send metrics update to dashboard"""
        try:
            # Send to dashboard API
            response = requests.post(
                f"{self.dashboard_url}/api/claude-code/live-status",
                json={
                    "type": "metrics_update",
                    "session_id": metrics["session_id"],
                    "metrics": metrics,
                    "timestamp": datetime.now().isoformat()
                },
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"Metrics updated for session {metrics['session_id']}")
            else:
                print(f"Failed to update metrics: {response.status_code}")
                
        except Exception as e:
            print(f"Error sending metrics: {e}")
    
    def monitor_loop(self):
        """Main monitoring loop"""
        self.monitoring = True
        last_process_state = False
        check_interval = 5  # seconds
        
        # Setup file monitoring
        self.setup_file_monitoring()
        
        print("Claude Code session monitoring started")
        
        while self.monitoring:
            try:
                # Check process status
                is_running, process_info = self.detect_claude_code_process()
                
                # State change detection
                if is_running != last_process_state:
                    if is_running:
                        # Session started
                        self.session_start_time = datetime.now()
                        self.current_session = f"session_{int(time.time())}"
                        
                        self.send_session_event("session_started", {
                            "session_id": self.current_session,
                            "process_info": process_info,
                            "start_time": self.session_start_time.isoformat()
                        })
                        
                        print(f"Claude Code session started: {self.current_session}")
                        
                    else:
                        # Session ended
                        if self.current_session:
                            duration = (datetime.now() - self.session_start_time).total_seconds()
                            
                            # Get final metrics
                            all_sessions = self.metrics_extractor.scan_all_sessions()
                            session_metrics = None
                            
                            # Find metrics for current session
                            for session in all_sessions:
                                if abs(datetime.fromisoformat(session["start_time"]).timestamp() - 
                                      self.session_start_time.timestamp()) < 60:  # Within 1 minute
                                    session_metrics = session
                                    break
                            
                            self.send_session_event("session_ended", {
                                "session_id": self.current_session,
                                "duration_seconds": duration,
                                "metrics": session_metrics,
                                "end_time": datetime.now().isoformat()
                            })
                            
                            print(f"Claude Code session ended: {self.current_session}")
                            
                            self.current_session = None
                            self.session_start_time = None
                
                last_process_state = is_running
                
                # Send periodic updates if session is active
                if is_running and self.current_session:
                    # Get current metrics
                    all_sessions = self.metrics_extractor.scan_all_sessions()
                    
                    if all_sessions:
                        latest_session = all_sessions[0]
                        self.send_metrics_update(latest_session)
                
                time.sleep(check_interval)
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Monitoring error: {e}")
                time.sleep(check_interval)
        
        # Cleanup
        if self.file_observer:
            self.file_observer.stop()
            self.file_observer.join()
    
    def send_session_event(self, event_type: str, data: Dict):
        """Send session event to dashboard"""
        try:
            response = requests.post(
                f"{self.dashboard_url}/api/claude-code/session-event",
                json={
                    "type": event_type,
                    "data": data,
                    "timestamp": datetime.now().isoformat()
                },
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"Session event sent: {event_type}")
            else:
                print(f"Failed to send event: {response.status_code}")
                
        except Exception as e:
            print(f"Error sending event: {e}")
    
    def start(self):
        """Start monitoring in a separate thread"""
        monitor_thread = threading.Thread(target=self.monitor_loop)
        monitor_thread.daemon = True
        monitor_thread.start()
        return monitor_thread
    
    def stop(self):
        """Stop monitoring"""
        self.monitoring = False
        if self.file_observer:
            self.file_observer.stop()


def main():
    """Main entry point for standalone execution"""
    monitor = ClaudeCodeProcessMonitor()
    
    try:
        # Start monitoring
        monitor.monitor_loop()
    except KeyboardInterrupt:
        print("\nMonitoring stopped by user")
        monitor.stop()
    except Exception as e:
        print(f"Fatal error: {e}")
        monitor.stop()


if __name__ == "__main__":
    # Install required packages if needed
    try:
        import watchdog
    except ImportError:
        print("Installing required packages...")
        subprocess.run(["pip3", "install", "watchdog", "psutil", "requests"], check=True)
        print("Packages installed. Please run the script again.")
        exit(0)
    
    main()