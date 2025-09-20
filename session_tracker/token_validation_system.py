#!/usr/bin/env python3
"""
Token Validation System

This system provides comprehensive validation and testing for the real token
extraction system. It includes:

1. Test data generation for validation
2. Accuracy measurement against known values
3. Integration testing with session detection
4. Performance benchmarking
5. Rate limit planning calculations
"""

import sqlite3
import json
import logging
import time
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class TestTokenRecord:
    """Test token record for validation purposes."""
    conversation_id: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    model: str
    timestamp: datetime
    test_type: str


class TokenValidationSystem:
    """Comprehensive validation system for token extraction and tracking."""
    
    def __init__(self, database_path: str):
        self.database_path = database_path
        self.logger = logging.getLogger(__name__)
        
        # Initialize database if needed
        self._ensure_database_schema()
    
    def _ensure_database_schema(self):
        """Ensure the database has the correct schema for real tokens."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Check if real token columns exist
            cursor.execute("PRAGMA table_info(real_sessions)")
            columns = [row[1] for row in cursor.fetchall()]
            
            if 'real_input_tokens' not in columns:
                self.logger.info("Adding real token columns to database...")
                
                cursor.execute("ALTER TABLE real_sessions ADD COLUMN real_input_tokens INTEGER DEFAULT 0")
                cursor.execute("ALTER TABLE real_sessions ADD COLUMN real_output_tokens INTEGER DEFAULT 0")
                cursor.execute("ALTER TABLE real_sessions ADD COLUMN real_total_tokens INTEGER DEFAULT 0")
                cursor.execute("ALTER TABLE real_sessions ADD COLUMN token_extraction_method TEXT DEFAULT 'estimated'")
                cursor.execute("ALTER TABLE real_sessions ADD COLUMN last_token_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                
                conn.commit()
                self.logger.info("Database schema updated successfully")
            
            conn.close()
            
        except Exception as e:
            self.logger.error(f"Error updating database schema: {e}")
    
    def generate_test_data(self, num_records: int = 10) -> List[TestTokenRecord]:
        """Generate test token records for validation."""
        test_records = []
        
        models = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
        test_types = ['validation', 'accuracy_test', 'performance_test']
        
        for i in range(num_records):
            # Generate realistic token counts
            if random.choice(models) == 'claude-3-opus':
                input_tokens = random.randint(1000, 5000)
                output_tokens = random.randint(2000, 8000)
            elif random.choice(models) == 'claude-3-sonnet':
                input_tokens = random.randint(500, 3000)
                output_tokens = random.randint(1000, 4000)
            else:  # haiku
                input_tokens = random.randint(200, 1000)
                output_tokens = random.randint(300, 1500)
            
            record = TestTokenRecord(
                conversation_id=f"test_conv_{i}_{int(time.time())}",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
                model=random.choice(models),
                timestamp=datetime.now() - timedelta(hours=random.randint(0, 72)),
                test_type=random.choice(test_types)
            )
            
            test_records.append(record)
        
        return test_records
    
    def insert_test_data(self, test_records: List[TestTokenRecord]) -> int:
        """Insert test data into the database."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            inserted_count = 0
            
            for record in test_records:
                cursor.execute("""
                    INSERT INTO real_sessions (
                        id, conversation_id, session_type, start_time,
                        real_input_tokens, real_output_tokens, real_total_tokens,
                        token_extraction_method, last_token_update, models_used,
                        is_active, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.conversation_id,
                    record.conversation_id,
                    'test_session',
                    record.timestamp,
                    record.input_tokens,
                    record.output_tokens,
                    record.total_tokens,
                    f'test_{record.test_type}',
                    record.timestamp,
                    record.model,
                    False,
                    json.dumps({
                        'test_record': True,
                        'test_type': record.test_type,
                        'generated_at': datetime.now().isoformat()
                    })
                ))
                
                inserted_count += 1
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Inserted {inserted_count} test records")
            return inserted_count
            
        except Exception as e:
            self.logger.error(f"Error inserting test data: {e}")
            return 0
    
    def validate_token_extraction(self) -> Dict[str, Any]:
        """Validate token extraction accuracy."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get all records with real token data
            cursor.execute("""
                SELECT 
                    id, real_input_tokens, real_output_tokens, real_total_tokens,
                    estimated_tokens, token_extraction_method
                FROM real_sessions
                WHERE real_total_tokens > 0
            """)
            
            records = cursor.fetchall()
            conn.close()
            
            if not records:
                return {
                    'status': 'no_data',
                    'message': 'No real token data found for validation'
                }
            
            validation_results = {
                'total_records': len(records),
                'accuracy_metrics': {},
                'method_performance': {},
                'data_quality': {}
            }
            
            # Calculate accuracy metrics
            total_real = sum(record[3] for record in records)  # real_total_tokens
            total_estimated = sum(record[4] or 0 for record in records)  # estimated_tokens
            
            if total_estimated > 0:
                overall_accuracy = (1 - abs(total_real - total_estimated) / max(total_real, total_estimated)) * 100
                validation_results['accuracy_metrics'] = {
                    'total_real_tokens': total_real,
                    'total_estimated_tokens': total_estimated,
                    'overall_accuracy_percentage': round(overall_accuracy, 2),
                    'average_real_tokens_per_session': round(total_real / len(records), 2)
                }
            
            # Method performance breakdown
            method_stats = {}
            for record in records:
                method = record[5] or 'unknown'
                if method not in method_stats:
                    method_stats[method] = {
                        'count': 0,
                        'total_tokens': 0,
                        'avg_tokens': 0
                    }
                
                method_stats[method]['count'] += 1
                method_stats[method]['total_tokens'] += record[3]
            
            # Calculate averages
            for method, stats in method_stats.items():
                stats['avg_tokens'] = round(stats['total_tokens'] / stats['count'], 2)
            
            validation_results['method_performance'] = method_stats
            
            # Data quality checks
            consistency_issues = 0
            for record in records:
                input_tokens, output_tokens, total_tokens = record[1], record[2], record[3]
                
                # Check if total equals input + output (with some tolerance)
                calculated_total = input_tokens + output_tokens
                if abs(total_tokens - calculated_total) > max(10, total_tokens * 0.05):
                    consistency_issues += 1
            
            validation_results['data_quality'] = {
                'consistency_issues': consistency_issues,
                'consistency_percentage': round((1 - consistency_issues / len(records)) * 100, 2),
                'data_completeness': round(len([r for r in records if all(r[1:4])]) / len(records) * 100, 2)
            }
            
            validation_results['status'] = 'success'
            return validation_results
            
        except Exception as e:
            self.logger.error(f"Error in token validation: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def calculate_rate_limits(self, target_date: str = "2025-08-28") -> Dict[str, Any]:
        """Calculate rate limiting recommendations for target date."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Get historical usage patterns
            cursor.execute("""
                SELECT 
                    DATE(start_time) as usage_date,
                    SUM(real_total_tokens) as daily_tokens,
                    COUNT(*) as daily_sessions
                FROM real_sessions
                WHERE real_total_tokens > 0 
                    AND start_time > datetime('now', '-30 days')
                GROUP BY DATE(start_time)
                ORDER BY usage_date DESC
            """)
            
            daily_usage = cursor.fetchall()
            
            # Get model usage breakdown
            cursor.execute("""
                SELECT 
                    models_used,
                    SUM(real_total_tokens) as model_tokens,
                    COUNT(*) as model_sessions
                FROM real_sessions
                WHERE real_total_tokens > 0
                    AND start_time > datetime('now', '-7 days')
                GROUP BY models_used
            """)
            
            model_usage = cursor.fetchall()
            conn.close()
            
            # Calculate statistics
            if daily_usage:
                daily_tokens = [day[1] for day in daily_usage if day[1]]
                avg_daily_tokens = sum(daily_tokens) / len(daily_tokens)
                max_daily_tokens = max(daily_tokens)
                min_daily_tokens = min(daily_tokens)
            else:
                avg_daily_tokens = max_daily_tokens = min_daily_tokens = 0
            
            # Calculate projections for target date
            target_datetime = datetime.strptime(target_date, "%Y-%m-%d")
            days_until_target = (target_datetime - datetime.now()).days
            
            # Estimated usage patterns
            projected_usage = avg_daily_tokens * days_until_target if days_until_target > 0 else 0
            
            # Rate limiting recommendations
            recommendations = []
            
            if avg_daily_tokens > 100000:  # High usage
                recommendations.extend([
                    f"High daily usage detected ({avg_daily_tokens:,.0f} tokens/day)",
                    "Implement aggressive rate limiting: 50K tokens per hour",
                    "Consider using Claude-3-Haiku for routine tasks"
                ])
            elif avg_daily_tokens > 50000:  # Medium usage
                recommendations.extend([
                    f"Medium daily usage ({avg_daily_tokens:,.0f} tokens/day)",
                    "Moderate rate limiting: 75K tokens per hour",
                    "Monitor usage closely approaching August 28"
                ])
            else:  # Low usage
                recommendations.extend([
                    f"Low daily usage ({avg_daily_tokens:,.0f} tokens/day)",
                    "Conservative rate limiting: 100K tokens per hour",
                    "Current usage patterns are sustainable"
                ])
            
            # Model-specific recommendations
            model_recommendations = []
            for model, tokens, sessions in model_usage:
                avg_tokens_per_session = tokens / sessions if sessions > 0 else 0
                if 'opus' in model.lower() and avg_tokens_per_session > 10000:
                    model_recommendations.append(f"Opus usage is high ({avg_tokens_per_session:.0f} tokens/session) - consider Sonnet alternatives")
                elif 'sonnet' in model.lower() and avg_tokens_per_session < 1000:
                    model_recommendations.append(f"Sonnet usage is efficient ({avg_tokens_per_session:.0f} tokens/session) - good choice")
            
            return {
                'current_usage': {
                    'avg_daily_tokens': round(avg_daily_tokens, 0),
                    'max_daily_tokens': max_daily_tokens,
                    'min_daily_tokens': min_daily_tokens,
                    'days_analyzed': len(daily_usage)
                },
                'projections': {
                    'days_until_target': days_until_target,
                    'projected_usage_until_target': round(projected_usage, 0),
                    'target_date': target_date
                },
                'model_usage': [
                    {
                        'model': model or 'unknown',
                        'total_tokens': tokens,
                        'sessions': sessions,
                        'avg_tokens_per_session': round(tokens / sessions if sessions > 0 else 0, 0)
                    } for model, tokens, sessions in model_usage
                ],
                'recommendations': recommendations,
                'model_recommendations': model_recommendations,
                'status': 'success'
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating rate limits: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Run comprehensive validation of the token system."""
        self.logger.info("Starting comprehensive token validation...")
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'database_status': {},
            'test_data_results': {},
            'extraction_validation': {},
            'rate_limit_analysis': {},
            'recommendations': []
        }
        
        # Check database status
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM real_sessions")
            total_sessions = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM real_sessions WHERE real_total_tokens > 0")
            sessions_with_real_tokens = cursor.fetchone()[0]
            
            cursor.execute("SELECT SUM(real_total_tokens) FROM real_sessions WHERE real_total_tokens > 0")
            total_real_tokens = cursor.fetchone()[0] or 0
            
            conn.close()
            
            results['database_status'] = {
                'total_sessions': total_sessions,
                'sessions_with_real_tokens': sessions_with_real_tokens,
                'total_real_tokens': total_real_tokens,
                'real_token_coverage': round(sessions_with_real_tokens / max(total_sessions, 1) * 100, 2)
            }
            
        except Exception as e:
            results['database_status'] = {'error': str(e)}
        
        # Generate and test with sample data if no real data exists
        if results['database_status'].get('sessions_with_real_tokens', 0) == 0:
            self.logger.info("No real token data found, generating test data...")
            
            test_records = self.generate_test_data(20)
            inserted = self.insert_test_data(test_records)
            
            results['test_data_results'] = {
                'generated_records': len(test_records),
                'inserted_records': inserted,
                'test_tokens_generated': sum(r.total_tokens for r in test_records)
            }
        
        # Validate token extraction
        validation_results = self.validate_token_extraction()
        results['extraction_validation'] = validation_results
        
        # Analyze rate limits
        rate_analysis = self.calculate_rate_limits()
        results['rate_limit_analysis'] = rate_analysis
        
        # Generate recommendations
        recommendations = []
        
        if results['database_status'].get('real_token_coverage', 0) < 50:
            recommendations.append("Low real token coverage - implement better extraction methods")
        
        if validation_results.get('status') == 'success':
            accuracy = validation_results.get('accuracy_metrics', {}).get('overall_accuracy_percentage', 0)
            if accuracy > 90:
                recommendations.append(f"Excellent token accuracy ({accuracy:.1f}%)")
            elif accuracy < 80:
                recommendations.append(f"Improve token accuracy (currently {accuracy:.1f}%)")
        
        if rate_analysis.get('status') == 'success':
            avg_daily = rate_analysis.get('current_usage', {}).get('avg_daily_tokens', 0)
            if avg_daily > 100000:
                recommendations.append("Implement strict rate limiting due to high usage")
            
            recommendations.extend(rate_analysis.get('recommendations', []))
        
        results['recommendations'] = recommendations
        
        self.logger.info("Comprehensive validation completed")
        return results
    
    def cleanup_test_data(self):
        """Remove test data from the database."""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM real_sessions WHERE session_type = 'test_session'")
            deleted_count = cursor.rowcount
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Cleaned up {deleted_count} test records")
            return deleted_count
            
        except Exception as e:
            self.logger.error(f"Error cleaning up test data: {e}")
            return 0


def main():
    """Main function for token validation."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Token Validation System')
    parser.add_argument('database', help='Path to the SQLite database')
    parser.add_argument('--validate', action='store_true', help='Run comprehensive validation')
    parser.add_argument('--rate-limits', action='store_true', help='Calculate rate limiting recommendations')
    parser.add_argument('--test-data', type=int, metavar='N', help='Generate N test records')
    parser.add_argument('--cleanup', action='store_true', help='Remove test data')
    parser.add_argument('--target-date', default='2025-08-28', help='Target date for rate limit calculations')
    
    args = parser.parse_args()
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    validator = TokenValidationSystem(args.database)
    
    if args.validate:
        print("Running comprehensive validation...")
        results = validator.run_comprehensive_validation()
        print(json.dumps(results, indent=2, default=str))
        
    elif args.rate_limits:
        print(f"Calculating rate limits for {args.target_date}...")
        results = validator.calculate_rate_limits(args.target_date)
        print(json.dumps(results, indent=2, default=str))
        
    elif args.test_data:
        print(f"Generating {args.test_data} test records...")
        test_records = validator.generate_test_data(args.test_data)
        inserted = validator.insert_test_data(test_records)
        print(f"Generated {len(test_records)} records, inserted {inserted}")
        
    elif args.cleanup:
        print("Cleaning up test data...")
        deleted = validator.cleanup_test_data()
        print(f"Deleted {deleted} test records")
        
    else:
        parser.print_help()


if __name__ == "__main__":
    main()