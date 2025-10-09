# Database Backup & Disaster Recovery Guide

## Overview

This document describes the backup and disaster recovery procedures for the Anasui Supabase database. Our strategy combines automated daily backups with manual backup capabilities and soft delete protection.

## Current Setup

- **Project**: anasui (Free plan)
- **Database**: PostgreSQL 17, region: ap-northeast-1
- **Tables**: medleys (3 rows), songs (18 rows), medley_edits (35 rows)
- **Backup Strategy**: Automated daily backups via GitHub Actions + manual backups
- **Recovery Window**: 30 days for soft-deleted records, unlimited for backups

## Backup Strategy

### 1. Automated Daily Backups (GitHub Actions)

Automated backups run daily at 3:00 AM JST (18:00 UTC previous day).

**Configuration**: `.github/workflows/supabase-backup.yml`

**What's backed up**:
- Database schema (structure, functions, triggers)
- All data (medleys, songs, edit history)
- Database roles (if permissions allow)

**Retention**: Last 30 backups are kept (≈1 month)

**Backup location**: `database/backups/backup_YYYYMMDD_HHMMSS.tar.gz`

**Triggers**:
- Daily schedule (3:00 AM JST)
- Manual trigger (workflow_dispatch)
- On migration changes (push to main with `database/migrations/**` changes)

### 2. Manual Backups

Use the manual backup script before making significant changes.

```bash
# Set database URL (get from Supabase Dashboard > Settings > Database)
export SUPABASE_DB_URL="postgresql://postgres:[password]@db.dheairurkxjftugrwdjl.supabase.co:5432/postgres"

# Run backup
./scripts/backup-database.sh

# Or provide URL directly
./scripts/backup-database.sh "$SUPABASE_DB_URL"
```

**When to use manual backups**:
- Before running new migrations
- Before bulk data operations
- Before major application updates
- Weekly (recommended)

### 3. Soft Delete Protection

Records are not immediately deleted. Instead, they're marked with `deleted_at` timestamp.

**Protection period**: 30 days

**What's protected**:
- Medleys (and all their songs cascade automatically)
- Individual songs

**Recovery**: See "Recovering Soft-Deleted Records" section below

## Setup Instructions

### Prerequisites

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Install PostgreSQL client** (for restore):
   ```bash
   # macOS
   brew install postgresql

   # Ubuntu
   sudo apt install postgresql-client
   ```

3. **Get database URL**:
   - Open Supabase Dashboard
   - Navigate to Settings > Database
   - Copy the connection string (includes password)

### GitHub Actions Setup

1. **Add GitHub Secret**:
   ```
   Repository Settings > Secrets and variables > Actions > New repository secret
   Name: SUPABASE_DB_URL
   Value: postgresql://postgres:[PASSWORD]@db.dheairurkxjftugrwdjl.supabase.co:5432/postgres
   ```

2. **Ensure repository is private**:
   - Backups contain sensitive data
   - Never commit backups to public repositories

3. **Verify workflow**:
   ```bash
   # Manual trigger
   Actions tab > Supabase Database Backup > Run workflow
   ```

### Apply Migrations

Apply the new migrations to enable soft delete and enhanced audit logging:

```bash
# Connect to Supabase
export SUPABASE_DB_URL="your-connection-string"

# Apply soft delete migration
psql "$SUPABASE_DB_URL" -f database/migrations/012_add_soft_delete.sql

# Apply enhanced audit log migration
psql "$SUPABASE_DB_URL" -f database/migrations/013_enhance_audit_log.sql
```

Or via Supabase Dashboard:
1. SQL Editor
2. Copy migration content
3. Run query

## Disaster Recovery Scenarios

### Scenario 1: Accidental Record Deletion (< 30 days ago)

**Problem**: User accidentally deleted a medley or song

**Solution**: Restore from soft delete

```sql
-- View deleted medleys
SELECT * FROM deleted_medleys;

-- Restore a medley (and all its songs)
SELECT restore_medley('medley-uuid-here');

-- View deleted songs
SELECT * FROM deleted_songs;

-- Restore a specific song
SELECT restore_song('song-uuid-here');
```

**Recovery Time**: Immediate (< 1 minute)

### Scenario 2: Data Corruption or Unwanted Changes

**Problem**: Data was modified incorrectly, need to restore to previous state

**Solution**: Restore from backup

1. **Find appropriate backup**:
   ```bash
   ls -lh database/backups/
   # Choose backup_YYYYMMDD_HHMMSS.tar.gz from before the issue
   ```

2. **Create current backup first**:
   ```bash
   ./scripts/backup-database.sh
   ```

3. **Restore from backup**:
   ```bash
   ./scripts/restore-database.sh database/backups/backup_YYYYMMDD_HHMMSS.tar.gz
   ```

4. **Verify restoration**:
   - Check Supabase Dashboard
   - Test application functionality
   - Verify data integrity

**Recovery Time**: 5-15 minutes (depending on database size)

### Scenario 3: Complete Database Loss

**Problem**: Database instance is completely lost or corrupted

**Solution**: Restore to new Supabase project

1. **Create new Supabase project** (if needed)
2. **Get new database URL**
3. **Restore from latest backup**:
   ```bash
   ./scripts/restore-database.sh \
     database/backups/backup_YYYYMMDD_HHMMSS.tar.gz \
     "postgresql://postgres:[password]@db.[new-project].supabase.co:5432/postgres"
   ```

4. **Update environment variables** in `.env.local` and Firebase:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[new-project].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[new-anon-key]
   ```

5. **Verify and deploy**

**Recovery Time**: 30-60 minutes

### Scenario 4: Malicious Activity Detected

**Problem**: Suspicious editing patterns detected

**Solution**: Investigate and restore if needed

1. **Check suspicious activity**:
   ```sql
   -- View recent suspicious edits
   SELECT * FROM suspicious_edits;

   -- Detect anomalies in last 24 hours
   SELECT * FROM detect_suspicious_activity(24);

   -- Check specific user's IP addresses
   SELECT * FROM get_nickname_ip_comparison('nickname');
   ```

2. **If confirmed malicious**:
   ```bash
   # Backup current state
   ./scripts/backup-database.sh

   # Restore from before attack
   ./scripts/restore-database.sh database/backups/backup_YYYYMMDD_HHMMSS.tar.gz
   ```

3. **Update password**:
   - Change `EDIT_PASSWORD` in `.env.local` and Firebase
   - Redeploy application

**Recovery Time**: 10-30 minutes

## Routine Maintenance

### Daily Tasks (Automated)

- ✅ Automated backup at 3:00 AM JST
- ✅ Keep last 30 backups
- ✅ Commit backups to git

### Weekly Tasks (Manual)

1. **Verify latest backup**:
   ```bash
   # Check backup was successful
   ls -lh database/backups/ | head -5

   # Test extraction
   tar -tzf database/backups/backup_YYYYMMDD_HHMMSS.tar.gz
   ```

2. **Review audit logs**:
   ```sql
   -- Top editors this week
   SELECT * FROM editor_activity_summary;

   -- Check for anomalies
   SELECT * FROM detect_suspicious_activity(168); -- 7 days
   ```

3. **Clean up old soft-deleted records**:
   ```sql
   -- Preview what will be deleted
   SELECT * FROM deleted_medleys WHERE days_until_permanent_deletion <= 0;
   SELECT * FROM deleted_songs WHERE days_until_permanent_deletion <= 0;

   -- Permanently delete (cannot be recovered)
   SELECT * FROM cleanup_old_deleted_records();
   ```

### Monthly Tasks (Manual)

1. **Verify restore process** (test in local environment):
   ```bash
   # Download latest backup
   # Test restore to local database
   # Verify data integrity
   ```

2. **Review backup storage**:
   ```bash
   # Check backup sizes
   du -sh database/backups/

   # Check git repository size
   git count-objects -vH
   ```

3. **Update documentation** if procedures change

## Backup File Structure

Each backup is a compressed tar archive containing:

```
backup_YYYYMMDD_HHMMSS.tar.gz
├── roles_YYYYMMDD_HHMMSS.sql      # Database roles (optional)
├── schema_YYYYMMDD_HHMMSS.sql     # Tables, functions, triggers, indexes
└── data_YYYYMMDD_HHMMSS.sql       # All data (INSERT statements)
```

**Typical sizes**:
- Current database: ~50-100KB compressed
- Growth rate: ~1-2MB per month (estimated)

## Security Considerations

### Backup Security

- ✅ Backups stored in **private** GitHub repository
- ✅ Connection strings never committed to git
- ✅ GitHub Secret for `SUPABASE_DB_URL`
- ✅ Backups compressed to reduce storage
- ❌ Do NOT commit backups to public repositories

### Access Control

- Database password in environment variables only
- Supabase RLS policies protect data
- Audit logging tracks all changes with IP/user agent

### Monitoring

- Weekly review of `suspicious_edits` view
- Monthly review of `ip_activity_summary`
- Alert on > 100 edits/hour from single IP

## Cost Considerations

### Current (Free Plan)

- **Backup storage**: Free (in git repository)
- **Manual backups**: Free (CLI tool)
- **Soft delete**: Free (uses existing storage)
- **Risk**: No automatic backups from Supabase, RPO = 24 hours

### Upgrade Path (Pro Plan - $25/month)

Benefits:
- 7-day automatic Daily Backups
- PITR available (Point-in-Time Recovery, RPO = 2 minutes)
- Automatic backups without GitHub Actions
- Better performance and reliability

**Recommendation**: Upgrade when:
- Database size > 500MB
- More than 10 active users
- Critical business data
- Need < 24 hour RPO

## Troubleshooting

### Backup fails with "permission denied"

**Cause**: Database URL incorrect or insufficient permissions

**Solution**:
```bash
# Verify connection
psql "$SUPABASE_DB_URL" -c "SELECT version();"

# Check permissions
psql "$SUPABASE_DB_URL" -c "SELECT current_user, current_database();"
```

### Restore fails with "relation already exists"

**Cause**: Trying to restore to non-empty database

**Solution**:
```bash
# Option 1: Drop and recreate schema
psql "$SUPABASE_DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Option 2: Restore to fresh Supabase project
```

### GitHub Actions backup fails

**Check**:
1. GitHub Secret `SUPABASE_DB_URL` is set correctly
2. Repository has write permissions
3. Check Actions logs for specific error

### Soft delete not working

**Check**:
```sql
-- Verify migrations applied
SELECT * FROM pg_tables WHERE tablename IN ('medleys', 'songs');

-- Check for deleted_at column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'medleys' AND column_name = 'deleted_at';
```

## Support & Escalation

### Level 1: Application Issues
- Check `medley_edits` table for recent changes
- Review suspicious_edits view
- Restore from soft delete if < 30 days

### Level 2: Data Loss (< 24 hours)
- Restore from latest automated backup
- Verify data integrity
- Test application functionality

### Level 3: Complete Database Loss
- Restore to new Supabase project
- Update environment variables
- Full application testing required

### Emergency Contacts

- Supabase Support: https://supabase.com/support
- Database Admin: [Your contact info]

## Related Documents

- [CLAUDE.md](../CLAUDE.md) - Project documentation
- [Migration 012: Soft Delete](../database/migrations/012_add_soft_delete.sql)
- [Migration 013: Enhanced Audit Log](../database/migrations/013_enhance_audit_log.sql)
- [Supabase Backups Documentation](https://supabase.com/docs/guides/platform/backups)

## Version History

- **v1.0** (2025-10-09): Initial backup & recovery strategy
  - GitHub Actions automated backups
  - Manual backup/restore scripts
  - Soft delete protection (30 days)
  - Enhanced audit logging
