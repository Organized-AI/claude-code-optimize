"""
Retry Manager - Handles retry logic for failed operations
"""
import time
from typing import Callable, Any, Optional


class RetryManager:
    """Manages retry logic for operations that may fail"""
    
    def __init__(self, max_retries: int = 3, delay: float = 1.0):
        self.max_retries = max_retries
        self.delay = delay
    
    def retry(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with retry logic"""
        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(self.delay * (attempt + 1))
        return None
    
    def configure(self, max_retries: Optional[int] = None, delay: Optional[float] = None):
        """Update retry configuration"""
        if max_retries is not None:
            self.max_retries = max_retries
        if delay is not None:
            self.delay = delay