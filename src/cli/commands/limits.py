"""
Limits command - Traffic light quota status with warnings
"""

import click
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config

@click.command()
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.option('--predict', is_flag=True,
              help='Show quota exhaustion predictions')
@click.pass_context
def limits_command(ctx, format, predict):
    """
    🟢🟡🔴 Weekly quota status with traffic lights
    
    Shows Claude Code weekly quota usage with visual indicators:
    - 🟢 GREEN: Safe usage (<70% of limit)
    - 🟡 YELLOW: Warning usage (70-85% of limit)  
    - 🔴 RED: Critical usage (>85% of limit)
    
    Includes detailed breakdown by model and actionable recommendations.
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    api_client = ctx.obj.get('api_client')
    
    formatter = OutputFormatter(output_format, no_color)
    
    # Set database path for fallback
    config = load_config()
    api_client.set_database_path(get_database_path(config))
    
    try:
        # Get weekly limits data
        data = api_client.get_weekly_limits()
        
        if data:
            formatter.format_traffic_light_status(data)
            
            # Add prediction if requested
            if predict and output_format != 'json':
                _show_quota_predictions(formatter, data)
                
        else:
            formatter.format_error("Unable to retrieve quota data. Check your configuration.")
            ctx.exit(1)
            
    except Exception as e:
        formatter.format_error(f"Failed to get quota limits: {str(e)}")
        ctx.exit(1)

def _show_quota_predictions(formatter: OutputFormatter, data: dict):
    """Show quota exhaustion predictions."""
    usage = data.get('usage', {})
    
    # Simple prediction based on current usage rate
    from datetime import datetime, timedelta
    
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    days_elapsed = (today - week_start).days + 1
    days_remaining = 7 - days_elapsed
    
    if days_remaining <= 0:
        formatter.format_simple_message("\n📅 Week ending - quotas reset soon", "cyan")
        return
    
    formatter.format_simple_message("\n📊 Quota Predictions:", "cyan")
    
    for model in ['sonnet', 'opus']:
        if model in usage:
            used = usage[model]
            limit = {'sonnet': 432, 'opus': 36}[model]
            
            if used > 0 and days_elapsed > 0:
                daily_rate = used / days_elapsed
                projected_total = used + (daily_rate * days_remaining)
                projected_percent = (projected_total / limit) * 100
                
                if projected_percent > 100:
                    status = "🚨 Will exceed limit"
                elif projected_percent > 85:
                    status = "⚠️ Approaching limit"
                else:
                    status = "✅ On track"
                
                formatter.format_simple_message(
                    f"  {model.title()}: {projected_total:.1f}h projected ({projected_percent:.1f}%) {status}",
                    "white"
                )