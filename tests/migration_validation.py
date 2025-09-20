#!/usr/bin/env python3
"""
Comprehensive Migration Validation Tests
Validates data integrity after migration from SQLite to Supabase
"""

import os
import sys
import sqlite3
import json
import logging
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib

class MigrationValidator:
    """Validates migration integrity and data consistency"""
    
    def __init__(self, sqlite_path: Path, supabase_config: Dict):
        self.sqlite_path = sqlite_path
        self.supabase_config = supabase_config
        self.setup_logging()
        
        # Validation results
        self.validation_results = {
            "timestamp": datetime.now().isoformat(),
            "overall_success": True,
            "table_validations": {},
            "data_integrity_checks": {},
            "performance_metrics": {},
            "warnings": [],
            "errors": []
        }
    
    def setup_logging(self):
        """Setup validation logging"""
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger('MigrationValidator')
    
    async def validate_complete_migration(self) -> Dict:
        """Run complete migration validation suite"""
        self.logger.info("Starting comprehensive migration validation")
        
        try:
            # Connect to databases
            sqlite_conn = sqlite3.connect(self.sqlite_path)
            sqlite_conn.row_factory = sqlite3.Row
            
            supabase_conn = psycopg2.connect(
                host=self.supabase_config["host"],
                database=self.supabase_config["database"],
                user=self.supabase_config["user"],
                password=self.supabase_config["password"]
            )
            
            # Run validation tests
            await self._validate_table_structures(sqlite_conn, supabase_conn)
            await self._validate_data_counts(sqlite_conn, supabase_conn)
            await self._validate_data_integrity(sqlite_conn, supabase_conn)
            await self._validate_relationships(supabase_conn)
            await self._validate_performance(supabase_conn)
            await self._validate_business_rules(supabase_conn)
            
            # Cleanup connections
            sqlite_conn.close()
            supabase_conn.close()
            
            # Generate final report
            self._generate_validation_report()
            
            return self.validation_results
            
        except Exception as e:
            self.logger.error(f"Migration validation failed: {e}")
            self.validation_results["overall_success"] = False
            self.validation_results["errors"].append(str(e))
            return self.validation_results
    
    async def _validate_table_structures(self, sqlite_conn, supabase_conn):
        """Validate table structures exist and are correct"""
        self.logger.info("Validating table structures...")
        
        expected_tables = [
            "sessions", "five_hour_blocks", "message_breakdown",
            "tool_usage", "cost_breakdown", "sync_status"
        ]
        
        validation = {"success": True, "details": {}}
        
        for table in expected_tables:
            try:
                # Check table exists in Supabase
                with supabase_conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = %s
                    """, (table,))
                    
                    columns = cursor.fetchall()
                    if not columns:
                        validation["success"] = False
                        validation["details"][table] = "Table not found in Supabase"
                    else:
                        validation["details"][table] = {
                            "exists": True,
                            "column_count": len(columns),
                            "columns": [{"name": col[0], "type": col[1]} for col in columns]
                        }
                        
            except Exception as e:
                validation["success"] = False
                validation["details"][table] = f"Error checking table: {e}"
        
        self.validation_results["table_validations"]["structure"] = validation
    
    async def _validate_data_counts(self, sqlite_conn, supabase_conn):
        """Validate record counts match between databases"""
        self.logger.info("Validating data counts...")
        
        validation = {"success": True, "details": {}}
        
        # Tables that should have data migrated
        migrated_tables = ["sessions", "five_hour_blocks", "message_breakdown", "tool_usage", "cost_breakdown"]
        
        for table in migrated_tables:
            try:
                # Count records in SQLite
                sqlite_cursor = sqlite_conn.cursor()
                
                # Check if table exists in SQLite
                sqlite_cursor.execute("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name=?
                """, (table,))
                
                if not sqlite_cursor.fetchone():
                    validation["details"][table] = {
                        "sqlite_exists": False,
                        "sqlite_count": 0,
                        "supabase_count": 0,
                        "match": True,
                        "note": "Table doesn't exist in SQLite"
                    }
                    continue
                
                sqlite_cursor.execute(f"SELECT COUNT(*) FROM {table}")
                sqlite_count = sqlite_cursor.fetchone()[0]
                
                # Count records in Supabase
                with supabase_conn.cursor() as pg_cursor:
                    pg_cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    supabase_count = pg_cursor.fetchone()[0]
                
                matches = sqlite_count == supabase_count
                if not matches:
                    validation["success"] = False
                
                validation["details"][table] = {
                    "sqlite_exists": True,
                    "sqlite_count": sqlite_count,
                    "supabase_count": supabase_count,
                    "match": matches,
                    "difference": supabase_count - sqlite_count
                }
                
            except Exception as e:
                validation["success"] = False
                validation["details"][table] = f"Error counting records: {e}"
        
        self.validation_results["table_validations"]["counts"] = validation
    
    async def _validate_data_integrity(self, sqlite_conn, supabase_conn):
        """Validate data integrity and content accuracy"""
        self.logger.info("Validating data integrity...")
        
        validation = {"success": True, "details": {}}
        
        # Sample data validation for sessions table
        try:
            # Get sample of sessions from both databases
            sqlite_cursor = sqlite_conn.cursor()
            
            # Check if sessions table exists
            sqlite_cursor.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='sessions'
            """)
            
            if sqlite_cursor.fetchone():
                sqlite_cursor.execute("SELECT * FROM sessions LIMIT 10")
                sqlite_sessions = [dict(row) for row in sqlite_cursor.fetchall()]
                
                with supabase_conn.cursor(cursor_factory=RealDictCursor) as pg_cursor:
                    pg_cursor.execute("SELECT * FROM sessions LIMIT 10")
                    supabase_sessions = [dict(row) for row in pg_cursor.fetchall()]
                
                # Compare sample data
                validation["details"]["sessions_sample"] = {
                    "sqlite_sample_size": len(sqlite_sessions),
                    "supabase_sample_size": len(supabase_sessions),
                    "data_comparison": self._compare_sample_data(sqlite_sessions, supabase_sessions)
                }
            else:
                validation["details"]["sessions_sample"] = {
                    "note": "Sessions table not found in SQLite",
                    "supabase_sample_size": 0
                }
                
        except Exception as e:
            validation["success"] = False
            validation["details"]["sessions_sample"] = f"Error validating sample data: {e}"
        
        self.validation_results["data_integrity_checks"]["sample_validation"] = validation
    
    def _compare_sample_data(self, sqlite_data: List[Dict], supabase_data: List[Dict]) -> Dict:
        """Compare sample data between databases"""
        if not sqlite_data:
            return {"note": "No SQLite data to compare"}
        
        # Create lookup by ID
        sqlite_by_id = {row.get('id'): row for row in sqlite_data}
        supabase_by_id = {row.get('id'): row for row in supabase_data}
        
        matching_ids = set(sqlite_by_id.keys()) & set(supabase_by_id.keys())
        
        comparison = {
            "total_sqlite_records": len(sqlite_data),
            "total_supabase_records": len(supabase_data),
            "matching_ids": len(matching_ids),
            "field_comparisons": {}
        }
        
        # Compare matching records
        for record_id in list(matching_ids)[:5]:  # Compare first 5 matching records
            sqlite_record = sqlite_by_id[record_id]
            supabase_record = supabase_by_id[record_id]
            
            field_matches = {}
            for field in sqlite_record.keys():
                if field in supabase_record:
                    sqlite_val = sqlite_record[field]
                    supabase_val = supabase_record[field]
                    
                    # Handle JSON fields
                    if isinstance(supabase_val, (dict, list)):
                        try:
                            sqlite_val = json.loads(sqlite_val) if isinstance(sqlite_val, str) else sqlite_val
                        except:
                            pass
                    
                    field_matches[field] = sqlite_val == supabase_val
            
            comparison["field_comparisons"][record_id] = field_matches
        
        return comparison
    
    async def _validate_relationships(self, supabase_conn):
        """Validate foreign key relationships and constraints"""
        self.logger.info("Validating relationships...")
        
        validation = {"success": True, "details": {}}
        
        relationship_checks = [
            {
                "name": "sessions_to_five_hour_blocks",
                "query": """
                    SELECT COUNT(*) as orphaned_sessions
                    FROM sessions s
                    LEFT JOIN five_hour_blocks fb ON s.five_hour_block_id = fb.id
                    WHERE s.five_hour_block_id IS NOT NULL AND fb.id IS NULL
                """,
                "expected": 0
            },
            {
                "name": "message_breakdown_to_sessions",
                "query": """
                    SELECT COUNT(*) as orphaned_messages
                    FROM message_breakdown mb
                    LEFT JOIN sessions s ON mb.session_id = s.id
                    WHERE s.id IS NULL
                """,
                "expected": 0
            },
            {
                "name": "tool_usage_to_sessions", 
                "query": """
                    SELECT COUNT(*) as orphaned_tools
                    FROM tool_usage tu
                    LEFT JOIN sessions s ON tu.session_id = s.id
                    WHERE s.id IS NULL
                """,
                "expected": 0
            }
        ]
        
        for check in relationship_checks:
            try:
                with supabase_conn.cursor() as cursor:
                    cursor.execute(check["query"])
                    result = cursor.fetchone()[0]
                    
                    success = result == check["expected"]
                    if not success:
                        validation["success"] = False
                    
                    validation["details"][check["name"]] = {
                        "result": result,
                        "expected": check["expected"],
                        "success": success
                    }
                    
            except Exception as e:
                validation["success"] = False
                validation["details"][check["name"]] = f"Error: {e}"
        
        self.validation_results["data_integrity_checks"]["relationships"] = validation
    
    async def _validate_performance(self, supabase_conn):
        """Validate database performance after migration"""
        self.logger.info("Validating performance...")
        
        performance = {"query_times": {}, "index_usage": {}}
        
        # Test query performance
        test_queries = [
            ("active_sessions", "SELECT * FROM sessions WHERE is_active = true"),
            ("recent_sessions", "SELECT * FROM sessions ORDER BY start_time DESC LIMIT 50"),
            ("daily_summary", "SELECT COUNT(*), SUM(real_total_tokens) FROM sessions WHERE start_time >= CURRENT_DATE")
        ]
        
        for query_name, query in test_queries:
            try:
                import time
                start_time = time.time()
                
                with supabase_conn.cursor() as cursor:
                    cursor.execute(query)
                    cursor.fetchall()
                
                execution_time = (time.time() - start_time) * 1000
                performance["query_times"][query_name] = {
                    "execution_time_ms": execution_time,
                    "performance_grade": "excellent" if execution_time < 100 else 
                                       "good" if execution_time < 500 else 
                                       "poor"
                }
                
            except Exception as e:
                performance["query_times"][query_name] = f"Error: {e}"
        
        self.validation_results["performance_metrics"] = performance
    
    async def _validate_business_rules(self, supabase_conn):
        """Validate business logic and data consistency rules"""
        self.logger.info("Validating business rules...")
        
        validation = {"success": True, "rules": {}}
        
        business_rules = [
            {
                "name": "no_negative_tokens",
                "query": """
                    SELECT COUNT(*) FROM sessions 
                    WHERE real_total_tokens < 0 OR estimated_tokens < 0
                """,
                "expected": 0,
                "description": "No sessions should have negative token counts"
            },
            {
                "name": "no_negative_costs",
                "query": """
                    SELECT COUNT(*) FROM sessions 
                    WHERE real_cost < 0 OR estimated_cost < 0
                """,
                "expected": 0,
                "description": "No sessions should have negative costs"
            },
            {
                "name": "active_sessions_no_end_time",
                "query": """
                    SELECT COUNT(*) FROM sessions 
                    WHERE is_active = true AND end_time IS NOT NULL
                """,
                "expected": 0,
                "description": "Active sessions should not have end times"
            },
            {
                "name": "ended_sessions_have_end_time",
                "query": """
                    SELECT COUNT(*) FROM sessions 
                    WHERE is_active = false AND end_time IS NULL AND start_time < NOW() - INTERVAL '1 hour'
                """,
                "expected": 0,
                "description": "Non-active sessions older than 1 hour should have end times"
            }
        ]
        
        for rule in business_rules:
            try:
                with supabase_conn.cursor() as cursor:
                    cursor.execute(rule["query"])
                    result = cursor.fetchone()[0]
                    
                    success = result == rule["expected"]
                    if not success:
                        validation["success"] = False
                        self.validation_results["warnings"].append(
                            f"Business rule violation: {rule['description']} - Found {result} violations"
                        )
                    
                    validation["rules"][rule["name"]] = {
                        "description": rule["description"],
                        "result": result,
                        "expected": rule["expected"],
                        "success": success
                    }
                    
            except Exception as e:
                validation["success"] = False
                validation["rules"][rule["name"]] = f"Error: {e}"
        
        self.validation_results["data_integrity_checks"]["business_rules"] = validation
    
    def _generate_validation_report(self):
        """Generate final validation report"""
        # Count successes and failures
        total_checks = 0
        successful_checks = 0
        
        for category, checks in self.validation_results.items():
            if isinstance(checks, dict) and "success" in checks:
                total_checks += 1
                if checks["success"]:
                    successful_checks += 1
        
        # Overall success rate
        success_rate = (successful_checks / total_checks * 100) if total_checks > 0 else 0
        
        # Determine overall success
        self.validation_results["overall_success"] = (
            success_rate >= 90 and 
            len(self.validation_results["errors"]) == 0
        )
        
        self.validation_results["summary"] = {
            "total_checks": total_checks,
            "successful_checks": successful_checks,
            "success_rate_percent": success_rate,
            "total_warnings": len(self.validation_results["warnings"]),
            "total_errors": len(self.validation_results["errors"])
        }
        
        # Log summary
        if self.validation_results["overall_success"]:
            self.logger.info(f"✅ Migration validation PASSED ({success_rate:.1f}% success rate)")
        else:
            self.logger.error(f"❌ Migration validation FAILED ({success_rate:.1f}% success rate)")
    
    def save_validation_report(self, output_path: Optional[Path] = None) -> Path:
        """Save validation report to file"""
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = Path(f"migration_validation_report_{timestamp}.json")
        
        with open(output_path, 'w') as f:
            json.dump(self.validation_results, f, indent=2, default=str)
        
        self.logger.info(f"Validation report saved: {output_path}")
        return output_path

async def main():
    """Main validation execution"""
    project_root = Path(__file__).parent.parent
    sqlite_path = project_root / "claude_usage.db"
    
    supabase_config = {
        "host": os.getenv("SUPABASE_HOST", "localhost"),
        "database": "postgres",
        "user": "postgres", 
        "password": os.getenv("SUPABASE_PASSWORD", "")
    }
    
    validator = MigrationValidator(sqlite_path, supabase_config)
    
    try:
        results = await validator.validate_complete_migration()
        
        # Save report
        report_path = validator.save_validation_report()
        
        # Print summary
        summary = results.get("summary", {})
        if results["overall_success"]:
            print("✅ Migration validation PASSED!")
        else:
            print("❌ Migration validation FAILED!")
        
        print(f"📊 Summary:")
        print(f"   Checks: {summary.get('successful_checks', 0)}/{summary.get('total_checks', 0)}")
        print(f"   Success rate: {summary.get('success_rate_percent', 0):.1f}%")
        print(f"   Warnings: {summary.get('total_warnings', 0)}")
        print(f"   Errors: {summary.get('total_errors', 0)}")
        print(f"📋 Report: {report_path}")
        
        # Exit with error code if validation failed
        if not results["overall_success"]:
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())