# Database Setup for User Authentication

## Prerequisites

1. Supabase project already configured
2. Environment variables set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Migration Steps

### Step 1: Configure OAuth Providers in Supabase Dashboard

1. Go to Authentication > Settings > OAuth
2. Enable GitHub OAuth:
   - Add GitHub OAuth App credentials
   - Set callback URL: `https://your-domain.com/auth/callback`
3. Enable Google OAuth:
   - Add Google OAuth App credentials  
   - Set callback URL: `https://your-domain.com/auth/callback`

### Step 2: Run Database Migrations

Execute the SQL files in order:

1. **001_create_users_table.sql**
   ```bash
   # In Supabase SQL Editor or via CLI
   psql -h db.xxx.supabase.co -U postgres -d postgres -f 001_create_users_table.sql
   ```

2. **002_add_user_id_to_medleys.sql**
   ```bash
   psql -h db.xxx.supabase.co -U postgres -d postgres -f 002_add_user_id_to_medleys.sql
   ```

### Step 3: Configure Site URL

In Supabase Dashboard:
1. Go to Authentication > Settings
2. Add site URL: `https://anasui-e6f49.web.app`
3. Add redirect URLs:
   - `https://anasui-e6f49.web.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for development)

## What This Enables

- **User Authentication**: GitHub/Google OAuth login
- **User Profiles**: Automatic profile creation on signup
- **Owned Medleys**: New medleys are owned by authenticated users
- **Legacy Support**: Existing anonymous medleys remain accessible
- **Row Level Security**: Users can only edit their own medleys

## Database Schema

### Users Table
- `id` - UUID (references auth.users)
- `email` - User email
- `name` - Display name
- `avatar_url` - Profile picture URL
- `created_at/updated_at` - Timestamps

### Updated Medleys Table
- Added `user_id` - Foreign key to users table
- RLS policies for user ownership
- Legacy support for anonymous medleys (user_id = null)

## Security Features

- **Row Level Security (RLS)** enabled
- Users can only modify their own data
- Public read access to all medleys
- Automatic profile creation on signup
- Secure OAuth flow with proper redirects

## Testing

1. Deploy with authentication enabled
2. Test GitHub/Google login flow
3. Create new medley while authenticated
4. Verify ownership restrictions
5. Test anonymous access to existing medleys