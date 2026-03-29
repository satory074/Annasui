import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/utils/logger";
import type {
  StatsOverviewData,
  SongStatsRow,
  ArtistStatsRow,
  MedleyStatsRow,
  CoOccurrencePair,
  ArtistPair,
  PositionData,
  DiversityScore,
  RawStatsData,
  MedleyRow,
  MedleySongRow,
  SongMasterRow,
  ArtistRow,
  SongArtistRelationRow,
  MedleyEditRow,
} from "@/features/stats/types";

// =============================================================================
// Raw Data Fetchers
// =============================================================================

async function fetchAllMedleys(): Promise<MedleyRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("medleys").select("*");
  if (error) {
    logger.error("Failed to fetch medleys for stats", error);
    return [];
  }
  return (data as unknown as MedleyRow[]) ?? [];
}

async function fetchAllMedleySongs(): Promise<MedleySongRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("medley_songs").select("*");
  if (error) {
    logger.error("Failed to fetch medley_songs for stats", error);
    return [];
  }
  return (data as unknown as MedleySongRow[]) ?? [];
}

async function fetchAllSongMaster(): Promise<SongMasterRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("song_master").select("*");
  if (error) {
    logger.error("Failed to fetch song_master for stats", error);
    return [];
  }
  return (data as unknown as SongMasterRow[]) ?? [];
}

async function fetchAllArtists(): Promise<ArtistRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("artists").select("*");
  if (error) {
    logger.error("Failed to fetch artists for stats", error);
    return [];
  }
  return (data as unknown as ArtistRow[]) ?? [];
}

async function fetchAllSongArtistRelations(): Promise<SongArtistRelationRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("song_artist_relations").select("*");
  if (error) {
    logger.error("Failed to fetch song_artist_relations for stats", error);
    return [];
  }
  return (data as unknown as SongArtistRelationRow[]) ?? [];
}

async function fetchAllMedleyEdits(): Promise<MedleyEditRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("medley_edits").select("*");
  if (error) {
    logger.error("Failed to fetch medley_edits for stats", error);
    return [];
  }
  return (data as unknown as MedleyEditRow[]) ?? [];
}

// =============================================================================
// getAllRawData — for Explorer tab
// =============================================================================

export async function getAllRawData(): Promise<RawStatsData> {
  const [medleys, medleySongs, songMaster, artists, songArtistRelations, medleyEdits] =
    await Promise.all([
      fetchAllMedleys(),
      fetchAllMedleySongs(),
      fetchAllSongMaster(),
      fetchAllArtists(),
      fetchAllSongArtistRelations(),
      fetchAllMedleyEdits(),
    ]);

  return { medleys, medleySongs, songMaster, artists, songArtistRelations, medleyEdits };
}

// =============================================================================
// getStatsOverview
// =============================================================================

export async function getStatsOverview(): Promise<StatsOverviewData> {
  const raw = await getAllRawData();

  // Platform counts
  const platformMap = new Map<string, number>();
  for (const m of raw.medleys) {
    platformMap.set(m.platform, (platformMap.get(m.platform) ?? 0) + 1);
  }
  const platformCounts = Array.from(platformMap.entries()).map(([platform, count]) => ({
    platform,
    count,
  }));

  // Growth data (monthly)
  const monthMap = new Map<string, { medleys: number; songs: number }>();
  for (const m of raw.medleys) {
    const month = m.created_at.slice(0, 7); // YYYY-MM
    const entry = monthMap.get(month) ?? { medleys: 0, songs: 0 };
    entry.medleys++;
    monthMap.set(month, entry);
  }
  for (const s of raw.songMaster) {
    const month = s.created_at.slice(0, 7);
    const entry = monthMap.get(month) ?? { medleys: 0, songs: 0 };
    entry.songs++;
    monthMap.set(month, entry);
  }
  const growthData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  // Top songs by usage count
  const songUsage = new Map<string, { title: string; artist: string; count: number }>();
  // Build artist map from relations
  const artistMap = buildArtistMap(raw.songArtistRelations, raw.artists);

  for (const ms of raw.medleySongs) {
    if (!ms.song_id) continue;
    const existing = songUsage.get(ms.song_id);
    if (existing) {
      existing.count++;
    } else {
      const master = raw.songMaster.find((s) => s.id === ms.song_id);
      const artistNames = artistMap.get(ms.song_id) ?? ms.artist;
      songUsage.set(ms.song_id, {
        title: master?.title ?? ms.title,
        artist: artistNames,
        count: 1,
      });
    }
  }
  const topSongs = Array.from(songUsage.entries())
    .map(([songId, data]) => ({
      songId,
      title: data.title,
      artist: data.artist,
      usageCount: data.count,
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);

  // Unique contributors
  const contributors = new Set<string>();
  for (const e of raw.medleyEdits) {
    if (e.editor_nickname) contributors.add(e.editor_nickname);
  }

  return {
    totalMedleys: raw.medleys.length,
    totalSongs: raw.songMaster.length,
    totalSongSections: raw.medleySongs.length,
    totalArtists: raw.artists.length,
    totalContributors: contributors.size,
    platformCounts,
    growthData,
    topSongs,
  };
}

// =============================================================================
// getSongStats
// =============================================================================

export async function getSongStats(): Promise<SongStatsRow[]> {
  const [medleySongs, songMaster, songArtistRelations, artists] = await Promise.all([
    fetchAllMedleySongs(),
    fetchAllSongMaster(),
    fetchAllSongArtistRelations(),
    fetchAllArtists(),
  ]);

  const artistMap = buildArtistMap(songArtistRelations, artists);

  // Group medley_songs by song_id
  const songGroups = new Map<
    string,
    { title: string; durations: number[]; platforms: Set<string> }
  >();

  for (const ms of medleySongs) {
    if (!ms.song_id) continue;
    const group = songGroups.get(ms.song_id) ?? {
      title: "",
      durations: [],
      platforms: new Set<string>(),
    };
    if (!group.title) {
      const master = songMaster.find((s) => s.id === ms.song_id);
      group.title = master?.title ?? ms.title;
    }
    group.durations.push(ms.end_time - ms.start_time);
    if (ms.niconico_link) group.platforms.add("niconico");
    if (ms.youtube_link) group.platforms.add("youtube");
    if (ms.spotify_link) group.platforms.add("spotify");
    if (ms.applemusic_link) group.platforms.add("applemusic");
    songGroups.set(ms.song_id, group);
  }

  return Array.from(songGroups.entries()).map(([songId, group]) => ({
    songId,
    title: group.title,
    artist: artistMap.get(songId) ?? "Unknown Artist",
    usageCount: group.durations.length,
    avgDuration:
      group.durations.length > 0
        ? Math.round(
            (group.durations.reduce((a, b) => a + b, 0) / group.durations.length) * 10
          ) / 10
        : 0,
    platforms: Array.from(group.platforms),
  }));
}

// =============================================================================
// getArtistStats
// =============================================================================

export async function getArtistStats(): Promise<ArtistStatsRow[]> {
  const [medleySongs, artists, songArtistRelations] = await Promise.all([
    fetchAllMedleySongs(),
    fetchAllArtists(),
    fetchAllSongArtistRelations(),
  ]);

  // Build artist → songs map
  const artistSongs = new Map<string, { songIds: Set<string>; roles: Map<string, number> }>();
  for (const rel of songArtistRelations) {
    const entry = artistSongs.get(rel.artist_id) ?? {
      songIds: new Set<string>(),
      roles: new Map<string, number>(),
    };
    entry.songIds.add(rel.song_id);
    entry.roles.set(rel.role, (entry.roles.get(rel.role) ?? 0) + 1);
    artistSongs.set(rel.artist_id, entry);
  }

  // Build song_id → medley_ids map for medley appearance counting
  const songToMedleys = new Map<string, Set<string>>();
  for (const ms of medleySongs) {
    if (!ms.song_id) continue;
    const medleyIds = songToMedleys.get(ms.song_id) ?? new Set<string>();
    medleyIds.add(ms.medley_id);
    songToMedleys.set(ms.song_id, medleyIds);
  }

  return artists.map((artist) => {
    const data = artistSongs.get(artist.id);
    const songIds = data?.songIds ?? new Set<string>();

    // Count distinct medleys this artist appears in
    const medleyIds = new Set<string>();
    for (const songId of songIds) {
      const mIds = songToMedleys.get(songId);
      if (mIds) {
        for (const mid of mIds) medleyIds.add(mid);
      }
    }

    const roles = data?.roles
      ? Array.from(data.roles.entries()).map(([role, count]) => ({ role, count }))
      : [];

    return {
      artistId: artist.id,
      name: artist.name,
      songCount: songIds.size,
      medleyAppearances: medleyIds.size,
      roles,
    };
  });
}

// =============================================================================
// getMedleyStats
// =============================================================================

export async function getMedleyStats(): Promise<MedleyStatsRow[]> {
  const [medleys, medleySongs, medleyEdits] = await Promise.all([
    fetchAllMedleys(),
    fetchAllMedleySongs(),
    fetchAllMedleyEdits(),
  ]);

  // Song count per medley
  const songCountMap = new Map<string, number>();
  for (const ms of medleySongs) {
    songCountMap.set(ms.medley_id, (songCountMap.get(ms.medley_id) ?? 0) + 1);
  }

  // Edit count per medley
  const editCountMap = new Map<string, number>();
  for (const e of medleyEdits) {
    if (e.medley_id) {
      editCountMap.set(e.medley_id, (editCountMap.get(e.medley_id) ?? 0) + 1);
    }
  }

  return medleys.map((m) => ({
    medleyId: m.id,
    videoId: m.video_id,
    title: m.title,
    platform: m.platform,
    creator: m.creator ?? "",
    songCount: songCountMap.get(m.id) ?? 0,
    duration: m.duration,
    editCount: editCountMap.get(m.id) ?? 0,
    createdAt: m.created_at,
  }));
}

// =============================================================================
// Insight: Song Co-occurrence
// =============================================================================

export async function getSongCoOccurrence(): Promise<CoOccurrencePair[]> {
  const medleySongs = await fetchAllMedleySongs();

  // Group songs by medley
  const medleyGroups = new Map<string, string[]>();
  for (const ms of medleySongs) {
    const titles = medleyGroups.get(ms.medley_id) ?? [];
    titles.push(ms.title);
    medleyGroups.set(ms.medley_id, titles);
  }

  // Count pair co-occurrences
  const pairCounts = new Map<string, number>();
  for (const titles of medleyGroups.values()) {
    const unique = [...new Set(titles)];
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = [unique[i], unique[j]].sort().join("|||");
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(pairCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => {
      const [songA, songB] = key.split("|||");
      return { songA, songB, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// =============================================================================
// Insight: Artist Co-occurrence in Medleys
// =============================================================================

export async function getArtistCoOccurrence(): Promise<ArtistPair[]> {
  const [medleySongs, songArtistRelations, artists] = await Promise.all([
    fetchAllMedleySongs(),
    fetchAllSongArtistRelations(),
    fetchAllArtists(),
  ]);

  const artistNameMap = new Map<string, string>();
  for (const a of artists) {
    artistNameMap.set(a.id, a.name);
  }

  // song_id → artist names
  const songArtists = new Map<string, Set<string>>();
  for (const rel of songArtistRelations) {
    if (rel.role !== "artist") continue;
    const names = songArtists.get(rel.song_id) ?? new Set<string>();
    const name = artistNameMap.get(rel.artist_id);
    if (name) names.add(name);
    songArtists.set(rel.song_id, names);
  }

  // medley → artist names
  const medleyArtists = new Map<string, Set<string>>();
  for (const ms of medleySongs) {
    if (!ms.song_id) continue;
    const names = songArtists.get(ms.song_id);
    if (!names) continue;
    const existing = medleyArtists.get(ms.medley_id) ?? new Set<string>();
    for (const name of names) existing.add(name);
    medleyArtists.set(ms.medley_id, existing);
  }

  // Count artist pair co-occurrences
  const pairCounts = new Map<string, number>();
  for (const artistSet of medleyArtists.values()) {
    const arr = [...artistSet];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const key = [arr[i], arr[j]].sort().join("|||");
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return Array.from(pairCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => {
      const [artistA, artistB] = key.split("|||");
      return { artistA, artistB, sharedMedleys: count };
    })
    .sort((a, b) => b.sharedMedleys - a.sharedMedleys)
    .slice(0, 20);
}

// =============================================================================
// Insight: Song Position Tendency
// =============================================================================

export async function getSongPositionData(): Promise<PositionData[]> {
  const medleySongs = await fetchAllMedleySongs();

  // Group by medley to get total songs per medley
  const medleySongCounts = new Map<string, number>();
  for (const ms of medleySongs) {
    medleySongCounts.set(ms.medley_id, (medleySongCounts.get(ms.medley_id) ?? 0) + 1);
  }

  // Calculate position zone for each song occurrence
  const songPositions = new Map<string, { 序盤: number; 中盤: number; 終盤: number }>();
  for (const ms of medleySongs) {
    const total = medleySongCounts.get(ms.medley_id) ?? 1;
    const normalizedPos = ms.order_index / total;
    const zone: "序盤" | "中盤" | "終盤" =
      normalizedPos < 0.33 ? "序盤" : normalizedPos < 0.67 ? "中盤" : "終盤";

    const existing = songPositions.get(ms.title) ?? { 序盤: 0, 中盤: 0, 終盤: 0 };
    existing[zone]++;
    songPositions.set(ms.title, existing);
  }

  // Only return songs that appear in multiple medleys
  return Array.from(songPositions.entries())
    .filter(([, pos]) => pos.序盤 + pos.中盤 + pos.終盤 >= 3)
    .map(([title, pos]) => ({
      title,
      positions: [
        { zone: "序盤" as const, count: pos.序盤 },
        { zone: "中盤" as const, count: pos.中盤 },
        { zone: "終盤" as const, count: pos.終盤 },
      ],
    }))
    .sort((a, b) => {
      const totalA = a.positions.reduce((s, p) => s + p.count, 0);
      const totalB = b.positions.reduce((s, p) => s + p.count, 0);
      return totalB - totalA;
    })
    .slice(0, 15);
}

// =============================================================================
// Insight: Medley Diversity Score
// =============================================================================

export async function getMedleyDiversity(): Promise<DiversityScore[]> {
  const [medleys, medleySongs] = await Promise.all([
    fetchAllMedleys(),
    fetchAllMedleySongs(),
  ]);

  // Group by medley
  const medleyData = new Map<string, { artists: Set<string>; totalSongs: number }>();
  for (const ms of medleySongs) {
    const data = medleyData.get(ms.medley_id) ?? {
      artists: new Set<string>(),
      totalSongs: 0,
    };
    // Split comma-separated artists
    const artistNames = ms.artist.split(",").map((a) => a.trim());
    for (const name of artistNames) {
      if (name) data.artists.add(name);
    }
    data.totalSongs++;
    medleyData.set(ms.medley_id, data);
  }

  const medleyMap = new Map(medleys.map((m) => [m.id, m]));

  return Array.from(medleyData.entries())
    .filter(([, data]) => data.totalSongs >= 3)
    .map(([medleyId, data]) => {
      const medley = medleyMap.get(medleyId);
      return {
        medleyTitle: medley?.title ?? "",
        videoId: medley?.video_id ?? "",
        platform: medley?.platform ?? "",
        uniqueArtists: data.artists.size,
        totalSongs: data.totalSongs,
        score: Math.round((data.artists.size / data.totalSongs) * 100) / 100,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// =============================================================================
// Helpers
// =============================================================================

function buildArtistMap(
  relations: SongArtistRelationRow[],
  artists: ArtistRow[]
): Map<string, string> {
  const nameMap = new Map<string, string>();
  for (const a of artists) {
    nameMap.set(a.id, a.name);
  }

  const songArtists = new Map<string, string[]>();
  for (const rel of relations) {
    if (rel.role !== "artist") continue;
    const names = songArtists.get(rel.song_id) ?? [];
    const name = nameMap.get(rel.artist_id);
    if (name) names.push(name);
    songArtists.set(rel.song_id, names);
  }

  const result = new Map<string, string>();
  for (const [songId, names] of songArtists) {
    result.set(songId, names.join(", "));
  }
  return result;
}
