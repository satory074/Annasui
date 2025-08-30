"use client";

import { formatTimeSimple, parseTimeInput } from "@/lib/utils/time";

interface SongTimeControlsProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  currentTime: number;
  error?: string;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  // 隣接する楽曲との時刻合わせ用
  adjacentTime?: number;
  adjacentLabel?: string;
}

export default function SongTimeControls({
  label,
  value,
  onChange,
  currentTime,
  error,
  placeholder = "mm:ss または秒数",
  minValue,
  maxValue,
  adjacentTime,
  adjacentLabel
}: SongTimeControlsProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseTimeInput(e.target.value);
    onChange(newValue);
  };

  const handleCurrentTimeClick = () => {
    onChange(Math.floor(currentTime));
  };

  const handleAdjustment = (delta: number) => {
    let newValue = value + delta;
    
    if (minValue !== undefined) {
      newValue = Math.max(minValue, newValue);
    }
    if (maxValue !== undefined) {
      newValue = Math.min(maxValue, newValue);
    }
    
    onChange(newValue);
  };

  const handleAdjacentTimeClick = () => {
    if (adjacentTime !== undefined) {
      onChange(adjacentTime);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={formatTimeSimple(value)}
          onChange={handleInputChange}
          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={placeholder}
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => handleAdjustment(-0.1)}
            className="px-2 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
            title="0.1秒戻る"
          >
            -0.1s
          </button>
          <button
            type="button"
            onClick={handleCurrentTimeClick}
            className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm whitespace-nowrap"
            title="現在の再生位置を設定"
          >
            現在時刻
          </button>
          <button
            type="button"
            onClick={() => handleAdjustment(0.1)}
            className="px-2 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
            title="0.1秒進む"
          >
            +0.1s
          </button>
        </div>
      </div>
      {/* 隣接楽曲との時刻合わせボタン */}
      {adjacentTime !== undefined && adjacentLabel && (
        <div className="mt-2">
          <button
            type="button"
            onClick={handleAdjacentTimeClick}
            className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm font-medium transition-colors"
            title={`${adjacentLabel}（${formatTimeSimple(adjacentTime)}）`}
          >
            {adjacentLabel}
          </button>
        </div>
      )}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}