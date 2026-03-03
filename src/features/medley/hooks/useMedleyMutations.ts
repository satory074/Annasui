"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { medleyKeys } from "../queries/keys";
import { saveMedleySongs } from "../actions/saveMedley";
import { restoreFromSnapshot } from "../actions/deleteSong";
import type { SongSection } from "../types";

export function useSaveSongs(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      songs,
      editorNickname,
      medleyMeta,
    }: {
      songs: Omit<SongSection, "id">[];
      editorNickname: string;
      medleyMeta?: { title: string; creator?: string; duration: number };
    }) => {
      const result = await saveMedleySongs(
        videoId,
        songs,
        editorNickname,
        medleyMeta
      );
      if (!result.success) throw new Error(result.error);
      return result;
    },

    // Optimistic update: update songs cache immediately
    onMutate: async ({ songs }) => {
      await queryClient.cancelQueries({
        queryKey: medleyKeys.songs(videoId),
      });
      const previous = queryClient.getQueryData(medleyKeys.songs(videoId));

      // Optimistically set the new songs
      queryClient.setQueryData(
        medleyKeys.songs(videoId),
        songs.map((s, i) => ({
          ...s,
          id: `temp-${i}`,
          orderIndex: i + 1,
        }))
      );

      return { previous };
    },

    // Rollback on error
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          medleyKeys.songs(videoId),
          context.previous
        );
      }
    },

    // Refetch on settle (success or error)
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: medleyKeys.songs(videoId),
      });
      queryClient.invalidateQueries({
        queryKey: medleyKeys.detail(videoId),
      });
    },
  });
}

export function useRestoreSnapshot(videoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      editHistoryId,
      editorNickname,
    }: {
      editHistoryId: string;
      editorNickname: string;
    }) => {
      const result = await restoreFromSnapshot(editHistoryId, editorNickname);
      if (!result.success) throw new Error(result.error);
      return result;
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: medleyKeys.songs(videoId),
      });
      queryClient.invalidateQueries({
        queryKey: medleyKeys.detail(videoId),
      });
    },
  });
}
