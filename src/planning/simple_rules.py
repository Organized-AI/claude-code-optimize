"""
Simple Planning Rules for Claude Code Optimizer
Heuristics-based project analysis and session optimization without AI/ML complexity.
"""

import os
import json
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

@dataclass
class ProjectComplexity:
    """Project complexity analysis result."""
    level: str  # 'simple', 'medium', 'complex'
    estimated_hours: str
    recommended_model: str
    suggested_sessions: int
    reasoning: str
    file_breakdown: Dict[str, int]
    confidence: float

@dataclass
class SessionRecommendation:
    """Session optimization recommendation."""
    optimal_duration: float
    break_points: List[float]
    model_suggestion: str
    efficiency_tips: List[str]
    quota_warning: Optional[str]

class SimpleProjectAnalyzer:
    """Simple heuristics-based project complexity analyzer."""
    
    def __init__(self):
        # Language complexity weights (higher = more complex)
        self.language_complexity = {
            'rust': 3,
            'cpp': 3,
            'c': 3,
            'haskell': 3,
            'scala': 3,
            'typescript': 2,
            'go': 2,
            'java': 2,
            'csharp': 2,
            'swift': 2,
            'javascript': 1,
            'python': 1,
            'ruby': 1,
            'php': 1,
            'html': 0,
            'css': 0,
            'markdown': 0,
            'json': 0,
            'yaml': 0,
            'xml': 0
        }
        
        # Framework complexity indicators
        self.framework_complexity = {
            'react': 2,
            'vue': 2,
            'angular': 3,
            'django': 2,
            'rails': 2,
            'laravel': 2,
            'spring': 3,
            'express': 1,
            'flask': 1,
            'fastapi': 1,
            'kubernetes': 3,
            'docker': 1,
            'tensorflow': 3,
            'pytorch': 3
        }
        
        # File patterns to exclude
        self.exclude_patterns = {
            '.git', '__pycache__', 'node_modules', '.env', 'venv', '.venv',
            'dist', 'build', '.DS_Store', '.vscode', '.idea', 'coverage',
            '.pytest_cache', '.mypy_cache', 'target', 'bin', 'obj'
        }
        
        # File extensions to language mapping
        self.file_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.jsx': 'javascript',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.cxx': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp',
            '.go': 'go',
            '.java': 'java',
            '.cs': 'csharp',
            '.swift': 'swift',
            '.rb': 'ruby',
            '.php': 'php',
            '.html': 'html',
            '.htm': 'html',
            '.css': 'css',
            '.scss': 'css',
            '.sass': 'css',
            '.md': 'markdown',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.xml': 'xml',
            '.hs': 'haskell',
            '.scala': 'scala'
        }
    
    def analyze(self, project_path: str) -> ProjectComplexity:
        """Analyze project complexity using simple heuristics."""
        project_path = Path(project_path)
        
        if not project_path.exists():
            return ProjectComplexity(
                level='unknown',
                estimated_hours='Unknown',
                recommended_model='sonnet',
                suggested_sessions=1,
                reasoning='Project path does not exist',
                file_breakdown={},
                confidence=0.0
            )
        
        # Count files and analyze structure
        file_breakdown = self._count_files_by_type(project_path)
        total_files = sum(file_breakdown.values())
        languages = self._detect_languages(file_breakdown)
        frameworks = self._detect_frameworks(project_path)
        
        # Calculate complexity score
        complexity_score = self._calculate_complexity_score(
            total_files, languages, frameworks, file_breakdown
        )
        
        # Determine complexity level and recommendations
        if complexity_score >= 7:
            level = 'complex'
            estimated_hours = '5+ hours'
            recommended_model = 'opus'
            suggested_sessions = 2
        elif complexity_score >= 4:
            level = 'medium'
            estimated_hours = '3-4 hours' 
            recommended_model = 'sonnet'
            suggested_sessions = 1
        else:
            level = 'simple'
            estimated_hours = '1-2 hours'
            recommended_model = 'sonnet'
            suggested_sessions = 1
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            total_files, languages, frameworks, complexity_score
        )
        
        # Calculate confidence based on analysis depth
        confidence = self._calculate_confidence(total_files, languages)
        
        return ProjectComplexity(
            level=level,
            estimated_hours=estimated_hours,
            recommended_model=recommended_model,
            suggested_sessions=suggested_sessions,
            reasoning=reasoning,
            file_breakdown=file_breakdown,
            confidence=confidence
        )
    
    def _count_files_by_type(self, project_path: Path) -> Dict[str, int]:
        """Count files by type, excluding common non-source directories."""
        file_counts = {}
        
        try:
            for file_path in project_path.rglob('*'):
                if file_path.is_file() and not self._should_exclude(file_path):
                    extension = file_path.suffix.lower()
                    language = self.file_extensions.get(extension, 'other')
                    file_counts[language] = file_counts.get(language, 0) + 1
        except (PermissionError, OSError):
            pass  # Skip inaccessible files
            
        return file_counts
    
    def _should_exclude(self, file_path: Path) -> bool:
        """Check if file should be excluded from analysis."""
        path_str = str(file_path)
        return any(pattern in path_str for pattern in self.exclude_patterns)
    
    def _detect_languages(self, file_breakdown: Dict[str, int]) -> List[str]:
        """Detect programming languages from file breakdown."""
        # Only count languages with meaningful presence
        languages = []
        total_files = sum(file_breakdown.values())
        
        for language, count in file_breakdown.items():
            if language != 'other' and count > 0:
                # Include language if it represents >5% of files or >2 files
                if count > 2 or (total_files > 0 and count / total_files > 0.05):
                    languages.append(language)
        
        return languages
    
    def _detect_frameworks(self, project_path: Path) -> List[str]:
        """Detect frameworks from project structure and files."""
        frameworks = []
        
        try:
            # Check common framework indicators
            framework_indicators = {
                'package.json': ['react', 'vue', 'angular', 'express'],
                'requirements.txt': ['django', 'flask', 'fastapi'],
                'Cargo.toml': ['rust'],
                'pom.xml': ['spring'],
                'Gemfile': ['rails'],
                'composer.json': ['laravel'],
                'Dockerfile': ['docker'],
                'docker-compose.yml': ['docker'],
                'kubernetes.yaml': ['kubernetes'],
                'k8s.yaml': ['kubernetes']
            }
            
            for file_name, possible_frameworks in framework_indicators.items():
                file_path = project_path / file_name
                if file_path.exists():
                    try:
                        content = file_path.read_text().lower()
                        for framework in possible_frameworks:
                            if framework in content:
                                frameworks.append(framework)
                    except (UnicodeDecodeError, PermissionError):
                        continue
                        
            # Check for additional framework files
            for file_path in project_path.rglob('*'):
                if file_path.is_file():
                    name = file_path.name.lower()
                    if 'tensorflow' in name or 'pytorch' in name:
                        frameworks.extend(['tensorflow', 'pytorch'])
                        break
                        
        except (PermissionError, OSError):
            pass
        
        return list(set(frameworks))  # Remove duplicates
    
    def _calculate_complexity_score(
        self, 
        total_files: int, 
        languages: List[str], 
        frameworks: List[str],
        file_breakdown: Dict[str, int]
    ) -> int:
        """Calculate project complexity score."""
        score = 0
        
        # File count factor (0-4 points)
        if total_files > 100:
            score += 4
        elif total_files > 50:
            score += 3
        elif total_files > 20:
            score += 2
        elif total_files > 5:
            score += 1
        
        # Language complexity factor (0-3 points)
        language_score = 0
        for language in languages:
            complexity = self.language_complexity.get(language, 1)
            language_score += complexity
        
        score += min(3, language_score // 2)
        
        # Language diversity factor (0-2 points)
        if len(languages) > 3:
            score += 2
        elif len(languages) > 1:
            score += 1
        
        # Framework complexity factor (0-3 points)
        framework_score = 0
        for framework in frameworks:
            complexity = self.framework_complexity.get(framework, 1)
            framework_score += complexity
        
        score += min(3, framework_score)
        
        # Code-to-config ratio (0-1 points)
        code_files = sum(
            count for lang, count in file_breakdown.items()
            if lang in ['python', 'javascript', 'typescript', 'rust', 'go', 'java', 'cpp']
        )
        config_files = sum(
            count for lang, count in file_breakdown.items()
            if lang in ['json', 'yaml', 'xml']
        )
        
        if config_files > code_files:  # Config-heavy projects can be complex
            score += 1
        
        return score
    
    def _generate_reasoning(
        self, 
        total_files: int, 
        languages: List[str], 
        frameworks: List[str],
        complexity_score: int
    ) -> str:
        """Generate human-readable reasoning for complexity assessment."""
        reasons = []
        
        # File count reasoning
        if total_files > 100:
            reasons.append(f"{total_files} files (large codebase)")
        elif total_files > 50:
            reasons.append(f"{total_files} files (medium codebase)")
        elif total_files > 5:
            reasons.append(f"{total_files} files")
        else:
            reasons.append(f"{total_files} files (small project)")
        
        # Language reasoning
        if languages:
            if len(languages) > 3:
                reasons.append(f"{len(languages)} languages (high diversity)")
            elif len(languages) > 1:
                reasons.append(f"{len(languages)} languages")
            
            # Highlight complex languages
            complex_languages = [
                lang for lang in languages 
                if self.language_complexity.get(lang, 0) >= 3
            ]
            if complex_languages:
                reasons.append(f"complex languages: {', '.join(complex_languages)}")
        
        # Framework reasoning
        if frameworks:
            if len(frameworks) > 2:
                reasons.append(f"multiple frameworks: {', '.join(frameworks)}")
            else:
                reasons.append(f"uses {', '.join(frameworks)}")
        
        return ', '.join(reasons)
    
    def _calculate_confidence(self, total_files: int, languages: List[str]) -> float:
        """Calculate confidence score for the analysis."""
        confidence = 0.5  # Base confidence
        
        # More files = higher confidence
        if total_files > 50:
            confidence += 0.3
        elif total_files > 10:
            confidence += 0.2
        elif total_files > 0:
            confidence += 0.1
        
        # Recognized languages = higher confidence
        recognized_languages = sum(
            1 for lang in languages 
            if lang in self.language_complexity
        )
        confidence += min(0.2, recognized_languages * 0.05)
        
        return min(1.0, confidence)

class SimpleQuotaManager:
    """Simple quota management with traffic light system."""
    
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path
        self.sonnet_limit = 432  # hours per week
        self.opus_limit = 36     # hours per week
        
        # Traffic light thresholds
        self.green_threshold = 70   # percent
        self.yellow_threshold = 85  # percent
    
    def get_traffic_light_status(self) -> Dict[str, Any]:
        """Get current quota status with traffic light indicators."""
        usage = self._get_weekly_usage()
        
        sonnet_percent = (usage['sonnet'] / self.sonnet_limit) * 100
        opus_percent = (usage['opus'] / self.opus_limit) * 100
        max_percent = max(sonnet_percent, opus_percent)
        
        if max_percent > self.yellow_threshold:
            status = 'red'
            emoji = '🔴'
            message = 'Critical - Use with extreme caution'
            recommendations = [
                'Switch to Haiku for simple tasks',
                'Consider shorter sessions',
                'Plan remaining work carefully'
            ]
        elif max_percent > self.green_threshold:
            status = 'yellow'
            emoji = '🟡'
            message = 'Warning - Plan sessions carefully'
            recommendations = [
                'Prefer Sonnet over Opus when possible',
                'Monitor usage closely',
                'Consider project prioritization'
            ]
        else:
            status = 'green'
            emoji = '🟢'
            message = 'Safe - Normal usage recommended'
            recommendations = [
                'All models available for optimal results',
                'Normal usage patterns recommended'
            ]
        
        return {
            'status': status,
            'emoji': emoji,
            'message': message,
            'sonnet_percent': sonnet_percent,
            'opus_percent': opus_percent,
            'max_percent': max_percent,
            'usage': usage,
            'recommendations': recommendations,
            'week_remaining': self._get_week_remaining_hours()
        }
    
    def _get_weekly_usage(self) -> Dict[str, float]:
        """Get current week's usage by model."""
        if not self.db_path or not self.db_path.exists():
            return {'sonnet': 0, 'opus': 0, 'haiku': 0}
        
        try:
            today = datetime.now().date()
            week_start = today - timedelta(days=today.weekday())
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT 
                        model,
                        SUM(CAST((julianday(end_time) - julianday(start_time)) * 24 AS REAL)) as duration_hours
                    FROM sessions 
                    WHERE DATE(start_time) >= ?
                    GROUP BY model
                """, (week_start,))
                
                usage = {'sonnet': 0, 'opus': 0, 'haiku': 0}
                for row in cursor.fetchall():
                    model = row[0].lower()
                    duration = row[1] or 0
                    if model in usage:
                        usage[model] = duration
                
                return usage
                
        except Exception:
            return {'sonnet': 0, 'opus': 0, 'haiku': 0}
    
    def _get_week_remaining_hours(self) -> int:
        """Get hours remaining in current week."""
        today = datetime.now().date()
        week_end = today + timedelta(days=(6 - today.weekday()))
        hours_remaining = (week_end - today).days * 24
        return max(0, hours_remaining)

class SimpleSessionOptimizer:
    """Simple session optimization based on historical data."""
    
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path
    
    def recommend_session(
        self, 
        task_description: str, 
        project_complexity: ProjectComplexity,
        quota_status: Dict[str, Any]
    ) -> SessionRecommendation:
        """Generate session recommendations based on task and context."""
        
        # Model recommendation based on complexity and quota
        model_suggestion = self._recommend_model(project_complexity, quota_status)
        
        # Duration recommendation
        optimal_duration = self._recommend_duration(project_complexity, quota_status)
        
        # Break points for long sessions
        break_points = self._recommend_break_points(optimal_duration)
        
        # Efficiency tips
        efficiency_tips = self._generate_efficiency_tips(task_description, project_complexity)
        
        # Quota warning if needed
        quota_warning = self._generate_quota_warning(quota_status)
        
        return SessionRecommendation(
            optimal_duration=optimal_duration,
            break_points=break_points,
            model_suggestion=model_suggestion,
            efficiency_tips=efficiency_tips,
            quota_warning=quota_warning
        )
    
    def _recommend_model(
        self, 
        complexity: ProjectComplexity,
        quota_status: Dict[str, Any]
    ) -> str:
        """Recommend model based on complexity and quota status."""
        # Check quota status first
        if quota_status.get('status') == 'red':
            return 'haiku'  # Conservative choice
        
        # Use complexity recommendation but adjust for quota
        recommended = complexity.recommended_model
        
        if quota_status.get('status') == 'yellow':
            if recommended == 'opus':
                return 'sonnet'  # Step down from Opus to Sonnet
        
        return recommended
    
    def _recommend_duration(
        self, 
        complexity: ProjectComplexity,
        quota_status: Dict[str, Any]
    ) -> float:
        """Recommend session duration."""
        # Base duration from complexity
        if complexity.level == 'complex':
            base_duration = 4.0
        elif complexity.level == 'medium':
            base_duration = 2.5
        else:
            base_duration = 1.5
        
        # Adjust for quota status
        if quota_status.get('status') == 'red':
            base_duration = min(base_duration, 2.0)  # Limit to 2 hours
        elif quota_status.get('status') == 'yellow':
            base_duration = min(base_duration, 3.0)  # Limit to 3 hours
        
        # Never exceed 5-hour limit
        return min(base_duration, 4.5)
    
    def _recommend_break_points(self, duration: float) -> List[float]:
        """Recommend break points during session."""
        break_points = []
        
        if duration >= 2.0:
            # Break every 90 minutes for long sessions
            current = 1.5
            while current < duration - 0.5:
                break_points.append(current)
                current += 1.5
        
        # Always suggest break before 5-hour limit
        if duration >= 4.0:
            break_points.append(4.0)
        
        return break_points
    
    def _generate_efficiency_tips(
        self, 
        task_description: str,
        complexity: ProjectComplexity
    ) -> List[str]:
        """Generate efficiency tips based on task and complexity."""
        tips = []
        
        # General tips based on complexity
        if complexity.level == 'complex':
            tips.extend([
                "Break complex tasks into smaller, focused sessions",
                "Use Opus for architectural decisions, Sonnet for implementation",
                "Plan your approach before starting the session"
            ])
        elif complexity.level == 'medium':
            tips.extend([
                "Focus on one feature or module at a time",
                "Use Sonnet for balanced performance and cost"
            ])
        else:
            tips.extend([
                "Batch similar small tasks together",
                "Consider using Haiku for simple edits and documentation"
            ])
        
        # Task-specific tips
        task_lower = task_description.lower()
        
        if any(word in task_lower for word in ['debug', 'fix', 'error']):
            tips.append("Use step-by-step debugging approach")
        
        if any(word in task_lower for word in ['refactor', 'optimize']):
            tips.append("Focus on one optimization at a time")
        
        if any(word in task_lower for word in ['test', 'testing']):
            tips.append("Write tests incrementally as you develop")
        
        if any(word in task_lower for word in ['documentation', 'docs']):
            tips.append("Consider using Haiku for documentation tasks")
        
        return tips[:3]  # Limit to 3 most relevant tips
    
    def _generate_quota_warning(self, quota_status: Dict[str, Any]) -> Optional[str]:
        """Generate quota warning if needed."""
        status = quota_status.get('status')
        max_percent = quota_status.get('max_percent', 0)
        
        if status == 'red':
            return f"⚠️ Critical quota usage ({max_percent:.1f}%) - Consider switching to Haiku"
        elif status == 'yellow':
            return f"⚠️ High quota usage ({max_percent:.1f}%) - Monitor session length"
        
        return None