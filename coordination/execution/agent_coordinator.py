"""
Agent Coordination System for Claude Code Optimizer.
Manages parallel agent execution and communication.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any
from dataclasses import asdict

from ..shared_interfaces.data_models import (
    AgentTask, AgentStatus, TaskStatus, Priority, APIResponse
)


class AgentCoordinator:
    """Coordinates multiple agents working in parallel."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.agents: Dict[str, AgentStatus] = {}
        self.tasks: Dict[str, AgentTask] = {}
        self.coordination_log: List[Dict] = []
        self.logger = self._setup_logging()
        
        # Agent registry
        self.agent_registry = {
            "cli_enhancement": {
                "name": "CLI Enhancement Specialist",
                "capabilities": ["cli", "commands", "terminal_ux"],
                "dependencies": []
            },
            "dashboard_simplification": {
                "name": "Dashboard Simplification Specialist", 
                "capabilities": ["react", "ui_ux", "components"],
                "dependencies": []
            },
            "planning_logic": {
                "name": "Planning Logic Specialist",
                "capabilities": ["algorithms", "optimization", "planning"],
                "dependencies": []
            }
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for coordination activities."""
        logger = logging.getLogger("agent_coordinator")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def register_agent(self, agent_id: str) -> bool:
        """Register agent in coordination system."""
        if agent_id not in self.agent_registry:
            self.logger.error(f"Unknown agent: {agent_id}")
            return False
        
        self.agents[agent_id] = AgentStatus(
            agent_name=agent_id,
            status="idle",
            current_task=None,
            progress_percent=0.0,
            estimated_completion=None
        )
        
        self.logger.info(f"Registered agent: {agent_id}")
        return True
    
    def assign_task(self, agent_id: str, task: AgentTask) -> bool:
        """Assign task to specific agent."""
        if agent_id not in self.agents:
            self.logger.error(f"Agent not registered: {agent_id}")
            return False
        
        if self.agents[agent_id].status != "idle":
            self.logger.warning(f"Agent {agent_id} is not idle")
            return False
        
        # Check dependencies
        for dep_id in task.dependencies:
            if dep_id in self.tasks:
                dep_task = self.tasks[dep_id]
                if dep_task.status != TaskStatus.COMPLETED:
                    self.logger.warning(
                        f"Task {task.id} has incomplete dependency: {dep_id}"
                    )
                    return False
        
        # Assign task
        self.tasks[task.id] = task
        self.agents[agent_id].current_task = task.id
        self.agents[agent_id].status = "working"
        task.status = TaskStatus.IN_PROGRESS
        
        self._log_coordination_event("task_assigned", {
            "agent": agent_id,
            "task": task.id,
            "priority": task.priority.value
        })
        
        self.logger.info(f"Assigned task {task.id} to agent {agent_id}")
        return True
    
    def update_agent_status(
        self, 
        agent_id: str, 
        status: str,
        progress: Optional[float] = None,
        estimated_completion: Optional[datetime] = None,
        blockers: Optional[List[str]] = None
    ) -> bool:
        """Update agent status."""
        if agent_id not in self.agents:
            self.logger.error(f"Agent not registered: {agent_id}")
            return False
        
        agent = self.agents[agent_id]
        agent.status = status
        agent.last_update = datetime.now()
        
        if progress is not None:
            agent.progress_percent = progress
        if estimated_completion is not None:
            agent.estimated_completion = estimated_completion
        if blockers is not None:
            agent.blockers = blockers
        
        self._log_coordination_event("status_update", {
            "agent": agent_id,
            "status": status,
            "progress": progress,
            "blockers": blockers
        })
        
        return True
    
    def complete_task(self, agent_id: str, task_id: str, deliverables: List[str]) -> bool:
        """Mark task as completed."""
        if task_id not in self.tasks:
            self.logger.error(f"Task not found: {task_id}")
            return False
        
        task = self.tasks[task_id]
        task.status = TaskStatus.COMPLETED
        task.deliverables = deliverables
        task.updated_at = datetime.now()
        
        if agent_id in self.agents:
            self.agents[agent_id].status = "idle"
            self.agents[agent_id].current_task = None
            self.agents[agent_id].progress_percent = 100.0
        
        self._log_coordination_event("task_completed", {
            "agent": agent_id,
            "task": task_id,
            "deliverables": deliverables
        })
        
        self.logger.info(f"Task {task_id} completed by agent {agent_id}")
        return True
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status."""
        total_tasks = len(self.tasks)
        completed_tasks = sum(1 for t in self.tasks.values() 
                            if t.status == TaskStatus.COMPLETED)
        
        return {
            "agents": {aid: asdict(agent) for aid, agent in self.agents.items()},
            "tasks": {tid: asdict(task) for tid, task in self.tasks.items()},
            "summary": {
                "total_agents": len(self.agents),
                "active_agents": sum(1 for a in self.agents.values() 
                                   if a.status == "working"),
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "completion_rate": completed_tasks / total_tasks if total_tasks > 0 else 0
            },
            "last_update": datetime.now().isoformat()
        }
    
    def detect_blockers(self) -> List[Dict[str, Any]]:
        """Detect system-wide blockers."""
        blockers = []
        
        # Check for tasks blocked by dependencies
        for task_id, task in self.tasks.items():
            if task.status == TaskStatus.PENDING:
                unmet_deps = []
                for dep_id in task.dependencies:
                    if dep_id in self.tasks:
                        dep_task = self.tasks[dep_id]
                        if dep_task.status != TaskStatus.COMPLETED:
                            unmet_deps.append(dep_id)
                
                if unmet_deps:
                    blockers.append({
                        "type": "dependency_blocker",
                        "task": task_id,
                        "unmet_dependencies": unmet_deps
                    })
        
        # Check for stalled agents
        now = datetime.now()
        for agent_id, agent in self.agents.items():
            if agent.status == "working" and agent.last_update:
                time_since_update = now - agent.last_update
                if time_since_update > timedelta(hours=1):
                    blockers.append({
                        "type": "stalled_agent",
                        "agent": agent_id,
                        "last_update": agent.last_update.isoformat(),
                        "current_task": agent.current_task
                    })
        
        return blockers
    
    def suggest_optimizations(self) -> List[Dict[str, Any]]:
        """Suggest system optimizations."""
        suggestions = []
        
        # Check for parallel execution opportunities
        idle_agents = [aid for aid, agent in self.agents.items() 
                      if agent.status == "idle"]
        pending_tasks = [tid for tid, task in self.tasks.items() 
                        if task.status == TaskStatus.PENDING]
        
        if idle_agents and pending_tasks:
            suggestions.append({
                "type": "parallel_execution",
                "description": f"{len(idle_agents)} idle agents available for {len(pending_tasks)} pending tasks",
                "idle_agents": idle_agents,
                "pending_tasks": pending_tasks[:len(idle_agents)]
            })
        
        # Check for load balancing
        work_distribution = {}
        for agent_id, agent in self.agents.items():
            completed_tasks = sum(1 for t in self.tasks.values() 
                                if t.status == TaskStatus.COMPLETED and 
                                agent_id in getattr(t, 'assigned_to', ''))
            work_distribution[agent_id] = completed_tasks
        
        if work_distribution:
            max_load = max(work_distribution.values())
            min_load = min(work_distribution.values())
            if max_load - min_load > 2:
                suggestions.append({
                    "type": "load_balancing",
                    "description": "Uneven work distribution detected",
                    "distribution": work_distribution
                })
        
        return suggestions
    
    def _log_coordination_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """Log coordination events for analysis."""
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "data": data
        }
        self.coordination_log.append(event)
        
        # Keep only last 1000 events
        if len(self.coordination_log) > 1000:
            self.coordination_log = self.coordination_log[-1000:]
    
    def export_coordination_report(self) -> Dict[str, Any]:
        """Export comprehensive coordination report."""
        return {
            "system_status": self.get_system_status(),
            "blockers": self.detect_blockers(),
            "optimizations": self.suggest_optimizations(),
            "coordination_log": self.coordination_log[-50:],  # Last 50 events
            "agent_registry": self.agent_registry,
            "generated_at": datetime.now().isoformat()
        }


# Utility functions for agent deployment
async def deploy_agent_parallel(
    coordinator: AgentCoordinator,
    agent_configs: List[Dict[str, Any]]
) -> Dict[str, bool]:
    """Deploy multiple agents in parallel."""
    results = {}
    
    async def deploy_single_agent(config: Dict[str, Any]) -> None:
        agent_id = config["id"]
        try:
            success = coordinator.register_agent(agent_id)
            results[agent_id] = success
        except Exception as e:
            coordinator.logger.error(f"Failed to deploy agent {agent_id}: {e}")
            results[agent_id] = False
    
    # Deploy all agents concurrently
    tasks = [deploy_single_agent(config) for config in agent_configs]
    await asyncio.gather(*tasks)
    
    return results


def create_default_tasks() -> List[AgentTask]:
    """Create default tasks for the enhancement project."""
    now = datetime.now()
    
    return [
        AgentTask(
            id="cli_enhancement",
            content="Create enhanced CLI tool with ccusage compatibility",
            status=TaskStatus.PENDING,
            priority=Priority.HIGH,
            assigned_to="cli_enhancement",
            created_at=now,
            updated_at=now,
            dependencies=[],
            deliverables=[]
        ),
        AgentTask(
            id="dashboard_simplification", 
            content="Add Simple Mode toggle to existing dashboard",
            status=TaskStatus.PENDING,
            priority=Priority.HIGH,
            assigned_to="dashboard_simplification",
            created_at=now,
            updated_at=now,
            dependencies=[],
            deliverables=[]
        ),
        AgentTask(
            id="planning_logic",
            content="Create rule-based planning and optimization features",
            status=TaskStatus.PENDING,
            priority=Priority.HIGH,
            assigned_to="planning_logic",
            created_at=now,
            updated_at=now,
            dependencies=[],
            deliverables=[]
        )
    ]