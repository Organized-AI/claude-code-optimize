"""
Recovery Manager - Handles system recovery procedures
"""
import logging
from typing import Dict, Callable, Any


class RecoveryManager:
    """Manages system recovery procedures"""
    
    def __init__(self):
        self.recovery_procedures = {}
        self.logger = logging.getLogger(__name__)
    
    def register_recovery(self, error_type: str, recovery_func: Callable):
        """Register a recovery procedure for a specific error type"""
        self.recovery_procedures[error_type] = recovery_func
        self.logger.info(f"Registered recovery procedure for {error_type}")
    
    def attempt_recovery(self, error_type: str, context: Dict[str, Any] = None) -> bool:
        """Attempt to recover from a specific error"""
        if error_type in self.recovery_procedures:
            try:
                recovery_func = self.recovery_procedures[error_type]
                result = recovery_func(context or {})
                self.logger.info(f"Recovery successful for {error_type}")
                return result if isinstance(result, bool) else True
            except Exception as e:
                self.logger.error(f"Recovery failed for {error_type}: {str(e)}")
                return False
        else:
            self.logger.warning(f"No recovery procedure found for {error_type}")
            return False
    
    def get_available_recoveries(self) -> list:
        """Get list of available recovery procedures"""
        return list(self.recovery_procedures.keys())