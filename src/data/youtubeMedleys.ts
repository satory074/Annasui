import { MedleyData } from "../types";

// YouTubeメドレーのサンプルデータ
export const youtubeSampleMedley1: MedleyData = {
  videoId: "dQw4w9WgXcQ",
  title: "YouTube Music Medley Sample",
  creator: "Sample Creator",
  duration: 212,
  platform: "youtube",
  songs: [
    {
      id: 1,
      title: "Never Gonna Give You Up",
      artist: "Rick Astley",
      startTime: 0,
      endTime: 212,
      color: "bg-red-500",
      genre: "Pop",
    }
  ]
};

export const getAllYouTubeMedleys = (): MedleyData[] => {
  return [youtubeSampleMedley1];
};

export const getYouTubeMedleyByVideoId = (videoId: string): MedleyData | null => {
  const medleys = getAllYouTubeMedleys();
  return medleys.find(medley => medley.videoId === videoId) || null;
};