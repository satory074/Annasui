import React, { useState, useEffect, useCallback } from 'react';
import { useTapTempo } from '../../../hooks/useTapTempo';

interface BpmEditModalProps {
  isOpen: boolean;
  initialBpm: number;
  title?: string;
  onSave: (bpm: number) => void;
  onCancel: () => void;
}

const BPM_PRESETS = [60, 80, 90, 100, 120, 140, 160, 180, 200];

export const BpmEditModal: React.FC<BpmEditModalProps> = ({
  isOpen,
  initialBpm,
  title = 'BPM値を編集',
  onSave,
  onCancel
}) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [inputValue, setInputValue] = useState(initialBpm.toString());
  const [snapToGrid, setSnapToGrid] = useState(true);
  const { bpm: tapBpm, tapCount, tap, reset: resetTap } = useTapTempo();

  useEffect(() => {
    if (isOpen) {
      setBpm(initialBpm);
      setInputValue(initialBpm.toString());
      resetTap();
    }
  }, [isOpen, initialBpm, resetTap]);

  // タップテンポで取得したBPMを適用
  useEffect(() => {
    if (tapBpm !== null) {
      const finalBpm = snapToGrid ? Math.round(tapBpm / 5) * 5 : tapBpm;
      setBpm(finalBpm);
      setInputValue(finalBpm.toString());
    }
  }, [tapBpm, snapToGrid]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 30 && numValue <= 300) {
      setBpm(numValue);
    }
  }, []);

  const adjustBpm = useCallback((delta: number) => {
    const newBpm = Math.max(30, Math.min(300, bpm + delta));
    const finalBpm = snapToGrid ? Math.round(newBpm / 5) * 5 : newBpm;
    setBpm(finalBpm);
    setInputValue(finalBpm.toString());
  }, [bpm, snapToGrid]);

  const handleSliderChange = useCallback((value: number) => {
    const finalBpm = snapToGrid ? Math.round(value / 5) * 5 : value;
    setBpm(finalBpm);
    setInputValue(finalBpm.toString());
  }, [snapToGrid]);

  const handlePresetClick = useCallback((presetBpm: number) => {
    setBpm(presetBpm);
    setInputValue(presetBpm.toString());
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(bpm);
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      adjustBpm(e.shiftKey ? 10 : 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      adjustBpm(e.shiftKey ? -10 : -1);
    }
  }, [bpm, onSave, onCancel, adjustBpm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-[90vw]"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* 現在のBPM表示 */}
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {bpm} BPM
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {(60 / bpm).toFixed(2)}秒/拍
            </div>
          </div>

          {/* 数値入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              BPM値
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustBpm(-10)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                -10
              </button>
              <button
                onClick={() => adjustBpm(-1)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                -1
              </button>
              <input
                type="number"
                min="30"
                max="300"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
              <button
                onClick={() => adjustBpm(1)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                +1
              </button>
              <button
                onClick={() => adjustBpm(10)}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                +10
              </button>
            </div>
          </div>

          {/* スライダー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              スライダー調整
            </label>
            <input
              type="range"
              min="30"
              max="300"
              value={bpm}
              onChange={(e) => handleSliderChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>30</span>
              <span>150</span>
              <span>300</span>
            </div>
          </div>

          {/* タップテンポ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              タップテンポ
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={tap}
                className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors"
              >
                TAP ({tapCount})
              </button>
              <button
                onClick={resetTap}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                リセット
              </button>
            </div>
            {tapBpm && (
              <div className="text-sm text-green-600 dark:text-green-400 mt-2 text-center">
                測定値: {tapBpm} BPM
              </div>
            )}
          </div>

          {/* プリセット */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              プリセット
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BPM_PRESETS.map((presetBpm) => (
                <button
                  key={presetBpm}
                  onClick={() => handlePresetClick(presetBpm)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    bpm === presetBpm
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {presetBpm}
                </button>
              ))}
            </div>
          </div>

          {/* オプション */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                5の倍数にスナップ
              </span>
            </label>
          </div>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={() => onSave(bpm)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              保存
            </button>
          </div>

          {/* キーボードショートカット */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            ↑↓: ±1 | Shift+↑↓: ±10 | Enter: 保存 | Esc: キャンセル
          </div>
        </div>
      </div>
    </div>
  );
};