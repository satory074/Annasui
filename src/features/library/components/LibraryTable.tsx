"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { songKeys } from "@/features/song-database/queries/keys";
import { useSongSearch } from "@/features/song-database/hooks/useSongSearch";
import { SongEditModal } from "@/features/song-database/components/SongEditModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/context";
import {
  updateSongInDatabase,
  deleteSongFromDatabase,
} from "@/features/song-database/actions/addSong";
import type { SongFormValues } from "@/lib/validators/song";
import type { SongMasterRecord } from "@/lib/db/schema";

interface LibraryTableProps {
  initialSongs: SongMasterRecord[];
}

export function LibraryTable({ initialSongs }: LibraryTableProps) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [editingSong, setEditingSong] = useState<SongMasterRecord | null>(null);

  const {
    query,
    setQuery,
    results,
    totalResults,
    page,
    totalPages,
    setPage,
    sortKey,
    sortDir,
    toggleSort,
  } = useSongSearch(initialSongs);

  const deleteMutation = useMutation({
    mutationFn: deleteSongFromDatabase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.all });
    },
  });

  const handleEdit = useCallback(
    async (id: string, data: SongFormValues) => {
      await updateSongInDatabase(id, data);
      queryClient.invalidateQueries({ queryKey: songKeys.all });
      setEditingSong(null);
    },
    [queryClient]
  );

  const handleDelete = useCallback(
    (id: string, title: string) => {
      if (!confirm(`「${title}」を削除しますか？`)) return;
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const SortIndicator = ({
    column,
  }: {
    column: "title" | "artist" | "updatedAt";
  }) => {
    if (sortKey !== column) return null;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="楽曲名またはアーティスト名で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md text-gray-900"
        />
        <Badge variant="secondary">{totalResults}件</Badge>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSort("title")}
              >
                楽曲名
                <SortIndicator column="title" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSort("artist")}
              >
                アーティスト
                <SortIndicator column="artist" />
              </TableHead>
              <TableHead>リンク</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSort("updatedAt")}
              >
                更新日
                <SortIndicator column="updatedAt" />
              </TableHead>
              {isAuthenticated && <TableHead className="w-24">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAuthenticated ? 5 : 4}
                  className="text-center text-gray-500 py-8"
                >
                  該当する楽曲がありません
                </TableCell>
              </TableRow>
            ) : (
              results.map(({ item: song }) => (
                <TableRow key={song.id}>
                  <TableCell className="font-medium text-gray-900">
                    {song.title}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {song.artist || "Unknown Artist"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {song.niconicoLink && (
                        <a
                          href={song.niconicoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                        >
                          nico
                        </a>
                      )}
                      {song.youtubeLink && (
                        <a
                          href={song.youtubeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                        >
                          YT
                        </a>
                      )}
                      {song.spotifyLink && (
                        <a
                          href={song.spotifyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                        >
                          Spotify
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">
                    {song.updatedAt
                      ? new Date(song.updatedAt).toLocaleDateString("ja-JP")
                      : "-"}
                  </TableCell>
                  {isAuthenticated && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => setEditingSong(song)}
                        >
                          編集
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(song.id, song.title)}
                          disabled={deleteMutation.isPending}
                        >
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            前へ
          </Button>
          <span className="text-sm text-gray-600">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            次へ
          </Button>
        </div>
      )}

      {/* Edit modal */}
      <SongEditModal
        open={!!editingSong}
        onOpenChange={(open) => !open && setEditingSong(null)}
        song={
          editingSong
            ? {
                id: editingSong.id,
                title: editingSong.title,
                artist: editingSong.artist ?? undefined,
                niconicoLink: editingSong.niconicoLink ?? undefined,
                youtubeLink: editingSong.youtubeLink ?? undefined,
                spotifyLink: editingSong.spotifyLink ?? undefined,
                applemusicLink: editingSong.applemusicLink ?? undefined,
              }
            : null
        }
        onSave={handleEdit}
      />
    </div>
  );
}
