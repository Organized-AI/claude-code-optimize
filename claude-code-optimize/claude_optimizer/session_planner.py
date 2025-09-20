"""
Session planning and optimization for Claude Code.

This module provides intelligent session block generation and optimization
based on project analysis and user constraints.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Dict, Optional
import heapq


class SessionType(Enum):
    PLANNING = "planning"
    ARCHITECTURE = "architecture" 
    IMPLEMENTATION = "implementation"
    TESTING = "testing"
    DEBUGGING = "debugging"
    REFACTORING = "refactoring"
    REVIEW = "review"
    DOCUMENTATION = "documentation"


@dataclass
class OptimizedSessionBlock:
    """Represents an optimized Claude Code session block"""
    session_id: str
    session_type: SessionType
    duration_hours: float
    model_recommendation: str  # "sonnet" or "opus"
    complexity_score: int  # 1-10
    prerequisites: List[str]
    deliverables: List[str]
    break_points: List[float]  # Hour marks for breaks
    context_size_estimate: int  # Estimated tokens
    calendar_title: str
    calendar_description: str
    calendar_start: datetime
    efficiency_optimizations: List[str]


class SessionPlanner:
    """Intelligent session planning for Claude Code optimization"""
    
    def __init__(self):
        self.session_templates = {
            SessionType.PLANNING: self._create_planning_template,
            SessionType.ARCHITECTURE: self._create_architecture_template,
            SessionType.IMPLEMENTATION: self._create_implementation_template,
            SessionType.TESTING: self._create_testing_template,
            SessionType.DEBUGGING: self._create_debugging_template,
            SessionType.REFACTORING: self._create_refactoring_template,
            SessionType.REVIEW: self._create_review_template,
            SessionType.DOCUMENTATION: self._create_documentation_template
        }
    
    async def create_session_blocks(self, analysis, deadline: Optional[datetime] = None) -> List[OptimizedSessionBlock]:
        """
        Generate optimized session blocks based on project analysis
        
        Args:
            analysis: ProjectAnalysis object from core.py
            deadline: Optional deadline for project completion
            
        Returns:
            List of OptimizedSessionBlock objects
        """
        
        blocks = []
        current_time = datetime.now()
        
        # Extract phases from analysis
        estimated_phases = getattr(analysis, 'estimated_phases', {})
        
        # Process each phase from analysis
        for phase_name, phase_data in estimated_phases.items():
            if not isinstance(phase_data, dict):
                continue
                
            phase_type = self._map_phase_to_session_type(phase_name)
            
            # Break large phases into optimal 5-hour chunks
            total_hours = phase_data.get("hours", 2)
            sessions_needed = max(1, int(total_hours / 5)) + (1 if total_hours % 5 > 0 else 0)
            
            for session_num in range(sessions_needed):
                # Calculate session duration (max 5 hours)
                remaining_hours = total_hours - (session_num * 5)
                session_duration = min(5, remaining_hours)
                
                if session_duration <= 0:
                    break
                
                # Generate session block
                block = await self._create_optimized_block(
                    phase_type, 
                    session_duration, 
                    session_num,
                    phase_data,
                    analysis,
                    current_time
                )
                
                blocks.append(block)
                current_time += timedelta(hours=session_duration + 1)  # 1-hour buffer
        
        return self._optimize_session_sequence(blocks, deadline)
    
    def _map_phase_to_session_type(self, phase_name: str) -> SessionType:
        """Map phase names to SessionType enum"""
        
        mapping = {
            "planning": SessionType.PLANNING,
            "architecture": SessionType.ARCHITECTURE,
            "implementation": SessionType.IMPLEMENTATION,
            "testing": SessionType.TESTING,
            "debugging": SessionType.DEBUGGING,
            "refactoring": SessionType.REFACTORING,
            "review": SessionType.REVIEW,
            "documentation": SessionType.DOCUMENTATION,
            "optimization": SessionType.REFACTORING
        }
        
        return mapping.get(phase_name.lower(), SessionType.IMPLEMENTATION)
    
    async def _create_optimized_block(self, 
                                   session_type: SessionType,
                                   duration: float,
                                   session_num: int,
                                   phase_data: Dict,
                                   project_analysis,
                                   start_time: datetime) -> OptimizedSessionBlock:
        """Create individual optimized session block"""
        
        template = self.session_templates[session_type]()
        
        # Calculate optimal break points
        break_points = self._calculate_break_points(duration, session_type)
        
        # Estimate context size for token optimization
        context_estimate = self._estimate_context_size(
            session_type, 
            getattr(project_analysis, 'complexity_score', 5)
        )
        
        # Generate efficiency optimizations
        optimizations = self._generate_efficiency_optimizations(
            session_type, 
            duration, 
            context_estimate
        )
        
        return OptimizedSessionBlock(
            session_id=f"{session_type.value}_{session_num + 1}",
            session_type=session_type,
            duration_hours=duration,
            model_recommendation=phase_data.get("model", "sonnet"),
            complexity_score=getattr(project_analysis, 'complexity_score', 5),
            prerequisites=template["prerequisites"],
            deliverables=template["deliverables"],
            break_points=break_points,
            context_size_estimate=context_estimate,
            calendar_title=f"Claude Code: {session_type.value.title()} Session {session_num + 1}",
            calendar_description=self._generate_calendar_description(
                session_type, duration, optimizations
            ),
            calendar_start=start_time,
            efficiency_optimizations=optimizations
        )
    
    def _calculate_break_points(self, duration: float, session_type: SessionType) -> List[float]:
        """Calculate optimal break points based on cognitive load research"""
        
        breaks = []
        
        # Different session types have different cognitive demands
        if session_type in [SessionType.PLANNING, SessionType.ARCHITECTURE]:
            # High cognitive load - more frequent breaks
            if duration >= 1.5:
                breaks.append(1.0)  # Early break for complex thinking
            if duration >= 3:
                breaks.append(2.5)
            if duration >= 4.5:
                breaks.append(4.0)
        
        elif session_type in [SessionType.IMPLEMENTATION, SessionType.REFACTORING]:
            # Moderate cognitive load - standard breaks
            if duration >= 2:
                breaks.append(1.5)
            if duration >= 4:
                breaks.append(3.0)
            if duration >= 5:
                breaks.append(4.5)
        
        else:  # Testing, debugging, review, documentation
            # Lower cognitive load - fewer breaks
            if duration >= 3:
                breaks.append(2.0)
            if duration >= 5:
                breaks.append(4.0)
        
        return breaks
    
    def _estimate_context_size(self, session_type: SessionType, complexity_score: int) -> int:
        """Estimate context size for token optimization"""
        
        base_estimates = {
            SessionType.PLANNING: 20000,
            SessionType.ARCHITECTURE: 30000,
            SessionType.IMPLEMENTATION: 15000,
            SessionType.TESTING: 10000,
            SessionType.DEBUGGING: 25000,
            SessionType.REFACTORING: 40000,
            SessionType.REVIEW: 8000,
            SessionType.DOCUMENTATION: 5000
        }
        
        base_size = base_estimates.get(session_type, 15000)
        complexity_multiplier = 1 + (complexity_score - 5) * 0.2
        
        return int(base_size * complexity_multiplier)
    
    def _generate_efficiency_optimizations(self, 
                                         session_type: SessionType,
                                         duration: float,
                                         context_estimate: int) -> List[str]:
        """Generate efficiency optimizations for the session"""
        
        optimizations = []
        
        # Context-based optimizations
        if context_estimate > 50000:
            optimizations.append("Use session chaining to preserve context across breaks")
            optimizations.append("Pre-analyze codebase structure before starting")
        
        # Duration-based optimizations
        if duration > 3:
            optimizations.append("Plan break points to maintain focus")
            optimizations.append("Prepare session objectives beforehand")
        
        # Session-type specific optimizations
        if session_type == SessionType.IMPLEMENTATION:
            optimizations.append("Use focused prompts to reduce iteration cycles")
            optimizations.append("Implement incremental testing during development")
        elif session_type == SessionType.PLANNING:
            optimizations.append("Create structured planning templates")
            optimizations.append("Focus on high-level architecture decisions")
        elif session_type == SessionType.REFACTORING:
            optimizations.append("Identify refactoring scope before starting")
            optimizations.append("Use gradual refactoring to maintain functionality")
        
        return optimizations
    
    def _generate_calendar_description(self, 
                                     session_type: SessionType,
                                     duration: float,
                                     optimizations: List[str]) -> str:
        """Generate detailed calendar event description"""
        
        description = f"""
🎯 Session Type: {session_type.value.title()}
⏱️ Duration: {duration} hours

⚡ Efficiency Optimizations:
{chr(10).join(f"• {opt}" for opt in optimizations)}

💡 Pre-Session Checklist:
• Review previous session notes
• Ensure all prerequisites are met
• Check weekly quota remaining
• Set up focused work environment

📈 Post-Session:
• Update efficiency score
• Log actual usage vs estimates
• Prepare context for next session
        """
        
        return description.strip()
    
    def _optimize_session_sequence(self, blocks: List[OptimizedSessionBlock], 
                                 deadline: Optional[datetime] = None) -> List[OptimizedSessionBlock]:
        """Optimize the sequence of session blocks"""
        
        if not deadline:
            return blocks
        
        # Sort by priority and dependencies
        # For now, keep original order but could implement more sophisticated scheduling
        return blocks
    
    # Template methods for different session types
    def _create_planning_template(self) -> Dict:
        return {
            "prerequisites": ["Project requirements", "Initial codebase review"],
            "deliverables": ["Architecture plan", "Implementation roadmap", "Risk assessment"]
        }
    
    def _create_architecture_template(self) -> Dict:
        return {
            "prerequisites": ["Planning session completed", "Requirements clarified"],
            "deliverables": ["System architecture", "Component design", "Interface definitions"]
        }
    
    def _create_implementation_template(self) -> Dict:
        return {
            "prerequisites": ["Architecture defined", "Development environment setup"],
            "deliverables": ["Working code", "Unit tests", "Basic documentation"]
        }
    
    def _create_testing_template(self) -> Dict:
        return {
            "prerequisites": ["Implementation completed", "Test strategy defined"],
            "deliverables": ["Test suite", "Bug reports", "Quality metrics"]
        }
    
    def _create_debugging_template(self) -> Dict:
        return {
            "prerequisites": ["Issues identified", "Debugging tools ready"],
            "deliverables": ["Bug fixes", "Root cause analysis", "Prevention strategies"]
        }
    
    def _create_refactoring_template(self) -> Dict:
        return {
            "prerequisites": ["Code review completed", "Refactoring plan"],
            "deliverables": ["Improved code structure", "Performance optimizations", "Updated tests"]
        }
    
    def _create_review_template(self) -> Dict:
        return {
            "prerequisites": ["Code implementation finished", "Documentation ready"],
            "deliverables": ["Code review report", "Quality assessment", "Improvement recommendations"]
        }
    
    def _create_documentation_template(self) -> Dict:
        return {
            "prerequisites": ["Implementation completed", "API stabilized"],
            "deliverables": ["API documentation", "User guides", "Code comments"]
        }
