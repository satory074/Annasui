"use client";

import { useSearchParams } from 'next/navigation';
import MedleyPlayer from "./MedleyPlayer";

interface MedleyPageClientProps {
    videoId: string;
}

export default function MedleyPageClient({ videoId }: MedleyPageClientProps) {
    const searchParams = useSearchParams();
    const t = searchParams.get('t');
    const initialTime = t ? parseInt(t, 10) : 0;

    return (
        <MedleyPlayer 
            initialVideoId={videoId}
            initialTime={initialTime}
        />
    );
}