#!/usr/bin/env python3
"""
Smart Dashboard Monitor - Auto-deploys when session activity detected
- Monitors SQLite database for changes
- Auto-regenerates dashboard every 10 seconds during activity
- Stops monitoring during inactive periods
- Auto-deploys to Vercel when changes detected
"""

import os
import time
import sqlite3
import hashlib
import subprocess
from datetime import datetime, timedelta
from generate_smart_dashboard import get_database_hash, detect_session_activity, generate_smart_dashboard

class SmartDashboardMonitor:
    """Intelligent dashboard monitoring with activity-based updates"""
    
    def __init__(self, db_path="./session_tracker/claude_usage.db"):
        self.db_path = db_path
        self.last_hash = None
        self.last_deploy_time = None
        self.monitoring_active = False
        self.activity_detected = False
        self.consecutive_inactive_checks = 0
        self.max_inactive_checks = 30  # Stop after 5 minutes of inactivity (30 * 10s)
        
    def start_monitoring(self):
        """Start intelligent monitoring loop"""
        print("🔄 Starting Smart Dashboard Monitor...")
        print(f"📊 Database: {self.db_path}")
        print(f"⚡ Activity-based polling: 10s intervals during activity")
        print(f"💤 Auto-pause after 5 minutes of inactivity")
        print("=" * 60)
        
        try:
            while True:
                self.check_and_update()
                time.sleep(10)  # Check every 10 seconds
                
        except KeyboardInterrupt:
            print("\n⏹️ Monitoring stopped by user")
        except Exception as e:
            print(f"\n❌ Monitor error: {e}")
            
    def check_and_update(self):
        """Check for activity and update dashboard if needed"""
        try:
            # Detect current session activity
            has_activity = detect_session_activity(self.db_path)
            current_hash = get_database_hash(self.db_path)
            current_time = datetime.now()
            
            if has_activity:
                self.activity_detected = True
                self.consecutive_inactive_checks = 0
                
                if not self.monitoring_active:
                    print(f"⚡ [{current_time.strftime('%H:%M:%S')}] Session activity detected - starting monitoring")
                    self.monitoring_active = True
                
                # Check if data changed
                if current_hash != self.last_hash:
                    print(f"📊 [{current_time.strftime('%H:%M:%S')}] Database changes detected")
                    
                    # Check if we should deploy (not more than once per 30 seconds)
                    should_deploy = (
                        self.last_deploy_time is None or 
                        (current_time - self.last_deploy_time).total_seconds() > 30
                    )
                    
                    if should_deploy:
                        print(f"🚀 [{current_time.strftime('%H:%M:%S')}] Auto-deploying dashboard...")
                        self.deploy_dashboard()
                        self.last_deploy_time = current_time
                    else:
                        print(f"⏳ [{current_time.strftime('%H:%M:%S')}] Skipping deploy (too soon since last)")
                    
                    self.last_hash = current_hash
                else:
                    print(f"✓ [{current_time.strftime('%H:%M:%S')}] No changes - monitoring...")
                    
            else:
                # No activity detected
                self.consecutive_inactive_checks += 1
                
                if self.monitoring_active:
                    print(f"💤 [{current_time.strftime('%H:%M:%S')}] No activity ({self.consecutive_inactive_checks}/{self.max_inactive_checks})")
                    
                    if self.consecutive_inactive_checks >= self.max_inactive_checks:
                        print(f"⏸️ [{current_time.strftime('%H:%M:%S')}] Pausing monitoring - no activity for 5+ minutes")
                        self.monitoring_active = False
                        self.activity_detected = False
                        self.consecutive_inactive_checks = 0
                else:
                    # Only log occasionally when inactive
                    if self.consecutive_inactive_checks % 30 == 0:  # Every 5 minutes
                        print(f"💤 [{current_time.strftime('%H:%M:%S')}] Waiting for session activity...")
                        
        except Exception as e:
            print(f"❌ [{datetime.now().strftime('%H:%M:%S')}] Error in check_and_update: {e}")
    
    def deploy_dashboard(self):
        """Generate and deploy dashboard to Vercel"""
        try:
            # Generate smart dashboard
            print("   📊 Generating dashboard with latest data...")
            dashboard_file = generate_smart_dashboard()
            
            if not os.path.exists(dashboard_file):
                print("   ❌ Failed to generate dashboard")
                return False
            
            # Copy to deployment folder
            print("   📋 Copying to Vercel deployment folder...")
            subprocess.run([
                "cp", dashboard_file, "vercel-deploy/index.html"
            ], check=True)
            
            # Deploy to Vercel
            print("   🌐 Deploying to Vercel...")
            result = subprocess.run([
                "vercel", "--prod", "--yes"
            ], cwd="vercel-deploy", capture_output=True, text=True)
            
            if result.returncode == 0:
                # Extract URL from output
                lines = result.stdout.strip().split('\n')
                deploy_url = lines[0] if lines else "Unknown URL"
                print(f"   ✅ Deploy successful: {deploy_url}")
                return True
            else:
                print(f"   ❌ Deploy failed: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"   ❌ Deploy error: {e}")
            return False
    
    def get_status(self):
        """Get current monitoring status"""
        has_activity = detect_session_activity(self.db_path)
        current_hash = get_database_hash(self.db_path)
        
        return {
            "monitoring_active": self.monitoring_active,
            "activity_detected": has_activity,
            "database_hash": current_hash,
            "last_deploy": self.last_deploy_time.isoformat() if self.last_deploy_time else None,
            "consecutive_inactive": self.consecutive_inactive_checks
        }

def main():
    """Main entry point"""
    print("🚀 Claude Code Optimizer - Smart Dashboard Monitor")
    print("=" * 60)
    
    # Check if database exists
    db_path = "./session_tracker/claude_usage.db"
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        print("💡 Make sure Claude Code sessions are being tracked")
        return
    
    # Check if Vercel CLI is available
    try:
        subprocess.run(["vercel", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Vercel CLI not found")
        print("💡 Install with: npm i -g vercel")
        return
    
    # Check if deployment folder exists
    if not os.path.exists("vercel-deploy"):
        print("❌ Vercel deployment folder not found")
        print("💡 Create with: mkdir vercel-deploy")
        return
    
    # Start monitoring
    monitor = SmartDashboardMonitor(db_path)
    monitor.start_monitoring()

if __name__ == "__main__":
    main()
