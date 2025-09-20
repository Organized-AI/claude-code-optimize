#!/usr/bin/env python3
"""
Real Claude Session Detector
Automatically detects and tracks actual Claude Desktop and Claude Code sessions
"""

import os
import sys
import json
import time
import psutil
import sqlite3
import threading
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import uuid
import requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

@dataclass
class RealSession:
    """Real Claude session data structure"""
    id: str
    session_type: str  # "claude_desktop" or "claude_code"
    start_time: datetime
    end_time: Optional[datetime]
    process_id: int
    project_path: Optional[str]
    conversation_id: Optional[str]
    total_messages: int
    models_used: List[str]
    estimated_tokens: int
    is_active: bool
    metadata: Dict[str, Any]

class ClaudeProcessMonitor:
    """Monitor for Claude Desktop and Claude Code processes"""
    
    def __init__(self, callback):
        self.callback = callback
        self.running = False
        self.known_processes = set()
        
    def start(self):
        """Start monitoring Claude processes"""
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        print("🔍 Started Claude process monitoring...")
        
    def stop(self):
        """Stop monitoring"""
        self.running = False
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                current_processes = set()
                
                # Check for Claude processes
                for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
                    try:
                        proc_info = proc.info
                        proc_name = proc_info['name'].lower()
                        cmdline = ' '.join(proc_info['cmdline']) if proc_info['cmdline'] else ''
                        
                        # Detect Claude Desktop
                        if 'claude' in proc_name and ('desktop' in proc_name or proc_name == 'claude'):
                            current_processes.add(('claude_desktop', proc_info['pid'], proc_info['create_time']))
                            
                        # Detect Claude Code (python process with claude command)
                        elif 'python' in proc_name and 'claude' in cmdline and '--' in cmdline:
                            current_processes.add(('claude_code', proc_info['pid'], proc_info['create_time']))
                            
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        continue
                
                # Check for new processes
                new_processes = current_processes - self.known_processes
                for session_type, pid, create_time in new_processes:
                    self.callback('process_started', {
                        'session_type': session_type,
                        'pid': pid,
                        'create_time': create_time,
                        'detected_at': datetime.now()
                    })
                
                # Check for ended processes
                ended_processes = self.known_processes - current_processes
                for session_type, pid, create_time in ended_processes:
                    self.callback('process_ended', {
                        'session_type': session_type,
                        'pid': pid,
                        'create_time': create_time,
                        'detected_at': datetime.now()
                    })
                
                self.known_processes = current_processes
                time.sleep(2)  # Check every 2 seconds
                
            except Exception as e:
                print(f"⚠️ Process monitoring error: {e}")
                time.sleep(5)

class ClaudeDataExtractor:
    """Extract real data from Claude sessions"""
    
    def __init__(self):
        self.claude_data_paths = [
            "~/Library/Application Support/Claude/conversations",
            "~/.claude/conversations", 
            "~/.cache/claude",
            "~/Library/Caches/Claude"
        ]
        
    def find_conversation_files(self) -> List[Path]:
        """Find Claude conversation JSONL files"""
        conversation_files = []
        
        for path_str in self.claude_data_paths:
            path = Path(path_str).expanduser()
            if path.exists():
                # Look for JSONL, JSON, and SQLite files
                for pattern in ["*.jsonl", "*.json", "*.db", "*.sqlite"]:
                    conversation_files.extend(path.rglob(pattern))
                    
        return conversation_files
    
    def extract_session_data(self, conversation_file: Path) -> Dict:
        """Extract real session data from conversation file"""
        try:
            if conversation_file.suffix == '.jsonl':
                return self._parse_jsonl(conversation_file)
            elif conversation_file.suffix == '.json':
                return self._parse_json(conversation_file)
            elif conversation_file.suffix in ['.db', '.sqlite']:
                return self._parse_sqlite(conversation_file)
        except Exception as e:
            print(f"⚠️ Error parsing {conversation_file}: {e}")
            
        return {}
    
    def _parse_jsonl(self, file_path: Path) -> Dict:
        """Parse JSONL conversation file"""
        messages = []
        models_used = set()
        total_tokens = 0
        
        with open(file_path, 'r') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    messages.append(data)
                    
                    # Extract model information
                    if 'model' in data:
                        models_used.add(data['model'])
                    
                    # Estimate tokens (rough calculation)
                    if 'content' in data:
                        content = str(data['content'])
                        total_tokens += len(content.split()) * 1.3  # Rough token estimate
                        
                except json.JSONDecodeError:
                    continue
        
        return {
            'total_messages': len(messages),
            'models_used': list(models_used),
            'estimated_tokens': int(total_tokens),
            'first_message_time': messages[0].get('timestamp') if messages else None,
            'last_message_time': messages[-1].get('timestamp') if messages else None,
            'conversation_data': messages
        }
    
    def _parse_json(self, file_path: Path) -> Dict:
        """Parse JSON conversation file"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
                
            # Extract relevant information based on Claude's data structure
            if isinstance(data, dict):
                messages = data.get('messages', [])
                return {
                    'total_messages': len(messages),
                    'models_used': list(set(msg.get('model', 'unknown') for msg in messages)),
                    'estimated_tokens': sum(len(str(msg.get('content', '')).split()) * 1.3 for msg in messages),
                    'conversation_id': data.get('id'),
                    'conversation_data': data
                }
        except Exception as e:
            print(f"⚠️ JSON parsing error: {e}")
            
        return {}
    
    def _parse_sqlite(self, file_path: Path) -> Dict:
        """Parse SQLite conversation database"""
        try:
            conn = sqlite3.connect(file_path)
            cursor = conn.cursor()
            
            # Try common table names
            tables = ['conversations', 'messages', 'chats', 'sessions']
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        cursor.execute(f"SELECT * FROM {table} LIMIT 100")
                        rows = cursor.fetchall()
                        return {
                            'total_messages': count,
                            'table_used': table,
                            'sample_data': rows[:5]  # First 5 rows as sample
                        }
                except sqlite3.OperationalError:
                    continue
                    
            conn.close()
        except Exception as e:
            print(f"⚠️ SQLite parsing error: {e}")
            
        return {}

class RealSessionTracker:
    """Main session tracker for real Claude usage"""
    
    def __init__(self, dashboard_url: str = "https://claude-code-optimizer-dashboard.netlify.app"):
        self.dashboard_url = dashboard_url
        self.localhost_port = 3001
        self.db_path = "/Users/jordaaan/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Claude Code Optimizer/claude_usage.db"
        
        self.active_sessions: Dict[str, RealSession] = {}
        self.process_monitor = ClaudeProcessMonitor(self._handle_process_event)
        self.data_extractor = ClaudeDataExtractor()
        
        self._init_session_database()
        
    def _init_session_database(self):
        """Initialize database for real session tracking"""
        conn = sqlite3.connect(self.db_path)
        
        # Real sessions table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS real_sessions (
                id TEXT PRIMARY KEY,
                session_type TEXT,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                process_id INTEGER,
                project_path TEXT,
                conversation_id TEXT,
                total_messages INTEGER,
                models_used TEXT,
                estimated_tokens INTEGER,
                is_active BOOLEAN,
                metadata TEXT,
                five_hour_block_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 5-hour session blocks
        conn.execute('''
            CREATE TABLE IF NOT EXISTS five_hour_blocks (
                id TEXT PRIMARY KEY,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                session_type TEXT,
                total_sessions INTEGER,
                total_tokens INTEGER,
                efficiency_score REAL,
                is_complete BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
    def start_tracking(self):
        """Start real-time session tracking"""
        print("🚀 Starting real Claude session tracking...")
        
        # Start process monitoring
        self.process_monitor.start()
        
        print(f"📊 Dashboard available at: {self.dashboard_url}")
        print(f"🔗 Real-time updates: http://localhost:{self.localhost_port}")
        
    def _handle_process_event(self, event_type: str, data: Dict):
        """Handle Claude process start/end events"""
        if event_type == 'process_started':
            session_id = str(uuid.uuid4())
            session = RealSession(
                id=session_id,
                session_type=data['session_type'],
                start_time=data['detected_at'],
                end_time=None,
                process_id=data['pid'],
                project_path=self._detect_project_path(data),
                conversation_id=None,
                total_messages=0,
                models_used=[],
                estimated_tokens=0,
                is_active=True,
                metadata=data
            )
            
            self.active_sessions[session_id] = session
            self._save_session(session)
            self._check_five_hour_boundary(session)
            
            print(f"🎯 New {data['session_type']} session started: {session_id[:8]}")
            
        elif event_type == 'process_ended':
            # Find and end the corresponding session
            for session_id, session in list(self.active_sessions.items()):
                if session.process_id == data['pid']:
                    session.end_time = data['detected_at']
                    session.is_active = False
                    
                    # Extract final session data
                    self._extract_session_data(session)
                    self._save_session(session)
                    
                    del self.active_sessions[session_id]
                    print(f"✅ Session ended: {session_id[:8]}")
                    break
    
    def _detect_project_path(self, data: Dict) -> Optional[str]:
        """Detect the project path for Claude Code sessions"""
        if data['session_type'] == 'claude_code':
            try:
                # Try to get current working directory of the process
                proc = psutil.Process(data['pid'])
                return proc.cwd()
            except:
                pass
        return None
    
    def _extract_session_data(self, session: RealSession):
        """Extract real conversation data for the session"""
        conversation_files = self.data_extractor.find_conversation_files()
        
        # Find the most recent conversation file
        recent_files = [f for f in conversation_files if f.stat().st_mtime > session.start_time.timestamp()]
        
        if recent_files:
            # Sort by modification time and take the most recent
            recent_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
            data = self.data_extractor.extract_session_data(recent_files[0])
            
            if data:
                session.total_messages = data.get('total_messages', 0)
                session.models_used = data.get('models_used', [])
                session.estimated_tokens = data.get('estimated_tokens', 0)
                session.conversation_id = data.get('conversation_id')
                session.metadata.update(data)
    
    def _check_five_hour_boundary(self, session: RealSession):
        """Check if we need to start a new 5-hour block"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check for active 5-hour block
        cursor.execute('''
            SELECT id, start_time FROM five_hour_blocks 
            WHERE is_complete = FALSE 
            ORDER BY start_time DESC LIMIT 1
        ''')
        
        result = cursor.fetchone()
        
        if result:
            block_id, start_time = result
            start_dt = datetime.fromisoformat(start_time)
            
            # Check if 5 hours have passed
            if datetime.now() - start_dt >= timedelta(hours=5):
                # Complete the current block
                cursor.execute('''
                    UPDATE five_hour_blocks 
                    SET end_time = ?, is_complete = TRUE 
                    WHERE id = ?
                ''', (datetime.now(), block_id))
                
                # Start new block
                block_id = self._start_new_five_hour_block(session)
        else:
            # Start first 5-hour block
            block_id = self._start_new_five_hour_block(session)
        
        # Link session to 5-hour block
        session.metadata['five_hour_block_id'] = block_id
        
        conn.commit()
        conn.close()
        
    def _start_new_five_hour_block(self, session: RealSession) -> str:
        """Start a new 5-hour session block"""
        block_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            INSERT INTO five_hour_blocks 
            (id, start_time, session_type, total_sessions, total_tokens, is_complete)
            VALUES (?, ?, ?, 0, 0, FALSE)
        ''', (block_id, session.start_time, session.session_type))
        conn.commit()
        conn.close()
        
        print(f"🕐 Started new 5-hour block: {block_id[:8]}")
        return block_id
    
    def _save_session(self, session: RealSession):
        """Save session to database"""
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            INSERT OR REPLACE INTO real_sessions 
            (id, session_type, start_time, end_time, process_id, project_path,
             conversation_id, total_messages, models_used, estimated_tokens,
             is_active, metadata, five_hour_block_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            session.id, session.session_type, session.start_time, session.end_time,
            session.process_id, session.project_path, session.conversation_id,
            session.total_messages, json.dumps(session.models_used),
            session.estimated_tokens, session.is_active, json.dumps(session.metadata),
            session.metadata.get('five_hour_block_id')
        ))
        conn.commit()
        conn.close()
    
    def get_current_sessions(self) -> List[RealSession]:
        """Get all currently active sessions"""
        return list(self.active_sessions.values())
    
    def get_five_hour_blocks(self, limit: int = 10) -> List[Dict]:
        """Get recent 5-hour blocks"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM five_hour_blocks 
            ORDER BY start_time DESC LIMIT ?
        ''', (limit,))
        
        columns = [description[0] for description in cursor.description]
        blocks = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        return blocks
    
    def get_session_analytics(self) -> Dict:
        """Get real session analytics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get today's stats
        today = datetime.now().date()
        cursor.execute('''
            SELECT 
                COUNT(*) as total_sessions,
                SUM(estimated_tokens) as total_tokens,
                AVG(total_messages) as avg_messages,
                session_type
            FROM real_sessions 
            WHERE DATE(start_time) = ?
            GROUP BY session_type
        ''', (today,))
        
        today_stats = cursor.fetchall()
        
        # Get weekly stats
        week_start = datetime.now() - timedelta(days=7)
        cursor.execute('''
            SELECT 
                COUNT(*) as total_sessions,
                SUM(estimated_tokens) as total_tokens,
                session_type
            FROM real_sessions 
            WHERE start_time >= ?
            GROUP BY session_type
        ''', (week_start,))
        
        weekly_stats = cursor.fetchall()
        
        conn.close()
        
        return {
            'today': today_stats,
            'weekly': weekly_stats,
            'active_sessions': len(self.active_sessions),
            'last_updated': datetime.now().isoformat()
        }

def main():
    """Main function to start real session tracking"""
    tracker = RealSessionTracker()
    
    try:
        tracker.start_tracking()
        
        print("✅ Real session tracking started!")
        print("Press Ctrl+C to stop...")
        
        # Keep the main thread alive
        while True:
            time.sleep(10)
            
            # Print current status
            active_sessions = tracker.get_current_sessions()
            if active_sessions:
                print(f"📊 Active sessions: {len(active_sessions)}")
                for session in active_sessions:
                    duration = datetime.now() - session.start_time
                    print(f"   {session.session_type}: {duration}")
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping session tracking...")
        tracker.process_monitor.stop()

if __name__ == "__main__":
    main()
