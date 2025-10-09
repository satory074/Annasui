#!/bin/bash

# ========================================
# Supabase Database Restore Script
# ========================================
# Restore database from backup file
# Usage: ./scripts/restore-database.sh <backup-file> [connection-url]
#
# Requirements:
# - PostgreSQL client (psql) installed
# - Database connection URL (from Supabase Dashboard > Settings > Database)
#
# WARNING: This will OVERWRITE all data in the target database!
# Make sure to backup the current database before restoring.

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

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    print_msg "$RED" "Error: PostgreSQL client (psql) is not installed"
    print_msg "$YELLOW" "Install with:"
    print_msg "$YELLOW" "  macOS: brew install postgresql"
    print_msg "$YELLOW" "  Ubuntu: sudo apt install postgresql-client"
    exit 1
fi

# Get backup file from argument
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    print_msg "$RED" "Error: Backup file is required"
    print_msg "$YELLOW" "Usage: $0 <backup-file> [database-url]"
    print_msg "$YELLOW" ""
    print_msg "$YELLOW" "Available backups:"
    ls -lh database/backups/backup_*.tar.gz 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    print_msg "$RED" "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Get database URL from argument or environment variable
DB_URL="${2:-$SUPABASE_DB_URL}"

if [ -z "$DB_URL" ]; then
    print_msg "$RED" "Error: Database URL is required"
    print_msg "$YELLOW" "Usage: $0 <backup-file> <database-url>"
    print_msg "$YELLOW" "Or set SUPABASE_DB_URL environment variable"
    exit 1
fi

# Extract backup files
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

print_msg "$BLUE" "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
print_msg "$GREEN" "✓ Backup extracted"

# List extracted files
SCHEMA_FILE=$(ls "$TEMP_DIR"/schema_*.sql 2>/dev/null | head -1)
DATA_FILE=$(ls "$TEMP_DIR"/data_*.sql 2>/dev/null | head -1)
ROLES_FILE=$(ls "$TEMP_DIR"/roles_*.sql 2>/dev/null | head -1)

if [ -z "$SCHEMA_FILE" ]; then
    print_msg "$RED" "Error: Schema file not found in backup"
    exit 1
fi

if [ -z "$DATA_FILE" ]; then
    print_msg "$RED" "Error: Data file not found in backup"
    exit 1
fi

# Show warning and confirmation
print_msg "$RED" "=========================================="
print_msg "$RED" "⚠  WARNING: DATABASE RESTORE"
print_msg "$RED" "=========================================="
print_msg "$YELLOW" "This will OVERWRITE all data in the target database!"
print_msg "$YELLOW" ""
print_msg "$YELLOW" "Backup file: $BACKUP_FILE"
print_msg "$YELLOW" "Target database: ${DB_URL%%@*}@***"
print_msg "$YELLOW" ""
print_msg "$YELLOW" "Files to restore:"
[ -n "$ROLES_FILE" ] && print_msg "$YELLOW" "  - Roles: $(basename "$ROLES_FILE")"
print_msg "$YELLOW" "  - Schema: $(basename "$SCHEMA_FILE")"
print_msg "$YELLOW" "  - Data: $(basename "$DATA_FILE")"
print_msg "$RED" "=========================================="

read -p "Are you ABSOLUTELY SURE you want to continue? (type 'yes' to confirm): " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    print_msg "$BLUE" "Restore cancelled."
    exit 0
fi

# Final confirmation
read -p "Type the database name to confirm: " -r
DB_NAME=$(echo "$DB_URL" | sed -n 's#.*@.*/\([^?]*\).*#\1#p')
if [[ "$REPLY" != "$DB_NAME" ]]; then
    print_msg "$RED" "Database name does not match. Restore cancelled."
    exit 1
fi

print_msg "$BLUE" "Starting restore process..."

# Restore roles (if available)
if [ -n "$ROLES_FILE" ]; then
    print_msg "$YELLOW" "Restoring roles..."
    if psql "$DB_URL" --single-transaction --variable ON_ERROR_STOP=1 --file "$ROLES_FILE" 2>/dev/null; then
        print_msg "$GREEN" "✓ Roles restored successfully"
    else
        print_msg "$YELLOW" "⚠ Roles restore skipped (may require superuser privileges)"
    fi
fi

# Restore schema
print_msg "$YELLOW" "Restoring schema..."
psql "$DB_URL" --single-transaction --variable ON_ERROR_STOP=1 --file "$SCHEMA_FILE"
print_msg "$GREEN" "✓ Schema restored successfully"

# Restore data
print_msg "$YELLOW" "Restoring data..."
psql "$DB_URL" --single-transaction --variable ON_ERROR_STOP=1 --file "$DATA_FILE"
print_msg "$GREEN" "✓ Data restored successfully"

# Verify restoration
print_msg "$YELLOW" "Verifying restoration..."
TABLE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
print_msg "$GREEN" "✓ Found $TABLE_COUNT tables in public schema"

# Summary
print_msg "$GREEN" "=========================================="
print_msg "$GREEN" "Database restored successfully!"
print_msg "$GREEN" "=========================================="
print_msg "$BLUE" "Backup file: $BACKUP_FILE"
print_msg "$BLUE" "Tables restored: $TABLE_COUNT"

# Recommendation
print_msg "$YELLOW" ""
print_msg "$YELLOW" "Next steps:"
print_msg "$YELLOW" "1. Verify data integrity in Supabase Dashboard"
print_msg "$YELLOW" "2. Test application functionality"
print_msg "$YELLOW" "3. Check RLS policies are working correctly"
print_msg "$YELLOW" "4. Run: psql \"$DB_URL\" -c 'NOTIFY pgrst, \"reload schema\";'"
