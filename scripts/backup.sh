#!/bin/bash

# Rick's Picks Database Backup Script
# Usage: ./scripts/backup.sh

set -e

BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/home/ubuntu/ricks-picks"

echo "📦 Starting database backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
cd $PROJECT_DIR
echo "Creating backup: backup_$TIMESTAMP.sql"
docker-compose exec -T db pg_dump -U postgres rickspicks > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Compress backup
gzip "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Log backup
echo "$(date): Backup completed - backup_$TIMESTAMP.sql.gz" >> $BACKUP_DIR/backup.log

echo "✅ Backup completed: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Show disk usage
echo "💾 Backup directory size:"
du -sh $BACKUP_DIR