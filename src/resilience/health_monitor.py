"""
Health Monitor - Basic system health monitoring
"""
import time
from typing import Dict, Any


class HealthMonitor:
    """Basic health monitoring for system components"""
    
    def __init__(self):
        self.status = "healthy"
        self.last_check = time.time()
        self.checks = {}
    
    def check_health(self) -> Dict[str, Any]:
        """Perform basic health check"""
        self.last_check = time.time()
        return {
            "status": self.status,
            "timestamp": self.last_check,
            "checks": self.checks
        }
    
    def add_check(self, name: str, check_func: callable):
        """Add a health check function"""
        self.checks[name] = check_func
    
    def run_checks(self) -> Dict[str, Any]:
        """Run all registered health checks"""
        results = {}
        for name, check_func in self.checks.items():
            try:
                results[name] = check_func()
            except Exception as e:
                results[name] = f"Error: {str(e)}"
        return results
    
    def get_status(self) -> str:
        """Get current health status"""
        return self.status