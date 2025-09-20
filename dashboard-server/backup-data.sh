#!/bin/bash
BACKUP_DIR="$HOME/.claude/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/claude-monitor-backup-$TIMESTAMP.tar.gz"

echo "💾 Creating backup..."
tar -czf "$BACKUP_FILE" \
    claude-monitor.db \
    *.csv \
    *.js \
    package.json

echo "✅ Backup created: $BACKUP_FILE"

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/claude-monitor-backup-*.tar.gz | tail -n +11 | xargs rm -f 2>/dev/null

echo "🧹 Old backups cleaned up"
