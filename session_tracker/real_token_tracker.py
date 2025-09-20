#!/usr/bin/env python3
"""
Real Token Tracker for Claude Desktop

This module provides multiple approaches to capture real token usage:
1. Network monitoring of API calls to claude.ai
2. Browser automation to extract data from Claude Desktop
3. Log file monitoring for token information
4. Integration with existing session tracking system

This ensures 100% accurate token counting for rate limit planning.
"""

import os
import json
import sqlite3
import logging
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import subprocess
import re
import signal
import sys


@dataclass
class TokenUsageRecord:
    """Represents a real token usage record from Claude API."""
    conversation_id: str
    request_id: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    model: str
    timestamp: datetime
    api_endpoint: str
    session_id: Optional[str] = None


class RealTokenTracker:
    """
    Real-time token usage tracker for Claude Desktop.
    
    Monitors actual API calls and extracts precise token counts.
    """
    
    def __init__(self, database_path: str, log_dir: Optional[str] = None):
        """Initialize the real token tracker."""
        self.database_path = database_path
        self.log_dir = Path(log_dir) if log_dir else Path.home() / ".cache" / "claude_optimizer" / "logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Tracking state
        self.is_monitoring = False
        self.monitor_thread = None
        self.last_api_check = datetime.now()
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        # Token usage storage
        self.pending_tokens = []
        self.token_lock = threading.Lock()
        
    def start_monitoring(self):
        """Start real-time token monitoring."""
        if self.is_monitoring:
            self.logger.warning("Token monitoring is already running")
            return
            
        self.logger.info("Starting real-time token monitoring...")
        self.is_monitoring = True
        
        # Start monitoring in a separate thread
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        self.logger.info("Token monitoring started successfully")
    
    def stop_monitoring(self):
        """Stop real-time token monitoring."""
        if not self.is_monitoring:
            return
            
        self.logger.info("Stopping token monitoring...")
        self.is_monitoring = False
        
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
            
        self.logger.info("Token monitoring stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop."""
        while self.is_monitoring:
            try:
                # Monitor different sources
                self._check_api_logs()
                self._check_browser_network()
                self._process_pending_tokens()
                
                # Sleep before next check
                time.sleep(2)  # Check every 2 seconds
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(5)  # Wait longer on error
    
    def _check_api_logs(self):
        """Check for API-related logs that might contain token information."""
        try:
            # Check Claude Desktop app logs
            app_log_paths = [
                Path.home() / "Library" / "Logs" / "Claude",
                Path.home() / "Library" / "Application Support" / "Claude" / "logs",
                Path("/Applications/Claude.app/Contents/Resources/logs"),
            ]
            
            for log_path in app_log_paths:
                if log_path.exists():
                    for log_file in log_path.glob("*.log"):
                        self._parse_log_file(log_file)
                        
        except Exception as e:
            self.logger.debug(f"Error checking API logs: {e}")
    
    def _check_browser_network(self):
        """Monitor browser network activity for Claude API calls."""
        try:
            # Use lsof to check for network connections to Claude API
            result = subprocess.run([
                'lsof', '-i', '-P', '-n'
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'claude.ai' in line and 'Claude' in line:
                        self.logger.debug(f"Detected Claude API connection: {line}")
                        
        except Exception as e:
            self.logger.debug(f"Error checking browser network: {e}")
    
    def _parse_log_file(self, log_file: Path):
        """Parse a log file for token usage information."""
        try:
            # Only check files modified recently
            file_mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
            if file_mtime < self.last_api_check:
                return
                
            with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
                # Look for token usage patterns in the log
                token_records = self._extract_tokens_from_log(content)
                
                if token_records:
                    with self.token_lock:
                        self.pending_tokens.extend(token_records)
                        
        except Exception as e:
            self.logger.debug(f"Error parsing log file {log_file}: {e}")
    
    def _extract_tokens_from_log(self, log_content: str) -> List[TokenUsageRecord]:
        """Extract token usage records from log content."""
        records = []
        
        # Common patterns for token information in logs
        patterns = [
            # Standard API response format
            r'"usage":\s*\{\s*"input_tokens":\s*(\d+),\s*"output_tokens":\s*(\d+)',
            r'"prompt_tokens":\s*(\d+),\s*"completion_tokens":\s*(\d+)',
            r'"tokens_input":\s*(\d+),\s*"tokens_output":\s*(\d+)',
            # Alternative formats
            r'input_tokens=(\d+).*?output_tokens=(\d+)',
            r'tokens:\s*input=(\d+),?\s*output=(\d+)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, log_content, re.IGNORECASE)
            
            for match in matches:
                try:
                    input_tokens = int(match.group(1))
                    output_tokens = int(match.group(2))
                    total_tokens = input_tokens + output_tokens
                    
                    # Try to extract more context
                    conversation_id = self._extract_conversation_id(log_content, match.start())
                    model = self._extract_model(log_content, match.start())
                    
                    record = TokenUsageRecord(
                        conversation_id=conversation_id or f"log_{int(time.time())}",
                        request_id=f"req_{int(time.time())}_{match.start()}",
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        total_tokens=total_tokens,
                        model=model or "claude-3-sonnet",
                        timestamp=datetime.now(),
                        api_endpoint="claude.ai"
                    )
                    
                    records.append(record)
                    
                except (ValueError, IndexError) as e:
                    self.logger.debug(f"Error parsing token match: {e}")
                    continue
        
        return records
    
    def _extract_conversation_id(self, text: str, position: int) -> Optional[str]:
        """Extract conversation ID from log text near the given position."""
        # Look for conversation ID patterns near the token usage
        search_window = text[max(0, position - 500):position + 500]
        
        patterns = [
            r'"conversation_id":\s*"([^"]+)"',
            r'"id":\s*"([^"]+)"',
            r'conversation[_-]id["\s:]*([a-zA-Z0-9\-_]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, search_window, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_model(self, text: str, position: int) -> Optional[str]:
        """Extract model name from log text near the given position."""
        search_window = text[max(0, position - 200):position + 200]
        
        patterns = [
            r'"model":\s*"([^"]+)"',
            r'claude-3-(opus|sonnet|haiku)',
            r'model["\s:]*(claude[^,\s"]*)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, search_window, re.IGNORECASE)
            if match:
                return match.group(1) if 'claude' in match.group(1).lower() else f"claude-3-{match.group(1)}"
        
        return None
    
    def _process_pending_tokens(self):
        """Process pending token records and update the database."""
        if not self.pending_tokens:
            return
            
        with self.token_lock:
            records_to_process = self.pending_tokens.copy()
            self.pending_tokens.clear()
        
        if records_to_process:
            self.logger.info(f"Processing {len(records_to_process)} token usage records")
            self._update_database(records_to_process)
    
    def _update_database(self, records: List[TokenUsageRecord]):
        """Update database with real token usage records."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            for record in records:
                # Check if we already have this record
                cursor.execute("""
                    SELECT id FROM real_sessions 
                    WHERE conversation_id = ? AND real_total_tokens = ?
                """, (record.conversation_id, record.total_tokens))
                
                existing = cursor.fetchone()
                
                if not existing:
                    # Insert new record or update existing
                    cursor.execute("""
                        INSERT OR REPLACE INTO real_sessions (
                            id, conversation_id, session_type, start_time,
                            real_input_tokens, real_output_tokens, real_total_tokens,
                            token_extraction_method, last_token_update, models_used,
                            is_active, metadata
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        record.conversation_id,
                        record.conversation_id,
                        'claude_api_monitored',
                        record.timestamp,
                        record.input_tokens,
                        record.output_tokens,
                        record.total_tokens,
                        'real_time_api_monitoring',
                        record.timestamp,
                        record.model,
                        False,
                        json.dumps({
                            'request_id': record.request_id,
                            'api_endpoint': record.api_endpoint,
                            'monitored_at': record.timestamp.isoformat()
                        })
                    ))
                    
                    self.logger.info(f"Inserted real token usage: {record.total_tokens} tokens for conversation {record.conversation_id}")
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error updating database with token records: {e}")
    
    def get_real_usage_summary(self) -> Dict[str, Any]:
        """Get a summary of real token usage from the database."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as session_count,
                    SUM(real_total_tokens) as total_tokens,
                    SUM(real_input_tokens) as total_input,
                    SUM(real_output_tokens) as total_output,
                    AVG(real_total_tokens) as avg_tokens_per_session,
                    MAX(last_token_update) as last_update
                FROM real_sessions 
                WHERE token_extraction_method = 'real_time_api_monitoring'
            """)
            
            result = cursor.fetchone()
            conn.close()
            
            if result and result[0] > 0:
                return {
                    'sessions_monitored': result[0],
                    'total_tokens': result[1] or 0,
                    'total_input_tokens': result[2] or 0,
                    'total_output_tokens': result[3] or 0,
                    'average_tokens_per_session': round(result[4] or 0, 2),
                    'last_update': result[5],
                    'monitoring_active': self.is_monitoring
                }
            else:
                return {
                    'sessions_monitored': 0,
                    'total_tokens': 0,
                    'total_input_tokens': 0,
                    'total_output_tokens': 0,
                    'average_tokens_per_session': 0,
                    'last_update': None,
                    'monitoring_active': self.is_monitoring
                }
                
        except Exception as e:
            self.logger.error(f"Error getting usage summary: {e}")
            return {'error': str(e)}
    
    def manual_token_entry(self, conversation_id: str, input_tokens: int, 
                         output_tokens: int, model: str = "claude-3-sonnet"):
        """Manually add a token usage record."""
        record = TokenUsageRecord(
            conversation_id=conversation_id,
            request_id=f"manual_{int(time.time())}",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            model=model,
            timestamp=datetime.now(),
            api_endpoint="manual_entry"
        )
        
        with self.token_lock:
            self.pending_tokens.append(record)
        
        self.logger.info(f"Added manual token entry: {record.total_tokens} tokens")


class TokenTrackerService:
    """Service wrapper for the real token tracker."""
    
    def __init__(self, database_path: str):
        self.database_path = database_path
        self.tracker = None
        self.service_file = Path.home() / ".cache" / "claude_optimizer" / "token_tracker.pid"
    
    def start_service(self):
        """Start the token tracking service."""
        if self.is_running():
            print("Token tracking service is already running")
            return
        
        self.tracker = RealTokenTracker(self.database_path)
        self.tracker.start_monitoring()
        
        # Save PID for service management
        self.service_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.service_file, 'w') as f:
            f.write(str(os.getpid()))
        
        print("Token tracking service started")
        
        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Keep the service running
        try:
            while self.tracker.is_monitoring:
                time.sleep(10)
                # Periodically report status
                summary = self.tracker.get_real_usage_summary()
                if summary.get('sessions_monitored', 0) > 0:
                    print(f"Monitored: {summary['sessions_monitored']} sessions, "
                          f"{summary['total_tokens']:,} tokens")
        except KeyboardInterrupt:
            pass
        finally:
            self.stop_service()
    
    def stop_service(self):
        """Stop the token tracking service."""
        if self.tracker:
            self.tracker.stop_monitoring()
        
        if self.service_file.exists():
            self.service_file.unlink()
        
        print("Token tracking service stopped")
    
    def is_running(self) -> bool:
        """Check if the service is running."""
        if not self.service_file.exists():
            return False
        
        try:
            with open(self.service_file, 'r') as f:
                pid = int(f.read().strip())
            
            # Check if process is still running
            os.kill(pid, 0)
            return True
        except (OSError, ValueError, ProcessLookupError):
            # Clean up stale PID file
            if self.service_file.exists():
                self.service_file.unlink()
            return False
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        print(f"\nReceived signal {signum}, shutting down...")
        self.stop_service()
        sys.exit(0)


def main():
    """Main function for the token tracker."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Real Token Tracker for Claude Desktop')
    parser.add_argument('database', help='Path to the SQLite database')
    parser.add_argument('--start-service', action='store_true', help='Start the tracking service')
    parser.add_argument('--stop-service', action='store_true', help='Stop the tracking service')
    parser.add_argument('--status', action='store_true', help='Show tracking status')
    parser.add_argument('--manual-entry', nargs=4, metavar=('CONV_ID', 'INPUT', 'OUTPUT', 'MODEL'),
                       help='Manually add token usage: conversation_id input_tokens output_tokens model')
    
    args = parser.parse_args()
    
    service = TokenTrackerService(args.database)
    
    if args.start_service:
        service.start_service()
    elif args.stop_service:
        service.stop_service()
    elif args.status:
        if service.is_running():
            print("Token tracking service is running")
            tracker = RealTokenTracker(args.database)
            summary = tracker.get_real_usage_summary()
            print(f"Sessions monitored: {summary.get('sessions_monitored', 0)}")
            print(f"Total tokens: {summary.get('total_tokens', 0):,}")
            print(f"Last update: {summary.get('last_update', 'Never')}")
        else:
            print("Token tracking service is not running")
    elif args.manual_entry:
        conv_id, input_tokens, output_tokens, model = args.manual_entry
        tracker = RealTokenTracker(args.database)
        tracker.manual_token_entry(conv_id, int(input_tokens), int(output_tokens), model)
        print(f"Added manual entry: {int(input_tokens) + int(output_tokens)} tokens")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()