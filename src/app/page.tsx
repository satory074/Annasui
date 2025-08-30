import { getAllMedleys } from "@/lib/api/medleys";
import HomePageClient from "@/components/pages/HomePageClient";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function Home() {
    try {
        console.log('🏠 Homepage: Starting to fetch medleys...');
        // SSR: Fetch medleys data at build/request time
        const medleys = await getAllMedleys();
        console.log('🏠 Homepage: Successfully fetched medleys:', medleys.length);

        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
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
                        }, null, 2)
                    }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "ItemList",
                            "name": "メドレーアノテーション一覧",
                            "description": "Medleanで利用可能なメドレー動画のアノテーション一覧",
                            "numberOfItems": medleys.length,
                            "itemListElement": medleys.slice(0, 20).map((medley, index) => {
                                const platform = medley.videoId.startsWith('sm') ? 'niconico' : 
                                               medley.videoId.length === 11 ? 'youtube' : 'niconico';
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
                                            ? `/api/thumbnail/niconico/${videoId}`
                                            : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                                        "duration": `PT${Math.floor(medley.duration / 60)}M${medley.duration % 60}S`,
                                        "uploadDate": medley.createdAt || new Date().toISOString(),
                                        "genre": ["音楽", "メドレー"],
                                        "inLanguage": "ja",
                                        "creator": {
                                            "@type": "Person",
                                            "name": medley.creator || "Unknown Creator"
                                        }
                                    }
                                };
                            })
                        }, null, 2)
                    }}
                />
                <HomePageClient initialMedleys={medleys} />
            </>
        );
    } catch (error) {
        console.error('🏠 Homepage: Error fetching medleys:', error);
        // Return with empty array on error to prevent 404
        return <HomePageClient initialMedleys={[]} />;
    }
}