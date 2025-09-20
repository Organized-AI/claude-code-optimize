"""
Sessions command - ccusage compatible session history
"""

import click
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config

@click.command()
@click.option('--days', '-d', default=7, type=int, 
              help='Number of days to show (default: 7)')
@click.option('--project', '-p', help='Filter by project name')
@click.option('--model', '-m', type=click.Choice(['sonnet', 'opus', 'haiku']),
              help='Filter by model')
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.pass_context
def sessions_command(ctx, days, project, model, format):
    """
    Session history and filtering
    
    Shows recent Claude Code sessions with optional filtering:
    - Filter by days, project, or model
    - Session duration and token usage
    - Project and model information
    - Chronological ordering
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    api_client = ctx.obj.get('api_client')
    
    formatter = OutputFormatter(output_format, no_color)
    
    # Set database path for fallback
    config = load_config()
    api_client.set_database_path(get_database_path(config))
    
    try:
        # Get session data
        sessions = api_client.get_sessions(days)
        
        if sessions is None:
            formatter.format_error("Unable to retrieve session data. Check your configuration.")
            ctx.exit(1)
        
        # Apply filters
        filtered_sessions = sessions
        
        if project:
            filtered_sessions = [
                s for s in filtered_sessions 
                if s.get('project_name', '').lower() == project.lower()
            ]
        
        if model:
            filtered_sessions = [
                s for s in filtered_sessions
                if s.get('model', '').lower() == model.lower()
            ]
        
        if not filtered_sessions:
            if project or model:
                formatter.format_simple_message(
                    f"No sessions found matching filters (project: {project}, model: {model})",
                    "yellow"
                )
            else:
                formatter.format_simple_message("No sessions found in the specified time range", "yellow")
        else:
            formatter.format_sessions_list(filtered_sessions)
            
            # Show summary for filtered results
            if project or model:
                total_duration = sum(s.get('duration_hours', 0) for s in filtered_sessions)
                total_tokens = sum(s.get('total_tokens', 0) for s in filtered_sessions)
                
                if output_format != 'json':
                    formatter.format_simple_message(
                        f"\nFiltered Results: {len(filtered_sessions)} sessions, "
                        f"{total_duration:.1f}h total, {total_tokens:,} tokens",
                        "cyan"
                    )
            
    except Exception as e:
        formatter.format_error(f"Failed to get session data: {str(e)}")
        ctx.exit(1)