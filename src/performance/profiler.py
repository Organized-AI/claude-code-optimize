"""
Performance Profiler - Measures and analyzes performance metrics
"""
import time
import functools
from typing import Dict, Any, Callable


class Profiler:
    """Performance profiling and measurement tools"""
    
    def __init__(self):
        self.metrics = {}
        self.active_timers = {}
    
    def time_function(self, func: Callable) -> Callable:
        """Decorator to time function execution"""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                end_time = time.time()
                execution_time = end_time - start_time
                self.record_metric(f"{func.__name__}_execution_time", execution_time)
        return wrapper
    
    def start_timer(self, name: str):
        """Start a named timer"""
        self.active_timers[name] = time.time()
    
    def stop_timer(self, name: str) -> float:
        """Stop a named timer and return elapsed time"""
        if name in self.active_timers:
            elapsed = time.time() - self.active_timers[name]
            del self.active_timers[name]
            self.record_metric(name, elapsed)
            return elapsed
        return 0.0
    
    def record_metric(self, name: str, value: float):
        """Record a performance metric"""
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append({
            'value': value,
            'timestamp': time.time()
        })
    
    def get_metrics(self, name: str = None) -> Dict[str, Any]:
        """Get recorded metrics"""
        if name:
            return self.metrics.get(name, [])
        return self.metrics
    
    def get_statistics(self, name: str) -> Dict[str, float]:
        """Get statistics for a metric"""
        if name not in self.metrics or not self.metrics[name]:
            return {}
        
        values = [m['value'] for m in self.metrics[name]]
        return {
            'count': len(values),
            'min': min(values),
            'max': max(values),
            'avg': sum(values) / len(values),
            'total': sum(values)
        }
    
    def clear_metrics(self, name: str = None):
        """Clear metrics"""
        if name:
            self.metrics.pop(name, None)
        else:
            self.metrics.clear()