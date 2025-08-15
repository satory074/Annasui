import MedleyPageClient from "@/components/pages/MedleyPageClient";

interface YouTubeMedleyPageProps {
    params: Promise<{
        videoId: string;
    }>;
}

// 静的エクスポート用の事前定義されたパス
export async function generateStaticParams() {
    return [
        { videoId: 'dQw4w9WgXcQ' },
    ];
}

export default async function YouTubeMedleyPage({ params }: YouTubeMedleyPageProps) {
    const resolvedParams = await params;

    return (
        <MedleyPageClient videoId={resolvedParams.videoId} platform="youtube" />
    );
}