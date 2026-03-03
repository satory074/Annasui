// Query key factory for song database
export const songKeys = {
  all: ["songs"] as const,
  lists: () => [...songKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...songKeys.lists(), filters] as const,
  search: (query: string) => [...songKeys.all, "search", query] as const,
  detail: (id: string) => [...songKeys.all, "detail", id] as const,
  duplicates: () => [...songKeys.all, "duplicates"] as const,
};
