// Query key factory — central place for all medley-related cache keys
export const medleyKeys = {
  all: ["medleys"] as const,
  lists: () => [...medleyKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...medleyKeys.lists(), filters] as const,
  details: () => [...medleyKeys.all, "detail"] as const,
  detail: (videoId: string) => [...medleyKeys.details(), videoId] as const,
  songs: (videoId: string) =>
    [...medleyKeys.detail(videoId), "songs"] as const,
  editHistory: (medleyId: string) =>
    [...medleyKeys.all, "history", medleyId] as const,
};
