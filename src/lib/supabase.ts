import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Only create client if properly configured
let supabase: ReturnType<typeof createClient> | null = null

if (supabaseUrl !== 'https://placeholder.supabase.co' && 
    supabaseAnonKey !== 'placeholder-anon-key' &&
    supabaseUrl !== 'your_supabase_url_here' &&
    supabaseAnonKey !== 'your_supabase_anon_key_here') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.warn('Failed to create Supabase client:', error)
    supabase = null
  }
}

// Export a safe client that checks for null
export { supabase }

// Database types will be generated later
export type Database = {
  public: {
    Tables: {
      medleys: {
        Row: {
          id: string
          video_id: string
          title: string
          creator: string | null
          duration: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          video_id: string
          title: string
          creator?: string | null
          duration: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          title?: string
          creator?: string | null
          duration?: number
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
          order_index: number
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
          order_index: number
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
          order_index?: number
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