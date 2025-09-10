# Scripts Directory

This directory contains utility scripts for database operations and development tasks.

## Database Scripts

### `add_individual_links.js`
Adds individual song links to the database for improved thumbnail support.

### `update_original_links.js`
Updates original links for songs in the database.

### `check_database_schema.js`
Validates the database schema and structure.

## Testing & Verification Scripts

### `check_medleys.js`
Validates medley data integrity in the database.

### `check_sm2959233.js`
Specific data validation for medley sm2959233.

### `test_search.js`
Tests the search functionality and algorithms.

## Usage

All scripts are Node.js scripts that can be run with:
```bash
node scripts/[script-name].js
```

Make sure to set up your environment variables (especially Supabase credentials) before running database scripts.