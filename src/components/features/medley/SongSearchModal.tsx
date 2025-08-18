"use client";

import { useState, useEffect, useMemo } from "react";
import { getSongDatabase, searchSongs, SongDatabaseEntry } from "@/lib/utils/songDatabase";

interface SongSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: SongDatabaseEntry) => void;
  onManualAdd: () => void; // 手動入力オプション
}

export default function SongSearchModal({
  isOpen,
  onClose,
  onSelectSong,
  onManualAdd
}: SongSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [songDatabase] = useState(() => getSongDatabase());

  // 検索結果
  const searchResults = useMemo(() => {
    return searchSongs(songDatabase, searchTerm);
  }, [songDatabase, searchTerm]);

  // モーダルが開かれたときに検索フィールドをクリア
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            楽曲を選択
          </h2>
          
          {/* 検索フィールド */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="楽曲名またはアーティスト名で検索..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <svg 
              className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* 結果件数 */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {searchResults.length}件の楽曲が見つかりました
          </p>
        </div>

        {/* 検索結果リスト */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {searchResults.map((song) => (
              <div
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {song.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {song.artist}
                    </p>
                    
                    {/* 使用回数とメドレー情報 */}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        {song.usageCount}回使用
                      </span>
                      {song.genre && (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          {song.genre}
                        </span>
                      )}
                    </div>
                    
                    {/* 使用されているメドレー（最大3つまで表示） */}
                    <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      使用メドレー: {song.medleys.slice(0, 3).map(m => m.medleyTitle).join(", ")}
                      {song.medleys.length > 3 && ` 他${song.medleys.length - 3}件`}
                    </div>
                  </div>
                  
                  {/* 選択ボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSong(song);
                    }}
                    className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                  >
                    選択
                  </button>
                </div>
              </div>
            ))}
            
            {/* 検索結果がない場合 */}
            {searchResults.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-4">「{searchTerm}」に一致する楽曲が見つかりませんでした</p>
                <button
                  onClick={onManualAdd}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  新しい楽曲として手動で追加
                </button>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={onManualAdd}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            手動で新しい楽曲を追加
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}