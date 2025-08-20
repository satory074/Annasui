import { supabase, type Database } from '@/lib/supabase'
import type { MedleyData, SongSection, TempoChange } from '@/types'

type MedleyRow = Database['public']['Tables']['medleys']['Row'] & {
  initial_bpm?: number
}
type SongRow = Database['public']['Tables']['songs']['Row']

// Manual type definition for tempo_changes table (not yet in generated types)
type TempoChangeRow = {
  id: string
  medley_id: string
  time: number
  bpm: number
  created_at: string
  updated_at: string
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
    genre: song.genre || '',
    originalLink: song.original_link || undefined
  }
}

function convertDbRowToTempoChange(tempoChange: TempoChangeRow): TempoChange {
  return {
    time: tempoChange.time,
    bpm: tempoChange.bpm
  }
}

function convertDbRowToMedleyData(medley: MedleyRow, songs: SongRow[], tempoChanges: TempoChangeRow[] = []): MedleyData {
  const sortedSongs = songs.sort((a, b) => a.order_index - b.order_index)
  const sortedTempoChanges = tempoChanges.sort((a, b) => a.time - b.time)
  
  return {
    videoId: medley.video_id,
    title: medley.title,
    creator: medley.creator || '',
    duration: medley.duration,
    songs: sortedSongs.map(convertDbRowToSongSection),
    initialBpm: medley.initial_bpm || 120,
    tempoChanges: sortedTempoChanges.map(convertDbRowToTempoChange)
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

    // Get tempo changes data
    const { data: tempoChanges, error: tempoError } = await supabase
      .from('tempo_changes')
      .select('*')
      .eq('medley_id', medley.id as string)
      .order('time', { ascending: true })

    if (tempoError) {
      throw tempoError
    }

    return convertDbRowToMedleyData(medley as MedleyRow, (songs || []) as SongRow[], (tempoChanges || []) as TempoChangeRow[])
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

    // Get songs and tempo changes for each medley
    const medleyDataPromises = medleys.map(async (medley) => {
      const [songsResult, tempoResult] = await Promise.all([
        supabase!
          .from('songs')
          .select('*')
          .eq('medley_id', medley.id as string)
          .order('order_index', { ascending: true }),
        supabase!
          .from('tempo_changes')
          .select('*')
          .eq('medley_id', medley.id as string)
          .order('time', { ascending: true })
      ])

      if (songsResult.error) {
        console.error('Error fetching songs for medley:', medley.id, songsResult.error)
      }
      
      if (tempoResult.error) {
        console.error('Error fetching tempo changes for medley:', medley.id, tempoResult.error)
      }

      return convertDbRowToMedleyData(
        medley as MedleyRow, 
        (songsResult.data || []) as SongRow[], 
        (tempoResult.data || []) as TempoChangeRow[]
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
        initial_bpm: medleyData.initialBpm || 120
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

    // Insert tempo changes (including automatic start position)
    const tempoChangesToInsert = []
    
    // Always add start position tempo change
    tempoChangesToInsert.push({
      medley_id: medley.id as string,
      time: 0,
      bpm: medleyData.initialBpm || 120
    })
    
    // Add additional tempo changes (excluding time 0 if present to avoid duplicates)
    if (medleyData.tempoChanges) {
      const additionalChanges = medleyData.tempoChanges
        .filter(change => change.time > 0)
        .map(change => ({
          medley_id: medley.id as string,
          time: change.time,
          bpm: change.bpm
        }))
      tempoChangesToInsert.push(...additionalChanges)
    }

    const { data: tempoChanges, error: tempoError } = await supabase
      .from('tempo_changes')
      .insert(tempoChangesToInsert)
      .select()

    if (tempoError) {
      throw tempoError
    }

    return convertDbRowToMedleyData(medley as MedleyRow, (songs || []) as SongRow[], (tempoChanges || []) as TempoChangeRow[])
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
        duration: updates.duration,
        initial_bpm: updates.initialBpm
      })
      .eq('video_id', videoId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update tempo changes if provided
    if (updates.tempoChanges !== undefined) {
      // Delete existing tempo changes
      await supabase
        .from('tempo_changes')
        .delete()
        .eq('medley_id', medley.id as string)

      // Insert new tempo changes (including automatic start position)
      const tempoChangesToInsert = []
      
      // Always add start position tempo change
      tempoChangesToInsert.push({
        medley_id: medley.id as string,
        time: 0,
        bpm: updates.initialBpm || 120
      })
      
      // Add additional tempo changes (excluding time 0 if present to avoid duplicates)
      const additionalChanges = updates.tempoChanges
        .filter(change => change.time > 0)
        .map(change => ({
          medley_id: medley.id as string,
          time: change.time,
          bpm: change.bpm
        }))
      tempoChangesToInsert.push(...additionalChanges)

      await supabase
        .from('tempo_changes')
        .insert(tempoChangesToInsert)
    }

    // Get updated data
    const [songsResult, tempoResult] = await Promise.all([
      supabase
        .from('songs')
        .select('*')
        .eq('medley_id', medley.id as string)
        .order('order_index', { ascending: true }),
      supabase
        .from('tempo_changes')
        .select('*')
        .eq('medley_id', medley.id as string)
        .order('time', { ascending: true })
    ])

    if (songsResult.error) {
      throw songsResult.error
    }
    
    if (tempoResult.error) {
      throw tempoResult.error
    }

    return convertDbRowToMedleyData(
      medley as MedleyRow, 
      (songsResult.data || []) as SongRow[], 
      (tempoResult.data || []) as TempoChangeRow[]
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