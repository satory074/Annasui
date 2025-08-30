import { SongSection } from '@/types';
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
    // Direct delegation to API hook - database only mode
    const apiResult = useMedleyDataApi(videoId);

    return {
        medleySongs: apiResult.medleySongs,
        medleyTitle: apiResult.medleyTitle,
        medleyCreator: apiResult.medleyCreator,
        medleyDuration: apiResult.medleyDuration,
        loading: apiResult.loading,
        error: apiResult.error,
    };
}