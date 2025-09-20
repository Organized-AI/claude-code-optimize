#!/usr/bin/env python3
"""
Session Accuracy Validator for Claude Code Optimizer
=====================================================

Cross-validates session start detection across multiple sources with confidence scoring.
Only allows 5hr timer to start with >90% confidence.

Features:
- Multi-source timestamp correlation
- Confidence scoring with edge case handling
- Source conflict resolution
- Accuracy metrics for dashboard integration
"""

import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass
from collections import deque
import statistics
import logging

logger = logging.getLogger(__name__)


@dataclass
class DetectionEvent:
    """Single detection event from a source"""
    source: str
    timestamp: datetime
    confidence: float
    metadata: Dict
    
    def age_seconds(self) -> float:
        """Get age of detection in seconds"""
        return (datetime.now() - self.timestamp).total_seconds()


@dataclass
class ValidationResult:
    """Result of session validation"""
    is_valid: bool
    confidence: float
    start_timestamp: datetime
    validation_score: float
    sources_agreement: float
    conflicts: List[str]
    metadata: Dict
    
    def meets_threshold(self, threshold: float = 0.90) -> bool:
        """Check if validation meets confidence threshold"""
        return self.is_valid and self.confidence >= threshold


class SessionAccuracyValidator:
    """Validates session detection accuracy across multiple sources"""
    
    # Confidence weights by source reliability
    SOURCE_WEIGHTS = {
        'claude_code_cli': 0.95,    # Highest - file system events are very reliable
        'claude_desktop': 0.85,     # High - process + app support detection
        'claude_browser': 0.70      # Lower - network detection less reliable
    }
    
    # Time tolerance for considering detections as same session
    TIME_TOLERANCE_SECONDS = 10
    
    def __init__(self, history_size: int = 100):
        self.detection_history = deque(maxlen=history_size)
        self.validation_history = deque(maxlen=50)
        self.source_reliability = dict(self.SOURCE_WEIGHTS)
        self.conflict_patterns = []
        
    def validate_session_start(self, detections: Dict[str, Dict]) -> ValidationResult:
        """
        Validate session start across multiple detection sources
        
        Args:
            detections: Dict of source_name -> detection_data
            
        Returns:
            ValidationResult with confidence scoring
        """
        logger.debug(f"Validating session start with {len(detections)} sources")
        
        # Convert to DetectionEvent objects
        events = self._parse_detection_events(detections)
        
        if not events:
            return ValidationResult(
                is_valid=False,
                confidence=0.0,
                start_timestamp=datetime.now(),
                validation_score=0.0,
                sources_agreement=0.0,
                conflicts=['no_detections'],
                metadata={'reason': 'No valid detection events'}
            )
        
        # Perform multi-dimensional validation
        timestamp_validation = self._validate_timestamps(events)
        source_validation = self._validate_sources(events)
        consistency_validation = self._validate_consistency(events)
        
        # Calculate combined confidence
        combined_confidence = self._calculate_combined_confidence(
            events, timestamp_validation, source_validation, consistency_validation
        )
        
        # Determine session start time
        start_timestamp = self._determine_start_timestamp(events)
        
        # Check for conflicts
        conflicts = self._identify_conflicts(events, timestamp_validation)
        
        # Calculate validation metrics
        validation_score = (
            timestamp_validation['score'] * 0.4 +
            source_validation['score'] * 0.4 +
            consistency_validation['score'] * 0.2
        )
        
        result = ValidationResult(
            is_valid=combined_confidence >= 0.70,  # Minimum threshold for validity
            confidence=combined_confidence,
            start_timestamp=start_timestamp,
            validation_score=validation_score,
            sources_agreement=timestamp_validation['agreement'],
            conflicts=conflicts,
            metadata={
                'timestamp_validation': timestamp_validation,
                'source_validation': source_validation,
                'consistency_validation': consistency_validation,
                'events_count': len(events),
                'primary_source': max(events, key=lambda e: e.confidence).source
            }
        )
        
        # Store for history
        self.validation_history.append(result)
        
        logger.info(f"Session validation: confidence={combined_confidence:.2%}, "
                   f"valid={result.is_valid}, conflicts={len(conflicts)}")
        
        return result
    
    def _parse_detection_events(self, detections: Dict[str, Dict]) -> List[DetectionEvent]:
        """Parse raw detections into DetectionEvent objects"""
        events = []
        
        for source, data in detections.items():
            if not data.get('active', False):
                continue
                
            timestamp = data.get('timestamp')
            if isinstance(timestamp, str):
                try:
                    timestamp = datetime.fromisoformat(timestamp)
                except:
                    timestamp = datetime.now()
            elif not isinstance(timestamp, datetime):
                timestamp = datetime.now()
                
            confidence = data.get('confidence', 0.0)
            metadata = {k: v for k, v in data.items() if k not in ['active', 'timestamp', 'confidence']}
            
            events.append(DetectionEvent(
                source=source,
                timestamp=timestamp,
                confidence=confidence,
                metadata=metadata
            ))
            
        return events
    
    def _validate_timestamps(self, events: List[DetectionEvent]) -> Dict:
        """Validate timestamp consistency across sources"""
        if len(events) < 2:
            return {
                'score': 1.0 if events else 0.0,
                'agreement': 1.0 if events else 0.0,
                'spread_seconds': 0.0,
                'outliers': []
            }
        
        timestamps = [e.timestamp for e in events]
        
        # Calculate time spread
        min_time = min(timestamps)
        max_time = max(timestamps)
        spread_seconds = (max_time - min_time).total_seconds()
        
        # Calculate agreement score
        if spread_seconds <= self.TIME_TOLERANCE_SECONDS:
            agreement = 1.0
            score = 1.0
        elif spread_seconds <= self.TIME_TOLERANCE_SECONDS * 2:
            agreement = 0.8
            score = 0.8
        elif spread_seconds <= self.TIME_TOLERANCE_SECONDS * 3:
            agreement = 0.6
            score = 0.6
        else:
            agreement = 0.3
            score = 0.3
            
        # Identify outliers
        if len(timestamps) >= 3:
            median_time = sorted(timestamps)[len(timestamps)//2]
            outliers = []
            
            for event in events:
                time_diff = abs((event.timestamp - median_time).total_seconds())
                if time_diff > self.TIME_TOLERANCE_SECONDS * 2:
                    outliers.append(event.source)
        else:
            outliers = []
            
        return {
            'score': score,
            'agreement': agreement,
            'spread_seconds': spread_seconds,
            'outliers': outliers,
            'min_time': min_time,
            'max_time': max_time
        }
    
    def _validate_sources(self, events: List[DetectionEvent]) -> Dict:
        """Validate source reliability and coverage"""
        source_names = [e.source for e in events]
        
        # Calculate weighted confidence
        weighted_confidence = 0.0
        total_weight = 0.0
        
        for event in events:
            weight = self.source_reliability.get(event.source, 0.5)
            weighted_confidence += event.confidence * weight
            total_weight += weight
            
        if total_weight > 0:
            weighted_confidence /= total_weight
        
        # Coverage score based on number and quality of sources
        if 'claude_code_cli' in source_names:
            coverage_score = 0.8  # CLI detection is primary
            if 'claude_desktop' in source_names:
                coverage_score = 0.95  # CLI + Desktop is excellent
            if len(source_names) >= 3:
                coverage_score = 1.0  # All sources is perfect
        elif len(source_names) >= 2:
            coverage_score = 0.7  # Multiple sources without CLI
        else:
            coverage_score = 0.5  # Single source
            
        # Source reliability score
        reliability_scores = [
            self.source_reliability.get(source, 0.5) for source in source_names
        ]
        reliability_score = statistics.mean(reliability_scores) if reliability_scores else 0.0
        
        # Combined source score
        source_score = (weighted_confidence * 0.4 + coverage_score * 0.3 + reliability_score * 0.3)
        
        return {
            'score': source_score,
            'weighted_confidence': weighted_confidence,
            'coverage_score': coverage_score,
            'reliability_score': reliability_score,
            'source_count': len(source_names),
            'sources': source_names
        }
    
    def _validate_consistency(self, events: List[DetectionEvent]) -> Dict:
        """Validate consistency with historical patterns"""
        if len(self.detection_history) < 5:
            # Not enough history for consistency check
            return {'score': 0.8, 'reason': 'insufficient_history'}
        
        # Check recent detection patterns
        recent_events = [e for e in self.detection_history if e.age_seconds() < 3600]  # Last hour
        
        if not recent_events:
            return {'score': 0.9, 'reason': 'no_recent_conflicts'}
        
        # Look for rapid start/stop patterns (false positives)
        rapid_changes = 0
        for i in range(len(recent_events) - 1):
            time_diff = abs((recent_events[i+1].timestamp - recent_events[i].timestamp).total_seconds())
            if time_diff < 30:  # Less than 30 seconds between detections
                rapid_changes += 1
                
        if rapid_changes > 3:
            consistency_score = 0.6  # Potential instability
        elif rapid_changes > 1:
            consistency_score = 0.8
        else:
            consistency_score = 1.0
            
        return {
            'score': consistency_score,
            'rapid_changes': rapid_changes,
            'recent_events': len(recent_events)
        }
    
    def _calculate_combined_confidence(self, events: List[DetectionEvent], 
                                     timestamp_val: Dict, source_val: Dict, 
                                     consistency_val: Dict) -> float:
        """Calculate final combined confidence score"""
        
        # Base confidence from individual sources
        individual_confidences = [e.confidence for e in events]
        base_confidence = max(individual_confidences) if individual_confidences else 0.0
        
        # Apply validation modifiers
        timestamp_modifier = timestamp_val['score']
        source_modifier = source_val['score']
        consistency_modifier = consistency_val['score']
        
        # Multi-source bonus
        if len(events) >= 2:
            multi_source_bonus = min(0.1, 0.05 * (len(events) - 1))
        else:
            multi_source_bonus = 0.0
            
        # Calculate combined score
        combined = (
            base_confidence * 0.4 +
            timestamp_modifier * 0.25 +
            source_modifier * 0.25 +
            consistency_modifier * 0.1 +
            multi_source_bonus
        )
        
        # Cap at reasonable maximum
        return min(0.98, combined)
    
    def _determine_start_timestamp(self, events: List[DetectionEvent]) -> datetime:
        """Determine the most accurate session start timestamp"""
        if not events:
            return datetime.now()
        
        if len(events) == 1:
            return events[0].timestamp
        
        # Weight timestamps by source reliability and confidence
        weighted_timestamps = []
        
        for event in events:
            source_weight = self.source_reliability.get(event.source, 0.5)
            combined_weight = source_weight * event.confidence
            
            # Convert to epoch for weighted average
            epoch_time = event.timestamp.timestamp()
            weighted_timestamps.append((epoch_time, combined_weight))
        
        # Calculate weighted average
        if weighted_timestamps:
            total_weight = sum(weight for _, weight in weighted_timestamps)
            if total_weight > 0:
                weighted_avg = sum(time * weight for time, weight in weighted_timestamps) / total_weight
                return datetime.fromtimestamp(weighted_avg)
        
        # Fallback: use earliest timestamp from most reliable source
        reliable_events = sorted(events, key=lambda e: (
            self.source_reliability.get(e.source, 0.5),
            e.confidence
        ), reverse=True)
        
        return reliable_events[0].timestamp
    
    def _identify_conflicts(self, events: List[DetectionEvent], 
                          timestamp_val: Dict) -> List[str]:
        """Identify potential conflicts in detection"""
        conflicts = []
        
        # Timestamp conflicts
        if timestamp_val['spread_seconds'] > self.TIME_TOLERANCE_SECONDS * 2:
            conflicts.append('timestamp_spread_high')
            
        if timestamp_val.get('outliers'):
            conflicts.extend([f'timestamp_outlier_{source}' for source in timestamp_val['outliers']])
            
        # Confidence conflicts
        confidences = [e.confidence for e in events]
        if len(confidences) >= 2:
            confidence_spread = max(confidences) - min(confidences)
            if confidence_spread > 0.3:
                conflicts.append('confidence_spread_high')
                
        # Source reliability conflicts
        low_confidence_sources = [e.source for e in events if e.confidence < 0.7]
        if low_confidence_sources:
            conflicts.extend([f'low_confidence_{source}' for source in low_confidence_sources])
            
        return conflicts
    
    def update_source_reliability(self, source: str, accuracy: float):
        """Update source reliability based on observed accuracy"""
        current = self.source_reliability.get(source, 0.5)
        
        # Exponential moving average
        alpha = 0.1
        self.source_reliability[source] = (1 - alpha) * current + alpha * accuracy
        
        logger.debug(f"Updated {source} reliability: {self.source_reliability[source]:.3f}")
    
    def get_validation_metrics(self) -> Dict:
        """Get comprehensive validation metrics"""
        if not self.validation_history:
            return {
                'total_validations': 0,
                'accuracy_rate': 0.0,
                'average_confidence': 0.0,
                'conflict_rate': 0.0
            }
        
        recent = list(self.validation_history)[-20:]  # Last 20 validations
        
        valid_count = sum(1 for v in recent if v.is_valid)
        high_confidence_count = sum(1 for v in recent if v.confidence >= 0.90)
        
        conflicts_count = sum(len(v.conflicts) for v in recent)
        
        return {
            'total_validations': len(recent),
            'accuracy_rate': valid_count / len(recent),
            'high_confidence_rate': high_confidence_count / len(recent),
            'average_confidence': statistics.mean(v.confidence for v in recent),
            'average_validation_score': statistics.mean(v.validation_score for v in recent),
            'conflict_rate': conflicts_count / len(recent),
            'source_reliability': dict(self.source_reliability),
            'last_validation': recent[-1] if recent else None
        }
    
    def should_start_timer(self, validation_result: ValidationResult, 
                          strict_mode: bool = True) -> Tuple[bool, str]:
        """
        Determine if 5hr timer should start based on validation
        
        Args:
            validation_result: Result from validate_session_start
            strict_mode: If True, requires >90% confidence
            
        Returns:
            (should_start, reason)
        """
        threshold = 0.90 if strict_mode else 0.80
        
        if not validation_result.is_valid:
            return False, "Session validation failed"
        
        if validation_result.confidence < threshold:
            return False, f"Confidence {validation_result.confidence:.1%} below threshold {threshold:.0%}"
        
        if len(validation_result.conflicts) > 2:
            return False, f"Too many conflicts: {validation_result.conflicts}"
        
        # Check for critical conflicts
        critical_conflicts = [c for c in validation_result.conflicts 
                            if 'low_confidence' in c or 'timestamp_spread_high' in c]
        if critical_conflicts:
            return False, f"Critical conflicts: {critical_conflicts}"
        
        return True, f"High confidence session start validated ({validation_result.confidence:.1%})"


def main():
    """Test validation system"""
    validator = SessionAccuracyValidator()
    
    # Test with sample detections
    test_detections = {
        'claude_code_cli': {
            'active': True,
            'timestamp': datetime.now(),
            'confidence': 0.95,
            'session_id': 'test_session'
        },
        'claude_desktop': {
            'active': True,
            'timestamp': datetime.now() - timedelta(seconds=2),
            'confidence': 0.88,
            'process_pid': 12345
        }
    }
    
    result = validator.validate_session_start(test_detections)
    should_start, reason = validator.should_start_timer(result)
    
    print(f"Validation Result:")
    print(f"  Valid: {result.is_valid}")
    print(f"  Confidence: {result.confidence:.2%}")
    print(f"  Should start timer: {should_start}")
    print(f"  Reason: {reason}")
    print(f"  Conflicts: {result.conflicts}")
    print(f"  Sources agreement: {result.sources_agreement:.2%}")


if __name__ == "__main__":
    main()