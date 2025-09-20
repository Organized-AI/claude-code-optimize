"""
Plan command - Simple project complexity analysis and session planning
"""

import click
from pathlib import Path
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config
from src.planning.simple_rules import SimpleProjectAnalyzer, SimpleQuotaManager

@click.command()
@click.argument('project_path', default='.', type=click.Path(exists=True))
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.option('--detailed', is_flag=True,
              help='Show detailed file breakdown')
@click.pass_context
def plan_command(ctx, project_path, format, detailed):
    """
    Simple project planning with file-based analysis
    
    Analyzes project complexity using heuristics:
    - File count and language detection
    - Framework complexity assessment
    - Time estimation and model recommendations
    - Session planning suggestions
    
    Examples:
      cco plan                    # Analyze current directory
      cco plan /path/to/project   # Analyze specific project
      cco plan --detailed         # Show detailed breakdown
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    
    formatter = OutputFormatter(output_format, no_color)
    
    try:
        # Initialize analyzers
        project_analyzer = SimpleProjectAnalyzer()
        
        # Get quota status for context
        config = load_config()
        quota_manager = SimpleQuotaManager(get_database_path(config))
        quota_status = quota_manager.get_traffic_light_status()
        
        # Analyze project complexity
        complexity = project_analyzer.analyze(str(project_path))
        
        if output_format == 'json':
            result = {
                'project_path': str(project_path),
                'complexity': {
                    'level': complexity.level,
                    'estimated_hours': complexity.estimated_hours,
                    'recommended_model': complexity.recommended_model,
                    'suggested_sessions': complexity.suggested_sessions,
                    'reasoning': complexity.reasoning,
                    'confidence': complexity.confidence
                },
                'quota_context': quota_status,
                'file_breakdown': complexity.file_breakdown if detailed else None
            }
            formatter.console.print(json.dumps(result, indent=2))
            return
        
        # Format table output
        formatter.console.print(f"\n[bold]Project Analysis: {Path(project_path).name}[/]")
        formatter.console.print("=" * 50)
        
        # Complexity summary
        complexity_color = {
            'simple': 'green',
            'medium': 'yellow', 
            'complex': 'red'
        }.get(complexity.level, 'white')
        
        formatter.console.print(f"Complexity Level: [{complexity_color}]{complexity.level.title()}[/]")
        formatter.console.print(f"Estimated Time: {complexity.estimated_hours}")
        formatter.console.print(f"Recommended Model: [bold]{complexity.recommended_model.title()}[/]")
        formatter.console.print(f"Suggested Sessions: {complexity.suggested_sessions}")
        formatter.console.print(f"Confidence: {complexity.confidence:.1%}")
        
        # Reasoning
        formatter.console.print(f"\nAnalysis: {complexity.reasoning}")
        
        # Quota context
        quota_emoji = quota_status.get('emoji', '⚪')
        quota_message = quota_status.get('message', 'Unknown')
        formatter.console.print(f"\nQuota Status: {quota_emoji} {quota_message}")
        
        # Adjust recommendation based on quota
        if quota_status.get('status') == 'red' and complexity.recommended_model in ['opus', 'sonnet']:
            formatter.console.print("[yellow]⚠️ Consider using Haiku due to high quota usage[/]")
        elif quota_status.get('status') == 'yellow' and complexity.recommended_model == 'opus':
            formatter.console.print("[yellow]⚠️ Consider using Sonnet instead of Opus to conserve quota[/]")
        
        # Detailed breakdown if requested
        if detailed and complexity.file_breakdown:
            formatter.console.print("\n[bold]File Breakdown:[/]")
            for file_type, count in sorted(complexity.file_breakdown.items(), 
                                         key=lambda x: x[1], reverse=True):
                if count > 0:
                    formatter.console.print(f"  {file_type}: {count} files")
        
        # Planning recommendations
        formatter.console.print("\n[bold]Planning Recommendations:[/]")
        
        if complexity.level == 'complex':
            formatter.console.print("• Break into multiple focused sessions")
            formatter.console.print("• Use Opus for architecture, Sonnet for implementation")
            formatter.console.print("• Plan your approach before starting")
        elif complexity.level == 'medium':
            formatter.console.print("• Focus on one feature at a time")
            formatter.console.print("• Sonnet provides good balance of capability and efficiency")
        else:
            formatter.console.print("• Can likely complete in a single session")
            formatter.console.print("• Consider batching with similar tasks")
        
        # Quota-specific recommendations
        for rec in quota_status.get('recommendations', [])[:2]:
            formatter.console.print(f"• {rec}")
        
    except Exception as e:
        formatter.format_error(f"Failed to analyze project: {str(e)}")
        ctx.exit(1)