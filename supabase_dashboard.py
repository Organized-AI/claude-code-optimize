#!/usr/bin/env python3
"""
Claude Code Dashboard with Supabase Integration
Real-time dashboard that pulls data from Supabase
"""
import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Supabase configuration
SUPABASE_URL = "https://rdsfgdtsbyioqilatvxu.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkc2ZnZHRzYnlpb3FpbGF0dnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMxNjI3NDYsImV4cCI6MjAzODczODc0Nn0.YKiDGYzMnOXhKfOV4xf2oZYTxUl9EHh4J8hSgzFDxQw"

class SupabaseDashboard:
    def __init__(self):
        self.headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json"
        }
        self.base_url = f"{SUPABASE_URL}/rest/v1"
        
    def test_connection(self) -> bool:
        """Test connection to Supabase"""
        try:
            response = requests.get(f"{self.base_url}/sessions?limit=1", headers=self.headers)
            return response.status_code == 200
        except:
            return False
    
    def get_current_session(self) -> Dict:
        """Get current active session"""
        try:
            response = requests.get(
                f"{self.base_url}/sessions?is_active=eq.true&order=start_time.desc&limit=1",
                headers=self.headers
            )
            
            if response.status_code == 200:
                sessions = response.json()
                return sessions[0] if sessions else {}
        except Exception as e:
            print(f"Error getting current session: {e}")
        
        return {}
    
    def get_recent_sessions(self, days=7) -> List[Dict]:
        """Get recent sessions"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
            response = requests.get(
                f"{self.base_url}/sessions?start_time=gte.{cutoff_date}&order=start_time.desc&limit=20",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error getting recent sessions: {e}")
        
        return []
    
    def get_session_analytics(self) -> Dict:
        """Get session analytics"""
        try:
            # Get today's sessions
            today = datetime.now().date().isoformat()
            response = requests.get(
                f"{self.base_url}/sessions?start_time=gte.{today}",
                headers=self.headers
            )
            
            if response.status_code == 200:
                sessions = response.json()
                
                total_sessions = len(sessions)
                total_tokens = sum(s.get('estimated_tokens', 0) for s in sessions)
                total_cost = sum(s.get('estimated_cost', 0) for s in sessions)
                avg_efficiency = sum(s.get('efficiency_score', 0) for s in sessions) / max(total_sessions, 1)
                
                return {
                    'total_sessions': total_sessions,
                    'total_tokens': total_tokens,
                    'total_cost': round(total_cost, 4),
                    'avg_efficiency': round(avg_efficiency, 2),
                    'active_sessions': len([s for s in sessions if s.get('is_active')])
                }
        except Exception as e:
            print(f"Error getting analytics: {e}")
        
        return {
            'total_sessions': 0,
            'total_tokens': 0,
            'total_cost': 0.0,
            'avg_efficiency': 0.0,
            'active_sessions': 0
        }
    
    def get_tool_usage(self) -> List[Dict]:
        """Get tool usage statistics"""
        try:
            response = requests.get(
                f"{self.base_url}/tool_usage?order=usage_count.desc&limit=10",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error getting tool usage: {e}")
        
        return []

def format_duration(minutes):
    """Format duration in minutes to human readable"""
    if minutes < 60:
        return f"{minutes:.1f}m"
    hours = minutes / 60
    return f"{hours:.1f}h"

def format_cost(cost):
    """Format cost for display"""
    return f"${cost:.4f}"

def display_dashboard():
    """Display the dashboard"""
    dashboard = SupabaseDashboard()
    
    print("🚀 CLAUDE CODE OPTIMIZER - SUPABASE DASHBOARD")
    print("=" * 60)
    
    # Test connection
    if not dashboard.test_connection():
        print("❌ Cannot connect to Supabase. Please check:")
        print("   1. Run supabase_schema.sql in your Supabase SQL Editor")
        print("   2. Import the JSON data files")
        print("   3. Verify your project is accessible")
        return
    
    print("✅ Connected to Supabase")
    print()
    
    # Current session
    current_session = dashboard.get_current_session()
    if current_session:
        print("📊 CURRENT SESSION")
        print("-" * 30)
        print(f"ID: {current_session.get('id', 'N/A')}")
        print(f"Duration: {format_duration(current_session.get('duration_minutes', 0))}")
        print(f"Tokens: {current_session.get('estimated_tokens', 0):,}")
        print(f"Cost: {format_cost(current_session.get('estimated_cost', 0))}")
        print(f"Efficiency: {current_session.get('efficiency_score', 0):.2f}")
        print(f"Files: {current_session.get('files_created', 0)} created, {current_session.get('files_modified', 0)} modified")
        print()
    else:
        print("📊 CURRENT SESSION: No active session")
        print()
    
    # Analytics
    analytics = dashboard.get_session_analytics()
    print("📈 TODAY'S ANALYTICS")
    print("-" * 30)
    print(f"Sessions: {analytics['total_sessions']}")
    print(f"Total Tokens: {analytics['total_tokens']:,}")
    print(f"Total Cost: {format_cost(analytics['total_cost'])}")
    print(f"Avg Efficiency: {analytics['avg_efficiency']:.2f}")
    print(f"Active Sessions: {analytics['active_sessions']}")
    print()
    
    # Recent sessions
    recent_sessions = dashboard.get_recent_sessions()
    if recent_sessions:
        print("📋 RECENT SESSIONS")
        print("-" * 30)
        for session in recent_sessions[:5]:
            start_time = session.get('start_time', '').split('T')[0] if session.get('start_time') else 'N/A'
            print(f"{session.get('id', 'N/A')[:20]:<20} | {start_time} | {session.get('estimated_tokens', 0):>6,} tokens | {format_cost(session.get('estimated_cost', 0))}")
        print()
    
    # Tool usage
    tool_usage = dashboard.get_tool_usage()
    if tool_usage:
        print("🔧 TOP TOOLS")
        print("-" * 30)
        for tool in tool_usage[:5]:
            print(f"{tool.get('tool_name', 'N/A'):<20} | {tool.get('usage_count', 0):>3} uses")
        print()
    
    print("🔗 Supabase Project: https://supabase.com/dashboard/project/rdsfgdtsbyioqilatvxu")
    print(f"📊 Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def live_dashboard():
    """Run live updating dashboard"""
    print("🔄 Starting live dashboard (press Ctrl+C to stop)...")
    print()
    
    try:
        while True:
            # Clear screen (works on most terminals)
            print("\033[2J\033[H", end="")
            
            display_dashboard()
            
            print("\n⏰ Updating in 30 seconds...")
            time.sleep(30)
            
    except KeyboardInterrupt:
        print("\n\n👋 Dashboard stopped")

def main():
    """Main function"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--live':
        live_dashboard()
    else:
        display_dashboard()
        print("\n💡 Tip: Use --live flag for auto-updating dashboard")

if __name__ == "__main__":
    main()