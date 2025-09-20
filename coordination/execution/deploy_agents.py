#!/usr/bin/env python3
"""
Agent Deployment Script for Claude Code Optimizer Enhancement.
Deploys and coordinates all three specialized agents in parallel.
"""

import asyncio
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from coordination.shared_interfaces.data_models import (
    AgentTask, AgentStatus, TaskStatus, Priority
)
from coordination.execution.agent_coordinator import (
    AgentCoordinator, deploy_agent_parallel, create_default_tasks
)


class AgentDeploymentManager:
    """Manages the deployment and coordination of all agents."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.coordinator = AgentCoordinator(project_root)
        self.deployment_log: List[Dict[str, Any]] = []
        self.logger = self._setup_logging()
        
        # Agent configurations
        self.agent_configs = [
            {
                "id": "cli_enhancement",
                "name": "CLI Enhancement Specialist",
                "prompt_file": "agents/cli_enhancement_agent.md",
                "expected_deliverables": [
                    "src/cli/cco.py",
                    "src/cli/commands/",
                    "src/cli/formatters/",
                    "CLI documentation"
                ],
                "estimated_duration": 4.0  # hours
            },
            {
                "id": "dashboard_simplification", 
                "name": "Dashboard Simplification Specialist",
                "prompt_file": "agents/dashboard_simplification_agent.md",
                "expected_deliverables": [
                    "src/components/simple/",
                    "Simple mode toggle functionality",
                    "Responsive design updates",
                    "Component documentation"
                ],
                "estimated_duration": 3.5  # hours
            },
            {
                "id": "planning_logic",
                "name": "Planning Logic Specialist", 
                "prompt_file": "agents/planning_logic_agent.md",
                "expected_deliverables": [
                    "src/planning/",
                    "Algorithm implementations",
                    "Integration APIs",
                    "Planning documentation"
                ],
                "estimated_duration": 4.5  # hours
            }
        ]
    
    def _setup_logging(self) -> logging.Logger:
        """Set up deployment logging."""
        logger = logging.getLogger("agent_deployment")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            # Console handler
            console_handler = logging.StreamHandler()
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            logger.addHandler(console_handler)
            
            # File handler
            log_file = self.project_root / "logs" / "agent_deployment.log"
            log_file.parent.mkdir(exist_ok=True)
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(console_formatter)
            logger.addHandler(file_handler)
        
        return logger
    
    async def deploy_all_agents(self) -> Dict[str, bool]:
        """Deploy all agents in parallel."""
        self.logger.info("Starting parallel agent deployment...")
        
        # Validate agent configurations
        validation_results = await self._validate_agent_configs()
        if not all(validation_results.values()):
            self.logger.error("Agent configuration validation failed")
            return validation_results
        
        # Deploy agents
        deployment_results = await deploy_agent_parallel(
            self.coordinator, 
            self.agent_configs
        )
        
        # Create and assign tasks
        if all(deployment_results.values()):
            task_results = await self._assign_tasks()
            
            self.logger.info("All agents deployed and tasks assigned successfully")
            return deployment_results
        else:
            failed_agents = [aid for aid, success in deployment_results.items() if not success]
            self.logger.error(f"Failed to deploy agents: {failed_agents}")
            return deployment_results
    
    async def _validate_agent_configs(self) -> Dict[str, bool]:
        """Validate agent configuration files exist and are readable."""
        validation_results = {}
        
        for config in self.agent_configs:
            agent_id = config["id"]
            prompt_file = self.project_root / config["prompt_file"]
            
            try:
                if not prompt_file.exists():
                    self.logger.error(f"Prompt file not found for {agent_id}: {prompt_file}")
                    validation_results[agent_id] = False
                    continue
                
                # Check if file is readable and has content
                content = prompt_file.read_text()
                if len(content.strip()) < 100:  # Minimum content check
                    self.logger.error(f"Prompt file too short for {agent_id}")
                    validation_results[agent_id] = False
                    continue
                
                # Check for required sections
                required_sections = ["MISSION", "DELIVERABLES", "REQUIREMENTS"]
                missing_sections = [
                    section for section in required_sections 
                    if section not in content
                ]
                
                if missing_sections:
                    self.logger.warning(
                        f"Missing sections in {agent_id} prompt: {missing_sections}"
                    )
                
                validation_results[agent_id] = True
                self.logger.info(f"Validated agent configuration: {agent_id}")
                
            except Exception as e:
                self.logger.error(f"Failed to validate {agent_id}: {e}")
                validation_results[agent_id] = False
        
        return validation_results
    
    async def _assign_tasks(self) -> Dict[str, bool]:
        """Create and assign tasks to deployed agents."""
        task_assignment_results = {}
        
        # Create tasks
        tasks = create_default_tasks()
        
        # Assign tasks to agents
        for task in tasks:
            agent_id = task.assigned_to
            success = self.coordinator.assign_task(agent_id, task)
            task_assignment_results[f"{agent_id}_task"] = success
            
            if success:
                self.logger.info(f"Assigned task {task.id} to agent {agent_id}")
            else:
                self.logger.error(f"Failed to assign task {task.id} to agent {agent_id}")
        
        return task_assignment_results
    
    def monitor_progress(self) -> Dict[str, Any]:
        """Monitor progress of all agents."""
        return self.coordinator.get_system_status()
    
    def detect_issues(self) -> List[Dict[str, Any]]:
        """Detect and report system issues."""
        blockers = self.coordinator.detect_blockers()
        optimizations = self.coordinator.suggest_optimizations()
        
        issues = []
        
        # Convert blockers to issues
        for blocker in blockers:
            issues.append({
                "type": "blocker",
                "severity": "high",
                "description": f"{blocker['type']}: {blocker.get('task', blocker.get('agent', 'Unknown'))}",
                "data": blocker
            })
        
        # Add optimization suggestions as low-priority issues
        for optimization in optimizations:
            issues.append({
                "type": "optimization",
                "severity": "low", 
                "description": optimization['description'],
                "data": optimization
            })
        
        return issues
    
    def generate_deployment_report(self) -> Dict[str, Any]:
        """Generate comprehensive deployment report."""
        system_status = self.coordinator.get_system_status()
        issues = self.detect_issues()
        
        return {
            "deployment_summary": {
                "total_agents": len(self.agent_configs),
                "deployed_agents": len(system_status["agents"]),
                "total_tasks": system_status["summary"]["total_tasks"],
                "completed_tasks": system_status["summary"]["completed_tasks"],
                "completion_rate": system_status["summary"]["completion_rate"]
            },
            "agent_status": system_status["agents"],
            "task_status": system_status["tasks"],
            "issues": issues,
            "deployment_log": self.deployment_log,
            "next_steps": self._generate_next_steps(),
            "generated_at": datetime.now().isoformat()
        }
    
    def _generate_next_steps(self) -> List[str]:
        """Generate actionable next steps based on current status."""
        system_status = self.coordinator.get_system_status()
        next_steps = []
        
        # Check for idle agents with pending tasks
        idle_agents = [
            aid for aid, agent in system_status["agents"].items()
            if agent["status"] == "idle"
        ]
        
        pending_tasks = [
            tid for tid, task in system_status["tasks"].items()
            if task["status"] == "pending"
        ]
        
        if idle_agents and pending_tasks:
            next_steps.append(
                f"Deploy {len(idle_agents)} idle agents to {len(pending_tasks)} pending tasks"
            )
        
        # Check for completion
        if system_status["summary"]["completion_rate"] == 1.0:
            next_steps.extend([
                "All tasks completed - Run integration testing",
                "Validate deliverables meet requirements", 
                "Prepare final system integration",
                "Update documentation and deployment guides"
            ])
        elif system_status["summary"]["completion_rate"] > 0.5:
            next_steps.append("Monitor remaining tasks for completion")
        
        # Check for blockers
        issues = self.detect_issues()
        high_priority_issues = [i for i in issues if i["severity"] == "high"]
        if high_priority_issues:
            next_steps.insert(0, f"Resolve {len(high_priority_issues)} critical blockers")
        
        return next_steps
    
    def save_deployment_state(self, file_path: Optional[Path] = None) -> Path:
        """Save current deployment state to file."""
        if file_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_path = self.project_root / "coordination" / "state" / f"deployment_{timestamp}.json"
        
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        deployment_report = self.generate_deployment_report()
        
        with open(file_path, 'w') as f:
            json.dump(deployment_report, f, indent=2, default=str)
        
        self.logger.info(f"Deployment state saved to {file_path}")
        return file_path
    
    def load_deployment_state(self, file_path: Path) -> Dict[str, Any]:
        """Load deployment state from file."""
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load deployment state: {e}")
            return {}


async def main():
    """Main deployment function."""
    project_root = Path(__file__).parent.parent.parent
    
    # Initialize deployment manager
    deployment_manager = AgentDeploymentManager(project_root)
    
    print("🚀 Starting Claude Code Optimizer Agent Deployment")
    print("=" * 60)
    
    # Deploy all agents
    deployment_results = await deployment_manager.deploy_all_agents()
    
    # Print results
    print("\n📊 Deployment Results:")
    for agent_id, success in deployment_results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"  {agent_id}: {status}")
    
    # Generate and save report
    report_file = deployment_manager.save_deployment_state()
    print(f"\n📋 Deployment report saved to: {report_file}")
    
    # Show system status
    status = deployment_manager.monitor_progress()
    print(f"\n📈 System Status:")
    print(f"  Agents: {status['summary']['total_agents']}")
    print(f"  Tasks: {status['summary']['total_tasks']}")
    print(f"  Completion: {status['summary']['completion_rate']*100:.1f}%")
    
    # Show next steps
    next_steps = deployment_manager._generate_next_steps()
    if next_steps:
        print(f"\n🎯 Next Steps:")
        for i, step in enumerate(next_steps, 1):
            print(f"  {i}. {step}")
    
    return deployment_results


if __name__ == "__main__":
    asyncio.run(main())