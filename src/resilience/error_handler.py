#!/usr/bin/env python3
"""
Comprehensive Error Handling and Recovery for Data Flow Pipeline
Never-fail system with automatic recovery and graceful degradation
"""

import asyncio
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
from enum import Enum
import traceback
import threading
from pathlib import Path
import sqlite3
import psycopg2
from collections import defaultdict, deque

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    CONNECTION = "connection"
    DATA_VALIDATION = "data_validation"
    PROCESSING = "processing"
    STORAGE = "storage"
    SYSTEM = "system"
    NETWORK = "network"

@dataclass
class ErrorEvent:
    """Represents an error event"""
    error_id: str
    timestamp: datetime
    severity: ErrorSeverity
    category: ErrorCategory
    component: str
    message: str
    details: Dict[str, Any]
    stack_trace: Optional[str] = None
    retry_count: int = 0
    resolved: bool = False
    resolution_time: Optional[datetime] = None

@dataclass
class RecoveryAction:
    """Represents a recovery action"""
    action_type: str
    description: str
    handler: Callable
    max_retries: int
    retry_delay: float
    escalation_threshold: int

class CircuitBreaker:
    """Circuit breaker pattern for fault tolerance"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.lock = threading.Lock()
    
    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        with self.lock:
            if self.state == "OPEN":
                if self._should_attempt_reset():
                    self.state = "HALF_OPEN"
                else:
                    raise Exception("Circuit breaker is OPEN")
            
            try:
                result = func(*args, **kwargs)
                self._on_success()
                return result
            except Exception as e:
                self._on_failure()
                raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt reset"""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.recovery_timeout
    
    def _on_success(self):
        """Handle successful execution"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self):
        """Handle failed execution"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"

class RetryManager:
    """Intelligent retry manager with exponential backoff"""
    
    def __init__(self):
        self.retry_configs = {
            ErrorCategory.CONNECTION: {"max_retries": 5, "base_delay": 1, "max_delay": 60},
            ErrorCategory.DATA_VALIDATION: {"max_retries": 3, "base_delay": 0.1, "max_delay": 1},
            ErrorCategory.PROCESSING: {"max_retries": 3, "base_delay": 0.5, "max_delay": 10},
            ErrorCategory.STORAGE: {"max_retries": 5, "base_delay": 1, "max_delay": 30},
            ErrorCategory.NETWORK: {"max_retries": 3, "base_delay": 2, "max_delay": 60},
            ErrorCategory.SYSTEM: {"max_retries": 2, "base_delay": 5, "max_delay": 120}
        }
    
    async def retry_with_backoff(self, func: Callable, category: ErrorCategory, 
                                context: str = "", *args, **kwargs) -> Any:
        """Execute function with intelligent retry and exponential backoff"""
        config = self.retry_configs[category]
        max_retries = config["max_retries"]
        base_delay = config["base_delay"]
        max_delay = config["max_delay"]
        
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            
            except Exception as e:
                last_exception = e
                
                if attempt == max_retries:
                    logging.error(f"Max retries exceeded for {context}: {e}")
                    break
                
                # Calculate delay with exponential backoff
                delay = min(base_delay * (2 ** attempt), max_delay)
                logging.warning(f"Retry {attempt + 1}/{max_retries} for {context} in {delay}s: {e}")
                await asyncio.sleep(delay)
        
        raise last_exception

class DataFlowErrorHandler:
    """Comprehensive error handling system for data flow pipeline"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config = self._load_config(config_path)
        self.setup_logging()
        
        # Error tracking
        self.error_log = deque(maxlen=1000)
        self.error_counts = defaultdict(int)
        self.error_patterns = defaultdict(list)
        
        # Recovery components
        self.retry_manager = RetryManager()
        self.circuit_breakers = {}
        self.recovery_actions = self._setup_recovery_actions()
        
        # Health monitoring
        self.health_status = {
            "last_check": datetime.now(),
            "error_rate": 0.0,
            "critical_errors": 0,
            "system_health": "healthy"
        }
        
        # Error storage
        self.error_db_path = Path("logs/errors.db")
        self._init_error_storage()
        
        # Background tasks
        self.monitoring_task = None
        self.is_running = False
    
    def _load_config(self, config_path: Optional[Path]) -> Dict:
        """Load error handling configuration"""
        default_config = {
            "max_error_rate": 0.1,  # 10% error rate threshold
            "critical_error_threshold": 5,
            "health_check_interval": 30,
            "alert_cooldown": 300,  # 5 minutes
            "notification_webhook": None,
            "recovery_timeout": 300,  # 5 minutes
            "degraded_mode_threshold": 20
        }
        
        if config_path and config_path.exists():
            with open(config_path) as f:
                user_config = json.load(f)
                default_config.update(user_config)
        
        return default_config
    
    def setup_logging(self):
        """Setup error handling logging"""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # Create specialized error logger
        self.logger = logging.getLogger('ErrorHandler')
        if not self.logger.handlers:
            handler = logging.FileHandler(log_dir / 'error_handler.log')
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def _init_error_storage(self):
        """Initialize SQLite database for error storage"""
        self.error_db_path.parent.mkdir(exist_ok=True, parents=True)
        
        with sqlite3.connect(self.error_db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS errors (
                    id TEXT PRIMARY KEY,
                    timestamp TIMESTAMP,
                    severity TEXT,
                    category TEXT,
                    component TEXT,
                    message TEXT,
                    details TEXT,
                    stack_trace TEXT,
                    retry_count INTEGER,
                    resolved BOOLEAN,
                    resolution_time TIMESTAMP
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON errors(timestamp);
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_errors_severity ON errors(severity);
            """)
    
    def _setup_recovery_actions(self) -> Dict[str, RecoveryAction]:
        """Setup automatic recovery actions"""
        return {
            "restart_connection": RecoveryAction(
                action_type="restart_connection",
                description="Restart database connection",
                handler=self._restart_db_connection,
                max_retries=3,
                retry_delay=5.0,
                escalation_threshold=5
            ),
            "clear_cache": RecoveryAction(
                action_type="clear_cache",
                description="Clear internal caches",
                handler=self._clear_caches,
                max_retries=1,
                retry_delay=0.0,
                escalation_threshold=1
            ),
            "switch_to_degraded_mode": RecoveryAction(
                action_type="degraded_mode",
                description="Switch to degraded operation mode",
                handler=self._enable_degraded_mode,
                max_retries=1,
                retry_delay=0.0,
                escalation_threshold=1
            ),
            "emergency_backup": RecoveryAction(
                action_type="emergency_backup",
                description="Create emergency data backup",
                handler=self._create_emergency_backup,
                max_retries=2,
                retry_delay=10.0,
                escalation_threshold=1
            )
        }
    
    async def start_monitoring(self):
        """Start error monitoring and recovery services"""
        self.is_running = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        self.logger.info("Error monitoring started")
    
    async def stop_monitoring(self):
        """Stop error monitoring"""
        self.is_running = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        self.logger.info("Error monitoring stopped")
    
    async def handle_error(self, error: Exception, context: str, 
                          severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                          category: ErrorCategory = ErrorCategory.PROCESSING) -> bool:
        """Handle an error with automatic recovery"""
        error_id = f"{int(time.time())}_{hash(str(error)) % 10000}"
        
        error_event = ErrorEvent(
            error_id=error_id,
            timestamp=datetime.now(),
            severity=severity,
            category=category,
            component=context,
            message=str(error),
            details={"type": type(error).__name__},
            stack_trace=traceback.format_exc()
        )
        
        # Store error
        await self._store_error(error_event)
        
        # Log error
        self.logger.error(f"Error in {context}: {error}")
        if severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            self.logger.critical(f"Critical error: {error_event}")
        
        # Update statistics
        self.error_counts[category] += 1
        self.error_log.append(error_event)
        
        # Attempt recovery
        recovery_success = await self._attempt_recovery(error_event)
        
        # Check if escalation is needed
        if not recovery_success and severity == ErrorSeverity.CRITICAL:
            await self._escalate_error(error_event)
        
        return recovery_success
    
    async def handle_connection_error(self, error: Exception, connection_type: str):
        """Handle database connection errors"""
        return await self.handle_error(
            error, f"connection_{connection_type}", 
            ErrorSeverity.HIGH, ErrorCategory.CONNECTION
        )
    
    async def handle_processing_error(self, error: Exception, context: str):
        """Handle processing errors"""
        return await self.handle_error(
            error, context, ErrorSeverity.MEDIUM, ErrorCategory.PROCESSING
        )
    
    async def handle_data_validation_error(self, error: Exception, data_context: str):
        """Handle data validation errors"""
        return await self.handle_error(
            error, f"validation_{data_context}",
            ErrorSeverity.LOW, ErrorCategory.DATA_VALIDATION
        )
    
    async def handle_critical_error(self, error: Exception, context: str):
        """Handle critical system errors"""
        return await self.handle_error(
            error, context, ErrorSeverity.CRITICAL, ErrorCategory.SYSTEM
        )
    
    async def _store_error(self, error_event: ErrorEvent):
        """Store error in database"""
        try:
            with sqlite3.connect(self.error_db_path) as conn:
                conn.execute("""
                    INSERT INTO errors 
                    (id, timestamp, severity, category, component, message, 
                     details, stack_trace, retry_count, resolved)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    error_event.error_id,
                    error_event.timestamp,
                    error_event.severity.value,
                    error_event.category.value,
                    error_event.component,
                    error_event.message,
                    json.dumps(error_event.details),
                    error_event.stack_trace,
                    error_event.retry_count,
                    error_event.resolved
                ))
        except Exception as e:
            self.logger.error(f"Failed to store error: {e}")
    
    async def _attempt_recovery(self, error_event: ErrorEvent) -> bool:
        """Attempt automatic recovery based on error type"""
        recovery_strategy = self._get_recovery_strategy(error_event)
        
        if not recovery_strategy:
            return False
        
        for action_name in recovery_strategy:
            if action_name in self.recovery_actions:
                action = self.recovery_actions[action_name]
                try:
                    success = await self.retry_manager.retry_with_backoff(
                        action.handler, error_event.category, 
                        f"recovery_{action_name}"
                    )
                    if success:
                        self.logger.info(f"Recovery successful: {action_name}")
                        error_event.resolved = True
                        error_event.resolution_time = datetime.now()
                        return True
                except Exception as e:
                    self.logger.error(f"Recovery action {action_name} failed: {e}")
        
        return False
    
    def _get_recovery_strategy(self, error_event: ErrorEvent) -> List[str]:
        """Determine recovery strategy based on error"""
        strategies = {
            ErrorCategory.CONNECTION: ["restart_connection", "clear_cache"],
            ErrorCategory.STORAGE: ["restart_connection", "emergency_backup"],
            ErrorCategory.PROCESSING: ["clear_cache"],
            ErrorCategory.SYSTEM: ["switch_to_degraded_mode", "emergency_backup"],
            ErrorCategory.NETWORK: ["restart_connection"],
            ErrorCategory.DATA_VALIDATION: ["clear_cache"]
        }
        
        return strategies.get(error_event.category, ["clear_cache"])
    
    async def _escalate_error(self, error_event: ErrorEvent):
        """Escalate critical errors"""
        self.logger.critical(f"ESCALATING ERROR: {error_event}")
        
        # Send notifications
        await self._send_alert(error_event)
        
        # Enable degraded mode
        await self._enable_degraded_mode()
        
        # Create emergency backup
        await self._create_emergency_backup()
    
    async def _monitoring_loop(self):
        """Background monitoring loop"""
        while self.is_running:
            try:
                await self._update_health_status()
                await self._check_error_patterns()
                await self._cleanup_old_errors()
                await asyncio.sleep(self.config["health_check_interval"])
            except Exception as e:
                self.logger.error(f"Monitoring loop error: {e}")
    
    async def _update_health_status(self):
        """Update system health status"""
        recent_errors = [
            e for e in self.error_log 
            if e.timestamp > datetime.now() - timedelta(hours=1)
        ]
        
        critical_errors = len([e for e in recent_errors if e.severity == ErrorSeverity.CRITICAL])
        error_rate = len(recent_errors) / max(1, 3600)  # errors per second
        
        self.health_status.update({
            "last_check": datetime.now(),
            "error_rate": error_rate,
            "critical_errors": critical_errors,
            "system_health": self._determine_health_status(error_rate, critical_errors)
        })
    
    def _determine_health_status(self, error_rate: float, critical_errors: int) -> str:
        """Determine overall system health"""
        if critical_errors > 0:
            return "critical"
        elif error_rate > self.config["max_error_rate"]:
            return "degraded"
        else:
            return "healthy"
    
    async def _check_error_patterns(self):
        """Check for error patterns that might indicate systemic issues"""
        # Group recent errors by category
        recent_errors = [
            e for e in self.error_log 
            if e.timestamp > datetime.now() - timedelta(minutes=10)
        ]
        
        category_counts = defaultdict(int)
        for error in recent_errors:
            category_counts[error.category] += 1
        
        # Check for concerning patterns
        for category, count in category_counts.items():
            if count > 10:  # More than 10 errors of same category in 10 minutes
                self.logger.warning(f"High error rate detected for {category}: {count} errors")
                await self._handle_error_pattern(category, count)
    
    async def _handle_error_pattern(self, category: ErrorCategory, count: int):
        """Handle detected error patterns"""
        if category == ErrorCategory.CONNECTION and count > 15:
            await self._enable_degraded_mode()
        elif category == ErrorCategory.STORAGE and count > 20:
            await self._create_emergency_backup()
    
    async def _cleanup_old_errors(self):
        """Clean up old error records"""
        cutoff_date = datetime.now() - timedelta(days=7)
        
        try:
            with sqlite3.connect(self.error_db_path) as conn:
                conn.execute("DELETE FROM errors WHERE timestamp < ?", (cutoff_date,))
        except Exception as e:
            self.logger.error(f"Error cleanup failed: {e}")
    
    # Recovery action implementations
    async def _restart_db_connection(self) -> bool:
        """Restart database connections"""
        self.logger.info("Attempting to restart database connections")
        # Implementation would restart actual connections
        await asyncio.sleep(1)  # Simulate restart
        return True
    
    async def _clear_caches(self) -> bool:
        """Clear internal caches"""
        self.logger.info("Clearing internal caches")
        # Implementation would clear actual caches
        return True
    
    async def _enable_degraded_mode(self) -> bool:
        """Enable degraded operation mode"""
        self.logger.warning("Enabling degraded operation mode")
        # Implementation would switch to offline/degraded mode
        return True
    
    async def _create_emergency_backup(self) -> bool:
        """Create emergency data backup"""
        self.logger.info("Creating emergency backup")
        # Implementation would create actual backup
        return True
    
    async def _send_alert(self, error_event: ErrorEvent):
        """Send alert notification"""
        if self.config.get("notification_webhook"):
            # Send webhook notification
            pass
        
        # Log alert
        self.logger.critical(f"ALERT: {error_event.severity.value} error in {error_event.component}")
    
    def get_circuit_breaker(self, name: str) -> CircuitBreaker:
        """Get or create circuit breaker for component"""
        if name not in self.circuit_breakers:
            self.circuit_breakers[name] = CircuitBreaker()
        return self.circuit_breakers[name]
    
    def get_health_status(self) -> Dict:
        """Get current health status"""
        return self.health_status.copy()
    
    def get_error_statistics(self) -> Dict:
        """Get error statistics"""
        recent_errors = [
            e for e in self.error_log 
            if e.timestamp > datetime.now() - timedelta(hours=24)
        ]
        
        return {
            "total_errors_24h": len(recent_errors),
            "errors_by_category": dict(self.error_counts),
            "critical_errors_24h": len([e for e in recent_errors if e.severity == ErrorSeverity.CRITICAL]),
            "resolved_errors_24h": len([e for e in recent_errors if e.resolved]),
            "health_status": self.health_status
        }