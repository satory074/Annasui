"use client";

import { useState, useEffect, useMemo } from "react";
import { getSongDatabase, searchSongs, SongDatabaseEntry, SearchResult, createSongFromDatabase } from "@/lib/utils/songDatabase";
import { SongSection } from "@/types";
import BaseModal from "@/components/ui/modal/BaseModal";
import SongInfoDisplay from "@/components/ui/song/SongInfoDisplay";
import { logger } from '@/lib/utils/logger';
import ArtistSelector from "@/components/ui/form/ArtistSelector";

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

interface Artist {
  id: string;
  name: string;
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
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    artist: Artist[];
    composers: Artist[];
    arrangers: Artist[];
    niconicoLink?: string;
    youtubeLink?: string;
    spotifyLink?: string;
    applemusicLink?: string;
  } | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);

  // 検索結果とページネーション
  const { searchResults, totalPages, paginatedResults, resultsByMatchType } = useMemo(() => {
    const results = searchSongs(songDatabase, searchTerm);
    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedResults = results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    
    // 一致タイプ別に分類
    const resultsByMatchType = {
      exact: results.filter(r => r.matchType === 'exact'),
      startsWith: results.filter(r => r.matchType === 'startsWith'),
      wordMatch: results.filter(r => r.matchType === 'wordMatch'),
      partialMatch: results.filter(r => r.matchType === 'partialMatch'),
      fuzzyMatch: results.filter(r => r.matchType === 'fuzzyMatch')
    };
    
    return {
      searchResults: results,
      totalPages,
      paginatedResults,
      resultsByMatchType
    };
  }, [songDatabase, searchTerm, currentPage]);

  // モーダルが開かれたときに検索フィールドをクリアし、データベースを読み込む
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setCurrentPage(1);
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

  // 検索語が変わったときは最初のページに戻る
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 編集開始ハンドラ
  const handleStartEdit = (song: SongDatabaseEntry) => {
    setEditingEntryId(song.id);
    setEditFormData({
      title: song.title,
      artist: song.artist,
      composers: song.composers || [],
      arrangers: song.arrangers || [],
      niconicoLink: song.niconicoLink,
      youtubeLink: song.youtubeLink,
      spotifyLink: song.spotifyLink,
      applemusicLink: song.applemusicLink
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

    // Artist配列はそのまま使用（ID込みで）
    const updatedSong: SongDatabaseEntry = {
      ...originalSong,
      title: editFormData.title,
      artist: editFormData.artist,
      composers: editFormData.composers,
      arrangers: editFormData.arrangers,
      niconicoLink: editFormData.niconicoLink,
      youtubeLink: editFormData.youtubeLink,
      spotifyLink: editFormData.spotifyLink,
      applemusicLink: editFormData.applemusicLink
    };

    // 先にローカルの楽曲キャッシュを更新しておく（Select直後の即時保存で古いデータが使われないようにする）
    setSongDatabase((prev) =>
      prev.map((song) => (song.id === editingEntryId ? updatedSong : song))
    );

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

    setEditFormData({
      ...editFormData,
      [field]: value || undefined
    });
  };

  if (!isOpen) return null;

  // SongDatabaseEntryからSongSectionに変換するヘルパー関数
  const convertToSongSection = (dbEntry: SongDatabaseEntry): SongSection => {
    return {
      ...createSongFromDatabase(dbEntry, 0, 0),
      id: Date.now() + Math.random() // 一時的なID
    };
  };

  // 一致タイプのラベルと色を取得
  const getMatchTypeInfo = (matchType: SearchResult['matchType']) => {
    switch (matchType) {
      case 'exact':
        return { label: '完全一致', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'startsWith':
        return { label: '前方一致', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'wordMatch':
        return { label: '単語一致', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'partialMatch':
        return { label: '部分一致', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'fuzzyMatch':
        return { label: 'あいまい一致', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

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
          <h2 className="text-xl font-bold mb-3 text-gray-900">
            楽曲を選択
          </h2>

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
        
        {/* 結果件数とページネーション情報 */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <p className="text-sm text-gray-600">
              {searchResults.length}件の楽曲が見つかりました
              {totalPages > 1 && (
                <span className="ml-2 text-gray-500">
                  （{currentPage}/{totalPages}ページ）
                </span>
              )}
            </p>
            
            {/* 一致タイプ別の件数表示（検索時のみ） */}
            {searchTerm && searchResults.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(resultsByMatchType).map(([type, results]) => {
                  if (results.length === 0) return null;
                  const info = getMatchTypeInfo(type as SearchResult['matchType']);
                  return (
                    <span
                      key={type}
                      className={`px-2 py-1 rounded-full text-xs border ${info.color}`}
                    >
                      {info.label}: {results.length}件
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* ページサイズ変更 */}
          {searchResults.length > 10 && (
            <div className="text-sm text-gray-600">
              1ページに{ITEMS_PER_PAGE}件表示
            </div>
          )}
        </div>

        {/* 検索結果リスト */}
        <div className="flex-1 overflow-y-auto max-h-[50vh]">
          <div className="space-y-3">
            {paginatedResults.map((song) => {
              const songSection = convertToSongSection(song);
              const isEditing = editingEntryId === song.id;
              const isSearchResult = 'searchScore' in song && searchTerm;
              const matchInfo = isSearchResult ? getMatchTypeInfo((song as SearchResult).matchType) : null;
              
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600"
                          />
                        </div>
                        <div>
                          <ArtistSelector
                            selectedArtists={editFormData?.artist || []}
                            onChange={(artists) => {
                              if (editFormData) {
                                setEditFormData({ ...editFormData, artist: artists });
                              }
                            }}
                            label="アーティスト名"
                            placeholder="アーティスト名を選択または新規追加"
                          />
                        </div>
                      </div>

                      {/* 作曲者・編曲者編集 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ArtistSelector
                          selectedArtists={editFormData?.composers || []}
                          onChange={(artists) => {
                            if (editFormData) {
                              setEditFormData({ ...editFormData, composers: artists });
                            }
                          }}
                          label="作曲者"
                          placeholder="作曲者を選択または新規追加"
                        />
                        <ArtistSelector
                          selectedArtists={editFormData?.arrangers || []}
                          onChange={(artists) => {
                            if (editFormData) {
                              setEditFormData({ ...editFormData, arrangers: artists });
                            }
                          }}
                          label="編曲者"
                          placeholder="編曲者を選択または新規追加"
                        />
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
                              value={editFormData?.niconicoLink || ''}
                              onChange={(e) => handleFormChange('niconicoLink', e.target.value)}
                              placeholder="https://www.nicovideo.jp/watch/..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              ▶️ YouTube
                            </label>
                            <input
                              type="url"
                              value={editFormData?.youtubeLink || ''}
                              onChange={(e) => handleFormChange('youtubeLink', e.target.value)}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              🎵 Spotify
                            </label>
                            <input
                              type="url"
                              value={editFormData?.spotifyLink || ''}
                              onChange={(e) => handleFormChange('spotifyLink', e.target.value)}
                              placeholder="https://open.spotify.com/track/..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              🍎 Apple Music
                            </label>
                            <input
                              type="url"
                              value={editFormData?.applemusicLink || ''}
                              onChange={(e) => handleFormChange('applemusicLink', e.target.value)}
                              placeholder="https://music.apple.com/..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-600 text-sm"
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
                      onClick={() => handleSelectSongWithAutoSave(song)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          {searchTerm ? (
                            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                                  <HighlightMatch text={song.title} query={searchTerm} />
                                </h3>
                                <p className="text-gray-600 text-sm mb-1 truncate">
                                  <HighlightMatch text={song.artist.map(a => a.name).join(", ")} query={searchTerm} />
                                </p>
                                {song.niconicoLink || song.youtubeLink || song.spotifyLink || song.applemusicLink ? (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {song.niconicoLink && <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">🎬</span>}
                                    {song.youtubeLink && <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">📺</span>}
                                    {song.spotifyLink && <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">🎵</span>}
                                    {song.applemusicLink && <span className="bg-gray-200 px-2 py-0.5 rounded text-xs">🍎</span>}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <SongInfoDisplay
                              song={songSection}
                              variant="card"
                              showTimeCodes={false}
                            />
                          )}
                          
                          {/* 検索関連情報 */}
                          {isSearchResult && matchInfo && (
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs border ${matchInfo.color}`}>
                                {matchInfo.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                スコア: {Math.round((song as SearchResult).searchScore)}
                              </span>
                              <span className="text-xs text-gray-500">
                                一致フィールド: {
                                  (song as SearchResult).matchedField === 'title' ? '楽曲名' :
                                  (song as SearchResult).matchedField === 'artist' ? 'アーティスト名' :
                                  '楽曲名・アーティスト名'
                                }
                              </span>
                              {song.usageCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  使用回数: {song.usageCount}回
                                </span>
                              )}
                            </div>
                          )}
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
                              handleSelectSongWithAutoSave(song);
                            }}
                            className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 whitespace-nowrap"
                            disabled={isAutoSaving}
                          >
                            {isAutoSaving ? '保存中...' : '選択'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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

        {/* フッター */}
        <div className="border-t border-gray-200 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isAutoSaving}
          >
            {autoSave && !isAutoSaving ? '完了' : 'キャンセル'}
          </button>
        </div>
    </BaseModal>
  );
}
