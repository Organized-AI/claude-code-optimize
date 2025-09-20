"""
Shared data models and interfaces for Claude Code Optimizer agents.
Provides consistent data structures across all agent systems.
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
from enum import Enum


class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress" 
    COMPLETED = "completed"
    BLOCKED = "blocked"


class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ModelType(Enum):
    HAIKU = "haiku"
    SONNET = "sonnet"
    OPUS = "opus"


class QuotaStatus(Enum):
    GREEN = "green"  # <70%
    YELLOW = "yellow"  # 70-85%
    RED = "red"  # >85%


@dataclass
class SessionData:
    """Standard session data structure."""
    session_id: str
    start_time: datetime
    end_time: Optional[datetime]
    model: ModelType
    tokens_used: int
    duration_hours: float
    project_name: Optional[str] = None
    efficiency_score: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class QuotaData:
    """Weekly quota tracking data."""
    week_start: datetime
    sonnet_used: float  # Hours
    opus_used: float    # Hours
    sonnet_limit: float = 432.0  # Hours
    opus_limit: float = 36.0     # Hours
    
    @property
    def sonnet_percent(self) -> float:
        return (self.sonnet_used / self.sonnet_limit) * 100
    
    @property 
    def opus_percent(self) -> float:
        return (self.opus_used / self.opus_limit) * 100
    
    @property
    def status(self) -> QuotaStatus:
        max_percent = max(self.sonnet_percent, self.opus_percent)
        if max_percent > 85:
            return QuotaStatus.RED
        elif max_percent > 70:
            return QuotaStatus.YELLOW
        else:
            return QuotaStatus.GREEN


@dataclass
class ProjectComplexity:
    """Project complexity analysis result."""
    file_count: int
    language_count: int
    estimated_hours: float
    recommended_model: ModelType
    complexity_level: str  # "simple", "medium", "complex"
    reasoning: str


@dataclass
class AgentTask:
    """Task structure for agent coordination."""
    id: str
    content: str
    status: TaskStatus
    priority: Priority
    assigned_to: str
    created_at: datetime
    updated_at: datetime
    dependencies: List[str] = None
    deliverables: List[str] = None
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []
        if self.deliverables is None:
            self.deliverables = []


@dataclass
class AgentStatus:
    """Agent status for coordination system."""
    agent_name: str
    status: str  # "idle", "working", "blocked", "completed"
    current_task: Optional[str]
    progress_percent: float
    estimated_completion: Optional[datetime]
    blockers: List[str] = None
    last_update: datetime = None
    
    def __post_init__(self):
        if self.blockers is None:
            self.blockers = []
        if self.last_update is None:
            self.last_update = datetime.now()


@dataclass
class CLICommand:
    """CLI command specification for enhanced CLI."""
    name: str
    description: str
    aliases: List[str]
    format_options: List[str]  # ["table", "json", "minimal"]
    example: str
    
    def __post_init__(self):
        if self.aliases is None:
            self.aliases = []


@dataclass
class DashboardMode:
    """Dashboard mode configuration."""
    mode: str  # "simple" or "advanced"
    enabled_components: List[str]
    layout_config: Dict[str, Any]
    user_preferences: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.user_preferences is None:
            self.user_preferences = {}


# API Response Models
@dataclass
class APIResponse:
    """Standard API response structure."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        if isinstance(result['timestamp'], datetime):
            result['timestamp'] = result['timestamp'].isoformat()
        return result


# Utility functions
def serialize_datetime(dt: datetime) -> str:
    """Serialize datetime for JSON responses."""
    return dt.isoformat() if dt else None


def deserialize_datetime(dt_str: str) -> datetime:
    """Deserialize datetime from JSON."""
    return datetime.fromisoformat(dt_str) if dt_str else None