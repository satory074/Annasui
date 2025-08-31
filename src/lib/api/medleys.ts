import { supabase, type Database } from '@/lib/supabase'
import type { MedleyData, SongSection } from '@/types'
import { logger } from '@/lib/utils/logger'

type MedleyRow = Database['public']['Tables']['medleys']['Row']
type SongRow = Database['public']['Tables']['songs']['Row']

// Authorization check function
async function checkUserApproval(): Promise<{ isApproved: boolean; user: any | null }> {
  if (!supabase) {
    return { isApproved: false, user: null }
  }

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.warn('⚠️ User not authenticated')
      return { isApproved: false, user: null }
    }

    // Check if user is approved
    const { data: approvalData, error: approvalError } = await supabase
      .from('approved_users')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (approvalError && approvalError.code !== 'PGRST116') {
      logger.error('❌ Error checking user approval:', approvalError)
      return { isApproved: false, user }
    }

    const isApproved = !!approvalData
    logger.debug('🔐 Authorization check:', { userId: user.id, isApproved })
    
    return { isApproved, user }
  } catch (error) {
    logger.error('❌ Error in checkUserApproval:', error)
    return { isApproved: false, user: null }
  }
}

// Test function to verify API key
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' }
  }
  
  try {
    logger.debug('🔍 Testing Supabase connection...')
    
    // Try a simple query to test the connection
    const { error } = await supabase
      .from('medleys')
      .select('id')
      .limit(1)
    
    if (error) {
      logger.error('❌ Supabase connection test failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      })
      return { 
        success: false, 
        error: `${error.code}: ${error.message}` 
      }
    }
    
    logger.debug('✅ Supabase connection test successful')
    return { success: true }
  } catch (error) {
    logger.error('❌ Supabase connection test error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

// Database row to app type conversion
function convertDbRowToSongSection(song: SongRow): SongSection {
  return {
    id: song.order_index, // Use order_index as the legacy id field
    title: song.title,
    artist: song.artist || '',
    startTime: song.start_time,
    endTime: song.end_time,
    color: song.color,
    originalLink: song.original_link || undefined
  }
}


function convertDbRowToMedleyData(medley: MedleyRow, songs: SongRow[]): MedleyData {
  const sortedSongs = [...songs].sort((a, b) => a.order_index - b.order_index)
  
  return {
    id: medley.id,
    videoId: medley.video_id,
    title: medley.title,
    creator: medley.creator || '',
    duration: medley.duration,
    user_id: medley.user_id || undefined,
    createdAt: medley.created_at,
    updatedAt: medley.updated_at,
    songs: sortedSongs.map(convertDbRowToSongSection)
  }
}

// Direct fetch implementation to bypass Supabase client issues
async function directFetch(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8',
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// API functions
export async function getMedleyByVideoId(videoId: string): Promise<MedleyData | null> {
  try {
    logger.debug('🔍 Fetching medley data for:', videoId)

    // Get the medley using direct fetch
    const medleyData = await directFetch(
      `https://dheairurkxjftugrwdjl.supabase.co/rest/v1/medleys?select=*&video_id=eq.${videoId}`
    ) as unknown[];

    if (!medleyData || medleyData.length === 0) {
      logger.debug('No medley found for video ID:', videoId)
      return null
    }

    const medley = medleyData[0] as Record<string, unknown>;

    // Get the songs for this medley using direct fetch
    const songData = await directFetch(
      `https://dheairurkxjftugrwdjl.supabase.co/rest/v1/songs?select=*&medley_id=eq.${medley.id}&order=order_index`
    ) as unknown[];

    logger.debug('✅ Successfully fetched medley data:', {
      title: medley.title,
      songCount: songData.length
    })

    return convertDbRowToMedleyData(medley as MedleyRow, (songData || []) as SongRow[])
  } catch (error) {
    logger.error('❌ Error in getMedleyByVideoId:', error)
    return null
  }
}

export async function getAllMedleys(): Promise<MedleyData[]> {
  if (!supabase) {
    return []
  }
  
  try {
    // Get all medleys first
    const { data: medleys, error: medleysError } = await supabase
      .from('medleys')
      .select('*')
      .order('created_at', { ascending: false })

    if (medleysError) {
      throw medleysError
    }

    if (!medleys) {
      return []
    }

    // Get songs and tempo changes for each medley
    const medleyDataPromises = medleys.map(async (medley) => {
      const songsResult = await
        supabase!
          .from('songs')
          .select('*')
          .eq('medley_id', medley.id as string)
          .order('order_index', { ascending: true })

      if (songsResult.error) {
        logger.error('Error fetching songs for medley:', medley.id, songsResult.error)
      }

      return convertDbRowToMedleyData(
        medley as MedleyRow, 
        (songsResult.data || []) as SongRow[]
      )
    })

    return await Promise.all(medleyDataPromises)
  } catch (error) {
    logger.error('Error fetching all medleys:', error)
    return []
  }
}

export async function createMedley(medleyData: Omit<MedleyData, 'songs'> & { songs: Omit<SongSection, 'id'>[], user_id?: string }): Promise<MedleyData | null> {
  if (!supabase) {
    return null
  }

  // Check user authorization
  const { isApproved, user } = await checkUserApproval()
  if (!isApproved) {
    logger.warn('❌ Unauthorized: User is not approved to create medleys')
    throw new Error('User is not authorized to create medleys. Please contact the administrator for approval.')
  }
  
  try {
    // Insert medley
    const { data: medley, error: medleyError } = await supabase
      .from('medleys')
      .insert({
        video_id: medleyData.videoId,
        title: medleyData.title,
        creator: medleyData.creator || null,
        duration: medleyData.duration,
        user_id: user.id,
      })
      .select()
      .single()

    if (medleyError) {
      throw medleyError
    }

    // Insert songs
    const songsToInsert = medleyData.songs.map((song, index) => ({
      medley_id: medley.id as string,
      title: song.title,
      artist: song.artist || null,
      start_time: song.startTime,
      end_time: song.endTime,
      color: song.color,
      original_link: song.originalLink || null,
      order_index: index + 1
    }))

    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .insert(songsToInsert)
      .select()

    if (songsError) {
      throw songsError
    }

    return convertDbRowToMedleyData(medley as MedleyRow, (songs || []) as SongRow[])
  } catch (error) {
    logger.error('Error creating medley:', error)
    return null
  }
}

export async function updateMedley(videoId: string, updates: Partial<Omit<MedleyData, 'videoId' | 'songs'>>): Promise<MedleyData | null> {
  if (!supabase) {
    return null
  }

  // Check user authorization
  const { isApproved, user } = await checkUserApproval()
  if (!isApproved) {
    logger.warn('❌ Unauthorized: User is not approved to update medleys')
    throw new Error('User is not authorized to update medleys. Please contact the administrator for approval.')
  }
  
  try {
    const { data: medley, error } = await supabase
      .from('medleys')
      .update({
        title: updates.title,
        creator: updates.creator,
        duration: updates.duration
      })
      .eq('video_id', videoId)
      .select()
      .single()

    if (error) {
      throw error
    }


    // Get updated data
    const songsResult = await supabase
      .from('songs')
      .select('*')
      .eq('medley_id', medley.id as string)
      .order('order_index', { ascending: true })

    if (songsResult.error) {
      throw songsResult.error
    }

    return convertDbRowToMedleyData(
      medley as MedleyRow, 
      (songsResult.data || []) as SongRow[]
    )
  } catch (error) {
    logger.error('Error updating medley:', error)
    return null
  }
}

export async function getUserMedleys(userId: string): Promise<MedleyData[]> {
  if (!supabase) {
    return []
  }
  
  try {
    // Get all medleys for this user
    const { data: medleys, error: medleysError } = await supabase
      .from('medleys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (medleysError) {
      throw medleysError
    }

    if (!medleys) {
      return []
    }

    // Get songs for each medley
    const medleyDataPromises = medleys.map(async (medley) => {
      const songsResult = await supabase!
        .from('songs')
        .select('*')
        .eq('medley_id', medley.id as string)
        .order('order_index', { ascending: true })

      if (songsResult.error) {
        logger.error('Error fetching songs for medley:', medley.id, songsResult.error)
      }

      return convertDbRowToMedleyData(
        medley as MedleyRow, 
        (songsResult.data || []) as SongRow[]
      )
    })

    return await Promise.all(medleyDataPromises)
  } catch (error) {
    logger.error('Error fetching user medleys:', error)
    return []
  }
}

export async function deleteMedley(videoId: string): Promise<boolean> {
  if (!supabase) {
    return false
  }

  // Check user authorization
  const { isApproved, user } = await checkUserApproval()
  if (!isApproved) {
    logger.warn('❌ Unauthorized: User is not approved to delete medleys')
    throw new Error('User is not authorized to delete medleys. Please contact the administrator for approval.')
  }
  
  try {
    const { error } = await supabase
      .from('medleys')
      .delete()
      .eq('video_id', videoId)

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    logger.error('Error deleting medley:', error)
    return false
  }
}

// Songs management functions with authorization
export async function saveMedleySongs(medleyId: string, songs: Omit<SongSection, 'id'>[]): Promise<boolean> {
  if (!supabase) {
    return false
  }

  // Check user authorization
  const { isApproved, user } = await checkUserApproval()
  if (!isApproved) {
    logger.warn('❌ Unauthorized: User is not approved to modify songs')
    throw new Error('User is not authorized to modify songs. Please contact the administrator for approval.')
  }

  try {
    // Delete existing songs for this medley
    const { error: deleteError } = await supabase
      .from('songs')
      .delete()
      .eq('medley_id', medleyId)

    if (deleteError) {
      throw deleteError
    }

    // Insert new songs
    if (songs.length > 0) {
      const songsToInsert = songs.map((song, index) => ({
        medley_id: medleyId,
        title: song.title,
        artist: song.artist || null,
        start_time: song.startTime,
        end_time: song.endTime,
        color: song.color,
        original_link: song.originalLink || null,
        order_index: index + 1
      }))

      const { error: insertError } = await supabase
        .from('songs')
        .insert(songsToInsert)

      if (insertError) {
        throw insertError
      }
    }

    logger.info('✅ Successfully saved medley songs')
    return true
  } catch (error) {
    logger.error('❌ Error saving medley songs:', error)
    return false
  }
}