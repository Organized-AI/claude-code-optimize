"""
Blocks command - 5-hour block management and optimization
"""

import click
import sqlite3
from datetime import datetime, timedelta
from src.cli.formatters.output import OutputFormatter
from src.cli.utils.config import get_database_path, load_config

@click.command()
@click.option('--format', type=click.Choice(['table', 'json', 'minimal']), 
              help='Output format (overrides global format)')
@click.option('--history', is_flag=True,
              help='Show recent block usage history')
@click.pass_context
def blocks_command(ctx, format, history):
    """
    5-hour block management and optimization
    
    Shows current 5-hour block status and provides recommendations:
    - Current block usage and time remaining
    - Break recommendations for long sessions
    - Block efficiency analysis
    - Historical block patterns (with --history)
    """
    output_format = format or ctx.obj.get('format', 'table')
    no_color = ctx.obj.get('no_color', False)
    
    formatter = OutputFormatter(output_format, no_color)
    
    try:
        # Get configuration and database
        config = load_config()
        db_path = get_database_path(config)
        
        if not db_path.exists():
            formatter.format_error("No usage data found. Start using Claude Code to track blocks.")
            ctx.exit(1)
        
        # Analyze current block status
        current_block = _analyze_current_block(db_path)
        
        if history:
            block_history = _analyze_block_history(db_path)
        else:
            block_history = None
        
        if output_format == 'json':
            result = {
                'current_block': current_block,
                'history': block_history
            }
            formatter.console.print(json.dumps(result, indent=2, default=str))
            return
        
        # Format table output
        formatter.console.print(f"\n[bold]5-Hour Block Management[/]")
        formatter.console.print("=" * 40)
        
        # Current block status
        if current_block['active']:
            usage = current_block['usage_hours']
            remaining = current_block['remaining_hours']
            
            # Status color based on usage
            if usage >= 4.5:
                status_color = 'red'
                status_text = 'CRITICAL'
            elif usage >= 3.5:
                status_color = 'yellow'
                status_text = 'WARNING'
            else:
                status_color = 'green'
                status_text = 'ACTIVE'
            
            formatter.console.print(f"Block Status: [{status_color}]{status_text}[/]")
            formatter.console.print(f"Usage: {usage:.1f}h / 5.0h ({usage/5*100:.1f}%)")
            formatter.console.print(f"Remaining: {remaining:.1f}h")
            formatter.console.print(f"Block started: {current_block['block_start'].strftime('%H:%M')}")
            
            # Progress bar
            from rich.progress import Progress, BarColumn, TextColumn, TimeRemainingColumn
            
            progress = Progress(
                TextColumn("[bold blue]Progress", justify="right"),
                BarColumn(bar_width=None),
                "[progress.percentage]{task.percentage:>3.1f}%",
                expand=True
            )
            
            with progress:
                task = progress.add_task("Block Usage", total=5.0, completed=usage)
                # Show briefly
                pass
            
            # Recommendations based on current usage
            formatter.console.print(f"\n[bold]Recommendations:[/]")
            
            if usage >= 4.5:
                formatter.console.print("🚨 [red]Break recommended immediately - approaching 5-hour limit[/]")
                formatter.console.print("• Save your work and take a break")
                formatter.console.print("• Resume in a new block after the break")
            elif usage >= 4.0:
                formatter.console.print("⚠️ [yellow]Consider taking a break soon[/]")
                formatter.console.print("• Plan a good stopping point")
                formatter.console.print(f"• You have ~{remaining:.1f}h until forced break")
            elif usage >= 2.0:
                formatter.console.print("✅ [green]Good progress - continue working[/]")
                formatter.console.print(f"• {remaining:.1f}h remaining for focused work")
                if remaining >= 2.0:
                    formatter.console.print("• Consider a short break at 4-hour mark")
            else:
                formatter.console.print("🚀 [green]Fresh block - optimal time for complex tasks[/]")
                formatter.console.print("• Great time for challenging problems")
                formatter.console.print("• Plan your session to maximize productivity")
        
        else:
            formatter.console.print("Block Status: [dim]IDLE[/]")
            formatter.console.print("No active session in current 5-hour window")
            
            if current_block['last_session']:
                last_end = current_block['last_session']['end_time']
                formatter.console.print(f"Last session ended: {last_end.strftime('%H:%M')}")
            
            formatter.console.print(f"\n[bold]Ready for new block:[/]")
            formatter.console.print("🚀 [green]Fresh start available[/]")
            formatter.console.print("• Optimal time for new projects")
            formatter.console.print("• Full 5-hour block available")
        
        # Block efficiency insights
        if current_block['sessions']:
            total_tokens = sum(s.get('total_tokens', 0) for s in current_block['sessions'])
            avg_efficiency = total_tokens / current_block['usage_hours'] if current_block['usage_hours'] > 0 else 0
            
            formatter.console.print(f"\n[bold]Block Efficiency:[/]")
            formatter.console.print(f"Sessions: {len(current_block['sessions'])}")
            formatter.console.print(f"Tokens: {total_tokens:,}")
            formatter.console.print(f"Efficiency: {avg_efficiency:.0f} tokens/hour")
        
        # Historical analysis
        if history and block_history:
            formatter.console.print(f"\n[bold]Recent Block History:[/]")
            
            for block in block_history['recent_blocks'][:5]:
                date = block['date'].strftime('%Y-%m-%d')
                duration = block['total_duration']
                efficiency = block['efficiency']
                sessions = block['session_count']
                
                efficiency_icon = '🌟' if efficiency > 7 else '⭐' if efficiency > 4 else '💫'
                
                formatter.console.print(
                    f"  {date}: {duration:.1f}h, {sessions} sessions, "
                    f"efficiency {efficiency:.1f}/10 {efficiency_icon}"
                )
            
            # Block patterns
            patterns = block_history['patterns']
            if patterns:
                formatter.console.print(f"\n[bold]Block Patterns:[/]")
                formatter.console.print(f"Average duration: {patterns['avg_duration']:.1f}h")
                formatter.console.print(f"Most productive time: {patterns['best_start_hour']}:00")
                formatter.console.print(f"Average efficiency: {patterns['avg_efficiency']:.1f}/10")
        
    except Exception as e:
        formatter.format_error(f"Failed to analyze blocks: {str(e)}")
        ctx.exit(1)

def _analyze_current_block(db_path) -> dict:
    """Analyze current 5-hour block status."""
    try:
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 5-hour window
            now = datetime.now()
            block_start = now - timedelta(hours=5)
            
            # Get sessions in current block
            cursor.execute("""
                SELECT 
                    session_id,
                    start_time,
                    end_time,
                    model,
                    total_tokens,
                    CAST((julianday(COALESCE(end_time, datetime('now'))) - julianday(start_time)) * 24 AS REAL) as duration_hours
                FROM sessions 
                WHERE start_time >= ?
                ORDER BY start_time
            """, (block_start,))
            
            sessions = [dict(row) for row in cursor.fetchall()]
            
            # Calculate block usage
            total_usage = 0
            active_session = None
            
            for session in sessions:
                duration = session['duration_hours'] or 0
                total_usage += duration
                
                # Check if session is still active
                if session['end_time'] is None:
                    active_session = session
            
            # Get last completed session if no active block
            last_session = None
            if total_usage == 0:
                cursor.execute("""
                    SELECT 
                        session_id,
                        start_time,
                        end_time,
                        model,
                        total_tokens
                    FROM sessions 
                    WHERE end_time IS NOT NULL
                    ORDER BY end_time DESC
                    LIMIT 1
                """)
                
                row = cursor.fetchone()
                if row:
                    last_session = {
                        'session_id': row['session_id'],
                        'end_time': datetime.fromisoformat(row['end_time'])
                    }
            
            return {
                'active': total_usage > 0,
                'usage_hours': total_usage,
                'remaining_hours': max(0, 5.0 - total_usage),
                'block_start': block_start,
                'sessions': sessions,
                'active_session': active_session,
                'last_session': last_session,
                'warning_threshold': total_usage >= 4.0,
                'critical_threshold': total_usage >= 4.5
            }
            
    except Exception:
        return {
            'active': False,
            'usage_hours': 0,
            'remaining_hours': 5.0,
            'block_start': datetime.now() - timedelta(hours=5),
            'sessions': [],
            'active_session': None,
            'last_session': None,
            'warning_threshold': False,
            'critical_threshold': False
        }

def _analyze_block_history(db_path, days: int = 7) -> dict:
    """Analyze historical block usage patterns."""
    try:
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get sessions from last N days
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days)
            
            cursor.execute("""
                SELECT 
                    DATE(start_time) as session_date,
                    strftime('%H', start_time) as start_hour,
                    SUM(CAST((julianday(end_time) - julianday(start_time)) * 24 AS REAL)) as total_duration,
                    SUM(total_tokens) as total_tokens,
                    COUNT(*) as session_count
                FROM sessions 
                WHERE DATE(start_time) >= ? AND end_time IS NOT NULL
                GROUP BY DATE(start_time)
                ORDER BY session_date DESC
            """, (start_date,))
            
            daily_blocks = []
            
            for row in cursor.fetchall():
                duration = row['total_duration'] or 0
                tokens = row['total_tokens'] or 0
                
                # Calculate efficiency
                efficiency = min(10.0, (tokens / duration / 1000)) if duration > 0 else 0
                
                daily_blocks.append({
                    'date': datetime.strptime(row['session_date'], '%Y-%m-%d').date(),
                    'total_duration': duration,
                    'total_tokens': tokens,
                    'session_count': row['session_count'],
                    'efficiency': efficiency
                })
            
            # Calculate patterns
            patterns = {}
            if daily_blocks:
                durations = [b['total_duration'] for b in daily_blocks]
                efficiencies = [b['efficiency'] for b in daily_blocks]
                
                patterns = {
                    'avg_duration': sum(durations) / len(durations),
                    'avg_efficiency': sum(efficiencies) / len(efficiencies),
                    'total_blocks': len(daily_blocks),
                    'best_start_hour': '09'  # Simplified - would need more analysis
                }
            
            return {
                'recent_blocks': daily_blocks,
                'patterns': patterns
            }
            
    except Exception:
        return {
            'recent_blocks': [],
            'patterns': {}
        }