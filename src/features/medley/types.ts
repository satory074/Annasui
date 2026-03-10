// Unified SongSection type — uses UUID as the single ID
export interface SongSection {
  id: string; // UUID from medley_songs.id
  songId?: string; // Reference to song_master.id (for library linking)
  orderIndex: number; // Display order (not an ID, just metadata)
  title: string;
  artist: string[]; // Array of artist names
  composers?: string[];
  arrangers?: string[];
  startTime: number; // Seconds (supports 0.1s precision)
  endTime: number;
  color: string;
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
}

export type PlatformType = "niconico" | "youtube" | "spotify" | "appleMusic";

export interface MedleyMeta {
  id: string;
  videoId: string;
  platform: PlatformType;
  title: string;
  creator?: string;
  duration: number;
  bpm?: number;
  beatOffset?: number;
  lastEditor?: string;
  lastEditedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedleyEditEntry {
  id: string;
  editorNickname: string;
  action: string;
  changes: Record<string, unknown> | null;
  createdAt: Date;
}

export interface MedleySnapshot {
  title: string;
  creator?: string;
  duration: number;
  songs: Omit<SongSection, "id">[];
}
