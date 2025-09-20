#!/usr/bin/env python3
"""
Real-time token tracking for live Claude Code sessions
"""
import json
import time
from datetime import datetime
from pathlib import Path
from .session_token_tracker import CurrentSessionTracker

class LiveTokenMonitor:
    """Monitor and update token usage in real-time"""
    
    def __init__(self):
        self.tracker = CurrentSessionTracker()
        self.last_update = datetime.now()
        
    def generate_live_report(self) -> str:
        """Generate live token usage report"""
        report = self.tracker.format_detailed_report()
        
        # Add real-time info
        current_time = datetime.now()
        time_since_start = (current_time - self.tracker.start_time).total_seconds() / 60
        
        live_info = [
            "",
            "🔴 LIVE SESSION STATUS",
            "=" * 30,
            f"Current Time: {current_time.strftime('%Y-%m-%d %H:%M:%S')}",
            f"Session Duration: {time_since_start:.1f} minutes",
            f"Average Tokens/Minute: {self.tracker.get_session_summary().total_tokens / max(time_since_start, 1):,.0f}",
            f"Last Updated: {self.last_update.strftime('%H:%M:%S')}"
        ]
        
        return report + "\n" + "\n".join(live_info)
    
    def update_dashboard_metrics(self):
        """Update metrics for dashboard display"""
        summary = self.tracker.get_session_summary()
        
        metrics = {
            "live_session": {
                "session_id": summary.session_id,
                "duration_minutes": summary.duration_minutes,
                "total_tokens": summary.total_tokens,
                "estimated_cost": summary.estimated_cost,
                "files_created": summary.files_created,
                "efficiency_score": summary.efficiency_score,
                "last_update": datetime.now().isoformat()
            }
        }
        
        # Save for dashboard pickup
        with open(".live_session_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2)
        
        return metrics
    
    def create_token_summary_cli_command(self):
        """Create CLI command to show current session"""
        summary = self.tracker.get_session_summary()
        
        cli_output = f"""
🎯 CURRENT SESSION TOKENS
========================
Session: {summary.session_id}
Duration: {summary.duration_minutes} min
Messages: {summary.total_messages} ({summary.user_messages} user + {summary.assistant_messages} assistant)

💰 TOKEN USAGE:
Input:  {summary.total_input_tokens:,} tokens
Output: {summary.total_output_tokens:,} tokens  
Total:  {summary.total_tokens:,} tokens
Cost:   ${summary.estimated_cost:.4f}

🔨 WORK DONE:
Files Created: {summary.files_created}
Files Modified: {summary.files_modified}
Tool Calls: {sum(m.tool_calls for m in self.tracker.messages)}

⚡ EFFICIENCY: {summary.efficiency_score:.1%}
"""
        return cli_output

def run_live_monitor():
    """Run the live monitoring system"""
    monitor = LiveTokenMonitor()
    
    print("🔴 Starting Live Token Monitor...")
    print("=" * 50)
    
    # Generate current report
    report = monitor.generate_live_report()
    print(report)
    
    # Save reports
    report_file, json_file = monitor.tracker.save_session_report()
    
    # Update dashboard
    metrics = monitor.update_dashboard_metrics()
    
    # Show CLI command output
    cli_output = monitor.create_token_summary_cli_command()
    print(cli_output)
    
    print(f"\n✅ Live monitoring active")
    print(f"📄 Report: {report_file}")
    print(f"📊 Data: {json_file}")
    print(f"🖥️  Dashboard: .live_session_metrics.json")

if __name__ == "__main__":
    run_live_monitor()