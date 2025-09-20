"""
Daily command - ccusage compatible daily usage report
"""

import click
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config

@click.command()
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.pass_context
def daily_command(ctx, format):
    """
    Daily usage report - ccusage compatible
    
    Shows today's Claude Code session usage including:
    - Total sessions and duration
    - Token usage by model
    - Efficiency metrics
    - Project breakdown
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    api_client = ctx.obj.get('api_client')
    
    formatter = OutputFormatter(output_format, no_color)
    
    # Set database path for fallback
    config = load_config()
    api_client.set_database_path(get_database_path(config))
    
    try:
        # Get daily report data
        data = api_client.get_daily_report()
        
        if data:
            formatter.format_daily_report(data)
        else:
            formatter.format_error("Unable to retrieve daily data. Check your configuration.")
            ctx.exit(1)
            
    except Exception as e:
        formatter.format_error(f"Failed to get daily report: {str(e)}")
        ctx.exit(1)