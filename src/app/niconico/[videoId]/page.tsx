import MedleyPageClient from "@/components/pages/MedleyPageClient";

interface MedleyPageProps {
    params: Promise<{
        videoId: string;
    }>;
}


export default async function MedleyPage({ params }: MedleyPageProps) {
    const resolvedParams = await params;

    return (
        <MedleyPageClient videoId={resolvedParams.videoId} platform="niconico" />
    );
}