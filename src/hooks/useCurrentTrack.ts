import { useEffect, useState } from 'react';
import { SongSection } from '@/types';

export function useCurrentTrack(
    currentTime: number,
    songs: SongSection[]
) {
    const [currentSong, setCurrentSong] = useState<SongSection | null>(null);

    useEffect(() => {
        const song = songs.find((song) => currentTime >= song.startTime && currentTime < song.endTime) || null;

        // 楽曲が見つからなくなった場合（範囲外）
        if (!song && currentSong) {
            setCurrentSong(null);
            return;
        }

        // 楽曲が見つかった場合、IDまたは内容が変わっているかチェック
        if (song && (!currentSong || song.id !== currentSong.id || JSON.stringify(song) !== JSON.stringify(currentSong))) {
            setCurrentSong(song);
        }
    }, [currentTime, currentSong, songs]);

    return { currentSong };
}