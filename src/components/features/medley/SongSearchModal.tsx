"use client";

import { useState, useEffect, useMemo } from "react";
import { getSongDatabase, searchSongs, SongDatabaseEntry, createSongFromDatabase } from "@/lib/utils/songDatabase";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import SongInfoDisplay from "@/components/ui/song/SongInfoDisplay";
import { logger } from '@/lib/utils/logger';

interface SongSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: SongDatabaseEntry) => void;
  onManualAdd: () => void; // 手動入力オプション
  onEditSong?: (song: SongDatabaseEntry) => void; // 楽曲編集用
}

export default function SongSearchModal({
  isOpen,
  onClose,
  onSelectSong,
  onManualAdd,
  onEditSong
}: SongSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [songDatabase, setSongDatabase] = useState<SongDatabaseEntry[]>([]);
  const [, setIsLoading] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    artist: string;
    originalLink?: string;
    links?: {
      niconico?: string;
      youtube?: string;
      spotify?: string;
      appleMusic?: string;
    };
  } | null>(null);

  // 検索結果
  const searchResults = useMemo(() => {
    return searchSongs(songDatabase, searchTerm);
  }, [songDatabase, searchTerm]);

  // モーダルが開かれたときに検索フィールドをクリアし、データベースを読み込む
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setEditingEntryId(null);
      setEditFormData(null);
      
      // Load song database
      const loadSongDatabase = async () => {
        setIsLoading(true);
        try {
          const db = await getSongDatabase();
          setSongDatabase(db);
        } catch (error) {
          logger.error('Failed to load song database:', error);
          setSongDatabase([]);
        }
        setIsLoading(false);
      };
      
      loadSongDatabase();
    }
  }, [isOpen]);

  // 編集開始ハンドラ
  const handleStartEdit = (song: SongDatabaseEntry) => {
    setEditingEntryId(song.id);
    setEditFormData({
      title: song.title,
      artist: song.artist,
      originalLink: song.originalLink,
      links: song.links
    });
  };

  // 編集キャンセルハンドラ
  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditFormData(null);
  };

  // 編集保存ハンドラ
  const handleSaveEdit = () => {
    if (!editFormData || !editingEntryId) return;

    const originalSong = songDatabase.find(s => s.id === editingEntryId);
    if (!originalSong) return;

    const updatedSong: SongDatabaseEntry = {
      ...originalSong,
      title: editFormData.title,
      artist: editFormData.artist,
      originalLink: editFormData.originalLink,
      links: editFormData.links
    };

    // 編集コールバックを呼び出し
    if (onEditSong) {
      onEditSong(updatedSong);
    }

    setEditingEntryId(null);
    setEditFormData(null);
  };

  // フォーム入力ハンドラ
  const handleFormChange = (field: string, value: string) => {
    if (!editFormData) return;
    
    if (field.startsWith('links.')) {
      const linkField = field.split('.')[1] as keyof NonNullable<typeof editFormData.links>;
      setEditFormData({
        ...editFormData,
        links: {
          ...editFormData.links,
          [linkField]: value || undefined
        }
      });
    } else {
      setEditFormData({
        ...editFormData,
        [field]: value
      });
    }
  };

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
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          楽曲を選択
        </h2>
        
        {/* 検索フィールド */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="楽曲名またはアーティスト名で検索..."
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
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
        <p className="text-sm text-gray-600 mb-4">
          {searchResults.length}件の楽曲が見つかりました
        </p>

        {/* 検索結果リスト */}
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {searchResults.map((song) => {
              const songSection = convertToSongSection(song);
              const isEditing = editingEntryId === song.id;
              
              return (
                <div
                  key={song.id}
                  className={`border rounded-lg transition-colors p-3 ${
                    isEditing 
                      ? 'border-orange-600 bg-orange-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {isEditing ? (
                    /* 編集フォーム */
                    <div className="space-y-4">
                      {/* 基本情報編集 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            楽曲名
                          </label>
                          <input
                            type="text"
                            value={editFormData?.title || ''}
                            onChange={(e) => handleFormChange('title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            アーティスト名
                          </label>
                          <input
                            type="text"
                            value={editFormData?.artist || ''}
                            onChange={(e) => handleFormChange('artist', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600"
                          />
                        </div>
                      </div>

                      {/* プラットフォームリンク編集 */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">配信プラットフォーム</h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              🎬 ニコニコ動画
                            </label>
                            <input
                              type="url"
                              value={editFormData?.links?.niconico || ''}
                              onChange={(e) => handleFormChange('links.niconico', e.target.value)}
                              placeholder="https://www.nicovideo.jp/watch/..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              📺 YouTube
                            </label>
                            <input
                              type="url"
                              value={editFormData?.links?.youtube || ''}
                              onChange={(e) => handleFormChange('links.youtube', e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              🎵 Spotify
                            </label>
                            <input
                              type="url"
                              value={editFormData?.links?.spotify || ''}
                              onChange={(e) => handleFormChange('links.spotify', e.target.value)}
                              placeholder="https://open.spotify.com/track/..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              🍎 Apple Music
                            </label>
                            <input
                              type="url"
                              value={editFormData?.links?.appleMusic || ''}
                              onChange={(e) => handleFormChange('links.appleMusic', e.target.value)}
                              placeholder="https://music.apple.com/..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 編集ボタン */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 表示モード */
                    <div
                      onClick={() => onSelectSong(song)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <SongInfoDisplay
                            song={songSection}
                            variant="card"
                            showTimeCodes={false}
                          />
                        </div>
                        
                        {/* ボタングループ */}
                        <div className="flex gap-2 self-center">
                          {onEditSong && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(song);
                              }}
                              className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 whitespace-nowrap"
                            >
                              編集
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSong(song);
                            }}
                            className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 whitespace-nowrap"
                          >
                            選択
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 検索結果がない場合 */}
            {searchResults.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">「{searchTerm}」に一致する楽曲が見つかりませんでした</p>
                <button
                  onClick={onManualAdd}
                  className="px-4 py-2 bg-mint-600 text-white rounded hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-mint-600"
                >
                  新しい楽曲として手動で追加
                </button>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="border-t border-gray-200 pt-4 mt-4 flex justify-between">
          <button
            onClick={onManualAdd}
            className="px-4 py-2 bg-mint-600 text-white rounded hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-mint-600"
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