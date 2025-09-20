#!/usr/bin/env python3
"""
Simplified Claude Code Tracker - Gets real data to your dashboard
"""

import json
import time
import asyncio
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional

class SimplifiedTracker:
    def __init__(self):
        self.claude_projects = Path.home() / ".claude" / "projects"
        self.db_path = Path.home() / ".claude-code-tracker" / "sessions.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()
        
    def init_db(self):
        """Simple database for tracking"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                timestamp TIMESTAMP,
                tokens INTEGER,
                cost_usd REAL,
                model TEXT,
                is_active INTEGER
            )
        """)
        conn.commit()
        conn.close()
    
    def find_active_session(self) -> Optional[Dict]:
        """Find the most recent active Claude Code session"""
        if not self.claude_projects.exists():
            return None
        
        latest_session = None
        latest_time = 0
        
        # Scan all project directories
        for project_dir in self.claude_projects.iterdir():
            if not project_dir.is_dir():
                continue
            
            # Find JSONL files
            for jsonl_file in project_dir.glob("*.jsonl"):
                mtime = jsonl_file.stat().st_mtime
                age = time.time() - mtime
                
                # Consider active if modified in last 60 seconds
                if age < 60 and mtime > latest_time:
                    session_data = self.parse_jsonl(jsonl_file)
                    if session_data:
                        session_data["is_active"] = True
                        session_data["age_seconds"] = int(age)
                        session_data["project"] = project_dir.name
                        latest_session = session_data
                        latest_time = mtime
        
        return latest_session
    
    def parse_jsonl(self, file_path: Path) -> Optional[Dict]:
        """Parse JSONL file for session metrics"""
        try:
            metrics = {
                "session_id": file_path.stem[:8],
                "tokens": 0,
                "cost_usd": 0.0,
                "model": "claude-sonnet-4",
                "messages": 0,
                "timestamp": datetime.now().isoformat()
            }
            
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        entry = json.loads(line)
                        
                        # Count messages
                        if "role" in entry:
                            metrics["messages"] += 1
                        
                        # Extract model
                        if "model" in entry:
                            metrics["model"] = entry["model"]
                        
                        # Look for usage info (adjust based on actual format)
                        if "usage" in entry:
                            if "total_tokens" in entry["usage"]:
                                metrics["tokens"] += entry["usage"]["total_tokens"]
                            if "total_cost" in entry["usage"]:
                                metrics["cost_usd"] += entry["usage"]["total_cost"]
                    except:
                        continue
            
            # Estimate cost if not found
            if metrics["tokens"] > 0 and metrics["cost_usd"] == 0:
                # Rough estimate: $3 per 1M tokens for Sonnet
                metrics["cost_usd"] = (metrics["tokens"] / 1_000_000) * 3.0
            
            return metrics if metrics["messages"] > 0 else None
            
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return None
    
    def get_session_status(self) -> Dict:
        """Get current session status for dashboard"""
        session = self.find_active_session()
        
        if session:
            # Active session found
            return {
                "status": "active",
                "session": session,
                "confidence": 95,  # High confidence - direct from JSONL
                "freshness": "live" if session["age_seconds"] < 30 else "recent",
                "source": "jsonl"
            }
        else:
            # No active session
            return {
                "status": "inactive",
                "session": None,
                "confidence": 100,
                "freshness": "current",
                "source": "jsonl"
            }

async def monitor_loop():
    """Simple monitoring loop"""
    tracker = SimplifiedTracker()
    
    print("🚀 Simplified Claude Code Tracker Started")
    print("📁 Monitoring:", tracker.claude_projects)
    
    while True:
        try:
            status = tracker.get_session_status()
            
            if status["status"] == "active":
                session = status["session"]
                print(f"🟢 ACTIVE: {session['session_id']} | "
                      f"{session['tokens']} tokens | "
                      f"${session['cost_usd']:.4f} | "
                      f"{session['messages']} messages")
            else:
                print("⚫ No active session")
            
            await asyncio.sleep(5)
            
        except KeyboardInterrupt:
            print("\n👋 Shutting down")
            break
        except Exception as e:
            print(f"Error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(monitor_loop())
