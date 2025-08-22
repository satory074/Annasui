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
}

export default function SongTimeControls({
  label,
  value,
  onChange,
  currentTime,
  error,
  placeholder = "mm:ss または秒数",
  minValue,
  maxValue
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

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={formatTimeSimple(value)}
          onChange={handleInputChange}
          className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm whitespace-nowrap"
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
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}