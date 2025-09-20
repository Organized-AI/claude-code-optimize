#!/usr/bin/env python3
"""
Claude Code Optimizer CLI - ccusage with superpowers
Enhanced CLI maintaining ccusage compatibility while adding essential power features.
"""

import click
import json
import sys
from pathlib import Path
from typing import Optional

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.cli.commands.daily import daily_command
from src.cli.commands.weekly import weekly_command
from src.cli.commands.sessions import sessions_command
from src.cli.commands.status import status_command
from src.cli.commands.limits import limits_command
from src.cli.commands.plan import plan_command
from src.cli.commands.recommend import recommend_command
from src.cli.commands.optimize import optimize_command
from src.cli.commands.blocks import blocks_command
from src.cli.utils.config import load_config
from src.cli.utils.api_client import APIClient

# Global configuration
CONFIG = load_config()
API_CLIENT = APIClient(CONFIG.get('api_base_url', 'http://localhost:3001'))

@click.group()
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              default='table', help='Output format')
@click.option('--no-color', is_flag=True, help='Disable colored output')
@click.pass_context
def cli(ctx, format, no_color):
    """
    Claude Code Optimizer - ccusage with superpowers
    
    Enhanced session tracking and optimization for Claude Code development.
    Maintains ccusage compatibility while adding intelligent planning features.
    """
    ctx.ensure_object(dict)
    ctx.obj['format'] = format
    ctx.obj['no_color'] = no_color
    ctx.obj['api_client'] = API_CLIENT

# ccusage-compatible commands
cli.add_command(daily_command, name='daily')
cli.add_command(weekly_command, name='weekly') 
cli.add_command(sessions_command, name='sessions')
cli.add_command(status_command, name='status')

# Power features
cli.add_command(limits_command, name='limits')
cli.add_command(plan_command, name='plan')
cli.add_command(recommend_command, name='recommend')
cli.add_command(optimize_command, name='optimize')
cli.add_command(blocks_command, name='blocks')

@cli.command()
@click.pass_context
def version(ctx):
    """Show Claude Code Optimizer version"""
    from src.cli.formatters.output import format_simple_output
    
    version_info = {
        'claude_code_optimizer': '1.0.0',
        'ccusage_compatibility': 'full',
        'features': ['planning', 'optimization', 'quota_management']
    }
    
    if ctx.obj['format'] == 'json':
        click.echo(json.dumps(version_info, indent=2))
    else:
        click.echo("Claude Code Optimizer v1.0.0")
        click.echo("ccusage-compatible with enhanced planning features")

@cli.command()
@click.pass_context  
def help_extended(ctx):
    """Show extended help with examples"""
    from rich.console import Console
    from rich.panel import Panel
    from rich.columns import Columns
    
    console = Console()
    
    # ccusage compatible commands
    ccusage_panel = Panel(
        """[bold green]daily[/]     - Daily usage report
[bold green]weekly[/]    - Weekly usage with quota tracking  
[bold green]sessions[/]  - Session history and filtering
[bold green]status[/]    - Current session status
[bold green]--format json[/] - JSON output for automation""",
        title="[bold blue]ccusage Compatible[/]",
        border_style="blue"
    )
    
    # Power features
    power_panel = Panel(
        """[bold yellow]limits[/]    - 🟢🟡🔴 Weekly quota traffic lights
[bold yellow]plan[/]      - Project complexity analysis
[bold yellow]recommend[/] - Model selection help
[bold yellow]optimize[/]  - Session efficiency tips
[bold yellow]blocks[/]    - 5-hour block management""",
        title="[bold yellow]Power Features[/]",
        border_style="yellow"
    )
    
    console.print("\n[bold]Claude Code Optimizer - ccusage with superpowers[/]\n")
    console.print(Columns([ccusage_panel, power_panel]))
    
    # Examples
    examples_panel = Panel(
        """[dim]# Check daily usage (ccusage compatible)[/]
cco daily

[dim]# Check quota status with traffic lights[/]
cco limits

[dim]# Analyze project complexity[/]
cco plan /path/to/project

[dim]# Get model recommendation[/]
cco recommend "debug complex algorithm"

[dim]# Export data for automation[/]
cco weekly --format json""",
        title="[bold green]Examples[/]",
        border_style="green"
    )
    
    console.print(examples_panel)
    console.print("\n[dim]For detailed help: cco [command] --help[/]")

if __name__ == '__main__':
    cli()