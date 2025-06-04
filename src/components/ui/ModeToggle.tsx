"use client";

interface ModeToggleProps {
  isAnnotationMode: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function ModeToggle({ isAnnotationMode, onToggle }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          表示モード:
        </span>
        
        <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
          <button
            onClick={() => onToggle(false)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              !isAnnotationMode
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
          >
            🎥 通常プレイヤー
          </button>
          
          <button
            onClick={() => onToggle(true)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isAnnotationMode
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
          >
            🎵 メドレーアノテーション
          </button>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {isAnnotationMode ? (
          "楽曲の切り替えタイミングとコード進行を表示"
        ) : (
          "Songle風の汎用ニコニコ動画プレイヤー"
        )}
      </div>
    </div>
  );
}