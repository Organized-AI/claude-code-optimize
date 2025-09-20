#!/usr/bin/env python3
"""
Smart JSONL Stream Parser with Error Recovery
Intelligent parsing of Claude Code JSONL files with stream processing
"""

import json
import asyncio
import logging
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, AsyncGenerator, Any, Tuple
from dataclasses import dataclass
import aiofiles
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

@dataclass
class ParsedEvent:
    """Parsed JSONL event"""
    event_type: str
    session_id: str
    timestamp: datetime
    data: Dict[str, Any]
    source_file: str
    line_number: int
    raw_line: str
    content_hash: str

class JSONLStreamParser:
    """High-performance JSONL stream parser with intelligent error recovery"""
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = self._load_config(config)
        self.setup_logging()
        
        # Parsing state
        self.file_positions = {}  # file -> last_position
        self.processed_hashes = set()  # Deduplication
        self.parse_errors = []
        
        # Statistics
        self.stats = {
            "total_lines_processed": 0,
            "successful_parses": 0,
            "parse_errors": 0,
            "duplicate_lines": 0,
            "files_monitored": 0
        }
    
    def _load_config(self, config: Optional[Dict]) -> Dict:
        """Load parser configuration"""
        default_config = {
            "buffer_size": 8192,
            "max_line_length": 1024 * 1024,  # 1MB
            "error_recovery_mode": "skip",  # "skip", "attempt_fix", "strict"
            "deduplication": True,
            "timestamp_formats": [
                "%Y-%m-%dT%H:%M:%S.%fZ",
                "%Y-%m-%dT%H:%M:%SZ", 
                "%Y-%m-%d %H:%M:%S",
                "iso"
            ]
        }
        
        if config:
            default_config.update(config)
        
        return default_config
    
    def setup_logging(self):
        """Setup parser logging"""
        self.logger = logging.getLogger('JSONLStreamParser')
    
    async def parse_file_stream(self, file_path: Path, start_position: int = 0) -> AsyncGenerator[ParsedEvent, None]:
        """Parse JSONL file as stream from given position"""
        if not file_path.exists():
            self.logger.warning(f"File not found: {file_path}")
            return
        
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                # Seek to start position
                await f.seek(start_position)
                
                line_number = 0
                if start_position > 0:
                    # Estimate line number based on position
                    line_number = await self._estimate_line_number(file_path, start_position)
                
                buffer = ""
                while True:
                    chunk = await f.read(self.config["buffer_size"])
                    if not chunk:
                        break
                    
                    buffer += chunk
                    
                    # Process complete lines
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line_number += 1
                        
                        if line.strip():
                            event = await self._parse_line(line, file_path, line_number)
                            if event:
                                yield event
                
                # Process remaining buffer
                if buffer.strip():
                    line_number += 1
                    event = await self._parse_line(buffer, file_path, line_number)
                    if event:
                        yield event
                        
        except Exception as e:
            self.logger.error(f"Error parsing file {file_path}: {e}")
    
    async def parse_new_content(self, file_path: Path) -> AsyncGenerator[ParsedEvent, None]:
        """Parse only new content since last parse"""
        last_position = self.file_positions.get(str(file_path), 0)
        
        async for event in self.parse_file_stream(file_path, last_position):
            yield event
        
        # Update position
        try:
            self.file_positions[str(file_path)] = file_path.stat().st_size
        except:
            pass
    
    async def _parse_line(self, line: str, file_path: Path, line_number: int) -> Optional[ParsedEvent]:
        """Parse a single JSONL line"""
        self.stats["total_lines_processed"] += 1
        
        # Skip empty lines
        line = line.strip()
        if not line:
            return None
        
        # Check line length
        if len(line) > self.config["max_line_length"]:
            self.logger.warning(f"Line too long at {file_path}:{line_number}")
            self.stats["parse_errors"] += 1
            return None
        
        # Deduplication check
        if self.config["deduplication"]:
            content_hash = hashlib.sha256(line.encode()).hexdigest()
            if content_hash in self.processed_hashes:
                self.stats["duplicate_lines"] += 1
                return None
            self.processed_hashes.add(content_hash)
        else:
            content_hash = ""
        
        # Parse JSON
        try:
            data = json.loads(line)
            
            # Extract event information
            event_type = self._determine_event_type(data)
            session_id = self._extract_session_id(data)
            timestamp = self._extract_timestamp(data)
            
            event = ParsedEvent(
                event_type=event_type,
                session_id=session_id,
                timestamp=timestamp,
                data=data,
                source_file=str(file_path),
                line_number=line_number,
                raw_line=line,
                content_hash=content_hash
            )
            
            self.stats["successful_parses"] += 1
            return event
            
        except json.JSONDecodeError as e:
            self.stats["parse_errors"] += 1
            
            if self.config["error_recovery_mode"] == "attempt_fix":
                # Try to fix common JSON issues
                fixed_event = await self._attempt_json_fix(line, file_path, line_number, e)
                if fixed_event:
                    return fixed_event
            
            if self.config["error_recovery_mode"] != "skip":
                self.logger.error(f"JSON parse error at {file_path}:{line_number}: {e}")
            
            # Log parse error for analysis
            self.parse_errors.append({
                "file": str(file_path),
                "line_number": line_number,
                "error": str(e),
                "raw_line": line[:200],  # First 200 chars
                "timestamp": datetime.now()
            })
            
            return None
        
        except Exception as e:
            self.logger.error(f"Unexpected error parsing line {line_number}: {e}")
            self.stats["parse_errors"] += 1
            return None
    
    def _determine_event_type(self, data: Dict) -> str:
        """Determine event type from JSON data"""
        # Check explicit type field
        if 'type' in data:
            return data['type']
        
        # Infer from structure
        if 'conversation_id' in data and 'content' in data:
            return 'message'
        elif 'session_id' in data and 'start_time' in data:
            return 'session_start'
        elif 'session_id' in data and 'end_time' in data:
            return 'session_end'
        elif 'function_calls' in data or 'tool_calls' in data:
            return 'tool_usage'
        elif 'tokens' in data or 'cost' in data:
            return 'usage_update'
        elif 'error' in data:
            return 'error'
        else:
            return 'unknown'
    
    def _extract_session_id(self, data: Dict) -> str:
        """Extract session ID from various possible fields"""
        # Try common session ID fields
        for field in ['session_id', 'conversation_id', 'chat_id', 'id']:
            if field in data and data[field]:
                return str(data[field])
        
        # Generate from timestamp if no ID found
        timestamp = self._extract_timestamp(data)
        return f"session_{int(timestamp.timestamp())}"
    
    def _extract_timestamp(self, data: Dict) -> datetime:
        """Extract timestamp from JSON data"""
        # Try common timestamp fields
        timestamp_fields = ['timestamp', 'created_at', 'time', 'date', 'created']
        
        for field in timestamp_fields:
            if field in data and data[field]:
                timestamp = self._parse_timestamp(data[field])
                if timestamp:
                    return timestamp
        
        # Fallback to current time
        return datetime.now(timezone.utc)
    
    def _parse_timestamp(self, timestamp_value: Any) -> Optional[datetime]:
        """Parse timestamp from various formats"""
        if isinstance(timestamp_value, (int, float)):
            # Unix timestamp
            try:
                return datetime.fromtimestamp(timestamp_value, tz=timezone.utc)
            except (ValueError, OSError):
                return None
        
        if isinstance(timestamp_value, str):
            # Try different string formats
            for fmt in self.config["timestamp_formats"]:
                try:
                    if fmt == "iso":
                        # Handle ISO format with timezone
                        return datetime.fromisoformat(timestamp_value.replace('Z', '+00:00'))
                    else:
                        dt = datetime.strptime(timestamp_value, fmt)
                        return dt.replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
        
        return None
    
    async def _attempt_json_fix(self, line: str, file_path: Path, line_number: int, error: json.JSONDecodeError) -> Optional[ParsedEvent]:
        """Attempt to fix common JSON parsing issues"""
        try:
            # Common fixes
            fixed_line = line
            
            # Fix unescaped quotes in strings
            if 'Unterminated string' in str(error):
                # Simple fix: escape unescaped quotes
                fixed_line = self._fix_unescaped_quotes(line)
            
            # Fix trailing commas
            elif 'Expecting property name' in str(error):
                fixed_line = self._fix_trailing_commas(line)
            
            # Fix missing quotes around keys
            elif 'Expecting' in str(error) and 'delimiter' in str(error):
                fixed_line = self._fix_unquoted_keys(line)
            
            # Try parsing fixed line
            if fixed_line != line:
                data = json.loads(fixed_line)
                
                event_type = self._determine_event_type(data)
                session_id = self._extract_session_id(data)
                timestamp = self._extract_timestamp(data)
                
                self.logger.info(f"Successfully fixed JSON at {file_path}:{line_number}")
                
                return ParsedEvent(
                    event_type=event_type,
                    session_id=session_id,
                    timestamp=timestamp,
                    data=data,
                    source_file=str(file_path),
                    line_number=line_number,
                    raw_line=fixed_line,
                    content_hash=hashlib.sha256(fixed_line.encode()).hexdigest()
                )
            
        except Exception:
            # Fix attempt failed
            pass
        
        return None
    
    def _fix_unescaped_quotes(self, line: str) -> str:
        """Fix unescaped quotes in JSON strings"""
        # Simple approach: escape quotes that aren't already escaped
        result = ""
        in_string = False
        escaped = False
        
        for i, char in enumerate(line):
            if char == '\\' and not escaped:
                escaped = True
                result += char
            elif char == '"' and not escaped:
                if in_string:
                    in_string = False
                else:
                    in_string = True
                result += char
            elif char == '"' and escaped:
                result += char
                escaped = False
            else:
                result += char
                escaped = False
        
        return result
    
    def _fix_trailing_commas(self, line: str) -> str:
        """Remove trailing commas from JSON"""
        import re
        # Remove commas before closing brackets/braces
        line = re.sub(r',(\s*[}\]])', r'\1', line)
        return line
    
    def _fix_unquoted_keys(self, line: str) -> str:
        """Add quotes around unquoted object keys"""
        import re
        # Simple regex to quote unquoted keys
        line = re.sub(r'(\w+):', r'"\1":', line)
        return line
    
    async def _estimate_line_number(self, file_path: Path, position: int) -> int:
        """Estimate line number for given file position"""
        try:
            async with aiofiles.open(file_path, 'r') as f:
                chunk = await f.read(position)
                return chunk.count('\n')
        except:
            return 0
    
    def get_statistics(self) -> Dict:
        """Get parsing statistics"""
        return self.stats.copy()
    
    def get_parse_errors(self) -> List[Dict]:
        """Get recent parse errors"""
        return self.parse_errors[-100:]  # Last 100 errors
    
    def reset_statistics(self):
        """Reset parsing statistics"""
        self.stats = {
            "total_lines_processed": 0,
            "successful_parses": 0,
            "parse_errors": 0,
            "duplicate_lines": 0,
            "files_monitored": 0
        }
        self.parse_errors.clear()
    
    def set_file_position(self, file_path: Path, position: int):
        """Manually set file position for parsing"""
        self.file_positions[str(file_path)] = position

async def main():
    """Test the JSONL parser"""
    parser = JSONLStreamParser()
    
    # Test with a sample file
    test_data = [
        {'type': 'session_start', 'session_id': 'test_123', 'timestamp': '2024-01-01T10:00:00Z'},
        {'type': 'message', 'conversation_id': 'test_123', 'content': 'Hello', 'role': 'user'},
        {'type': 'message', 'conversation_id': 'test_123', 'content': 'Hi there!', 'role': 'assistant'},
        {'type': 'session_end', 'session_id': 'test_123', 'timestamp': '2024-01-01T10:05:00Z'}
    ]
    
    # Create test file
    test_file = Path("test_session.jsonl")
    with open(test_file, 'w') as f:
        for item in test_data:
            f.write(json.dumps(item) + '\n')
    
    try:
        # Parse the file
        events = []
        async for event in parser.parse_file_stream(test_file):
            events.append(event)
            print(f"Parsed: {event.event_type} - {event.session_id} - {event.timestamp}")
        
        print(f"\nStatistics: {parser.get_statistics()}")
        
    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()

if __name__ == "__main__":
    asyncio.run(main())