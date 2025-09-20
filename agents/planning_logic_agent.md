# Planning Logic Specialist Agent

**Agent ID:** planning_logic  
**Specialization:** Algorithm design, optimization heuristics, session planning  
**Mission:** Create simple rule-based planning features without AI/ML complexity

## EXISTING FOUNDATION

You are enhancing a comprehensive Claude Code session tracking system:

### Database Schema (claude_usage.db)
- **sessions table:** Complete session tracking with start/end times, models, tokens
- **token_usage table:** Granular token tracking with timestamps  
- **weekly_quotas table:** Weekly limit management for all models

### Quota System
- **Sonnet:** 432 hours/week limit
- **Opus:** 36 hours/week limit  
- **Haiku:** Unlimited usage
- **Traffic Light System:** Green (<70%), Yellow (70-85%), Red (>85%)

### Analytics Available
- Historical session data with efficiency metrics
- Token usage patterns and trends
- Project-based session tracking
- 5-hour block detection and management
- Model usage distribution analysis

## PLANNING FEATURES REQUIREMENTS

### 1. Project Complexity Detection
Simple heuristics-based analysis without machine learning:

#### File-Based Analysis
```python
def detect_complexity(project_path: str) -> ProjectComplexity:
    file_count = count_files(project_path, exclude_patterns=['.git', 'node_modules', '__pycache__'])
    languages = detect_languages(project_path)
    dependencies = analyze_dependencies(project_path)
    
    # Simple rule-based classification
    complexity_score = 0
    
    # File count factor
    if file_count > 100:
        complexity_score += 3
    elif file_count > 50:
        complexity_score += 2
    elif file_count > 10:
        complexity_score += 1
    
    # Language diversity factor
    complexity_score += min(len(languages) - 1, 2)
    
    # Framework complexity factor
    if has_framework_complexity(dependencies):
        complexity_score += 2
    
    # Classify based on score
    if complexity_score >= 5:
        return ProjectComplexity(
            level="complex",
            estimated_hours="5+ hours",
            recommended_model="opus",
            reasoning=f"{file_count} files, {len(languages)} languages, complex frameworks"
        )
    elif complexity_score >= 3:
        return ProjectComplexity(
            level="medium", 
            estimated_hours="3-4 hours",
            recommended_model="sonnet",
            reasoning=f"{file_count} files, moderate complexity"
        )
    else:
        return ProjectComplexity(
            level="simple",
            estimated_hours="1-2 hours", 
            recommended_model="sonnet",
            reasoning=f"{file_count} files, straightforward structure"
        )
```

#### Language Pattern Recognition
```python
LANGUAGE_COMPLEXITY = {
    'rust': 3,      # Complex syntax and concepts
    'cpp': 3,       # Memory management complexity
    'haskell': 3,   # Functional paradigm complexity
    'typescript': 2, # Type system complexity
    'javascript': 1, # Dynamic but familiar
    'python': 1,    # Generally straightforward
    'html': 0,      # Markup, low complexity
    'css': 0,       # Styling, low complexity
    'markdown': 0   # Documentation, minimal complexity
}

FRAMEWORK_COMPLEXITY = {
    'react': 2,
    'vue': 2, 
    'angular': 3,
    'django': 2,
    'rails': 2,
    'express': 1,
    'flask': 1
}
```

### 2. Weekly Quota Management

#### Traffic Light System Implementation
```python
class QuotaManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.sonnet_limit = 432.0  # hours
        self.opus_limit = 36.0     # hours
    
    def get_current_usage(self) -> Dict[str, float]:
        """Get current week usage in hours."""
        week_start = get_current_week_start()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT model, SUM(duration_hours) as total_hours
                FROM sessions 
                WHERE start_time >= ?
                GROUP BY model
            """, (week_start,))
            
            usage = {'sonnet': 0.0, 'opus': 0.0, 'haiku': 0.0}
            for model, hours in cursor.fetchall():
                usage[model.lower()] = hours
            
            return usage
    
    def get_quota_status(self) -> QuotaStatus:
        """Calculate traffic light status."""
        usage = self.get_current_usage()
        
        sonnet_percent = (usage['sonnet'] / self.sonnet_limit) * 100
        opus_percent = (usage['opus'] / self.opus_limit) * 100
        max_percent = max(sonnet_percent, opus_percent)
        
        if max_percent > 85:
            return QuotaStatus(
                status="red",
                message="Critical - Use with extreme caution",
                sonnet_percent=sonnet_percent,
                opus_percent=opus_percent,
                recommendation="Consider Haiku for simple tasks"
            )
        elif max_percent > 70:
            return QuotaStatus(
                status="yellow", 
                message="Warning - Plan sessions carefully",
                sonnet_percent=sonnet_percent,
                opus_percent=opus_percent,
                recommendation="Monitor usage closely, prefer Sonnet over Opus"
            )
        else:
            return QuotaStatus(
                status="green",
                message="Safe - Normal usage recommended", 
                sonnet_percent=sonnet_percent,
                opus_percent=opus_percent,
                recommendation="All models available for optimal results"
            )
    
    def predict_quota_exhaustion(self) -> Dict[str, Optional[datetime]]:
        """Predict when quotas might be exhausted based on usage patterns."""
        usage = self.get_current_usage()
        weekly_pattern = self.analyze_weekly_pattern()
        
        predictions = {}
        
        for model in ['sonnet', 'opus']:
            current_usage = usage[model]
            limit = self.sonnet_limit if model == 'sonnet' else self.opus_limit
            daily_average = weekly_pattern.get(f'{model}_daily_avg', 0)
            
            if daily_average > 0:
                days_remaining = (limit - current_usage) / daily_average
                if days_remaining <= 7:  # Within current week
                    exhaustion_date = datetime.now() + timedelta(days=days_remaining)
                    predictions[model] = exhaustion_date
                else:
                    predictions[model] = None
            else:
                predictions[model] = None
        
        return predictions
```

### 3. Session Optimization

#### Timing Recommendations
```python
class SessionOptimizer:
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def analyze_personal_efficiency(self) -> Dict[str, Any]:
        """Analyze user's historical efficiency patterns."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Efficiency by time of day
            cursor.execute("""
                SELECT 
                    strftime('%H', start_time) as hour,
                    AVG(tokens_per_minute) as avg_efficiency,
                    COUNT(*) as session_count
                FROM (
                    SELECT 
                        start_time,
                        total_tokens / (duration_hours * 60) as tokens_per_minute
                    FROM sessions 
                    WHERE duration_hours > 0.1
                ) 
                GROUP BY hour
                HAVING session_count >= 3
                ORDER BY avg_efficiency DESC
            """)
            
            efficiency_by_hour = cursor.fetchall()
            
            # Best performing time slots
            if efficiency_by_hour:
                best_hours = [row[0] for row in efficiency_by_hour[:3]]
                return {
                    'best_hours': best_hours,
                    'peak_efficiency': efficiency_by_hour[0][1],
                    'recommendation': f"Schedule complex work during {'-'.join(best_hours)}:00"
                }
            else:
                return {
                    'best_hours': ['09', '14', '20'],  # Default recommendations
                    'peak_efficiency': None,
                    'recommendation': "Insufficient data - try morning, afternoon, or evening sessions"
                }
    
    def recommend_break_points(self, session_duration: float) -> List[float]:
        """Recommend break points within long sessions."""
        break_points = []
        
        if session_duration >= 2.0:
            # Every 90 minutes for long sessions
            current = 1.5
            while current < session_duration - 0.5:
                break_points.append(current)
                current += 1.5
        
        # Always suggest a break before 5-hour mark to avoid timeout
        if session_duration >= 4.5:
            break_points.append(4.5)
        
        return break_points
    
    def suggest_model_for_task(self, task_description: str, project_complexity: str) -> str:
        """Simple rule-based model selection."""
        task_lower = task_description.lower()
        
        # High complexity indicators
        if any(keyword in task_lower for keyword in [
            'architecture', 'refactor', 'design', 'complex', 'algorithm'
        ]):
            return "opus" if project_complexity == "complex" else "sonnet"
        
        # Medium complexity indicators  
        elif any(keyword in task_lower for keyword in [
            'implement', 'feature', 'debug', 'optimize'
        ]):
            return "sonnet"
        
        # Simple task indicators
        elif any(keyword in task_lower for keyword in [
            'fix', 'update', 'comment', 'documentation', 'readme'
        ]):
            return "sonnet"  # Default to Sonnet for reliability
        
        else:
            # Default based on project complexity
            return {
                'complex': 'opus',
                'medium': 'sonnet', 
                'simple': 'sonnet'
            }.get(project_complexity, 'sonnet')
```

### 4. Five-Hour Block Management

#### Block Tracking and Optimization
```python
class BlockManager:
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def detect_current_block_status(self) -> Dict[str, Any]:
        """Detect current 5-hour block status."""
        now = datetime.now()
        five_hours_ago = now - timedelta(hours=5)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT SUM(duration_hours) as total_hours
                FROM sessions
                WHERE start_time >= ? AND start_time <= ?
            """, (five_hours_ago, now))
            
            result = cursor.fetchone()
            current_usage = result[0] if result[0] else 0.0
            
            return {
                'current_usage': current_usage,
                'remaining': max(0, 5.0 - current_usage),
                'status': 'active' if current_usage > 0 else 'idle',
                'warning_threshold': current_usage >= 4.0,
                'block_start': five_hours_ago
            }
    
    def recommend_block_strategy(self, planned_duration: float) -> Dict[str, Any]:
        """Recommend strategy for upcoming session."""
        block_status = self.detect_current_block_status()
        remaining = block_status['remaining']
        
        if planned_duration <= remaining:
            return {
                'strategy': 'continue_block',
                'message': f"Can work {planned_duration:.1f}h in current block ({remaining:.1f}h remaining)",
                'action': 'proceed'
            }
        elif remaining > 1.0:
            return {
                'strategy': 'split_session',
                'message': f"Work {remaining:.1f}h now, then {planned_duration - remaining:.1f}h in new block",
                'action': 'split',
                'first_segment': remaining,
                'second_segment': planned_duration - remaining
            }
        else:
            return {
                'strategy': 'new_block',
                'message': f"Start fresh 5-hour block for {planned_duration:.1f}h session",
                'action': 'wait',
                'wait_time': remaining
            }
    
    def analyze_block_efficiency(self) -> Dict[str, Any]:
        """Analyze historical 5-hour block efficiency."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                WITH block_analysis AS (
                    SELECT 
                        DATE(start_time) as session_date,
                        SUM(duration_hours) as daily_hours,
                        SUM(total_tokens) as daily_tokens,
                        COUNT(*) as session_count
                    FROM sessions
                    GROUP BY DATE(start_time)
                    HAVING daily_hours > 3.0
                )
                SELECT 
                    AVG(daily_tokens / daily_hours) as avg_tokens_per_hour,
                    AVG(session_count) as avg_sessions_per_day,
                    COUNT(*) as productive_days
                FROM block_analysis
            """)
            
            result = cursor.fetchone()
            if result and result[0]:
                return {
                    'avg_tokens_per_hour': result[0],
                    'avg_sessions_per_day': result[1],
                    'productive_days': result[2],
                    'efficiency_score': min(10, (result[0] / 1000) * 2)  # Normalize to 1-10 scale
                }
            else:
                return {
                    'avg_tokens_per_hour': 0,
                    'avg_sessions_per_day': 0,
                    'productive_days': 0,
                    'efficiency_score': 5.0  # Default neutral score
                }
```

## ALGORITHM IMPLEMENTATIONS

### Project Analysis Engine
```python
class ProjectAnalyzer:
    def __init__(self):
        self.file_patterns = {
            'config': ['*.config.js', '*.json', '*.yaml', '*.toml'],
            'test': ['*test*', '*spec*', '__test__*'],
            'documentation': ['*.md', '*.rst', '*.txt'],
            'source': ['*.py', '*.js', '*.ts', '*.rs', '*.go', '*.cpp']
        }
    
    def analyze_project_structure(self, project_path: Path) -> Dict[str, Any]:
        """Comprehensive project structure analysis."""
        structure = {
            'total_files': 0,
            'source_files': 0,
            'test_files': 0,
            'config_files': 0,
            'documentation_files': 0,
            'languages': set(),
            'frameworks': set(),
            'complexity_indicators': []
        }
        
        for file_path in project_path.rglob('*'):
            if file_path.is_file() and not self._should_exclude(file_path):
                structure['total_files'] += 1
                
                # Categorize file
                file_type = self._categorize_file(file_path)
                structure[f'{file_type}_files'] += 1
                
                # Detect language
                language = self._detect_language(file_path)
                if language:
                    structure['languages'].add(language)
                
                # Detect frameworks
                frameworks = self._detect_frameworks(file_path)
                structure['frameworks'].update(frameworks)
        
        # Convert sets to lists for JSON serialization
        structure['languages'] = list(structure['languages'])
        structure['frameworks'] = list(structure['frameworks'])
        
        # Add complexity indicators
        structure['complexity_indicators'] = self._assess_complexity_indicators(structure)
        
        return structure
    
    def _should_exclude(self, file_path: Path) -> bool:
        """Check if file should be excluded from analysis."""
        exclude_patterns = [
            '.git', 'node_modules', '__pycache__', '.env', 
            'venv', '.venv', 'dist', 'build', '.DS_Store'
        ]
        return any(pattern in str(file_path) for pattern in exclude_patterns)
    
    def _detect_frameworks(self, file_path: Path) -> Set[str]:
        """Detect frameworks based on file content and structure."""
        frameworks = set()
        
        if file_path.name == 'package.json':
            # Analyze JavaScript/Node.js frameworks
            try:
                with open(file_path) as f:
                    package_data = json.load(f)
                    dependencies = {**package_data.get('dependencies', {}), 
                                  **package_data.get('devDependencies', {})}
                    
                    framework_map = {
                        'react': 'react',
                        'vue': 'vue',
                        'angular': 'angular',
                        'express': 'express',
                        'next': 'nextjs'
                    }
                    
                    for dep in dependencies:
                        for keyword, framework in framework_map.items():
                            if keyword in dep.lower():
                                frameworks.add(framework)
                                break
            except:
                pass
        
        elif file_path.name == 'requirements.txt' or file_path.name == 'pyproject.toml':
            # Analyze Python frameworks
            try:
                content = file_path.read_text()
                if any(framework in content.lower() for framework in ['django', 'flask', 'fastapi']):
                    if 'django' in content.lower():
                        frameworks.add('django')
                    if 'flask' in content.lower():
                        frameworks.add('flask')
                    if 'fastapi' in content.lower():
                        frameworks.add('fastapi')
            except:
                pass
        
        return frameworks
```

### Optimization Recommender
```python
class OptimizationRecommender:
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    def generate_session_recommendations(self, context: Dict[str, Any]) -> List[str]:
        """Generate actionable optimization recommendations."""
        recommendations = []
        
        # Quota-based recommendations
        quota_status = context.get('quota_status', {})
        if quota_status.get('status') == 'red':
            recommendations.append("🔴 Critical quota usage - Switch to Haiku for simple tasks")
            recommendations.append("⏰ Consider shorter sessions to conserve quota")
        elif quota_status.get('status') == 'yellow':
            recommendations.append("🟡 High quota usage - Prefer Sonnet over Opus when possible")
        
        # Session timing recommendations
        efficiency_data = context.get('efficiency_data', {})
        best_hours = efficiency_data.get('best_hours', [])
        if best_hours:
            recommendations.append(f"⏰ Most productive during {', '.join(best_hours)}:00 hours")
        
        # Block management recommendations
        block_status = context.get('block_status', {})
        if block_status.get('warning_threshold'):
            recommendations.append("⚠️ Approaching 5-hour limit - Plan for break soon")
        
        # Project-specific recommendations
        project_complexity = context.get('project_complexity', {})
        if project_complexity.get('level') == 'complex':
            recommendations.append("🎯 Complex project detected - Consider breaking into smaller sessions")
            recommendations.append("🔧 Use Opus for architectural decisions, Sonnet for implementation")
        
        return recommendations
```

## DELIVERABLES

### 1. Planning Engine Core (`src/planning/`)
- **ProjectAnalyzer** - File-based complexity detection
- **QuotaManager** - Traffic light quota system
- **SessionOptimizer** - Timing and efficiency recommendations
- **BlockManager** - 5-hour block optimization
- **OptimizationRecommender** - Actionable recommendations

### 2. Algorithm Libraries
- **Complexity Detection** - Rule-based project analysis
- **Pattern Recognition** - Language and framework detection
- **Efficiency Analysis** - Historical performance tracking
- **Predictive Models** - Simple quota exhaustion prediction

### 3. Integration APIs
- **CLI Integration** - Endpoints for `cco plan`, `cco recommend`, `cco optimize`
- **Dashboard Integration** - Data for planning widgets and insights
- **Real-time Analysis** - Live session optimization suggestions

### 4. Configuration System
- **Customizable Rules** - User-defined complexity thresholds
- **Personal Patterns** - Individual efficiency learning
- **Project Profiles** - Saved project analysis results

### 5. Documentation
- **Algorithm Documentation** - How planning logic works
- **Customization Guide** - Adjusting rules and thresholds
- **Integration Examples** - Using planning features in workflows

## SUCCESS CRITERIA

### 1. Accurate Analysis
- Project complexity detection matches actual development time within 25%
- Quota predictions accurate within 2 hours for weekly forecasts
- Model recommendations result in appropriate choice 85% of time

### 2. Actionable Insights
- Optimization recommendations are specific and implementable
- Session planning reduces quota overages by 40%
- Break point suggestions improve sustained productivity

### 3. Performance
- All analysis operations complete within 2 seconds
- Minimal database impact from pattern analysis
- Efficient caching of project analysis results

### 4. Integration Excellence
- Seamless integration with CLI and dashboard
- Real-time recommendations during active sessions
- Consistent data across all interfaces

## IMMEDIATE NEXT STEPS

1. **Implement ProjectAnalyzer** - File-based complexity detection
2. **Create QuotaManager** - Traffic light quota system with predictions
3. **Build SessionOptimizer** - Efficiency analysis and timing recommendations
4. **Develop BlockManager** - 5-hour block tracking and optimization
5. **Create integration APIs** - Endpoints for CLI and dashboard
6. **Test algorithm accuracy** - Validate against historical data
7. **Documentation** - Usage guide and customization instructions

The result will be a sophisticated yet simple planning system that helps users optimize their Claude Code sessions through data-driven insights and rule-based recommendations.