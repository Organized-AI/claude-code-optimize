#!/usr/bin/env python3
"""
Auto-generated migration script for Claude Code Optimizer
Generated at: 2025-08-18T22:22:32.502680
"""

import subprocess
import sys
import time
from pathlib import Path

def run_step(step_name, command):
    """Execute a migration step with error handling"""
    print(f"\n{'='*60}")
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
            print(f"\nMigration failed at step: {step_name}")
            print("Run rollback: python migrations/rollback_procedures.py")
            sys.exit(1)
    
    print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    main()
