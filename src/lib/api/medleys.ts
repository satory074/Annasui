import { supabase, type Database } from '@/lib/supabase'
import type { MedleyData, SongSection, MedleyContributor } from '@/types'
import { logger } from '@/lib/utils/logger'

type MedleyRow = Database['public']['Tables']['medleys']['Row']
type SongRow = Database['public']['Tables']['songs']['Row']

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
  // Parse links JSON field if it exists
  let links;
  try {
    links = song.links ? JSON.parse(song.links as string) : undefined;
  } catch (error) {
    logger.warn('Failed to parse song links JSON:', error);
    links = undefined;
  }

  return {
    id: song.order_index, // Use order_index as the legacy id field
    title: song.title,
    artist: song.artist || '',
    startTime: song.start_time,
    endTime: song.end_time,
    color: song.color,
    originalLink: song.original_link || undefined,
    links: links
  }
}


function convertDbRowToMedleyData(medley: MedleyRow, songs: SongRow[]): MedleyData {
  const sortedSongs = [...songs].sort((a, b) => a.order_index - b.order_index)

  // Auto-detect platform based on video_id pattern
  let platform: 'niconico' | 'youtube' = 'niconico'; // Default to niconico for backwards compatibility

  if (medley.video_id) {
    if (medley.video_id.match(/^sm\d+$/)) {
      platform = 'niconico';
    } else if (medley.video_id.match(/^[a-zA-Z0-9_-]{11}$/)) {
      platform = 'youtube';
    }
  }

  return {
    id: medley.id,
    videoId: medley.video_id,
    title: medley.title,
    creator: medley.creator || '',
    duration: medley.duration,
    platform: platform,
    createdAt: medley.created_at,
    updatedAt: medley.updated_at,
    lastEditor: (medley as Record<string, unknown>).last_editor as string | undefined,
    lastEditedAt: (medley as Record<string, unknown>).last_edited_at as string | undefined,
    songs: sortedSongs.map(convertDbRowToSongSection)
  }
}

// Direct fetch implementation using environment variables
async function directFetch(url: string): Promise<unknown> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dheairurkxjftugrwdjl.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8';
  
  logger.debug('🔍 DirectFetch environment check:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlLength: supabaseUrl.length,
    keyLength: supabaseAnonKey.length,
    isProduction: process.env.NODE_ENV === 'production'
  });

  // プロダクション環境でのネットワークタイムアウト対策（短縮）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.warn('⚠️ DirectFetch request timed out after 8 seconds:', url);
    controller.abort();
  }, 8000); // 8秒でタイムアウト（短縮）

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      logger.error(`❌ DirectFetch failed: HTTP ${response.status}: ${response.statusText}`, {
        url,
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`❌ DirectFetch timeout: ${url}`, { timeout: '12s' });
      throw new Error(`Request timeout: ${url}`);
    }
    
    logger.error(`❌ DirectFetch error: ${url}`, error);
    throw error;
  }
}

// Fetch contributors for a medley
export async function getMedleyContributors(medleyId: string): Promise<MedleyContributor[]> {
  try {
    logger.debug('🔍 Fetching contributors for medley:', medleyId)

    const contributorsData = await directFetch(
      `https://dheairurkxjftugrwdjl.supabase.co/rest/v1/medley_contributors?select=*&medley_id=eq.${medleyId}`
    ) as Array<{id: number, medley_id: number, user_id: string, name: string, email: string, avatar_url?: string, edit_count?: number, first_contribution?: string, last_contribution?: string, is_creator?: boolean}>;

    if (!contributorsData || contributorsData.length === 0) {
      logger.debug('No contributors found for medley:', medleyId)
      return []
    }

    // Convert database rows to MedleyContributor objects
    const contributors: MedleyContributor[] = contributorsData.map((contributor) => ({
      userId: contributor.user_id,
      name: contributor.name || contributor.email?.split('@')[0] || 'Anonymous',
      email: contributor.email,
      avatarUrl: contributor.avatar_url || null,
      editCount: contributor.edit_count || 0,
      firstContribution: contributor.first_contribution || '',
      lastContribution: contributor.last_contribution || '',
      isCreator: contributor.is_creator || false
    }));

    logger.debug(`✅ Found ${contributors.length} contributors for medley:`, medleyId)
    return contributors
  } catch (error) {
    // If the contributors table doesn't exist (404), that's expected behavior
    if (error instanceof Error && error.message.includes('HTTP 404')) {
      logger.debug('Contributors table not found, returning empty array')
      return []
    }
    logger.error('❌ Error fetching contributors:', error)
    return []
  }
}

// API functions
export async function getMedleyByVideoId(videoId: string): Promise<MedleyData | null> {
  try {
    logger.debug('🔍 Fetching medley data for:', videoId)


    // Try Supabase client first, fallback to direct fetch
    if (supabase) {
      try {
        logger.debug('🔧 Using Supabase client for medley fetch')
        const { data: medleys, error: medleyError } = await supabase
          .from('medleys')
          .select('*')
          .eq('video_id', videoId);

        if (medleyError) throw medleyError;
        
        if (!medleys || medleys.length === 0) {
          logger.debug('No medley found for video ID:', videoId)
          return null
        }

        const medley = medleys[0];
        
        const { data: songs, error: songsError } = await supabase
          .from('songs')
          .select('*')
          .eq('medley_id', medley.id as string)
          .order('order_index', { ascending: true });

        if (songsError) throw songsError;

        logger.debug('✅ Successfully fetched medley data via Supabase client:', {
          title: medley.title,
          songCount: songs?.length || 0
        })

        // Convert medley data
        const medleyResult = convertDbRowToMedleyData(medley as MedleyRow, (songs || []) as SongRow[])
        
        // Fetch contributors if medley has an ID
        if (medley.id) {
          const contributors = await getMedleyContributors(medley.id as string)
          medleyResult.contributors = contributors
        }

        return medleyResult
      } catch (supabaseError) {
        logger.warn('⚠️ Supabase client failed, falling back to direct fetch:', supabaseError)
      }
    }

    // Fallback to direct fetch
    logger.debug('🔧 Using direct fetch for medley data')
    const medleyDataDirect = await directFetch(
      `https://dheairurkxjftugrwdjl.supabase.co/rest/v1/medleys?select=*&video_id=eq.${videoId}`
    ) as unknown[];

    if (!medleyDataDirect || medleyDataDirect.length === 0) {
      logger.debug('No medley found for video ID:', videoId)
      return null
    }

    const medley = medleyDataDirect[0] as Record<string, unknown>;

    // Get the songs for this medley using direct fetch
    const songDataDirect = await directFetch(
      `https://dheairurkxjftugrwdjl.supabase.co/rest/v1/songs?select=*&medley_id=eq.${medley.id}&order=order_index`
    ) as unknown[];

    logger.debug('✅ Successfully fetched medley data via direct fetch:', {
      title: medley.title,
      songCount: songDataDirect.length
    })

    // Convert medley data
    const medleyResult = convertDbRowToMedleyData(medley as MedleyRow, (songDataDirect || []) as SongRow[])
    
    // Fetch contributors if medley has an ID
    if (medley.id) {
      const contributors = await getMedleyContributors(medley.id as string)
      medleyResult.contributors = contributors
    }

    return medleyResult
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

export async function createMedley(
  medleyData: Omit<MedleyData, 'songs'> & { songs: Omit<SongSection, 'id'>[] },
  editorNickname?: string
): Promise<MedleyData | null> {
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
        last_editor: editorNickname || null,
        last_edited_at: new Date().toISOString()
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
      links: song.links ? JSON.stringify(song.links) : null,
      order_index: index + 1,
      last_editor: editorNickname || null,
      last_edited_at: new Date().toISOString()
    }))

    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .insert(songsToInsert)
      .select()

    if (songsError) {
      throw songsError
    }

    // Record edit history
    if (editorNickname) {
      await recordMedleyEdit(medley.id as string, editorNickname, 'create', {
        title: medleyData.title,
        songCount: medleyData.songs.length
      })
    }

    return convertDbRowToMedleyData(medley as MedleyRow, (songs || []) as SongRow[])
  } catch (error) {
    logger.error('Error creating medley:', error)
    return null
  }
}

export async function updateMedley(
  videoId: string,
  updates: Partial<Omit<MedleyData, 'videoId' | 'songs'>> & { songs?: Omit<SongSection, 'id'>[] },
  editorNickname?: string
): Promise<MedleyData | null> {
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
        last_editor: editorNickname || null,
        last_edited_at: new Date().toISOString()
      })
      .eq('video_id', videoId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update songs if provided
    if (updates.songs) {
      const success = await saveMedleySongs(medley.id as string, updates.songs, editorNickname);
      if (!success) {
        logger.error('Failed to update songs for medley:', medley.id);
        throw new Error('Failed to update songs');
      }
      logger.info('Successfully updated songs for medley:', medley.id);
    }

    // Record edit history
    if (editorNickname) {
      await recordMedleyEdit(medley.id as string, editorNickname, 'update', {
        title: updates.title,
        songCount: updates.songs?.length
      })
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

// Songs management functions
export async function saveMedleySongs(
  medleyId: string,
  songs: Omit<SongSection, 'id'>[],
  editorNickname?: string
): Promise<boolean> {
  if (!supabase) {
    return false
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
        links: song.links ? JSON.stringify(song.links) : null,
        order_index: index + 1,
        last_editor: editorNickname || null,
        last_edited_at: new Date().toISOString()
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

// Contributor tracking functions
export async function recordMedleyEdit(
  medleyId: string,
  editorNickname: string,
  action: 'create' | 'update' | 'delete' | 'song_add' | 'song_update' | 'song_delete',
  changes?: Record<string, unknown>
): Promise<boolean> {
  if (!supabase) {
    return false
  }

  try {
    const { error } = await supabase
      .from('medley_edits')
      .insert({
        medley_id: medleyId,
        editor_nickname: editorNickname,
        action: action,
        changes: changes || null
      })

    if (error) {
      logger.error('Error recording medley edit:', error)
      return false
    }

    logger.debug(`✅ Recorded ${action} by ${editorNickname} for medley ${medleyId}`)
    return true
  } catch (error) {
    logger.error('Error recording medley edit:', error)
    return false
  }
}

export async function getMedleyContributors(medleyId: string): Promise<MedleyContributor[]> {
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .rpc('get_medley_contributors', {
        medley_uuid: medleyId,
        limit_count: 5
      })

    if (error) {
      logger.error('Error fetching contributors:', error)
      return []
    }

    return (data || []).map((row: { editor_nickname: string; edit_count: number; last_edit: string }) => ({
      nickname: row.editor_nickname,
      editCount: Number(row.edit_count),
      lastEdit: new Date(row.last_edit)
    }))
  } catch (error) {
    logger.error('Error fetching contributors:', error)
    return []
  }
}

export async function getMedleyEditHistory(medleyId: string, limit = 10): Promise<Array<{
  id: string
  editorNickname: string
  action: string
  changes: Record<string, unknown> | null
  createdAt: Date
}>> {
  if (!supabase) {
    return []
  }

  try {
    const { data, error } = await supabase
      .from('medley_edits')
      .select('*')
      .eq('medley_id', medleyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Error fetching edit history:', error)
      return []
    }

    return (data || []).map(edit => ({
      id: edit.id as string,
      editorNickname: edit.editor_nickname as string,
      action: edit.action as string,
      changes: edit.changes as Record<string, unknown> | null,
      createdAt: new Date(edit.created_at as string)
    }))
  } catch (error) {
    logger.error('Error fetching edit history:', error)
    return []
  }
}