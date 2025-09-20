#!/usr/bin/env python3
"""
Continuous Real Session Monitor for Claude Code Optimizer
"""
import time
import subprocess
import os
from datetime import datetime

def run_real_data_scan():
    """Run the real data bridge scan"""
    print(f"🔄 Scanning for real sessions at {datetime.now().strftime('%H:%M:%S')}")
    
    result = subprocess.run([
        'python3', '-c', """
import sqlite3, psutil, json, glob, os
from datetime import datetime

db_path = 'claude_usage.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Find new Claude processes
claude_count = sum(1 for proc in psutil.process_iter(['name']) if proc.info['name'] == 'claude')

# Find recent JSONL files  
jsonl_files = []
for pattern in ['/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/claude-backup/projects/**/*.jsonl']:
    files = glob.glob(pattern, recursive=True)
    jsonl_files.extend([f for f in files if os.path.exists(f) and os.path.getmtime(f) > (datetime.now().timestamp() - 3600)])

# Check for new sessions
cursor.execute("SELECT COUNT(*) FROM real_sessions WHERE session_type = 'claude_code'")
real_sessions = cursor.fetchone()[0]

print(f'Claude processes: {claude_count}, JSONL files: {len(jsonl_files)}, Real sessions: {real_sessions}')
conn.close()
"""
    ], capture_output=True, text=True, cwd='/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer')
    
    if result.stdout:
        print(f"   {result.stdout.strip()}")

def main():
    print("🚀 Starting Continuous Real Session Monitor")
    print("=========================================")
    print("Press Ctrl+C to stop monitoring")
    print()
    
    try:
        while True:
            run_real_data_scan()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        print("\n👋 Monitoring stopped by user")

if __name__ == "__main__":
    main()
