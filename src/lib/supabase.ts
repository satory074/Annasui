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

// Database types will be generated later
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      medleys: {
        Row: {
          id: string
          video_id: string
          title: string
          creator: string | null
          duration: number
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          video_id: string
          title: string
          creator?: string | null
          duration: number
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          title?: string
          creator?: string | null
          duration?: number
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      songs: {
        Row: {
          id: string
          medley_id: string
          title: string
          artist: string | null
          start_time: number
          end_time: number
          color: string
          genre: string | null
          original_link: string | null
          links: string | null
          order_index: number
          last_editor: string | null
          last_edited_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          medley_id: string
          title: string
          artist?: string | null
          start_time: number
          end_time: number
          color: string
          genre?: string | null
          original_link?: string | null
          links?: string | null
          order_index: number
          last_editor?: string | null
          last_edited_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          medley_id?: string
          title?: string
          artist?: string | null
          start_time?: number
          end_time?: number
          color?: string
          genre?: string | null
          original_link?: string | null
          links?: string | null
          order_index?: number
          last_editor?: string | null
          last_edited_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}