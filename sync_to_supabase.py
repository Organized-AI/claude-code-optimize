#!/usr/bin/env python3
"""
Sync Claude Code session data from SQLite to Supabase
Ensures dashboard has access to the most recent session data
"""
import sqlite3
import json
import os
import requests
from datetime import datetime, timezone
from typing import Dict, List, Any
import sys

# Supabase configuration
SUPABASE_URL = "https://rdsfgdtsbyioqilatvxu.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkc2ZnZHRzYnlpb3FpbGF0dnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMxNjI3NDYsImV4cCI6MjAzODczODc0Nn0.YKiDGYzMnOXhKfOV4xf2oZYTxUl9EHh4J8hSgzFDxQw"

class SupabaseSync:
    def __init__(self):
        self.headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        self.base_url = f"{SUPABASE_URL}/rest/v1"
        
    def test_connection(self) -> bool:
        """Test connection to Supabase"""
        try:
            response = requests.get(f"{self.base_url}/sessions?limit=1", headers=self.headers)
            print(f"🔗 Supabase connection test: {response.status_code}")
            return response.status_code in [200, 404]  # 404 is ok if table doesn't exist yet
        except Exception as e:
            print(f"❌ Supabase connection failed: {e}")
            return False
    
    def create_tables(self) -> bool:
        """Create tables in Supabase via SQL"""
        sql_commands = [
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                session_type TEXT NOT NULL,
                start_time TIMESTAMPTZ NOT NULL,
                end_time TIMESTAMPTZ,
                duration_minutes REAL,
                process_id INTEGER,
                project_path TEXT,
                conversation_id TEXT,
                total_messages INTEGER DEFAULT 0,
                models_used TEXT,
                estimated_tokens INTEGER DEFAULT 0,
                real_input_tokens INTEGER DEFAULT 0,
                real_output_tokens INTEGER DEFAULT 0,
                real_total_tokens INTEGER DEFAULT 0,
                estimated_cost REAL DEFAULT 0.0,
                real_cost REAL DEFAULT 0.0,
                efficiency_score REAL DEFAULT 0.0,
                files_created INTEGER DEFAULT 0,
                files_modified INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT false,
                metadata TEXT,
                five_hour_block_id TEXT,
                token_extraction_method TEXT DEFAULT 'estimated',
                last_token_update TIMESTAMPTZ DEFAULT now(),
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now(),
                cache_creation_tokens INTEGER DEFAULT 0,
                cache_read_tokens INTEGER DEFAULT 0,
                total_cache_tokens INTEGER DEFAULT 0
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS five_hour_blocks (
                id TEXT PRIMARY KEY,
                start_time TIMESTAMPTZ NOT NULL,
                end_time TIMESTAMPTZ,
                session_type TEXT,
                total_sessions INTEGER DEFAULT 0,
                total_tokens INTEGER DEFAULT 0,
                total_cost REAL DEFAULT 0.0,
                efficiency_score REAL DEFAULT 0.0,
                is_complete BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS message_breakdown (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                message_number INTEGER NOT NULL,
                role TEXT NOT NULL,
                content_preview TEXT,
                tokens INTEGER DEFAULT 0,
                tools_used INTEGER DEFAULT 0,
                files_affected INTEGER DEFAULT 0,
                timestamp TIMESTAMPTZ DEFAULT now(),
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS tool_usage (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                tool_name TEXT NOT NULL,
                usage_count INTEGER DEFAULT 1,
                first_used TIMESTAMPTZ DEFAULT now(),
                last_used TIMESTAMPTZ DEFAULT now(),
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS cost_breakdown (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                input_cost REAL DEFAULT 0.0,
                output_cost REAL DEFAULT 0.0,
                total_cost REAL DEFAULT 0.0,
                cost_calculation_date TIMESTAMPTZ DEFAULT now(),
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );
            """
        ]
        
        # Use the SQL endpoint for table creation
        for sql in sql_commands:
            try:
                response = requests.post(
                    f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                    headers=self.headers,
                    json={"sql": sql.strip()}
                )
                if response.status_code not in [200, 201]:
                    print(f"⚠️  Table creation warning: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"⚠️  Table creation error: {e}")
        
        print("✅ Tables created/verified in Supabase")
        return True
    
    def sync_sessions(self, sessions: List[Dict]) -> int:
        """Sync sessions to Supabase"""
        if not sessions:
            return 0
            
        synced = 0
        for session in sessions:
            try:
                # Convert datetime strings to ISO format if needed
                for date_field in ['start_time', 'end_time', 'last_token_update', 'created_at', 'updated_at']:
                    if session.get(date_field) and isinstance(session[date_field], str):
                        # Try to parse and reformat
                        try:
                            dt = datetime.fromisoformat(session[date_field].replace('Z', '+00:00'))
                            session[date_field] = dt.isoformat()
                        except:
                            pass
                
                response = requests.post(
                    f"{self.base_url}/sessions",
                    headers=self.headers,
                    json=session
                )
                
                if response.status_code in [200, 201]:
                    synced += 1
                elif response.status_code == 409:  # Conflict - already exists
                    # Try to update instead
                    session_id = session['id']
                    update_headers = {**self.headers, "Prefer": "return=minimal"}
                    response = requests.patch(
                        f"{self.base_url}/sessions?id=eq.{session_id}",
                        headers=update_headers,
                        json=session
                    )
                    if response.status_code in [200, 204]:
                        synced += 1
                else:
                    print(f"⚠️  Session sync error: {response.status_code} - {response.text}")
                    
            except Exception as e:
                print(f"⚠️  Error syncing session {session.get('id', 'unknown')}: {e}")
        
        return synced
    
    def sync_table_data(self, table_name: str, data: List[Dict]) -> int:
        """Sync data to any table"""
        if not data:
            return 0
            
        synced = 0
        for item in data:
            try:
                response = requests.post(
                    f"{self.base_url}/{table_name}",
                    headers=self.headers,
                    json=item
                )
                
                if response.status_code in [200, 201]:
                    synced += 1
                elif response.status_code == 409:  # Conflict
                    print(f"⚠️  Duplicate entry in {table_name}: {item}")
                else:
                    print(f"⚠️  {table_name} sync error: {response.status_code}")
                    
            except Exception as e:
                print(f"⚠️  Error syncing {table_name}: {e}")
        
        return synced

def load_sqlite_data(db_path: str) -> Dict[str, List[Dict]]:
    """Load data from SQLite database"""
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return {}
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # This enables column access by name
    cursor = conn.cursor()
    
    data = {}
    
    # Load sessions
    try:
        cursor.execute("SELECT * FROM sessions ORDER BY start_time DESC LIMIT 100")
        sessions = [dict(row) for row in cursor.fetchall()]
        data['sessions'] = sessions
        print(f"📊 Loaded {len(sessions)} sessions")
    except Exception as e:
        print(f"⚠️  Error loading sessions: {e}")
        data['sessions'] = []
    
    # Load five_hour_blocks
    try:
        cursor.execute("SELECT * FROM five_hour_blocks ORDER BY start_time DESC LIMIT 50")
        blocks = [dict(row) for row in cursor.fetchall()]
        data['five_hour_blocks'] = blocks
        print(f"📊 Loaded {len(blocks)} five-hour blocks")
    except Exception as e:
        print(f"⚠️  Error loading blocks: {e}")
        data['five_hour_blocks'] = []
    
    # Load message_breakdown
    try:
        cursor.execute("""
            SELECT mb.* FROM message_breakdown mb 
            JOIN sessions s ON mb.session_id = s.id 
            WHERE s.start_time >= datetime('now', '-7 days')
            ORDER BY mb.timestamp DESC LIMIT 500
        """)
        messages = [dict(row) for row in cursor.fetchall()]
        data['message_breakdown'] = messages
        print(f"📊 Loaded {len(messages)} message breakdowns")
    except Exception as e:
        print(f"⚠️  Error loading messages: {e}")
        data['message_breakdown'] = []
    
    # Load tool_usage
    try:
        cursor.execute("""
            SELECT tu.* FROM tool_usage tu 
            JOIN sessions s ON tu.session_id = s.id 
            WHERE s.start_time >= datetime('now', '-7 days')
        """)
        tools = [dict(row) for row in cursor.fetchall()]
        data['tool_usage'] = tools
        print(f"📊 Loaded {len(tools)} tool usage records")
    except Exception as e:
        print(f"⚠️  Error loading tools: {e}")
        data['tool_usage'] = []
    
    # Load cost_breakdown
    try:
        cursor.execute("""
            SELECT cb.* FROM cost_breakdown cb 
            JOIN sessions s ON cb.session_id = s.id 
            WHERE s.start_time >= datetime('now', '-7 days')
        """)
        costs = [dict(row) for row in cursor.fetchall()]
        data['cost_breakdown'] = costs
        print(f"📊 Loaded {len(costs)} cost breakdown records")
    except Exception as e:
        print(f"⚠️  Error loading costs: {e}")
        data['cost_breakdown'] = []
    
    conn.close()
    return data

def load_live_session_data() -> Dict:
    """Load current live session data"""
    live_file = '.live_session_metrics.json'
    if not os.path.exists(live_file):
        return {}
    
    try:
        with open(live_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️  Error loading live session data: {e}")
        return {}

def main():
    """Main sync function"""
    print("🚀 CLAUDE CODE OPTIMIZER - SUPABASE SYNC")
    print("=" * 50)
    print()
    
    # Initialize Supabase sync
    supabase = SupabaseSync()
    
    # Test connection
    if not supabase.test_connection():
        print("❌ Cannot connect to Supabase. Check your credentials.")
        sys.exit(1)
    
    # Create tables
    supabase.create_tables()
    
    # Load SQLite data
    print("\n📊 Loading SQLite data...")
    sqlite_data = load_sqlite_data('claude_usage.db')
    
    # Load live session data
    print("📱 Loading live session data...")
    live_data = load_live_session_data()
    
    # Sync data to Supabase
    print("\n🔄 Syncing to Supabase...")
    
    total_synced = 0
    
    # Sync sessions
    sessions_synced = supabase.sync_sessions(sqlite_data.get('sessions', []))
    total_synced += sessions_synced
    print(f"✅ Synced {sessions_synced} sessions")
    
    # Sync other tables
    for table_name in ['five_hour_blocks', 'message_breakdown', 'tool_usage', 'cost_breakdown']:
        if table_name in sqlite_data:
            synced = supabase.sync_table_data(table_name, sqlite_data[table_name])
            total_synced += synced
            print(f"✅ Synced {synced} {table_name} records")
    
    # Handle live session data if present
    if live_data and 'current_session' in live_data:
        current_session = live_data['current_session']
        session_id = current_session.get('session_id')
        
        if session_id:
            # Convert to sessions table format
            live_session = {
                'id': session_id,
                'session_type': 'claude-code',
                'start_time': current_session.get('start_time'),
                'duration_minutes': current_session.get('duration_minutes', 0),
                'estimated_tokens': current_session.get('total_tokens', 0),
                'estimated_cost': current_session.get('estimated_cost', 0.0),
                'files_created': current_session.get('files_created', 0),
                'files_modified': current_session.get('files_modified', 0),
                'efficiency_score': current_session.get('efficiency_score', 0.0),
                'is_active': True,
                'last_token_update': current_session.get('last_update'),
                'total_messages': len(live_data.get('breakdown', []))
            }
            
            live_synced = supabase.sync_sessions([live_session])
            total_synced += live_synced
            print(f"✅ Synced live session data")
    
    print(f"\n🎉 SYNC COMPLETE!")
    print("=" * 50)
    print(f"✅ Total records synced: {total_synced}")
    print(f"🌐 Supabase project: rdsfgdtsbyioqilatvxu")
    print(f"📊 Dashboard should now have access to latest data")
    print()
    print("🔗 Access your data at:")
    print(f"   Dashboard: {SUPABASE_URL}")
    print(f"   API: {SUPABASE_URL}/rest/v1/sessions")

if __name__ == "__main__":
    main()