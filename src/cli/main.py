#!/usr/bin/env python3
"""
Claude Code Power User Optimization CLI
"""
import click
import yaml
from pathlib import Path
from ..core.session_manager import ClaudeCodeSessionManager
from ..core.token_tracker import TokenTracker
from ..analyzers.codebase_analyzer import ProjectAnalyzer

@click.group()
@click.version_option(version='1.0.0')
def cli():
    """Claude Code Power User Optimization CLI"""
    pass

@cli.command()
@click.argument('project_path', type=click.Path(exists=True))
@click.option('--output', '-o', type=click.Choice(['table', 'yaml', 'json']), default='table')
def analyze(project_path, output):
    """Analyze a project for optimal Claude Code sessions"""
    analyzer = ProjectAnalyzer(project_path)
    analysis = analyzer.analyze_project()
    
    if output == 'table':
        click.echo(f"\n🔍 Analysis for: {analysis['project_info']['name']}")
        click.echo("=" * 50)
        
        # Project metrics
        file_info = analysis['file_analysis']
        click.echo(f"📁 Files: {file_info['code_files']} code files, {file_info['total_lines']:,} lines")
        
        complexity = analysis['complexity_metrics']['complexity_score']
        click.echo(f"🧠 Complexity: {complexity:.1%}")
        
        test_info = analysis['test_analysis']
        click.echo(f"🧪 Test Coverage: {test_info['test_ratio']:.1%} ({test_info['coverage_level']})")
        
        # Recommendations
        click.echo(f"\n📅 Recommended Sessions:")
        total_hours = 0
        total_tokens = 0
        
        for i, rec in enumerate(analysis['recommendations'], 1):
            hours = rec['duration'] / 60
            total_hours += hours
            total_tokens += rec['token_estimate']
            
            priority_color = 'red' if rec['priority'] == 'high' else 'yellow' if rec['priority'] == 'medium' else 'green'
            click.echo(f"{i}. ", nl=False)
            click.secho(f"{rec['type'].title()}", fg='cyan', nl=False)
            click.echo(f" - {hours:.1f}h (", nl=False)
            click.secho(f"{rec['priority']}", fg=priority_color, nl=False)
            click.echo(f" priority)")
            click.echo(f"   💡 {rec['reason']}")
            click.echo(f"   🪙 Est. tokens: {rec['token_estimate']:,}")
            click.echo()
        
        click.echo(f"⏱️  Total Time: {total_hours:.1f} hours")
        click.echo(f"🪙  Total Tokens: {total_tokens:,}")
        
    elif output == 'yaml':
        click.echo(yaml.dump(analysis, default_flow_style=False))
    else:
        import json
        click.echo(json.dumps(analysis, indent=2, default=str))

@cli.command()
@click.argument('session_type', type=click.Choice(['planning', 'coding', 'testing', 'review']))
@click.argument('project_path', type=click.Path(exists=True))
def start_session(session_type, project_path):
    """Start a new Claude Code session"""
    manager = ClaudeCodeSessionManager(project_path)
    session = manager.start_session(session_type, project_path)
    
    click.echo(f"🚀 Started {session_type} session")
    click.echo(f"📁 Project: {Path(project_path).name}")
    click.echo(f"🆔 Session ID: {session['id']}")
    click.echo(f"⏱️  Duration: {session['duration']} minutes")
    click.echo(f"🪙  Token Budget: {session['token_budget']:,}")
    click.echo(f"🤖 Model: {session['model']}")

@cli.command()
@click.option('--project', '-p', type=click.Path(exists=True), default='.')
def status(project):
    """Show current token usage and session status"""
    manager = ClaudeCodeSessionManager(project)
    summary = manager.get_token_usage_summary()
    
    click.echo("📊 Claude Code Status")
    click.echo("=" * 30)
    
    usage_pct = summary['usage_percentage']
    if usage_pct > 80:
        color = 'red'
    elif usage_pct > 60:
        color = 'yellow'
    else:
        color = 'green'
    
    click.echo(f"🪙  Weekly Usage: ", nl=False)
    click.secho(f"{summary['total_used']:,}/{summary['weekly_limit']:,}", fg=color, nl=False)
    click.echo(f" ({usage_pct:.1f}%)")
    
    click.echo(f"📈 Sessions: {summary['sessions_this_week']} this week")
    click.echo(f"⏳ Remaining: {summary['remaining']:,} tokens")

@cli.command()
@click.argument('project_path', type=click.Path(exists=True))
def quick_start(project_path):
    """Quick start: analyze and create recommended sessions"""
    click.echo("🚀 Claude Code Quick Start")
    click.echo("=" * 40)
    
    # Analyze project
    analyzer = ProjectAnalyzer(project_path)
    analysis = analyzer.analyze_project()
    
    click.echo(f"📁 Analyzing: {analysis['project_info']['name']}")
    
    # Show quick summary
    complexity = analysis['complexity_metrics']['complexity_score']
    recommendations = analysis['recommendations']
    
    click.echo(f"🧠 Complexity: {complexity:.1%}")
    click.echo(f"📅 Recommended: {len(recommendations)} sessions")
    
    # Ask to create sessions
    if click.confirm('\n🗓️  Create calendar blocks for these sessions?'):
        click.echo("📅 Calendar integration not yet configured")
        click.echo("💡 Run setup-calendar to enable automatic scheduling")
    
    # Show command suggestions
    click.echo(f"\n🔧 Suggested commands:")
    for rec in recommendations[:3]:  # Show first 3
        click.echo(f"   claude-code start-session {rec['type']} {project_path}")

@cli.command()
@click.option('--detailed', '-d', is_flag=True, help='Show detailed breakdown')
@click.option('--project', '-p', type=click.Path(exists=True), default='.')
def tokens(detailed, project):
    """Show token usage metrics for current session"""
    tracker = TokenTracker(project)
    
    # Display summary
    click.echo(tracker.format_cli_summary())
    
    if detailed:
        click.echo("\n📋 DETAILED BREAKDOWN:")
        click.echo("=" * 50)
        
        breakdown = tracker.get_detailed_breakdown()
        for i, op in enumerate(breakdown, 1):
            click.echo(f"\n{i}. {op['operation']} ({op['timestamp']})")
            click.echo(f"   Agent: {op['agent']}")
            click.echo(f"   Model: {op['model']}")
            click.echo(f"   Tokens: {op['tokens']['total']:,} (cached: {op['tokens']['cached']:,})")
            click.echo(f"   Cost: {op['cost']}")
            click.echo(f"   Efficiency: {op['efficiency']}")

@cli.command()
@click.argument('operation_type')
@click.option('--agent', default='claude_code_optimizer')
@click.option('--model', default='claude-3-sonnet')
@click.option('--input-tokens', '-i', type=int, required=True)
@click.option('--output-tokens', '-o', type=int, required=True)
@click.option('--cached-tokens', '-c', type=int, default=0)
def track(operation_type, agent, model, input_tokens, output_tokens, cached_tokens):
    """Track token usage for an operation"""
    tracker = TokenTracker()
    
    metrics = tracker.track_operation(
        operation_type=operation_type,
        agent_name=agent,
        model_used=model,
        tokens_input=input_tokens,
        tokens_output=output_tokens,
        tokens_cached=cached_tokens
    )
    
    click.echo(f"✅ Tracked {operation_type}")
    click.echo(f"   Total tokens: {metrics.tokens_total:,}")
    click.echo(f"   Cost: ${metrics.cost_usd:.4f}")
    click.echo(f"   Efficiency: {metrics.efficiency_score:.1%}")

@cli.command()
def current_session():
    """Show token usage for the current Claude Code session"""
    from ..core.real_time_tracker import LiveTokenMonitor
    
    monitor = LiveTokenMonitor()
    cli_output = monitor.create_token_summary_cli_command()
    click.echo(cli_output)
    
    # Update live metrics
    metrics = monitor.update_dashboard_metrics()
    click.echo("📊 Live metrics updated for dashboard")

@cli.command()
def session_report():
    """Generate complete session report"""
    from ..core.real_time_tracker import LiveTokenMonitor
    
    monitor = LiveTokenMonitor()
    
    # Generate and save full report
    report_file, json_file = monitor.tracker.save_session_report()
    
    click.echo("📄 Complete session report generated:")
    click.echo(f"   Report: {report_file}")
    click.echo(f"   Data: {json_file}")
    
    # Show summary
    summary = monitor.tracker.get_session_summary()
    click.echo(f"\n📊 Session Summary:")
    click.echo(f"   Total Tokens: {summary.total_tokens:,}")
    click.echo(f"   Cost: ${summary.estimated_cost:.4f}")
    click.echo(f"   Duration: {summary.duration_minutes} minutes")
    click.echo(f"   Files Created: {summary.files_created}")

if __name__ == '__main__':
    cli()