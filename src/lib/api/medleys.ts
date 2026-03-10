import { supabase, type Database } from '@/lib/supabase'
import type { MedleyData, SongSection, MedleyContributor, MedleySnapshot } from '@/types'
import { logger } from '@/lib/utils/logger'
import { normalizeSongInfo } from '@/lib/utils/songDatabase'

type MedleyRow = Database['public']['Tables']['medleys']['Row']
type SongRow = Database['public']['Tables']['medley_songs']['Row']

// =============================================================================
// Input Validation & Sanitization
// =============================================================================

/**
 * Validate video ID format
 * - Niconico: sm/nm + digits (e.g., sm12345678, nm9876543)
 * - YouTube: 11 character alphanumeric string with dash/underscore
 */
function validateVideoId(videoId: string): { valid: boolean; error?: string } {
  if (!videoId || typeof videoId !== 'string') {
    return { valid: false, error: 'Video ID is required' }
  }

  // Niconico format: sm/nm + digits
  const niconicoPattern = /^(sm|nm)\d{1,10}$/
  // YouTube format: 11 alphanumeric characters (with dash/underscore)
  const youtubePattern = /^[a-zA-Z0-9_-]{11}$/

  if (niconicoPattern.test(videoId) || youtubePattern.test(videoId)) {
    return { valid: true }
  }

  return { valid: false, error: `Invalid video ID format: ${videoId}` }
}

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Remove null bytes and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

/**
 * Validate and sanitize URL
 * Only allows http/https protocols and specific domains for music services
 */
function validateAndSanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    return null
  }

  // Check for valid URL format
  try {
    const parsedUrl = new URL(trimmedUrl)

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      logger.warn('Invalid URL protocol:', parsedUrl.protocol)
      return null
    }

    // Whitelist of allowed domains for music service links
    const allowedDomains = [
      'nicovideo.jp', 'www.nicovideo.jp', 'nico.ms',
      'youtube.com', 'www.youtube.com', 'youtu.be',
      'spotify.com', 'open.spotify.com',
      'music.apple.com', 'apple.co'
    ]

    const hostname = parsedUrl.hostname.toLowerCase()
    const isAllowed = allowedDomains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    )

    if (!isAllowed) {
      logger.warn('URL domain not in whitelist:', hostname)
      return null
    }

    return trimmedUrl
  } catch {
    logger.warn('Invalid URL format:', trimmedUrl)
    return null
  }
}

/**
 * Sanitize song data for database insertion
 */
function sanitizeSongData(song: Omit<SongSection, 'id'>): Omit<SongSection, 'id'> {
  return {
    ...song,
    title: sanitizeString(song.title) || 'Untitled',
    artist: Array.isArray(song.artist)
      ? song.artist.map(a => sanitizeString(a)).filter(a => a !== '')
      : [sanitizeString(song.artist as unknown as string) || 'Unknown Artist'],
    composers: song.composers?.map(c => sanitizeString(c)).filter(c => c !== ''),
    arrangers: song.arrangers?.map(a => sanitizeString(a)).filter(a => a !== ''),
    niconicoLink: validateAndSanitizeUrl(song.niconicoLink) || undefined,
    youtubeLink: validateAndSanitizeUrl(song.youtubeLink) || undefined,
    spotifyLink: validateAndSanitizeUrl(song.spotifyLink) || undefined,
    applemusicLink: validateAndSanitizeUrl(song.applemusicLink) || undefined
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
  // Convert artist from comma-separated string to array
  const artistArray = song.artist ? song.artist.split(',').map(a => a.trim()).filter(a => a !== '') : [];

  // Convert composers from comma-separated string to array
  const composersArray = song.composers ? song.composers.split(',').map(c => c.trim()).filter(c => c !== '') : [];

  // Convert arrangers from comma-separated string to array
  const arrangersArray = song.arrangers ? song.arrangers.split(',').map(a => a.trim()).filter(a => a !== '') : [];

  return {
    id: song.order_index, // Use order_index as the legacy id field
    songId: song.song_id || undefined, // song_master.id (UUID) への参照
    title: song.title,
    artist: artistArray.length > 0 ? artistArray : ['Unknown Artist'],
    composers: composersArray.length > 0 ? composersArray : undefined,
    arrangers: arrangersArray.length > 0 ? arrangersArray : undefined,
    startTime: song.start_time,
    endTime: song.end_time,
    color: song.color,
    niconicoLink: song.niconico_link || undefined,
    youtubeLink: song.youtube_link || undefined,
    spotifyLink: song.spotify_link || undefined,
    applemusicLink: song.applemusic_link || undefined
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
    bpm: (medley as Record<string, unknown>).bpm as number | undefined || undefined,
    beatOffset: (medley as Record<string, unknown>).beat_offset as number | undefined || undefined,
    platform: medley.platform as 'niconico' | 'youtube',
    createdAt: medley.created_at,
    updatedAt: medley.updated_at,
    lastEditor: medley.last_editor || undefined,
    lastEditedAt: medley.last_edited_at || undefined,
    songs: sortedSongs.map(convertDbRowToSongSection)
  }
}

// Build Supabase REST API URL with proper escaping
function buildSupabaseRestUrl(table: string, params: Record<string, string>): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
  }

  const url = new URL(`${supabaseUrl}/rest/v1/${table}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })
  return url.toString()
}

// Direct fetch implementation using environment variables only (no hardcoded fallbacks)
async function directFetch(url: string): Promise<unknown> {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is not set')
  }

  logger.debug('🔍 DirectFetch environment check:', {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!supabaseAnonKey,
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

// API functions
export async function getMedleyByVideoId(videoId: string): Promise<MedleyData | null> {
  // Validate video ID format
  const validation = validateVideoId(videoId)
  if (!validation.valid) {
    logger.warn('🚫 Invalid video ID:', validation.error)
    return null
  }

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

        const medley = medleys[0] as MedleyRow;

        const { data: songs, error: songsError } = await supabase
          .from('medley_songs')
          .select('*')
          .eq('medley_id', medley.id)
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

    // Fallback to direct fetch with proper URL escaping
    logger.debug('🔧 Using direct fetch for medley data')
    const medleyDataDirect = await directFetch(
      buildSupabaseRestUrl('medleys', { select: '*', video_id: `eq.${videoId}` })
    ) as unknown[];

    if (!medleyDataDirect || medleyDataDirect.length === 0) {
      logger.debug('No medley found for video ID:', videoId)
      return null
    }

    const medley = medleyDataDirect[0] as Record<string, unknown>;

    // Get the songs for this medley using direct fetch with proper URL escaping
    const songDataDirect = await directFetch(
      buildSupabaseRestUrl('medley_songs', { select: '*', medley_id: `eq.${medley.id}`, order: 'order_index' })
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
    const medleyDataPromises = (medleys as MedleyRow[]).map(async (medley) => {
      const songsResult = await
        supabase!
          .from('medley_songs')
          .select('*')
          .eq('medley_id', medley.id)
          .order('order_index', { ascending: true })

      if (songsResult.error) {
        logger.error('Error fetching songs for medley:', medley.id, songsResult.error)
      }

      return convertDbRowToMedleyData(
        medley, 
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

  // Validate video ID
  const validation = validateVideoId(medleyData.videoId)
  if (!validation.valid) {
    logger.warn('🚫 Invalid video ID in createMedley:', validation.error)
    return null
  }

  // Sanitize input data
  const sanitizedTitle = sanitizeString(medleyData.title) || 'Untitled Medley'
  const sanitizedCreator = sanitizeString(medleyData.creator) || ''
  const sanitizedEditorNickname = editorNickname ? sanitizeString(editorNickname) : undefined
  const sanitizedSongs = medleyData.songs.map(song => sanitizeSongData(song))

  try {
    // Insert medley
    const { data: medley, error: medleyError } = await supabase
      .from('medleys')
      .insert({
        video_id: medleyData.videoId,
        title: sanitizedTitle,
        creator: sanitizedCreator || null,
        duration: medleyData.duration,
        last_editor: sanitizedEditorNickname || null,
        last_edited_at: new Date().toISOString()
      })
      .select()
      .single()

    if (medleyError) {
      throw medleyError
    }

    // Look up song_master IDs for songs
    const songIdMap = await lookupSongIds(sanitizedSongs.map(s => ({ title: s.title, artist: Array.isArray(s.artist) ? s.artist.join(", ") : (s.artist || '') })));

    // Insert songs
    const songsToInsert = sanitizedSongs.map((song, index) => {
      const artistStr = Array.isArray(song.artist) ? song.artist.join(", ") : (song.artist || '');
      const composersStr = song.composers && song.composers.length > 0 ? song.composers.join(", ") : null;
      const arrangersStr = song.arrangers && song.arrangers.length > 0 ? song.arrangers.join(", ") : null;
      const normalizedId = normalizeSongInfo(song.title, artistStr);
      const songId = songIdMap.get(normalizedId) || null;

      if (songId) {
        logger.debug(`🔗 Linking new song "${song.title}" to song_master: ${songId}`);
      }

      return {
        medley_id: medley.id as string,
        song_id: songId,  // Link to song_master if exists
        title: song.title,
        artist: artistStr,
        composers: composersStr,
        arrangers: arrangersStr,
        start_time: song.startTime,
        end_time: song.endTime,
        color: song.color,
        niconico_link: song.niconicoLink || null,
        youtube_link: song.youtubeLink || null,
        spotify_link: song.spotifyLink || null,
        applemusic_link: song.applemusicLink || null,
        order_index: index + 1,
        last_editor: editorNickname || null,
        last_edited_at: new Date().toISOString()
      };
    })

    const { error: songsError } = await supabase
      .from('medley_songs')
      .insert(songsToInsert)

    if (songsError) {
      throw songsError
    }

    // Record edit history
    if (sanitizedEditorNickname) {
      await recordMedleyEdit(medley.id as string, sanitizedEditorNickname, 'create_medley', {
        title: sanitizedTitle,
        songCount: sanitizedSongs.length
      })
    }

    // Convert the inserted songs data to SongRow format for the return value
    const songRows: SongRow[] = songsToInsert.map((song, index) => ({
      ...song,
      id: `temp-${index}`, // Temporary ID since we didn't select back from DB
      song_id: null, // New songs don't have a song_master reference yet
      created_at: song.last_edited_at || new Date().toISOString(),
      updated_at: song.last_edited_at || new Date().toISOString()
    }))

    return convertDbRowToMedleyData(medley as MedleyRow, songRows)
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

  // Validate video ID
  const validation = validateVideoId(videoId)
  if (!validation.valid) {
    logger.warn('🚫 Invalid video ID in updateMedley:', validation.error)
    return null
  }

  // Sanitize input data
  const sanitizedTitle = updates.title ? sanitizeString(updates.title) : undefined
  const sanitizedCreator = updates.creator !== undefined ? sanitizeString(updates.creator) : undefined
  const sanitizedEditorNickname = editorNickname ? sanitizeString(editorNickname) : undefined
  const sanitizedSongs = updates.songs ? updates.songs.map(song => sanitizeSongData(song)) : undefined

  try {
    const { data: medley, error } = await supabase
      .from('medleys')
      .update({
        title: sanitizedTitle,
        creator: sanitizedCreator,
        duration: updates.duration,
        last_editor: sanitizedEditorNickname || null,
        last_edited_at: new Date().toISOString()
      })
      .eq('video_id', videoId)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update songs if provided
    if (sanitizedSongs) {
      logger.debug('🔍 updateMedley: About to save songs', {
        medleyId: medley.id,
        songsCount: sanitizedSongs.length,
        songs: sanitizedSongs
      });
      const medleyInfo = {
        title: (sanitizedTitle ?? medley.title) as string,
        creator: (sanitizedCreator ?? medley.creator ?? undefined) as string | undefined,
        duration: (updates.duration ?? medley.duration) as number
      };
      const success = await saveMedleySongs(medley.id as string, sanitizedSongs, sanitizedEditorNickname, medleyInfo);
      if (!success) {
        logger.error('Failed to update songs for medley:', medley.id);
        throw new Error('Failed to update songs');
      }
      logger.info('Successfully updated songs for medley:', medley.id);
    }

    // Note: Edit history is now recorded in saveMedleySongs() with snapshot
    // This prevents duplicate entries and ensures snapshot is included for restoration

    // Get updated data
    const songsResult = await supabase
      .from('medley_songs')
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
        .from('medley_songs')
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

// Call counter for saveMedleySongs (module-level)
let saveMedleySongsCallCount = 0;

// Helper function to look up song_master IDs for a batch of songs
async function lookupSongIds(songs: Array<{ title: string; artist: string }>): Promise<Map<string, string>> {
  if (!supabase) {
    return new Map();
  }

  try {
    // Calculate normalized IDs for all songs
    const normalizedIds = songs.map(song => normalizeSongInfo(song.title, song.artist || ''));
    const uniqueNormalizedIds = [...new Set(normalizedIds)];

    logger.debug('🔍 Looking up song_master IDs for normalized_ids:', uniqueNormalizedIds);

    // Query song_master for all normalized IDs in one query
    const { data: masterSongs, error } = await supabase
      .from('song_master')
      .select('id, normalized_id')
      .in('normalized_id', uniqueNormalizedIds);

    if (error) {
      logger.warn('Failed to lookup song_master IDs:', error);
      return new Map();
    }

    // Create a map: normalized_id -> song_master UUID
    const idMap = new Map<string, string>();
    (masterSongs || []).forEach((song) => {
      const normalizedId = song.normalized_id as string;
      const songId = song.id as string;
      idMap.set(normalizedId, songId);
    });

    logger.info(`✅ Found ${idMap.size} song_master matches out of ${uniqueNormalizedIds.length} songs`);
    return idMap;
  } catch (error) {
    logger.error('Error looking up song_master IDs:', error);
    return new Map();
  }
}

// Songs management functions
export async function saveMedleySongs(
  medleyId: string,
  songs: Omit<SongSection, 'id'>[],
  editorNickname?: string,
  medleyInfo?: { title: string; creator?: string; duration: number }
): Promise<boolean> {
  saveMedleySongsCallCount++;
  const callId = `SAVE-${saveMedleySongsCallCount}`;

  if (!supabase) {
    return false
  }

  // Sanitize all song data for safety (even if already sanitized by caller)
  const sanitizedSongs = songs.map(song => sanitizeSongData(song))
  const sanitizedEditorNickname = editorNickname ? sanitizeString(editorNickname) : undefined

  try {
    logger.info(`🗄️ [${callId}] saveMedleySongs called`, {
      callNumber: saveMedleySongsCallCount,
      medleyId,
      songsCount: sanitizedSongs.length,
      songs: sanitizedSongs.map(s => ({ title: s.title, artist: Array.isArray(s.artist) ? s.artist.join(", ") : s.artist, start: s.startTime, end: s.endTime })),
      editorNickname: sanitizedEditorNickname,
      timestamp: new Date().toISOString()
    });

    logger.info(`🗑️ [${callId}] Executing DELETE for medley:`, medleyId);
    // Delete existing songs for this medley
    const deleteStartTime = Date.now();
    const { error: deleteError } = await supabase
      .from('medley_songs')
      .delete()
      .eq('medley_id', medleyId)

    if (deleteError) {
      logger.error(`❌ [${callId}] DELETE failed:`, deleteError);
      throw deleteError
    }

    const deleteDuration = Date.now() - deleteStartTime;
    logger.info(`✅ [${callId}] DELETE completed in ${deleteDuration}ms`);

    // Insert new songs
    if (sanitizedSongs.length > 0) {
      logger.info(`📝 [${callId}] Preparing to INSERT ${sanitizedSongs.length} songs`);

      // Filter songs that don't have songId for lookup
      const songsNeedingLookup = sanitizedSongs.filter(s => !s.songId).map(s => ({
        title: s.title,
        artist: Array.isArray(s.artist) ? s.artist.join(", ") : (s.artist || '')
      }));

      // Look up song_master IDs only for songs that don't already have songId
      const songIdMap = songsNeedingLookup.length > 0
        ? await lookupSongIds(songsNeedingLookup)
        : new Map<string, string>();

      const songsToInsert = sanitizedSongs.map((song, index) => {
        const artistStr = Array.isArray(song.artist) ? song.artist.join(", ") : (song.artist || '');
        const composersStr = song.composers && song.composers.length > 0 ? song.composers.join(", ") : null;
        const arrangersStr = song.arrangers && song.arrangers.length > 0 ? song.arrangers.join(", ") : null;

        // Use existing songId if available, otherwise lookup by normalized_id
        let songId: string | null = null;
        if (song.songId) {
          songId = song.songId;
          logger.debug(`🔗 [${callId}] Using existing songId for "${song.title}": ${songId}`);
        } else {
          const normalizedId = normalizeSongInfo(song.title, artistStr);
          songId = songIdMap.get(normalizedId) || null;
          if (songId) {
            logger.debug(`🔗 [${callId}] Linked song "${song.title}" to song_master via lookup: ${songId}`);
          }
        }

        return {
          medley_id: medleyId,
          song_id: songId,  // Link to song_master if exists
          title: song.title,
          artist: artistStr,
          composers: composersStr,
          arrangers: arrangersStr,
          start_time: song.startTime,
          end_time: song.endTime,
          color: song.color,
          niconico_link: song.niconicoLink || null,
          youtube_link: song.youtubeLink || null,
          spotify_link: song.spotifyLink || null,
          applemusic_link: song.applemusicLink || null,
          order_index: index + 1,  // Re-added: database requires this field for ordering
          last_editor: sanitizedEditorNickname || null,
          last_edited_at: new Date().toISOString()
        };
      })

      logger.info(`📤 [${callId}] Executing INSERT for ${songsToInsert.length} songs`, {
        songs: songsToInsert.map(s => ({ title: s.title, artist: s.artist, order: s.order_index }))
      });

      const insertStartTime = Date.now();
      const { error: insertError } = await supabase
        .from('medley_songs')
        .insert(songsToInsert)

      if (insertError) {
        logger.error(`❌ [${callId}] INSERT failed:`, insertError);
        throw insertError
      }

      const insertDuration = Date.now() - insertStartTime;
      logger.info(`✅ [${callId}] INSERT completed in ${insertDuration}ms - ${songsToInsert.length} songs saved`);
    } else {
      logger.warn(`⚠️ [${callId}] No songs to insert (songs.length = 0)`);
    }

    // Record snapshot in edit history
    if (sanitizedEditorNickname && medleyInfo) {
      const snapshot: MedleySnapshot = {
        title: medleyInfo.title,
        creator: medleyInfo.creator,
        duration: medleyInfo.duration,
        songs: sanitizedSongs
      };
      await recordMedleyEdit(medleyId, sanitizedEditorNickname, 'update_medley', {
        snapshot,
        songCount: songs.length
      });
      logger.info(`📸 [${callId}] Snapshot recorded in edit history`);
    }

    logger.info(`✅ [${callId}] saveMedleySongs completed successfully`)
    return true
  } catch (error) {
    logger.error(`❌ [${callId}] Error saving medley songs:`, error)
    return false
  }
}

// Contributor tracking functions
export async function recordMedleyEdit(
  medleyId: string,
  editorNickname: string,
  action: 'create_medley' | 'update_medley' | 'delete_medley' | 'add_song' | 'update_song' | 'delete_song' | 'reorder_songs',
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

    const contributors = data as Array<{ editor_nickname: string; edit_count: number; last_edit: string }> | null
    return (contributors || []).map((row) => ({
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

// Restore medley from edit history snapshot
export async function restoreFromEditHistory(
  editHistoryId: string,
  editorNickname: string
): Promise<MedleyData | null> {
  if (!supabase) {
    logger.error('Supabase client not initialized')
    return null
  }

  try {
    logger.info('🔄 Starting restore from edit history:', editHistoryId)

    // Get the edit history entry
    const { data: editHistory, error: historyError } = await supabase
      .from('medley_edits')
      .select('*')
      .eq('id', editHistoryId)
      .single()

    if (historyError) {
      logger.error('Error fetching edit history:', historyError)
      return null
    }

    if (!editHistory) {
      logger.error('Edit history not found:', editHistoryId)
      return null
    }

    // Extract snapshot from changes
    const changes = editHistory.changes as Record<string, unknown> | null
    const snapshot = changes?.snapshot as MedleySnapshot | undefined

    if (!snapshot) {
      logger.error('No snapshot found in edit history:', editHistoryId)
      return null
    }

    const medleyId = editHistory.medley_id as string

    logger.info('📸 Snapshot found, restoring medley:', {
      medleyId,
      songCount: snapshot.songs.length,
      title: snapshot.title
    })

    // Get current medley data
    const { data: currentMedley, error: medleyError } = await supabase
      .from('medleys')
      .select('*')
      .eq('id', medleyId)
      .single()

    if (medleyError) {
      logger.error('Error fetching current medley:', medleyError)
      return null
    }

    // Update medley metadata
    const { error: updateError } = await supabase
      .from('medleys')
      .update({
        title: snapshot.title,
        creator: snapshot.creator || null,
        duration: snapshot.duration,
        last_editor: editorNickname,
        last_edited_at: new Date().toISOString()
      })
      .eq('id', medleyId)

    if (updateError) {
      logger.error('Error updating medley metadata:', updateError)
      return null
    }

    // Restore songs using saveMedleySongs
    const medleyInfo = {
      title: snapshot.title,
      creator: snapshot.creator,
      duration: snapshot.duration
    }

    const success = await saveMedleySongs(medleyId, snapshot.songs, editorNickname, medleyInfo)

    if (!success) {
      logger.error('Failed to restore songs')
      return null
    }

    // Note: Edit history is recorded by saveMedleySongs() with snapshot
    // This prevents duplicate entries and ensures the restored state is recorded properly

    logger.info('✅ Successfully restored medley from edit history')

    // Fetch and return the restored data
    const restoredData = await getMedleyByVideoId(currentMedley.video_id as string)
    return restoredData
  } catch (error) {
    logger.error('Error restoring from edit history:', error)
    return null
  }
}