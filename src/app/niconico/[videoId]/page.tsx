import { Metadata } from 'next'
import MedleyPageClient from "@/components/pages/MedleyPageClient";
import { getMedleyByVideoId } from "@/lib/api/medleys";
import { getThumbnailUrl } from "@/lib/utils/thumbnail";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { logger } from '@/lib/utils/logger';

interface MedleyPageProps {
    params: Promise<{
        videoId: string;
    }>;
}

export async function generateMetadata({ params }: MedleyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const { videoId } = resolvedParams;
  
  try {
    const medleyData = await getMedleyByVideoId(videoId);
    
    if (!medleyData) {
      return {
        title: `${videoId} - Medlean`,
        description: 'ニコニコ動画のメドレーアノテーションを表示',
        robots: { index: false, follow: false },
      };
    }

    const thumbnailUrl = getThumbnailUrl(`https://www.nicovideo.jp/watch/${videoId}`) || `/api/thumbnail/niconico/${videoId}/`;
    const songCount = medleyData.songs.length;
    const durationMinutes = Math.floor(medleyData.duration / 60);
    const durationSeconds = medleyData.duration % 60;
    const songTitles = medleyData.songs.slice(0, 5).map(song => song.title).join('、');
    
    const title = `${medleyData.title} - Medlean`;
    const description = `${medleyData.title}の詳細なアノテーション情報。収録楽曲${songCount}曲、再生時間${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}。収録曲: ${songTitles}${songCount > 5 ? '他' : ''}`;

    return {
      title,
      description,
      keywords: [
        medleyData.title,
        ...medleyData.songs.map(song => song.title),
        ...medleyData.songs.map(song => song.artist),
        'ニコニコメドレー',
        'メドレー動画',
        'アノテーション',
        'Medlean'
      ].filter(Boolean).slice(0, 20),
      openGraph: {
        title,
        description,
        url: `/niconico/${videoId}`,
        type: 'video.other',
        siteName: 'Medlean',
        locale: 'ja_JP',
        images: [
          {
            url: thumbnailUrl,
            width: 640,
            height: 360,
            alt: `${medleyData.title}のサムネイル`,
          },
        ],
        videos: [
          {
            url: `https://www.nicovideo.jp/watch/${videoId}`,
            type: 'text/html',
            width: 640,
            height: 360,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: description.slice(0, 200) + '...',
        images: [thumbnailUrl],
      },
      alternates: {
        canonical: `/niconico/${videoId}`,
      },
      other: {
        'video:duration': medleyData.duration.toString(),
        'video:release_date': medleyData.createdAt || new Date().toISOString(),
        'article:author': medleyData.creator || 'Unknown',
        'article:section': 'メドレー',
        'article:tag': medleyData.songs.map(song => song.title).join(','),
      },
    };
  } catch (error) {
    logger.error('Error generating metadata:', error);
    return {
      title: `${videoId} - Medlean`,
      description: 'ニコニコ動画のメドレーアノテーションを表示',
    };
  }
}


export default async function MedleyPage({ params }: MedleyPageProps) {
    const resolvedParams = await params;
    const { videoId } = resolvedParams;

    // Get medley data for structured data
    let medleyData = null;
    try {
      medleyData = await getMedleyByVideoId(videoId);
    } catch (error) {
      logger.error('Error fetching medley data for structured data:', error);
    }

    const breadcrumbItems = [
        { label: 'ホーム', href: '/' },
        { label: 'ニコニコ動画', href: '/' }, // Redirect to home since /niconico alone doesn't exist
        { label: medleyData?.title || videoId }
    ];

    return (
        <>
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 py-2">
                    <Breadcrumb items={breadcrumbItems} />
                </div>
            </div>
            {medleyData && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "VideoObject",
                            "name": medleyData.title,
                            "description": `${medleyData.title}のメドレーアノテーション。収録楽曲${medleyData.songs.length}曲の詳細なタイムライン情報を提供。`,
                            "thumbnailUrl": getThumbnailUrl(`https://www.nicovideo.jp/watch/${videoId}`),
                            "uploadDate": medleyData.createdAt || new Date().toISOString(),
                            "duration": `PT${Math.floor(medleyData.duration / 60)}M${medleyData.duration % 60}S`,
                            "contentUrl": `https://www.nicovideo.jp/watch/${videoId}`,
                            "embedUrl": `https://www.nicovideo.jp/watch/${videoId}`,
                            "interactionStatistic": {
                                "@type": "InteractionCounter",
                                "interactionType": "https://schema.org/WatchAction",
                                "userInteractionCount": medleyData.viewCount || 0
                            },
                            "genre": ["音楽", "メドレー", "アニメソング"],
                            "inLanguage": "ja",
                            "creator": {
                                "@type": "Person",
                                "name": medleyData.creator || "Unknown Creator"
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "Medlean",
                                "url": "https://anasui-e6f49.web.app"
                            },
                            "hasPart": medleyData.songs.map((song, index) => ({
                                "@type": "MusicRecording",
                                "name": song.title,
                                "byArtist": {
                                    "@type": "MusicGroup",
                                    "name": song.artist
                                },
                                "duration": `PT${Math.floor((song.endTime - song.startTime) / 60)}M${(song.endTime - song.startTime) % 60}S`,
                                "position": index + 1,
                                "startOffset": song.startTime,
                                "endOffset": song.endTime,
                                "genre": "アニメソング",
                                "inLanguage": "ja"
                            })),
                            "keywords": [
                                medleyData.title,
                                ...medleyData.songs.map(song => song.title).slice(0, 10),
                                "メドレー",
                                "アノテーション",
                                "ニコニコ動画",
                                "音楽"
                            ].join(", ")
                        }, null, 2)
                    }}
                />
            )}
            <MedleyPageClient videoId={videoId} platform="niconico" />
        </>
    );
}