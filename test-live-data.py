#!/usr/bin/env python3
"""
Test if we're getting real Claude Code data
"""

import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.append('src')
from simple_tracker import SimplifiedTracker

def test_tracker():
    print("🧪 Testing Claude Code Data Detection")
    print("=" * 50)
    
    tracker = SimplifiedTracker()
    
    # Check if Claude projects exist
    if tracker.claude_projects.exists():
        print(f"✅ Claude projects found: {tracker.claude_projects}")
        
        # Count projects
        projects = list(tracker.claude_projects.iterdir())
        print(f"📁 Found {len(projects)} projects")
        
        # Look for JSONL files
        jsonl_count = 0
        for project in projects:
            if project.is_dir():
                jsonls = list(project.glob("*.jsonl"))
                if jsonls:
                    print(f"  • {project.name}: {len(jsonls)} sessions")
                    jsonl_count += len(jsonls)
        
        print(f"📊 Total sessions found: {jsonl_count}")
    else:
        print(f"❌ Claude projects not found at {tracker.claude_projects}")
    
    print("\n🔍 Checking for active sessions...")
    status = tracker.get_session_status()
    
    if status["status"] == "active":
        session = status["session"]
        print(f"🟢 ACTIVE SESSION DETECTED!")
        print(f"  Session ID: {session['session_id']}")
        print(f"  Project: {session.get('project', 'unknown')}")
        print(f"  Tokens: {session['tokens']}")
        print(f"  Cost: ${session['cost_usd']:.4f}")
        print(f"  Messages: {session['messages']}")
        print(f"  Model: {session['model']}")
        print(f"  Age: {session.get('age_seconds', 0)} seconds")
        print(f"  Freshness: {status['freshness']}")
        print(f"  Confidence: {status['confidence']}%")
    else:
        print("⚫ No active session (this is normal if Claude Code isn't running)")
    
    print("\n✅ Test complete!")
    print("\nTo see live data on your dashboard:")
    print("1. Start Claude Code: claude 'test session'")
    print("2. Run: ./start-live-tracker.sh")
    print("3. Check dashboard: https://moonlock-dashboard-9kneovnvn-jordaaans-projects.vercel.app/")

if __name__ == "__main__":
    test_tracker()
