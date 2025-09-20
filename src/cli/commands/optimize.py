"""
Optimize command - Session efficiency tips and recommendations
"""

import click
import sqlite3
from datetime import datetime, timedelta
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config

@click.command()
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.option('--days', default=7, type=int,
              help='Days of history to analyze (default: 7)')
@click.pass_context
def optimize_command(ctx, format, days):
    """
    Session efficiency tips and optimization recommendations
    
    Analyzes your Claude Code usage patterns to provide:
    - Efficiency metrics and trends
    - Optimal session timing recommendations
    - Model usage optimization suggestions
    - Quota management tips
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    
    formatter = OutputFormatter(output_format, no_color)
    
    try:
        # Get configuration and database
        config = load_config()
        db_path = get_database_path(config)
        
        if not db_path.exists():
            formatter.format_error("No usage data found. Start using Claude Code to get optimization tips.")
            ctx.exit(1)
        
        # Analyze usage patterns
        analysis = _analyze_usage_patterns(db_path, days)
        
        if output_format == 'json':
            formatter.console.print(json.dumps(analysis, indent=2))
            return
        
        # Format table output
        formatter.console.print(f"\n[bold]Claude Code Optimization Analysis[/]")
        formatter.console.print(f"[dim]Based on {days} days of usage data[/]")
        formatter.console.print("=" * 50)
        
        # Overall efficiency
        efficiency = analysis['efficiency']
        efficiency_color = 'green' if efficiency['score'] >= 7 else 'yellow' if efficiency['score'] >= 4 else 'red'
        formatter.console.print(f"Overall Efficiency: [{efficiency_color}]{efficiency['score']:.1f}/10[/]")
        formatter.console.print(f"Tokens per Hour: {efficiency['tokens_per_hour']:,.0f}")
        
        # Usage patterns
        patterns = analysis['patterns']
        formatter.console.print(f"\nUsage Patterns:")
        formatter.console.print(f"  Average session: {patterns['avg_session_duration']:.1f} hours")
        formatter.console.print(f"  Total sessions: {patterns['total_sessions']}")
        formatter.console.print(f"  Most used model: {patterns['dominant_model'].title()}")
        
        # Timing analysis
        if analysis['timing']['best_hours']:
            best_hours = ', '.join(f"{h}:00" for h in analysis['timing']['best_hours'][:3])
            formatter.console.print(f"  Peak efficiency: {best_hours}")
        
        # Optimization recommendations
        recommendations = analysis['recommendations']
        if recommendations:
            formatter.console.print(f"\n[bold]Optimization Recommendations:[/]")
            
            for category, tips in recommendations.items():
                if tips:
                    formatter.console.print(f"\n[bold]{category.replace('_', ' ').title()}:[/]")
                    for tip in tips:
                        formatter.console.print(f"  • {tip}")
        
        # Quota insights
        quota = analysis['quota_insights']
        if quota:
            formatter.console.print(f"\n[bold]Quota Management:[/]")
            formatter.console.print(f"  Weekly usage trend: {quota['trend']}")
            formatter.console.print(f"  Efficiency vs quota: {quota['efficiency_ratio']}")
            
            if quota['suggestions']:
                for suggestion in quota['suggestions']:
                    formatter.console.print(f"  • {suggestion}")
        
        # Model optimization
        model_opt = analysis['model_optimization']
        if model_opt['suggestions']:
            formatter.console.print(f"\n[bold]Model Usage Optimization:[/]")
            for suggestion in model_opt['suggestions']:
                formatter.console.print(f"  • {suggestion}")
        
    except Exception as e:
        formatter.format_error(f"Failed to generate optimization analysis: {str(e)}")
        ctx.exit(1)

def _analyze_usage_patterns(db_path, days: int) -> dict:
    """Analyze usage patterns from database."""
    try:
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Date range
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            # Get session data
            cursor.execute("""
                SELECT 
                    session_id,
                    start_time,
                    end_time,
                    model,
                    total_tokens,
                    CAST((julianday(end_time) - julianday(start_time)) * 24 AS REAL) as duration_hours,
                    strftime('%H', start_time) as start_hour
                FROM sessions 
                WHERE DATE(start_time) >= ? AND end_time IS NOT NULL
                ORDER BY start_time
            """, (start_date,))
            
            sessions = cursor.fetchall()
            
            if not sessions:
                return {
                    'efficiency': {'score': 0, 'tokens_per_hour': 0},
                    'patterns': {'total_sessions': 0, 'avg_session_duration': 0, 'dominant_model': 'unknown'},
                    'timing': {'best_hours': []},
                    'recommendations': {},
                    'quota_insights': {},
                    'model_optimization': {'suggestions': []}
                }
            
            # Calculate metrics
            analysis = {
                'efficiency': _calculate_efficiency_metrics(sessions),
                'patterns': _analyze_session_patterns(sessions),
                'timing': _analyze_timing_patterns(sessions),
                'recommendations': {},
                'quota_insights': _analyze_quota_insights(sessions),
                'model_optimization': _analyze_model_usage(sessions)
            }
            
            # Generate recommendations
            analysis['recommendations'] = _generate_optimization_recommendations(analysis)
            
            return analysis
            
    except Exception as e:
        return {'error': str(e)}

def _calculate_efficiency_metrics(sessions) -> dict:
    """Calculate efficiency metrics from session data."""
    total_duration = sum(s['duration_hours'] or 0 for s in sessions)
    total_tokens = sum(s['total_tokens'] or 0 for s in sessions)
    
    if total_duration <= 0:
        return {'score': 0, 'tokens_per_hour': 0}
    
    tokens_per_hour = total_tokens / total_duration
    # Normalize to 1-10 scale (1000 tokens/hour = score of 1)
    efficiency_score = min(10.0, tokens_per_hour / 1000)
    
    return {
        'score': efficiency_score,
        'tokens_per_hour': tokens_per_hour
    }

def _analyze_session_patterns(sessions) -> dict:
    """Analyze session usage patterns."""
    if not sessions:
        return {'total_sessions': 0, 'avg_session_duration': 0, 'dominant_model': 'unknown'}
    
    total_sessions = len(sessions)
    durations = [s['duration_hours'] or 0 for s in sessions]
    avg_duration = sum(durations) / len(durations) if durations else 0
    
    # Find dominant model
    model_counts = {}
    for session in sessions:
        model = session['model']
        model_counts[model] = model_counts.get(model, 0) + 1
    
    dominant_model = max(model_counts, key=model_counts.get) if model_counts else 'unknown'
    
    return {
        'total_sessions': total_sessions,
        'avg_session_duration': avg_duration,
        'dominant_model': dominant_model,
        'model_distribution': model_counts
    }

def _analyze_timing_patterns(sessions) -> dict:
    """Analyze optimal timing patterns."""
    if not sessions:
        return {'best_hours': []}
    
    # Calculate efficiency by hour
    hour_efficiency = {}
    
    for session in sessions:
        hour = session['start_hour']
        duration = session['duration_hours'] or 0
        tokens = session['total_tokens'] or 0
        
        if duration > 0:
            efficiency = tokens / duration
            if hour not in hour_efficiency:
                hour_efficiency[hour] = []
            hour_efficiency[hour].append(efficiency)
    
    # Average efficiency by hour
    hour_averages = {}
    for hour, efficiencies in hour_efficiency.items():
        if len(efficiencies) >= 2:  # Only include hours with multiple sessions
            hour_averages[hour] = sum(efficiencies) / len(efficiencies)
    
    # Sort by efficiency
    best_hours = sorted(hour_averages.keys(), key=hour_averages.get, reverse=True)
    
    return {
        'best_hours': best_hours[:3],  # Top 3 hours
        'hour_efficiency': hour_averages
    }

def _analyze_quota_insights(sessions) -> dict:
    """Analyze quota usage patterns."""
    if not sessions:
        return {}
    
    # Weekly quota analysis
    weekly_usage = {'sonnet': 0, 'opus': 0, 'haiku': 0}
    
    for session in sessions:
        model = session['model'].lower()
        duration = session['duration_hours'] or 0
        if model in weekly_usage:
            weekly_usage[model] += duration
    
    total_weekly = sum(weekly_usage.values())
    
    # Efficiency vs quota ratio
    total_tokens = sum(s['total_tokens'] or 0 for s in sessions)
    efficiency_ratio = "High" if total_tokens / max(total_weekly, 1) > 5000 else "Medium" if total_tokens / max(total_weekly, 1) > 2000 else "Low"
    
    # Usage trend (simplified)
    trend = "Increasing" if total_weekly > 10 else "Moderate" if total_weekly > 5 else "Light"
    
    suggestions = []
    if weekly_usage['opus'] > weekly_usage['sonnet']:
        suggestions.append("Consider using Sonnet more often to conserve Opus quota")
    if total_weekly > 20:
        suggestions.append("High usage detected - monitor quota limits closely")
    
    return {
        'weekly_usage': weekly_usage,
        'trend': trend,
        'efficiency_ratio': efficiency_ratio,
        'suggestions': suggestions
    }

def _analyze_model_usage(sessions) -> dict:
    """Analyze model usage patterns and suggest optimizations."""
    if not sessions:
        return {'suggestions': []}
    
    model_stats = {}
    
    for session in sessions:
        model = session['model']
        duration = session['duration_hours'] or 0
        tokens = session['total_tokens'] or 0
        
        if model not in model_stats:
            model_stats[model] = {'duration': 0, 'tokens': 0, 'sessions': 0}
        
        model_stats[model]['duration'] += duration
        model_stats[model]['tokens'] += tokens
        model_stats[model]['sessions'] += 1
    
    suggestions = []
    
    # Analyze model efficiency
    for model, stats in model_stats.items():
        if stats['duration'] > 0:
            efficiency = stats['tokens'] / stats['duration']
            
            if model.lower() == 'opus' and efficiency < 3000:
                suggestions.append(f"Opus sessions have low efficiency ({efficiency:.0f} tokens/hour) - consider Sonnet for routine tasks")
            elif model.lower() == 'haiku' and stats['sessions'] > len(sessions) * 0.5:
                suggestions.append("High Haiku usage - consider upgrading to Sonnet for better capabilities")
    
    # Check for underutilized models
    if 'haiku' not in [s['model'].lower() for s in sessions]:
        suggestions.append("Consider using Haiku for documentation and simple tasks")
    
    return {'suggestions': suggestions}

def _generate_optimization_recommendations(analysis) -> dict:
    """Generate optimization recommendations based on analysis."""
    recommendations = {
        'session_timing': [],
        'efficiency': [],
        'model_usage': [],
        'quota_management': []
    }
    
    # Session timing recommendations
    if analysis['timing']['best_hours']:
        best_hour = analysis['timing']['best_hours'][0]
        recommendations['session_timing'].append(f"Schedule important work around {best_hour}:00 for peak efficiency")
    
    avg_duration = analysis['patterns']['avg_session_duration']
    if avg_duration > 4:
        recommendations['session_timing'].append("Consider shorter sessions to maintain focus and avoid 5-hour limits")
    elif avg_duration < 1:
        recommendations['session_timing'].append("Longer sessions might improve efficiency for complex tasks")
    
    # Efficiency recommendations
    efficiency_score = analysis['efficiency']['score']
    if efficiency_score < 4:
        recommendations['efficiency'].extend([
            "Break complex tasks into smaller, focused sessions",
            "Prepare clear objectives before starting sessions",
            "Use appropriate model for task complexity"
        ])
    elif efficiency_score < 7:
        recommendations['efficiency'].extend([
            "Good efficiency - consider optimizing session timing",
            "Focus on one task type per session"
        ])
    
    # Model usage recommendations
    dominant_model = analysis['patterns']['dominant_model']
    if dominant_model.lower() == 'opus':
        recommendations['model_usage'].append("High Opus usage - consider Sonnet for routine development tasks")
    elif dominant_model.lower() == 'haiku':
        recommendations['model_usage'].append("Consider upgrading to Sonnet for more complex tasks")
    
    # Quota management
    quota_insights = analysis.get('quota_insights', {})
    if quota_insights.get('trend') == 'Increasing':
        recommendations['quota_management'].append("Usage trend increasing - monitor weekly limits")
    
    return recommendations