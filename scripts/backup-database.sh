#!/bin/bash

# ========================================
# Supabase Database Backup Script
# ========================================
# Manual backup script for Supabase database
# Usage: ./scripts/backup-database.sh [connection-url]
#
# Requirements:
# - Supabase CLI installed (npm install -g supabase)
# - Database connection URL (from Supabase Dashboard > Settings > Database)
#
# Connection URL format:
# postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_msg() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_msg "$RED" "Error: Supabase CLI is not installed"
    print_msg "$YELLOW" "Install with: npm install -g supabase"
    exit 1
fi

# Get database URL from argument or environment variable
DB_URL="${1:-$SUPABASE_DB_URL}"

if [ -z "$DB_URL" ]; then
    print_msg "$RED" "Error: Database URL is required"
    print_msg "$YELLOW" "Usage: $0 <database-url>"
    print_msg "$YELLOW" "Or set SUPABASE_DB_URL environment variable"
    exit 1
fi

# Create backup directory
BACKUP_DIR="database/backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
print_msg "$BLUE" "Starting backup at $TIMESTAMP"

# Backup roles
print_msg "$YELLOW" "Backing up roles..."
if supabase db dump --db-url "$DB_URL" -f "$BACKUP_DIR/roles_$TIMESTAMP.sql" --role-only 2>/dev/null; then
    print_msg "$GREEN" "✓ Roles backed up successfully"
else
    print_msg "$YELLOW" "⚠ Roles backup skipped (may require superuser privileges)"
fi

# Backup schema
print_msg "$YELLOW" "Backing up schema..."
supabase db dump --db-url "$DB_URL" -f "$BACKUP_DIR/schema_$TIMESTAMP.sql"
print_msg "$GREEN" "✓ Schema backed up successfully"

# Backup data
print_msg "$YELLOW" "Backing up data..."
supabase db dump --db-url "$DB_URL" -f "$BACKUP_DIR/data_$TIMESTAMP.sql" --data-only --use-copy
print_msg "$GREEN" "✓ Data backed up successfully"

# Compress backups
print_msg "$YELLOW" "Compressing backup files..."
cd "$BACKUP_DIR"
tar -czf "backup_$TIMESTAMP.tar.gz" *_$TIMESTAMP.sql
rm *_$TIMESTAMP.sql
cd - > /dev/null

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" | cut -f1)
print_msg "$GREEN" "✓ Backup compressed: $BACKUP_SIZE"

# Keep only last 30 backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 30 ]; then
    print_msg "$YELLOW" "Cleaning old backups (keeping last 30)..."
    ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +31 | xargs rm --
    print_msg "$GREEN" "✓ Old backups cleaned"
fi

# Summary
print_msg "$GREEN" "=========================================="
print_msg "$GREEN" "Backup completed successfully!"
print_msg "$GREEN" "=========================================="
print_msg "$BLUE" "Backup file: $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
print_msg "$BLUE" "Backup size: $BACKUP_SIZE"
print_msg "$BLUE" "Total backups: $(ls -1 "$BACKUP_DIR"/backup_*.tar.gz | wc -l)"

# Optional: Commit to git
read -p "Commit backup to git? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    git commit -m "chore: manual database backup $TIMESTAMP"
    print_msg "$GREEN" "✓ Backup committed to git"

    read -p "Push to remote? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push
        print_msg "$GREEN" "✓ Backup pushed to remote"
    fi
fi

print_msg "$BLUE" "To restore this backup, run:"
print_msg "$BLUE" "./scripts/restore-database.sh $BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
