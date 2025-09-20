#!/usr/bin/env python3
"""
Schema Migration Plan for Claude Code Optimizer
Migrates from complex multi-database system to simplified Supabase-primary architecture
"""

import os
import sys
import sqlite3
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import asyncio
from dataclasses import dataclass
import hashlib

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@dataclass
class MigrationStep:
    """Represents a single migration step"""
    name: str
    description: str
    source: str
    target: str
    status: str = "pending"
    error: Optional[str] = None
    records_migrated: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class SchemaMigrationPlan:
    """Orchestrates the migration from current system to simplified architecture"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.setup_logging()
        self.migration_steps: List[MigrationStep] = []
        self.backup_dir = project_root / "migrations" / "backups" / datetime.now().strftime("%Y%m%d_%H%M%S")
        self.sqlite_db_path = project_root / "claude_usage.db"
        self.analytics_db_path = project_root / "claude_analytics.db"
        
    def setup_logging(self):
        """Configure migration logging"""
        log_dir = self.project_root / "logs"
        log_dir.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / 'migration.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('SchemaMigration')
        
    def analyze_current_system(self) -> Dict:
        """Analyze current database structure and data volumes"""
        self.logger.info("Analyzing current system...")
        
        analysis = {
            "databases": {},
            "files": {},
            "issues": [],
            "recommendations": []
        }
        
        # Analyze main SQLite database
        if self.sqlite_db_path.exists():
            with sqlite3.connect(self.sqlite_db_path) as conn:
                cursor = conn.cursor()
                
                # Get table info
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                
                for table_name in tables:
                    table_name = table_name[0]
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    
                    cursor.execute(f"PRAGMA table_info({table_name})")
                    columns = cursor.fetchall()
                    
                    analysis["databases"][table_name] = {
                        "record_count": count,
                        "columns": len(columns),
                        "size_estimate": count * len(columns) * 100  # Rough estimate
                    }
        
        # Check for other data files
        data_patterns = ["*.json", "*.jsonl", "*.log", "*.db"]
        for pattern in data_patterns:
            files = list(self.project_root.rglob(pattern))
            analysis["files"][pattern] = {
                "count": len(files),
                "total_size": sum(f.stat().st_size for f in files if f.exists())
            }
        
        # Identify issues
        if "real_sessions" not in analysis["databases"]:
            analysis["issues"].append("Missing 'real_sessions' table referenced in monitoring scripts")
        
        if analysis["files"].get("*.jsonl", {}).get("count", 0) > 100:
            analysis["issues"].append("Large number of JSONL files may impact performance")
            
        # Recommendations
        analysis["recommendations"] = [
            "Consolidate multiple databases into Supabase",
            "Archive old JSONL files after processing",
            "Implement proper error handling for missing tables",
            "Add data validation before migration"
        ]
        
        return analysis
    
    def create_migration_plan(self) -> List[MigrationStep]:
        """Create detailed migration steps"""
        self.logger.info("Creating migration plan...")
        
        steps = [
            # Phase 1: Preparation
            MigrationStep(
                name="backup_current_data",
                description="Create complete backup of current system",
                source="all_databases",
                target="backup_directory"
            ),
            MigrationStep(
                name="validate_schemas",
                description="Validate source and target schemas compatibility",
                source="sqlite_schema",
                target="supabase_schema"
            ),
            
            # Phase 2: Core Tables Migration
            MigrationStep(
                name="migrate_five_hour_blocks",
                description="Migrate five_hour_blocks table to Supabase",
                source="sqlite.five_hour_blocks",
                target="supabase.five_hour_blocks"
            ),
            MigrationStep(
                name="migrate_sessions",
                description="Migrate sessions table with data transformation",
                source="sqlite.sessions",
                target="supabase.sessions"
            ),
            MigrationStep(
                name="migrate_message_breakdown",
                description="Migrate message breakdown with deduplication",
                source="sqlite.message_breakdown",
                target="supabase.message_breakdown"
            ),
            
            # Phase 3: Analytics Tables
            MigrationStep(
                name="migrate_cost_breakdown",
                description="Migrate cost breakdown data",
                source="sqlite.cost_breakdown",
                target="supabase.cost_breakdown"
            ),
            MigrationStep(
                name="migrate_tool_usage",
                description="Migrate tool usage statistics",
                source="sqlite.tool_usage",
                target="supabase.tool_usage"
            ),
            
            # Phase 4: Create Analytics Cache
            MigrationStep(
                name="setup_analytics_cache",
                description="Initialize local analytics SQLite cache",
                source="supabase_aggregates",
                target="sqlite_analytics"
            ),
            
            # Phase 5: Data Validation
            MigrationStep(
                name="validate_migration",
                description="Validate data integrity after migration",
                source="supabase",
                target="validation_report"
            ),
            
            # Phase 6: Cleanup
            MigrationStep(
                name="archive_old_files",
                description="Archive processed JSONL and log files",
                source="old_files",
                target="archive"
            )
        ]
        
        self.migration_steps = steps
        return steps
    
    def estimate_migration_time(self, analysis: Dict) -> Dict:
        """Estimate time required for migration"""
        total_records = sum(
            table_info.get("record_count", 0) 
            for table_info in analysis.get("databases", {}).values()
        )
        
        # Assume 1000 records per second processing speed
        estimated_seconds = total_records / 1000
        
        return {
            "total_records": total_records,
            "estimated_duration_seconds": estimated_seconds,
            "estimated_duration_human": f"{estimated_seconds / 60:.1f} minutes",
            "recommended_maintenance_window": "2 hours"
        }
    
    def generate_rollback_plan(self) -> Dict:
        """Generate rollback procedures for each step"""
        rollback_plan = {}
        
        for step in self.migration_steps:
            rollback_plan[step.name] = {
                "description": f"Rollback {step.description}",
                "actions": self._get_rollback_actions(step),
                "verification": self._get_rollback_verification(step)
            }
        
        return rollback_plan
    
    def _get_rollback_actions(self, step: MigrationStep) -> List[str]:
        """Get rollback actions for a specific step"""
        if step.name == "backup_current_data":
            return ["No rollback needed - backup is read-only"]
        elif step.name.startswith("migrate_"):
            return [
                f"DROP TABLE IF EXISTS {step.target}",
                f"Restore from backup: {step.source}",
                "Update sync_status to mark rollback"
            ]
        elif step.name == "archive_old_files":
            return ["Restore files from archive directory"]
        else:
            return ["Revert configuration changes", "Clear cache"]
    
    def _get_rollback_verification(self, step: MigrationStep) -> List[str]:
        """Get verification steps for rollback"""
        return [
            f"Verify {step.source} is accessible",
            f"Check record counts match pre-migration",
            f"Validate application functionality"
        ]
    
    def create_pre_migration_checklist(self) -> List[Dict]:
        """Create checklist for pre-migration validation"""
        return [
            {
                "task": "Backup all databases",
                "command": "python migrations/backup_current_system.py",
                "critical": True
            },
            {
                "task": "Stop all monitoring services",
                "command": "pkill -f 'claude-code-session-monitor.py'",
                "critical": True
            },
            {
                "task": "Verify Supabase connection",
                "command": "python migrations/test_supabase_connection.py",
                "critical": True
            },
            {
                "task": "Check disk space",
                "command": "df -h",
                "critical": True
            },
            {
                "task": "Notify team of maintenance",
                "command": "echo 'Migration starting' | cco-notify",
                "critical": False
            }
        ]
    
    def create_post_migration_checklist(self) -> List[Dict]:
        """Create checklist for post-migration validation"""
        return [
            {
                "task": "Verify data integrity",
                "command": "python tests/migration_validation.py",
                "critical": True
            },
            {
                "task": "Test session detection",
                "command": "python src/detection/test_detection.py",
                "critical": True
            },
            {
                "task": "Verify dashboard connectivity",
                "command": "curl http://localhost:3003/api/health",
                "critical": True
            },
            {
                "task": "Check performance metrics",
                "command": "python tests/performance_benchmarks.py",
                "critical": False
            },
            {
                "task": "Start monitoring services",
                "command": "python start_smart_monitoring.sh",
                "critical": True
            }
        ]
    
    def export_migration_plan(self, output_path: Optional[Path] = None) -> Path:
        """Export complete migration plan to JSON"""
        if not output_path:
            output_path = self.project_root / "migrations" / "migration_plan.json"
        
        analysis = self.analyze_current_system()
        
        plan = {
            "generated_at": datetime.now().isoformat(),
            "system_analysis": analysis,
            "migration_steps": [
                {
                    "name": step.name,
                    "description": step.description,
                    "source": step.source,
                    "target": step.target
                }
                for step in self.create_migration_plan()
            ],
            "time_estimate": self.estimate_migration_time(analysis),
            "rollback_plan": self.generate_rollback_plan(),
            "pre_migration_checklist": self.create_pre_migration_checklist(),
            "post_migration_checklist": self.create_post_migration_checklist(),
            "risk_assessment": {
                "risk_level": "medium",
                "main_risks": [
                    "Data loss if backup fails",
                    "Service downtime during migration",
                    "Performance degradation if indexes not created"
                ],
                "mitigation_strategies": [
                    "Verify backups before proceeding",
                    "Run migration during low-usage hours",
                    "Test on staging environment first"
                ]
            }
        }
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(plan, f, indent=2)
        
        self.logger.info(f"Migration plan exported to {output_path}")
        return output_path
    
    def generate_migration_script(self) -> Path:
        """Generate executable migration script"""
        script_path = self.project_root / "migrations" / "execute_migration.py"
        
        script_content = '''#!/usr/bin/env python3
"""
Auto-generated migration script for Claude Code Optimizer
Generated at: {timestamp}
"""

import subprocess
import sys
import time
from pathlib import Path

def run_step(step_name, command):
    """Execute a migration step with error handling"""
    print(f"\\n{'='*60}")
    print(f"Executing: {step_name}")
    print(f"Command: {command}")
    print(f"{'='*60}")
    
    start_time = time.time()
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    
    duration = time.time() - start_time
    
    if result.returncode == 0:
        print(f"✅ Success ({duration:.1f}s)")
        return True
    else:
        print(f"❌ Failed: {result.stderr}")
        return False

def main():
    """Execute migration plan"""
    print("Starting Claude Code Optimizer Migration")
    
    steps = [
        ("Backup Current System", "python migrations/backup_current_system.py"),
        ("Stop Services", "pkill -f 'claude-code-session-monitor.py' || true"),
        ("Migrate to Supabase", "python migrations/migrate_sqlite_to_supabase.py"),
        ("Setup Analytics Cache", "python migrations/setup_analytics_cache.py"),
        ("Validate Migration", "python tests/migration_validation.py"),
        ("Cleanup Legacy Files", "python migrations/cleanup_legacy_files.py"),
        ("Start New Services", "python start_smart_monitoring.sh")
    ]
    
    for step_name, command in steps:
        if not run_step(step_name, command):
            print(f"\\nMigration failed at step: {step_name}")
            print("Run rollback: python migrations/rollback_procedures.py")
            sys.exit(1)
    
    print("\\n✅ Migration completed successfully!")

if __name__ == "__main__":
    main()
'''.replace("{timestamp}", datetime.now().isoformat())
        
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        script_path.chmod(0o755)  # Make executable
        self.logger.info(f"Migration script generated at {script_path}")
        return script_path


def main():
    """Generate complete migration plan"""
    project_root = Path(__file__).parent.parent
    planner = SchemaMigrationPlan(project_root)
    
    # Generate and export plan
    plan_path = planner.export_migration_plan()
    script_path = planner.generate_migration_script()
    
    print(f"\n✅ Migration plan created successfully!")
    print(f"📋 Plan: {plan_path}")
    print(f"🚀 Script: {script_path}")
    print(f"\nNext steps:")
    print(f"1. Review the migration plan: cat {plan_path}")
    print(f"2. Run pre-migration checklist")
    print(f"3. Execute migration: python {script_path}")


if __name__ == "__main__":
    main()