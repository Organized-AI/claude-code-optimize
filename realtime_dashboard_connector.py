#!/usr/bin/env python3
"""
Real-Time Dashboard Data Connector
Fetches live session data and updates the dashboard with real metrics
"""

import json
import sqlite3
import time
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

class RealTimeDashboardConnector:
    """Connects dashboard to live Claude session data"""
    
    def __init__(self, 
                 db_path: str = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/session_tracker/claude_usage.db",
                 dashboard_path: str = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/dashboard_embedded_data.html",
                 deployment_path: str = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/vercel-deploy/index.html"):
        
        self.db_path = db_path
        self.dashboard_path = dashboard_path
        self.deployment_path = deployment_path
        
        # Rate limit constants (weekly limits starting August 28, 2025)
        self.WEEKLY_SONNET_LIMIT = 1000000  # 1M tokens per week
        self.WEEKLY_OPUS_LIMIT = 100000     # 100K tokens per week
        self.FIVE_HOUR_LIMIT = 200000       # 200K tokens per 5-hour block
        
        print(f"🔗 Real-Time Dashboard Connector initialized")
        print(f"📊 Database: {self.db_path}")
        print(f"📱 Dashboard: {self.dashboard_path}")
        print(f"🚀 Deployment: {self.deployment_path}")

    def get_database_connection(self) -> sqlite3.Connection:
        """Get database connection with proper error handling"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Enable column access by name
            return conn
        except Exception as e:
            print(f"❌ Database connection error: {e}")
            raise

    def fetch_active_session_data(self) -> Dict[str, Any]:
        """Fetch current active session data"""
        try:
            with self.get_database_connection() as conn:
                # Get active session
                active_session = conn.execute("""
                    SELECT * FROM real_sessions 
                    WHERE is_active = 1 
                    ORDER BY start_time DESC 
                    LIMIT 1
                """).fetchone()
                
                if active_session:
                    return {
                        "activeSessionId": active_session["id"],
                        "realTokens": active_session["real_total_tokens"],
                        "inputTokens": active_session["real_input_tokens"],
                        "outputTokens": active_session["real_output_tokens"],
                        "billableTokens": active_session["billable_tokens"],
                        "cacheCreationTokens": active_session["cache_creation_tokens"],
                        "cacheReadTokens": active_session["cache_read_tokens"],
                        "costEstimate": active_session["cost_estimate"],
                        "modelsUsed": json.loads(active_session["models_used"]) if active_session["models_used"] else [],
                        "startTime": active_session["start_time"],
                        "lastUpdate": active_session["last_token_update"]
                    }
                else:
                    return {
                        "activeSessionId": "No active session",
                        "realTokens": 0,
                        "inputTokens": 0,
                        "outputTokens": 0,
                        "billableTokens": 0,
                        "cacheCreationTokens": 0,
                        "cacheReadTokens": 0,
                        "costEstimate": 0.0,
                        "modelsUsed": [],
                        "startTime": None,
                        "lastUpdate": None
                    }
        except Exception as e:
            print(f"❌ Error fetching session data: {e}")
            return {"error": str(e)}

    def calculate_rate_limit_data(self) -> Dict[str, Any]:
        """Calculate current rate limit usage and projections"""
        try:
            with self.get_database_connection() as conn:
                now = datetime.now()
                
                # Calculate 5-hour block boundaries
                hours_since_midnight = now.hour + now.minute / 60
                current_block_start = int(hours_since_midnight // 5) * 5
                five_hour_start = now.replace(hour=current_block_start, minute=0, second=0, microsecond=0)
                five_hour_end = five_hour_start + timedelta(hours=5)
                
                # Calculate weekly boundaries (Monday to Monday)
                days_since_monday = now.weekday()
                week_start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
                week_end = week_start + timedelta(days=7)
                
                # Get 5-hour block usage
                five_hour_usage = conn.execute("""
                    SELECT 
                        SUM(real_total_tokens) as total_tokens,
                        COUNT(*) as total_sessions,
                        SUM(billable_tokens) as billable_tokens
                    FROM real_sessions 
                    WHERE start_time >= ? AND start_time < ?
                """, (five_hour_start.isoformat(), five_hour_end.isoformat())).fetchone()
                
                # Get weekly usage
                weekly_usage = conn.execute("""
                    SELECT 
                        SUM(real_total_tokens) as total_tokens,
                        COUNT(*) as total_sessions,
                        SUM(CASE WHEN models_used LIKE '%sonnet%' THEN real_total_tokens ELSE 0 END) as sonnet_tokens,
                        SUM(CASE WHEN models_used LIKE '%opus%' THEN real_total_tokens ELSE 0 END) as opus_tokens,
                        SUM(cost_estimate) as total_cost
                    FROM real_sessions 
                    WHERE start_time >= ? AND start_time < ?
                """, (week_start.isoformat(), week_end.isoformat())).fetchone()
                
                # Calculate percentages and remaining time
                five_hour_tokens = five_hour_usage["total_tokens"] or 0
                five_hour_percentage = min((five_hour_tokens / self.FIVE_HOUR_LIMIT) * 100, 100)
                five_hour_remaining_minutes = max(0, int((five_hour_end - now).total_seconds() / 60))
                
                weekly_tokens = weekly_usage["total_tokens"] or 0
                weekly_percentage = min((weekly_tokens / self.WEEKLY_SONNET_LIMIT) * 100, 100)
                weekly_remaining_days = max(0, (week_end - now).days)
                
                return {
                    "fiveHourLimit": {
                        "total_tokens": five_hour_tokens,
                        "total_prompts": five_hour_usage["total_sessions"] or 0,
                        "usage_percentage": round(five_hour_percentage, 1),
                        "time_remaining_minutes": five_hour_remaining_minutes,
                        "limit": self.FIVE_HOUR_LIMIT,
                        "remaining_tokens": max(0, self.FIVE_HOUR_LIMIT - five_hour_tokens)
                    },
                    "weeklyLimit": {
                        "total_tokens": weekly_tokens,
                        "total_sessions": weekly_usage["total_sessions"] or 0,
                        "sonnet_tokens": weekly_usage["sonnet_tokens"] or 0,
                        "opus_tokens": weekly_usage["opus_tokens"] or 0,
                        "usage_percentage": round(weekly_percentage, 1),
                        "days_remaining": weekly_remaining_days,
                        "total_cost": round(weekly_usage["total_cost"] or 0, 2),
                        "limit": self.WEEKLY_SONNET_LIMIT,
                        "remaining_tokens": max(0, self.WEEKLY_SONNET_LIMIT - weekly_tokens)
                    }
                }
        except Exception as e:
            print(f"❌ Error calculating rate limits: {e}")
            return {"error": str(e)}

    def get_analytics_data(self) -> Dict[str, Any]:
        """Get advanced analytics and efficiency metrics"""
        try:
            with self.get_database_connection() as conn:
                # Get session statistics
                stats = conn.execute("""
                    SELECT 
                        COUNT(*) as total_sessions,
                        SUM(real_total_tokens) as total_tokens,
                        AVG(real_total_tokens) as avg_tokens_per_session,
                        SUM(cost_estimate) as total_cost,
                        MAX(start_time) as last_session_time
                    FROM real_sessions
                """).fetchone()
                
                # Get model distribution
                model_usage = conn.execute("""
                    SELECT 
                        models_used,
                        COUNT(*) as session_count,
                        SUM(real_total_tokens) as tokens_used,
                        SUM(cost_estimate) as model_cost
                    FROM real_sessions 
                    WHERE models_used IS NOT NULL
                    GROUP BY models_used
                """).fetchall()
                
                return {
                    "totalSessions": stats["total_sessions"],
                    "totalTokens": stats["total_tokens"],
                    "avgTokensPerSession": round(stats["avg_tokens_per_session"] or 0),
                    "totalCost": round(stats["total_cost"] or 0, 2),
                    "lastSessionTime": stats["last_session_time"],
                    "modelDistribution": [
                        {
                            "models": row["models_used"],
                            "sessions": row["session_count"],
                            "tokens": row["tokens_used"],
                            "cost": round(row["model_cost"] or 0, 2)
                        }
                        for row in model_usage
                    ]
                }
        except Exception as e:
            print(f"❌ Error fetching analytics: {e}")
            return {"error": str(e)}

    def generate_dashboard_data(self) -> Dict[str, Any]:
        """Generate complete dashboard data structure"""
        print("📊 Fetching real-time session data...")
        
        session_data = self.fetch_active_session_data()
        rate_limit_data = self.calculate_rate_limit_data()
        analytics_data = self.get_analytics_data()
        
        dashboard_data = {
            "timestamp": datetime.now().isoformat(),
            "sessionData": session_data,
            "rateLimitData": rate_limit_data,
            "analyticsData": analytics_data,
            "systemStatus": {
                "databaseConnected": True,
                "lastUpdate": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "dataSource": "real_sessions"
            }
        }
        
        print(f"✅ Generated dashboard data:")
        print(f"   🎯 Active Session: {session_data.get('activeSessionId', 'N/A')}")
        print(f"   🔢 Total Tokens: {session_data.get('realTokens', 0):,}")
        print(f"   📈 5h Usage: {rate_limit_data.get('fiveHourLimit', {}).get('usage_percentage', 0)}%")
        print(f"   📊 Weekly Usage: {rate_limit_data.get('weeklyLimit', {}).get('usage_percentage', 0)}%")
        
        return dashboard_data

    def update_dashboard_html(self, dashboard_data: Dict[str, Any]) -> bool:
        """Update the dashboard HTML file with real data"""
        try:
            # Read the current dashboard template
            with open(self.dashboard_path, 'r') as f:
                html_content = f.read()
            
            # Convert data to JavaScript format
            js_data = json.dumps(dashboard_data, indent=4)
            
            # Find and replace the embedded data
            start_marker = "const embeddedData = "
            end_marker = ";\n        \n        function loadEmbeddedData()"
            
            start_index = html_content.find(start_marker)
            if start_index == -1:
                print("❌ Could not find data embedding point in HTML")
                return False
            
            start_index += len(start_marker)
            end_index = html_content.find(end_marker, start_index)
            
            if end_index == -1:
                print("❌ Could not find end of embedded data in HTML")
                return False
            
            # Replace the embedded data
            new_html = (
                html_content[:start_index] + 
                js_data + 
                html_content[end_index:]
            )
            
            # Write updated HTML
            with open(self.dashboard_path, 'w') as f:
                f.write(new_html)
            
            # Copy to deployment folder
            with open(self.deployment_path, 'w') as f:
                f.write(new_html)
            
            print(f"✅ Dashboard HTML updated with real data")
            return True
            
        except Exception as e:
            print(f"❌ Error updating dashboard HTML: {e}")
            return False

    def deploy_to_vercel(self) -> bool:
        """Deploy updated dashboard to Vercel"""
        try:
            print("🚀 Deploying to Vercel...")
            
            # Change to deployment directory
            deployment_dir = Path(self.deployment_path).parent
            
            # Run Vercel deployment
            result = subprocess.run(
                ["vercel", "--prod", "--yes"],
                cwd=deployment_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print("✅ Vercel deployment successful!")
                # Extract URL from output
                for line in result.stdout.split('\n'):
                    if 'https://' in line and 'vercel.app' in line:
                        print(f"🌐 Live Dashboard: {line.strip()}")
                        break
                return True
            else:
                print(f"❌ Vercel deployment failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("❌ Vercel deployment timed out")
            return False
        except Exception as e:
            print(f"❌ Error deploying to Vercel: {e}")
            return False

    def run_single_update(self) -> bool:
        """Run a single dashboard update cycle"""
        print(f"\n🔄 Starting dashboard update at {datetime.now().strftime('%H:%M:%S')}")
        
        # Generate fresh data
        dashboard_data = self.generate_dashboard_data()
        
        # Update HTML files
        if self.update_dashboard_html(dashboard_data):
            # Deploy to Vercel
            if self.deploy_to_vercel():
                print("✅ Complete update cycle successful!")
                return True
            else:
                print("⚠️ Local update successful, but Vercel deployment failed")
                return False
        else:
            print("❌ Dashboard update failed")
            return False

    def start_continuous_monitoring(self, update_interval: int = 300):
        """Start continuous dashboard monitoring and updates"""
        print(f"🔄 Starting continuous monitoring (updates every {update_interval}s)")
        print("Press Ctrl+C to stop")
        
        try:
            while True:
                success = self.run_single_update()
                
                if success:
                    print(f"💤 Sleeping for {update_interval} seconds...")
                else:
                    print(f"⚠️ Update failed, retrying in {update_interval} seconds...")
                
                time.sleep(update_interval)
                
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")
        except Exception as e:
            print(f"❌ Monitoring error: {e}")

def main():
    """Main execution function"""
    print("🚀 Claude Code Optimizer - Real-Time Dashboard Connector")
    print("=" * 60)
    
    connector = RealTimeDashboardConnector()
    
    print("\nOptions:")
    print("1. Single update")
    print("2. Continuous monitoring (5 min intervals)")
    print("3. Continuous monitoring (1 min intervals)")
    print("4. Test data fetch only")
    
    choice = input("\nChoose option (1-4): ").strip()
    
    if choice == "1":
        connector.run_single_update()
    elif choice == "2":
        connector.start_continuous_monitoring(300)  # 5 minutes
    elif choice == "3":
        connector.start_continuous_monitoring(60)   # 1 minute
    elif choice == "4":
        data = connector.generate_dashboard_data()
        print(f"\n📊 Dashboard Data Preview:")
        print(json.dumps(data, indent=2))
    else:
        print("Invalid choice")

if __name__ == "__main__":
    main()
