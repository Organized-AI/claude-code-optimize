"""
Weekly command - ccusage compatible weekly usage report with quota tracking
"""

import click
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config

@click.command()
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.pass_context
def weekly_command(ctx, format):
    """
    Weekly usage report with quota tracking
    
    Shows this week's Claude Code session usage including:
    - Total sessions and duration 
    - Token usage by model
    - Weekly quota status with traffic lights (🟢🟡🔴)
    - Project breakdown
    - Efficiency metrics
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    api_client = ctx.obj.get('api_client')
    
    formatter = OutputFormatter(output_format, no_color)
    
    # Set database path for fallback
    config = load_config()
    api_client.set_database_path(get_database_path(config))
    
    try:
        # Get weekly report data
        data = api_client.get_weekly_report()
        
        if data:
            formatter.format_weekly_report(data)
        else:
            formatter.format_error("Unable to retrieve weekly data. Check your configuration.")
            ctx.exit(1)
            
    except Exception as e:
        formatter.format_error(f"Failed to get weekly report: {str(e)}")
        ctx.exit(1)