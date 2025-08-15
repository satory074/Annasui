import { useEffect, useState } from 'react';
import { SongSection } from '@/types';
import { getMedleyByVideoId as getStaticMedleyByVideoId } from '@/data/medleys';
import { useMedleyDataApi } from './useMedleyDataApi';

interface UseMedleyDataReturn {
    medleySongs: SongSection[]
    medleyTitle: string
    medleyCreator: string
    medleyDuration: number
    loading?: boolean
    error?: string | null
}

export function useMedleyData(videoId: string): UseMedleyDataReturn {
    const [medleySongs, setMedleySongs] = useState<SongSection[]>([]);
    const [medleyTitle, setMedleyTitle] = useState<string>("");
    const [medleyCreator, setMedleyCreator] = useState<string>("");
    const [medleyDuration, setMedleyDuration] = useState<number>(0);

    // Check if Supabase is configured
    const isSupabaseConfigured = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here' &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
    );

    // Use API hook only if Supabase is configured
    const apiResult = useMedleyDataApi(isSupabaseConfigured ? videoId : '');

    useEffect(() => {
        if (isSupabaseConfigured) {
            // Use API data when Supabase is configured
            setMedleySongs(apiResult.medleySongs);
            setMedleyTitle(apiResult.medleyTitle);
            setMedleyCreator(apiResult.medleyCreator);
            setMedleyDuration(apiResult.medleyDuration);
        } else {
            // Fallback to static data when Supabase is not configured
            const medleyData = getStaticMedleyByVideoId(videoId);
            if (medleyData) {
                setMedleySongs(medleyData.songs);
                setMedleyDuration(medleyData.duration);
                setMedleyTitle(medleyData.title);
                setMedleyCreator(medleyData.creator || "");
            } else {
                // メドレーデータがない場合は空の配列にする
                setMedleySongs([]);
                setMedleyTitle("");
                setMedleyCreator("");
                setMedleyDuration(0);
            }
        }
    }, [videoId, isSupabaseConfigured, apiResult]);

    return {
        medleySongs,
        medleyTitle,
        medleyCreator,
        medleyDuration,
        loading: isSupabaseConfigured ? apiResult.loading : undefined,
        error: isSupabaseConfigured ? apiResult.error : undefined,
    };
}