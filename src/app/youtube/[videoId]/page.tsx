import MedleyPageClient from "@/components/pages/MedleyPageClient";

interface YouTubeMedleyPageProps {
    params: Promise<{
        videoId: string;
    }>;
}


export default async function YouTubeMedleyPage({ params }: YouTubeMedleyPageProps) {
    const resolvedParams = await params;

    return (
        <MedleyPageClient videoId={resolvedParams.videoId} platform="youtube" />
    );
}