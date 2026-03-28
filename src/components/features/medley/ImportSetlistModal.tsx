"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import { Button } from "@/components/ui/button";
import { randomPastelColor } from "@/lib/utils/color";
import type { ParsedSetlistEntry } from "@/features/medley/import/types";
import { useAutoMatcher } from "@/features/song-database/hooks/useAutoMatcher";

interface ImportSetlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (songs: SongSection[]) => void;
  /** 動画説明文など、あらかじめ入力するテキスト */
  prefillText?: string;
}

type ParseMode = "regex" | "ai";
type ActiveTab = "text" | "csv";

export default function ImportSetlistModal({
  isOpen,
  onClose,
  onImport,
  prefillText,
}: ImportSetlistModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("text");
  const [parseMode, setParseMode] = useState<ParseMode>("regex");
  const [textInput, setTextInput] = useState<string>("");
  const [csvInput, setCsvInput] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [aiFallbackWarning, setAiFallbackWarning] = useState<string>("");
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [previewSongs, setPreviewSongs] = useState<ParsedSetlistEntry[]>([]);
  // Per-entry override: true = confirmed, false = rejected, undefined = auto
  const [matchOverrides, setMatchOverrides] = useState<
    Record<number, boolean | undefined>
  >({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // DB auto-matching
  const { results: autoMatchResults, isLoading: isAutoMatchLoading } =
    useAutoMatcher(previewSongs);

  // Prefill textarea when prop changes (e.g., video description loaded)
  useEffect(() => {
    if (isOpen && prefillText) {
      setActiveTab("text");
      setTextInput(prefillText);
      setPreviewSongs([]);
      setParseError("");
      setAiFallbackWarning("");
      setMatchOverrides({});
    }
  }, [isOpen, prefillText]);

  // Reset when closed
  const handleClose = useCallback(() => {
    onClose();
    setTextInput("");
    setCsvInput("");
    setPreviewSongs([]);
    setParseError("");
    setAiFallbackWarning("");
    setMatchOverrides({});
  }, [onClose]);

  // ── Time helpers ──────────────────────────────────────────────────────────

  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(":").map((p) => parseInt(p, 10));
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const formatSecondsToTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Regex parser ──────────────────────────────────────────────────────────

  const parseSetlist = (text: string): ParsedSetlistEntry[] => {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    const entries: ParsedSetlistEntry[] = [];

    for (const line of lines) {
      const cleanLine = line.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      if (!cleanLine) continue;

      let timeMatch: RegExpMatchArray | null;
      let timeStr = "";
      let titlePart = "";
      let startTime = 0;

      if ((timeMatch = cleanLine.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/))) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      } else if ((timeMatch = cleanLine.match(/^【(\d{1,2}:\d{2}(?::\d{2})?)】\s*(.+)$/))) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      } else if ((timeMatch = cleanLine.match(/^\((\d{1,2}:\d{2}(?::\d{2})?)\)\s*(.+)$/))) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      } else if ((timeMatch = cleanLine.match(/^(\d{1,2}:\d{2}(?::\d{2})?)～\s*(.+)$/))) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      } else if (
        (timeMatch = cleanLine.match(
          /^(?:\d+\.\s*|[♪♬🎵🎶]\s*)?(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/
        ))
      ) {
        timeStr = timeMatch[1];
        titlePart = timeMatch[2];
      } else if ((timeMatch = cleanLine.match(/^(.+?)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/))) {
        titlePart = timeMatch[1];
        timeStr = timeMatch[2];
      } else if (
        cleanLine.match(/^(?:\d+\.\s*|[♪♬🎵🎶]\s*)?(.+)$/) &&
        !cleanLine.includes(":")
      ) {
        const lastStartTime =
          entries.length > 0 ? entries[entries.length - 1].startTime : 0;
        timeStr = formatSecondsToTime(lastStartTime + 30);
        titlePart = cleanLine.replace(/^(?:\d+\.\s*|[♪♬🎵🎶]\s*)/, "");
        startTime = lastStartTime + 30;
      }

      if (timeStr && titlePart) {
        if (startTime === 0) startTime = parseTimeToSeconds(timeStr);
        titlePart = titlePart.replace(/[【】()（）]/g, "").trim();

        let title = titlePart;
        let artist = "";
        const separators = [" / ", " - ", " by ", "・", " × ", " feat. ", " ft. "];
        for (const sep of separators) {
          if (titlePart.includes(sep)) {
            const parts = titlePart.split(sep);
            title = parts[0].trim();
            artist = parts.slice(1).join(sep).trim();
            break;
          }
        }

        entries.push({ time: timeStr, title, artist, startTime });
      }
    }

    const unique = entries.filter(
      (e, i, arr) =>
        arr.findIndex((x) => x.title === e.title && x.startTime === e.startTime) === i
    );

    for (let i = 0; i < unique.length; i++) {
      unique[i].endTime =
        i < unique.length - 1
          ? unique[i + 1].startTime
          : unique[i].startTime + 30;
    }

    return unique;
  };

  // ── CSV parser ────────────────────────────────────────────────────────────

  const parseCSV = (text: string): ParsedSetlistEntry[] => {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    if (lines.length === 0) return [];

    // Detect delimiter
    const firstLine = lines[0];
    const tabCount = (firstLine.match(/\t/g) ?? []).length;
    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const delimiter = tabCount >= commaCount ? "\t" : ",";

    const splitLine = (line: string) =>
      line
        .split(delimiter)
        .map((c) => c.trim().replace(/^["']|["']$/g, ""));

    const header = splitLine(firstLine).map((h) => h.toLowerCase());

    const col = (keywords: string[]) =>
      header.findIndex((h) => keywords.some((k) => h.includes(k)));

    const titleIdx = col(["title", "タイトル", "曲名"]);
    const artistIdx = col(["artist", "アーティスト"]);
    const startIdx = col(["start", "開始", "time", "時間"]);
    const endIdx = col(["end", "終了"]);

    const hasHeader = titleIdx >= 0 || artistIdx >= 0 || startIdx >= 0;
    const dataLines = hasHeader ? lines.slice(1) : lines;

    // Fallback column positions
    const rStart = startIdx >= 0 ? startIdx : 0;
    const rTitle = titleIdx >= 0 ? titleIdx : 1;
    const rArtist = artistIdx >= 0 ? artistIdx : 2;

    const entries: ParsedSetlistEntry[] = [];

    for (const line of dataLines) {
      const cols = splitLine(line);
      const title = cols[rTitle]?.trim() ?? "";
      if (!title) continue;

      const timeStr = cols[rStart]?.trim() ?? "0:00";
      const artist = cols[rArtist]?.trim() ?? "";
      const endStr = endIdx >= 0 ? (cols[endIdx]?.trim() ?? "") : "";

      const startTime = parseTimeToSeconds(timeStr) || 0;
      const endTime = endStr ? parseTimeToSeconds(endStr) : undefined;

      entries.push({ time: timeStr, title, artist, startTime, endTime });
    }

    // Auto-calculate missing endTimes
    for (let i = 0; i < entries.length; i++) {
      if (!entries[i].endTime) {
        entries[i].endTime =
          i < entries.length - 1
            ? entries[i + 1].startTime
            : entries[i].startTime + 30;
      }
    }

    return entries;
  };

  // ── AI parser ─────────────────────────────────────────────────────────────

  const parseWithAI = async (text: string): Promise<ParsedSetlistEntry[]> => {
    const response = await fetch("/api/import/parse-setlist/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error ?? `HTTP ${response.status}`);
    }

    const data = await response.json();
    const songs: { startTime: string; title: string; artist: string[] }[] =
      data.songs ?? [];

    const entries: ParsedSetlistEntry[] = songs
      .filter((s) => s.title)
      .map((s) => {
        const startTime = s.startTime ? parseTimeToSeconds(s.startTime) : 0;
        return {
          time: s.startTime || "0:00",
          title: s.title.trim(),
          artist: s.artist.join(", "),
          startTime,
        };
      });

    // Auto-calculate endTimes
    for (let i = 0; i < entries.length; i++) {
      entries[i].endTime =
        i < entries.length - 1
          ? entries[i + 1].startTime
          : entries[i].startTime + 30;
    }

    return entries;
  };

  // ── Preview handler ───────────────────────────────────────────────────────

  const handlePreview = async () => {
    setParseError("");
    setAiFallbackWarning("");
    setPreviewSongs([]);
    setMatchOverrides({});

    const input = activeTab === "csv" ? csvInput : textInput;
    if (!input.trim()) return;

    if (activeTab === "csv") {
      const parsed = parseCSV(input);
      if (parsed.length === 0) {
        setParseError("有効な楽曲エントリが見つかりませんでした。");
        return;
      }
      setPreviewSongs(parsed);
      return;
    }

    // Text tab
    if (parseMode === "ai") {
      setIsParsingAI(true);
      try {
        const aiResult = await parseWithAI(input);
        if (aiResult.length === 0) {
          setParseError("AI解析で楽曲エントリが見つかりませんでした。");
        } else {
          setPreviewSongs(aiResult);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setAiFallbackWarning(`AI解析に失敗しました（${msg}）。通常解析で代替します。`);
        // Fallback to regex
        const fallback = parseSetlist(input);
        if (fallback.length === 0) {
          setParseError("有効な楽曲エントリが見つかりませんでした。");
        } else {
          setPreviewSongs(fallback);
        }
      } finally {
        setIsParsingAI(false);
      }
    } else {
      try {
        const parsed = parseSetlist(input);
        if (parsed.length === 0) {
          setParseError("有効な楽曲エントリが見つかりませんでした。");
        } else {
          setPreviewSongs(parsed);
        }
      } catch (err) {
        setParseError("パースエラー: " + (err as Error).message);
      }
    }
  };

  // ── Import handler ────────────────────────────────────────────────────────

  const handleImport = () => {
    const songs: SongSection[] = previewSongs.map((entry, index) => {
      const override = matchOverrides[index];
      const match = autoMatchResults[index];
      const autoSongId =
        override === true
          ? match?.bestMatch?.id
          : override === false
          ? undefined
          : (match?.score ?? 0) >= 80
          ? match?.bestMatch?.id
          : undefined;

      return {
        id: Date.now() + index,
        songId: entry.songId ?? autoSongId,
        title: entry.title,
        artist: entry.artist ? [entry.artist] : [],
        startTime: Math.round(entry.startTime * 10) / 10,
        endTime: Math.round((entry.endTime ?? entry.startTime + 30) * 10) / 10,
        color: randomPastelColor(),
        niconicoLink: "",
        youtubeLink: "",
        spotifyLink: "",
        applemusicLink: "",
      };
    });

    onImport(songs);
    handleClose();
  };

  // ── CSV file upload ───────────────────────────────────────────────────────

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvInput(ev.target?.result as string ?? "");
    };
    reader.readAsText(file, "UTF-8");
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Match badge ───────────────────────────────────────────────────────────

  const getMatchBadge = (index: number) => {
    if (isAutoMatchLoading) {
      return (
        <span className="text-xs text-gray-400 px-1 py-0.5 rounded border border-gray-300">
          照合中...
        </span>
      );
    }

    const match = autoMatchResults[index];
    const override = matchOverrides[index];

    if (override === false) {
      return (
        <span className="text-xs text-gray-400 px-1 py-0.5 rounded border border-gray-300 line-through">
          除外
        </span>
      );
    }

    if (!match || !match.bestMatch) {
      return (
        <span className="text-xs text-gray-400 px-1 py-0.5 rounded border border-gray-300">
          未マッチ
        </span>
      );
    }

    const score = match.score;
    const artistNames = match.bestMatch.artist.map((a) => a.name).join(", ");

    if (score >= 80) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-xs text-green-700 bg-green-100 px-1.5 py-0.5 rounded border border-green-300 font-medium">
            ✓ {match.bestMatch.title}
            {artistNames ? ` / ${artistNames}` : ""}
          </span>
          <button
            onClick={() =>
              setMatchOverrides((prev) => ({ ...prev, [index]: false }))
            }
            className="text-xs text-gray-400 hover:text-red-600"
            title="マッチを除外"
          >
            ✕
          </button>
        </div>
      );
    }

    if (score >= 40) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-xs text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-300">
            ? {match.bestMatch.title}
            {artistNames ? ` / ${artistNames}` : ""}
          </span>
          <button
            onClick={() =>
              setMatchOverrides((prev) => ({ ...prev, [index]: true }))
            }
            className="text-xs text-green-600 hover:text-green-800"
            title="このマッチを確定"
          >
            ✓
          </button>
          <button
            onClick={() =>
              setMatchOverrides((prev) => ({ ...prev, [index]: false }))
            }
            className="text-xs text-gray-400 hover:text-red-600"
            title="マッチを除外"
          >
            ✕
          </button>
        </div>
      );
    }

    return null;
  };

  // ── Samples ───────────────────────────────────────────────────────────────

  const sampleText = `00:00 楽曲1 / アーティスト1
01:30 楽曲2 - アーティスト2
【02:45】楽曲3・アーティスト3
(03:20) 楽曲4 by アーティスト4
04:15～ 楽曲5
♪ 05:00 楽曲6 feat. アーティスト6`;

  const sampleCSV = `開始,曲名,アーティスト
0:00,楽曲1,アーティスト1
1:30,楽曲2,アーティスト2
2:45,楽曲3,アーティスト3`;

  const currentInput = activeTab === "csv" ? csvInput : textInput;

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} maxWidth="lg">
      <h2 className="text-xl font-bold mb-3 text-gray-900">
        セットリストインポート
      </h2>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "text"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("text")}
        >
          テキスト
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "csv"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("csv")}
        >
          CSV / TSV
        </button>
      </div>

      <div className="space-y-4">
        {/* ── Text tab ── */}
        {activeTab === "text" && (
          <>
            {/* Format help */}
            <div className="p-3 bg-indigo-50 rounded-md">
              <div className="text-sm text-indigo-800 grid grid-cols-2 gap-2">
                <div>
                  <p className="font-medium mb-1">基本形式:</p>
                  <ul className="space-y-0.5 ml-2 text-xs">
                    <li>• <code>MM:SS 曲名 / アーティスト</code></li>
                    <li>• <code>MM:SS 曲名 - アーティスト</code></li>
                    <li>• <code>【MM:SS】曲名</code></li>
                    <li>• <code>(MM:SS) 曲名</code></li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">区切り文字:</p>
                  <p className="text-xs ml-2">
                    <code>/</code> · <code>-</code> · <code>by</code> ·
                    <code>・</code> · <code>feat.</code>
                  </p>
                </div>
              </div>
            </div>

            {/* AI mode toggle */}
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                セットリスト
              </label>
              <Button
                variant={parseMode === "ai" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setParseMode((m) => (m === "ai" ? "regex" : "ai"))
                }
              >
                {parseMode === "ai" ? "✨ AI 解析 ON" : "AI 解析"}
              </Button>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`例:\n${sampleText}`}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono text-sm"
            />

            {parseMode === "ai" && (
              <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded">
                ✨ AIモード: Gemini で非標準フォーマットも解析します。
                失敗時は通常解析にフォールバックします。
              </p>
            )}
          </>
        )}

        {/* ── CSV tab ── */}
        {activeTab === "csv" && (
          <>
            <div className="p-3 bg-indigo-50 rounded-md text-sm text-indigo-800">
              <p className="font-medium mb-1">CSV / TSV ペースト</p>
              <p className="text-xs">
                カラム例: <code>開始時間, 曲名, アーティスト</code>（タブ区切り自動検出）
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  CSVデータ
                </label>
                <label className="cursor-pointer text-sm text-orange-600 hover:text-orange-700 underline">
                  ファイルを選択
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder={`例 (タブ or カンマ区切り):\n${sampleCSV}`}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono text-sm"
              />
            </div>
          </>
        )}

        {/* AI fallback warning */}
        {aiFallbackWarning && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-yellow-800 text-sm">⚠ {aiFallbackWarning}</p>
          </div>
        )}

        {/* Preview button */}
        <Button
          onClick={handlePreview}
          disabled={!currentInput.trim() || isParsingAI}
          className="w-full"
        >
          {isParsingAI ? "AI 解析中..." : "プレビュー"}
        </Button>

        {/* Error */}
        {parseError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{parseError}</p>
          </div>
        )}

        {/* Preview table */}
        {previewSongs.length > 0 && (
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 text-sm">
                プレビュー ({previewSongs.length}曲)
              </h3>
              {isAutoMatchLoading && (
                <span className="text-xs text-gray-500">DBマッチング中...</span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-200">
              {previewSongs.map((entry, index) => (
                <div key={index} className="px-3 py-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {entry.title}
                      </p>
                      {entry.artist && (
                        <p className="text-xs text-gray-500">{entry.artist}</p>
                      )}
                      <div className="mt-0.5">{getMatchBadge(index)}</div>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0 text-right">
                      <div>{entry.time}</div>
                      <div>
                        〜{" "}
                        {Math.floor((entry.endTime ?? 0) / 60)}:
                        {String((entry.endTime ?? 0) % 60).padStart(2, "0")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={handleClose}>
          キャンセル
        </Button>
        <Button onClick={handleImport} disabled={previewSongs.length === 0}>
          {previewSongs.length}曲をインポート
        </Button>
      </div>
    </BaseModal>
  );
}
