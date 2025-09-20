"""
Resource Manager - Manages system resources and limits
"""
import psutil
import threading
from typing import Dict, Any


class ResourceManager:
    """Manages system resources and enforces limits"""
    
    def __init__(self):
        self.resource_limits = {
            'cpu_percent': 80.0,
            'memory_percent': 85.0,
            'disk_percent': 90.0
        }
        self.monitoring = False
        self.monitor_thread = None
    
    def set_limits(self, **limits):
        """Set resource limits"""
        self.resource_limits.update(limits)
    
    def get_current_usage(self) -> Dict[str, Any]:
        """Get current system resource usage"""
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_percent': psutil.disk_usage('/').percent,
            'active_processes': len(psutil.pids())
        }
    
    def check_limits(self) -> Dict[str, bool]:
        """Check if current usage exceeds limits"""
        usage = self.get_current_usage()
        violations = {}
        
        for resource, limit in self.resource_limits.items():
            if resource in usage:
                violations[resource] = usage[resource] > limit
        
        return violations
    
    def start_monitoring(self, interval: int = 60):
        """Start resource monitoring"""
        if not self.monitoring:
            self.monitoring = True
            self.monitor_thread = threading.Thread(
                target=self._monitor_loop, 
                args=(interval,)
            )
            self.monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop resource monitoring"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join()
    
    def _monitor_loop(self, interval: int):
        """Resource monitoring loop"""
        import time
        while self.monitoring:
            violations = self.check_limits()
            if any(violations.values()):
                print(f"Resource limit violations: {violations}")
            time.sleep(interval)