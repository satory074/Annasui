import { useState, useCallback, useEffect } from 'react';
import { SongSection, MedleyData } from '@/types';
import { updateMedley, createMedley } from '@/lib/api/medleys';
import { getMedleyByVideoId as getStaticMedleyByVideoId } from '@/data/medleys';

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
  undo: () => void;
  redo: () => void;
}

export function useMedleyEdit(
  originalSongs: SongSection[]
): UseMedleyEditReturn {
  const [editingSongs, setEditingSongs] = useState<SongSection[]>(originalSongs);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  
  // Undo/Redo履歴管理
  const [history, setHistory] = useState<SongSection[][]>([originalSongs]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const MAX_HISTORY = 50; // 最大履歴数

  // 変更を検知するためのヘルパー関数
  const detectChanges = useCallback((newSongs: SongSection[]) => {
    const songsChanged = JSON.stringify(newSongs) !== JSON.stringify(originalSongs);
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
    setEditingSongs(prev => {
      const newSongs = prev.map(song =>
        song.id === updatedSong.id ? updatedSong : song
      );
      addToHistory(newSongs);
      detectChanges(newSongs);
      return newSongs;
    });
  }, [detectChanges, addToHistory]);

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
      return newSongs;
    });
  }, [editingSongs, detectChanges, addToHistory]);

  // 楽曲を削除
  const deleteSong = useCallback((songId: number) => {
    setEditingSongs(prev => {
      const newSongs = prev.filter(song => song.id !== songId);
      addToHistory(newSongs);
      detectChanges(newSongs);
      return newSongs;
    });
  }, [detectChanges, addToHistory]);

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
  }, [detectChanges, addToHistory]);


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
        console.warn('Supabase is not configured. Changes cannot be saved.');
        alert('データベースが設定されていないため、変更を保存できません。Supabaseの設定を確認してください。');
        return false;
      }

      // 既存のメドレーが存在するかチェック
      const existingMedley = getStaticMedleyByVideoId(videoId);
      
      // 楽曲データの準備（IDを除く）
      const songsToSave = editingSongs.map((song, index) => ({
        title: song.title,
        artist: song.artist,
        startTime: song.startTime,
        endTime: song.endTime,
        color: song.color,
        originalLink: song.originalLink,
        order_index: index + 1
      }));

      let result;
      if (existingMedley) {
        // 既存のメドレーを更新
        result = await updateMedley(videoId, {
          title: medleyTitle,
          creator: medleyCreator,
          duration: duration
        });
      } else {
        // 新規メドレーを作成
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
        console.log('Medley saved successfully:', result);
        return true;
      } else {
        console.error('Failed to save medley');
        alert('メドレーの保存に失敗しました。');
        return false;
      }
    } catch (error) {
      console.error('Error saving medley:', error);
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

  // 元のsongs配列が変更された時に編集中の配列も更新
  useEffect(() => {
    if (!hasChanges) {
      setEditingSongs(originalSongs);
    }
  }, [originalSongs, hasChanges]);

  return {
    editingSongs,
    hasChanges,
    isSaving,
    canUndo,
    canRedo,
    updateSong,
    addSong,
    deleteSong,
    saveMedley,
    resetChanges,
    reorderSongs,
    undo,
    redo,
  };
}