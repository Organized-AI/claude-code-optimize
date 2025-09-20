#!/usr/bin/env python3
"""
Test Real Claude Code Session Detection
======================================

This script tests the CORRECT way to detect Claude Code sessions
by monitoring the actual ~/.claude/projects/ directory.

Run this alongside your existing Claude Code usage to see real sessions!
"""

import json
import time
from pathlib import Path
from datetime import datetime

def find_claude_projects_dir():
    """Find the Claude Code projects directory"""
    
    possible_paths = [
        Path.home() / ".claude" / "projects",
        Path.home() / ".config" / "claude" / "projects", 
        Path("/Users/jordaaan/.claude/projects")  # Your specific path
    ]
    
    for path in possible_paths:
        if path.exists():
            print(f"✅ Found Claude projects directory: {path}")
            return path
    
    print("❌ Could not find Claude projects directory")
    print("Make sure you've used Claude Code at least once")
    return None

def analyze_existing_sessions(projects_dir):
    """Analyze existing Claude Code sessions"""
    
    print(f"\n🔍 Analyzing existing sessions in {projects_dir}")
    print("=" * 60)
    
    session_count = 0
    active_sessions = []
    
    for project_dir in projects_dir.iterdir():
        if not project_dir.is_dir():
            continue
        
        jsonl_files = list(project_dir.glob("*.jsonl"))
        
        if jsonl_files:
            print(f"\n📁 Project: {project_dir.name}")
            print(f"   Sessions: {len(jsonl_files)}")
            
            for jsonl_file in jsonl_files:
                session_info = analyze_session_file(jsonl_file)
                if session_info:
                    session_count += 1
                    
                    # Check if session is active
                    last_modified = jsonl_file.stat().st_mtime
                    is_active = (time.time() - last_modified) < 30
                    
                    status = "🔴 ACTIVE" if is_active else "⚫ Completed"
                    
                    print(f"   {status} {jsonl_file.stem[:8]}: {session_info['messages']} msgs, ${session_info['cost']:.4f}")
                    
                    if is_active:
                        active_sessions.append({
                            "session_id": jsonl_file.stem,
                            "project": project_dir.name,
                            "file_path": str(jsonl_file),
                            **session_info
                        })
    
    print(f"\n📊 Summary:")
    print(f"   Total sessions found: {session_count}")
    print(f"   Active sessions: {len(active_sessions)}")
    
    return active_sessions

def analyze_session_file(jsonl_file):
    """Analyze a single Claude Code session file"""
    
    try:
        message_count = 0
        user_messages = 0
        assistant_messages = 0
        tool_uses = 0
        total_cost = 0.0
        total_tokens = 0
        model_used = "unknown"
        
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    message = json.loads(line)
                    message_count += 1
                    
                    # Count message types
                    msg_type = message.get("type", message.get("role"))
                    if msg_type == "user":
                        user_messages += 1
                    elif msg_type == "assistant":
                        assistant_messages += 1
                    elif msg_type in ["tool_use", "tool_call"]:
                        tool_uses += 1
                    
                    # Extract model
                    if "model" in message:
                        model_used = message["model"]
                    
                    # Extract usage data
                    usage = message.get("usage", {})
                    if usage:
                        input_tokens = usage.get("input_tokens", 0)
                        output_tokens = usage.get("output_tokens", 0)
                        total_tokens += input_tokens + output_tokens
                    
                    # Extract cost
                    if "total_cost_usd" in message:
                        total_cost = float(message["total_cost_usd"])
                
                except json.JSONDecodeError:
                    continue
        
        return {
            "messages": message_count,
            "user_messages": user_messages,
            "assistant_messages": assistant_messages,
            "tool_uses": tool_uses,
            "cost": total_cost,
            "tokens": total_tokens,
            "model": model_used,
            "file_size_kb": jsonl_file.stat().st_size / 1024
        }
    
    except Exception as e:
        print(f"Error analyzing {jsonl_file}: {e}")
        return None

def monitor_for_changes(projects_dir, duration=60):
    """Monitor for session changes over a specified duration"""
    
    print(f"\n👁️ Monitoring for changes for {duration} seconds...")
    print("Start a Claude Code session in another terminal to see live detection!")
    print("-" * 60)
    
    # Get baseline
    baseline_files = {}
    for project_dir in projects_dir.iterdir():
        if project_dir.is_dir():
            for jsonl_file in project_dir.glob("*.jsonl"):
                baseline_files[str(jsonl_file)] = jsonl_file.stat().st_mtime
    
    start_time = time.time()
    
    while (time.time() - start_time) < duration:
        # Check for changes
        current_files = {}
        for project_dir in projects_dir.iterdir():
            if project_dir.is_dir():
                for jsonl_file in project_dir.glob("*.jsonl"):
                    current_files[str(jsonl_file)] = jsonl_file.stat().st_mtime
        
        # Detect new files
        for file_path in current_files:
            if file_path not in baseline_files:
                print(f"🚀 NEW SESSION STARTED: {Path(file_path).stem[:8]}")
                baseline_files[file_path] = current_files[file_path]
        
        # Detect modifications
        for file_path, mod_time in current_files.items():
            if file_path in baseline_files and mod_time > baseline_files[file_path]:
                session_info = analyze_session_file(Path(file_path))
                if session_info:
                    print(f"📊 SESSION UPDATE: {Path(file_path).stem[:8]} - {session_info['messages']} messages, ${session_info['cost']:.4f}")
                baseline_files[file_path] = mod_time
        
        time.sleep(2)  # Check every 2 seconds
    
    print("✅ Monitoring complete")

def main():
    """Main test function"""
    
    print("🧪 Testing REAL Claude Code Session Detection")
    print("=" * 50)
    
    # Find Claude projects directory
    projects_dir = find_claude_projects_dir()
    if not projects_dir:
        return
    
    # Analyze existing sessions
    active_sessions = analyze_existing_sessions(projects_dir)
    
    # Show what would trigger dashboard updates
    if active_sessions:
        print(f"\n🔴 LIVE SESSION ACTIVE would show for:")
        for session in active_sessions:
            print(f"   Session {session['session_id'][:8]}: {session['messages']} messages")
    else:
        print(f"\n⚫ Dashboard would show: No Active Sessions")
    
    # Ask if user wants to monitor for changes
    try:
        response = input(f"\n🕐 Monitor for real-time changes? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            monitor_for_changes(projects_dir)
    except KeyboardInterrupt:
        print(f"\n👋 Monitoring stopped")

if __name__ == "__main__":
    main()
