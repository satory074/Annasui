"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MedleyEditEntry } from "../types";

interface EditHistoryPanelProps {
  entries: MedleyEditEntry[];
  onRestore?: (entryId: string) => void;
  isRestoring?: boolean;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  create_medley: { label: "作成", color: "bg-green-100 text-green-800" },
  update_medley: { label: "更新", color: "bg-indigo-100 text-indigo-800" },
  update_songs: { label: "楽曲更新", color: "bg-indigo-100 text-indigo-800" },
  add_song: { label: "楽曲追加", color: "bg-purple-100 text-purple-800" },
  delete_song: { label: "楽曲削除", color: "bg-red-100 text-red-800" },
  restore_snapshot: { label: "復元", color: "bg-yellow-100 text-yellow-800" },
};

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;

  return date.toLocaleDateString("ja-JP");
}

export function EditHistoryPanel({
  entries,
  onRestore,
  isRestoring,
}: EditHistoryPanelProps) {
  if (!entries.length) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        編集履歴はありません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">編集履歴</h3>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {entries.map((entry) => {
          const actionInfo = actionLabels[entry.action] ?? {
            label: entry.action,
            color: "bg-gray-100 text-gray-800",
          };
          const hasSnapshot = !!(entry.changes as Record<string, unknown>)
            ?.snapshot;

          return (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-800 truncate">
                    {entry.editorNickname}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${actionInfo.color}`}
                  >
                    {actionInfo.label}
                  </Badge>
                  {hasSnapshot && (
                    <Badge variant="outline" className="text-xs">
                      復元可能
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {relativeTime(entry.createdAt)}
                </p>
              </div>

              {hasSnapshot && onRestore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  disabled={isRestoring}
                  onClick={() => onRestore(entry.id)}
                >
                  復元
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
