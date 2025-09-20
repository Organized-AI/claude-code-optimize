#!/usr/bin/env python3
"""Quick status check for Claude Code Optimizer"""

import sqlite3
import requests
import json
from datetime import datetime

def check_system_status():
    print("🔍 Claude Code Optimizer - Quick Status Check")
    print("=" * 50)
    
    # Database check
    try:
        conn = sqlite3.connect("/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db")
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM real_sessions")
        session_count = cursor.fetchone()[0]
        print(f"✅ Database: {session_count} sessions tracked")
        conn.close()
    except Exception as e:
        print(f"❌ Database: {e}")
    
    # API check
    try:
        response = requests.get("http://localhost:3001/api/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Server: {data.get('version', 'Unknown')} running")
        else:
            print(f"⚠️  API Server: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ API Server: {e}")
    
    # Usage summary
    try:
        from production_analytics import analytics
        summary = analytics.get_usage_summary()
        forecast = analytics.get_rate_limit_forecast()
        
        print(f"📊 Usage: {summary['total_tokens']:,} tokens this week")
        print(f"🎯 Rate Limit Risk: {forecast['status'].upper()}")
        print(f"📅 Days until limits: {forecast['days_until_limits']}")
        
    except Exception as e:
        print(f"⚠️  Analytics: {e}")
    
    print(f"\n🕒 Status checked at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    check_system_status()
