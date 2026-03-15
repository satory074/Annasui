"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import PlayPauseButton from "@/components/ui/PlayPauseButton";
import VolumeSlider from "./VolumeSlider";
import { formatTime } from "@/lib/utils/time";

interface FixedPlayerBarProps {
  // 左側セクション: タイトル情報
  title?: string;
  creator?: string;
  originalVideoUrl?: string;

  // 中央セクション: 再生コントロール
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlayPause: () => void;
  onSeek: (seekTime: number) => void;

  // 右側セクション: ボリューム・フルスクリーン
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleFullscreen: () => void;
}

export default function FixedPlayerBar({
  title,
  creator,
  originalVideoUrl,
  isPlaying,
  currentTime,
  duration,
  onTogglePlayPause,
  onSeek,
  volume,
  onVolumeChange,
  onToggleFullscreen,
}: FixedPlayerBarProps) {
  const seekBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);

  // ミュート状態管理
  const [isMuted, setIsMuted] = useState(false);
  const [preMuteVolume, setPreMuteVolume] = useState(volume);

  const getTimeFromMouseEvent = useCallback(
    (e: MouseEvent | React.MouseEvent): number => {
      if (!seekBarRef.current || duration <= 0) return 0;
      const rect = seekBarRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return pct * duration;
    },
    [duration]
  );

  // ドラッグ中のグローバルイベント登録
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setDragTime(getTimeFromMouseEvent(e));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const t = getTimeFromMouseEvent(e);
      setDragTime(null);
      onSeek(Math.max(0, Math.min(duration, t)));
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [getTimeFromMouseEvent, duration, onSeek]);

  const handleSeekMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setDragTime(getTimeFromMouseEvent(e));
  };

  const handleSeekMouseMove = (e: React.MouseEvent) => {
    setHoverTime(getTimeFromMouseEvent(e));
  };

  const handleSeekMouseLeave = () => {
    setHoverTime(null);
    setIsHoveringSeek(false);
  };

  const handleSeekMouseEnter = () => {
    setIsHoveringSeek(true);
  };

  // キーボードでシーク（←/→ 5秒移動）
  const handleSeekKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - 5));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onSeek(Math.min(duration, currentTime + 5));
    }
  };

  // ミュートトグル
  const handleMuteToggle = () => {
    if (isMuted) {
      onVolumeChange({ target: { value: String(preMuteVolume) } } as React.ChangeEvent<HTMLInputElement>);
      setIsMuted(false);
    } else {
      setPreMuteVolume(volume);
      onVolumeChange({ target: { value: "0" } } as React.ChangeEvent<HTMLInputElement>);
      setIsMuted(true);
    }
  };

  // 表示する再生位置（ドラッグ中はdragTime優先）
  const displayTime = dragTime ?? currentTime;
  const progressPct = duration > 0 ? Math.max(0, Math.min(100, (displayTime / duration) * 100)) : 0;

  // ホバー時のtooltip位置（%）
  const hoverPct = hoverTime !== null && duration > 0
    ? Math.max(0, Math.min(100, (hoverTime / duration) * 100))
    : null;

  const showThumb = isHoveringSeek || isDraggingRef.current || dragTime !== null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 text-white shadow-2xl border-t border-gray-700">
      {/* ドラッグ中のテキスト選択防止オーバーレイ */}
      {dragTime !== null && (
        <div className="fixed inset-0 z-40 cursor-grabbing" style={{ pointerEvents: "all" }} />
      )}

      <div className="flex items-center px-4 py-3 gap-4">

        {/* 左側セクション: タイトル情報 (25%) — sm未満で非表示 */}
        <div className="hidden sm:flex w-1/4 min-w-[160px] items-center gap-3">
          <div className="flex-1 min-w-0">
            {title && (
              originalVideoUrl ? (
                <a
                  href={originalVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-white hover:text-orange-400 hover:underline transition-colors truncate block"
                  title={title}
                >
                  {title}
                </a>
              ) : (
                <h3 className="text-sm font-semibold text-white truncate" title={title}>
                  {title}
                </h3>
              )
            )}
            {creator && (
              <p className="text-xs text-gray-400 truncate" title={creator}>
                {creator}
              </p>
            )}
          </div>
        </div>

        {/* 中央セクション: 再生コントロール + シークバー */}
        <div className="flex-1 flex flex-col gap-2">
          {/* 再生コントロールボタン */}
          <div className="flex items-center justify-center gap-2">
            {/* 最初からボタン */}
            <button
              onClick={() => onSeek(0)}
              className="text-gray-300 hover:text-white transition-all p-1 rounded-full hover:bg-gray-700"
              aria-label="最初から再生"
              title="最初から"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* 5秒戻るボタン */}
            <button
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
              className="flex flex-col items-center text-gray-300 hover:text-white transition-all p-1 rounded-full hover:bg-gray-700"
              aria-label="5秒戻る"
              title="5秒戻る"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
              <span className="text-[9px] text-orange-400 font-bold leading-none">5</span>
            </button>

            {/* 再生/一時停止ボタン */}
            <PlayPauseButton
              isPlaying={isPlaying}
              onClick={onTogglePlayPause}
              size="md"
            />

            {/* 5秒進むボタン */}
            <button
              onClick={() => onSeek(Math.min(duration, currentTime + 5))}
              className="flex flex-col items-center text-gray-300 hover:text-white transition-all p-1 rounded-full hover:bg-gray-700"
              aria-label="5秒進む"
              title="5秒進む"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
              <span className="text-[9px] text-orange-400 font-bold leading-none">5</span>
            </button>
          </div>

          {/* シークバーと時間表示 */}
          <div className="flex items-center gap-3">
            {/* 現在時刻 */}
            <div className="text-xs text-gray-300 min-w-[45px] text-right tabular-nums">
              {formatTime(displayTime)}
            </div>

            {/* シークバー */}
            <div
              ref={seekBarRef}
              role="slider"
              aria-label="再生位置"
              aria-valuenow={Math.round(displayTime)}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              tabIndex={0}
              className="flex-1 relative h-2 bg-gray-600 rounded cursor-pointer hover:h-3 transition-[height] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 focus:ring-offset-gray-800"
              onMouseDown={handleSeekMouseDown}
              onMouseMove={handleSeekMouseMove}
              onMouseEnter={handleSeekMouseEnter}
              onMouseLeave={handleSeekMouseLeave}
              onKeyDown={handleSeekKeyDown}
            >
              {/* 進行状況バー */}
              <div
                className="absolute top-0 bottom-0 rounded-l bg-orange-500 pointer-events-none"
                style={{ width: `${progressPct}%` }}
              />

              {/* サム（白い丸） - ホバー/ドラッグ時に表示 */}
              {showThumb && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none z-10"
                  style={{ left: `${progressPct}%`, transform: "translate(-50%, -50%)" }}
                />
              )}

              {/* ホバー時刻 tooltip */}
              {hoverTime !== null && hoverPct !== null && (
                <div
                  className="absolute bottom-full mb-2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap z-20"
                  style={{ left: `${hoverPct}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* 総時間 */}
            <div className="text-xs text-gray-300 min-w-[45px] tabular-nums">
              {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* 右側セクション: ボリューム + フルスクリーン */}
        <div className="w-1/6 min-w-[150px] flex items-center justify-end gap-3">
          <VolumeSlider
            volume={volume}
            onChange={onVolumeChange}
            onMuteToggle={handleMuteToggle}
            isMuted={isMuted}
          />

          <button
            onClick={onToggleFullscreen}
            className="text-gray-300 hover:text-white transition-colors p-1 rounded hover:bg-gray-700"
            title="フルスクリーン"
            aria-label="フルスクリーン"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}

FixedPlayerBar.displayName = "FixedPlayerBar";
