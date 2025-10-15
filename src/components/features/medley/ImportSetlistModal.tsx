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

  // 秒数を時間文字列に変換（例: 83 -> "1:23"）
  const formatSecondsToTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // セットリストテキストをパース（拡張版）
  const parseSetlist = (text: string): ParsedSetlistEntry[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const entries: ParsedSetlistEntry[] = [];
    
    for (const line of lines) {
      // 不要な文字を除去（Unicode 制御文字、特殊な空白など）
      const cleanLine = line.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      if (!cleanLine) continue;

      let timeMatch;
      let timeStr = "";
      let titlePart = "";
      let startTime = 0;

      // サポートする形式を拡張:
      // 1. "00:00 曲名 / アーティスト名" (基本形式)
      // 2. "00:00 曲名 - アーティスト名" (ハイフン区切り)
      // 3. "00:00 曲名" (アーティスト名なし)
      // 4. "【00:00】曲名" (YouTube風)
      // 5. "(00:00) 曲名" (括弧付き)
      // 6. "00:00～ 曲名" (チルダ付き)
      // 7. "0:00 曲名" (秒の先頭0なし)
      // 8. "1. 00:00 曲名" (番号付き)
      // 9. "♪ 00:00 曲名" (記号付き)
      // 10. "曲名 00:00" (時刻が後ろ)
      
      // パターン1-3: 基本形式
      timeMatch = cleanLine.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
      if (timeMatch) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      }
      // パターン4: 【時刻】形式
      else if (timeMatch = cleanLine.match(/^【(\d{1,2}:\d{2}(?::\d{2})?)】\s*(.+)$/)) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      }
      // パターン5: (時刻) 形式
      else if (timeMatch = cleanLine.match(/^\((\d{1,2}:\d{2}(?::\d{2})?)\)\s*(.+)$/)) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      }
      // パターン6: 時刻～ 形式
      else if (timeMatch = cleanLine.match(/^(\d{1,2}:\d{2}(?::\d{2})?)～\s*(.+)$/)) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      }
      // パターン7-9: 番号や記号付き
      else if (timeMatch = cleanLine.match(/^(?:\d+\.\s*|[♪♬🎵🎶]\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/)) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      }
      // パターン10: 曲名 時刻 (逆順)
      else if (timeMatch = cleanLine.match(/^(.+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/)) {
        titlePart = timeMatch[1];
        timeStr = timeMatch[2];
      }
      // 時刻なしの行（楽曲名のみ）
      else if (cleanLine.match(/^(?:\d+\.\s*|[♪♬🎵🎶]\s*)?(.+)$/) && !cleanLine.includes(':')) {
        // 前の楽曲から推定した時刻を使用（30秒後）
        const lastStartTime = entries.length > 0 ? entries[entries.length - 1].startTime : 0;
        timeStr = formatSecondsToTime(lastStartTime + 30);
        titlePart = cleanLine.replace(/^(?:\d+\.\s*|[♪♬🎵🎶]\s*)/, '');
        startTime = lastStartTime + 30;
      }
      
      if (timeStr && titlePart) {
        if (startTime === 0) {
          startTime = parseTimeToSeconds(timeStr);
        }
        
        // タイトルから不要な文字を除去
        titlePart = titlePart.replace(/[【】()（）]/g, '').trim();
        
        // アーティスト名の分離を試行（複数のパターンに対応）
        let title = titlePart;
        let artist = "";
        
        // " / ", " - ", " by ", "・" などで分割
        const separators = [' / ', ' - ', ' by ', '・', ' × ', ' feat. ', ' ft. '];
        for (const separator of separators) {
          if (titlePart.includes(separator)) {
            const parts = titlePart.split(separator);
            title = parts[0].trim();
            artist = parts.slice(1).join(separator).trim();
            break;
          }
        }
        
        entries.push({
          time: timeStr,
          title,
          artist,
          startTime
        });
      }
    }

    // 重複除去（同じタイトル・開始時刻の組み合わせ）
    const uniqueEntries = entries.filter((entry, index, arr) => 
      arr.findIndex(e => e.title === entry.title && e.startTime === entry.startTime) === index
    );
    
    // 終了時間を自動計算（次の楽曲の開始時間まで）
    for (let i = 0; i < uniqueEntries.length; i++) {
      if (i < uniqueEntries.length - 1) {
        uniqueEntries[i].endTime = uniqueEntries[i + 1].startTime;
      } else {
        // 最後の楽曲はデフォルト30秒
        uniqueEntries[i].endTime = uniqueEntries[i].startTime + 30;
      }
    }
    
    return uniqueEntries;
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

  // サンプルテキスト（拡張版）
  const sampleText = `00:00 楽曲1 / アーティスト1
01:30 楽曲2 - アーティスト2
【02:45】楽曲3・アーティスト3
(03:20) 楽曲4 by アーティスト4
04:15～ 楽曲5
♪ 05:00 楽曲6 feat. アーティスト6
楽曲7のみ（時刻なし）`;

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900">
        セットリストインポート
      </h2>
      
      <div className="space-y-4">
        {/* 説明（拡張版） */}
        <div className="p-3 bg-blue-50 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2">サポートする形式（拡張版）:</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="font-medium mb-1">基本形式:</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• <code>MM:SS 楽曲名</code></li>
                  <li>• <code>MM:SS 楽曲名 / アーティスト名</code></li>
                  <li>• <code>MM:SS 楽曲名 - アーティスト名</code></li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">YouTube・SNS形式:</p>
                <ul className="space-y-0.5 ml-2">
                  <li>• <code>【MM:SS】楽曲名</code></li>
                  <li>• <code>(MM:SS) 楽曲名</code></li>
                  <li>• <code>MM:SS～ 楽曲名</code></li>
                  <li>• <code>♪ MM:SS 楽曲名</code></li>
                </ul>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-blue-200">
              <p className="text-xs">
                <strong>アーティスト名の分離:</strong> &quot; / &quot;, &quot; - &quot;, &quot; by &quot;, &quot;・&quot;, &quot; × &quot;, &quot; feat. &quot;, &quot; ft. &quot; で自動分離
              </p>
              <p className="text-xs mt-1">
                <strong>柔軟な対応:</strong> 時刻なしの楽曲名のみでも自動推定、番号付きリスト対応
              </p>
            </div>
          </div>
        </div>

        {/* テキストエリア */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            セットリスト
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`例:\n${sampleText}`}
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
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
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{parseError}</p>
          </div>
        )}

        {/* プレビュー表示 */}
        {previewSongs.length > 0 && (
          <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
            <div className="p-3 bg-gray-50 border-b border-gray-300">
              <h3 className="font-medium text-gray-900">
                プレビュー ({previewSongs.length}曲)
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {previewSongs.map((entry, index) => (
                <div key={index} className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {entry.title}
                      </h4>
                      {entry.artist && (
                        <p className="text-sm text-gray-600">
                          {entry.artist}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
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