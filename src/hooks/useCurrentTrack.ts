import { useEffect, useState } from 'react';
import { ChordSection, SongSection } from '@/types';

export function useCurrentTrack(
    currentTime: number,
    songs: SongSection[],
    chords: ChordSection[]
) {
    const [currentSong, setCurrentSong] = useState<SongSection | null>(null);
    const [currentChord, setCurrentChord] = useState<ChordSection | null>(null);

    useEffect(() => {
        const song = songs.find((song) => currentTime >= song.startTime && currentTime < song.endTime);
        if (song && (!currentSong || song.id !== currentSong.id)) {
            setCurrentSong(song);
        }

        const chord = chords.find((chord) => currentTime >= chord.startTime && currentTime < chord.endTime);
        if (chord && (!currentChord || chord.id !== currentChord.id)) {
            setCurrentChord(chord);
        }
    }, [currentTime, currentSong, currentChord, songs, chords]);

    return { currentSong, currentChord };
}