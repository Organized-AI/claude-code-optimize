#!/usr/bin/env python3
"""
Data Consistency Validation and Integrity Checks
Ensures data quality and prevents corruption in the pipeline
"""

import json
import logging
import hashlib
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass
from pathlib import Path
import uuid
from enum import Enum

class ValidationSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class ValidationResult:
    """Result of a validation check"""
    is_valid: bool
    severity: ValidationSeverity
    field: str
    message: str
    suggested_fix: Optional[str] = None
    corrected_value: Optional[Any] = None

@dataclass
class ValidationReport:
    """Complete validation report"""
    overall_valid: bool
    item_id: str
    timestamp: datetime
    results: List[ValidationResult]
    warnings_count: int = 0
    errors_count: int = 0
    critical_count: int = 0

class DataValidator:
    """Comprehensive data validation system"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.config = self._load_validation_config(config_path)
        self.setup_logging()
        
        # Validation caches
        self.session_cache = {}
        self.known_models = set()
        self.known_tools = set()
        
        # Validation statistics
        self.validation_stats = {
            "total_validated": 0,
            "total_passed": 0,
            "total_failed": 0,
            "auto_corrected": 0
        }
        
        # Load known values from config
        self._load_known_values()
    
    def _load_validation_config(self, config_path: Optional[Path]) -> Dict:
        """Load validation configuration"""
        default_config = {
            "auto_correct": True,
            "strict_mode": False,
            "max_content_length": 10000,
            "required_fields": {
                "session": ["session_id", "timestamp"],
                "message": ["role", "content"],
                "tool": ["tool_name"]
            },
            "field_patterns": {
                "session_id": r"^[a-zA-Z0-9_-]+$",
                "email": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
                "uuid": r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
            },
            "value_ranges": {
                "tokens": {"min": 0, "max": 1000000},
                "cost": {"min": 0.0, "max": 1000.0},
                "duration_minutes": {"min": 0.0, "max": 1440.0}
            },
            "known_models": [
                "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022",
                "claude-3-opus-20240229", "gpt-4", "gpt-3.5-turbo"
            ],
            "known_tools": [
                "str_replace_editor", "bash", "computer", "read_file",
                "write_file", "list_files", "search"
            ]
        }
        
        if config_path and config_path.exists():
            with open(config_path) as f:
                user_config = json.load(f)
                default_config.update(user_config)
        
        return default_config
    
    def setup_logging(self):
        """Setup validation logging"""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        self.logger = logging.getLogger('DataValidator')
        if not self.logger.handlers:
            handler = logging.FileHandler(log_dir / 'validation.log')
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def _load_known_values(self):
        """Load known values for validation"""
        self.known_models.update(self.config["known_models"])
        self.known_tools.update(self.config["known_tools"])
    
    async def validate_session_event(self, event) -> bool:
        """Validate a session event (from simplified_ingestion.py)"""
        validation_report = ValidationReport(
            overall_valid=True,
            item_id=event.session_id,
            timestamp=datetime.now(),
            results=[]
        )
        
        # Basic structure validation
        await self._validate_basic_structure(event, validation_report)
        
        # Event-specific validation
        if event.event_type == 'start':
            await self._validate_session_start(event, validation_report)
        elif event.event_type == 'end':
            await self._validate_session_end(event, validation_report)
        elif event.event_type == 'message':
            await self._validate_message_event(event, validation_report)
        elif event.event_type == 'tool':
            await self._validate_tool_event(event, validation_report)
        
        # Data consistency checks
        await self._validate_data_consistency(event, validation_report)
        
        # Update statistics
        self._update_validation_stats(validation_report)
        
        # Log validation results
        if not validation_report.overall_valid:
            self.logger.warning(f"Validation failed for {event.session_id}: {validation_report}")
        
        return validation_report.overall_valid
    
    async def validate_session_data(self, session_data: Dict) -> ValidationReport:
        """Validate complete session data"""
        validation_report = ValidationReport(
            overall_valid=True,
            item_id=session_data.get('id', 'unknown'),
            timestamp=datetime.now(),
            results=[]
        )
        
        # Required fields validation
        await self._validate_required_fields(session_data, 'session', validation_report)
        
        # Field format validation
        await self._validate_field_formats(session_data, validation_report)
        
        # Value range validation
        await self._validate_value_ranges(session_data, validation_report)
        
        # Business logic validation
        await self._validate_business_logic(session_data, validation_report)
        
        return validation_report
    
    async def validate_message_data(self, message_data: Dict) -> ValidationReport:
        """Validate message breakdown data"""
        validation_report = ValidationReport(
            overall_valid=True,
            item_id=message_data.get('id', 'unknown'),
            timestamp=datetime.now(),
            results=[]
        )
        
        # Required fields
        await self._validate_required_fields(message_data, 'message', validation_report)
        
        # Content validation
        await self._validate_message_content(message_data, validation_report)
        
        # Token validation
        await self._validate_token_data(message_data, validation_report)
        
        return validation_report
    
    async def validate_tool_data(self, tool_data: Dict) -> ValidationReport:
        """Validate tool usage data"""
        validation_report = ValidationReport(
            overall_valid=True,
            item_id=tool_data.get('id', 'unknown'),
            timestamp=datetime.now(),
            results=[]
        )
        
        # Required fields
        await self._validate_required_fields(tool_data, 'tool', validation_report)
        
        # Tool name validation
        await self._validate_tool_name(tool_data, validation_report)
        
        return validation_report
    
    async def _validate_basic_structure(self, event, report: ValidationReport):
        """Validate basic event structure"""
        required_attrs = ['session_id', 'timestamp', 'event_type', 'data']
        
        for attr in required_attrs:
            if not hasattr(event, attr):
                self._add_validation_result(
                    report, False, ValidationSeverity.CRITICAL,
                    attr, f"Missing required attribute: {attr}"
                )
            elif getattr(event, attr) is None:
                self._add_validation_result(
                    report, False, ValidationSeverity.ERROR,
                    attr, f"Attribute {attr} is None"
                )
        
        # Validate session_id format
        if hasattr(event, 'session_id'):
            if not self._validate_session_id_format(event.session_id):
                corrected_id = self._generate_session_id()
                self._add_validation_result(
                    report, False, ValidationSeverity.WARNING,
                    'session_id', f"Invalid session_id format: {event.session_id}",
                    f"Generate new session_id", corrected_id
                )
        
        # Validate timestamp
        if hasattr(event, 'timestamp'):
            if not isinstance(event.timestamp, datetime):
                self._add_validation_result(
                    report, False, ValidationSeverity.ERROR,
                    'timestamp', "Timestamp must be datetime object"
                )
            else:
                # Check if timestamp is reasonable (not too far in future/past)
                now = datetime.now(timezone.utc)
                if abs((event.timestamp - now).total_seconds()) > 86400:  # 24 hours
                    self._add_validation_result(
                        report, False, ValidationSeverity.WARNING,
                        'timestamp', f"Timestamp seems unreasonable: {event.timestamp}"
                    )
    
    async def _validate_session_start(self, event, report: ValidationReport):
        """Validate session start event"""
        data = event.data
        
        # Check for session type
        if 'session_type' not in data:
            self._add_validation_result(
                report, False, ValidationSeverity.WARNING,
                'session_type', "Missing session_type, defaulting to 'claude-code'",
                "Set default session_type", "claude-code"
            )
        
        # Validate project path if present
        if 'project_path' in data and data['project_path']:
            if not self._validate_path_format(data['project_path']):
                self._add_validation_result(
                    report, False, ValidationSeverity.WARNING,
                    'project_path', f"Invalid project path format: {data['project_path']}"
                )
    
    async def _validate_session_end(self, event, report: ValidationReport):
        """Validate session end event"""
        # Check if session exists in cache
        if event.session_id not in self.session_cache:
            self._add_validation_result(
                report, False, ValidationSeverity.WARNING,
                'session_id', f"Session end without corresponding start: {event.session_id}"
            )
        else:
            # Validate duration
            start_time = self.session_cache[event.session_id].get('start_time')
            if start_time and event.timestamp:
                duration = (event.timestamp - start_time).total_seconds() / 60
                if duration < 0:
                    self._add_validation_result(
                        report, False, ValidationSeverity.ERROR,
                        'duration', "Session end time before start time"
                    )
                elif duration > 1440:  # 24 hours
                    self._add_validation_result(
                        report, False, ValidationSeverity.WARNING,
                        'duration', f"Unusually long session: {duration:.1f} minutes"
                    )
    
    async def _validate_message_event(self, event, report: ValidationReport):
        """Validate message event"""
        data = event.data
        
        # Validate role
        valid_roles = ['user', 'assistant', 'system']
        role = data.get('role', '').lower()
        if role not in valid_roles:
            self._add_validation_result(
                report, False, ValidationSeverity.ERROR,
                'role', f"Invalid role: {role}. Must be one of {valid_roles}"
            )
        
        # Validate content
        content = data.get('content', '')
        if not content or len(content.strip()) == 0:
            self._add_validation_result(
                report, False, ValidationSeverity.WARNING,
                'content', "Empty message content"
            )
        elif len(content) > self.config['max_content_length']:
            self._add_validation_result(
                report, False, ValidationSeverity.WARNING,
                'content', f"Content length exceeds maximum: {len(content)}"
            )
        
        # Validate tokens if present
        if 'tokens' in data:
            await self._validate_token_value(data['tokens'], 'tokens', report)
        
        # Validate model if present
        if 'model' in data:
            await self._validate_model_name(data['model'], report)
    
    async def _validate_tool_event(self, event, report: ValidationReport):
        """Validate tool usage event"""
        data = event.data
        
        # Validate tool calls structure
        tool_calls = data.get('tool_calls', [])
        if not isinstance(tool_calls, list):
            self._add_validation_result(
                report, False, ValidationSeverity.ERROR,
                'tool_calls', "tool_calls must be a list"
            )
            return
        
        for i, tool_call in enumerate(tool_calls):
            if not isinstance(tool_call, dict):
                self._add_validation_result(
                    report, False, ValidationSeverity.ERROR,
                    f'tool_calls[{i}]', "Tool call must be a dictionary"
                )
                continue
            
            # Validate tool name
            function_info = tool_call.get('function', {})
            tool_name = function_info.get('name')
            if not tool_name:
                self._add_validation_result(
                    report, False, ValidationSeverity.ERROR,
                    f'tool_calls[{i}].function.name', "Missing tool name"
                )
            else:
                await self._validate_tool_name_value(tool_name, f'tool_calls[{i}].function.name', report)
    
    async def _validate_data_consistency(self, event, report: ValidationReport):
        """Validate data consistency across events"""
        # Track session state
        if event.event_type == 'start':
            self.session_cache[event.session_id] = {
                'start_time': event.timestamp,
                'message_count': 0,
                'tool_count': 0
            }
        elif event.event_type == 'message':
            if event.session_id in self.session_cache:
                self.session_cache[event.session_id]['message_count'] += 1
        elif event.event_type == 'tool':
            if event.session_id in self.session_cache:
                self.session_cache[event.session_id]['tool_count'] += 1
    
    async def _validate_required_fields(self, data: Dict, data_type: str, report: ValidationReport):
        """Validate required fields are present"""
        required_fields = self.config['required_fields'].get(data_type, [])
        
        for field in required_fields:
            if field not in data:
                self._add_validation_result(
                    report, False, ValidationSeverity.ERROR,
                    field, f"Missing required field: {field}"
                )
            elif data[field] is None:
                self._add_validation_result(
                    report, False, ValidationSeverity.ERROR,
                    field, f"Required field {field} is None"
                )
    
    async def _validate_field_formats(self, data: Dict, report: ValidationReport):
        """Validate field formats using regex patterns"""
        patterns = self.config['field_patterns']
        
        for field, pattern in patterns.items():
            if field in data and data[field] is not None:
                value = str(data[field])
                if not re.match(pattern, value):
                    self._add_validation_result(
                        report, False, ValidationSeverity.WARNING,
                        field, f"Field {field} does not match expected pattern"
                    )
    
    async def _validate_value_ranges(self, data: Dict, report: ValidationReport):
        """Validate numeric values are within expected ranges"""
        ranges = self.config['value_ranges']
        
        for field, range_config in ranges.items():
            if field in data and data[field] is not None:
                value = data[field]
                if isinstance(value, (int, float)):
                    if value < range_config['min'] or value > range_config['max']:
                        self._add_validation_result(
                            report, False, ValidationSeverity.WARNING,
                            field, f"Value {value} outside expected range [{range_config['min']}, {range_config['max']}]"
                        )
    
    async def _validate_business_logic(self, data: Dict, report: ValidationReport):
        """Validate business logic rules"""
        # Session must have either estimated or real tokens
        has_estimated = data.get('estimated_tokens', 0) > 0
        has_real = data.get('real_total_tokens', 0) > 0
        
        if not has_estimated and not has_real:
            self._add_validation_result(
                report, False, ValidationSeverity.WARNING,
                'tokens', "Session has no token information"
            )
        
        # Cost should correlate with tokens
        total_tokens = data.get('real_total_tokens') or data.get('estimated_tokens', 0)
        total_cost = data.get('real_cost') or data.get('estimated_cost', 0)
        
        if total_tokens > 0 and total_cost == 0:
            self._add_validation_result(
                report, False, ValidationSeverity.WARNING,
                'cost', "Session has tokens but no cost information"
            )
        
        # Active sessions should not have end time
        if data.get('is_active') and data.get('end_time'):
            self._add_validation_result(
                report, False, ValidationSeverity.ERROR,
                'is_active', "Active session cannot have end_time"
            )
    
    async def _validate_message_content(self, data: Dict, report: ValidationReport):
        """Validate message content"""
        content = data.get('content', '')
        
        # Check for suspicious content patterns
        suspicious_patterns = [
            r'password[:\s]*\w+',
            r'api[_\s]*key[:\s]*[\w-]+',
            r'secret[:\s]*\w+',
            r'token[:\s]*[\w-]+',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                self._add_validation_result(
                    report, False, ValidationSeverity.WARNING,
                    'content', f"Content may contain sensitive information"
                )
                break
    
    async def _validate_token_data(self, data: Dict, report: ValidationReport):
        """Validate token-related fields"""
        token_fields = ['input_tokens', 'output_tokens', 'total_tokens', 'cache_tokens']
        
        for field in token_fields:
            if field in data:
                await self._validate_token_value(data[field], field, report)
        
        # Validate token relationships
        input_tokens = data.get('input_tokens', 0)
        output_tokens = data.get('output_tokens', 0)
        total_tokens = data.get('total_tokens', 0)
        
        if total_tokens > 0 and input_tokens + output_tokens > total_tokens * 1.1:
            self._add_validation_result(
                report, False, ValidationSeverity.WARNING,
                'tokens', "Input + output tokens significantly exceed total tokens"
            )
    
    async def _validate_token_value(self, value: Any, field: str, report: ValidationReport):
        """Validate a single token value"""
        if not isinstance(value, (int, float)):
            self._add_validation_result(
                report, False, ValidationSeverity.ERROR,
                field, f"Token value must be numeric, got {type(value)}"
            )
        elif value < 0:
            self._add_validation_result(
                report, False, ValidationSeverity.ERROR,
                field, f"Token value cannot be negative: {value}"
            )
        elif value > 1000000:  # 1M tokens seems like a reasonable upper bound
            self._add_validation_result(
                report, False, ValidationSeverity.WARNING,
                field, f"Unusually high token count: {value}"
            )
    
    async def _validate_model_name(self, model: str, report: ValidationReport):
        """Validate model name"""
        if model not in self.known_models:
            self._add_validation_result(
                report, False, ValidationSeverity.INFO,
                'model', f"Unknown model: {model}"
            )
            # Add to known models for future reference
            self.known_models.add(model)
    
    async def _validate_tool_name_value(self, tool_name: str, field: str, report: ValidationReport):
        """Validate tool name"""
        if tool_name not in self.known_tools:
            self._add_validation_result(
                report, False, ValidationSeverity.INFO,
                field, f"Unknown tool: {tool_name}"
            )
            # Add to known tools for future reference
            self.known_tools.add(tool_name)
    
    def _validate_session_id_format(self, session_id: str) -> bool:
        """Validate session ID format"""
        pattern = self.config['field_patterns'].get('session_id', r'^[a-zA-Z0-9_-]+$')
        return bool(re.match(pattern, session_id))
    
    def _validate_path_format(self, path: str) -> bool:
        """Validate file path format"""
        try:
            Path(path)
            return True
        except (ValueError, OSError):
            return False
    
    def _generate_session_id(self) -> str:
        """Generate a valid session ID"""
        timestamp = int(datetime.now().timestamp())
        random_suffix = str(uuid.uuid4())[:8]
        return f"cc_session_{timestamp}_{random_suffix}"
    
    def _add_validation_result(self, report: ValidationReport, is_valid: bool,
                              severity: ValidationSeverity, field: str, message: str,
                              suggested_fix: Optional[str] = None,
                              corrected_value: Optional[Any] = None):
        """Add validation result to report"""
        result = ValidationResult(
            is_valid=is_valid,
            severity=severity,
            field=field,
            message=message,
            suggested_fix=suggested_fix,
            corrected_value=corrected_value
        )
        
        report.results.append(result)
        
        if not is_valid:
            report.overall_valid = False
            
        if severity == ValidationSeverity.WARNING:
            report.warnings_count += 1
        elif severity == ValidationSeverity.ERROR:
            report.errors_count += 1
        elif severity == ValidationSeverity.CRITICAL:
            report.critical_count += 1
    
    def _update_validation_stats(self, report: ValidationReport):
        """Update validation statistics"""
        self.validation_stats['total_validated'] += 1
        if report.overall_valid:
            self.validation_stats['total_passed'] += 1
        else:
            self.validation_stats['total_failed'] += 1
        
        # Count auto-corrections
        auto_corrected = sum(1 for r in report.results if r.corrected_value is not None)
        self.validation_stats['auto_corrected'] += auto_corrected
    
    def get_validation_statistics(self) -> Dict:
        """Get validation statistics"""
        stats = self.validation_stats.copy()
        if stats['total_validated'] > 0:
            stats['pass_rate'] = stats['total_passed'] / stats['total_validated']
            stats['failure_rate'] = stats['total_failed'] / stats['total_validated']
        else:
            stats['pass_rate'] = 0.0
            stats['failure_rate'] = 0.0
        
        return stats
    
    def reset_validation_stats(self):
        """Reset validation statistics"""
        self.validation_stats = {
            "total_validated": 0,
            "total_passed": 0,
            "total_failed": 0,
            "auto_corrected": 0
        }