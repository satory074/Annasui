# Database Backups

This directory contains automated backups of the Supabase database.

## Backup Files

Backups are compressed tar archives with the naming format:
```
backup_YYYYMMDD_HHMMSS.tar.gz
```

Each backup contains:
- `schema_*.sql` - Database schema (tables, functions, triggers, indexes)
- `data_*.sql` - All data (INSERT statements)
- `roles_*.sql` - Database roles (optional, if permissions allow)

## Retention Policy

- **Automated**: Daily at 3:00 AM JST via GitHub Actions
- **Retention**: Last 30 backups (≈1 month)
- **Storage**: Committed to git (this directory)

## Usage

### Restore from backup

```bash
./scripts/restore-database.sh database/backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

### Create manual backup

```bash
./scripts/backup-database.sh
```

### List available backups

```bash
ls -lh database/backups/backup_*.tar.gz
```

### Extract backup (without restoring)

```bash
tar -xzf database/backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

## Security

⚠️ **IMPORTANT**: This directory contains database backups with potentially sensitive data.

- ✅ Repository MUST be **private**
- ❌ Never commit backups to public repositories
- ❌ Never share backup files publicly

## Documentation

See [BACKUP_RESTORE.md](../../docs/BACKUP_RESTORE.md) for complete backup and disaster recovery procedures.

## File Size

Current backups: ~50-100KB compressed
Expected growth: ~1-2MB per month
