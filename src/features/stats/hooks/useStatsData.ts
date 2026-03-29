import { useQuery } from "@tanstack/react-query";
import {
  getStatsOverview,
  getSongStats,
  getArtistStats,
  getMedleyStats,
  getSongCoOccurrence,
  getArtistCoOccurrence,
  getSongPositionData,
  getMedleyDiversity,
  getAllRawData,
} from "@/lib/api/stats";

const STATS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export function useStatsOverview() {
  return useQuery({
    queryKey: ["stats", "overview"],
    queryFn: getStatsOverview,
    staleTime: STATS_STALE_TIME,
  });
}

export function useSongStats() {
  return useQuery({
    queryKey: ["stats", "songs"],
    queryFn: getSongStats,
    staleTime: STATS_STALE_TIME,
  });
}

export function useArtistStats() {
  return useQuery({
    queryKey: ["stats", "artists"],
    queryFn: getArtistStats,
    staleTime: STATS_STALE_TIME,
  });
}

export function useMedleyStats() {
  return useQuery({
    queryKey: ["stats", "medleys"],
    queryFn: getMedleyStats,
    staleTime: STATS_STALE_TIME,
  });
}

export function useSongCoOccurrence() {
  return useQuery({
    queryKey: ["stats", "insights", "cooccurrence"],
    queryFn: getSongCoOccurrence,
    staleTime: STATS_STALE_TIME,
  });
}

export function useArtistCoOccurrence() {
  return useQuery({
    queryKey: ["stats", "insights", "artist-cooccurrence"],
    queryFn: getArtistCoOccurrence,
    staleTime: STATS_STALE_TIME,
  });
}

export function useSongPositionData() {
  return useQuery({
    queryKey: ["stats", "insights", "position"],
    queryFn: getSongPositionData,
    staleTime: STATS_STALE_TIME,
  });
}

export function useMedleyDiversity() {
  return useQuery({
    queryKey: ["stats", "insights", "diversity"],
    queryFn: getMedleyDiversity,
    staleTime: STATS_STALE_TIME,
  });
}

export function useAllRawData() {
  return useQuery({
    queryKey: ["stats", "raw"],
    queryFn: getAllRawData,
    staleTime: STATS_STALE_TIME,
  });
}
