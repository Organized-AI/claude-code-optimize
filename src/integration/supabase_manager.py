#!/usr/bin/env python3
"""
Bulletproof Supabase Integration with Connection Pooling
Robust database connection management and data operations
"""

import os
import sys
import asyncio
import logging
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import psycopg2
from psycopg2 import pool, sql
from psycopg2.extras import RealDictCursor, execute_values
from contextlib import contextmanager
import threading
from queue import Queue, Empty

@dataclass
class ConnectionConfig:
    """Supabase connection configuration"""
    host: str
    database: str
    user: str
    password: str
    port: int = 5432
    sslmode: str = "require"
    pool_size: int = 10
    max_overflow: int = 20
    timeout: int = 30

@dataclass
class QueryResult:
    """Query execution result"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    rows_affected: int = 0
    execution_time_ms: float = 0

class SupabaseManager:
    """High-performance Supabase connection manager with pooling"""
    
    def __init__(self, config: Optional[ConnectionConfig] = None):
        self.config = config or self._load_config_from_env()
        self.setup_logging()
        
        # Connection pool
        self.connection_pool = None
        self.pool_lock = threading.Lock()
        
        # Query statistics
        self.query_stats = {
            "total_queries": 0,
            "successful_queries": 0,
            "failed_queries": 0,
            "avg_execution_time_ms": 0,
            "last_error": None,
            "last_query_time": None
        }
        
        # Health monitoring
        self.health_check_interval = 60  # seconds
        self.last_health_check = None
        self.is_healthy = False
        
        # Initialize connection pool
        self._initialize_pool()
    
    def _load_config_from_env(self) -> ConnectionConfig:
        """Load configuration from environment variables"""
        supabase_url = os.getenv("SUPABASE_URL", "")
        supabase_password = os.getenv("SUPABASE_PASSWORD", "")
        
        # Parse URL to extract host
        if supabase_url.startswith("https://"):
            host = supabase_url.replace("https://", "").split(".")[0]
            full_host = f"{host}.supabase.co"
        else:
            full_host = supabase_url
        
        return ConnectionConfig(
            host=full_host,
            database="postgres",
            user="postgres", 
            password=supabase_password,
            pool_size=int(os.getenv("SUPABASE_POOL_SIZE", "10")),
            max_overflow=int(os.getenv("SUPABASE_MAX_OVERFLOW", "20")),
            timeout=int(os.getenv("SUPABASE_TIMEOUT", "30"))
        )
    
    def setup_logging(self):
        """Setup logging"""
        self.logger = logging.getLogger('SupabaseManager')
    
    def _initialize_pool(self):
        """Initialize connection pool"""
        try:
            with self.pool_lock:
                self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
                    minconn=1,
                    maxconn=self.config.pool_size,
                    host=self.config.host,
                    database=self.config.database,
                    user=self.config.user,
                    password=self.config.password,
                    port=self.config.port,
                    sslmode=self.config.sslmode,
                    connect_timeout=self.config.timeout,
                    cursor_factory=RealDictCursor
                )
            
            self.logger.info("Supabase connection pool initialized")
            self.is_healthy = True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize connection pool: {e}")
            self.is_healthy = False
            raise
    
    @contextmanager
    def get_connection(self):
        """Get connection from pool with automatic cleanup"""
        connection = None
        try:
            with self.pool_lock:
                if self.connection_pool:
                    connection = self.connection_pool.getconn()
                else:
                    raise Exception("Connection pool not initialized")
            
            yield connection
            
        except Exception as e:
            if connection:
                connection.rollback()
            raise e
        finally:
            if connection:
                with self.pool_lock:
                    if self.connection_pool:
                        self.connection_pool.putconn(connection)
    
    def execute_query(self, query: str, params: Optional[tuple] = None, 
                     fetch: bool = True) -> QueryResult:
        """Execute a single query with error handling"""
        start_time = time.time()
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    
                    if fetch and cursor.description:
                        data = cursor.fetchall()
                        rows_affected = len(data)
                    else:
                        data = None
                        rows_affected = cursor.rowcount
                    
                    conn.commit()
                    
            execution_time = (time.time() - start_time) * 1000
            
            self._update_query_stats(True, execution_time)
            
            return QueryResult(
                success=True,
                data=data,
                rows_affected=rows_affected,
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            error_msg = str(e)
            
            self._update_query_stats(False, execution_time, error_msg)
            self.logger.error(f"Query execution failed: {error_msg}")
            
            return QueryResult(
                success=False,
                error=error_msg,
                execution_time_ms=execution_time
            )
    
    def execute_many(self, query: str, params_list: List[tuple]) -> QueryResult:
        """Execute query with multiple parameter sets"""
        start_time = time.time()
        
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.executemany(query, params_list)
                    conn.commit()
                    
            execution_time = (time.time() - start_time) * 1000
            self._update_query_stats(True, execution_time)
            
            return QueryResult(
                success=True,
                rows_affected=len(params_list),
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            error_msg = str(e)
            
            self._update_query_stats(False, execution_time, error_msg)
            self.logger.error(f"Batch execution failed: {error_msg}")
            
            return QueryResult(
                success=False,
                error=error_msg,
                execution_time_ms=execution_time
            )
    
    def bulk_insert(self, table: str, data: List[Dict], 
                   conflict_action: str = "DO NOTHING") -> QueryResult:
        """Bulk insert data with conflict resolution"""
        if not data:
            return QueryResult(success=True, rows_affected=0)
        
        start_time = time.time()
        
        try:
            # Prepare columns and values
            columns = list(data[0].keys())
            values = [[row.get(col) for col in columns] for row in data]
            
            # Build query
            column_list = ', '.join(columns)
            conflict_clause = f"ON CONFLICT {conflict_action}"
            
            query = f"""
                INSERT INTO {table} ({column_list})
                VALUES %s
                {conflict_clause}
            """
            
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    execute_values(cursor, query, values, page_size=1000)
                    conn.commit()
                    
            execution_time = (time.time() - start_time) * 1000
            self._update_query_stats(True, execution_time)
            
            return QueryResult(
                success=True,
                rows_affected=len(data),
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            error_msg = str(e)
            
            self._update_query_stats(False, execution_time, error_msg)
            self.logger.error(f"Bulk insert failed: {error_msg}")
            
            return QueryResult(
                success=False,
                error=error_msg,
                execution_time_ms=execution_time
            )
    
    def upsert_session(self, session_data: Dict) -> QueryResult:
        """Upsert session data with smart conflict resolution"""
        query = """
            INSERT INTO sessions (
                id, session_type, start_time, end_time, duration_minutes,
                process_id, project_path, conversation_id, total_messages,
                models_used, estimated_tokens, real_input_tokens, real_output_tokens,
                real_total_tokens, cache_creation_tokens, cache_read_tokens,
                total_cache_tokens, estimated_cost, real_cost, cache_discount,
                files_created, files_modified, tools_used, is_active,
                metadata, five_hour_block_id, token_extraction_method,
                efficiency_score, response_time_avg, error_count
            )
            VALUES (
                %(id)s, %(session_type)s, %(start_time)s, %(end_time)s, %(duration_minutes)s,
                %(process_id)s, %(project_path)s, %(conversation_id)s, %(total_messages)s,
                %(models_used)s, %(estimated_tokens)s, %(real_input_tokens)s, %(real_output_tokens)s,
                %(real_total_tokens)s, %(cache_creation_tokens)s, %(cache_read_tokens)s,
                %(total_cache_tokens)s, %(estimated_cost)s, %(real_cost)s, %(cache_discount)s,
                %(files_created)s, %(files_modified)s, %(tools_used)s, %(is_active)s,
                %(metadata)s, %(five_hour_block_id)s, %(token_extraction_method)s,
                %(efficiency_score)s, %(response_time_avg)s, %(error_count)s
            )
            ON CONFLICT (id) DO UPDATE SET
                end_time = EXCLUDED.end_time,
                duration_minutes = EXCLUDED.duration_minutes,
                total_messages = EXCLUDED.total_messages,
                real_input_tokens = EXCLUDED.real_input_tokens,
                real_output_tokens = EXCLUDED.real_output_tokens,
                real_total_tokens = EXCLUDED.real_total_tokens,
                cache_creation_tokens = EXCLUDED.cache_creation_tokens,
                cache_read_tokens = EXCLUDED.cache_read_tokens,
                total_cache_tokens = EXCLUDED.total_cache_tokens,
                real_cost = EXCLUDED.real_cost,
                cache_discount = EXCLUDED.cache_discount,
                files_created = EXCLUDED.files_created,
                files_modified = EXCLUDED.files_modified,
                tools_used = EXCLUDED.tools_used,
                is_active = EXCLUDED.is_active,
                metadata = EXCLUDED.metadata,
                efficiency_score = EXCLUDED.efficiency_score,
                response_time_avg = EXCLUDED.response_time_avg,
                error_count = EXCLUDED.error_count,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """
        
        # Ensure proper data types and defaults
        processed_data = self._prepare_session_data(session_data)
        
        return self.execute_query(query, processed_data)
    
    def _prepare_session_data(self, data: Dict) -> Dict:
        """Prepare session data for database insertion"""
        # Set defaults for required fields
        prepared = {
            'id': data.get('id', ''),
            'session_type': data.get('session_type', 'claude-code'),
            'start_time': data.get('start_time'),
            'end_time': data.get('end_time'),
            'duration_minutes': data.get('duration_minutes'),
            'process_id': data.get('process_id'),
            'project_path': data.get('project_path'),
            'conversation_id': data.get('conversation_id'),
            'total_messages': data.get('total_messages', 0),
            'models_used': json.dumps(data.get('models_used', [])),
            'estimated_tokens': data.get('estimated_tokens', 0),
            'real_input_tokens': data.get('real_input_tokens', 0),
            'real_output_tokens': data.get('real_output_tokens', 0),
            'real_total_tokens': data.get('real_total_tokens', 0),
            'cache_creation_tokens': data.get('cache_creation_tokens', 0),
            'cache_read_tokens': data.get('cache_read_tokens', 0),
            'total_cache_tokens': data.get('total_cache_tokens', 0),
            'estimated_cost': data.get('estimated_cost', 0.0),
            'real_cost': data.get('real_cost', 0.0),
            'cache_discount': data.get('cache_discount', 0.0),
            'files_created': data.get('files_created', 0),
            'files_modified': data.get('files_modified', 0),
            'tools_used': json.dumps(data.get('tools_used', {})),
            'is_active': data.get('is_active', False),
            'metadata': json.dumps(data.get('metadata', {})),
            'five_hour_block_id': data.get('five_hour_block_id'),
            'token_extraction_method': data.get('token_extraction_method', 'estimated'),
            'efficiency_score': data.get('efficiency_score'),
            'response_time_avg': data.get('response_time_avg'),
            'error_count': data.get('error_count', 0)
        }
        
        return prepared
    
    def get_active_sessions(self) -> QueryResult:
        """Get all active sessions"""
        query = """
            SELECT s.*, fb.start_time as block_start, fb.end_time as block_end
            FROM sessions s
            LEFT JOIN five_hour_blocks fb ON s.five_hour_block_id = fb.id
            WHERE s.is_active = true
            ORDER BY s.start_time DESC
        """
        
        return self.execute_query(query)
    
    def get_session_by_id(self, session_id: str) -> QueryResult:
        """Get specific session by ID"""
        query = """
            SELECT s.*, fb.start_time as block_start, fb.end_time as block_end
            FROM sessions s
            LEFT JOIN five_hour_blocks fb ON s.five_hour_block_id = fb.id
            WHERE s.id = %s
        """
        
        return self.execute_query(query, (session_id,))
    
    def get_recent_sessions(self, limit: int = 50) -> QueryResult:
        """Get recent sessions"""
        query = """
            SELECT s.*, fb.start_time as block_start, fb.end_time as block_end
            FROM sessions s
            LEFT JOIN five_hour_blocks fb ON s.five_hour_block_id = fb.id
            ORDER BY s.start_time DESC
            LIMIT %s
        """
        
        return self.execute_query(query, (limit,))
    
    def get_daily_summary(self, date: Optional[datetime] = None) -> QueryResult:
        """Get daily usage summary"""
        if not date:
            date = datetime.now(timezone.utc).date()
        
        query = """
            SELECT 
                COUNT(*) as total_sessions,
                SUM(real_total_tokens) as total_tokens,
                SUM(cache_read_tokens) as cache_tokens,
                SUM(real_total_tokens - COALESCE(cache_read_tokens, 0)) as billable_tokens,
                SUM(real_cost) as total_cost,
                AVG(efficiency_score) as avg_efficiency,
                SUM(files_created + files_modified) as total_files_touched
            FROM sessions
            WHERE DATE(start_time) = %s
        """
        
        return self.execute_query(query, (date,))
    
    def update_sync_status(self, source: str, records_synced: int, 
                          status: str = 'success', error_message: Optional[str] = None) -> QueryResult:
        """Update sync status tracking"""
        query = """
            INSERT INTO sync_status (source, last_sync_time, last_successful_sync, 
                                   records_synced, status, error_message)
            VALUES (%s, CURRENT_TIMESTAMP, 
                    CASE WHEN %s = 'success' THEN CURRENT_TIMESTAMP ELSE last_successful_sync END,
                    %s, %s, %s)
            ON CONFLICT (source) DO UPDATE SET
                last_sync_time = CURRENT_TIMESTAMP,
                last_successful_sync = CASE WHEN EXCLUDED.status = 'success' 
                                           THEN CURRENT_TIMESTAMP 
                                           ELSE sync_status.last_successful_sync END,
                records_synced = EXCLUDED.records_synced,
                status = EXCLUDED.status,
                error_message = EXCLUDED.error_message,
                updated_at = CURRENT_TIMESTAMP
        """
        
        return self.execute_query(query, (source, status, records_synced, status, error_message))
    
    def _update_query_stats(self, success: bool, execution_time_ms: float, error: Optional[str] = None):
        """Update query execution statistics"""
        self.query_stats["total_queries"] += 1
        self.query_stats["last_query_time"] = datetime.now()
        
        if success:
            self.query_stats["successful_queries"] += 1
        else:
            self.query_stats["failed_queries"] += 1
            self.query_stats["last_error"] = error
        
        # Update average execution time
        total_successful = self.query_stats["successful_queries"]
        if total_successful > 0:
            current_avg = self.query_stats["avg_execution_time_ms"]
            self.query_stats["avg_execution_time_ms"] = (
                (current_avg * (total_successful - 1) + execution_time_ms) / total_successful
            )
    
    def health_check(self) -> bool:
        """Perform health check"""
        try:
            result = self.execute_query("SELECT 1 as health_check")
            self.is_healthy = result.success
            self.last_health_check = datetime.now()
            
            if not result.success:
                self.logger.warning(f"Health check failed: {result.error}")
            
            return self.is_healthy
            
        except Exception as e:
            self.logger.error(f"Health check error: {e}")
            self.is_healthy = False
            return False
    
    def get_connection_stats(self) -> Dict:
        """Get connection pool statistics"""
        if not self.connection_pool:
            return {"error": "Connection pool not initialized"}
        
        with self.pool_lock:
            return {
                "pool_size": self.connection_pool.maxconn,
                "connections_in_use": len([c for c in self.connection_pool._pool if c]),
                "available_connections": len(self.connection_pool._pool),
                "is_healthy": self.is_healthy,
                "last_health_check": self.last_health_check,
                "query_stats": self.query_stats.copy()
            }
    
    def close_pool(self):
        """Close connection pool"""
        with self.pool_lock:
            if self.connection_pool:
                self.connection_pool.closeall()
                self.connection_pool = None
                self.logger.info("Connection pool closed")

async def main():
    """Test Supabase manager"""
    # Load config from environment
    manager = SupabaseManager()
    
    try:
        # Test health check
        health = manager.health_check()
        print(f"Health check: {'✅' if health else '❌'}")
        
        # Test query
        result = manager.get_recent_sessions(5)
        if result.success:
            print(f"✅ Retrieved {result.rows_affected} sessions")
            print(f"   Execution time: {result.execution_time_ms:.1f}ms")
        else:
            print(f"❌ Query failed: {result.error}")
        
        # Print stats
        stats = manager.get_connection_stats()
        print(f"📊 Connection stats: {json.dumps(stats, indent=2, default=str)}")
        
    finally:
        manager.close_pool()

if __name__ == "__main__":
    asyncio.run(main())