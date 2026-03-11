"use client";

import { useState, useEffect } from "react";
import BaseModal from "@/components/ui/modal/BaseModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseTimeInput, formatTimeSimple } from "@/lib/utils/time";
import type { SongSection } from "../types";

interface SongEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongSection | null;
  isNew?: boolean;
  prefill?: { title?: string; artist?: string[] };
  allSongs?: SongSection[];
  currentTime?: number;
  maxDuration?: number;
  onSave: (song: SongSection) => void;
  onDelete?: (id: string) => void;
  onSeek?: (time: number) => void;
}

function randomPastelColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const s = 55 + Math.floor(Math.random() * 20);
  const l = 60 + Math.floor(Math.random() * 15);
  // Convert HSL to hex
  const h = hue / 360;
  const sl = s / 100;
  const ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function SongEditModal({
  isOpen,
  onClose,
  song,
  isNew = false,
  prefill,
  allSongs = [],
  currentTime = 0,
  maxDuration = 0,
  onSave,
  onDelete,
  onSeek,
}: SongEditModalProps) {
  const [title, setTitle] = useState("");
  const [artistInput, setArtistInput] = useState("");
  const [startTimeInput, setStartTimeInput] = useState("0:00");
  const [endTimeInput, setEndTimeInput] = useState("0:30");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (song) {
      setTitle(song.title);
      setArtistInput(song.artist.join(", "));
      setStartTimeInput(formatTimeSimple(song.startTime));
      setEndTimeInput(formatTimeSimple(song.endTime));
    } else {
      // New song mode — apply prefill if provided
      setTitle(prefill?.title ?? "");
      setArtistInput(prefill?.artist?.join(", ") ?? "");
      setStartTimeInput(formatTimeSimple(currentTime));
      setEndTimeInput(
        formatTimeSimple(Math.min(currentTime + 30, maxDuration || currentTime + 30))
      );
    }
    setErrors({});
    setDeleteDialogOpen(false);
    setDiscardDialogOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, song]);

  const isDirty = () => {
    if (!song) return title !== "" || artistInput !== "";
    return (
      title !== song.title ||
      artistInput !== song.artist.join(", ") ||
      parseTimeInput(startTimeInput) !== song.startTime ||
      parseTimeInput(endTimeInput) !== song.endTime
    );
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "楽曲名は必須です";
    const startTime = parseTimeInput(startTimeInput);
    const endTime = parseTimeInput(endTimeInput);
    if (endTime <= startTime) newErrors.time = "終了時刻は開始時刻より後にしてください";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const artists = artistInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const saved: SongSection = song
      ? { ...song, title: title.trim(), artist: artists, startTime, endTime }
      : {
          id: crypto.randomUUID(),
          orderIndex: allSongs.length,
          title: title.trim(),
          artist: artists,
          startTime,
          endTime,
          color: randomPastelColor(),
        };

    onSave(saved);
    onClose();
  };

  const handleClose = () => {
    if (isDirty()) {
      setDiscardDialogOpen(true);
    } else {
      onClose();
    }
  };

  // Check for duplicate songs (same title + artist)
  const duplicates =
    song && allSongs.length > 0
      ? allSongs.filter(
          (s) =>
            s.id !== song.id &&
            s.title.trim() === title.trim() &&
            s.artist.join(", ").trim() === artistInput.trim()
        )
      : [];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="md"
      ariaLabel={isNew ? "楽曲を追加" : "楽曲を編集"}
    >
      <h2 className="text-xl font-bold mb-4 text-gray-900">
        {isNew ? "楽曲を追加" : "楽曲を編集"}
      </h2>

      {Object.keys(errors).length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md"
        >
          <p className="text-sm text-red-700">
            {errors.title || errors.time}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            楽曲名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="楽曲名を入力"
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900 ${
              errors.title ? "border-red-500" : "border-gray-300"
            }`}
          />
        </div>

        {/* Artist */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            アーティスト
          </label>
          <input
            type="text"
            value={artistInput}
            onChange={(e) => setArtistInput(e.target.value)}
            placeholder="アーティスト名（複数はカンマ区切り）"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
          />
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始時刻
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                placeholder="0:00"
                className={`flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900 font-mono ${
                  errors.time ? "border-red-500" : "border-gray-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setStartTimeInput(formatTimeSimple(currentTime))}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-gray-600 whitespace-nowrap"
                title="現在時刻を設定"
              >
                現在
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              終了時刻
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                placeholder="0:30"
                className={`flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900 font-mono ${
                  errors.time ? "border-red-500" : "border-gray-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setEndTimeInput(formatTimeSimple(currentTime))}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-gray-600 whitespace-nowrap"
                title="現在時刻を設定"
              >
                現在
              </button>
            </div>
          </div>
        </div>

        {/* Preview seek button */}
        {onSeek && (
          <button
            type="button"
            onClick={() => onSeek(parseTimeInput(startTimeInput))}
            className="text-sm text-orange-600 hover:text-orange-700 underline"
          >
            ▶ 開始位置からプレビュー
          </button>
        )}

        {/* Duplicate warning */}
        {duplicates.length > 0 && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-700">
              同名楽曲が {duplicates.length} 件あります（
              {duplicates.map((d) => formatTimeSimple(d.startTime)).join(", ")}）
            </p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-between mt-6">
        <div>
          {!isNew && onDelete && song && (
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
            >
              削除
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
          >
            {isNew ? "追加" : "保存"}
          </button>
        </div>
      </div>

      {/* Discard dialog */}
      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>編集内容を破棄</AlertDialogTitle>
            <AlertDialogDescription>
              保存されていない変更があります。破棄してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>編集を続ける</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscardDialogOpen(false);
                onClose();
              }}
            >
              破棄して閉じる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>楽曲を削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{song?.title}」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onDelete && song) {
                  onDelete(song.id);
                  setDeleteDialogOpen(false);
                  onClose();
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseModal>
  );
}
