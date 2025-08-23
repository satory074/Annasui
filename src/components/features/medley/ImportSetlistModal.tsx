"use client";

import { useState } from "react";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";

interface ImportSetlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (songs: SongSection[]) => void;
}

interface ParsedSetlistEntry {
  time: string;
  title: string;
  artist?: string;
  startTime: number;
  endTime?: number;
}

export default function ImportSetlistModal({
  isOpen,
  onClose,
  onImport
}: ImportSetlistModalProps) {
  const [textInput, setTextInput] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [previewSongs, setPreviewSongs] = useState<ParsedSetlistEntry[]>([]);

  // 時間文字列を秒数に変換（例: "1:23" -> 83）
  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(':').map(part => parseInt(part, 10));
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
    }
    return 0;
  };

  // セットリストテキストをパース
  const parseSetlist = (text: string): ParsedSetlistEntry[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const entries: ParsedSetlistEntry[] = [];
    
    for (const line of lines) {
      // サポートする形式:
      // 1. "00:00 曲名 / アーティスト名"
      // 2. "00:00 曲名"
      // 3. "1:23 曲名 - アーティスト名"
      const timeMatch = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
      if (timeMatch) {
        const timeStr = timeMatch[1];
        const titlePart = timeMatch[2];
        const startTime = parseTimeToSeconds(timeStr);
        
        // アーティスト名の分離を試行
        let title = titlePart;
        let artist = "";
        
        // " / " で分割
        if (titlePart.includes(' / ')) {
          const parts = titlePart.split(' / ');
          title = parts[0].trim();
          artist = parts.slice(1).join(' / ').trim();
        }
        // " - " で分割
        else if (titlePart.includes(' - ')) {
          const parts = titlePart.split(' - ');
          title = parts[0].trim();
          artist = parts.slice(1).join(' - ').trim();
        }
        
        entries.push({
          time: timeStr,
          title,
          artist,
          startTime
        });
      }
    }
    
    // 終了時間を自動計算（次の楽曲の開始時間まで）
    for (let i = 0; i < entries.length; i++) {
      if (i < entries.length - 1) {
        entries[i].endTime = entries[i + 1].startTime;
      } else {
        // 最後の楽曲はデフォルト30秒
        entries[i].endTime = entries[i].startTime + 30;
      }
    }
    
    return entries;
  };

  // プレビューを更新
  const handlePreview = () => {
    try {
      setParseError("");
      const parsed = parseSetlist(textInput);
      if (parsed.length === 0) {
        setParseError("有効な楽曲エントリが見つかりませんでした。");
        return;
      }
      setPreviewSongs(parsed);
    } catch (error) {
      setParseError("パースエラーが発生しました: " + (error as Error).message);
      setPreviewSongs([]);
    }
  };

  // インポート実行
  const handleImport = () => {
    const songs: SongSection[] = previewSongs.map((entry, index) => ({
      id: Date.now() + index,
      title: entry.title,
      artist: entry.artist || "",
      startTime: Math.round(entry.startTime * 10) / 10,
      endTime: Math.round((entry.endTime || entry.startTime + 30) * 10) / 10,
      color: `bg-${['blue', 'green', 'purple', 'yellow', 'pink', 'indigo'][index % 6]}-400`,
      genre: "",
      originalLink: ""
    }));
    
    onImport(songs);
    onClose();
    setTextInput("");
    setPreviewSongs([]);
    setParseError("");
  };

  const handleClose = () => {
    onClose();
    setTextInput("");
    setPreviewSongs([]);
    setParseError("");
  };

  // サンプルテキスト
  const sampleText = `00:00 楽曲1 / アーティスト1
01:30 楽曲2 / アーティスト2
03:15 楽曲3 - アーティスト3
04:45 楽曲4`;

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        セットリストインポート
      </h2>
      
      <div className="space-y-4">
        {/* 説明 */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">サポートする形式:</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <code>MM:SS 楽曲名 / アーティスト名</code></li>
            <li>• <code>MM:SS 楽曲名 - アーティスト名</code></li>
            <li>• <code>MM:SS 楽曲名</code></li>
          </ul>
        </div>

        {/* テキストエリア */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            セットリスト
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`例:\n${sampleText}`}
            className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          />
        </div>

        {/* プレビューボタン */}
        <button
          onClick={handlePreview}
          disabled={!textInput.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          プレビュー
        </button>

        {/* エラー表示 */}
        {parseError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
            <p className="text-red-800 dark:text-red-200 text-sm">{parseError}</p>
          </div>
        )}

        {/* プレビュー表示 */}
        {previewSongs.length > 0 && (
          <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
              <h3 className="font-medium text-gray-900 dark:text-white">
                プレビュー ({previewSongs.length}曲)
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {previewSongs.map((entry, index) => (
                <div key={index} className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {entry.title}
                      </h4>
                      {entry.artist && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {entry.artist}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.time} ~ {Math.floor((entry.endTime || 0) / 60)}:{String((entry.endTime || 0) % 60).padStart(2, '0')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          キャンセル
        </button>
        <button
          onClick={handleImport}
          disabled={previewSongs.length === 0}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {previewSongs.length}曲をインポート
        </button>
      </div>
    </BaseModal>
  );
}