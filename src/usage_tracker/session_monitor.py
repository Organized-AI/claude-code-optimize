#!/usr/bin/env python3
"""
Claude Code Session Activity Monitor
This is the EXACT file that detects when Claude Code sessions are active
"""

import subprocess
import json
import os
import signal
import threading
import time
from datetime import datetime
from typing import Dict, Optional, Callable
from pathlib import Path

class ClaudeCodeSessionMonitor:
    """Monitor Claude Code sessions and trigger dashboard updates"""
    
    def __init__(self, 
                 dashboard_callback: Optional[Callable] = None,
                 state_file: str = "dashboard_state/current_session.json"):
        self.dashboard_callback = dashboard_callback
        self.state_file = state_file
        self.session_active = False
        self.current_session_data = {}
        self.monitoring = False
        
        # Ensure state directory exists
        os.makedirs(os.path.dirname(state_file), exist_ok=True)
    
    def wrap_claude_code_command(self, args: list) -> int:
        """Wrap any claude-code command with session monitoring"""
        
        session_id = f"session_{int(time.time())}"
        
        print(f"🚀 Monitoring Claude Code session: {session_id}")
        
        # Update dashboard - SESSION STARTED
        self._update_session_status("ACTIVE", {
            "session_id": session_id,
            "start_time": datetime.now().isoformat(),
            "command": " ".join(args)
        })
        
        try:
            # Execute Claude Code with JSON logging
            cmd = ["claude-code"] + args + ["--json-log"]
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            # Monitor output in separate thread
            monitor_thread = threading.Thread(
                target=self._monitor_session_output,
                args=(process, session_id)
            )
            monitor_thread.daemon = True
            monitor_thread.start()
            
            # Wait for completion
            return_code = process.wait()
            monitor_thread.join(timeout=5)
            
            return return_code
            
        except KeyboardInterrupt:
            print("\n⚠️ Session interrupted by user")
            self._update_session_status("INTERRUPTED", {"reason": "User interrupt"})
            return 1
            
        except Exception as e:
            print(f"❌ Session monitoring error: {e}")
            self._update_session_status("ERROR", {"error": str(e)})
            return 1
            
        finally:
            # Always clean up
            self._update_session_status("INACTIVE", {})
    
    def _monitor_session_output(self, process: subprocess.Popen, session_id: str):
        """THIS IS THE KEY METHOD - monitors Claude Code output for activity"""
        
        session_metrics = {
            "total_cost_usd": 0.0,
            "duration_ms": 0,
            "num_turns": 0
        }
        
        try:
            while True:
                line = process.stdout.readline()
                if not line:
                    break
                
                # Display output to user
                print(line.rstrip())
                
                # Parse JSON usage data from Claude Code
                try:
                    if line.strip().startswith('{'):
                        data = json.loads(line.strip())
                        
                        # Extract session metrics - THIS TRIGGERS DASHBOARD UPDATES
                        updated = False
                        
                        if "total_cost_usd" in data:
                            session_metrics["total_cost_usd"] = data["total_cost_usd"]
                            updated = True
                            
                        if "duration_ms" in data:
                            session_metrics["duration_ms"] = data["duration_ms"]
                            updated = True
                            
                        if "num_turns" in data:
                            session_metrics["num_turns"] = data["num_turns"]
                            updated = True
                        
                        # Update dashboard with real-time metrics
                        if updated:
                            self._update_session_metrics(session_id, session_metrics)
                            
                except json.JSONDecodeError:
                    # Not JSON, continue monitoring
                    continue
                    
        except Exception as e:
            print(f"⚠️ Output monitoring error: {e}")
        
        # Session completed
        self._update_session_status("COMPLETED", session_metrics)
    
    def _update_session_status(self, status: str, data: Dict):
        """Update session status - THIS TRIGGERS DASHBOARD UPDATE"""
        
        self.session_active = (status == "ACTIVE")
        
        session_state = {
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        
        self.current_session_data = session_state
        
        # Write to state file for dashboard polling
        try:
            with open(self.state_file, 'w') as f:
                json.dump(session_state, f, indent=2)
        except Exception as e:
            print(f"⚠️ State file write error: {e}")
        
        # Trigger dashboard callback if provided
        if self.dashboard_callback:
            try:
                self.dashboard_callback(session_state)
            except Exception as e:
                print(f"⚠️ Dashboard callback error: {e}")
        
        # Print status update
        if status == "ACTIVE":
            print("✅ Dashboard updated: LIVE SESSION ACTIVE")
        elif status == "COMPLETED":
            print("✅ Dashboard updated: Session completed")
        elif status == "INACTIVE":
            print("✅ Dashboard updated: No active session")
    
    def _update_session_metrics(self, session_id: str, metrics: Dict):
        """Update real-time session metrics"""
        
        # Update current session data with latest metrics
        self.current_session_data["data"].update(metrics)
        
        # Write updated state
        try:
            with open(self.state_file, 'w') as f:
                json.dump(self.current_session_data, f, indent=2)
        except Exception as e:
            print(f"⚠️ Metrics update error: {e}")
    
    def get_current_status(self) -> Dict:
        """Get current session status for dashboard"""
        return self.current_session_data.copy()
    
    def is_session_active(self) -> bool:
        """Check if a session is currently active"""
        return self.session_active


# CLI wrapper function for easy integration
def run_claude_code_with_monitoring(*args) -> int:
    """Run claude-code command with session monitoring"""
    
    monitor = ClaudeCodeSessionMonitor()
    return monitor.wrap_claude_code_command(list(args))


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python session_monitor.py <claude-code-args>")
        print("Example: python session_monitor.py --help")
        sys.exit(1)
    
    # Run Claude Code with monitoring
    exit_code = run_claude_code_with_monitoring(*sys.argv[1:])
    sys.exit(exit_code)
