import { useState, useCallback, useEffect } from 'react';
import { SongSection, MedleyData } from '@/types';
import { updateMedley, createMedley } from '@/lib/api/medleys';
import { logger } from '@/lib/utils/logger';
import { formatTime } from '@/lib/utils/time';
import { hasSongsChanged, areSongArraysEqual } from '@/lib/utils/compare';

interface UseMedleyEditReturn {
  editingSongs: SongSection[];
  hasChanges: boolean;
  isSaving: boolean;
  saveFailed: boolean;
  saveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  updateSong: (updatedSong: SongSection) => void;
  addSong: (newSong: Omit<SongSection, 'id'> | SongSection) => void;
  deleteSong: (songId: number) => void;
  saveMedley: (videoId: string, medleyTitle: string, medleyCreator: string, duration: number, editorNickname?: string, songsOverride?: SongSection[]) => Promise<boolean>;
  resetChanges: (originalSongs: SongSection[]) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;
  batchUpdate: (songsToRemove: number[], songsToAdd: Omit<SongSection, 'id'>[]) => void;
  undo: () => void;
  redo: () => void;
  resetSaveError: () => void;
}

interface UseMedleyEditProps {
  originalSongs: SongSection[];
  isRefetching?: boolean;
  onSaveSuccess?: () => void;
  onAfterAdd?: (newSongs: SongSection[]) => void;
  onAfterUpdate?: (newSongs: SongSection[]) => void;
  onAfterDelete?: (newSongs: SongSection[]) => void;
  onAfterBatchUpdate?: (newSongs: SongSection[]) => void;
}

export function useMedleyEdit(
  props: UseMedleyEditProps | SongSection[]
): UseMedleyEditReturn {
  // Handle both old and new API formats for backward compatibility
  const originalSongs = Array.isArray(props) ? props : props.originalSongs;
  const isRefetching = Array.isArray(props) ? false : props.isRefetching;
  const onAfterAdd = Array.isArray(props) ? undefined : props.onAfterAdd;
  const onAfterUpdate = Array.isArray(props) ? undefined : props.onAfterUpdate;
  const onAfterDelete = Array.isArray(props) ? undefined : props.onAfterDelete;
  const onAfterBatchUpdate = Array.isArray(props) ? undefined : props.onAfterBatchUpdate;
  const [editingSongs, setEditingSongs] = useState<SongSection[]>(originalSongs);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  
  // Undo/Redo履歴管理
  const [history, setHistory] = useState<SongSection[][]>([originalSongs]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const MAX_HISTORY = 50; // 最大履歴数

  // 変更を検知するためのヘルパー関数
  // Uses efficient deep comparison instead of JSON.stringify for better performance
  const detectChanges = useCallback((newSongs: SongSection[]) => {
    const songsChanged = hasSongsChanged(newSongs, originalSongs);
    setHasChanges(songsChanged);
  }, [originalSongs]);

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
      updatedSongArtist: updatedSong.artist.join(", ")
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
            originalArtist: song.artist.join(", "),
            newArtist: updatedSong.artist.join(", ")
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

      return newSongs;
    });

    // 即時保存コールバックを呼び出す（React state更新後に実行、新しい楽曲リストを渡す）
    if (onAfterUpdate) {
      logger.info('🔔 updateSong: Scheduling onAfterUpdate callback');
      setTimeout(() => {
        // setEditingSongs内のnewSongsをキャプチャするため、クロージャを使う
        setEditingSongs(currentSongs => {
          logger.info('📞 updateSong: Calling onAfterUpdate callback', {
            songsCount: currentSongs.length,
            songs: currentSongs.map(s => ({ id: s.id, title: s.title }))
          });
          onAfterUpdate(currentSongs);
          logger.info('✅ updateSong: onAfterUpdate callback completed');
          return currentSongs; // 状態は変更しない
        });
      }, 0);
    } else {
      logger.info('ℹ️ updateSong: No onAfterUpdate callback registered');
    }
  }, [detectChanges, addToHistory, onAfterUpdate]);

  // 楽曲を追加
  const addSong = useCallback((newSong: Omit<SongSection, 'id'> | SongSection) => {
    setEditingSongs(prev => {
      // CRITICAL FIX: Move ID generation inside setEditingSongs to use latest state
      // If song already has an ID (from placeholder), preserve it
      // Otherwise generate a new ID based on current state
      const songWithId: SongSection = {
        ...newSong,
        id: 'id' in newSong && newSong.id ? newSong.id : Math.max(...prev.map(s => s.id), 0) + 1
      };

      logger.info('🆕 addSong called', {
        hasExistingId: 'id' in newSong && newSong.id !== undefined,
        existingId: 'id' in newSong ? newSong.id : undefined,
        finalId: songWithId.id,
        title: songWithId.title,
        currentSongsCount: prev.length
      });

      const newSongs = [...prev, songWithId].sort((a, b) => a.startTime - b.startTime);
      addToHistory(newSongs);
      detectChanges(newSongs);

      return newSongs;
    });

    // 即時保存コールバックを呼び出す（React state更新後に実行、新しい楽曲リストを渡す）
    if (onAfterAdd) {
      logger.info('🔔 addSong: Scheduling onAfterAdd callback');
      setTimeout(() => {
        setEditingSongs(currentSongs => {
          logger.info('📞 addSong: Calling onAfterAdd callback', {
            songsCount: currentSongs.length,
            songs: currentSongs.map(s => ({ id: s.id, title: s.title }))
          });
          onAfterAdd(currentSongs);
          logger.info('✅ addSong: onAfterAdd callback completed');
          return currentSongs;
        });
      }, 0);
    } else {
      logger.info('ℹ️ addSong: No onAfterAdd callback registered');
    }
  }, [detectChanges, addToHistory, onAfterAdd]);

  // 楽曲を削除
  const deleteSong = useCallback((songId: number) => {
    setEditingSongs(prev => {
      const newSongs = prev.filter(song => song.id !== songId);
      addToHistory(newSongs);
      detectChanges(newSongs);

      return newSongs;
    });

    // 即時保存コールバックを呼び出す（React state更新後に実行、新しい楽曲リストを渡す）
    if (onAfterDelete) {
      logger.info('🔔 deleteSong: Scheduling onAfterDelete callback');
      setTimeout(() => {
        setEditingSongs(currentSongs => {
          logger.info('📞 deleteSong: Calling onAfterDelete callback', {
            songsCount: currentSongs.length,
            songs: currentSongs.map(s => ({ id: s.id, title: s.title }))
          });
          onAfterDelete(currentSongs);
          logger.info('✅ deleteSong: onAfterDelete callback completed');
          return currentSongs;
        });
      }, 0);
    } else {
      logger.info('ℹ️ deleteSong: No onAfterDelete callback registered');
    }
  }, [detectChanges, addToHistory, onAfterDelete]);

  // 楽曲の順序を変更
  const reorderSongs = useCallback((fromIndex: number, toIndex: number) => {
    setEditingSongs(prev => {
      const newSongs = [...prev];
      const [movedSong] = newSongs.splice(fromIndex, 1);
      newSongs.splice(toIndex, 0, movedSong);
      addToHistory(newSongs);
      detectChanges(newSongs);

      return newSongs;
    });

    // 即時保存コールバックを呼び出す（React state更新後に実行、新しい楽曲リストを渡す）
    if (onAfterUpdate) {
      setTimeout(() => {
        setEditingSongs(currentSongs => {
          onAfterUpdate(currentSongs);
          return currentSongs;
        });
      }, 0);
    }
  }, [detectChanges, addToHistory, onAfterUpdate]);

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

      return finalSongs;
    });

    // 即時保存コールバックを呼び出す（React state更新後に実行、新しい楽曲リストを渡す）
    if (onAfterBatchUpdate) {
      logger.info('🔔 batchUpdate: Scheduling onAfterBatchUpdate callback');
      setTimeout(() => {
        setEditingSongs(currentSongs => {
          logger.info('📞 batchUpdate: Calling onAfterBatchUpdate callback', {
            songsCount: currentSongs.length,
            songs: currentSongs.map(s => ({ id: s.id, title: s.title }))
          });
          onAfterBatchUpdate(currentSongs);
          logger.info('✅ batchUpdate: onAfterBatchUpdate callback completed');
          return currentSongs;
        });
      }, 0);
    } else {
      logger.info('ℹ️ batchUpdate: No onAfterBatchUpdate callback registered');
    }
  }, [detectChanges, addToHistory, onAfterBatchUpdate]);


  // メドレーを保存
  const saveMedley = useCallback(async (
    videoId: string,
    medleyTitle: string,
    medleyCreator: string,
    duration: number,
    editorNickname?: string,
    songsOverride?: SongSection[]
  ): Promise<boolean> => {
    setIsSaving(true);
    setSaveFailed(false); // 保存開始時にエラー状態をクリア
    setSaveError(null);

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

      // 使用する楽曲リスト（上書きがあれば使用、なければ現在の編集中楽曲を使用）
      const songsToValidateAndSave = songsOverride ?? editingSongs;

      // 保存前に必須項目を一括チェック
      const invalidSongs = songsToValidateAndSave.filter(song => {
        const isTitleEmpty = !song.title || song.title.trim() === '' || song.title.startsWith('空の楽曲');
        const isArtistEmpty = !song.artist || song.artist.length === 0 || song.artist.join(", ").trim() === '' || song.artist.join(", ") === 'アーティスト未設定';
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
          if (!song.artist || song.artist.length === 0 || song.artist.join(", ").trim() === '' || song.artist.join(", ") === 'アーティスト未設定') {
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
      const songsToSave = songsToValidateAndSave.map((song) => ({
        title: song.title,
        artist: song.artist,
        startTime: song.startTime,
        endTime: song.endTime,
        color: song.color,
        niconicoLink: song.niconicoLink,
        youtubeLink: song.youtubeLink,
        spotifyLink: song.spotifyLink,
        applemusicLink: song.applemusicLink
      }));

      // Try to update first, then create if it doesn't exist
      let result = await updateMedley(videoId, {
        title: medleyTitle,
        creator: medleyCreator,
        duration: duration,
        songs: songsToSave
      }, editorNickname);

      if (!result) {
        // Create new medley if update failed (doesn't exist)
        const medleyData: Omit<MedleyData, 'songs'> & { songs: Omit<SongSection, 'id'>[] } = {
          videoId,
          title: medleyTitle,
          creator: medleyCreator,
          duration,
          songs: songsToSave
        };
        result = await createMedley(medleyData, editorNickname);
      }

      if (result) {
        setHasChanges(false);
        setSaveFailed(false);
        setSaveError(null);
        logger.info('Medley saved successfully:', result);
        return true;
      } else {
        // 保存失敗時の状態保護
        setSaveFailed(true);
        const errorMsg = 'メドレーの保存に失敗しました。編集内容は保持されています。';
        setSaveError(errorMsg);
        logger.error('Failed to save medley - data preserved in editingSongs', {
          editingSongsCount: editingSongs.length,
          songsData: editingSongs.map(s => ({ id: s.id, title: s.title }))
        });
        alert(`${errorMsg}\n\nもう一度保存ボタンを押すか、ページを再読み込みせずに編集を続けることができます。`);
        return false;
      }
    } catch (error) {
      // エラー時の状態保護
      setSaveFailed(true);
      const errorMsg = error instanceof Error ? error.message : 'メドレーの保存中にエラーが発生しました。';
      setSaveError(errorMsg);
      logger.error('Error saving medley - data preserved in editingSongs', {
        error,
        editingSongsCount: editingSongs.length,
        songsData: editingSongs.map(s => ({ id: s.id, title: s.title }))
      });
      alert(`保存中にエラーが発生しました: ${errorMsg}\n\n編集内容は保持されています。もう一度保存ボタンを押すか、ページを再読み込みせずに編集を続けることができます。`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editingSongs]);

  // 変更をリセット
  const resetChanges = useCallback((originalSongs: SongSection[]) => {
    setEditingSongs(originalSongs);
    setHasChanges(false);
    setSaveFailed(false);
    setSaveError(null);
    setHistory([originalSongs]);
    setHistoryIndex(0);
  }, []);

  // 保存エラーをリセット（ユーザーが編集を続ける場合）
  const resetSaveError = useCallback(() => {
    setSaveFailed(false);
    setSaveError(null);
    logger.info('Save error state reset - user continuing to edit');
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


  // 元のsongs配列が変更された時に編集中の配列も更新
  useEffect(() => {
    // 編集中の曲があり、originalSongsが空の場合は更新しない
    // （ユーザーが編集中で、親コンポーネントがまだデータを取得していない状態）
    if (editingSongs.length > 0 && originalSongs.length === 0) {
      logger.debug('⏸️ Skipping update: user is editing and originalSongs is empty', {
        editingSongsCount: editingSongs.length,
        originalSongsCount: originalSongs.length
      });
      return;
    }

    // Use efficient comparison instead of JSON.stringify
    const contentsMatch = areSongArraysEqual(editingSongs, originalSongs);

    // 初回読み込みで内容が異なる場合のみ更新
    // refetch中、編集中、保存中、保存失敗後は更新しない（ユーザーの編集を保護）
    if (!contentsMatch && !isRefetching && !hasChanges && !isSaving && !saveFailed) {
      logger.debug('🔄 Updating editingSongs from originalSongs', {
        hasChanges,
        isSaving,
        originalSongsCount: originalSongs.length,
        editingSongsCount: editingSongs.length,
        contentsMatch
      });

      setEditingSongs(originalSongs);
      setHistory([originalSongs]);
      setHistoryIndex(0);
      setHasChanges(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalSongs]);

  return {
    editingSongs,
    hasChanges,
    isSaving,
    saveFailed,
    saveError,
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
    resetSaveError,
  };
}