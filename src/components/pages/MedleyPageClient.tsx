"use client";

import { useSearchParams } from 'next/navigation';
import MedleyPlayer from "./MedleyPlayer";

interface MedleyPageClientProps {
    videoId: string;
    platform?: 'niconico' | 'youtube';
}

export default function MedleyPageClient({ videoId, platform = 'niconico' }: MedleyPageClientProps) {
    const searchParams = useSearchParams();
    const t = searchParams.get('t');
    const initialTime = t ? parseInt(t, 10) : 0;

    return (
        <MedleyPlayer 
            initialVideoId={videoId}
            initialTime={initialTime}
            platform={platform}
        />
    );
}