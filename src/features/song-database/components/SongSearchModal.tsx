"use client";

import { useState, useMemo } from "react";
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
import type { SongFormValues } from "@/lib/validators/song";

interface SongEntry {
  id: string;
  title: string;
  artist?: string;
  niconicoLink?: string;
  youtubeLink?: string;
  spotifyLink?: string;
  applemusicLink?: string;
}

interface SongSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs: SongEntry[];
  onSelect: (song: SongEntry) => void;
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

export function SongSearchModal({
  open,
  onOpenChange,
  songs,
  onSelect,
  onManualAdd,
}: SongSearchModalProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return songs.slice(0, 50).map((s) => ({ item: s, score: 0, matchType: "exact" as MatchType }));
    return searchSongs(songs, query).slice(0, 50);
  }, [songs, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>楽曲を検索</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="楽曲名またはアーティスト名で検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="text-gray-900"
          autoFocus
        />

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 mt-2">
          {results.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              該当する楽曲が見つかりません
            </p>
          ) : (
            results.map(({ item, matchType }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item);
                  onOpenChange(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.artist || "Unknown Artist"}
                  </p>
                </div>
                {query && matchType !== "exact" && (
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${matchColors[matchType]}`}
                  >
                    {matchLabels[matchType]}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>

        {onManualAdd && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onManualAdd();
              }}
            >
              手動で新しい楽曲を追加
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
