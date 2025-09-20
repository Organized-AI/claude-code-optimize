#!/usr/bin/env python3
"""
Simplified Data Ingestion Pipeline for Claude Code Optimizer
Bulletproof pipeline: Claude Code JSONL → Parser → Supabase → Dashboard
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, AsyncGenerator, Any
import hashlib
import time
from dataclasses import dataclass, asdict
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import aiofiles
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
import sqlite3
import threading
from queue import Queue, Empty
import signal

# Import error handling and validation
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from src.data_flow.error_handler import DataFlowErrorHandler
from src.data_flow.validator import DataValidator

@dataclass
class SessionEvent:
    """Represents a session event from JSONL"""
    session_id: str
    timestamp: datetime
    event_type: str  # 'start', 'end', 'message', 'tool'
    data: Dict[str, Any]
    file_path: str
    line_number: int
    content_hash: str

@dataclass
class ProcessingStats:
    """Processing statistics"""
    total_processed: int = 0
    successful: int = 0
    failed: int = 0
    duplicates: int = 0
    last_processed: Optional[datetime] = None
    processing_rate: float = 0.0
    
class JSONLStreamProcessor:
    """High-performance JSONL stream processor"""
    
    def __init__(self, chunk_size: int = 8192):
        self.chunk_size = chunk_size
        self.processed_hashes = set()
        self.logger = logging.getLogger('JSONLProcessor')
        
    async def process_file(self, file_path: Path, start_line: int = 0) -> AsyncGenerator[SessionEvent, None]:
        """Process JSONL file incrementally from start_line"""
        try:
            async with aiofiles.open(file_path, 'r') as f:
                # Skip to start_line
                for _ in range(start_line):
                    await f.readline()
                
                line_number = start_line
                async for line in f:
                    line_number += 1
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        # Generate content hash for deduplication
                        content_hash = hashlib.sha256(line.encode()).hexdigest()
                        if content_hash in self.processed_hashes:
                            self.logger.debug(f"Skipping duplicate line {line_number}")
                            continue
                        
                        data = json.loads(line)
                        event = self._parse_jsonl_entry(data, file_path, line_number, content_hash)
                        if event:
                            self.processed_hashes.add(content_hash)
                            yield event
                            
                    except json.JSONDecodeError as e:
                        self.logger.warning(f"Invalid JSON at {file_path}:{line_number}: {e}")
                        continue
                    except Exception as e:
                        self.logger.error(f"Error processing line {line_number}: {e}")
                        continue
                        
        except Exception as e:
            self.logger.error(f"Error reading file {file_path}: {e}")
            return
    
    def _parse_jsonl_entry(self, data: Dict, file_path: Path, line_number: int, content_hash: str) -> Optional[SessionEvent]:
        """Parse JSONL entry into SessionEvent"""
        try:
            # Detect event type based on content
            if 'type' in data and data['type'] == 'session_start':
                event_type = 'start'
                session_id = data.get('session_id', f"unknown_{int(time.time())}")
            elif 'type' in data and data['type'] == 'session_end':
                event_type = 'end'
                session_id = data.get('session_id', f"unknown_{int(time.time())}")
            elif 'content' in data and 'role' in data:
                event_type = 'message'
                session_id = data.get('conversation_id', f"conv_{int(time.time())}")
            elif 'function_calls' in data or 'tool_calls' in data:
                event_type = 'tool'
                session_id = data.get('conversation_id', f"conv_{int(time.time())}")
            else:
                # Try to infer from structure
                session_id = data.get('session_id') or data.get('conversation_id') or f"inferred_{int(time.time())}"
                event_type = 'message'
            
            timestamp = self._extract_timestamp(data)
            
            return SessionEvent(
                session_id=session_id,
                timestamp=timestamp,
                event_type=event_type,
                data=data,
                file_path=str(file_path),
                line_number=line_number,
                content_hash=content_hash
            )
            
        except Exception as e:
            self.logger.error(f"Error parsing JSONL entry: {e}")
            return None
    
    def _extract_timestamp(self, data: Dict) -> datetime:
        """Extract timestamp from JSONL data"""
        timestamp_fields = ['timestamp', 'created_at', 'time', 'date']
        
        for field in timestamp_fields:
            if field in data:
                try:
                    if isinstance(data[field], str):
                        return datetime.fromisoformat(data[field].replace('Z', '+00:00'))
                    elif isinstance(data[field], (int, float)):
                        return datetime.fromtimestamp(data[field], tz=timezone.utc)
                except:
                    continue
        
        # Fallback to current time
        return datetime.now(timezone.utc)

class DataFlowWatcher(FileSystemEventHandler):
    """Watches Claude Code data directory for changes"""
    
    def __init__(self, ingestion_pipeline):
        self.pipeline = ingestion_pipeline
        self.logger = logging.getLogger('DataFlowWatcher')
        self.watched_files = {}  # file_path -> last_size
        
    def on_modified(self, event):
        """Handle file modification events"""
        if event.is_directory:
            return
            
        file_path = Path(event.src_path)
        if file_path.suffix not in ['.jsonl', '.json']:
            return
        
        # Check if file size increased (new data)
        try:
            current_size = file_path.stat().st_size
            last_size = self.watched_files.get(str(file_path), 0)
            
            if current_size > last_size:
                self.logger.info(f"Detected new data in {file_path}")
                # Calculate approximate start line
                if last_size > 0:
                    with open(file_path, 'r') as f:
                        f.seek(last_size)
                        start_line = sum(1 for _ in f)
                else:
                    start_line = 0
                
                # Queue for processing
                asyncio.create_task(self.pipeline.process_file_update(file_path, start_line))
                self.watched_files[str(file_path)] = current_size
                
        except Exception as e:
            self.logger.error(f"Error handling file modification: {e}")

class SimplifiedIngestionPipeline:
    """Main data ingestion pipeline orchestrator"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config = self._load_config(config_path)
        self.setup_logging()
        
        # Initialize components
        self.error_handler = DataFlowErrorHandler()
        self.validator = DataValidator()
        self.processor = JSONLStreamProcessor()
        self.stats = ProcessingStats()
        
        # Database connections
        self.supabase_conn = None
        self.sqlite_conn = None
        
        # Processing queue
        self.processing_queue = Queue()
        self.is_running = False
        self.workers = []
        
        # File watcher
        self.observer = None
        self.watcher = DataFlowWatcher(self)
        
    def _load_config(self, config_path: Optional[Path]) -> Dict:
        """Load configuration"""
        default_config = {
            "claude_data_dir": "~/.claude",
            "supabase_url": os.getenv("SUPABASE_URL"),
            "supabase_key": os.getenv("SUPABASE_ANON_KEY"),
            "sqlite_path": "claude_analytics.db",
            "batch_size": 100,
            "worker_count": 2,
            "processing_timeout": 30,
            "retry_attempts": 3,
            "health_check_interval": 60
        }
        
        if config_path and config_path.exists():
            with open(config_path) as f:
                user_config = json.load(f)
                default_config.update(user_config)
        
        return default_config
    
    def setup_logging(self):
        """Setup comprehensive logging"""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / 'data_ingestion.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('DataIngestion')
    
    async def start(self):
        """Start the ingestion pipeline"""
        self.logger.info("Starting simplified data ingestion pipeline")
        
        try:
            # Initialize connections
            await self._init_connections()
            
            # Start worker threads
            self.is_running = True
            for i in range(self.config["worker_count"]):
                worker = threading.Thread(target=self._worker_loop, args=(i,))
                worker.start()
                self.workers.append(worker)
            
            # Start file watcher
            self._start_file_watcher()
            
            # Initial scan of existing files
            await self._initial_scan()
            
            # Start health check loop
            asyncio.create_task(self._health_check_loop())
            
            self.logger.info("Pipeline started successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to start pipeline: {e}")
            await self.error_handler.handle_critical_error(e, "pipeline_startup")
            raise
    
    async def stop(self):
        """Stop the ingestion pipeline gracefully"""
        self.logger.info("Stopping data ingestion pipeline")
        
        self.is_running = False
        
        # Stop file watcher
        if self.observer:
            self.observer.stop()
            self.observer.join()
        
        # Wait for workers to finish
        for worker in self.workers:
            worker.join(timeout=10)
        
        # Close connections
        if self.supabase_conn:
            self.supabase_conn.close()
        if self.sqlite_conn:
            self.sqlite_conn.close()
        
        self.logger.info("Pipeline stopped")
    
    async def _init_connections(self):
        """Initialize database connections"""
        # Supabase connection
        try:
            self.supabase_conn = psycopg2.connect(
                host=self.config["supabase_url"].replace("https://", "").replace("http://", ""),
                database="postgres",
                user="postgres",
                password=self.config["supabase_key"]
            )
            self.supabase_conn.autocommit = True
            self.logger.info("Supabase connection established")
        except Exception as e:
            await self.error_handler.handle_connection_error(e, "supabase")
        
        # SQLite connection
        try:
            sqlite_path = Path(self.config["sqlite_path"])
            self.sqlite_conn = sqlite3.connect(sqlite_path, check_same_thread=False)
            self.sqlite_conn.row_factory = sqlite3.Row
            self.logger.info("SQLite connection established")
        except Exception as e:
            await self.error_handler.handle_connection_error(e, "sqlite")
    
    def _start_file_watcher(self):
        """Start file system watcher"""
        claude_dir = Path(self.config["claude_data_dir"]).expanduser()
        if not claude_dir.exists():
            self.logger.warning(f"Claude data directory not found: {claude_dir}")
            return
        
        self.observer = Observer()
        self.observer.schedule(self.watcher, str(claude_dir), recursive=True)
        self.observer.start()
        self.logger.info(f"Watching directory: {claude_dir}")
    
    async def _initial_scan(self):
        """Perform initial scan of existing files"""
        claude_dir = Path(self.config["claude_data_dir"]).expanduser()
        if not claude_dir.exists():
            return
        
        jsonl_files = list(claude_dir.rglob("*.jsonl"))
        self.logger.info(f"Found {len(jsonl_files)} JSONL files for initial processing")
        
        for file_path in jsonl_files:
            await self.process_file_update(file_path, 0)
    
    async def process_file_update(self, file_path: Path, start_line: int = 0):
        """Process file update (new data)"""
        try:
            async for event in self.processor.process_file(file_path, start_line):
                # Validate event
                if await self.validator.validate_session_event(event):
                    self.processing_queue.put(event)
                else:
                    self.stats.failed += 1
                    
        except Exception as e:
            await self.error_handler.handle_processing_error(e, str(file_path))
    
    def _worker_loop(self, worker_id: int):
        """Worker thread loop for processing events"""
        logger = logging.getLogger(f'Worker-{worker_id}')
        
        while self.is_running:
            try:
                # Get event from queue
                try:
                    event = self.processing_queue.get(timeout=1)
                except Empty:
                    continue
                
                # Process event
                success = self._process_event(event)
                if success:
                    self.stats.successful += 1
                else:
                    self.stats.failed += 1
                
                self.stats.total_processed += 1
                self.stats.last_processed = datetime.now()
                
                self.processing_queue.task_done()
                
            except Exception as e:
                logger.error(f"Worker error: {e}")
    
    def _process_event(self, event: SessionEvent) -> bool:
        """Process a single session event"""
        try:
            # Write to Supabase
            if self.supabase_conn:
                self._write_to_supabase(event)
            
            # Update local analytics cache
            if self.sqlite_conn:
                self._update_analytics_cache(event)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error processing event {event.session_id}: {e}")
            return False
    
    def _write_to_supabase(self, event: SessionEvent):
        """Write event to Supabase"""
        with self.supabase_conn.cursor(cursor_factory=RealDictCursor) as cursor:
            if event.event_type == 'start':
                self._insert_session_start(cursor, event)
            elif event.event_type == 'end':
                self._update_session_end(cursor, event)
            elif event.event_type == 'message':
                self._insert_message(cursor, event)
            elif event.event_type == 'tool':
                self._insert_tool_usage(cursor, event)
    
    def _insert_session_start(self, cursor, event: SessionEvent):
        """Insert session start into Supabase"""
        cursor.execute("""
            INSERT INTO sessions (id, session_type, start_time, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                start_time = EXCLUDED.start_time,
                is_active = EXCLUDED.is_active,
                updated_at = now()
        """, (
            event.session_id,
            event.data.get('session_type', 'claude-code'),
            event.timestamp,
            True,
            event.timestamp
        ))
    
    def _update_session_end(self, cursor, event: SessionEvent):
        """Update session end in Supabase"""
        cursor.execute("""
            UPDATE sessions 
            SET end_time = %s, is_active = false, updated_at = now()
            WHERE id = %s
        """, (event.timestamp, event.session_id))
    
    def _insert_message(self, cursor, event: SessionEvent):
        """Insert message breakdown"""
        cursor.execute("""
            INSERT INTO message_breakdown 
            (session_id, message_number, role, content_preview, tokens, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            event.session_id,
            event.data.get('message_number', 0),
            event.data.get('role', 'unknown'),
            event.data.get('content', '')[:200],
            event.data.get('tokens', 0),
            event.timestamp
        ))
    
    def _insert_tool_usage(self, cursor, event: SessionEvent):
        """Insert tool usage data"""
        tools = event.data.get('tool_calls', [])
        for tool in tools:
            cursor.execute("""
                INSERT INTO tool_usage (session_id, tool_name, usage_count, first_used, last_used)
                VALUES (%s, %s, 1, %s, %s)
                ON CONFLICT (session_id, tool_name) DO UPDATE SET
                    usage_count = tool_usage.usage_count + 1,
                    last_used = EXCLUDED.last_used
            """, (
                event.session_id,
                tool.get('function', {}).get('name', 'unknown'),
                event.timestamp,
                event.timestamp
            ))
    
    def _update_analytics_cache(self, event: SessionEvent):
        """Update local analytics cache"""
        with self.sqlite_conn:
            cursor = self.sqlite_conn.cursor()
            
            # Update recent sessions cache
            cursor.execute("""
                INSERT OR REPLACE INTO recent_sessions 
                (id, start_time, message_count, sync_status)
                VALUES (?, ?, 
                    COALESCE((SELECT message_count FROM recent_sessions WHERE id = ?), 0) + 1,
                    'synced')
            """, (event.session_id, event.timestamp, event.session_id))
    
    async def _health_check_loop(self):
        """Periodic health checks"""
        while self.is_running:
            try:
                await asyncio.sleep(self.config["health_check_interval"])
                await self._perform_health_check()
            except Exception as e:
                self.logger.error(f"Health check error: {e}")
    
    async def _perform_health_check(self):
        """Perform comprehensive health check"""
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "pipeline_status": "running" if self.is_running else "stopped",
            "queue_size": self.processing_queue.qsize(),
            "processing_stats": asdict(self.stats),
            "connections": {
                "supabase": self.supabase_conn is not None,
                "sqlite": self.sqlite_conn is not None
            }
        }
        
        # Calculate processing rate
        if self.stats.last_processed:
            time_diff = (datetime.now() - self.stats.last_processed).total_seconds()
            if time_diff > 0:
                self.stats.processing_rate = self.stats.total_processed / time_diff
        
        self.logger.info(f"Health check: {health_status}")
        
        # Write health status to file
        with open("logs/pipeline_health.json", "w") as f:
            json.dump(health_status, f, indent=2)

def signal_handler(signum, frame, pipeline):
    """Handle shutdown signals"""
    print(f"Received signal {signum}, shutting down...")
    asyncio.create_task(pipeline.stop())

async def main():
    """Main entry point"""
    # Initialize pipeline
    config_path = Path("config/data_flow_config.yaml")
    pipeline = SimplifiedIngestionPipeline(config_path)
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, lambda s, f: signal_handler(s, f, pipeline))
    signal.signal(signal.SIGTERM, lambda s, f: signal_handler(s, f, pipeline))
    
    try:
        await pipeline.start()
        
        # Keep running
        while pipeline.is_running:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        print("Keyboard interrupt received")
    finally:
        await pipeline.stop()

if __name__ == "__main__":
    asyncio.run(main())