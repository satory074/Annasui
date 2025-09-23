import { useState, useCallback, useEffect, useRef } from 'react';
import { SongSection, MedleyData } from '@/types';
import { updateMedley, createMedley } from '@/lib/api/medleys';
import { logger } from '@/lib/utils/logger';
import { formatTime } from '@/lib/utils/time';

interface UseMedleyEditReturn {
  editingSongs: SongSection[];
  hasChanges: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  updateSong: (updatedSong: SongSection) => void;
  addSong: (newSong: Omit<SongSection, 'id'>) => void;
  deleteSong: (songId: number) => void;
  saveMedley: (videoId: string, medleyTitle: string, medleyCreator: string, duration: number) => Promise<boolean>;
  resetChanges: (originalSongs: SongSection[]) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;
  batchUpdate: (songsToRemove: number[], songsToAdd: Omit<SongSection, 'id'>[]) => void;
  undo: () => void;
  redo: () => void;
  // 自動保存機能
  enableAutoSave: (videoId: string, medleyTitle: string, medleyCreator: string, duration: number) => void;
  disableAutoSave: () => void;
  isAutoSaving: boolean;
}

export function useMedleyEdit(
  originalSongs: SongSection[]
): UseMedleyEditReturn {
  const [editingSongs, setEditingSongs] = useState<SongSection[]>(originalSongs);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // 自動保存設定
  const autoSaveConfigRef = useRef<{
    enabled: boolean;
    videoId: string;
    medleyTitle: string;
    medleyCreator: string;
    duration: number;
  }>({ enabled: false, videoId: '', medleyTitle: '', medleyCreator: '', duration: 0 });
  
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  
  // Undo/Redo履歴管理
  const [history, setHistory] = useState<SongSection[][]>([originalSongs]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const MAX_HISTORY = 50; // 最大履歴数

  // 変更を検知するためのヘルパー関数
  const detectChanges = useCallback((newSongs: SongSection[]) => {
    const songsChanged = JSON.stringify(newSongs) !== JSON.stringify(originalSongs);
    setHasChanges(songsChanged);
  }, [originalSongs]);

  // 自動保存処理
  const performAutoSave = useCallback(async () => {
    const config = autoSaveConfigRef.current;
    if (!config.enabled || isAutoSaving || !config.videoId) {
      return;
    }

    // 楽曲情報が不完全な楽曲がある場合は自動保存しない
    const invalidSongs = editingSongs.filter(song => {
      const isTitleEmpty = !song.title || song.title.trim() === '' || song.title.startsWith('空の楽曲');
      const isArtistEmpty = !song.artist || song.artist.trim() === '' || song.artist === 'アーティスト未設定';
      return isTitleEmpty || isArtistEmpty;
    });

    if (invalidSongs.length > 0) {
      logger.debug('🔄 Skipping auto-save: invalid songs present', {
        invalidCount: invalidSongs.length,
        totalCount: editingSongs.length
      });
      return;
    }

    try {
      setIsAutoSaving(true);
      logger.info('🔄 Auto-saving medley changes...', {
        videoId: config.videoId,
        songCount: editingSongs.length
      });

      // 楽曲データの準備（IDを除く）
      const songsToSave = editingSongs.map((song, index) => ({
        title: song.title,
        artist: song.artist,
        startTime: song.startTime,
        endTime: song.endTime,
        color: song.color,
        originalLink: song.originalLink,
        links: song.links,
        order_index: index + 1
      }));

      // Try to update first, then create if it doesn't exist
      let result = await updateMedley(config.videoId, {
        title: config.medleyTitle,
        creator: config.medleyCreator,
        duration: config.duration,
        songs: songsToSave
      });
      
      if (!result) {
        // Create new medley if update failed (doesn't exist)
        const medleyData: Omit<MedleyData, 'songs'> & { songs: Omit<SongSection, 'id'>[] } = {
          videoId: config.videoId,
          title: config.medleyTitle,
          creator: config.medleyCreator,
          duration: config.duration,
          songs: songsToSave
        };
        result = await createMedley(medleyData);
      }

      if (result) {
        setHasChanges(false);
        logger.info('✅ Auto-save completed successfully');
      } else {
        logger.warn('⚠️ Auto-save failed');
      }
    } catch (error) {
      logger.error('❌ Auto-save error:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [isAutoSaving, editingSongs]);

  // デバウンス付き自動保存トリガー
  const triggerAutoSave = useCallback(() => {
    if (!autoSaveConfigRef.current.enabled) {
      return;
    }

    // 既存のタイマーをクリア
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // 2秒のデバウンスで自動保存を実行
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000);
  }, [performAutoSave]);

  // 履歴に新しい状態を追加
  const addToHistory = useCallback((newSongs: SongSection[]) => {
    setHistory(prevHistory => {
      // 現在の位置より後の履歴を削除（分岐した履歴を削除）
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      
      // 新しい状態を追加
      newHistory.push([...newSongs]);
      
      // 最大履歴数を超えたら古いものを削除
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        setHistoryIndex(Math.max(0, historyIndex));
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [historyIndex, MAX_HISTORY]);

  // Undo/Redoの可能状態
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 楽曲を更新
  const updateSong = useCallback((updatedSong: SongSection) => {
    logger.info('🔄 updateSong called in useMedleyEdit', {
      updatedSongId: updatedSong.id,
      updatedSongTitle: updatedSong.title,
      updatedSongArtist: updatedSong.artist
    });
    
    setEditingSongs(prev => {
      logger.info('🔍 updateSong: searching in current songs', {
        searchingForId: updatedSong.id,
        currentSongs: prev.map(s => ({ id: s.id, title: s.title })),
        matchFound: prev.some(s => s.id === updatedSong.id)
      });
      
      const newSongs = prev.map(song => {
        const isMatch = song.id === updatedSong.id;
        if (isMatch) {
          logger.info('✅ Found matching song to update', {
            originalTitle: song.title,
            newTitle: updatedSong.title,
            originalArtist: song.artist,
            newArtist: updatedSong.artist
          });
        }
        return isMatch ? updatedSong : song;
      });
      
      const wasUpdated = newSongs.some((song, index) => 
        song.id === updatedSong.id && prev[index].title !== updatedSong.title
      );
      
      if (!wasUpdated) {
        logger.warn('⚠️ updateSong: No song was actually updated - possible ID mismatch', {
          searchedForId: updatedSong.id,
          availableIds: prev.map(s => s.id),
          updatedSongTitle: updatedSong.title,
          possibleDuplicate: 'This may result in duplicate songs being created'
        });
      }
      
      logger.info('🔄 updateSong result', {
        wasUpdated: wasUpdated,
        resultingSongs: newSongs.map(s => ({ id: s.id, title: s.title }))
      });
      
      addToHistory(newSongs);
      detectChanges(newSongs);
      
      // 自動保存をトリガー
      triggerAutoSave();
      
      return newSongs;
    });
  }, [detectChanges, addToHistory, triggerAutoSave]);

  // 楽曲を追加
  const addSong = useCallback((newSong: Omit<SongSection, 'id'>) => {
    const songWithId: SongSection = {
      ...newSong,
      id: Math.max(...editingSongs.map(s => s.id), 0) + 1
    };
    
    setEditingSongs(prev => {
      const newSongs = [...prev, songWithId].sort((a, b) => a.startTime - b.startTime);
      addToHistory(newSongs);
      detectChanges(newSongs);
      
      // 自動保存をトリガー
      triggerAutoSave();
      
      return newSongs;
    });
  }, [editingSongs, detectChanges, addToHistory, triggerAutoSave]);

  // 楽曲を削除
  const deleteSong = useCallback((songId: number) => {
    setEditingSongs(prev => {
      const newSongs = prev.filter(song => song.id !== songId);
      addToHistory(newSongs);
      detectChanges(newSongs);
      
      // 自動保存をトリガー
      triggerAutoSave();
      
      return newSongs;
    });
  }, [detectChanges, addToHistory, triggerAutoSave]);

  // 楽曲の順序を変更
  const reorderSongs = useCallback((fromIndex: number, toIndex: number) => {
    setEditingSongs(prev => {
      const newSongs = [...prev];
      const [movedSong] = newSongs.splice(fromIndex, 1);
      newSongs.splice(toIndex, 0, movedSong);
      addToHistory(newSongs);
      detectChanges(newSongs);
      
      // 自動保存をトリガー
      triggerAutoSave();
      
      return newSongs;
    });
  }, [detectChanges, addToHistory, triggerAutoSave]);

  // 一括更新（マルチセグメント対応）- 複数の削除と追加を一度に処理
  const batchUpdate = useCallback((
    songsToRemove: number[], 
    songsToAdd: Omit<SongSection, 'id'>[]
  ) => {
    logger.debug('🔄 batchUpdate called:', {
      removing: songsToRemove.length,
      adding: songsToAdd.length,
      songsToRemove,
      songsToAdd: songsToAdd.map(s => ({ title: s.title, startTime: s.startTime, endTime: s.endTime }))
    });
    
    setEditingSongs(prev => {
      logger.debug('🔄 batchUpdate: current state:', prev.length, 'songs');
      
      // 削除対象以外の楽曲を取得
      const remainingSongs = prev.filter(song => !songsToRemove.includes(song.id));
      logger.debug('🔄 batchUpdate: after removal:', remainingSongs.length, 'songs remain');
      
      // 新しいIDを生成して追加する楽曲を準備
      const currentMaxId = Math.max(...prev.map(s => s.id), 0);
      const newSongs = songsToAdd.map((song, index) => ({
        ...song,
        id: currentMaxId + index + 1
      }));
      logger.debug('🔄 batchUpdate: new songs created:', newSongs.length, 'with IDs:', newSongs.map(s => s.id));
      
      // 残りの楽曲と新しい楽曲を結合して時間順にソート
      const finalSongs = [...remainingSongs, ...newSongs].sort((a, b) => a.startTime - b.startTime);
      logger.debug('🔄 batchUpdate: final result:', finalSongs.length, 'songs total');
      
      addToHistory(finalSongs);
      detectChanges(finalSongs);
      
      // 自動保存をトリガー
      triggerAutoSave();
      
      return finalSongs;
    });
  }, [detectChanges, addToHistory, triggerAutoSave]);


  // メドレーを保存
  const saveMedley = useCallback(async (
    videoId: string, 
    medleyTitle: string, 
    medleyCreator: string, 
    duration: number
  ): Promise<boolean> => {
    setIsSaving(true);

    try {
      // Supabaseが設定されているかチェック
      const isSupabaseConfigured = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here' &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
      );

      if (!isSupabaseConfigured) {
        logger.warn('Supabase is not configured. Changes cannot be saved.');
        alert('データベースが設定されていないため、変更を保存できません。Supabaseの設定を確認してください。');
        return false;
      }

      // Database-only mode: no static data fallback needed
      
      // 保存前に必須項目を一括チェック
      const invalidSongs = editingSongs.filter(song => {
        const isTitleEmpty = !song.title || song.title.trim() === '' || song.title.startsWith('空の楽曲');
        const isArtistEmpty = !song.artist || song.artist.trim() === '' || song.artist === 'アーティスト未設定';
        return isTitleEmpty || isArtistEmpty;
      });

      if (invalidSongs.length > 0) {
        logger.warn(`Validation failed: ${invalidSongs.length} songs have missing required fields`);
        
        // ユーザーフレンドリーなエラーメッセージを生成
        const errorMessages = invalidSongs.map((song) => {
          const issues = [];
          if (!song.title || song.title.trim() === '' || song.title.startsWith('空の楽曲')) {
            issues.push('楽曲名');
          }
          if (!song.artist || song.artist.trim() === '' || song.artist === 'アーティスト未設定') {
            issues.push('アーティスト名');
          }
          return `• ${formatTime(song.startTime)} ～ ${formatTime(song.endTime)}: ${issues.join('と')}を入力してください`;
        }).slice(0, 8); // 最大8件まで表示

        const remainingCount = invalidSongs.length - errorMessages.length;
        const moreMessage = remainingCount > 0 ? `\n\n他にも ${remainingCount} 件の楽曲で情報が不完全です。` : '';
        
        const title = '📝 楽曲情報が不完全です';
        const instruction = '以下の楽曲を編集して情報を完成させてください：';
        const helpText = '\n💡 ヒント: 編集ボタンをクリックして情報を入力できます。';
        
        alert(`${title}\n\n${instruction}\n\n${errorMessages.join('\n')}${moreMessage}${helpText}`);
        return false;
      }

      // 楽曲データの準備（IDを除く）
      const songsToSave = editingSongs.map((song, index) => ({
        title: song.title,
        artist: song.artist,
        startTime: song.startTime,
        endTime: song.endTime,
        color: song.color,
        originalLink: song.originalLink,
        links: song.links,
        order_index: index + 1
      }));

      // Try to update first, then create if it doesn't exist
      let result = await updateMedley(videoId, {
        title: medleyTitle,
        creator: medleyCreator,
        duration: duration,
        songs: songsToSave
      });
      
      if (!result) {
        // Create new medley if update failed (doesn't exist)
        const medleyData: Omit<MedleyData, 'songs'> & { songs: Omit<SongSection, 'id'>[] } = {
          videoId,
          title: medleyTitle,
          creator: medleyCreator,
          duration,
          songs: songsToSave
        };
        result = await createMedley(medleyData);
      }

      if (result) {
        setHasChanges(false);
        logger.info('Medley saved successfully:', result);
        return true;
      } else {
        logger.error('Failed to save medley');
        alert('メドレーの保存に失敗しました。');
        return false;
      }
    } catch (error) {
      logger.error('Error saving medley:', error);
      alert('メドレーの保存中にエラーが発生しました。');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editingSongs]);

  // 変更をリセット
  const resetChanges = useCallback((originalSongs: SongSection[]) => {
    setEditingSongs(originalSongs);
    setHasChanges(false);
    setHistory([originalSongs]);
    setHistoryIndex(0);
  }, []);

  // Undo機能
  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      setEditingSongs([...previousState]);
      setHistoryIndex(newIndex);
      detectChanges(previousState);
    }
  }, [canUndo, historyIndex, history, detectChanges]);

  // Redo機能
  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setEditingSongs([...nextState]);
      setHistoryIndex(newIndex);
      detectChanges(nextState);
    }
  }, [canRedo, historyIndex, history, detectChanges]);

  // 自動保存を有効化
  const enableAutoSave = useCallback((videoId: string, medleyTitle: string, medleyCreator: string, duration: number) => {
    autoSaveConfigRef.current = {
      enabled: true,
      videoId,
      medleyTitle,
      medleyCreator,
      duration
    };
    logger.info('🔄 Auto-save enabled for medley:', { videoId, medleyTitle });
  }, []);

  // 自動保存を無効化
  const disableAutoSave = useCallback(() => {
    autoSaveConfigRef.current.enabled = false;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    logger.info('🔄 Auto-save disabled');
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // 元のsongs配列が変更された時に編集中の配列も更新
  useEffect(() => {
    // 初回読み込み時、または実際にoriginalSongsの内容が変わった場合は更新
    const currentSongsString = JSON.stringify(editingSongs);
    const originalSongsString = JSON.stringify(originalSongs);
    
    // hasChangesがfalseの場合、または初回読み込みで内容が異なる場合
    if (!hasChanges || currentSongsString !== originalSongsString) {
      logger.debug('🔄 Updating editingSongs from originalSongs', {
        hasChanges,
        originalSongsCount: originalSongs.length,
        editingSongsCount: editingSongs.length,
        contentsMatch: currentSongsString === originalSongsString
      });
      
      setEditingSongs(originalSongs);
      
      // 内容が変わった場合は履歴もリセット
      if (currentSongsString !== originalSongsString) {
        setHistory([originalSongs]);
        setHistoryIndex(0);
        setHasChanges(false);
      }
    }
  }, [originalSongs, hasChanges, editingSongs]);

  return {
    editingSongs,
    hasChanges,
    isSaving,
    isAutoSaving,
    canUndo,
    canRedo,
    updateSong,
    addSong,
    deleteSong,
    saveMedley,
    resetChanges,
    reorderSongs,
    batchUpdate,
    undo,
    redo,
    enableAutoSave,
    disableAutoSave,
  };
}