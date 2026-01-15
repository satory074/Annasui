# Database Setup

## Prerequisites

1. Supabase project already configured
2. Environment variables set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `EDIT_PASSWORD` (server-side only, for editing authentication)

## Current Database Structure

The database uses **4 core tables** (see Migration 015):

| Table | Purpose |
|-------|---------|
| `medleys` | Medley basic information (video_id, platform, title, creator, duration) |
| `song_master` | Song master data for reuse across medleys |
| `medley_songs` | Song placement within medleys (timeline data) |
| `medley_edits` | Edit history tracking with snapshots |

## Migration Steps

Execute migrations in order via Supabase SQL Editor:

1. **015_rebuild_database_structure.sql** - Complete database rebuild (creates all 4 tables)
2. **016_make_artist_optional.sql** - Makes artist field optional in song_master
3. **017_add_platform_specific_links.sql** - Replaces JSONB links with individual columns
4. **022_add_decimal_time_support.sql** - Changes time fields from INTEGER to REAL

## Authentication System

**Current**: Password-based authentication with nicknames (Migration 011+)
- Single shared password (`EDIT_PASSWORD` env var)
- Users provide nickname when editing
- All edits tracked with editor nickname in `medley_edits`
- Rate limiting: 5 attempts per 10 minutes

**Legacy** (Migrations 001-009): OAuth with GitHub/Google - **Removed in Migration 010**

## Key Schema Details

### song_master
```sql
id UUID PRIMARY KEY
title TEXT NOT NULL
artist TEXT  -- Optional, defaults to "Unknown Artist" in app
normalized_id TEXT UNIQUE  -- For duplicate detection
niconico_link, youtube_link, spotify_link, applemusic_link TEXT
```

### medley_songs
```sql
id UUID PRIMARY KEY
medley_id UUID REFERENCES medleys(id)
song_id UUID REFERENCES song_master(id)  -- Nullable, links to master
start_time, end_time REAL  -- Decimal time support (0.1s precision)
title, artist TEXT  -- Cached from song_master
```

## Backup & Recovery

- **Automated**: Daily at 3:00 AM JST via GitHub Actions
- **Manual**: `./scripts/backup-database.sh`
- **Restore**: `./scripts/restore-database.sh <backup_file>`
- See [docs/BACKUP_RESTORE.md](../docs/BACKUP_RESTORE.md) for details

## Row Level Security (RLS)

All tables have RLS enabled with open policies:
- Anyone can SELECT, INSERT, UPDATE, DELETE
- Authentication handled at application level via password verification
