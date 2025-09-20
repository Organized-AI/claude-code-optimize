#!/usr/bin/env python3
"""
Safe Data Migration from SQLite to Supabase
"""

import os
import sys
import sqlite3
import json
import logging
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import psycopg2
from psycopg2.extras import execute_values, RealDictCursor
import uuid

class SQLiteToSupabaseMigrator:
    """Migrates data from SQLite to Supabase with progress tracking"""
    
    def __init__(self, sqlite_path: Path, supabase_config: Dict):
        self.sqlite_path = sqlite_path
        self.supabase_config = supabase_config
        self.setup_logging()
        
        # Migration tracking
        self.migration_stats = {
            "total_records": 0,
            "migrated_records": 0,
            "failed_records": 0,
            "start_time": None,
            "end_time": None
        }
    
    def setup_logging(self):
        """Setup migration logging"""
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger('SQLiteToSupabase')
    
    async def migrate_all_tables(self) -> Dict:
        """Migrate all tables from SQLite to Supabase"""
        self.migration_stats["start_time"] = datetime.now()
        
        try:
            # Connect to databases
            sqlite_conn = sqlite3.connect(self.sqlite_path)
            sqlite_conn.row_factory = sqlite3.Row
            
            supabase_conn = psycopg2.connect(
                host=self.supabase_config["host"],
                database=self.supabase_config["database"],
                user=self.supabase_config["user"],
                password=self.supabase_config["password"]
            )
            
            # Migration order (dependencies first)
            migration_order = [
                "five_hour_blocks",
                "sessions", 
                "message_breakdown",
                "tool_usage",
                "cost_breakdown"
            ]
            
            for table_name in migration_order:
                await self._migrate_table(sqlite_conn, supabase_conn, table_name)
            
            sqlite_conn.close()
            supabase_conn.close()
            
            self.migration_stats["end_time"] = datetime.now()
            return self.migration_stats
            
        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            raise
    
    async def _migrate_table(self, sqlite_conn, supabase_conn, table_name: str):
        """Migrate a specific table"""
        self.logger.info(f"Migrating table: {table_name}")
        
        # Get data from SQLite
        cursor = sqlite_conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        if not rows:
            self.logger.info(f"No data in table {table_name}")
            return
        
        # Transform and insert into Supabase
        transformed_rows = [self._transform_row(dict(row), table_name) for row in rows]
        
        with supabase_conn.cursor() as pg_cursor:
            self._bulk_insert(pg_cursor, table_name, transformed_rows)
        
        supabase_conn.commit()
        self.logger.info(f"Migrated {len(rows)} records from {table_name}")
        
        self.migration_stats["migrated_records"] += len(rows)
    
    def _transform_row(self, row: Dict, table_name: str) -> Dict:
        """Transform SQLite row for Supabase"""
        if table_name == "sessions":
            # Ensure UUID format for session IDs
            if 'id' in row and not self._is_uuid(row['id']):
                row['id'] = str(uuid.uuid4())
        
        # Convert timestamps
        for field in ['start_time', 'end_time', 'created_at', 'updated_at']:
            if field in row and row[field]:
                row[field] = self._parse_timestamp(row[field])
        
        return row
    
    def _is_uuid(self, value: str) -> bool:
        """Check if string is valid UUID"""
        try:
            uuid.UUID(value)
            return True
        except:
            return False
    
    def _parse_timestamp(self, ts: Any) -> str:
        """Parse timestamp to ISO format"""
        if isinstance(ts, str):
            return ts
        elif isinstance(ts, datetime):
            return ts.isoformat()
        else:
            return str(ts)
    
    def _bulk_insert(self, cursor, table_name: str, rows: List[Dict]):
        """Bulk insert rows into Supabase table"""
        if not rows:
            return
        
        columns = list(rows[0].keys())
        values = [[row.get(col) for col in columns] for row in rows]
        
        query = f"""
            INSERT INTO {table_name} ({', '.join(columns)})
            VALUES %s
            ON CONFLICT (id) DO UPDATE SET
                updated_at = EXCLUDED.updated_at
        """
        
        execute_values(cursor, query, values)

async def main():
    """Main migration execution"""
    project_root = Path(__file__).parent.parent
    sqlite_path = project_root / "claude_usage.db"
    
    supabase_config = {
        "host": os.getenv("SUPABASE_HOST", "localhost"),
        "database": "postgres", 
        "user": "postgres",
        "password": os.getenv("SUPABASE_PASSWORD", "")
    }
    
    migrator = SQLiteToSupabaseMigrator(sqlite_path, supabase_config)
    
    try:
        stats = await migrator.migrate_all_tables()
        print(f"✅ Migration completed: {stats}")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())