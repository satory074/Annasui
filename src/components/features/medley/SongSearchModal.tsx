"use client";

import { useState, useEffect, useMemo } from "react";
import { getSongDatabase, searchSongs, SongDatabaseEntry, SearchResult } from "@/lib/utils/songDatabase";
import BaseModal from "@/components/ui/modal/BaseModal";
import { logger } from '@/lib/utils/logger';

// Highlight matching text within a string
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-yellow-200 text-inherit rounded-sm px-0.5">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

interface SongSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: SongDatabaseEntry) => void;
  onManualAdd: () => void; // 手動入力オプション
  onEditSong?: (song: SongDatabaseEntry) => void; // 楽曲編集用
  // 自動保存機能用
  autoSave?: boolean;
  onAutoSave?: (videoId: string, title: string, creator: string, duration: number) => Promise<boolean>;
  videoId?: string;
  medleyTitle?: string;
  medleyCreator?: string;
  medleyDuration?: number;
}

export default function SongSearchModal({
  isOpen,
  onClose,
  onSelectSong,
  onManualAdd,
  onEditSong,
  autoSave = false,
  onAutoSave,
  videoId = '',
  medleyTitle = '',
  medleyCreator = '',
  medleyDuration = 0
}: SongSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [songDatabase, setSongDatabase] = useState<SongDatabaseEntry[]>([]);
  const [, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);

  // 検索結果とページネーション
  const { searchResults, totalPages, paginatedResults } = useMemo(() => {
    const results = searchSongs(songDatabase, searchTerm);
    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedResults = results.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return {
      searchResults: results,
      totalPages,
      paginatedResults
    };
  }, [songDatabase, searchTerm, currentPage]);

  // モーダルが開かれたときに検索フィールドをクリアし、データベースを読み込む
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setCurrentPage(1);
      
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

  // 重複検出: 同じ dedupKey を持つ楽曲をグループ化
  const duplicateKeys = useMemo(() => {
    const keyCount: Record<string, number> = {};
    songDatabase.forEach(song => {
      if (song.dedupKey) {
        keyCount[song.dedupKey] = (keyCount[song.dedupKey] || 0) + 1;
      }
    });
    // 2件以上あるキーのみ返す
    return new Set(Object.entries(keyCount).filter(([, count]) => count > 1).map(([key]) => key));
  }, [songDatabase]);

  // 検索語が変わったときは最初のページに戻る
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 編集ハンドラ — onEditSong コールバックに委譲
  const handleStartEdit = (song: SongDatabaseEntry) => {
    if (onEditSong) {
      onEditSong(song);
    }
  };

  if (!isOpen) return null;

  // 楽曲選択時の自動保存処理
  const handleSelectSongWithAutoSave = async (song: SearchResult | SongDatabaseEntry) => {
    if (autoSave && onAutoSave && videoId) {
      try {
        setIsAutoSaving(true);
        logger.info('🔄 Auto-saving after song selection...', {
          songTitle: song.title,
          songArtist: song.artist.map(a => a.name).join(", "),
          videoId
        });
        
        // まず楽曲データを更新
        onSelectSong(song);
        
        // 少し待ってからメドレー全体を自動保存
        setTimeout(async () => {
          try {
            const success = await onAutoSave(videoId, medleyTitle, medleyCreator, medleyDuration);
            if (success) {
              logger.info('✅ Auto-save after song selection completed successfully');
            } else {
              logger.warn('⚠️ Auto-save after song selection failed');
            }
          } catch (error) {
            logger.error('❌ Auto-save after song selection error:', error);
          } finally {
            setIsAutoSaving(false);
          }
        }, 500); // 500ms後に実行
      } catch (error) {
        logger.error('❌ Error during auto-save song selection:', error);
        setIsAutoSaving(false);
      }
    } else {
      // 自動保存が無効の場合は通常の処理
      onSelectSong(song);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="xl">
        {/* ヘッダー + 検索フィールド (sticky) */}
        <div className="sticky top-0 bg-white z-10 pb-3 -mx-6 px-6 pt-0 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">
              楽曲を選択
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="閉じる"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 検索バー + 手動追加ボタン */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="楽曲名またはアーティスト名で検索..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
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
            <button
              onClick={onManualAdd}
              className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 whitespace-nowrap text-sm font-medium transition-colors"
              title="手動で新しい楽曲を追加"
            >
              + 手動追加
            </button>
          </div>
        </div>
        
        {/* 結果件数 */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            {searchResults.length}件見つかりました
            {totalPages > 1 && (
              <span className="ml-2 text-gray-500">
                （{currentPage}/{totalPages}ページ）
              </span>
            )}
          </p>
        </div>

        {/* 検索結果リスト */}
        <div className="flex-1 overflow-y-auto max-h-[50vh]">
          <div className="space-y-3">
            {paginatedResults.map((song) => {
              const isSearchResult = 'searchScore' in song && searchTerm;
              const isExactMatch = isSearchResult && (song as SearchResult).matchType === 'exact';
              const hasDuplicate = song.dedupKey && duplicateKeys.has(song.dedupKey);

              return (
                <div
                  key={song.id}
                  className="group border rounded-lg transition-all p-3 border-gray-200 hover:bg-orange-50 hover:border-orange-300 cursor-pointer"
                  onClick={() => handleSelectSongWithAutoSave(song)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {searchTerm ? (
                            <HighlightMatch text={song.title} query={searchTerm} />
                          ) : (
                            song.title
                          )}
                        </h3>
                        {isExactMatch && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 border border-green-200 flex-shrink-0">
                            完全一致
                          </span>
                        )}
                        {hasDuplicate && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0">
                            重複の可能性
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm truncate">
                        {searchTerm ? (
                          <HighlightMatch text={song.artist.map(a => a.name).join(", ")} query={searchTerm} />
                        ) : (
                          song.artist.map(a => a.name).join(", ")
                        )}
                      </p>
                      {(song.niconicoLink || song.youtubeLink || song.spotifyLink || song.applemusicLink) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {song.niconicoLink && <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">🎬</span>}
                          {song.youtubeLink && <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">📺</span>}
                          {song.spotifyLink && <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">🎵</span>}
                          {song.applemusicLink && <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">🍎</span>}
                        </div>
                      )}
                    </div>

                    {/* 編集アイコンボタン + 選択矢印 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onEditSong && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(song);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="マスター楽曲データを編集"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      )}
                      <svg className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* 検索前の初期状態 */}
            {searchResults.length === 0 && !searchTerm && songDatabase.length > 0 && (
              <div className="text-center py-12 text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-base mb-1">楽曲名またはアーティスト名を入力して検索してください</p>
                <p className="text-sm">登録済み: {songDatabase.length}曲</p>
              </div>
            )}

            {/* 検索結果がない場合 */}
            {searchResults.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-10 w-10 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mb-1 text-base font-medium">「{searchTerm}」に一致する楽曲が見つかりませんでした</p>
                <p className="text-sm mb-4 text-gray-400">検索条件を変更するか、新しい楽曲として追加してください</p>
                <button
                  onClick={onManualAdd}
                  className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 font-medium transition-colors"
                >
                  「{searchTerm}」を新しい楽曲として追加
                </button>
              </div>
            )}
            
            {/* ページ内検索結果がない場合（全体では結果がある） */}
            {paginatedResults.length === 0 && searchResults.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>このページには表示する楽曲がありません</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 自動保存ステータス表示 */}
        {autoSave && isAutoSaving && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-blue-700">
                💾 楽曲選択を自動保存中...
              </span>
            </div>
          </div>
        )}
        
        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 py-4 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← 前
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm border rounded ${
                      currentPage === pageNum
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              次 →
            </button>
          </div>
        )}

        {/* フッター (sticky) */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-3 pb-1 -mx-6 px-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isAutoSaving}
          >
            閉じる
          </button>
        </div>
    </BaseModal>
  );
}
