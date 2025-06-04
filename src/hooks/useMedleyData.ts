import { useEffect, useState } from 'react';
import { ChordSection, SongSection } from '@/types';
import { getMedleyByVideoId } from '@/data/medleys';

export function useMedleyData(videoId: string) {
    const [medleySongs, setMedleySongs] = useState<SongSection[]>([]);
    const [medleyChords, setMedleyChords] = useState<ChordSection[]>([]);
    const [medleyTitle, setMedleyTitle] = useState<string>("");
    const [medleyCreator, setMedleyCreator] = useState<string>("");
    const [medleyDuration, setMedleyDuration] = useState<number>(0);

    useEffect(() => {
        const medleyData = getMedleyByVideoId(videoId);
        if (medleyData) {
            setMedleySongs(medleyData.songs);
            setMedleyChords(medleyData.chords || []);
            setMedleyDuration(medleyData.duration);
            setMedleyTitle(medleyData.title);
            setMedleyCreator(medleyData.creator || "");
        } else {
            // メドレーデータがない場合は空の配列にする
            setMedleySongs([]);
            setMedleyChords([]);
            setMedleyTitle("");
            setMedleyCreator("");
            setMedleyDuration(0);
        }
    }, [videoId]);

    return {
        medleySongs,
        medleyChords,
        medleyTitle,
        medleyCreator,
        medleyDuration,
    };
}