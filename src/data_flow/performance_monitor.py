#!/usr/bin/env python3
"""
Pipeline Health Monitoring and Performance Analytics
Real-time monitoring with alerting and performance optimization
"""

import asyncio
import logging
import json
import time
import psutil
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from pathlib import Path
import sqlite3
from collections import deque, defaultdict
from statistics import mean, median
import aiofiles

@dataclass
class PerformanceMetric:
    """Individual performance metric"""
    name: str
    value: float
    unit: str
    timestamp: datetime
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None
    category: str = "general"

@dataclass
class SystemResource:
    """System resource usage snapshot"""
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    disk_io_read_mb: float
    disk_io_write_mb: float
    network_bytes_sent: float
    network_bytes_recv: float
    open_files: int
    active_connections: int
    timestamp: datetime

@dataclass
class PipelineHealth:
    """Overall pipeline health status"""
    status: str  # "healthy", "warning", "critical", "down"
    score: float  # 0-100
    last_check: datetime
    active_issues: List[str]
    performance_summary: Dict[str, float]
    uptime_seconds: float

class PerformanceAlert:
    """Performance alert definition"""
    
    def __init__(self, name: str, condition: Callable[[Dict], bool], 
                 severity: str, message: str, cooldown: int = 300):
        self.name = name
        self.condition = condition
        self.severity = severity
        self.message = message
        self.cooldown = cooldown
        self.last_triggered = None
    
    def should_trigger(self, metrics: Dict) -> bool:
        """Check if alert should trigger"""
        now = datetime.now()
        
        # Check cooldown
        if (self.last_triggered and 
            (now - self.last_triggered).total_seconds() < self.cooldown):
            return False
        
        # Check condition
        if self.condition(metrics):
            self.last_triggered = now
            return True
        
        return False

class DataFlowPerformanceMonitor:
    """Comprehensive performance monitoring for data flow pipeline"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config = self._load_config(config_path)
        self.setup_logging()
        
        # Performance tracking
        self.metrics_history = deque(maxlen=1000)
        self.resource_history = deque(maxlen=500)
        self.recent_metrics = {}
        
        # System monitoring
        self.start_time = datetime.now()
        self.last_io_counters = None
        self.last_network_counters = None
        
        # Performance thresholds
        self.thresholds = self._setup_thresholds()
        
        # Alerts
        self.alerts = self._setup_alerts()
        self.triggered_alerts = deque(maxlen=100)
        
        # Monitoring tasks
        self.monitoring_tasks = []
        self.is_monitoring = False
        
        # Database for storing metrics
        self.metrics_db_path = Path("logs/performance_metrics.db")
        self._init_metrics_db()
        
        # Performance optimization suggestions
        self.optimization_suggestions = []
    
    def _load_config(self, config_path: Optional[Path]) -> Dict:
        """Load performance monitoring configuration"""
        default_config = {
            "monitoring_interval": 10,  # seconds
            "resource_check_interval": 30,  # seconds
            "alert_check_interval": 60,  # seconds
            "metrics_retention_hours": 168,  # 7 days
            "performance_log_level": "INFO",
            "enable_system_monitoring": True,
            "enable_pipeline_monitoring": True,
            "enable_database_monitoring": True,
            "alert_webhook_url": None,
            "dashboard_update_interval": 5
        }
        
        if config_path and config_path.exists():
            with open(config_path) as f:
                user_config = json.load(f)
                default_config.update(user_config)
        
        return default_config
    
    def setup_logging(self):
        """Setup performance monitoring logging"""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        self.logger = logging.getLogger('PerformanceMonitor')
        if not self.logger.handlers:
            handler = logging.FileHandler(log_dir / 'performance.log')
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(getattr(logging, self.config['performance_log_level']))
    
    def _init_metrics_db(self):
        """Initialize SQLite database for metrics storage"""
        self.metrics_db_path.parent.mkdir(exist_ok=True, parents=True)
        
        with sqlite3.connect(self.metrics_db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP,
                    name TEXT,
                    value REAL,
                    unit TEXT,
                    category TEXT,
                    threshold_warning REAL,
                    threshold_critical REAL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS system_resources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP,
                    cpu_percent REAL,
                    memory_percent REAL,
                    memory_used_mb REAL,
                    disk_io_read_mb REAL,
                    disk_io_write_mb REAL,
                    network_bytes_sent REAL,
                    network_bytes_recv REAL,
                    open_files INTEGER,
                    active_connections INTEGER
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pipeline_health (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP,
                    status TEXT,
                    score REAL,
                    active_issues TEXT,
                    performance_summary TEXT,
                    uptime_seconds REAL
                )
            """)
            
            # Create indexes
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_resources_timestamp ON system_resources(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_health_timestamp ON pipeline_health(timestamp)")
    
    def _setup_thresholds(self) -> Dict:
        """Setup performance thresholds"""
        return {
            "cpu_usage": {"warning": 70, "critical": 90},
            "memory_usage": {"warning": 80, "critical": 95},
            "disk_io_rate": {"warning": 100, "critical": 500},  # MB/s
            "network_io_rate": {"warning": 50, "critical": 200},  # MB/s
            "processing_latency": {"warning": 100, "critical": 500},  # ms
            "error_rate": {"warning": 0.05, "critical": 0.1},  # 5% and 10%
            "queue_depth": {"warning": 100, "critical": 500},
            "connection_count": {"warning": 50, "critical": 100},
            "response_time": {"warning": 1000, "critical": 5000}  # ms
        }
    
    def _setup_alerts(self) -> List[PerformanceAlert]:
        """Setup performance alerts"""
        return [
            PerformanceAlert(
                "high_cpu_usage",
                lambda m: m.get("cpu_usage", 0) > self.thresholds["cpu_usage"]["critical"],
                "critical",
                "CPU usage is critically high",
                300
            ),
            PerformanceAlert(
                "high_memory_usage",
                lambda m: m.get("memory_usage", 0) > self.thresholds["memory_usage"]["warning"],
                "warning",
                "Memory usage is above warning threshold",
                600
            ),
            PerformanceAlert(
                "high_error_rate",
                lambda m: m.get("error_rate", 0) > self.thresholds["error_rate"]["critical"],
                "critical",
                "Error rate is critically high",
                120
            ),
            PerformanceAlert(
                "slow_processing",
                lambda m: m.get("processing_latency", 0) > self.thresholds["processing_latency"]["critical"],
                "warning",
                "Processing latency is high",
                300
            ),
            PerformanceAlert(
                "queue_backup",
                lambda m: m.get("queue_depth", 0) > self.thresholds["queue_depth"]["warning"],
                "warning",
                "Processing queue is backing up",
                180
            )
        ]
    
    async def start_monitoring(self):
        """Start all monitoring tasks"""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.start_time = datetime.now()
        
        # Start monitoring tasks
        if self.config["enable_system_monitoring"]:
            self.monitoring_tasks.append(
                asyncio.create_task(self._system_monitoring_loop())
            )
        
        if self.config["enable_pipeline_monitoring"]:
            self.monitoring_tasks.append(
                asyncio.create_task(self._pipeline_monitoring_loop())
            )
        
        if self.config["enable_database_monitoring"]:
            self.monitoring_tasks.append(
                asyncio.create_task(self._database_monitoring_loop())
            )
        
        # Start alert checking
        self.monitoring_tasks.append(
            asyncio.create_task(self._alert_monitoring_loop())
        )
        
        # Start optimization analyzer
        self.monitoring_tasks.append(
            asyncio.create_task(self._optimization_analysis_loop())
        )
        
        self.logger.info("Performance monitoring started")
    
    async def stop_monitoring(self):
        """Stop all monitoring tasks"""
        self.is_monitoring = False
        
        for task in self.monitoring_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.monitoring_tasks:
            await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)
        
        self.monitoring_tasks.clear()
        self.logger.info("Performance monitoring stopped")
    
    async def _system_monitoring_loop(self):
        """Monitor system resources continuously"""
        while self.is_monitoring:
            try:
                resource_snapshot = await self._collect_system_resources()
                self.resource_history.append(resource_snapshot)
                
                # Store in database
                await self._store_system_resources(resource_snapshot)
                
                # Update recent metrics
                self._update_recent_metrics_from_resources(resource_snapshot)
                
                await asyncio.sleep(self.config["resource_check_interval"])
                
            except Exception as e:
                self.logger.error(f"System monitoring error: {e}")
                await asyncio.sleep(5)
    
    async def _pipeline_monitoring_loop(self):
        """Monitor pipeline-specific metrics"""
        while self.is_monitoring:
            try:
                pipeline_metrics = await self._collect_pipeline_metrics()
                
                for metric in pipeline_metrics:
                    self.metrics_history.append(metric)
                    await self._store_performance_metric(metric)
                    self.recent_metrics[metric.name] = metric.value
                
                await asyncio.sleep(self.config["monitoring_interval"])
                
            except Exception as e:
                self.logger.error(f"Pipeline monitoring error: {e}")
                await asyncio.sleep(5)
    
    async def _database_monitoring_loop(self):
        """Monitor database performance"""
        while self.is_monitoring:
            try:
                db_metrics = await self._collect_database_metrics()
                
                for metric in db_metrics:
                    self.metrics_history.append(metric)
                    await self._store_performance_metric(metric)
                    self.recent_metrics[metric.name] = metric.value
                
                await asyncio.sleep(self.config["monitoring_interval"] * 2)
                
            except Exception as e:
                self.logger.error(f"Database monitoring error: {e}")
                await asyncio.sleep(10)
    
    async def _alert_monitoring_loop(self):
        """Check for alert conditions"""
        while self.is_monitoring:
            try:
                for alert in self.alerts:
                    if alert.should_trigger(self.recent_metrics):
                        await self._trigger_alert(alert)
                
                await asyncio.sleep(self.config["alert_check_interval"])
                
            except Exception as e:
                self.logger.error(f"Alert monitoring error: {e}")
                await asyncio.sleep(30)
    
    async def _optimization_analysis_loop(self):
        """Analyze performance and suggest optimizations"""
        while self.is_monitoring:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                suggestions = await self._analyze_performance_patterns()
                self.optimization_suggestions = suggestions
                
            except Exception as e:
                self.logger.error(f"Optimization analysis error: {e}")
    
    async def _collect_system_resources(self) -> SystemResource:
        """Collect current system resource usage"""
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk I/O
        disk_io = psutil.disk_io_counters()
        disk_read_mb = 0
        disk_write_mb = 0
        
        if self.last_io_counters and disk_io:
            read_bytes = disk_io.read_bytes - self.last_io_counters.read_bytes
            write_bytes = disk_io.write_bytes - self.last_io_counters.write_bytes
            disk_read_mb = read_bytes / (1024 * 1024)
            disk_write_mb = write_bytes / (1024 * 1024)
        
        self.last_io_counters = disk_io
        
        # Network I/O
        network_io = psutil.net_io_counters()
        network_sent = 0
        network_recv = 0
        
        if self.last_network_counters and network_io:
            sent_bytes = network_io.bytes_sent - self.last_network_counters.bytes_sent
            recv_bytes = network_io.bytes_recv - self.last_network_counters.bytes_recv
            network_sent = sent_bytes / (1024 * 1024)
            network_recv = recv_bytes / (1024 * 1024)
        
        self.last_network_counters = network_io
        
        # Open files and connections
        try:
            process = psutil.Process()
            open_files = len(process.open_files())
            connections = len(process.connections())
        except:
            open_files = 0
            connections = 0
        
        return SystemResource(
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / (1024 * 1024),
            disk_io_read_mb=disk_read_mb,
            disk_io_write_mb=disk_write_mb,
            network_bytes_sent=network_sent,
            network_bytes_recv=network_recv,
            open_files=open_files,
            active_connections=connections,
            timestamp=datetime.now()
        )
    
    async def _collect_pipeline_metrics(self) -> List[PerformanceMetric]:
        """Collect pipeline-specific performance metrics"""
        metrics = []
        now = datetime.now()
        
        # Processing queue metrics (simulated - would integrate with actual pipeline)
        try:
            queue_depth = self._get_queue_depth()
            metrics.append(PerformanceMetric(
                name="queue_depth",
                value=queue_depth,
                unit="items",
                timestamp=now,
                threshold_warning=self.thresholds["queue_depth"]["warning"],
                threshold_critical=self.thresholds["queue_depth"]["critical"],
                category="pipeline"
            ))
        except:
            pass
        
        # Processing latency
        try:
            latency = self._calculate_processing_latency()
            metrics.append(PerformanceMetric(
                name="processing_latency",
                value=latency,
                unit="ms",
                timestamp=now,
                threshold_warning=self.thresholds["processing_latency"]["warning"],
                threshold_critical=self.thresholds["processing_latency"]["critical"],
                category="pipeline"
            ))
        except:
            pass
        
        # Error rate
        try:
            error_rate = self._calculate_error_rate()
            metrics.append(PerformanceMetric(
                name="error_rate",
                value=error_rate,
                unit="percentage",
                timestamp=now,
                threshold_warning=self.thresholds["error_rate"]["warning"],
                threshold_critical=self.thresholds["error_rate"]["critical"],
                category="pipeline"
            ))
        except:
            pass
        
        # Throughput
        try:
            throughput = self._calculate_throughput()
            metrics.append(PerformanceMetric(
                name="throughput",
                value=throughput,
                unit="items/sec",
                timestamp=now,
                category="pipeline"
            ))
        except:
            pass
        
        return metrics
    
    async def _collect_database_metrics(self) -> List[PerformanceMetric]:
        """Collect database performance metrics"""
        metrics = []
        now = datetime.now()
        
        # Database connection count
        try:
            connection_count = self._get_database_connections()
            metrics.append(PerformanceMetric(
                name="db_connections",
                value=connection_count,
                unit="connections",
                timestamp=now,
                threshold_warning=self.thresholds["connection_count"]["warning"],
                threshold_critical=self.thresholds["connection_count"]["critical"],
                category="database"
            ))
        except:
            pass
        
        # Query response time
        try:
            response_time = await self._measure_database_response_time()
            metrics.append(PerformanceMetric(
                name="db_response_time",
                value=response_time,
                unit="ms",
                timestamp=now,
                threshold_warning=self.thresholds["response_time"]["warning"],
                threshold_critical=self.thresholds["response_time"]["critical"],
                category="database"
            ))
        except:
            pass
        
        return metrics
    
    def _get_queue_depth(self) -> float:
        """Get current processing queue depth"""
        # This would integrate with the actual processing queue
        # For now, return a simulated value
        return len(getattr(self, 'processing_queue', []))
    
    def _calculate_processing_latency(self) -> float:
        """Calculate average processing latency"""
        # This would measure actual processing times
        # For now, return based on recent metrics
        recent_latencies = [
            m.value for m in list(self.metrics_history)[-10:] 
            if m.name == "processing_latency"
        ]
        return mean(recent_latencies) if recent_latencies else 50.0
    
    def _calculate_error_rate(self) -> float:
        """Calculate error rate over recent period"""
        # This would integrate with error tracking
        # For now, return a simulated value based on system health
        cpu_usage = self.recent_metrics.get("cpu_usage", 0)
        memory_usage = self.recent_metrics.get("memory_usage", 0)
        
        # Higher resource usage correlates with higher error rate
        base_error_rate = 0.01  # 1% baseline
        stress_factor = max(cpu_usage, memory_usage) / 100
        return min(base_error_rate * (1 + stress_factor * 5), 0.2)
    
    def _calculate_throughput(self) -> float:
        """Calculate processing throughput"""
        # This would measure actual items processed per second
        # For now, return based on system performance
        cpu_usage = self.recent_metrics.get("cpu_usage", 50)
        # Higher CPU usage generally means higher throughput (up to a point)
        if cpu_usage < 80:
            return cpu_usage * 2  # items/sec
        else:
            return max(160 - cpu_usage, 10)  # Degradation at high CPU
    
    def _get_database_connections(self) -> float:
        """Get current database connection count"""
        # This would query actual database connection pools
        return self.recent_metrics.get("active_connections", 5)
    
    async def _measure_database_response_time(self) -> float:
        """Measure database response time"""
        start_time = time.time()
        try:
            # Simple query to test response time
            with sqlite3.connect(self.metrics_db_path) as conn:
                conn.execute("SELECT 1").fetchone()
            
            return (time.time() - start_time) * 1000  # Convert to ms
        except:
            return 1000.0  # Default high value if query fails
    
    def _update_recent_metrics_from_resources(self, resource: SystemResource):
        """Update recent metrics from resource snapshot"""
        self.recent_metrics.update({
            "cpu_usage": resource.cpu_percent,
            "memory_usage": resource.memory_percent,
            "disk_io_rate": resource.disk_io_read_mb + resource.disk_io_write_mb,
            "network_io_rate": resource.network_bytes_sent + resource.network_bytes_recv,
            "active_connections": resource.active_connections
        })
    
    async def _store_performance_metric(self, metric: PerformanceMetric):
        """Store performance metric in database"""
        try:
            with sqlite3.connect(self.metrics_db_path) as conn:
                conn.execute("""
                    INSERT INTO performance_metrics 
                    (timestamp, name, value, unit, category, threshold_warning, threshold_critical)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    metric.timestamp,
                    metric.name,
                    metric.value,
                    metric.unit,
                    metric.category,
                    metric.threshold_warning,
                    metric.threshold_critical
                ))
        except Exception as e:
            self.logger.error(f"Failed to store metric: {e}")
    
    async def _store_system_resources(self, resource: SystemResource):
        """Store system resource snapshot in database"""
        try:
            with sqlite3.connect(self.metrics_db_path) as conn:
                conn.execute("""
                    INSERT INTO system_resources 
                    (timestamp, cpu_percent, memory_percent, memory_used_mb,
                     disk_io_read_mb, disk_io_write_mb, network_bytes_sent,
                     network_bytes_recv, open_files, active_connections)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    resource.timestamp,
                    resource.cpu_percent,
                    resource.memory_percent,
                    resource.memory_used_mb,
                    resource.disk_io_read_mb,
                    resource.disk_io_write_mb,
                    resource.network_bytes_sent,
                    resource.network_bytes_recv,
                    resource.open_files,
                    resource.active_connections
                ))
        except Exception as e:
            self.logger.error(f"Failed to store resource data: {e}")
    
    async def _trigger_alert(self, alert: PerformanceAlert):
        """Trigger performance alert"""
        alert_data = {
            "name": alert.name,
            "severity": alert.severity,
            "message": alert.message,
            "timestamp": datetime.now().isoformat(),
            "metrics": self.recent_metrics.copy()
        }
        
        self.triggered_alerts.append(alert_data)
        
        # Log alert
        log_level = logging.CRITICAL if alert.severity == "critical" else logging.WARNING
        self.logger.log(log_level, f"ALERT: {alert.message} - {alert.name}")
        
        # Send webhook notification if configured
        if self.config.get("alert_webhook_url"):
            await self._send_webhook_alert(alert_data)
    
    async def _send_webhook_alert(self, alert_data: Dict):
        """Send alert via webhook"""
        try:
            # Implementation would send HTTP POST to webhook URL
            self.logger.info(f"Webhook alert sent: {alert_data['name']}")
        except Exception as e:
            self.logger.error(f"Failed to send webhook alert: {e}")
    
    async def _analyze_performance_patterns(self) -> List[str]:
        """Analyze performance patterns and suggest optimizations"""
        suggestions = []
        
        # Analyze CPU usage patterns
        cpu_metrics = [
            m.value for m in list(self.metrics_history)[-20:] 
            if m.name == "cpu_usage"
        ]
        
        if cpu_metrics:
            avg_cpu = mean(cpu_metrics)
            if avg_cpu > 70:
                suggestions.append("High CPU usage detected. Consider scaling processing workers.")
            elif avg_cpu < 20:
                suggestions.append("Low CPU usage. Current capacity may be underutilized.")
        
        # Analyze memory usage
        memory_metrics = [
            m.value for m in list(self.metrics_history)[-20:] 
            if m.name == "memory_usage"
        ]
        
        if memory_metrics:
            avg_memory = mean(memory_metrics)
            if avg_memory > 80:
                suggestions.append("High memory usage. Consider increasing memory allocation or optimizing data structures.")
        
        # Analyze error patterns
        error_rate = self.recent_metrics.get("error_rate", 0)
        if error_rate > 0.05:
            suggestions.append("Elevated error rate detected. Review error logs and implement additional retry logic.")
        
        # Analyze queue depth
        queue_depth = self.recent_metrics.get("queue_depth", 0)
        if queue_depth > 50:
            suggestions.append("Processing queue is backing up. Consider increasing worker count or batch sizes.")
        
        return suggestions
    
    def get_current_health(self) -> PipelineHealth:
        """Get current pipeline health status"""
        now = datetime.now()
        uptime = (now - self.start_time).total_seconds()
        
        # Calculate health score
        score = self._calculate_health_score()
        
        # Determine status
        if score >= 90:
            status = "healthy"
        elif score >= 70:
            status = "warning"
        elif score >= 50:
            status = "critical"
        else:
            status = "down"
        
        # Get active issues
        active_issues = self._get_active_issues()
        
        # Performance summary
        performance_summary = {
            "cpu_usage": self.recent_metrics.get("cpu_usage", 0),
            "memory_usage": self.recent_metrics.get("memory_usage", 0),
            "error_rate": self.recent_metrics.get("error_rate", 0),
            "throughput": self.recent_metrics.get("throughput", 0)
        }
        
        return PipelineHealth(
            status=status,
            score=score,
            last_check=now,
            active_issues=active_issues,
            performance_summary=performance_summary,
            uptime_seconds=uptime
        )
    
    def _calculate_health_score(self) -> float:
        """Calculate overall health score (0-100)"""
        score = 100.0
        
        # CPU penalty
        cpu_usage = self.recent_metrics.get("cpu_usage", 0)
        if cpu_usage > 90:
            score -= 30
        elif cpu_usage > 80:
            score -= 15
        elif cpu_usage > 70:
            score -= 5
        
        # Memory penalty
        memory_usage = self.recent_metrics.get("memory_usage", 0)
        if memory_usage > 95:
            score -= 25
        elif memory_usage > 85:
            score -= 10
        elif memory_usage > 75:
            score -= 3
        
        # Error rate penalty
        error_rate = self.recent_metrics.get("error_rate", 0)
        if error_rate > 0.1:
            score -= 40
        elif error_rate > 0.05:
            score -= 20
        elif error_rate > 0.02:
            score -= 10
        
        # Queue depth penalty
        queue_depth = self.recent_metrics.get("queue_depth", 0)
        if queue_depth > 200:
            score -= 20
        elif queue_depth > 100:
            score -= 10
        
        return max(score, 0.0)
    
    def _get_active_issues(self) -> List[str]:
        """Get list of active performance issues"""
        issues = []
        
        cpu_usage = self.recent_metrics.get("cpu_usage", 0)
        if cpu_usage > 90:
            issues.append("Critical CPU usage")
        elif cpu_usage > 80:
            issues.append("High CPU usage")
        
        memory_usage = self.recent_metrics.get("memory_usage", 0)
        if memory_usage > 95:
            issues.append("Critical memory usage")
        elif memory_usage > 85:
            issues.append("High memory usage")
        
        error_rate = self.recent_metrics.get("error_rate", 0)
        if error_rate > 0.1:
            issues.append("High error rate")
        
        queue_depth = self.recent_metrics.get("queue_depth", 0)
        if queue_depth > 100:
            issues.append("Queue backup")
        
        return issues
    
    def get_performance_summary(self) -> Dict:
        """Get comprehensive performance summary"""
        health = self.get_current_health()
        
        return {
            "health": asdict(health),
            "recent_metrics": self.recent_metrics.copy(),
            "optimization_suggestions": self.optimization_suggestions.copy(),
            "recent_alerts": list(self.triggered_alerts)[-5:],
            "uptime_hours": health.uptime_seconds / 3600,
            "monitoring_active": self.is_monitoring
        }
    
    async def export_metrics(self, output_path: Optional[Path] = None) -> Path:
        """Export performance metrics to JSON"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = Path(f"logs/performance_export_{timestamp}.json")
        
        # Collect all metrics
        export_data = {
            "export_timestamp": datetime.now().isoformat(),
            "performance_summary": self.get_performance_summary(),
            "metrics_history": [
                {
                    "name": m.name,
                    "value": m.value,
                    "unit": m.unit,
                    "timestamp": m.timestamp.isoformat(),
                    "category": m.category
                }
                for m in list(self.metrics_history)
            ],
            "resource_history": [
                asdict(r) for r in list(self.resource_history)
            ]
        }
        
        # Convert datetime objects to strings
        for resource in export_data["resource_history"]:
            resource["timestamp"] = resource["timestamp"].isoformat()
        
        async with aiofiles.open(output_path, 'w') as f:
            await f.write(json.dumps(export_data, indent=2))
        
        self.logger.info(f"Performance metrics exported to {output_path}")
        return output_path

async def main():
    """Test the performance monitor"""
    monitor = DataFlowPerformanceMonitor()
    
    try:
        await monitor.start_monitoring()
        
        # Run for a bit to collect metrics
        await asyncio.sleep(60)
        
        # Print summary
        summary = monitor.get_performance_summary()
        print(json.dumps(summary, indent=2))
        
    finally:
        await monitor.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())