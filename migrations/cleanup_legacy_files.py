#!/usr/bin/env python3
"""
Cleanup Legacy Files and Obsolete Processes
"""

import os
import sys
import shutil
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict
import subprocess
import signal

class LegacyCleanup:
    """Cleanup legacy files and processes"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.setup_logging()
        
        # Files and directories to clean up
        self.cleanup_patterns = [
            "*.tmp",
            "*.temp", 
            "__pycache__",
            "*.pyc",
            "*.log.old",
            "old_*",
            "backup_*"
        ]
        
        # Legacy processes to stop
        self.legacy_processes = [
            "continuous_monitor.py",
            "old_session_monitor.py",
            "legacy_dashboard.py"
        ]
    
    def setup_logging(self):
        """Setup logging"""
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger('LegacyCleanup')
    
    def cleanup_all(self) -> Dict:
        """Perform complete cleanup"""
        cleanup_stats = {
            "files_removed": 0,
            "directories_removed": 0,
            "processes_stopped": 0,
            "space_freed_mb": 0
        }
        
        try:
            # Stop legacy processes
            cleanup_stats["processes_stopped"] = self._stop_legacy_processes()
            
            # Clean up files
            files_stats = self._cleanup_files()
            cleanup_stats.update(files_stats)
            
            # Clean up old logs
            log_stats = self._cleanup_old_logs()
            cleanup_stats["files_removed"] += log_stats["files_removed"]
            cleanup_stats["space_freed_mb"] += log_stats["space_freed_mb"]
            
            self.logger.info(f"Cleanup completed: {cleanup_stats}")
            return cleanup_stats
            
        except Exception as e:
            self.logger.error(f"Cleanup failed: {e}")
            raise
    
    def _stop_legacy_processes(self) -> int:
        """Stop legacy monitoring processes"""
        stopped_count = 0
        
        for process_name in self.legacy_processes:
            try:
                # Find and kill processes
                result = subprocess.run(
                    ["pgrep", "-f", process_name],
                    capture_output=True, text=True
                )
                
                if result.returncode == 0:
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        if pid:
                            os.kill(int(pid), signal.SIGTERM)
                            stopped_count += 1
                            self.logger.info(f"Stopped process {process_name} (PID: {pid})")
                            
            except Exception as e:
                self.logger.warning(f"Failed to stop {process_name}: {e}")
        
        return stopped_count
    
    def _cleanup_files(self) -> Dict:
        """Clean up temporary and obsolete files"""
        stats = {"files_removed": 0, "directories_removed": 0, "space_freed_mb": 0}
        
        for pattern in self.cleanup_patterns:
            matching_files = list(self.project_root.rglob(pattern))
            
            for file_path in matching_files:
                try:
                    if file_path.is_file():
                        size_mb = file_path.stat().st_size / (1024 * 1024)
                        file_path.unlink()
                        stats["files_removed"] += 1
                        stats["space_freed_mb"] += size_mb
                        
                    elif file_path.is_dir():
                        shutil.rmtree(file_path)
                        stats["directories_removed"] += 1
                        
                except Exception as e:
                    self.logger.warning(f"Failed to remove {file_path}: {e}")
        
        return stats
    
    def _cleanup_old_logs(self, days_old: int = 7) -> Dict:
        """Clean up old log files"""
        stats = {"files_removed": 0, "space_freed_mb": 0}
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        log_dir = self.project_root / "logs"
        if not log_dir.exists():
            return stats
        
        for log_file in log_dir.glob("*.log"):
            try:
                file_time = datetime.fromtimestamp(log_file.stat().st_mtime)
                if file_time < cutoff_date:
                    size_mb = log_file.stat().st_size / (1024 * 1024)
                    log_file.unlink()
                    stats["files_removed"] += 1
                    stats["space_freed_mb"] += size_mb
                    
            except Exception as e:
                self.logger.warning(f"Failed to remove log {log_file}: {e}")
        
        return stats

def main():
    """Main cleanup execution"""
    project_root = Path(__file__).parent.parent
    
    try:
        cleanup = LegacyCleanup(project_root)
        stats = cleanup.cleanup_all()
        
        print(f"✅ Cleanup completed!")
        print(f"📁 Files removed: {stats['files_removed']}")
        print(f"📂 Directories removed: {stats['directories_removed']}")
        print(f"🔄 Processes stopped: {stats['processes_stopped']}")
        print(f"💾 Space freed: {stats['space_freed_mb']:.1f} MB")
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()