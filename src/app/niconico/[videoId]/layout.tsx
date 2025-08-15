import { Metadata } from 'next';
import { getMedleyByVideoId } from '@/data/medleys';

interface MedleyLayoutProps {
    children: React.ReactNode;
    params: Promise<{ videoId: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ videoId: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const medleyData = getMedleyByVideoId(resolvedParams.videoId);
    
    if (!medleyData) {
        return {
            title: 'メドレーが見つかりません | ニコニコメドレーアノテーションプレイヤー',
            description: `動画ID「${resolvedParams.videoId}」のメドレーデータが見つかりませんでした。`,
        };
    }

    const title = `${medleyData.title} | ニコニコメドレーアノテーションプレイヤー`;
    const description = `${medleyData.title}（${medleyData.creator}）のメドレーアノテーション。${medleyData.songs.length}曲収録、再生時間${Math.floor(medleyData.duration / 60)}分${Math.floor(medleyData.duration % 60)}秒。楽曲ごとの詳細な時間情報とアノテーションを提供します。`;
    const url = `https://anasui.netlify.app/${resolvedParams.videoId}`;
    const nicoVideoUrl = `https://www.nicovideo.jp/watch/${resolvedParams.videoId}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
            siteName: 'ニコニコメドレーアノテーションプレイヤー',
            type: 'website',
            images: [
                {
                    url: `https://tn.smilevideo.jp/smile?i=${resolvedParams.videoId.replace('sm', '')}`,
                    width: 640,
                    height: 360,
                    alt: medleyData.title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [`https://tn.smilevideo.jp/smile?i=${resolvedParams.videoId.replace('sm', '')}`],
        },
        alternates: {
            canonical: url,
        },
        other: {
            'video:url': nicoVideoUrl,
            'video:duration': medleyData.duration.toString(),
            'music:song_count': medleyData.songs.length.toString(),
            'music:creator': medleyData.creator || '',
        },
    };
}

export default function MedleyLayout({ children }: MedleyLayoutProps) {
    return <>{children}</>;
}