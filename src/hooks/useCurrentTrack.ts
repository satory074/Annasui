import { useEffect, useState } from 'react';
import { SongSection } from '@/types';

export function useCurrentTrack(
    currentTime: number,
    songs: SongSection[]
) {
    const [currentSong, setCurrentSong] = useState<SongSection | null>(null);

    useEffect(() => {
        const song = songs.find((song) => currentTime >= song.startTime && currentTime < song.endTime);
        if (song && (!currentSong || song.id !== currentSong.id)) {
            setCurrentSong(song);
        }
    }, [currentTime, currentSong, songs]);

    return { currentSong };
}