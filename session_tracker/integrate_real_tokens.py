#!/usr/bin/env python3
"""
Integration Script for Real Token Data

This script integrates the real token extraction and monitoring systems
with the existing Claude session tracking infrastructure.

It provides:
1. Migration from estimated to real token counts
2. Real-time token monitoring integration
3. Dashboard data updates
4. Validation and accuracy reporting
"""

import sqlite3
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from claude_token_extractor import ClaudeTokenExtractor
from real_token_tracker import RealTokenTracker


class TokenIntegrationManager:
    """Manages the integration of real token data with existing session tracking."""
    
    def __init__(self, database_path: str):
        self.database_path = database_path
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.extractor = ClaudeTokenExtractor(database_path)
        self.tracker = RealTokenTracker(database_path)
        
    def run_full_integration(self) -> Dict[str, any]:
        """Run complete integration process."""
        self.logger.info("Starting full token integration process...")
        
        results = {
            'extraction_results': {},
            'tracking_status': {},
            'database_updates': {},
            'validation_results': {},
            'recommendations': []
        }
        
        # Step 1: Extract historical token data
        self.logger.info("Step 1: Extracting historical token data...")
        extraction_results = self._extract_historical_tokens()
        results['extraction_results'] = extraction_results
        
        # Step 2: Update existing sessions with real data
        self.logger.info("Step 2: Updating existing sessions...")
        update_results = self._update_existing_sessions()
        results['database_updates'] = update_results
        
        # Step 3: Start real-time monitoring
        self.logger.info("Step 3: Starting real-time monitoring...")
        tracking_results = self._setup_realtime_tracking()
        results['tracking_status'] = tracking_results
        
        # Step 4: Validate accuracy
        self.logger.info("Step 4: Validating token accuracy...")
        validation_results = self._validate_token_accuracy()
        results['validation_results'] = validation_results
        
        # Step 5: Generate recommendations
        self.logger.info("Step 5: Generating recommendations...")
        recommendations = self._generate_recommendations(results)
        results['recommendations'] = recommendations
        
        self.logger.info("Full token integration completed")
        return results
    
    def _extract_historical_tokens(self) -> Dict[str, any]:
        """Extract historical token data from all available sources."""
        try:
            # Extract from all sources
            token_data = self.extractor.extract_all_tokens()
            
            # Validate the extracted data
            valid_tokens = [token for token in token_data if self.extractor.validate_token_data(token)]
            
            # Update database
            updated_count = self.extractor.update_database_with_real_tokens(valid_tokens)
            
            # Calculate totals
            total_tokens = sum(token.total_tokens for token in valid_tokens)
            total_input = sum(token.input_tokens for token in valid_tokens)
            total_output = sum(token.output_tokens for token in valid_tokens)
            
            # Method breakdown
            method_breakdown = {}
            for token in valid_tokens:
                method = token.extraction_method
                if method not in method_breakdown:
                    method_breakdown[method] = {'count': 0, 'tokens': 0}
                method_breakdown[method]['count'] += 1
                method_breakdown[method]['tokens'] += token.total_tokens
            
            return {
                'total_records_found': len(token_data),
                'valid_records': len(valid_tokens),
                'database_updates': updated_count,
                'total_tokens_extracted': total_tokens,
                'total_input_tokens': total_input,
                'total_output_tokens': total_output,
                'extraction_methods': method_breakdown,
                'success': True
            }
            
        except Exception as e:
            self.logger.error(f"Error in historical token extraction: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _update_existing_sessions(self) -> Dict[str, any]:
        """Update existing session records with real token data where available."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get sessions that still use estimated tokens
            cursor.execute("""
                SELECT id, estimated_tokens, real_total_tokens, token_extraction_method
                FROM real_sessions
                WHERE token_extraction_method = 'estimated' OR token_extraction_method IS NULL
            """)
            
            estimated_sessions = cursor.fetchall()
            
            # Try to match with real token data
            updated_sessions = 0
            total_estimated_replaced = 0
            
            for session_id, estimated_tokens, real_tokens, method in estimated_sessions:
                # Check if we have real data for this session
                cursor.execute("""
                    SELECT real_total_tokens, real_input_tokens, real_output_tokens, token_extraction_method
                    FROM real_sessions
                    WHERE id = ? AND real_total_tokens > 0
                """, (session_id,))
                
                real_data = cursor.fetchone()
                if real_data and real_data[0] > 0:
                    # We have real data, update the method
                    cursor.execute("""
                        UPDATE real_sessions
                        SET token_extraction_method = ?, last_token_update = ?
                        WHERE id = ?
                    """, (real_data[3], datetime.now(), session_id))
                    
                    updated_sessions += 1
                    total_estimated_replaced += estimated_tokens or 0
            
            conn.commit()
            conn.close()
            
            return {
                'total_estimated_sessions': len(estimated_sessions),
                'sessions_updated_with_real_data': updated_sessions,
                'estimated_tokens_replaced': total_estimated_replaced,
                'success': True
            }
            
        except Exception as e:
            self.logger.error(f"Error updating existing sessions: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _setup_realtime_tracking(self) -> Dict[str, any]:
        """Set up real-time token tracking."""
        try:
            # Check if tracking is already running
            if self.tracker.is_monitoring:
                return {
                    'status': 'already_running',
                    'message': 'Real-time tracking is already active'
                }
            
            # Start monitoring
            self.tracker.start_monitoring()
            
            # Wait a moment and check status
            import time
            time.sleep(2)
            
            if self.tracker.is_monitoring:
                return {
                    'status': 'started',
                    'message': 'Real-time token tracking started successfully',
                    'monitoring_active': True
                }
            else:
                return {
                    'status': 'failed',
                    'message': 'Failed to start real-time tracking',
                    'monitoring_active': False
                }
                
        except Exception as e:
            self.logger.error(f"Error setting up real-time tracking: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'monitoring_active': False
            }
    
    def _validate_token_accuracy(self) -> Dict[str, any]:
        """Validate the accuracy of token extraction and tracking."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get statistics on different token extraction methods
            cursor.execute("""
                SELECT 
                    token_extraction_method,
                    COUNT(*) as session_count,
                    SUM(real_total_tokens) as total_real_tokens,
                    SUM(estimated_tokens) as total_estimated_tokens,
                    AVG(real_total_tokens) as avg_real_tokens,
                    AVG(estimated_tokens) as avg_estimated_tokens
                FROM real_sessions
                GROUP BY token_extraction_method
            """)
            
            method_stats = cursor.fetchall()
            
            # Calculate accuracy metrics
            validation_results = {
                'method_breakdown': {},
                'overall_accuracy': {},
                'recommendations': []
            }
            
            total_real = 0
            total_estimated = 0
            
            for method, count, real_tokens, est_tokens, avg_real, avg_est in method_stats:
                method_info = {
                    'session_count': count,
                    'total_real_tokens': real_tokens or 0,
                    'total_estimated_tokens': est_tokens or 0,
                    'avg_real_tokens': round(avg_real or 0, 2),
                    'avg_estimated_tokens': round(avg_est or 0, 2)
                }
                
                # Calculate accuracy if both real and estimated data exist
                if real_tokens and est_tokens:
                    accuracy = (1 - abs(real_tokens - est_tokens) / max(real_tokens, est_tokens)) * 100
                    method_info['accuracy_percentage'] = round(accuracy, 2)
                    
                    if accuracy < 80:
                        validation_results['recommendations'].append(
                            f"Low accuracy ({accuracy:.1f}%) for {method} - consider improving estimation"
                        )
                
                validation_results['method_breakdown'][method or 'unknown'] = method_info
                
                total_real += real_tokens or 0
                total_estimated += est_tokens or 0
            
            # Overall accuracy
            if total_real > 0 and total_estimated > 0:
                overall_accuracy = (1 - abs(total_real - total_estimated) / max(total_real, total_estimated)) * 100
                validation_results['overall_accuracy'] = {
                    'total_real_tokens': total_real,
                    'total_estimated_tokens': total_estimated,
                    'accuracy_percentage': round(overall_accuracy, 2),
                    'improvement_ratio': round(total_real / total_estimated, 3) if total_estimated > 0 else 0
                }
            
            conn.close()
            
            validation_results['success'] = True
            return validation_results
            
        except Exception as e:
            self.logger.error(f"Error in token validation: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _generate_recommendations(self, results: Dict[str, any]) -> List[str]:
        """Generate recommendations based on integration results."""
        recommendations = []
        
        # Check extraction results
        extraction = results.get('extraction_results', {})
        if extraction.get('success') and extraction.get('total_tokens_extracted', 0) > 0:
            recommendations.append(
                f"✓ Successfully extracted {extraction['total_tokens_extracted']:,} real tokens from historical data"
            )
        else:
            recommendations.append(
                "⚠️ No historical token data found - consider manual token entry for recent conversations"
            )
        
        # Check real-time tracking
        tracking = results.get('tracking_status', {})
        if tracking.get('monitoring_active'):
            recommendations.append("✓ Real-time token monitoring is active and collecting data")
        else:
            recommendations.append("❌ Set up real-time token monitoring for ongoing accuracy")
        
        # Check validation results
        validation = results.get('validation_results', {})
        if validation.get('success'):
            overall_acc = validation.get('overall_accuracy', {})
            accuracy = overall_acc.get('accuracy_percentage', 0)
            
            if accuracy > 90:
                recommendations.append(f"✓ Excellent token accuracy ({accuracy:.1f}%)")
            elif accuracy > 80:
                recommendations.append(f"⚠️ Good token accuracy ({accuracy:.1f}%) - monitor for improvements")
            else:
                recommendations.append(f"❌ Low token accuracy ({accuracy:.1f}%) - implement better tracking")
        
        # Rate limiting recommendations
        total_tokens = extraction.get('total_tokens_extracted', 0)
        if total_tokens > 500000:  # High usage
            recommendations.append(
                f"📊 High token usage detected ({total_tokens:,} tokens) - "
                "implement rate limiting strategies for August 28"
            )
        
        # Data quality recommendations
        valid_ratio = extraction.get('valid_records', 0) / max(extraction.get('total_records_found', 1), 1)
        if valid_ratio < 0.8:
            recommendations.append(
                f"🔍 Data quality concern: only {valid_ratio*100:.1f}% of extracted records were valid"
            )
        
        return recommendations
    
    def get_integration_status(self) -> Dict[str, any]:
        """Get current status of token integration."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get token method distribution
            cursor.execute("""
                SELECT 
                    token_extraction_method,
                    COUNT(*) as count,
                    SUM(real_total_tokens) as total_tokens
                FROM real_sessions
                GROUP BY token_extraction_method
            """)
            
            method_dist = {}
            for method, count, tokens in cursor.fetchall():
                method_dist[method or 'unknown'] = {
                    'sessions': count,
                    'total_tokens': tokens or 0
                }
            
            # Get recent activity
            cursor.execute("""
                SELECT COUNT(*) FROM real_sessions
                WHERE last_token_update > datetime('now', '-24 hours')
                AND token_extraction_method != 'estimated'
            """)
            recent_updates = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'method_distribution': method_dist,
                'recent_updates_24h': recent_updates,
                'monitoring_active': self.tracker.is_monitoring if hasattr(self.tracker, 'is_monitoring') else False,
                'last_check': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error getting integration status: {e}")
            return {'error': str(e)}
    
    def create_migration_report(self) -> str:
        """Create a detailed migration report."""
        results = self.run_full_integration()
        status = self.get_integration_status()
        
        report_lines = [
            "# Claude Token Migration Report",
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Extraction Results",
        ]
        
        extraction = results.get('extraction_results', {})
        if extraction.get('success'):
            report_lines.extend([
                f"- Total records found: {extraction.get('total_records_found', 0)}",
                f"- Valid records: {extraction.get('valid_records', 0)}",
                f"- Database updates: {extraction.get('database_updates', 0)}",
                f"- Total tokens extracted: {extraction.get('total_tokens_extracted', 0):,}",
                f"- Input tokens: {extraction.get('total_input_tokens', 0):,}",
                f"- Output tokens: {extraction.get('total_output_tokens', 0):,}",
                ""
            ])
            
            methods = extraction.get('extraction_methods', {})
            if methods:
                report_lines.append("### Extraction Methods")
                for method, data in methods.items():
                    report_lines.append(f"- {method}: {data['count']} records, {data['tokens']:,} tokens")
                report_lines.append("")
        
        # Add tracking status
        tracking = results.get('tracking_status', {})
        report_lines.extend([
            "## Real-time Tracking",
            f"- Status: {tracking.get('status', 'unknown')}",
            f"- Monitoring active: {tracking.get('monitoring_active', False)}",
            f"- Message: {tracking.get('message', 'N/A')}",
            ""
        ])
        
        # Add validation results
        validation = results.get('validation_results', {})
        if validation.get('success'):
            report_lines.append("## Accuracy Validation")
            overall = validation.get('overall_accuracy', {})
            if overall:
                report_lines.extend([
                    f"- Overall accuracy: {overall.get('accuracy_percentage', 0):.1f}%",
                    f"- Real tokens: {overall.get('total_real_tokens', 0):,}",
                    f"- Estimated tokens: {overall.get('total_estimated_tokens', 0):,}",
                    f"- Improvement ratio: {overall.get('improvement_ratio', 0):.3f}",
                    ""
                ])
        
        # Add recommendations
        recommendations = results.get('recommendations', [])
        if recommendations:
            report_lines.extend(["## Recommendations"] + [f"- {rec}" for rec in recommendations])
        
        return "\n".join(report_lines)


def main():
    """Main function for token integration."""
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Integrate real token data with Claude session tracking')
    parser.add_argument('database', help='Path to the SQLite database')
    parser.add_argument('--full-integration', action='store_true', help='Run full integration process')
    parser.add_argument('--status', action='store_true', help='Show integration status')
    parser.add_argument('--report', action='store_true', help='Generate migration report')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    manager = TokenIntegrationManager(args.database)
    
    if args.full_integration:
        print("Running full token integration...")
        results = manager.run_full_integration()
        print(json.dumps(results, indent=2, default=str))
        
    elif args.status:
        print("Integration status:")
        status = manager.get_integration_status()
        print(json.dumps(status, indent=2, default=str))
        
    elif args.report:
        print(manager.create_migration_report())
        
    else:
        parser.print_help()


if __name__ == "__main__":
    main()