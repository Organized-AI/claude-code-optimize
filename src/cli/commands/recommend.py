"""
Recommend command - Model selection help based on task description
"""

import click
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config
from src.planning.simple_rules import SimpleProjectAnalyzer, SimpleQuotaManager, SimpleSessionOptimizer, ProjectComplexity

@click.command()
@click.argument('task_description')
@click.option('--project', '-p', type=click.Path(exists=True),
              help='Project path for context analysis')
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.pass_context
def recommend_command(ctx, task_description, project, format):
    """
    Model selection help based on task description
    
    Provides intelligent model recommendations considering:
    - Task complexity keywords
    - Project context (if provided)
    - Current quota status
    - Session optimization
    
    Examples:
      cco recommend "debug authentication issue"
      cco recommend "implement new feature" --project /path/to/code
      cco recommend "write documentation"
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    
    formatter = OutputFormatter(output_format, no_color)
    
    try:
        # Initialize components
        config = load_config()
        quota_manager = SimpleQuotaManager(get_database_path(config))
        session_optimizer = SimpleSessionOptimizer(get_database_path(config))
        
        # Get quota status
        quota_status = quota_manager.get_traffic_light_status()
        
        # Analyze project if provided
        project_complexity = None
        if project:
            project_analyzer = SimpleProjectAnalyzer()
            project_complexity = project_analyzer.analyze(str(project))
        else:
            # Default complexity for task-only analysis
            project_complexity = ProjectComplexity(
                level='medium',
                estimated_hours='2-3 hours',
                recommended_model='sonnet',
                suggested_sessions=1,
                reasoning='No project context provided',
                file_breakdown={},
                confidence=0.5
            )
        
        # Get session recommendation
        session_rec = session_optimizer.recommend_session(
            task_description, project_complexity, quota_status
        )
        
        # Task-specific model recommendation
        task_model = _analyze_task_complexity(task_description)
        
        # Final recommendation considering all factors
        final_model = _get_final_recommendation(
            task_model, 
            project_complexity.recommended_model,
            session_rec.model_suggestion,
            quota_status
        )
        
        if output_format == 'json':
            result = {
                'task': task_description,
                'recommended_model': final_model,
                'reasoning': _generate_recommendation_reasoning(
                    task_description, task_model, project_complexity, quota_status
                ),
                'session_duration': session_rec.optimal_duration,
                'break_points': session_rec.break_points,
                'efficiency_tips': session_rec.efficiency_tips,
                'quota_warning': session_rec.quota_warning,
                'project_context': {
                    'complexity': project_complexity.level,
                    'path': str(project) if project else None
                } if project else None
            }
            formatter.console.print(json.dumps(result, indent=2))
            return
        
        # Format table output
        formatter.console.print(f"\n[bold]Recommendation for: \"{task_description}\"[/]")
        formatter.console.print("=" * 60)
        
        # Main recommendation
        model_color = {'haiku': 'cyan', 'sonnet': 'green', 'opus': 'yellow'}.get(final_model, 'white')
        formatter.console.print(f"Recommended Model: [{model_color}]{final_model.title()}[/]")
        formatter.console.print(f"Suggested Duration: {session_rec.optimal_duration:.1f} hours")
        
        # Reasoning
        reasoning = _generate_recommendation_reasoning(
            task_description, task_model, project_complexity, quota_status
        )
        formatter.console.print(f"\nReasoning: {reasoning}")
        
        # Quota context
        quota_emoji = quota_status.get('emoji', '⚪')
        quota_message = quota_status.get('message', 'Unknown')
        formatter.console.print(f"Quota Status: {quota_emoji} {quota_message}")
        
        if session_rec.quota_warning:
            formatter.console.print(f"[yellow]{session_rec.quota_warning}[/]")
        
        # Break points for long sessions
        if session_rec.break_points:
            formatter.console.print(f"\nSuggested Breaks: {', '.join(f'{bp:.1f}h' for bp in session_rec.break_points)}")
        
        # Efficiency tips
        if session_rec.efficiency_tips:
            formatter.console.print("\n[bold]Efficiency Tips:[/]")
            for tip in session_rec.efficiency_tips:
                formatter.console.print(f"• {tip}")
        
        # Project context if available
        if project:
            formatter.console.print(f"\n[dim]Project Context: {project_complexity.level} complexity ({project_complexity.reasoning})[/]")
        
    except Exception as e:
        formatter.format_error(f"Failed to generate recommendation: {str(e)}")
        ctx.exit(1)

def _analyze_task_complexity(task_description: str) -> str:
    """Analyze task complexity from description keywords."""
    task_lower = task_description.lower()
    
    # High complexity keywords
    high_complexity_keywords = [
        'architecture', 'design', 'refactor', 'optimize', 'algorithm',
        'complex', 'integrate', 'system', 'framework', 'migrate'
    ]
    
    # Medium complexity keywords
    medium_complexity_keywords = [
        'implement', 'feature', 'function', 'debug', 'fix', 'enhance',
        'improve', 'update', 'modify', 'create'
    ]
    
    # Low complexity keywords
    low_complexity_keywords = [
        'documentation', 'docs', 'comment', 'readme', 'format',
        'style', 'lint', 'typo', 'rename', 'move'
    ]
    
    # Score based on keyword matches
    high_score = sum(1 for keyword in high_complexity_keywords if keyword in task_lower)
    medium_score = sum(1 for keyword in medium_complexity_keywords if keyword in task_lower)
    low_score = sum(1 for keyword in low_complexity_keywords if keyword in task_lower)
    
    if high_score > 0:
        return 'opus'
    elif low_score > medium_score:
        return 'haiku'
    else:
        return 'sonnet'

def _get_final_recommendation(
    task_model: str,
    project_model: str, 
    quota_model: str,
    quota_status: dict
) -> str:
    """Get final model recommendation considering all factors."""
    
    # In critical quota situation, always use most conservative option
    if quota_status.get('status') == 'red':
        return 'haiku'
    
    # In warning quota situation, avoid Opus
    if quota_status.get('status') == 'yellow':
        if task_model == 'opus':
            return 'sonnet'
        return task_model
    
    # Normal quota - use task-based recommendation primarily
    # but consider project context for tie-breaking
    if task_model == 'sonnet' and project_model == 'opus':
        return 'opus'  # Upgrade for complex projects
    
    return task_model

def _generate_recommendation_reasoning(
    task: str,
    task_model: str,
    project_complexity: ProjectComplexity,
    quota_status: dict
) -> str:
    """Generate human-readable reasoning for the recommendation."""
    reasons = []
    
    # Task-based reasoning
    task_lower = task.lower()
    if any(word in task_lower for word in ['architecture', 'design', 'complex']):
        reasons.append("high-complexity task")
    elif any(word in task_lower for word in ['documentation', 'docs', 'comment']):
        reasons.append("documentation task")
    elif any(word in task_lower for word in ['debug', 'fix']):
        reasons.append("debugging task")
    elif any(word in task_lower for word in ['implement', 'feature']):
        reasons.append("implementation task")
    
    # Project context
    if project_complexity.level != 'medium':  # Only mention if not default
        reasons.append(f"{project_complexity.level} project")
    
    # Quota influence
    if quota_status.get('status') == 'red':
        reasons.append("critical quota usage")
    elif quota_status.get('status') == 'yellow':
        reasons.append("high quota usage")
    
    return ', '.join(reasons) if reasons else "balanced approach recommended"