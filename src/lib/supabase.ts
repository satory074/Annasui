import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

// Environment variables are required - no hardcoded fallbacks for security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables early
if (!supabaseUrl) {
  logger.error('❌ NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
}
if (!supabaseAnonKey) {
  logger.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set')
}

// Debug logging - only confirm presence, never log actual values
if (supabaseUrl && supabaseAnonKey) {
  logger.debug('🔍 Supabase configuration validated:', {
    hasUrl: true,
    hasKey: true,
    isProduction: process.env.NODE_ENV === 'production'
  })
}

// Database types based on new structure
export type Database = {
  public: {
    Tables: {
      medleys: {
        Row: {
          id: string
          video_id: string
          platform: string
          title: string
          creator: string | null
          duration: number
          bpm: number | null
          beat_offset: number | null
          created_at: string
          updated_at: string
          last_editor: string | null
          last_edited_at: string | null
        }
        Insert: {
          id?: string
          video_id: string
          platform?: string
          title: string
          creator?: string | null
          duration: number
          bpm?: number | null
          beat_offset?: number | null
          created_at?: string
          updated_at?: string
          last_editor?: string | null
          last_edited_at?: string | null
        }
        Update: {
          id?: string
          video_id?: string
          platform?: string
          title?: string
          creator?: string | null
          duration?: number
          bpm?: number | null
          beat_offset?: number | null
          created_at?: string
          updated_at?: string
          last_editor?: string | null
          last_edited_at?: string | null
        }
      }
      song_master: {
        Row: {
          id: string
          title: string
          artist: string | null
          normalized_id: string
          niconico_link: string | null
          youtube_link: string | null
          spotify_link: string | null
          applemusic_link: string | null
          description: string | null
          /** pgvector: 1024次元 MuQ 埋め込み (NULL = 未登録) */
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          artist?: string | null
          normalized_id: string
          niconico_link?: string | null
          youtube_link?: string | null
          spotify_link?: string | null
          applemusic_link?: string | null
          description?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string | null
          normalized_id?: string
          niconico_link?: string | null
          youtube_link?: string | null
          spotify_link?: string | null
          applemusic_link?: string | null
          description?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      medley_songs: {
        Row: {
          id: string
          medley_id: string
          song_id: string | null
          start_time: number
          end_time: number
          order_index: number
          title: string
          artist: string
          composers: string | null
          arrangers: string | null
          color: string
          niconico_link: string | null
          youtube_link: string | null
          spotify_link: string | null
          applemusic_link: string | null
          created_at: string
          updated_at: string
          last_editor: string | null
          last_edited_at: string | null
        }
        Insert: {
          id?: string
          medley_id: string
          song_id?: string | null
          start_time: number
          end_time: number
          order_index: number
          title: string
          artist: string
          composers?: string | null
          arrangers?: string | null
          color?: string
          niconico_link?: string | null
          youtube_link?: string | null
          spotify_link?: string | null
          applemusic_link?: string | null
          created_at?: string
          updated_at?: string
          last_editor?: string | null
          last_edited_at?: string | null
        }
        Update: {
          id?: string
          medley_id?: string
          song_id?: string | null
          start_time?: number
          end_time?: number
          order_index?: number
          title?: string
          artist?: string
          composers?: string | null
          arrangers?: string | null
          color?: string
          niconico_link?: string | null
          youtube_link?: string | null
          spotify_link?: string | null
          applemusic_link?: string | null
          created_at?: string
          updated_at?: string
          last_editor?: string | null
          last_edited_at?: string | null
        }
      }
      medley_edits: {
        Row: {
          id: string
          medley_id: string | null
          song_id: string | null
          editor_nickname: string
          action: string
          changes: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          medley_id?: string | null
          song_id?: string | null
          editor_nickname: string
          action: string
          changes?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          medley_id?: string | null
          song_id?: string | null
          editor_nickname?: string
          action?: string
          changes?: Record<string, unknown> | null
          created_at?: string
        }
      }
      artists: {
        Row: {
          id: string
          name: string
          normalized_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          normalized_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          normalized_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      song_artist_relations: {
        Row: {
          id: string
          song_id: string
          artist_id: string
          role: 'artist' | 'composer' | 'arranger'
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          song_id: string
          artist_id: string
          role: 'artist' | 'composer' | 'arranger'
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          song_id?: string
          artist_id?: string
          role?: 'artist' | 'composer' | 'arranger'
          order_index?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_medley_contributors: {
        Args: {
          medley_uuid: string
          limit_count?: number
        }
        Returns: Array<{
          editor_nickname: string
          edit_count: number
          last_edit: string
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Only create client if environment variables are properly configured
let supabase: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseAnonKey) {
  try {
    logger.info('✅ Creating Supabase client...')
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    logger.error('❌ Failed to create Supabase client:', error)
    supabase = null
  }
} else {
  logger.warn('❌ Supabase environment variables not properly configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
}

// Export a safe client that checks for null
export { supabase }