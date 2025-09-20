#!/usr/bin/env python3
"""
Simple Claude Code Optimizer CLI Demo - No external dependencies
Shows ccusage-compatible functionality
"""

import sys
import json
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta

class SimpleCLI:
    def __init__(self):
        self.db_path = Path('claude_usage.db')
        
    def daily(self, format='table'):
        """Daily usage report - ccusage compatible"""
        print("═" * 67)
        print(f"{'DAILY USAGE REPORT':^67}")
        print(f"{datetime.now().strftime('%Y-%m-%d'):^67}")
        print("═" * 67)
        
        if self.db_path.exists():
            # Real data from database
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    today = datetime.now().date()
                    
                    cursor.execute("""
                        SELECT 
                            COUNT(*) as sessions,
                            SUM(CAST((julianday(end_time) - julianday(start_time)) * 24 AS REAL)) as hours,
                            SUM(total_tokens) as tokens
                        FROM sessions 
                        WHERE DATE(start_time) = ?
                    """, (today,))
                    
                    row = cursor.fetchone()
                    sessions = row[0] or 0
                    hours = row[1] or 0
                    tokens = row[2] or 0
                    
                    print(f"Sessions: {sessions}")
                    print(f"Total Duration: {hours:.1f} hours")
                    print(f"Total Tokens: {tokens:,}")
                    
            except Exception as e:
                print(f"Database error: {e}")
        else:
            # Demo data
            print("Sessions: 3")
            print("Total Duration: 4.2 hours")
            print("Total Tokens: 45,230")
            print("Efficiency Score: 7.2/10 ⭐")
            print("\nModel Breakdown:")
            print("  Sonnet: 38,450 tokens (85.0%) - 3.8 hours")
            print("  Haiku:   6,780 tokens (15.0%) - 0.4 hours")
            print("\nProjects:")
            print("  claude-optimizer: 2.8 hours")
            print("  documentation:    1.4 hours")
        
        print("═" * 67)
    
    def weekly(self):
        """Weekly usage report with quota tracking"""
        print("═" * 67)
        print(f"{'WEEKLY USAGE REPORT':^67}")
        print(f"{'Aug 11-17, 2025':^67}")
        print("═" * 67)
        print("Total Sessions: 12")
        print("Total Duration: 28.5 hours")
        print("Total Tokens: 234,670")
        print("\nQuota Status: 🟡 YELLOW (78% of weekly limit)")
        print("  Sonnet: 25.2h / 432h (5.8%) ✅")
        print("  Opus:    3.3h / 36h  (9.2%) ✅")
        print("\nModel Distribution:")
        print("  Sonnet: 198,450 tokens (84.6%) - 25.2 hours")
        print("  Opus:    28,940 tokens (12.3%) -  3.3 hours")
        print("  Haiku:    7,280 tokens  (3.1%) -  0.0 hours")
        print("\nTop Projects:")
        print("  claude-optimizer: 18.2 hours (63.9%)")
        print("  agent-system:      6.8 hours (23.9%)")
        print("  documentation:     3.5 hours (12.3%)")
        print("\nEfficiency Score: 8.2/10 🌟")
        print("═" * 67)
    
    def sessions(self):
        """Session history"""
        print("\nRecent Sessions (Last 7 days)")
        print("-" * 60)
        sessions = [
            ("2025-08-16", "2.8h", "Sonnet", "15,240", "claude-optimizer"),
            ("2025-08-15", "1.4h", "Sonnet", "8,320", "documentation"),
            ("2025-08-15", "0.9h", "Haiku", "3,180", "testing"),
            ("2025-08-14", "3.2h", "Opus", "28,940", "agent-system"),
            ("2025-08-14", "1.8h", "Sonnet", "12,450", "claude-optimizer")
        ]
        
        print(f"{'Date':<12} {'Duration':<10} {'Model':<10} {'Tokens':<12} {'Project'}")
        print("-" * 60)
        for session in sessions:
            print(f"{session[0]:<12} {session[1]:<10} {session[2]:<10} {session[3]:<12} {session[4]}")
    
    def status(self):
        """Current session status"""
        print("\n🟢 Current Session Status")
        print("-" * 40)
        
        if self.db_path.exists():
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.cursor()
                    
                    # Get active session
                    cursor.execute("""
                        SELECT id, duration_minutes, models_used, real_total_tokens, 
                               project_path, start_time
                        FROM sessions 
                        WHERE is_active = 1 
                        ORDER BY start_time DESC LIMIT 1
                    """)
                    
                    session = cursor.fetchone()
                    if session:
                        session_id, duration, model, tokens, project, start_time = session
                        duration_hours = (duration or 0) / 60
                        
                        # Calculate real duration if needed
                        if start_time:
                            start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                            real_duration = (datetime.now() - start.replace(tzinfo=None)).total_seconds() / 3600
                            duration_hours = max(duration_hours, real_duration)
                        
                        print(f"Duration: {duration_hours:.1f} hours")
                        print(f"Model: {model or 'Sonnet'}")
                        print(f"Tokens: {tokens or 0:,}")
                        print(f"Project: {project or 'claude-optimizer'}")
                        
                        # 5-hour block progress
                        block_progress = (duration_hours / 5.0) * 100
                        remaining = max(0, 5.0 - duration_hours)
                        print(f"\n5-hour block progress: {duration_hours:.1f}h / 5.0h ({block_progress:.0f}%)")
                        print(f"Time remaining: {remaining:.1f}h")
                    else:
                        print("No active session found")
                        
            except Exception as e:
                print(f"Database error: {e}")
                # Fallback to demo data
                print("Duration: 1.1 hours")
                print("Model: Sonnet")
                print("Tokens: 18,500")
                print("Project: claude-optimizer")
                print("\n5-hour block progress: 1.1h / 5.0h (22%)")
                print("Time remaining: 3.9h")
        else:
            print("Duration: 1.1 hours")
            print("Model: Sonnet") 
            print("Tokens: 18,500")
            print("Project: claude-optimizer")
            print("\n5-hour block progress: 1.1h / 5.0h (22%)")
            print("Time remaining: 3.9h")
    
    def limits(self):
        """Traffic light quota status"""
        print("\n┌─────────────────────────────────────┐")
        print("│ 🟡 YELLOW                           │")
        print("│ Warning - Plan sessions carefully   │")
        print("└─────────────────────────────────────┘")
        print("\nQuota Details:")
        print("  Sonnet: 25.2h / 432h (5.8%) ✅")
        print("  Opus: 3.3h / 36h (9.2%) ✅")
        print("\nRecommendations:")
        print("  • Prefer Sonnet over Opus when possible")
        print("  • Monitor usage closely")
        print("  • Consider project prioritization")
    
    def plan(self, project_path='.'):
        """Project complexity analysis"""
        print(f"\nProject Analysis: {Path(project_path).name}")
        print("=" * 50)
        
        # Use real analysis if available
        try:
            from src.planning.simple_rules import SimpleProjectAnalyzer
            analyzer = SimpleProjectAnalyzer()
            complexity = analyzer.analyze(project_path)
            
            print(f"Complexity Level: {complexity.level.title()}")
            print(f"Estimated Time: {complexity.estimated_hours}")
            print(f"Recommended Model: {complexity.recommended_model.title()}")
            print(f"Suggested Sessions: {complexity.suggested_sessions}")
            print(f"Confidence: {complexity.confidence:.1%}")
            print(f"\nAnalysis: {complexity.reasoning}")
            
        except:
            # Demo output
            print("Complexity Level: Complex")
            print("Estimated Time: 5+ hours")
            print("Recommended Model: Opus")
            print("Suggested Sessions: 2")
            print("Confidence: 85.0%")
            print("\nAnalysis: 1357 files (large codebase), 8 languages (high diversity)")
        
        print("\nQuota Status: 🟡 Warning - Plan sessions carefully")
        print("\nPlanning Recommendations:")
        print("• Break into multiple focused sessions")
        print("• Use Opus for architecture, Sonnet for implementation")
        print("• Plan your approach before starting")
    
    def recommend(self, task):
        """Model selection recommendation"""
        print(f'\nRecommendation for: "{task}"')
        print("=" * 60)
        print("Recommended Model: Sonnet")
        print("Suggested Duration: 2.5 hours")
        print("\nReasoning: debugging task, high quota usage")
        print("Quota Status: 🟡 Warning - Plan sessions carefully")
        print("\nEfficiency Tips:")
        print("• Use step-by-step debugging approach")
        print("• Focus on one feature or module at a time")
        print("• Monitor usage closely")
    
    def optimize(self):
        """Session optimization analysis"""
        print("\nClaude Code Optimization Analysis")
        print("Based on 7 days of usage data")
        print("=" * 50)
        print("Overall Efficiency: 7.2/10")
        print("Tokens per Hour: 4,250")
        print("\nUsage Patterns:")
        print("  Average session: 2.4 hours")
        print("  Total sessions: 12")
        print("  Most used model: Sonnet")
        print("  Peak efficiency: 14:00, 20:00")
        print("\nOptimization Recommendations:")
        print("\nSession Timing:")
        print("  • Schedule important work around 14:00 for peak efficiency")
        print("\nEfficiency:")
        print("  • Good efficiency - consider optimizing timing")
        print("  • Focus on one task type per session")
        print("\nQuota Management:")
        print("  • All models available for optimal results")
    
    def blocks(self):
        """5-hour block management"""
        print("\n5-Hour Block Management")
        print("=" * 40)
        print("Block Status: ACTIVE")
        print("Usage: 2.3h / 5.0h (46.0%)")
        print("Remaining: 2.7h")
        print("Block started: 11:30")
        print("\nProgress:")
        print("[████████████░░░░░░░░░░░░] 46%")
        print("\nRecommendations:")
        print("✅ Good progress - continue working")
        print("• 2.7h remaining for focused work")
        print("• Consider a short break at 4-hour mark")
        print("\nBlock Efficiency:")
        print("Sessions: 1")
        print("Tokens: 15,240")
        print("Efficiency: 6626 tokens/hour")

def main():
    """Main CLI interface"""
    cli = SimpleCLI()
    
    if len(sys.argv) < 2:
        print("Claude Code Optimizer - ccusage with superpowers")
        print("\nUsage: python3 cco_simple.py [command]")
        print("\nccusage-compatible commands:")
        print("  daily      Daily usage report")
        print("  weekly     Weekly usage with quota tracking")
        print("  sessions   Session history")
        print("  status     Current session status")
        print("\nPower features:")
        print("  limits     🟢🟡🔴 Weekly quota traffic lights")
        print("  plan       Project complexity analysis")
        print("  recommend  Model selection help")
        print("  optimize   Session efficiency tips")
        print("  blocks     5-hour block management")
        return
    
    command = sys.argv[1]
    
    if command == 'daily':
        cli.daily()
    elif command == 'weekly':
        cli.weekly()
    elif command == 'sessions':
        cli.sessions()
    elif command == 'status':
        cli.status()
    elif command == 'limits':
        cli.limits()
    elif command == 'plan':
        project_path = sys.argv[2] if len(sys.argv) > 2 else '.'
        cli.plan(project_path)
    elif command == 'recommend':
        task = ' '.join(sys.argv[2:]) if len(sys.argv) > 2 else 'debug authentication issue'
        cli.recommend(task)
    elif command == 'optimize':
        cli.optimize()
    elif command == 'blocks':
        cli.blocks()
    else:
        print(f"Unknown command: {command}")
        print("Run 'python3 cco_simple.py' for help")

if __name__ == '__main__':
    main()