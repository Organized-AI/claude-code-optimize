#!/bin/bash
# Deploy Real Data Fix for Claude Code Optimizer
set -e
echo "🚀 Deploying Real Data Fix for Claude Code Optimizer"
echo "=================================================="

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
pip3 install psutil >/dev/null 2>&1 || echo "psutil already installed"

# Step 2: Clear test data and scan for real sessions
echo "🔧 Scanning for real Claude Code sessions..."
python3 -c "
import sqlite3
import psutil
import json
import glob
import os
from datetime import datetime

# Database connection
db_path = claude_usage.db
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Clear test data
cursor.execute(\"DELETE FROM real_sessions WHERE session_type = test_session\")
deleted = cursor.rowcount
print(f\"✅ Cleared {deleted} test sessions\")

# Find Claude processes
claude_processes = []
for proc in psutil.process_iter([pid, name, cwd]):
    try:
        if proc.info[name] == claude:
            claude_processes.append((proc.info[pid], proc.info[cwd] or /tmp))
    except:
        continue

print(f\"✅ Found {len(claude_processes)} active Claude Code processes\")

# Find recent JSONL files
jsonl_files = []
patterns = [
    /Users/jordaaan/Library/Mobile
