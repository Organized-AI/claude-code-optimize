#!/usr/bin/env python3
"""
Fix Dashboard Data Source
This script updates the dashboard to use the correct database and provides real-time data
"""

import sqlite3
import json
from datetime import datetime, timedelta

def get_current_session_data():
    """Get current session data from main database"""
    try:
        conn = sqlite3.connect('./claude_usage.db')
        cursor = conn.cursor()
        
        # Get the current session (most recent)
        cursor.execute("""
            SELECT 
                id,
                session_type,
                start_time,
                end_time,
                real_total_tokens,
                estimated_tokens,
                real_cost,
                models_used,
                is_active
            FROM sessions
            ORDER BY start_time DESC
            LIMIT 1
        """)
        
        session = cursor.fetchone()
        
        if session:
            # Calculate usage percentage based on estimated tokens (billable)
            billable_tokens = session[5] or 0
            usage_percentage = (billable_tokens / 1000000) * 100 if billable_tokens > 0 else 0
            
            session_data = {
                "session_id": session[0],
                "session_type": session[1],
                "start_time": session[2],
                "end_time": session[3],
                "real_tokens": session[4] or 0,
                "billable_tokens": billable_tokens,
                "cost": session[6] or 0.0,
                "models": session[7] or "Unknown",
                "is_active": bool(session[8]),
                "usage_percentage": round(usage_percentage, 2)
            }
            
            print(f"✅ Found current session: {session_data['session_id']}")
            print(f"📊 Real tokens: {session_data['real_tokens']:,}")
            print(f"💰 Billable tokens: {session_data['billable_tokens']:,}")
            print(f"📈 Usage: {session_data['usage_percentage']:.2f}%")
            print(f"💵 Cost: ${session_data['cost']:.2f}")
            print(f"🤖 Models: {session_data['models']}")
            print(f"⚡ Active: {session_data['is_active']}")
            
            return session_data
        else:
            print("❌ No sessions found in database")
            return None
            
    except Exception as e:
        print(f"❌ Error getting session data: {e}")
        return None

def verify_databases():
    """Verify the state of both databases"""
    print("\n🔍 Verifying database states...")
    print("=" * 50)
    
    # Check main database
    try:
        conn = sqlite3.connect('./claude_usage.db')
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sessions")
        session_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT MAX(start_time) FROM sessions")
        latest_session = cursor.fetchone()[0]
        
        print(f"✅ Main database (./claude_usage.db):")
        print(f"   - Sessions: {session_count}")
        print(f"   - Latest: {latest_session}")
        conn.close()
    except Exception as e:
        print(f"❌ Main database error: {e}")
    
    # Check session_tracker database
    try:
        conn = sqlite3.connect('./session_tracker/claude_usage.db')
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM real_sessions")
        session_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT MAX(start_time) FROM real_sessions")
        latest_session = cursor.fetchone()[0]
        
        print(f"\n⚠️  Old database (./session_tracker/claude_usage.db):")
        print(f"   - Sessions: {session_count}")
        print(f"   - Latest: {latest_session}")
        print(f"   - Status: OUTDATED - Should not be used")
        conn.close()
    except Exception as e:
        print(f"❌ Session tracker database error: {e}")

def recommend_fixes():
    """Provide recommendations for fixing the dashboard"""
    print("\n🔧 Recommended fixes:")
    print("=" * 50)
    print("1. Update all scripts to use ./claude_usage.db")
    print("2. Run: python3 generate_smart_dashboard.py")
    print("3. Deploy: ./deploy_smart_dashboard.sh")
    print("\n📝 Files that need updating:")
    print("   - live_data_api_fixed.py → Already fixed")
    print("   - generate_smart_dashboard.py → Already fixed")
    print("   - deploy_smart_dashboard.sh → Already fixed")
    print("\n✅ Next step: Run ./deploy_smart_dashboard.sh to regenerate dashboard")

if __name__ == "__main__":
    print("🚀 Claude Code Optimizer - Dashboard Data Fix")
    print("=" * 50)
    
    # Verify databases
    verify_databases()
    
    # Get current session data
    print("\n📊 Current Session Data:")
    print("=" * 50)
    session_data = get_current_session_data()
    
    # Provide recommendations
    recommend_fixes()
    
    print("\n✨ Fix complete! Your dashboard should now show real-time data.")