#!/usr/bin/env python3
"""
Complete System Backup with Validation
Safe backup of all current Claude Code Optimizer data before migration
"""

import os
import sys
import sqlite3
import json
import shutil
import hashlib
import gzip
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import subprocess
import tarfile
from dataclasses import dataclass, asdict

@dataclass
class BackupManifest:
    """Backup manifest with metadata"""
    backup_id: str
    timestamp: datetime
    source_system: str
    backup_type: str
    files_backed_up: List[Dict]
    databases_backed_up: List[Dict]
    total_size_bytes: int
    validation_hashes: Dict[str, str]
    backup_location: str
    restore_instructions: str

class SystemBackup:
    """Complete system backup manager"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backup_id = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.backup_dir = project_root / "database_backup" / self.backup_id
        self.setup_logging()
        
        # Backup configuration
        self.files_to_backup = [
            "claude_usage.db",
            "claude_usage_backup_*.db",
            "*.json",
            "*.jsonl",
            "*.log",
            "config/*",
            "logs/*",
            "data/*"
        ]
        
        self.exclude_patterns = [
            "__pycache__",
            "*.pyc",
            ".git",
            "node_modules",
            "*.tmp",
            "*.temp"
        ]
        
    def setup_logging(self):
        """Setup backup logging"""
        log_dir = self.project_root / "logs"
        log_dir.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_dir / 'backup.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('SystemBackup')
    
    def create_complete_backup(self) -> BackupManifest:
        """Create complete system backup"""
        self.logger.info(f"Starting complete system backup: {self.backup_id}")
        
        try:
            # Create backup directory
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Backup databases
            databases_backed_up = self._backup_databases()
            
            # Backup files
            files_backed_up = self._backup_files()
            
            # Create validation hashes
            validation_hashes = self._create_validation_hashes()
            
            # Calculate total size
            total_size = self._calculate_backup_size()
            
            # Create manifest
            manifest = BackupManifest(
                backup_id=self.backup_id,
                timestamp=datetime.now(),
                source_system="claude_code_optimizer",
                backup_type="complete_system",
                files_backed_up=files_backed_up,
                databases_backed_up=databases_backed_up,
                total_size_bytes=total_size,
                validation_hashes=validation_hashes,
                backup_location=str(self.backup_dir),
                restore_instructions=self._generate_restore_instructions()
            )
            
            # Save manifest
            self._save_manifest(manifest)
            
            # Create compressed archive
            archive_path = self._create_compressed_archive()
            
            # Verify backup integrity
            self._verify_backup_integrity()
            
            self.logger.info(f"Backup completed successfully: {self.backup_dir}")
            self.logger.info(f"Archive created: {archive_path}")
            self.logger.info(f"Total size: {total_size / (1024*1024):.1f} MB")
            
            return manifest
            
        except Exception as e:
            self.logger.error(f"Backup failed: {e}")
            raise
    
    def _backup_databases(self) -> List[Dict]:
        """Backup all SQLite databases"""
        self.logger.info("Backing up databases...")
        
        databases_backed_up = []
        
        # Find all database files
        db_files = []
        db_files.extend(self.project_root.glob("*.db"))
        db_files.extend(self.project_root.glob("**/*.db"))
        
        for db_file in db_files:
            if db_file.is_file():
                try:
                    backup_info = self._backup_single_database(db_file)
                    databases_backed_up.append(backup_info)
                except Exception as e:
                    self.logger.error(f"Failed to backup database {db_file}: {e}")
        
        return databases_backed_up
    
    def _backup_single_database(self, db_path: Path) -> Dict:
        """Backup a single SQLite database"""
        self.logger.info(f"Backing up database: {db_path}")
        
        # Create backup filename
        backup_filename = f"{db_path.stem}_backup_{self.backup_id}.db"
        backup_path = self.backup_dir / "databases" / backup_filename
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy database file
        shutil.copy2(db_path, backup_path)
        
        # Verify database integrity
        integrity_ok = self._verify_database_integrity(backup_path)
        
        # Get database schema and stats
        schema_info = self._get_database_schema(db_path)
        
        # Calculate file hash
        file_hash = self._calculate_file_hash(backup_path)
        
        backup_info = {
            "original_path": str(db_path),
            "backup_path": str(backup_path),
            "filename": backup_filename,
            "size_bytes": backup_path.stat().st_size,
            "integrity_verified": integrity_ok,
            "file_hash": file_hash,
            "schema_info": schema_info,
            "backup_timestamp": datetime.now().isoformat()
        }
        
        # Export as SQL dump for additional safety
        sql_dump_path = backup_path.with_suffix('.sql')
        self._export_database_to_sql(db_path, sql_dump_path)
        backup_info["sql_dump_path"] = str(sql_dump_path)
        
        return backup_info
    
    def _verify_database_integrity(self, db_path: Path) -> bool:
        """Verify SQLite database integrity"""
        try:
            with sqlite3.connect(db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("PRAGMA integrity_check")
                result = cursor.fetchone()
                return result and result[0] == "ok"
        except Exception as e:
            self.logger.error(f"Database integrity check failed for {db_path}: {e}")
            return False
    
    def _get_database_schema(self, db_path: Path) -> Dict:
        """Get database schema information"""
        try:
            with sqlite3.connect(db_path) as conn:
                cursor = conn.cursor()
                
                # Get table list
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall()]
                
                schema_info = {
                    "tables": {},
                    "total_tables": len(tables)
                }
                
                # Get info for each table
                for table in tables:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = cursor.fetchall()
                    
                    schema_info["tables"][table] = {
                        "record_count": count,
                        "column_count": len(columns),
                        "columns": [{"name": col[1], "type": col[2]} for col in columns]
                    }
                
                return schema_info
                
        except Exception as e:
            self.logger.error(f"Failed to get schema for {db_path}: {e}")
            return {"error": str(e)}
    
    def _export_database_to_sql(self, db_path: Path, output_path: Path):
        """Export database to SQL dump"""
        try:
            with sqlite3.connect(db_path) as conn:
                with open(output_path, 'w') as f:
                    for line in conn.iterdump():
                        f.write(f"{line}\n")
            
            self.logger.info(f"SQL dump created: {output_path}")
            
        except Exception as e:
            self.logger.error(f"Failed to create SQL dump for {db_path}: {e}")
    
    def _backup_files(self) -> List[Dict]:
        """Backup all relevant files"""
        self.logger.info("Backing up files...")
        
        files_backed_up = []
        
        for pattern in self.files_to_backup:
            matching_files = list(self.project_root.glob(pattern))
            
            for file_path in matching_files:
                if file_path.is_file() and not self._should_exclude_file(file_path):
                    try:
                        backup_info = self._backup_single_file(file_path)
                        files_backed_up.append(backup_info)
                    except Exception as e:
                        self.logger.error(f"Failed to backup file {file_path}: {e}")
        
        return files_backed_up
    
    def _should_exclude_file(self, file_path: Path) -> bool:
        """Check if file should be excluded from backup"""
        file_str = str(file_path)
        
        for pattern in self.exclude_patterns:
            if pattern in file_str:
                return True
        
        # Skip very large files (>100MB)
        try:
            if file_path.stat().st_size > 100 * 1024 * 1024:
                self.logger.warning(f"Skipping large file: {file_path}")
                return True
        except:
            pass
        
        return False
    
    def _backup_single_file(self, file_path: Path) -> Dict:
        """Backup a single file"""
        # Create relative path for backup
        try:
            relative_path = file_path.relative_to(self.project_root)
        except ValueError:
            relative_path = file_path.name
        
        backup_path = self.backup_dir / "files" / relative_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy file
        shutil.copy2(file_path, backup_path)
        
        # Calculate hash
        file_hash = self._calculate_file_hash(backup_path)
        
        backup_info = {
            "original_path": str(file_path),
            "backup_path": str(backup_path),
            "relative_path": str(relative_path),
            "size_bytes": backup_path.stat().st_size,
            "file_hash": file_hash,
            "backup_timestamp": datetime.now().isoformat()
        }
        
        return backup_info
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of file"""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        
        return sha256_hash.hexdigest()
    
    def _create_validation_hashes(self) -> Dict[str, str]:
        """Create validation hashes for all backed up files"""
        self.logger.info("Creating validation hashes...")
        
        validation_hashes = {}
        
        for file_path in self.backup_dir.rglob("*"):
            if file_path.is_file():
                relative_path = file_path.relative_to(self.backup_dir)
                file_hash = self._calculate_file_hash(file_path)
                validation_hashes[str(relative_path)] = file_hash
        
        return validation_hashes
    
    def _calculate_backup_size(self) -> int:
        """Calculate total backup size"""
        total_size = 0
        
        for file_path in self.backup_dir.rglob("*"):
            if file_path.is_file():
                total_size += file_path.stat().st_size
        
        return total_size
    
    def _generate_restore_instructions(self) -> str:
        """Generate restoration instructions"""
        instructions = f"""
# Restore Instructions for Backup {self.backup_id}

## To restore from this backup:

1. Stop all Claude Code Optimizer services:
   ```bash
   pkill -f 'claude-code-session-monitor'
   pkill -f 'continuous_monitor'
   ```

2. Restore databases:
   ```bash
   cd {self.project_root}
   cp {self.backup_dir}/databases/*.db ./
   ```

3. Restore configuration files:
   ```bash
   cp -r {self.backup_dir}/files/config/* ./config/
   cp -r {self.backup_dir}/files/data/* ./data/
   ```

4. Verify database integrity:
   ```bash
   python migrations/verify_restore.py --backup-id {self.backup_id}
   ```

5. Restart services:
   ```bash
   python start_smart_monitoring.sh
   ```

## Emergency Recovery:

If databases are corrupted, restore from SQL dumps:
```bash
sqlite3 claude_usage.db < {self.backup_dir}/databases/claude_usage_backup_{self.backup_id}.sql
```

## Verification:

Verify backup integrity:
```bash
python migrations/verify_backup.py --backup-dir {self.backup_dir}
```
"""
        return instructions
    
    def _save_manifest(self, manifest: BackupManifest):
        """Save backup manifest"""
        manifest_path = self.backup_dir / "backup_manifest.json"
        
        # Convert datetime objects to strings
        manifest_dict = asdict(manifest)
        manifest_dict["timestamp"] = manifest.timestamp.isoformat()
        
        with open(manifest_path, 'w') as f:
            json.dump(manifest_dict, f, indent=2)
        
        self.logger.info(f"Manifest saved: {manifest_path}")
    
    def _create_compressed_archive(self) -> Path:
        """Create compressed archive of backup"""
        self.logger.info("Creating compressed archive...")
        
        archive_path = self.backup_dir.parent / f"{self.backup_id}.tar.gz"
        
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(self.backup_dir, arcname=self.backup_id)
        
        self.logger.info(f"Archive created: {archive_path}")
        return archive_path
    
    def _verify_backup_integrity(self):
        """Verify backup integrity"""
        self.logger.info("Verifying backup integrity...")
        
        manifest_path = self.backup_dir / "backup_manifest.json"
        if not manifest_path.exists():
            raise Exception("Backup manifest not found")
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        # Verify all files exist and have correct hashes
        validation_hashes = manifest["validation_hashes"]
        
        for relative_path, expected_hash in validation_hashes.items():
            file_path = self.backup_dir / relative_path
            
            if not file_path.exists():
                raise Exception(f"Backup file missing: {relative_path}")
            
            actual_hash = self._calculate_file_hash(file_path)
            if actual_hash != expected_hash:
                raise Exception(f"Hash mismatch for {relative_path}")
        
        self.logger.info("Backup integrity verification passed")

class BackupManager:
    """Manages multiple backups and cleanup"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backup_base_dir = project_root / "database_backup"
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging"""
        self.logger = logging.getLogger('BackupManager')
    
    def create_backup(self) -> BackupManifest:
        """Create a new backup"""
        backup = SystemBackup(self.project_root)
        return backup.create_complete_backup()
    
    def list_backups(self) -> List[Dict]:
        """List all available backups"""
        backups = []
        
        if not self.backup_base_dir.exists():
            return backups
        
        for backup_dir in self.backup_base_dir.iterdir():
            if backup_dir.is_dir():
                manifest_path = backup_dir / "backup_manifest.json"
                if manifest_path.exists():
                    try:
                        with open(manifest_path) as f:
                            manifest = json.load(f)
                        backups.append(manifest)
                    except Exception as e:
                        self.logger.error(f"Failed to read manifest for {backup_dir}: {e}")
        
        # Sort by timestamp (newest first)
        backups.sort(key=lambda x: x["timestamp"], reverse=True)
        return backups
    
    def cleanup_old_backups(self, keep_count: int = 5):
        """Clean up old backups, keeping the most recent ones"""
        backups = self.list_backups()
        
        if len(backups) <= keep_count:
            self.logger.info(f"Only {len(backups)} backups exist, no cleanup needed")
            return
        
        backups_to_delete = backups[keep_count:]
        
        for backup in backups_to_delete:
            backup_dir = Path(backup["backup_location"])
            archive_path = backup_dir.parent / f"{backup['backup_id']}.tar.gz"
            
            try:
                # Remove backup directory
                if backup_dir.exists():
                    shutil.rmtree(backup_dir)
                    self.logger.info(f"Removed backup directory: {backup_dir}")
                
                # Remove archive
                if archive_path.exists():
                    archive_path.unlink()
                    self.logger.info(f"Removed backup archive: {archive_path}")
                    
            except Exception as e:
                self.logger.error(f"Failed to remove backup {backup['backup_id']}: {e}")
    
    def verify_backup(self, backup_id: str) -> bool:
        """Verify a specific backup"""
        backups = self.list_backups()
        
        target_backup = None
        for backup in backups:
            if backup["backup_id"] == backup_id:
                target_backup = backup
                break
        
        if not target_backup:
            self.logger.error(f"Backup {backup_id} not found")
            return False
        
        backup_dir = Path(target_backup["backup_location"])
        
        try:
            # Verify all files exist and have correct hashes
            validation_hashes = target_backup["validation_hashes"]
            
            for relative_path, expected_hash in validation_hashes.items():
                file_path = backup_dir / relative_path
                
                if not file_path.exists():
                    self.logger.error(f"Backup file missing: {relative_path}")
                    return False
                
                # Calculate hash
                sha256_hash = hashlib.sha256()
                with open(file_path, "rb") as f:
                    for chunk in iter(lambda: f.read(4096), b""):
                        sha256_hash.update(chunk)
                actual_hash = sha256_hash.hexdigest()
                
                if actual_hash != expected_hash:
                    self.logger.error(f"Hash mismatch for {relative_path}")
                    return False
            
            self.logger.info(f"Backup {backup_id} verification passed")
            return True
            
        except Exception as e:
            self.logger.error(f"Backup verification failed: {e}")
            return False

def main():
    """Main backup execution"""
    project_root = Path(__file__).parent.parent
    
    try:
        # Create backup
        backup_manager = BackupManager(project_root)
        manifest = backup_manager.create_backup()
        
        print(f"\n✅ Backup completed successfully!")
        print(f"📦 Backup ID: {manifest.backup_id}")
        print(f"📍 Location: {manifest.backup_location}")
        print(f"📊 Size: {manifest.total_size_bytes / (1024*1024):.1f} MB")
        print(f"🗃️  Files: {len(manifest.files_backed_up)}")
        print(f"🗄️  Databases: {len(manifest.databases_backed_up)}")
        
        # List all backups
        backups = backup_manager.list_backups()
        print(f"\n📋 Total backups available: {len(backups)}")
        
        # Cleanup old backups
        backup_manager.cleanup_old_backups(keep_count=5)
        
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()