"use client";

import { useState, useEffect, useMemo } from "react";
import { getSongDatabase, searchSongs, SongDatabaseEntry, createSongFromDatabase } from "@/lib/utils/songDatabase";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import SongInfoDisplay from "@/components/ui/song/SongInfoDisplay";

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

  // SongDatabaseEntryからSongSectionに変換するヘルパー関数
  const convertToSongSection = (dbEntry: SongDatabaseEntry): SongSection => {
    return {
      ...createSongFromDatabase(dbEntry, 0, 0),
      id: Date.now() + Math.random() // 一時的なID
    };
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="xl">
        {/* ヘッダー */}
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          楽曲を選択
        </h2>
        
        {/* 検索フィールド */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="楽曲名またはアーティスト名で検索..."
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-caramel-600 dark:bg-gray-700 dark:text-white"
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
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {searchResults.length}件の楽曲が見つかりました
        </p>

        {/* 検索結果リスト */}
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {searchResults.map((song) => {
              const songSection = convertToSongSection(song);
              return (
                <div
                  key={song.id}
                  onClick={() => onSelectSong(song)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-3"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <SongInfoDisplay
                        song={songSection}
                        variant="card"
                        showTimeCodes={false}
                      />
                    </div>
                    
                    {/* 選択ボタン */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSong(song);
                      }}
                      className="ml-4 px-4 py-2 bg-caramel-600 text-white rounded text-sm hover:bg-caramel-700 focus:outline-none focus:ring-2 focus:ring-caramel-600 whitespace-nowrap self-center"
                    >
                      選択
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* 検索結果がない場合 */}
            {searchResults.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-4">「{searchTerm}」に一致する楽曲が見つかりませんでした</p>
                <button
                  onClick={onManualAdd}
                  className="px-4 py-2 bg-olive-600 text-white rounded hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-600"
                >
                  新しい楽曲として手動で追加
                </button>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 flex justify-between">
          <button
            onClick={onManualAdd}
            className="px-4 py-2 bg-olive-600 text-white rounded hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-600"
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
    </BaseModal>
  );
}