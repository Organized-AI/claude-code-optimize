#!/usr/bin/env python3
"""
Claude Desktop Token Extractor

This module extracts real token usage data from Claude Desktop's browser storage
mechanisms including IndexedDB, Local Storage, and other Electron storage formats.

Features:
- Robust parsing of various storage formats
- Graceful handling of malformed data
- Caching for performance optimization
- Real-time token tracking capability
- Integration with existing session database
"""

import os
import json
import sqlite3
import logging
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import struct
import subprocess


@dataclass
class TokenData:
    """Data structure for token information extracted from Claude conversations."""
    conversation_id: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    model_used: str
    timestamp: datetime
    extraction_method: str


class ClaudeTokenExtractor:
    """
    Extracts real token usage data from Claude Desktop conversation storage.
    
    This class handles multiple storage formats used by Claude Desktop:
    - IndexedDB (LevelDB format)
    - Local Storage 
    - HTTP Storage SQLite databases
    - JSONL conversation files (if available)
    """
    
    def __init__(self, database_path: str, cache_dir: Optional[str] = None):
        """
        Initialize the token extractor.
        
        Args:
            database_path: Path to the SQLite database for storing session data
            cache_dir: Directory for caching extracted data (defaults to ~/.cache/claude_optimizer)
        """
        self.database_path = database_path
        self.cache_dir = Path(cache_dir) if cache_dir else Path.home() / ".cache" / "claude_optimizer"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Claude Desktop storage paths
        self.claude_app_support = Path.home() / "Library" / "Application Support" / "Claude"
        self.claude_http_storage = Path.home() / "Library" / "HTTPStorages" / "com.anthropic.claudefordesktop"
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
    def extract_all_tokens(self) -> List[TokenData]:
        """
        Extract token data from all available Claude Desktop storage sources.
        
        Returns:
            List of TokenData objects containing extracted token information
        """
        all_tokens = []
        
        # Try different storage sources
        extraction_methods = [
            ("indexeddb", self._extract_from_indexeddb),
            ("localstorage", self._extract_from_localstorage),
            ("httpstorage", self._extract_from_httpstorage),
            ("jsonl", self._extract_from_jsonl_files),
        ]
        
        for method_name, extraction_method in extraction_methods:
            try:
                self.logger.info(f"Attempting token extraction from {method_name}")
                tokens = extraction_method()
                if tokens:
                    all_tokens.extend(tokens)
                    self.logger.info(f"Extracted {len(tokens)} token records from {method_name}")
                else:
                    self.logger.info(f"No token data found in {method_name}")
            except Exception as e:
                self.logger.error(f"Failed to extract from {method_name}: {e}")
                continue
        
        return all_tokens
    
    def _extract_from_indexeddb(self) -> List[TokenData]:
        """Extract token data from Claude's IndexedDB storage using alternative methods."""
        indexeddb_path = self.claude_app_support / "IndexedDB" / "https_claude.ai_0.indexeddb.leveldb"
        
        if not indexeddb_path.exists():
            self.logger.warning(f"IndexedDB path not found: {indexeddb_path}")
            return []
        
        tokens = []
        try:
            # Try to extract using file system scanning
            for file_path in indexeddb_path.glob("*.ldb"):
                try:
                    # Read the LDB file as binary and search for patterns
                    with open(file_path, 'rb') as f:
                        content = f.read()
                        # Convert to string for pattern matching
                        text_content = content.decode('utf-8', errors='ignore')
                        
                        # Look for JSON-like structures containing token information
                        import re
                        json_patterns = re.finditer(r'\{[^}]*(?:token|usage|input|output)[^}]*\}', text_content, re.IGNORECASE)
                        
                        for match in json_patterns:
                            try:
                                json_str = match.group(0)
                                token_data = self._parse_conversation_data(json_str, 'indexeddb')
                                if token_data:
                                    tokens.extend(token_data)
                            except Exception as e:
                                self.logger.debug(f"Error parsing JSON pattern: {e}")
                                continue
                                
                except Exception as e:
                    self.logger.debug(f"Error reading LDB file {file_path}: {e}")
                    continue
                    
            # Also try manifest and log files
            for file_path in indexeddb_path.glob("*.log"):
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                        text_content = content.decode('utf-8', errors='ignore')
                        token_data = self._extract_tokens_from_text(text_content, 'indexeddb')
                        if token_data:
                            tokens.append(token_data)
                except Exception as e:
                    self.logger.debug(f"Error reading log file {file_path}: {e}")
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error accessing IndexedDB: {e}")
            
        return tokens
    
    def _extract_from_localstorage(self) -> List[TokenData]:
        """Extract token data from Claude's Local Storage using alternative methods."""
        localstorage_path = self.claude_app_support / "Local Storage" / "leveldb"
        
        if not localstorage_path.exists():
            self.logger.warning(f"Local Storage path not found: {localstorage_path}")
            return []
        
        tokens = []
        try:
            # Try to extract using file system scanning
            for file_path in localstorage_path.glob("*.ldb"):
                try:
                    # Read the LDB file as binary and search for patterns
                    with open(file_path, 'rb') as f:
                        content = f.read()
                        # Convert to string for pattern matching
                        text_content = content.decode('utf-8', errors='ignore')
                        
                        # Look for JSON-like structures containing token information
                        import re
                        json_patterns = re.finditer(r'\{[^}]*(?:token|usage|input|output|conversation)[^}]*\}', text_content, re.IGNORECASE)
                        
                        for match in json_patterns:
                            try:
                                json_str = match.group(0)
                                token_data = self._parse_conversation_data(json_str, 'localstorage')
                                if token_data:
                                    tokens.extend(token_data)
                            except Exception as e:
                                self.logger.debug(f"Error parsing JSON pattern: {e}")
                                continue
                                
                except Exception as e:
                    self.logger.debug(f"Error reading LDB file {file_path}: {e}")
                    continue
                    
            # Also try log files
            for file_path in localstorage_path.glob("*.log"):
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                        text_content = content.decode('utf-8', errors='ignore')
                        token_data = self._extract_tokens_from_text(text_content, 'localstorage')
                        if token_data:
                            tokens.append(token_data)
                except Exception as e:
                    self.logger.debug(f"Error reading log file {file_path}: {e}")
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error accessing Local Storage: {e}")
            
        return tokens
    
    def _extract_from_httpstorage(self) -> List[TokenData]:
        """Extract token data from Claude's HTTP Storage SQLite database."""
        httpstorage_db = self.claude_http_storage / "httpstorages.sqlite"
        
        if not httpstorage_db.exists():
            self.logger.warning(f"HTTP Storage database not found: {httpstorage_db}")
            return []
        
        tokens = []
        try:
            conn = sqlite3.connect(str(httpstorage_db))
            cursor = conn.cursor()
            
            # Get table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            for table in tables:
                table_name = table[0]
                try:
                    # Get table schema
                    cursor.execute(f"PRAGMA table_info({table_name});")
                    columns = cursor.fetchall()
                    column_names = [col[1] for col in columns]
                    
                    # Look for potential data columns
                    data_columns = [col for col in column_names if any(keyword in col.lower() 
                                   for keyword in ['data', 'value', 'content', 'json'])]
                    
                    if data_columns:
                        # Query the data
                        cursor.execute(f"SELECT * FROM {table_name};")
                        rows = cursor.fetchall()
                        
                        for row in rows:
                            for i, col_name in enumerate(column_names):
                                if col_name in data_columns and i < len(row):
                                    data = row[i]
                                    if data:
                                        token_data = self._parse_conversation_data(str(data), 'httpstorage')
                                        if token_data:
                                            tokens.extend(token_data)
                                            
                except Exception as e:
                    self.logger.debug(f"Error processing HTTP Storage table {table_name}: {e}")
                    continue
            
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error accessing HTTP Storage: {e}")
            
        return tokens
    
    def _extract_from_jsonl_files(self) -> List[TokenData]:
        """Extract token data from JSONL conversation files (if they exist)."""
        tokens = []
        
        # Search for JSONL files in various locations
        search_paths = [
            self.claude_app_support,
            self.claude_app_support / "conversations",
            Path.home() / "Library" / "Claude",
            Path.home() / "Documents" / "Claude",
        ]
        
        for search_path in search_paths:
            if search_path.exists():
                jsonl_files = list(search_path.glob("**/*.jsonl"))
                for jsonl_file in jsonl_files:
                    try:
                        tokens.extend(self._parse_jsonl_file(jsonl_file))
                    except Exception as e:
                        self.logger.error(f"Error parsing JSONL file {jsonl_file}: {e}")
                        continue
        
        return tokens
    
    def _parse_jsonl_file(self, file_path: Path) -> List[TokenData]:
        """Parse a JSONL conversation file to extract token data."""
        tokens = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    try:
                        if line.strip():
                            data = json.loads(line)
                            token_data = self._extract_tokens_from_json(data, 'jsonl')
                            if token_data:
                                tokens.append(token_data)
                    except json.JSONDecodeError as e:
                        self.logger.debug(f"JSON decode error in {file_path}:{line_num}: {e}")
                        continue
                    except Exception as e:
                        self.logger.debug(f"Error processing line {line_num} in {file_path}: {e}")
                        continue
        except Exception as e:
            self.logger.error(f"Error reading JSONL file {file_path}: {e}")
            
        return tokens
    
    def _parse_conversation_data(self, data_str: str, extraction_method: str) -> List[TokenData]:
        """Parse conversation data string and extract token information."""
        tokens = []
        
        try:
            # Try to parse as JSON
            if data_str.startswith('{') or data_str.startswith('['):
                data = json.loads(data_str)
                token_data = self._extract_tokens_from_json(data, extraction_method)
                if token_data:
                    tokens.append(token_data)
        except json.JSONDecodeError:
            # If not valid JSON, look for token patterns in the string
            token_data = self._extract_tokens_from_text(data_str, extraction_method)
            if token_data:
                tokens.append(token_data)
        except Exception as e:
            self.logger.debug(f"Error parsing conversation data: {e}")
            
        return tokens
    
    def _extract_tokens_from_json(self, data: Any, extraction_method: str) -> Optional[TokenData]:
        """Extract token information from JSON data structure."""
        try:
            # Handle different JSON structures
            if isinstance(data, dict):
                # Look for common token field patterns
                token_fields = {
                    'input_tokens': ['input_tokens', 'inputTokens', 'prompt_tokens', 'tokens_input'],
                    'output_tokens': ['output_tokens', 'outputTokens', 'completion_tokens', 'tokens_output'],
                    'total_tokens': ['total_tokens', 'totalTokens', 'tokens_total', 'tokens'],
                    'conversation_id': ['conversation_id', 'conversationId', 'id', 'uuid'],
                    'model': ['model', 'model_name', 'modelName', 'engine'],
                }
                
                extracted = {}
                
                # Recursively search for token data
                def find_tokens(obj, prefix=""):
                    if isinstance(obj, dict):
                        for key, value in obj.items():
                            current_key = f"{prefix}.{key}" if prefix else key
                            
                            # Check if this key matches any of our target fields
                            for field_name, possible_keys in token_fields.items():
                                if any(key.lower() == pk.lower() for pk in possible_keys):
                                    if isinstance(value, (int, float)):
                                        extracted[field_name] = int(value)
                                    elif isinstance(value, str) and value.isdigit():
                                        extracted[field_name] = int(value)
                            
                            # Recurse into nested objects
                            if isinstance(value, (dict, list)):
                                find_tokens(value, current_key)
                    
                    elif isinstance(obj, list):
                        for i, item in enumerate(obj):
                            find_tokens(item, f"{prefix}[{i}]")
                
                find_tokens(data)
                
                # Create TokenData if we have enough information
                if any(key in extracted for key in ['input_tokens', 'output_tokens', 'total_tokens']):
                    input_tokens = extracted.get('input_tokens', 0)
                    output_tokens = extracted.get('output_tokens', 0)
                    total_tokens = extracted.get('total_tokens', input_tokens + output_tokens)
                    
                    conversation_id = extracted.get('conversation_id', 
                                                 hashlib.md5(str(data).encode()).hexdigest()[:12])
                    model_used = extracted.get('model', 'unknown')
                    
                    return TokenData(
                        conversation_id=str(conversation_id),
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        total_tokens=total_tokens,
                        model_used=str(model_used),
                        timestamp=datetime.now(),
                        extraction_method=extraction_method
                    )
                    
        except Exception as e:
            self.logger.debug(f"Error extracting tokens from JSON: {e}")
            
        return None
    
    def _extract_tokens_from_text(self, text: str, extraction_method: str) -> Optional[TokenData]:
        """Extract token information from text using pattern matching."""
        import re
        
        try:
            # Common patterns for token information
            patterns = {
                'input_tokens': r'(?:input_?tokens?|prompt_?tokens?)["\s]*:?\s*(\d+)',
                'output_tokens': r'(?:output_?tokens?|completion_?tokens?)["\s]*:?\s*(\d+)',
                'total_tokens': r'(?:total_?tokens?)["\s]*:?\s*(\d+)',
            }
            
            extracted = {}
            for field, pattern in patterns.items():
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    extracted[field] = int(match.group(1))
            
            if extracted:
                input_tokens = extracted.get('input_tokens', 0)
                output_tokens = extracted.get('output_tokens', 0)
                total_tokens = extracted.get('total_tokens', input_tokens + output_tokens)
                
                conversation_id = hashlib.md5(text.encode()).hexdigest()[:12]
                
                return TokenData(
                    conversation_id=conversation_id,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                    model_used='unknown',
                    timestamp=datetime.now(),
                    extraction_method=extraction_method
                )
                
        except Exception as e:
            self.logger.debug(f"Error extracting tokens from text: {e}")
            
        return None
    
    def update_database_with_real_tokens(self, token_data_list: List[TokenData]) -> int:
        """
        Update the database with real token data.
        
        Args:
            token_data_list: List of TokenData objects to insert/update
            
        Returns:
            Number of records updated
        """
        if not token_data_list:
            return 0
            
        updated_count = 0
        
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            for token_data in token_data_list:
                # Try to find existing session by conversation_id
                cursor.execute("""
                    SELECT id FROM real_sessions 
                    WHERE conversation_id = ? OR id = ?
                """, (token_data.conversation_id, token_data.conversation_id))
                
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing session
                    cursor.execute("""
                        UPDATE real_sessions 
                        SET real_input_tokens = ?,
                            real_output_tokens = ?,
                            real_total_tokens = ?,
                            token_extraction_method = ?,
                            last_token_update = ?,
                            models_used = ?
                        WHERE id = ?
                    """, (
                        token_data.input_tokens,
                        token_data.output_tokens,
                        token_data.total_tokens,
                        token_data.extraction_method,
                        token_data.timestamp,
                        token_data.model_used,
                        existing[0]
                    ))
                    updated_count += 1
                else:
                    # Create new session record
                    cursor.execute("""
                        INSERT INTO real_sessions (
                            id, conversation_id, real_input_tokens, real_output_tokens,
                            real_total_tokens, token_extraction_method, last_token_update,
                            models_used, session_type, start_time, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'claude_desktop', ?, 0)
                    """, (
                        token_data.conversation_id,
                        token_data.conversation_id,
                        token_data.input_tokens,
                        token_data.output_tokens,
                        token_data.total_tokens,
                        token_data.extraction_method,
                        token_data.timestamp,
                        token_data.model_used,
                        token_data.timestamp
                    ))
                    updated_count += 1
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Successfully updated {updated_count} records with real token data")
            
        except Exception as e:
            self.logger.error(f"Error updating database with token data: {e}")
            
        return updated_count
    
    def get_cache_key(self, data: str) -> str:
        """Generate a cache key for the given data."""
        return hashlib.md5(data.encode()).hexdigest()
    
    def is_cache_valid(self, cache_file: Path, max_age_hours: int = 1) -> bool:
        """Check if cache file is valid and not too old."""
        if not cache_file.exists():
            return False
        
        file_age = datetime.now() - datetime.fromtimestamp(cache_file.stat().st_mtime)
        return file_age < timedelta(hours=max_age_hours)
    
    def validate_token_data(self, token_data: TokenData) -> bool:
        """Validate that token data makes sense."""
        # Basic validation rules
        if token_data.total_tokens < 0:
            return False
        
        if token_data.input_tokens < 0 or token_data.output_tokens < 0:
            return False
        
        # Total should roughly equal input + output (allow some variance for different counting methods)
        if token_data.total_tokens > 0:
            calculated_total = token_data.input_tokens + token_data.output_tokens
            if calculated_total > 0 and abs(token_data.total_tokens - calculated_total) > max(100, calculated_total * 0.1):
                self.logger.warning(f"Token count mismatch: total={token_data.total_tokens}, "
                                  f"calculated={calculated_total} for conversation {token_data.conversation_id}")
        
        return True


def main():
    """Main function for testing the token extractor."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python claude_token_extractor.py <database_path>")
        sys.exit(1)
    
    database_path = sys.argv[1]
    extractor = ClaudeTokenExtractor(database_path)
    
    print("Extracting token data from Claude Desktop...")
    token_data_list = extractor.extract_all_tokens()
    
    if token_data_list:
        print(f"Found {len(token_data_list)} token records")
        
        # Validate the data
        valid_tokens = [token for token in token_data_list if extractor.validate_token_data(token)]
        print(f"Validated {len(valid_tokens)} token records")
        
        # Update database
        updated = extractor.update_database_with_real_tokens(valid_tokens)
        print(f"Updated {updated} database records with real token data")
        
        # Print summary
        total_tokens = sum(token.total_tokens for token in valid_tokens)
        print(f"Total tokens extracted: {total_tokens:,}")
        
        # Show breakdown by extraction method
        method_breakdown = {}
        for token in valid_tokens:
            method = token.extraction_method
            if method not in method_breakdown:
                method_breakdown[method] = {'count': 0, 'tokens': 0}
            method_breakdown[method]['count'] += 1
            method_breakdown[method]['tokens'] += token.total_tokens
        
        print("\nBreakdown by extraction method:")
        for method, data in method_breakdown.items():
            print(f"  {method}: {data['count']} records, {data['tokens']:,} tokens")
    else:
        print("No token data found in Claude Desktop storage.")


if __name__ == "__main__":
    main()