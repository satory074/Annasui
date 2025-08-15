import MedleyPageClient from "@/components/pages/MedleyPageClient";

interface MedleyPageProps {
    params: Promise<{
        videoId: string;
    }>;
}

// 静的エクスポート用の事前定義されたパス
export async function generateStaticParams() {
    return [
        { videoId: 'sm38343669' },
        { videoId: 'sm37796813' }
    ];
}

export default async function MedleyPage({ params }: MedleyPageProps) {
    const resolvedParams = await params;

    return (
        <MedleyPageClient videoId={resolvedParams.videoId} />
    );
}