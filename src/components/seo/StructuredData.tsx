import { MedleyData } from '@/types';

interface VideoObjectStructuredDataProps {
  medleyData: MedleyData;
  videoUrl: string;
  thumbnailUrl: string;
  platform: 'niconico' | 'youtube';
}

export function VideoObjectStructuredData({ 
  medleyData, 
  videoUrl, 
  thumbnailUrl,
  platform 
}: VideoObjectStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": medleyData.title,
    "description": `${medleyData.title}のメドレーアノテーション。収録楽曲${medleyData.songs.length}曲の詳細なタイムライン情報を提供。`,
    "thumbnailUrl": thumbnailUrl,
    "uploadDate": medleyData.createdAt || new Date().toISOString(),
    "duration": `PT${Math.floor(medleyData.duration / 60)}M${medleyData.duration % 60}S`,
    "contentUrl": videoUrl,
    "embedUrl": videoUrl,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WatchAction",
      "userInteractionCount": medleyData.viewCount || 0
    },
    "genre": ["音楽", "メドレー", "アニメソング"],
    "inLanguage": "ja",
    "creator": {
      "@type": platform === 'niconico' ? "Person" : "Organization",
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
      ...medleyData.songs.map(song => song.title),
      "メドレー",
      "アノテーション",
      platform === 'niconico' ? "ニコニコ動画" : "YouTube",
      "音楽"
    ].join(", ")
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData, null, 2) }}
    />
  );
}

interface MedleyCollectionStructuredDataProps {
  medleys: MedleyData[];
}

export function MedleyCollectionStructuredData({ medleys }: MedleyCollectionStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "メドレーアノテーション一覧",
    "description": "Medleanで利用可能なメドレー動画のアノテーション一覧",
    "numberOfItems": medleys.length,
    "itemListElement": medleys.map((medley, index) => {
      const platform = medley.platform || 'niconico';
      const videoId = medley.videoId;
      
      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "VideoObject",
          "name": medley.title,
          "description": `${medley.songs.length}曲収録のメドレーアノテーション`,
          "url": `https://anasui-e6f49.web.app/${platform}/${videoId}`,
          "thumbnailUrl": platform === 'niconico' 
            ? `/api/thumbnail/niconico/${videoId}/`
            : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          "duration": `PT${Math.floor(medley.duration / 60)}M${medley.duration % 60}S`,
          "uploadDate": medley.createdAt || new Date().toISOString(),
          "genre": ["音楽", "メドレー"],
          "inLanguage": "ja"
        }
      };
    })
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData, null, 2) }}
    />
  );
}

export function WebsiteStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Medlean",
    "alternateName": "ニコニコメドレーアノテーションプレイヤー",
    "url": "https://anasui-e6f49.web.app",
    "description": "ニコニコ動画やYouTubeのメドレー楽曲に詳細なアノテーション情報を提供するWebアプリケーション",
    "inLanguage": "ja",
    "creator": {
      "@type": "Organization",
      "name": "Medlean Team"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://anasui-e6f49.web.app/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData, null, 2) }}
    />
  );
}