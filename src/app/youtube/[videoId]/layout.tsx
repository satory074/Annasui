import { Metadata } from 'next';
import { getMedleyByVideoId } from '@/lib/api/medleys';

interface YouTubeMedleyLayoutProps {
    children: React.ReactNode;
    params: Promise<{ videoId: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ videoId: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const medleyData = await getMedleyByVideoId(resolvedParams.videoId);
    
    if (!medleyData) {
        return {
            title: 'メドレーが見つかりません | メドレーアノテーションプレイヤー',
            description: `動画ID「${resolvedParams.videoId}」のメドレーデータが見つかりませんでした。`,
        };
    }

    const title = `${medleyData.title} | メドレーアノテーションプレイヤー`;
    const description = `${medleyData.title}（${medleyData.creator}）のメドレーアノテーション。${medleyData.songs.length}曲収録、再生時間${Math.floor(medleyData.duration / 60)}分${Math.floor(medleyData.duration % 60)}秒。楽曲ごとの詳細な時間情報とアノテーションを提供します。`;
    const url = `https://anasui.netlify.app/youtube/${resolvedParams.videoId}`;
    const youtubeVideoUrl = `https://www.youtube.com/watch?v=${resolvedParams.videoId}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
            siteName: 'メドレーアノテーションプレイヤー',
            type: 'website',
            images: [
                {
                    url: `https://img.youtube.com/vi/${resolvedParams.videoId}/maxresdefault.jpg`,
                    width: 1280,
                    height: 720,
                    alt: medleyData.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [`https://img.youtube.com/vi/${resolvedParams.videoId}/maxresdefault.jpg`],
        },
        alternates: {
            canonical: url,
        },
        other: {
            'video:url': youtubeVideoUrl,
            'video:duration': medleyData.duration.toString(),
            'music:song_count': medleyData.songs.length.toString(),
            'music:creator': medleyData.creator || '',
        },
    };
}

export default function YouTubeMedleyLayout({ children }: YouTubeMedleyLayoutProps) {
    return <>{children}</>;
}