import { useState, useCallback, useEffect } from 'react';
import { SongSection, MedleyData } from '@/types';
import { updateMedley, createMedley } from '@/lib/api/medleys';
import { getMedleyByVideoId as getStaticMedleyByVideoId } from '@/data/medleys';

interface UseMedleyEditReturn {
  editingSongs: SongSection[];
  hasChanges: boolean;
  isSaving: boolean;
  updateSong: (updatedSong: SongSection) => void;
  addSong: (newSong: Omit<SongSection, 'id'>) => void;
  deleteSong: (songId: number) => void;
  saveMedley: (videoId: string, medleyTitle: string, medleyCreator: string, duration: number) => Promise<boolean>;
  resetChanges: (originalSongs: SongSection[]) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;
}

export function useMedleyEdit(originalSongs: SongSection[]): UseMedleyEditReturn {
  const [editingSongs, setEditingSongs] = useState<SongSection[]>(originalSongs);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 変更を検知するためのヘルパー関数
  const detectChanges = useCallback((newSongs: SongSection[]) => {
    const changed = JSON.stringify(newSongs) !== JSON.stringify(originalSongs);
    setHasChanges(changed);
  }, [originalSongs]);

  // 楽曲を更新
  const updateSong = useCallback((updatedSong: SongSection) => {
    setEditingSongs(prev => {
      const newSongs = prev.map(song =>
        song.id === updatedSong.id ? updatedSong : song
      );
      detectChanges(newSongs);
      return newSongs;
    });
  }, [detectChanges]);

  // 楽曲を追加
  const addSong = useCallback((newSong: Omit<SongSection, 'id'>) => {
    const songWithId: SongSection = {
      ...newSong,
      id: Math.max(...editingSongs.map(s => s.id), 0) + 1
    };
    
    setEditingSongs(prev => {
      const newSongs = [...prev, songWithId].sort((a, b) => a.startTime - b.startTime);
      detectChanges(newSongs);
      return newSongs;
    });
  }, [editingSongs, detectChanges]);

  // 楽曲を削除
  const deleteSong = useCallback((songId: number) => {
    setEditingSongs(prev => {
      const newSongs = prev.filter(song => song.id !== songId);
      detectChanges(newSongs);
      return newSongs;
    });
  }, [detectChanges]);

  // 楽曲の順序を変更
  const reorderSongs = useCallback((fromIndex: number, toIndex: number) => {
    setEditingSongs(prev => {
      const newSongs = [...prev];
      const [movedSong] = newSongs.splice(fromIndex, 1);
      newSongs.splice(toIndex, 0, movedSong);
      detectChanges(newSongs);
      return newSongs;
    });
  }, [detectChanges]);

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
        genre: song.genre,
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
  }, []);

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
    updateSong,
    addSong,
    deleteSong,
    saveMedley,
    resetChanges,
    reorderSongs
  };
}