#!/bin/bash
# Claude Real Token Monitoring Startup Script
# Generated: 2025-08-14T15:50:04.043139

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATABASE_PATH="/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"

echo "Starting Claude real token monitoring..."
cd "$SCRIPT_DIR"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed"
    exit 1
fi

# Start the monitoring service
python3 real_token_tracker.py "$DATABASE_PATH" --start-service

echo "Token monitoring started"
