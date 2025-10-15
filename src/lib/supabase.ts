import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dheairurkxjftugrwdjl.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8'

// Debug logging for production
logger.debug('🔍 Supabase Environment Debug:', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  urlLength: supabaseUrl.length,
  keyLength: supabaseAnonKey.length,
  urlValue: supabaseUrl,
  keyPrefix: supabaseAnonKey.substring(0, 20) + '...',
  isProduction: process.env.NODE_ENV === 'production'
})

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
          artist: string
          normalized_id: string
          original_link: string | null
          links: Record<string, unknown> | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          artist: string
          normalized_id: string
          original_link?: string | null
          links?: Record<string, unknown> | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          normalized_id?: string
          original_link?: string | null
          links?: Record<string, unknown> | null
          description?: string | null
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
          color: string
          original_link: string | null
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
          color?: string
          original_link?: string | null
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
          color?: string
          original_link?: string | null
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

// Only create client if properly configured
let supabase: ReturnType<typeof createClient> | null = null

if (supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-anon-key' &&
    supabaseUrl !== 'your_supabase_url_here' &&
    supabaseAnonKey !== 'your_supabase_anon_key_here' &&
    supabaseUrl.length > 0 && supabaseAnonKey.length > 0) {
  try {
    logger.info('✅ Creating Supabase client...')
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    logger.error('❌ Failed to create Supabase client:', error)
    supabase = null
  }
} else {
  logger.warn('❌ Supabase environment variables not properly configured')
}

// Export a safe client that checks for null
export { supabase }