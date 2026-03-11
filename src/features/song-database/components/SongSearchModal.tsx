"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchSongs, type MatchType } from "../utils/search";
import { getSongDatabase, type SongDatabaseEntry } from "@/lib/utils/songDatabase";

interface SongSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (song: SongDatabaseEntry) => void;
  onManualAdd?: () => void;
}

const matchLabels: Record<MatchType, string> = {
  exact: "完全一致",
  startsWith: "前方一致",
  wordMatch: "単語一致",
  partialMatch: "部分一致",
  fuzzyMatch: "あいまい",
};

const matchColors: Record<MatchType, string> = {
  exact: "bg-green-100 text-green-800",
  startsWith: "bg-blue-100 text-blue-800",
  wordMatch: "bg-purple-100 text-purple-800",
  partialMatch: "bg-yellow-100 text-yellow-800",
  fuzzyMatch: "bg-gray-100 text-gray-800",
};

function PlatformIcons({ song }: { song: SongDatabaseEntry }) {
  return (
    <div className="flex gap-1 shrink-0">
      {song.niconicoLink && (
        <span className="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">nico</span>
      )}
      {song.youtubeLink && (
        <span className="text-xs px-1 py-0.5 rounded bg-red-50 text-red-600 font-medium">YT</span>
      )}
      {song.spotifyLink && (
        <span className="text-xs px-1 py-0.5 rounded bg-green-50 text-green-600 font-medium">SP</span>
      )}
      {song.applemusicLink && (
        <span className="text-xs px-1 py-0.5 rounded bg-pink-50 text-pink-600 font-medium">AM</span>
      )}
    </div>
  );
}

export function SongSearchModal({
  open,
  onOpenChange,
  onSelect,
  onManualAdd,
}: SongSearchModalProps) {
  const [songs, setSongs] = useState<SongDatabaseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setLoading(true);
    getSongDatabase()
      .then((data) => setSongs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Adapt SongDatabaseEntry for search (artist as string[])
  const searchItems = useMemo(
    () =>
      songs.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist.map((a) => a.name),
        _entry: s,
      })),
    [songs]
  );

  const results = useMemo(() => {
    if (!query.trim()) return null;
    return searchSongs(searchItems, query).slice(0, 50);
  }, [searchItems, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>楽曲を検索</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="楽曲名またはアーティスト名で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="text-gray-900"
          autoFocus
          disabled={loading}
        />

        <div className="flex-1 overflow-y-auto min-h-0 mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              読み込み中...
            </div>
          ) : !query.trim() ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p className="font-medium text-gray-500 mb-1">
                {songs.length > 0
                  ? `${songs.length.toLocaleString()}曲が登録されています`
                  : "楽曲が登録されていません"}
              </p>
              <p>楽曲名またはアーティスト名で検索してください</p>
            </div>
          ) : results && results.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p className="mb-3">「{query}」に該当する楽曲が見つかりませんでした</p>
              {onManualAdd && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onManualAdd();
                  }}
                >
                  手動で追加する
                </Button>
              )}
            </div>
          ) : results ? (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 px-1 mb-2">
                {results.length}件見つかりました
              </p>
              {results.map(({ item, matchType }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item._entry);
                    onOpenChange(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {item.artist.length > 0
                        ? item.artist.join(", ")
                        : "Unknown Artist"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PlatformIcons song={item._entry} />
                    {query && matchType !== "exact" && (
                      <Badge
                        variant="secondary"
                        className={`text-xs ${matchColors[matchType]}`}
                      >
                        {matchLabels[matchType]}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pt-2 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onManualAdd?.();
            }}
          >
            手動で新しい楽曲を追加
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
