"""
Core optimization system for Claude Code power users.

This module contains the main ClaudeCodeMasterOptimizer class that orchestrates
all optimization components including usage tracking, session planning,
calendar integration, and model optimization.
"""

import asyncio
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from dataclasses import dataclass

from claude_code_sdk import ClaudeSDKClient, ClaudeCodeOptions
from .session_planner import SessionPlanner, SessionType
from .calendar_integration import CalendarIntegration
from .usage_tracker import UsageTracker
from .model_optimizer import ModelOptimizer


@dataclass
class ProjectAnalysis:
    """Analysis results for a project"""
    project_name: str
    complexity_score: int  # 1-10
    estimated_phases: Dict[str, Dict]
    risk_factors: List[str]
    recommended_approach: str
    session_structure: Dict
    total_estimated_hours: float
    confidence_level: str


class ClaudeCodeMasterOptimizer:
    """
    Complete optimization system for Claude Code power users
    
    Integrates: Usage tracking, calendar scheduling, AI planning, model optimization
    """
    
    def __init__(self, plan_type: str = "max_200", db_path: str = "claude_usage.db"):
        """
        Initialize the optimization system
        
        Args:
            plan_type: One of "pro", "max_100", "max_200"
            db_path: Path to SQLite database for usage tracking
        """
        self.plan_type = plan_type
        self.db_path = db_path
        
        # Initialize components
        self.usage_tracker = UsageTracker(db_path)
        self.session_planner = SessionPlanner()
        self.calendar_integration = CalendarIntegration()
        self.model_optimizer = ModelOptimizer()
        
        # Weekly limits based on plan
        self.limits = {
            "pro": {"sonnet_hours": 80, "opus_hours": 0, "cost_cap": 100},
            "max_100": {"sonnet_hours": 280, "opus_hours": 35, "cost_cap": 300},
            "max_200": {"sonnet_hours": 480, "opus_hours": 40, "cost_cap": 500}
        }.get(plan_type, {"sonnet_hours": 80, "opus_hours": 0, "cost_cap": 100})
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize the usage tracking database"""
        conn = sqlite3.connect(self.db_path)
        
        # Sessions table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                session_type TEXT,
                model_used TEXT,
                total_cost_usd REAL,
                duration_ms INTEGER,
                num_turns INTEGER,
                efficiency_score REAL,
                project_name TEXT
            )
        ''')
        
        # Weekly usage tracking
        conn.execute('''
            CREATE TABLE IF NOT EXISTS weekly_usage (
                week_start DATE PRIMARY KEY,
                sonnet_hours REAL DEFAULT 0,
                opus_hours REAL DEFAULT 0,
                total_cost_usd REAL DEFAULT 0,
                sessions_count INTEGER DEFAULT 0
            )
        ''')
        
        # Project analysis cache
        conn.execute('''
            CREATE TABLE IF NOT EXISTS project_analysis (
                project_path TEXT PRIMARY KEY,
                analysis_json TEXT,
                created_at TIMESTAMP,
                complexity_score INTEGER
            )
        ''')
        
        conn.commit()
        conn.close()
    
    async def analyze_and_plan_project(self, 
                                     project_path: str, 
                                     deadline: Optional[datetime] = None) -> Dict:
        """
        AI-powered project analysis and automatic scheduling
        
        Step 1: Analyze codebase complexity
        Step 2: Generate optimal session blocks
        Step 3: Schedule in calendar with appropriate models
        Step 4: Create monitoring dashboard
        
        Args:
            project_path: Path to the project to analyze
            deadline: Optional deadline for project completion
            
        Returns:
            Dict containing analysis, session plan, calendar events, and dashboard info
        """
        
        # Phase 1: Deep Codebase Analysis
        print("🔍 Analyzing project complexity...")
        analysis = await self._analyze_project_complexity(project_path)
        
        # Phase 2: Generate Optimal Session Plan
        print("📋 Generating optimal session plan...")
        session_plan = await self.session_planner.create_session_blocks(analysis, deadline)
        
        # Phase 3: Calendar Integration
        print("📅 Creating calendar events...")
        calendar_events = await self.calendar_integration.create_coding_blocks(session_plan)
        
        # Phase 4: Setup Monitoring
        print("📊 Setting up monitoring dashboard...")
        dashboard_info = self._setup_monitoring(session_plan)
        
        # Cache the analysis
        self._cache_project_analysis(project_path, analysis)
        
        return {
            "analysis": analysis,
            "session_plan": session_plan,
            "calendar_events": calendar_events,
            "dashboard_info": dashboard_info,
            "estimated_completion": self._calculate_completion_date(session_plan),
            "optimization_summary": self._generate_optimization_summary(analysis, session_plan)
        }
    
    async def _analyze_project_complexity(self, project_path: str) -> ProjectAnalysis:
        """
        Use Claude Code to analyze project and estimate effort
        """
        
        # Check cache first
        cached_analysis = self._get_cached_analysis(project_path)
        if cached_analysis:
            print("📁 Using cached project analysis...")
            return cached_analysis
        
        # Get current usage to determine which model to use
        current_usage = self.usage_tracker.get_weekly_usage()
        
        # Use Opus for complex analysis if available, otherwise Sonnet
        model_recommendation = self.model_optimizer.recommend_model(
            session_type=SessionType.PLANNING,
            complexity_score=8,  # Assume high complexity for analysis
            context_size=100000,  # Large context for codebase analysis
            remaining_quota=current_usage
        )
        
        # Configure Claude with analysis-optimized settings
        options = ClaudeCodeOptions(
            model=f"claude-{model_recommendation['recommended_model']}-4-20250514",
            max_thinking_tokens=10000,
            allowed_tools=["Read", "View", "GlobTool", "Bash"],
            max_turns=5,
            system_prompt="""
            You are an expert software architect and project estimator.
            Analyze this codebase comprehensively and provide:
            1. Complexity score (1-10)
            2. Estimated development phases with hour requirements
            3. Optimal session structure recommendations
            4. Model usage strategy (Sonnet vs Opus for each phase)
            5. Risk factors and mitigation strategies
            
            Be precise and conservative in estimates. Consider technical debt,
            testing requirements, and integration complexity.
            """
        )
        
        async with ClaudeSDKClient(options=options) as client:
            analysis_prompt = f"""
            Analyze the project at: {project_path}
            
            Please provide a comprehensive analysis in this JSON format:
            {{
                "project_name": "string",
                "complexity_score": 1-10,
                "estimated_phases": {{
                    "planning": {{"hours": X, "model": "opus/sonnet", "sessions": X}},
                    "architecture": {{"hours": X, "model": "opus/sonnet", "sessions": X}},
                    "implementation": {{"hours": X, "model": "opus/sonnet", "sessions": X}},
                    "testing": {{"hours": X, "model": "opus/sonnet", "sessions": X}},
                    "optimization": {{"hours": X, "model": "opus/sonnet", "sessions": X}},
                    "documentation": {{"hours": X, "model": "opus/sonnet", "sessions": X}}
                }},
                "risk_factors": ["factor1", "factor2"],
                "recommended_approach": "string",
                "session_structure": {{
                    "planning_blocks": [{{
                        "duration": "hours",
                        "focus": "specific_area",
                        "model": "opus/sonnet",
                        "prerequisites": []
                    }}],
                    "implementation_blocks": [...],
                    "testing_blocks": [...]
                }},
                "total_estimated_hours": X,
                "confidence_level": "high/medium/low"
            }}
            
            Base your analysis on actual file inspection, not assumptions.
            """
            
            response = await client.query(analysis_prompt)
            
            # Parse and validate the JSON response
            try:
                analysis_data = json.loads(self._extract_json_from_response(response.text))
                return self._create_project_analysis(analysis_data, project_path)
            except (json.JSONDecodeError, KeyError) as e:
                print(f"⚠️ Error parsing analysis: {e}")
                # Fallback: create basic analysis
                return self._create_fallback_analysis(project_path)
    
    def _extract_json_from_response(self, response_text: str) -> str:
        """Extract JSON from Claude's response"""
        # Look for JSON in code blocks
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            return response_text[start:end].strip()
        
        # Look for JSON in the response
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        
        if start != -1 and end > start:
            return response_text[start:end]
        
        raise ValueError("No valid JSON found in response")
    
    def _create_project_analysis(self, data: Dict, project_path: str) -> ProjectAnalysis:
        """Create ProjectAnalysis object from parsed data"""
        
        # Add realistic buffer to estimates (AI tends to be optimistic)
        buffer_multiplier = 1.3
        
        for phase in data["estimated_phases"].values():
            if isinstance(phase, dict) and "hours" in phase:
                phase["hours"] = round(phase["hours"] * buffer_multiplier, 1)
                phase["buffer_included"] = True
        
        return ProjectAnalysis(
            project_name=data.get("project_name", "Unknown Project"),
            complexity_score=data.get("complexity_score", 5),
            estimated_phases=data.get("estimated_phases", {}),
            risk_factors=data.get("risk_factors", []),
            recommended_approach=data.get("recommended_approach", "Standard approach"),
            session_structure=data.get("session_structure", {}),
            total_estimated_hours=sum(
                phase.get("hours", 0) for phase in data.get("estimated_phases", {}).values()
                if isinstance(phase, dict)
            ),
            confidence_level=data.get("confidence_level", "medium")
        )
    
    def _create_fallback_analysis(self, project_path: str) -> ProjectAnalysis:
        """Create basic fallback analysis if AI analysis fails"""
        
        return ProjectAnalysis(
            project_name=project_path.split("/")[-1],
            complexity_score=5,
            estimated_phases={
                "planning": {"hours": 2, "model": "opus", "sessions": 1},
                "implementation": {"hours": 8, "model": "sonnet", "sessions": 2},
                "testing": {"hours": 3, "model": "sonnet", "sessions": 1},
                "documentation": {"hours": 2, "model": "sonnet", "sessions": 1}
            },
            risk_factors=["Limited analysis available"],
            recommended_approach="Standard development approach with monitoring",
            session_structure={},
            total_estimated_hours=15,
            confidence_level="low"
        )
    
    def _cache_project_analysis(self, project_path: str, analysis: ProjectAnalysis):
        """Cache project analysis results"""
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            INSERT OR REPLACE INTO project_analysis 
            (project_path, analysis_json, created_at, complexity_score)
            VALUES (?, ?, ?, ?)
        ''', (
            project_path,
            json.dumps(analysis.__dict__, default=str),
            datetime.now(),
            analysis.complexity_score
        ))
        conn.commit()
        conn.close()
    
    def _get_cached_analysis(self, project_path: str) -> Optional[ProjectAnalysis]:
        """Get cached project analysis if available and recent"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute('''
            SELECT analysis_json, created_at FROM project_analysis 
            WHERE project_path = ? AND created_at > ?
        ''', (project_path, datetime.now() - timedelta(days=7)))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            try:
                data = json.loads(result[0])
                return ProjectAnalysis(**data)
            except (json.JSONDecodeError, TypeError):
                pass
        
        return None
    
    def _setup_monitoring(self, session_plan: List) -> Dict:
        """Setup monitoring dashboard for the project"""
        return {
            "dashboard_url": f"http://localhost:8501",  # Streamlit default
            "monitoring_enabled": True,
            "alerts_configured": True,
            "session_tracking": True
        }
    
    def _calculate_completion_date(self, session_plan: List) -> datetime:
        """Calculate estimated project completion date"""
        if not session_plan:
            return datetime.now() + timedelta(days=7)
        
        # Assume 1 session per day on average
        total_sessions = len(session_plan)
        return datetime.now() + timedelta(days=total_sessions)
    
    def _generate_optimization_summary(self, analysis: ProjectAnalysis, session_plan: List) -> Dict:
        """Generate optimization summary and recommendations"""
        
        current_usage = self.usage_tracker.get_weekly_usage()
        
        # Calculate resource allocation
        sonnet_hours = sum(
            block.duration_hours for block in session_plan 
            if hasattr(block, 'model_recommendation') and block.model_recommendation == 'sonnet'
        )
        opus_hours = sum(
            block.duration_hours for block in session_plan 
            if hasattr(block, 'model_recommendation') and block.model_recommendation == 'opus'
        )
        
        return {
            "total_sessions": len(session_plan),
            "estimated_sonnet_usage": sonnet_hours,
            "estimated_opus_usage": opus_hours,
            "quota_utilization": {
                "sonnet": (sonnet_hours / self.limits["sonnet_hours"]) * 100,
                "opus": (opus_hours / self.limits["opus_hours"]) * 100 if self.limits["opus_hours"] > 0 else 0
            },
            "risk_level": "high" if analysis.complexity_score > 7 else "medium" if analysis.complexity_score > 4 else "low",
            "recommendations": self._generate_recommendations(analysis, current_usage)
        }
    
    def _generate_recommendations(self, analysis: ProjectAnalysis, current_usage: Dict) -> List[str]:
        """Generate personalized recommendations"""
        
        recommendations = []
        
        # Usage-based recommendations
        sonnet_usage_pct = (current_usage.get("sonnet_hours", 0) / self.limits["sonnet_hours"]) * 100
        
        if sonnet_usage_pct > 80:
            recommendations.append("⚠️ High Sonnet usage - consider using Opus for complex tasks")
        
        if analysis.complexity_score > 7:
            recommendations.append("🎯 High complexity project - allocate more Opus sessions for architecture")
        
        if analysis.total_estimated_hours > 20:
            recommendations.append("📅 Large project - consider breaking into smaller milestones")
        
        recommendations.append("💡 Monitor efficiency scores and adjust session planning accordingly")
        
        return recommendations

    async def create_optimized_session(self, 
                                     task_type: str,
                                     estimated_duration: Optional[int] = None,
                                     preferred_model: str = "sonnet") -> ClaudeSDKClient:
        """
        Create optimized Claude Code session with usage tracking
        
        Args:
            task_type: Type of task (planning, implementation, testing, etc.)
            estimated_duration: Estimated duration in hours
            preferred_model: Preferred model (sonnet or opus)
            
        Returns:
            Configured ClaudeSDKClient ready for use
        """
        
        # Check weekly limits
        usage = self.usage_tracker.get_weekly_usage()
        
        if usage[f"{preferred_model}_hours"] >= self.limits[f"{preferred_model}_hours"]:
            raise Exception(f"Weekly {preferred_model} limit reached")
        
        # Get optimized configuration
        options = self._get_optimized_options(task_type, preferred_model)
        
        return ClaudeSDKClient(options=options)
    
    def _get_optimized_options(self, task_type: str, model: str) -> ClaudeCodeOptions:
        """Get optimized configuration based on task type"""
        
        base_options = {
            "max_thinking_tokens": 8000,
            "model": f"claude-{model}-4-20250514"
        }
        
        # Task-specific optimizations
        if task_type == "planning":
            base_options.update({
                "max_turns": 3,
                "system_prompt": "You are an expert software architect. Provide concise, actionable plans.",
                "allowed_tools": ["Read", "View"]
            })
        elif task_type == "coding":
            base_options.update({
                "max_turns": 10,
                "allowed_tools": ["Read", "Write", "Bash", "View"],
                "permission_mode": "acceptEdits"
            })
        elif task_type == "testing":
            base_options.update({
                "max_turns": 5,
                "allowed_tools": ["Read", "Write", "Bash"],
                "system_prompt": "Focus on comprehensive testing and validation."
            })
        
        return ClaudeCodeOptions(**base_options)
    
    def get_current_status(self) -> Dict:
        """Get current optimization status and recommendations"""
        
        usage = self.usage_tracker.get_weekly_usage()
        
        return {
            "weekly_usage": usage,
            "limits": self.limits,
            "utilization": {
                "sonnet": (usage["sonnet_hours"] / self.limits["sonnet_hours"]) * 100,
                "opus": (usage["opus_hours"] / self.limits["opus_hours"]) * 100 if self.limits["opus_hours"] > 0 else 0
            },
            "recommendations": self.model_optimizer.get_weekly_recommendations(),
            "efficiency_score": self.usage_tracker.get_weekly_efficiency_score(),
            "days_until_reset": 7 - datetime.now().weekday()
        }
