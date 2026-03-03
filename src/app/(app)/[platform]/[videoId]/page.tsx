import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { medleyKeys } from "@/features/medley/queries/keys";
import {
  fetchMedley,
  fetchMedleySongs,
} from "@/features/medley/queries/functions";
import { MedleyView } from "@/features/medley/components/MedleyView";
import type { Metadata } from "next";

interface MedleyPageProps {
  params: Promise<{ platform: string; videoId: string }>;
}

export async function generateMetadata({
  params,
}: MedleyPageProps): Promise<Metadata> {
  const { platform, videoId } = await params;
  const medley = await fetchMedley(videoId).catch(() => null);

  if (!medley) {
    return { title: `Medlean - ${videoId}` };
  }

  return {
    title: `${medley.title} | Medlean`,
    description: `${medley.title}のメドレーアノテーション`,
    openGraph: {
      title: `${medley.title} | Medlean`,
      description: `${medley.title}のメドレーアノテーション`,
      url: `/${platform}/${videoId}`,
      type: "video.other",
    },
  };
}

export default async function MedleyPage({ params }: MedleyPageProps) {
  const { platform, videoId } = await params;

  const queryClient = new QueryClient();

  // Prefetch on server for instant client hydration
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: medleyKeys.detail(videoId),
      queryFn: () => fetchMedley(videoId),
    }),
    queryClient.prefetchQuery({
      queryKey: medleyKeys.songs(videoId),
      queryFn: () => fetchMedleySongs(videoId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MedleyView platform={platform} videoId={videoId} />
    </HydrationBoundary>
  );
}
