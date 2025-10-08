import { SongSection, MedleyData } from '@/types';
import { useMedleyDataApi } from './useMedleyDataApi';

interface UseMedleyDataReturn {
    medleySongs: SongSection[]
    medleyTitle: string
    medleyCreator: string
    medleyDuration: number
    medleyData: MedleyData | null
    loading?: boolean
    isRefetching?: boolean
    error?: string | null
    refetch: () => void
}

export function useMedleyData(videoId: string): UseMedleyDataReturn {
    // Direct delegation to API hook - database only mode
    const apiResult = useMedleyDataApi(videoId);

    return {
        medleySongs: apiResult.medleySongs,
        medleyTitle: apiResult.medleyTitle,
        medleyCreator: apiResult.medleyCreator,
        medleyDuration: apiResult.medleyDuration,
        medleyData: apiResult.medleyData,
        loading: apiResult.loading,
        isRefetching: apiResult.isRefetching,
        error: apiResult.error,
        refetch: apiResult.refetch,
    };
}