import { supabase, type Database } from '@/lib/supabase'
import type { MedleyData, SongSection } from '@/types'

type MedleyRow = Database['public']['Tables']['medleys']['Row']
type SongRow = Database['public']['Tables']['songs']['Row']

// Database row to app type conversion
function convertDbRowToSongSection(song: SongRow): SongSection {
  return {
    id: song.order_index, // Use order_index as the legacy id field
    title: song.title,
    artist: song.artist || '',
    startTime: song.start_time,
    endTime: song.end_time,
    color: song.color,
    genre: song.genre || '',
    originalLink: song.original_link || undefined
  }
}

function convertDbRowToMedleyData(medley: MedleyRow, songs: SongRow[]): MedleyData {
  const sortedSongs = songs.sort((a, b) => a.order_index - b.order_index)
  
  return {
    videoId: medley.video_id,
    title: medley.title,
    creator: medley.creator || '',
    duration: medley.duration,
    songs: sortedSongs.map(convertDbRowToSongSection)
  }
}

// API functions
export async function getMedleyByVideoId(videoId: string): Promise<MedleyData | null> {
  // Return null if Supabase is not configured
  if (!supabase) {
    return null
  }
  
  try {
    // Get medley data
    const { data: medley, error: medleyError } = await supabase
      .from('medleys')
      .select('*')
      .eq('video_id', videoId)
      .single()

    if (medleyError) {
      if (medleyError.code === 'PGRST116') {
        // No rows found
        return null
      }
      throw medleyError
    }

    // Get songs data
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .eq('medley_id', medley.id as string)
      .order('order_index', { ascending: true })

    if (songsError) {
      throw songsError
    }

    return convertDbRowToMedleyData(medley as MedleyRow, (songs || []) as SongRow[])
  } catch (error) {
    console.error('Error fetching medley:', error)
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

    // Get songs for each medley
    const medleyDataPromises = medleys.map(async (medley) => {
      const { data: songs, error: songsError } = await supabase!
        .from('songs')
        .select('*')
        .eq('medley_id', medley.id as string)
        .order('order_index', { ascending: true })

      if (songsError) {
        console.error('Error fetching songs for medley:', medley.id, songsError)
        return convertDbRowToMedleyData(medley as MedleyRow, [])
      }

      return convertDbRowToMedleyData(medley as MedleyRow, (songs || []) as SongRow[])
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
        duration: medleyData.duration
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
      genre: song.genre || null,
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

    // Get updated songs
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .eq('medley_id', medley.id as string)
      .order('order_index', { ascending: true })

    if (songsError) {
      throw songsError
    }

    return convertDbRowToMedleyData(medley as MedleyRow, (songs || []) as SongRow[])
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