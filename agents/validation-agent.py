#!/usr/bin/env python3
"""
Validation Agent for Claude Code Optimizer
===========================================

Specialized agent for session accuracy validation and confidence scoring.

Core Responsibilities:
- Cross-source validation with >90% confidence requirements
- Timestamp correlation across multiple detection sources
- Edge case handling and conflict resolution
- Accuracy metrics and reliability scoring
- Session start timing validation
- Source reliability tracking and improvement

Agent Architecture:
- session_accuracy_validator.py: Core validation engine
- Multi-dimensional validation scoring
- Historical accuracy tracking
- Real-time confidence assessment
"""

import os
import sys
import json
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging
from collections import deque, defaultdict
import statistics

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure agent logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s.%(msecs)03d [VALIDATION-AGENT] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler('logs/validation-agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ValidationAgent:
    """
    Specialized Validation Agent
    
    Provides high-precision session validation with confidence scoring.
    Only approves sessions with >90% confidence for 5hr timer initiation.
    """
    
    def __init__(self):
        self.agent_id = f"validation-agent-{int(time.time())}"
        self.startup_time = datetime.now()
        
        # Core validation components
        self.validator = None
        self.validation_history = deque(maxlen=200)
        self.source_reliability = {}
        
        # Agent state
        self.is_running = False
        self.validation_thread = None
        
        # Performance metrics
        self.metrics = {
            'total_validations': 0,
            'high_confidence_approvals': 0,
            'rejections': 0,
            'accuracy_rate': 0.0,
            'average_confidence': 0.0,
            'last_validation': None
        }
        
        # Validation callbacks for other agents
        self.validation_callbacks = []
        
    def initialize(self):
        """Initialize validation agent"""
        logger.info(f"Initializing Validation Agent {self.agent_id}")
        
        # Create logs directory
        os.makedirs('logs', exist_ok=True)
        
        # Import and initialize session accuracy validator
        try:
            from session_accuracy_validator import SessionAccuracyValidator
            self.validator = SessionAccuracyValidator(history_size=500)
            logger.info("✅ Session accuracy validator initialized")
        except ImportError as e:
            logger.error(f"❌ Failed to import session validator: {e}")
            return False
            
        # Load historical reliability data
        self._load_reliability_data()
        
        self.is_running = True
        logger.info(f"🚀 Validation Agent {self.agent_id} fully initialized")
        return True
        
    def start_validation_service(self):
        """Start validation service for other agents"""
        if not self.is_running:
            logger.error("Agent not initialized")
            return
            
        self.validation_thread = threading.Thread(
            target=self._validation_service_loop,
            daemon=True
        )
        self.validation_thread.start()
        logger.info("Validation service started")
        
    def validate_session_detection(self, detection_data: Dict) -> Dict:
        """
        Validate session detection from multiple sources
        
        Args:
            detection_data: Raw detection data from detection agent
            
        Returns:
            Comprehensive validation result with confidence scoring
        """
        logger.info(f"🔍 Validating session detection from {len(detection_data)} sources")
        
        # Extract detections for validation
        detections = self._extract_detections(detection_data)
        
        # Perform validation using core validator
        validation_result = self.validator.validate_session_start(detections)
        
        # Enhanced analysis with agent-specific logic
        enhanced_result = self._enhance_validation_result(validation_result, detection_data)
        
        # Update metrics and history
        self._update_validation_metrics(enhanced_result)
        
        # Store validation for learning
        self.validation_history.append({
            'timestamp': datetime.now(),
            'detection_data': detection_data,
            'validation_result': enhanced_result,
            'approved': enhanced_result['approved'],
            'confidence': enhanced_result['confidence']
        })
        
        # Log validation decision
        logger.info(f"🎯 Validation complete: "
                   f"Approved={enhanced_result['approved']}, "
                   f"Confidence={enhanced_result['confidence']:.2%}")
        
        # Notify other agents
        self._notify_validation_complete(enhanced_result)
        
        return enhanced_result
        
    def _extract_detections(self, detection_data: Dict) -> Dict:
        """Extract detection events for validator"""
        detections = {}
        
        # Extract from precision detector data
        if 'precision_detector' in detection_data.get('sources', {}):
            pd_data = detection_data['sources']['precision_detector']
            
            for source_name, source_info in pd_data.get('sources', {}).items():
                if source_info.get('is_active'):
                    detections[source_name] = {
                        'active': True,
                        'confidence': source_info.get('confidence', 0.0),
                        'timestamp': source_info.get('last_activity'),
                        'metadata': source_info
                    }
                    
        # Extract from desktop monitor data
        if 'desktop_monitor' in detection_data.get('sources', {}):
            dm_data = detection_data['sources']['desktop_monitor']
            
            if dm_data.get('app_running') or dm_data.get('window_active'):
                detections['desktop_monitor'] = {
                    'active': True,
                    'confidence': self._calculate_desktop_confidence(dm_data),
                    'timestamp': dm_data.get('recent_activity'),
                    'metadata': dm_data
                }
                
        return detections
        
    def _calculate_desktop_confidence(self, dm_data: Dict) -> float:
        """Calculate confidence score for desktop monitor data"""
        confidence = 0.0
        
        if dm_data.get('app_running'):
            confidence += 0.6
            
        if dm_data.get('window_active'):
            confidence += 0.3
            
        if dm_data.get('recent_files', 0) > 0:
            confidence += 0.1
            
        return min(1.0, confidence)
        
    def _enhance_validation_result(self, base_result, detection_data: Dict) -> Dict:
        """Enhance validation result with agent-specific analysis"""
        enhanced = {
            'validation_id': f"val_{int(time.time()*1000)}",
            'agent_id': self.agent_id,
            'timestamp': datetime.now(),
            'base_validation': base_result,
            'confidence': base_result.confidence,
            'approved': False,
            'approval_reason': '',
            'risk_factors': [],
            'quality_score': 0.0,
            'source_analysis': {}
        }
        
        # Determine approval based on strict criteria
        should_approve, reason = self.validator.should_start_timer(base_result, strict_mode=True)
        enhanced['approved'] = should_approve
        enhanced['approval_reason'] = reason
        
        # Additional validation layers
        enhanced.update(self._perform_additional_validation(base_result, detection_data))
        
        # Calculate quality score
        enhanced['quality_score'] = self._calculate_quality_score(enhanced)
        
        return enhanced
        
    def _perform_additional_validation(self, base_result, detection_data: Dict) -> Dict:
        """Perform additional validation checks"""
        additional = {
            'risk_factors': [],
            'source_analysis': {},
            'temporal_analysis': {},
            'confidence_adjustments': []
        }
        
        # Temporal validation
        if base_result.start_timestamp:
            age_seconds = (datetime.now() - base_result.start_timestamp).total_seconds()
            
            if age_seconds > 60:  # Detection is more than 1 minute old
                additional['risk_factors'].append('stale_detection')
                additional['confidence_adjustments'].append(-0.1)
            elif age_seconds < 1:  # Very recent detection
                additional['confidence_adjustments'].append(0.05)
                
            additional['temporal_analysis'] = {
                'detection_age_seconds': age_seconds,
                'is_fresh': age_seconds < 10
            }
            
        # Source reliability analysis
        active_sources = detection_data.get('sources', {}).keys()
        reliable_sources = []
        unreliable_sources = []
        
        for source in active_sources:
            reliability = self.source_reliability.get(source, 0.5)
            if reliability >= 0.8:
                reliable_sources.append(source)
            elif reliability < 0.6:
                unreliable_sources.append(source)
                
        additional['source_analysis'] = {
            'reliable_sources': reliable_sources,
            'unreliable_sources': unreliable_sources,
            'source_count': len(active_sources)
        }
        
        if unreliable_sources:
            additional['risk_factors'].append('unreliable_sources_present')
            additional['confidence_adjustments'].append(-0.05 * len(unreliable_sources))
            
        # Historical pattern analysis
        recent_validations = list(self.validation_history)[-10:]
        if recent_validations:
            recent_approvals = sum(1 for v in recent_validations if v['approved'])
            approval_rate = recent_approvals / len(recent_validations)
            
            if approval_rate < 0.3:  # Low recent approval rate
                additional['risk_factors'].append('low_recent_approval_rate')
                additional['confidence_adjustments'].append(-0.1)
                
        return additional
        
    def _calculate_quality_score(self, enhanced_result: Dict) -> float:
        """Calculate overall validation quality score"""
        base_score = enhanced_result['confidence']
        
        # Apply adjustments
        adjustments = enhanced_result.get('confidence_adjustments', [])
        adjustment_total = sum(adjustments)
        
        # Source quality bonus
        source_analysis = enhanced_result.get('source_analysis', {})
        reliable_count = len(source_analysis.get('reliable_sources', []))
        source_bonus = min(0.1, reliable_count * 0.03)
        
        # Risk penalty
        risk_count = len(enhanced_result.get('risk_factors', []))
        risk_penalty = min(0.2, risk_count * 0.05)
        
        quality_score = base_score + adjustment_total + source_bonus - risk_penalty
        return max(0.0, min(1.0, quality_score))
        
    def _update_validation_metrics(self, result: Dict):
        """Update agent performance metrics"""
        self.metrics['total_validations'] += 1
        self.metrics['last_validation'] = result['timestamp']
        
        if result['approved']:
            if result['confidence'] >= 0.90:
                self.metrics['high_confidence_approvals'] += 1
        else:
            self.metrics['rejections'] += 1
            
        # Calculate running averages
        recent_validations = list(self.validation_history)[-50:]  # Last 50
        if recent_validations:
            approvals = sum(1 for v in recent_validations if v['approved'])
            self.metrics['accuracy_rate'] = approvals / len(recent_validations)
            self.metrics['average_confidence'] = statistics.mean(
                v['confidence'] for v in recent_validations
            )
            
    def _notify_validation_complete(self, result: Dict):
        """Notify other agents of validation completion"""
        for callback in self.validation_callbacks:
            try:
                callback('validation_complete', result)
            except Exception as e:
                logger.error(f"Validation callback error: {e}")
                
    def _validation_service_loop(self):
        """Background service loop for continuous validation"""
        while self.is_running:
            try:
                # Perform periodic reliability updates
                self._update_source_reliability()
                
                # Clean old validation history
                self._cleanup_old_validations()
                
                # Generate periodic reports
                if datetime.now().minute % 10 == 0:  # Every 10 minutes
                    self._generate_validation_report()
                    
                time.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Validation service error: {e}")
                time.sleep(60)
                
    def _update_source_reliability(self):
        """Update source reliability scores based on validation history"""
        if len(self.validation_history) < 10:
            return
            
        # Analyze recent validations by source
        recent = list(self.validation_history)[-50:]
        source_stats = defaultdict(lambda: {'correct': 0, 'total': 0})
        
        for validation in recent:
            detection_data = validation['detection_data']
            was_correct = validation['approved']  # Simplified metric
            
            for source in detection_data.get('sources', {}).keys():
                source_stats[source]['total'] += 1
                if was_correct:
                    source_stats[source]['correct'] += 1
                    
        # Update reliability scores
        for source, stats in source_stats.items():
            if stats['total'] > 0:
                accuracy = stats['correct'] / stats['total']
                current = self.source_reliability.get(source, 0.5)
                
                # Exponential moving average
                alpha = 0.1
                new_reliability = (1 - alpha) * current + alpha * accuracy
                self.source_reliability[source] = new_reliability
                
                logger.debug(f"Updated {source} reliability: {new_reliability:.3f}")
                
    def _cleanup_old_validations(self):
        """Remove old validation data to prevent memory growth"""
        cutoff = datetime.now() - timedelta(hours=24)
        
        # Clean validation history (keep recent ones)
        while (self.validation_history and 
               len(self.validation_history) > 50 and
               self.validation_history[0]['timestamp'] < cutoff):
            self.validation_history.popleft()
            
    def _generate_validation_report(self):
        """Generate periodic validation performance report"""
        if not self.validation_history:
            return
            
        report = {
            'agent_id': self.agent_id,
            'timestamp': datetime.now(),
            'metrics': dict(self.metrics),
            'source_reliability': dict(self.source_reliability),
            'validation_count': len(self.validation_history)
        }
        
        # Save report
        report_path = Path('logs') / 'validation-reports.jsonl'
        with open(report_path, 'a') as f:
            f.write(json.dumps(report, default=str) + '\n')
            
        logger.info(f"📊 Validation report: {self.metrics['accuracy_rate']:.1%} accuracy, "
                   f"{self.metrics['average_confidence']:.2%} avg confidence")
                   
    def _load_reliability_data(self):
        """Load historical source reliability data"""
        try:
            reliability_path = Path('logs') / 'source-reliability.json'
            if reliability_path.exists():
                with open(reliability_path) as f:
                    self.source_reliability = json.load(f)
                logger.info(f"Loaded reliability data for {len(self.source_reliability)} sources")
        except Exception as e:
            logger.warning(f"Could not load reliability data: {e}")
            
    def _save_reliability_data(self):
        """Save source reliability data"""
        try:
            reliability_path = Path('logs') / 'source-reliability.json'
            os.makedirs(reliability_path.parent, exist_ok=True)
            
            with open(reliability_path, 'w') as f:
                json.dump(self.source_reliability, f, indent=2)
                
        except Exception as e:
            logger.error(f"Failed to save reliability data: {e}")
            
    def add_validation_callback(self, callback):
        """Add callback for validation events"""
        self.validation_callbacks.append(callback)
        
    def get_validation_summary(self) -> Dict:
        """Get comprehensive validation performance summary"""
        recent_validations = list(self.validation_history)[-20:]
        
        summary = {
            'agent_id': self.agent_id,
            'status': 'running' if self.is_running else 'stopped',
            'startup_time': self.startup_time.isoformat(),
            'metrics': dict(self.metrics),
            'source_reliability': dict(self.source_reliability),
            'recent_performance': {}
        }
        
        if recent_validations:
            high_conf = sum(1 for v in recent_validations if v['confidence'] >= 0.90)
            approved = sum(1 for v in recent_validations if v['approved'])
            
            summary['recent_performance'] = {
                'validations_count': len(recent_validations),
                'high_confidence_rate': high_conf / len(recent_validations),
                'approval_rate': approved / len(recent_validations),
                'average_confidence': statistics.mean(v['confidence'] for v in recent_validations)
            }
            
        return summary
        
    def stop(self):
        """Stop validation agent"""
        logger.info("Stopping Validation Agent")
        
        self.is_running = False
        
        if self.validation_thread:
            self.validation_thread.join(timeout=5)
            
        # Save reliability data
        self._save_reliability_data()
        
        logger.info("✅ Validation Agent stopped")


def main():
    """Main entry point for validation agent"""
    agent = ValidationAgent()
    
    try:
        # Initialize agent
        if not agent.initialize():
            logger.error("Failed to initialize validation agent")
            return 1
            
        # Start validation service
        agent.start_validation_service()
        
        # Test validation
        test_detection = {
            'sources': {
                'precision_detector': {
                    'sources': {
                        'claude_code_cli': {
                            'is_active': True,
                            'confidence': 0.95,
                            'last_activity': datetime.now().isoformat()
                        }
                    }
                }
            }
        }
        
        result = agent.validate_session_detection(test_detection)
        print(f"\n🎯 Test Validation Result:")
        print(f"   Approved: {result['approved']}")
        print(f"   Confidence: {result['confidence']:.2%}")
        print(f"   Reason: {result['approval_reason']}")
        
        logger.info("Validation agent running. Press Ctrl+C to stop.")
        
        # Status reporting
        while agent.is_running:
            time.sleep(30)
            summary = agent.get_validation_summary()
            logger.info(f"Agent Status: {summary['metrics']}")
            
    except KeyboardInterrupt:
        logger.info("Shutdown requested")
        agent.stop()
        return 0
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        agent.stop()
        return 1


if __name__ == "__main__":
    sys.exit(main())