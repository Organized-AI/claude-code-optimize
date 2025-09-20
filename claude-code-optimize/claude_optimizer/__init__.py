"""
Claude Code Power User Optimization System

A comprehensive optimization framework for maximizing productivity
within Claude Code's weekly rate limits starting August 28, 2025.
"""

__version__ = "1.0.0"
__author__ = "Organized AI"
__email__ = "contact@organized-ai.com"

from .core import ClaudeCodeMasterOptimizer
from .session_planner import SessionPlanner, SessionType, OptimizedSessionBlock
from .calendar_integration import CalendarIntegration
from .usage_tracker import UsageTracker
from .model_optimizer import ModelOptimizer
from .dashboard import ClaudeCodeDashboard

__all__ = [
    "ClaudeCodeMasterOptimizer",
    "SessionPlanner", 
    "SessionType",
    "OptimizedSessionBlock",
    "CalendarIntegration",
    "UsageTracker",
    "ModelOptimizer",
    "ClaudeCodeDashboard"
]
