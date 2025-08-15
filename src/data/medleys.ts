import { MedleyData } from "../types";

// ボカロメドレーのサンプルデータ
export const sampleMedley1: MedleyData = {
  videoId: "sm38343669",
  title: "ボカロメドレー2025",
  creator: "メドレー製作者",
  duration: 600,
  platform: "niconico",
  createdAt: "2025-01-15T09:30:00Z",
  updatedAt: "2025-01-16T14:20:00Z",
  viewCount: 245000,
  songs: [
    {
      id: 1,
      title: "千本桜",
      artist: "黒うさP",
      startTime: 0,
      endTime: 90,
      color: "bg-red-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm13274270"
    },
    {
      id: 2,
      title: "マトリョシカ",
      artist: "ハチ",
      startTime: 90,
      endTime: 175,
      color: "bg-blue-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm11809611"
    },
    {
      id: 3,
      title: "メルト",
      artist: "ryo",
      startTime: 175,
      endTime: 265,
      color: "bg-yellow-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm1715919"
    },
    {
      id: 4,
      title: "ワールドイズマイン",
      artist: "ryo",
      startTime: 265,
      endTime: 350,
      color: "bg-green-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm3504435"
    },
    {
      id: 5,
      title: "砂の惑星",
      artist: "ハチ",
      startTime: 350,
      endTime: 440,
      color: "bg-orange-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm31606995"
    },
    {
      id: 6,
      title: "ローリンガール",
      artist: "wowaka",
      startTime: 440,
      endTime: 530,
      color: "bg-purple-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm9714351"
    },
    {
      id: 7,
      title: "それがあなたの幸せとしても",
      artist: "heavenz",
      startTime: 530,
      endTime: 600,
      color: "bg-pink-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm13636066"
    }
  ]
};

// 別のサンプルメドレー
export const sampleMedley2: MedleyData = {
  videoId: "sm37796813",
  title: "J-POPメドレー2025",
  creator: "J-POPメドレー制作委員会",
  duration: 480,
  platform: "niconico",
  createdAt: "2025-01-10T16:45:00Z",
  updatedAt: "2025-01-12T10:15:00Z",
  viewCount: 128000,
  songs: [
    {
      id: 1,
      title: "Lemon",
      artist: "米津玄師",
      startTime: 0,
      endTime: 75,
      color: "bg-yellow-400",
      genre: "J-POP",
      originalLink: "https://www.youtube.com/watch?v=SX_ViT4Ra7k"
    },
    {
      id: 2,
      title: "紅蓮華",
      artist: "LiSA",
      startTime: 75,
      endTime: 150,
      color: "bg-red-400",
      genre: "J-POP",
      originalLink: "https://www.youtube.com/watch?v=CwkzK-F0Y00"
    },
    {
      id: 3,
      title: "マリーゴールド",
      artist: "あいみょん",
      startTime: 150,
      endTime: 240,
      color: "bg-orange-400",
      genre: "J-POP",
      originalLink: "https://www.youtube.com/watch?v=0xSiBpUdW4E"
    },
    {
      id: 4,
      title: "Pretender",
      artist: "Official髭男dism",
      startTime: 240,
      endTime: 330,
      color: "bg-blue-400",
      genre: "J-POP",
      originalLink: "https://www.youtube.com/watch?v=TQ8WlA2GXbk"
    },
    {
      id: 5,
      title: "夜に駆ける",
      artist: "YOASOBI",
      startTime: 330,
      endTime: 420,
      color: "bg-purple-400",
      genre: "J-POP",
      originalLink: "https://www.youtube.com/watch?v=x8VYWazR5mE"
    },
    {
      id: 6,
      title: "残酷な天使のテーゼ",
      artist: "高橋洋子",
      startTime: 420,
      endTime: 480,
      color: "bg-green-400",
      genre: "アニソン",
      originalLink: "https://www.youtube.com/watch?v=o6wtDPVkKqI"
    }
  ]
};

// 実際のニコニコメドレー動画のアノテーションデータ
export const nicoMedley1: MedleyData = {
  videoId: "sm500873",
  title: "組曲『ニコニコ動画』",
  creator: "しも",
  duration: 1062, // 17分42秒
  platform: "niconico",
  createdAt: "2007-07-05T20:30:00Z",
  updatedAt: "2024-12-15T08:00:00Z",
  viewCount: 15800000,
  songs: [
    {
      id: 1,
      title: "Ievan Polkka",
      artist: "初音ミク",
      startTime: 0,
      endTime: 30,
      color: "bg-cyan-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm982882"
    },
    {
      id: 2,
      title: "魔理沙は大変なものを盗んでいきました",
      artist: "ARM+夕野ヨシミ feat. 焼飯",
      startTime: 30,
      endTime: 80,
      color: "bg-yellow-400",
      genre: "東方",
      originalLink: "https://www.nicovideo.jp/watch/sm62856"
    },
    {
      id: 3,
      title: "患部で止まってすぐ溶ける〜狂気の優曇華院",
      artist: "ARM",
      startTime: 80,
      endTime: 130,
      color: "bg-purple-400",
      genre: "東方",
      originalLink: "https://www.nicovideo.jp/watch/sm166406"
    },
    {
      id: 4,
      title: "最終鬼畜妹フランドール・S",
      artist: "ビートまりお",
      startTime: 130,
      endTime: 190,
      color: "bg-red-400",
      genre: "東方",
      originalLink: "https://www.nicovideo.jp/watch/sm24806"
    },
    {
      id: 5,
      title: "エージェント夜を往く",
      artist: "中島らも",
      startTime: 190,
      endTime: 240,
      color: "bg-blue-400",
      genre: "その他"
    },
    {
      id: 6,
      title: "カラフル",
      artist: "島谷ひとみ",
      startTime: 240,
      endTime: 290,
      color: "bg-green-400",
      genre: "J-POP"
    },
    {
      id: 7,
      title: "you",
      artist: "Shinji Orito",
      startTime: 290,
      endTime: 340,
      color: "bg-orange-400",
      genre: "ゲーム音楽"
    },
    {
      id: 8,
      title: "ドナルド教",
      artist: "ドナルド・マクドナルド",
      startTime: 340,
      endTime: 390,
      color: "bg-yellow-500",
      genre: "MAD"
    },
    {
      id: 9,
      title: "創聖のアクエリオン",
      artist: "AKINO",
      startTime: 390,
      endTime: 450,
      color: "bg-pink-400",
      genre: "アニソン"
    },
    {
      id: 10,
      title: "森のキノコにご用心",
      artist: "中川翔子",
      startTime: 450,
      endTime: 510,
      color: "bg-green-500",
      genre: "その他"
    },
    {
      id: 11,
      title: "メルト",
      artist: "ryo",
      startTime: 510,
      endTime: 580,
      color: "bg-cyan-500",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm1715919"
    },
    {
      id: 12,
      title: "ハレ晴レユカイ",
      artist: "平野綾, 茅原実里, 後藤邑子",
      startTime: 580,
      endTime: 640,
      color: "bg-yellow-300",
      genre: "アニソン"
    },
    {
      id: 13,
      title: "God knows...",
      artist: "平野綾",
      startTime: 640,
      endTime: 720,
      color: "bg-purple-500",
      genre: "アニソン"
    },
    {
      id: 14,
      title: "思い出は億千万",
      artist: "檜山修之",
      startTime: 720,
      endTime: 780,
      color: "bg-red-300",
      genre: "アニソン"
    },
    {
      id: 15,
      title: "愛をとりもどせ!!",
      artist: "クリスタルキング",
      startTime: 780,
      endTime: 840,
      color: "bg-orange-300",
      genre: "アニソン"
    },
    {
      id: 16,
      title: "ガンダム (翔べ!ガンダム)",
      artist: "池田鴻",
      startTime: 840,
      endTime: 900,
      color: "bg-blue-300",
      genre: "アニソン"
    },
    {
      id: 17,
      title: "エヴァンゲリオン",
      artist: "高橋洋子",
      startTime: 900,
      endTime: 960,
      color: "bg-purple-300",
      genre: "アニソン"
    },
    {
      id: 18,
      title: "True My Heart",
      artist: "ave;new feat. 佐倉紗織",
      startTime: 960,
      endTime: 1020,
      color: "bg-pink-300",
      genre: "ゲーム音楽"
    },
    {
      id: 19,
      title: "Ievan Polkka (エンディング)",
      artist: "初音ミク",
      startTime: 1020,
      endTime: 1062,
      color: "bg-cyan-300",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm982882"
    }
  ]
};

// すべてのメドレーデータをマップに格納
export const medleyMap: { [key: string]: MedleyData } = {
  "sm500873": nicoMedley1,
  "sm38343669": sampleMedley1,
  "sm37796813": sampleMedley2
};

// 動画IDからメドレーデータを取得する関数
export const getMedleyByVideoId = (videoId: string): MedleyData | undefined => {
  return medleyMap[videoId];
};
