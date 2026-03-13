export interface ParsedSetlistEntry {
  time: string;
  title: string;
  artist?: string;
  startTime: number;
  endTime?: number;
  songId?: string; // song_master.id after DB auto-matching
}
