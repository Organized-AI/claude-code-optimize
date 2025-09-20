"""
Status command - ccusage compatible current session status
"""

import click
from datetime import datetime
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config

@click.command()
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.pass_context
def status_command(ctx, format):
    """
    Current session status
    
    Shows current Claude Code session information:
    - Active session duration and progress
    - Current model and token usage
    - Time remaining until 5-hour limit
    - Last session information if no active session
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    api_client = ctx.obj.get('api_client')
    
    formatter = OutputFormatter(output_format, no_color)
    
    # Set database path for fallback
    config = load_config()
    api_client.set_database_path(get_database_path(config))
    
    try:
        # Get current status
        data = api_client.get_current_status()
        
        if data:
            formatter.format_current_status(data)
            
            # Add 5-hour block context if active session
            if data.get('active_session') and output_format != 'json':
                duration = data.get('duration_hours', 0)
                
                # Show block management tip
                if duration > 4.0:
                    formatter.format_simple_message(
                        "\n💡 Tip: Consider taking a break soon to stay within 5-hour blocks",
                        "yellow"
                    )
                elif duration > 2.0:
                    formatter.format_simple_message(
                        f"\n📊 Current block usage: {duration:.1f}h / 5.0h",
                        "cyan"
                    )
        else:
            formatter.format_error("Unable to retrieve status data. Check your configuration.")
            ctx.exit(1)
            
    except Exception as e:
        formatter.format_error(f"Failed to get status: {str(e)}")
        ctx.exit(1)