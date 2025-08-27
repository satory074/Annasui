import { supabase, type Database } from '@/lib/supabase'
import type { MedleyData, SongSection } from '@/types'

type MedleyRow = Database['public']['Tables']['medleys']['Row']
type SongRow = Database['public']['Tables']['songs']['Row']

// Test function to verify API key
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase client not initialized' }
  }
  
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Try a simple query to test the connection
    const { data, error } = await supabase
      .from('medleys')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase connection test failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      })
      return { 
        success: false, 
        error: `${error.code}: ${error.message}` 
      }
    }
    
    console.log('✅ Supabase connection test successful')
    return { success: true }
  } catch (error) {
    console.error('❌ Supabase connection test error:', error)
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
    videoId: medley.video_id,
    title: medley.title,
    creator: medley.creator || '',
    duration: medley.duration,
    songs: sortedSongs.map(convertDbRowToSongSection)
  }
}

// Direct fetch implementation to bypass Supabase client issues
async function directFetch(url: string): Promise<any> {
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
    console.log('🔍 Fetching medley data for:', videoId)

    // Get the medley using direct fetch
    const medleyData = await directFetch(
      `https://dheairurkxjftugrwdjl.supabase.co/rest/v1/medleys?select=*&video_id=eq.${videoId}`
    );

    if (!medleyData || medleyData.length === 0) {
      console.log('No medley found for video ID:', videoId)
      return null
    }

    const medley = medleyData[0];

    // Get the songs for this medley using direct fetch
    const songData = await directFetch(
      `https://dheairurkxjftugrwdjl.supabase.co/rest/v1/songs?select=*&medley_id=eq.${medley.id}&order=order_index`
    );

    console.log('✅ Successfully fetched medley data:', {
      title: medley.title,
      songCount: songData.length
    })

    return convertDbRowToMedleyData(medley as MedleyRow, (songData || []) as SongRow[])
  } catch (error) {
    console.error('❌ Error in getMedleyByVideoId:', error)
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
        console.error('Error fetching songs for medley:', medley.id, songsResult.error)
      }

      return convertDbRowToMedleyData(
        medley as MedleyRow, 
        (songsResult.data || []) as SongRow[]
      )
    })

    return await Promise.all(medleyDataPromises)
  } catch (error) {
    console.error('Error fetching all medleys:', error)
    return []
  }
}

export async function createMedley(medleyData: Omit<MedleyData, 'songs'> & { songs: Omit<SongSection, 'id'>[] }): Promise<MedleyData | null> {
  if (!supabase) {
    return null
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
    console.error('Error creating medley:', error)
    return null
  }
}

export async function updateMedley(videoId: string, updates: Partial<Omit<MedleyData, 'videoId' | 'songs'>>): Promise<MedleyData | null> {
  if (!supabase) {
    return null
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
    console.error('Error updating medley:', error)
    return null
  }
}

export async function deleteMedley(videoId: string): Promise<boolean> {
  if (!supabase) {
    return false
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
    console.error('Error deleting medley:', error)
    return false
  }
}