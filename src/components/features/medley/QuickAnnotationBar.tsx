"use client";

import { useState, useEffect, useRef } from "react";

interface QuickAnnotationBarProps {
  isVisible: boolean;
  currentTime: number;
  isPlaying: boolean;
  onAddAnnotation: (annotation: { title: string; artist: string; startTime: number }) => void;
  onClose: () => void;
}

export default function QuickAnnotationBar({
  isVisible,
  currentTime,
  isPlaying,
  onAddAnnotation,
  onClose
}: QuickAnnotationBarProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // 表示時にフォーカスを設定
  useEffect(() => {
    if (isVisible && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isVisible]);

  // 録画開始時に開始時刻を設定
  const handleStartRecording = () => {
    setStartTime(currentTime);
    setIsRecording(true);
  };

  // アノテーション追加
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalStartTime = startTime !== null ? startTime : currentTime;
    
    onAddAnnotation({
      title: title.trim(),
      artist: artist.trim(),
      startTime: finalStartTime
    });

    // フォームをリセット
    setTitle("");
    setArtist("");
    setStartTime(null);
    setIsRecording(false);
    
    // フォーカスを維持
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  };

  // キーボードショートカット
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'F2' || (e.ctrlKey && e.key === 'r')) {
      e.preventDefault();
      handleStartRecording();
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!isVisible) return null;

  return (
    <div className="bg-orange-50 border-b-2 border-orange-200 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
            <h3 className="text-sm font-medium text-orange-800">
              クイックアノテーション
            </h3>
            <span className="text-xs text-orange-600">
              {isRecording ? `録画中: ${formatTime(startTime!)} から` : `現在時刻: ${formatTime(currentTime)}`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-orange-600 hover:text-orange-800 p-1"
            title="閉じる (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-2">
          <div className="grid grid-cols-12 gap-2">
            {/* 楽曲名入力 */}
            <div className="col-span-5">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="楽曲名を入力..."
                className="w-full px-3 py-1.5 text-sm border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* アーティスト名入力 */}
            <div className="col-span-4">
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="アーティスト名（任意）"
                className="w-full px-3 py-1.5 text-sm border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* アクションボタン */}
            <div className="col-span-3 flex gap-1">
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={isRecording}
                className="flex-1 px-2 py-1.5 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                title="現在時刻から開始 (F2 or Ctrl+R)"
              >
                {isRecording ? '録画中' : '開始'}
              </button>
              
              <button
                type="submit"
                disabled={!title.trim()}
                className="flex-1 px-2 py-1.5 text-xs bg-mint-600 text-white rounded-md hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500 disabled:opacity-50"
                title="アノテーション追加 (Enter)"
              >
                追加
              </button>
            </div>
          </div>

          {/* ヘルプテキスト */}
          <div className="flex justify-between text-xs text-orange-600">
            <div className="space-x-4">
              <span>💡 <kbd className="px-1 bg-orange-100 rounded">Enter</kbd> 追加</span>
              <span><kbd className="px-1 bg-orange-100 rounded">F2</kbd> 録画開始</span>
              <span><kbd className="px-1 bg-orange-100 rounded">Esc</kbd> 閉じる</span>
            </div>
            <div>
              {isPlaying ? (
                <span className="text-green-600">▶️ 再生中</span>
              ) : (
                <span className="text-gray-500">⏸️ 一時停止中</span>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}