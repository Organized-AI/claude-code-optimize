#!/usr/bin/env python3
"""
Unified Database Migration and Consolidation
Consolidates scattered database files into a single, well-structured database
"""
import sqlite3
import json
import os
import shutil
import datetime
from pathlib import Path

def create_unified_schema(conn):
    """Create the unified database schema"""
    cursor = conn.cursor()
    
    # Main sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            session_type TEXT NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
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
            is_active BOOLEAN DEFAULT 0,
            metadata TEXT,
            five_hour_block_id TEXT,
            token_extraction_method TEXT DEFAULT 'estimated',
            last_token_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Five-hour blocks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS five_hour_blocks (
            id TEXT PRIMARY KEY,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            session_type TEXT,
            total_sessions INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            total_cost REAL DEFAULT 0.0,
            efficiency_score REAL DEFAULT 0.0,
            is_complete BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Message breakdown table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS message_breakdown (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            message_number INTEGER NOT NULL,
            role TEXT NOT NULL,
            content_preview TEXT,
            tokens INTEGER DEFAULT 0,
            tools_used INTEGER DEFAULT 0,
            files_affected INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)
    
    # Tools usage tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tool_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            tool_name TEXT NOT NULL,
            usage_count INTEGER DEFAULT 1,
            first_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)
    
    # Cost tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cost_breakdown (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            input_cost REAL DEFAULT 0.0,
            output_cost REAL DEFAULT 0.0,
            total_cost REAL DEFAULT 0.0,
            cost_calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)
    
    # Indexes for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_block ON sessions(five_hour_block_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_blocks_start_time ON five_hour_blocks(start_time)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON message_breakdown(session_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tools_session ON tool_usage(session_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cost_session ON cost_breakdown(session_id)")
    
    conn.commit()
    print("✅ Created unified database schema")

def migrate_existing_data(main_conn):
    """Migrate data from scattered database files"""
    
    # Database files to migrate from
    db_files = [
        './claude_usage.db',
        './data/claude_usage.db',
        './session_tracker/claude_usage.db',
        './dashboard-server/claude-monitor.db'
    ]
    
    migrated_sessions = set()
    
    for db_file in db_files:
        if not os.path.exists(db_file):
            continue
            
        print(f"📊 Migrating from {db_file}...")
        
        try:
            source_conn = sqlite3.connect(db_file)
            source_cursor = source_conn.cursor()
            
            # Check what tables exist
            source_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in source_cursor.fetchall()]
            
            # Migrate real_sessions table if it exists
            if 'real_sessions' in tables:
                source_cursor.execute("SELECT * FROM real_sessions")
                sessions = source_cursor.fetchall()
                
                # Get column names
                source_cursor.execute("PRAGMA table_info(real_sessions)")
                columns = [col[1] for col in source_cursor.fetchall()]
                
                main_cursor = main_conn.cursor()
                
                for session in sessions:
                    session_dict = dict(zip(columns, session))
                    session_id = session_dict.get('id')
                    
                    if session_id in migrated_sessions:
                        continue
                        
                    migrated_sessions.add(session_id)
                    
                    # Map old schema to new schema
                    main_cursor.execute("""
                        INSERT OR REPLACE INTO sessions (
                            id, session_type, start_time, end_time, process_id,
                            project_path, conversation_id, total_messages, models_used,
                            estimated_tokens, real_input_tokens, real_output_tokens,
                            real_total_tokens, is_active, metadata, five_hour_block_id,
                            token_extraction_method, last_token_update, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        session_id,
                        session_dict.get('session_type', 'unknown'),
                        session_dict.get('start_time'),
                        session_dict.get('end_time'),
                        session_dict.get('process_id'),
                        session_dict.get('project_path'),
                        session_dict.get('conversation_id'),
                        session_dict.get('total_messages', 0),
                        session_dict.get('models_used'),
                        session_dict.get('estimated_tokens', 0),
                        session_dict.get('real_input_tokens', 0),
                        session_dict.get('real_output_tokens', 0),
                        session_dict.get('real_total_tokens', 0),
                        session_dict.get('is_active', 0),
                        session_dict.get('metadata'),
                        session_dict.get('five_hour_block_id'),
                        session_dict.get('token_extraction_method', 'estimated'),
                        session_dict.get('last_token_update'),
                        session_dict.get('created_at')
                    ))
                
                print(f"  ✅ Migrated {len(sessions)} sessions")
            
            # Migrate five_hour_blocks if it exists
            if 'five_hour_blocks' in tables:
                source_cursor.execute("SELECT * FROM five_hour_blocks")
                blocks = source_cursor.fetchall()
                
                source_cursor.execute("PRAGMA table_info(five_hour_blocks)")
                columns = [col[1] for col in source_cursor.fetchall()]
                
                main_cursor = main_conn.cursor()
                
                for block in blocks:
                    block_dict = dict(zip(columns, block))
                    
                    main_cursor.execute("""
                        INSERT OR REPLACE INTO five_hour_blocks (
                            id, start_time, end_time, session_type, total_sessions,
                            total_tokens, efficiency_score, is_complete, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        block_dict.get('id'),
                        block_dict.get('start_time'),
                        block_dict.get('end_time'),
                        block_dict.get('session_type'),
                        block_dict.get('total_sessions', 0),
                        block_dict.get('total_tokens', 0),
                        block_dict.get('efficiency_score', 0.0),
                        block_dict.get('is_complete', 0),
                        block_dict.get('created_at')
                    ))
                
                print(f"  ✅ Migrated {len(blocks)} blocks")
            
            source_conn.close()
            
        except Exception as e:
            print(f"  ⚠️  Error migrating {db_file}: {e}")
    
    main_conn.commit()
    print(f"✅ Migration complete - {len(migrated_sessions)} unique sessions")

def migrate_live_session_data(main_conn):
    """Migrate current live session data"""
    
    if not os.path.exists('.live_session_metrics.json'):
        return
        
    print("📱 Migrating live session data...")
    
    try:
        with open('.live_session_metrics.json', 'r') as f:
            live_data = json.load(f)
        
        session_info = live_data.get('current_session', {})
        session_id = session_info.get('session_id')
        
        if not session_id:
            return
            
        cursor = main_conn.cursor()
        
        # Insert/update main session
        cursor.execute("""
            INSERT OR REPLACE INTO sessions (
                id, session_type, start_time, duration_minutes, estimated_tokens,
                estimated_cost, files_created, files_modified, efficiency_score,
                is_active, last_token_update, total_messages
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id,
            'claude-code',
            session_info.get('start_time'),
            session_info.get('duration_minutes', 0),
            session_info.get('total_tokens', 0),
            session_info.get('estimated_cost', 0.0),
            session_info.get('files_created', 0),
            session_info.get('files_modified', 0),
            session_info.get('efficiency_score', 0.0),
            1,  # is_active
            session_info.get('last_update'),
            len(live_data.get('breakdown', []))
        ))
        
        # Insert message breakdown
        for i, msg in enumerate(live_data.get('breakdown', [])):
            cursor.execute("""
                INSERT OR REPLACE INTO message_breakdown (
                    session_id, message_number, role, content_preview, tokens, tools_used, files_affected
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                i + 1,
                'user' if msg.get('message', '').endswith('[user]') else 'assistant',
                msg.get('content', '')[:200],
                msg.get('tokens', 0),
                msg.get('tools', 0),
                msg.get('files', 0)
            ))
        
        # Insert tool usage
        for tool, count in live_data.get('tools_summary', {}).items():
            cursor.execute("""
                INSERT OR REPLACE INTO tool_usage (session_id, tool_name, usage_count)
                VALUES (?, ?, ?)
            """, (session_id, tool, count))
        
        # Insert cost breakdown
        cost_info = live_data.get('cost_breakdown', {})
        if cost_info:
            cursor.execute("""
                INSERT OR REPLACE INTO cost_breakdown (
                    session_id, input_tokens, output_tokens, input_cost, output_cost, total_cost
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                cost_info.get('input_tokens', 0),
                cost_info.get('output_tokens', 0),
                cost_info.get('input_cost', 0.0),
                cost_info.get('output_cost', 0.0),
                cost_info.get('total_cost', 0.0)
            ))
        
        main_conn.commit()
        print("✅ Live session data migrated")
        
    except Exception as e:
        print(f"⚠️  Error migrating live session data: {e}")

def create_backup():
    """Create backup of existing databases"""
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"database_backup_{timestamp}"
    
    os.makedirs(backup_dir, exist_ok=True)
    
    # Backup existing databases
    db_files = [
        './claude_usage.db',
        './data/claude_usage.db', 
        './session_tracker/claude_usage.db',
        './dashboard-server/claude-monitor.db',
        './.live_session_metrics.json'
    ]
    
    backed_up = 0
    for db_file in db_files:
        if os.path.exists(db_file):
            backup_path = os.path.join(backup_dir, os.path.basename(db_file))
            shutil.copy2(db_file, backup_path)
            backed_up += 1
    
    print(f"✅ Backed up {backed_up} files to {backup_dir}")
    return backup_dir

def main():
    """Main migration function"""
    
    print("🔄 Claude Code Optimizer - Database Migration")
    print("=" * 50)
    print()
    
    # Create backup
    backup_dir = create_backup()
    
    # Create new unified database
    unified_db = 'claude_usage_unified.db'
    
    # Remove existing unified database if it exists
    if os.path.exists(unified_db):
        os.remove(unified_db)
    
    main_conn = sqlite3.connect(unified_db)
    
    try:
        # Create schema
        create_unified_schema(main_conn)
        
        # Migrate existing data
        migrate_existing_data(main_conn)
        
        # Migrate live session data
        migrate_live_session_data(main_conn)
        
        # Replace main database
        main_conn.close()
        
        # Backup current main db and replace with unified
        if os.path.exists('claude_usage.db'):
            shutil.move('claude_usage.db', f'{backup_dir}/claude_usage_old.db')
        
        shutil.move(unified_db, 'claude_usage.db')
        
        print()
        print("🎉 Database Migration Complete!")
        print("=" * 50)
        print(f"✅ Unified database: claude_usage.db")
        print(f"✅ Backup created: {backup_dir}")
        print(f"✅ Schema: 5 tables with proper relationships")
        print(f"✅ Indexes: Optimized for performance")
        print()
        
        # Test the new database
        test_conn = sqlite3.connect('claude_usage.db')
        cursor = test_conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM sessions")
        session_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM five_hour_blocks")
        block_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM message_breakdown")
        message_count = cursor.fetchone()[0]
        
        print(f"📊 Migration Results:")
        print(f"   Sessions: {session_count}")
        print(f"   Blocks: {block_count}")
        print(f"   Messages: {message_count}")
        
        test_conn.close()
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        if main_conn:
            main_conn.close()
        
        # Restore from backup if needed
        if os.path.exists(f'{backup_dir}/claude_usage.db'):
            shutil.copy2(f'{backup_dir}/claude_usage.db', 'claude_usage.db')
            print("✅ Restored original database from backup")

if __name__ == "__main__":
    main()