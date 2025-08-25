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
      originalLink: "https://www.nicovideo.jp/watch/sm15630734", // 後方互換性のため維持
      links: {
        niconico: "https://www.nicovideo.jp/watch/sm15630734",
        youtube: "https://www.youtube.com/watch?v=K_xTet06SUo",
        spotify: "https://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6"
      }
    },
    {
      id: 2,
      title: "マトリョシカ",
      artist: "ハチ",
      startTime: 90,
      endTime: 175,
      color: "bg-blue-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm11809611", // 後方互換性のため維持
      links: {
        niconico: "https://www.nicovideo.jp/watch/sm11809611",
        youtube: "https://www.youtube.com/watch?v=HOz-9FzIDf0",
        spotify: "https://open.spotify.com/track/2uqYupMHgCqaVg2TXfZr4c"
      }
    },
    {
      id: 3,
      title: "メルト",
      artist: "ryo",
      startTime: 175,
      endTime: 265,
      color: "bg-yellow-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm1715919", // 後方互換性のため維持
      links: {
        niconico: "https://www.nicovideo.jp/watch/sm1715919",
        youtube: "https://www.youtube.com/watch?v=lW01eSV1u5E"
      }
    },
    {
      id: 4,
      title: "ワールドイズマイン",
      artist: "ryo",
      startTime: 265,
      endTime: 350,
      color: "bg-green-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm3504435", // 後方互換性のため維持
      links: {
        niconico: "https://www.nicovideo.jp/watch/sm3504435",
        youtube: "https://www.youtube.com/watch?v=EuJ6UR_pD5s",
        spotify: "https://open.spotify.com/track/1QrWj8zwWkU1D7RbMhZy7l"
      }
    },
    {
      id: 5,
      title: "砂の惑星",
      artist: "ハチ",
      startTime: 350,
      endTime: 440,
      color: "bg-orange-400",
      genre: "ボカロ",
      originalLink: "https://www.nicovideo.jp/watch/sm31606995", // 後方互換性のため維持
      links: {
        niconico: "https://www.nicovideo.jp/watch/sm31606995",
        youtube: "https://www.youtube.com/watch?v=AS4q9yaWJkI",
        appleMusic: "https://music.apple.com/jp/album/1284121742"
      }
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
      originalLink: "https://www.nicovideo.jp/watch/sm20503793"
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
  duration: 573, // 9分33秒（正確な長さ）
  platform: "niconico",
  createdAt: "2007-07-05T20:30:00Z",
  updatedAt: "2024-12-15T08:00:00Z",
  viewCount: 15800000,
  songs: [
    {
      id: 1,
      title: "エージェント夜を往く",
      artist: "THE iDOLM@STER",
      startTime: 0,
      endTime: 45,
      color: "bg-blue-400",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 2,
      title: "ハレ晴レユカイ",
      artist: "平野綾, 茅原実里, 後藤邑子",
      startTime: 45,
      endTime: 74,
      color: "bg-yellow-400",
      genre: "アニソン",
      originalLink: "https://www.nicovideo.jp/watch/sm2621549"
    },
    {
      id: 3,
      title: "患部で止まってすぐ溶ける〜狂気の優曇華院",
      artist: "ARM (IOSYS)",
      startTime: 74,
      endTime: 85,
      color: "bg-purple-400",
      genre: "東方",
      originalLink: ""
    },
    {
      id: 4,
      title: "Help me, ERINNNNNN!!",
      artist: "beatMARIO (COOL&CREATE)",
      startTime: 85,
      endTime: 97,
      color: "bg-red-400",
      genre: "東方",
      originalLink: ""
    },
    {
      id: 5,
      title: "nowhere",
      artist: "MADLAX",
      startTime: 97,
      endTime: 120,
      color: "bg-green-400",
      genre: "アニソン",
      originalLink: ""
    },
    {
      id: 6,
      title: "クリティアスの牙",
      artist: "遊戯王デュエルモンスターズ",
      startTime: 120,
      endTime: 140,
      color: "bg-orange-400",
      genre: "アニソン",
      originalLink: ""
    },
    {
      id: 7,
      title: "GONG",
      artist: "スーパーロボット大戦α外伝",
      startTime: 140,
      endTime: 151,
      color: "bg-cyan-400",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 8,
      title: "森のキノコにご用心",
      artist: "スーパーマリオRPG",
      startTime: 151,
      endTime: 162,
      color: "bg-green-500",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 9,
      title: "Butter-Fly",
      artist: "デジモンアドベンチャー",
      startTime: 162,
      endTime: 172,
      color: "bg-orange-500",
      genre: "アニソン",
      originalLink: ""
    },
    {
      id: 10,
      title: "真赤な誓い",
      artist: "武装錬金",
      startTime: 172,
      endTime: 196,
      color: "bg-red-500",
      genre: "アニソン",
      originalLink: ""
    },
    {
      id: 11,
      title: "エアーマンが倒せない（カラオケ版）",
      artist: "せら",
      startTime: 196,
      endTime: 215,
      color: "bg-blue-500",
      genre: "ニコニコ",
      originalLink: "https://www.nicovideo.jp/watch/sm350170"
    },
    {
      id: 12,
      title: "勇気VS意地",
      artist: "テニスの王子様ミュージカル",
      startTime: 215,
      endTime: 224,
      color: "bg-yellow-500",
      genre: "その他",
      originalLink: ""
    },
    {
      id: 13,
      title: "アンインストール",
      artist: "ぼくらの",
      startTime: 224,
      endTime: 247,
      color: "bg-gray-400",
      genre: "アニソン",
      originalLink: ""
    },
    {
      id: 14,
      title: "鳥の詩",
      artist: "AIR",
      startTime: 247,
      endTime: 271,
      color: "bg-cyan-500",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 15,
      title: "you",
      artist: "ひぐらしのなく頃に解",
      startTime: 271,
      endTime: 293,
      color: "bg-purple-500",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 16,
      title: "魔理沙は大変なものを盗んでいきました",
      artist: "ARM (IOSYS)",
      startTime: 293,
      endTime: 340,
      color: "bg-yellow-300",
      genre: "東方",
      originalLink: "https://www.nicovideo.jp/watch/sm201996"
    },
    {
      id: 17,
      title: "Dr. WILY STAGE 1",
      artist: "ロックマン2",
      startTime: 340,
      endTime: 402,
      color: "bg-blue-300",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 18,
      title: "God knows...",
      artist: "涼宮ハルヒの憂鬱",
      startTime: 402,
      endTime: 427,
      color: "bg-purple-300",
      genre: "アニソン",
      originalLink: ""
    },
    {
      id: 19,
      title: "もってけ！セーラーふく",
      artist: "らき☆すた",
      startTime: 427,
      endTime: 448,
      color: "bg-pink-400",
      genre: "アニソン",
      originalLink: ""
    },
    {
      id: 20,
      title: "ガチャガチャきゅ〜と・フィギュ@メイト",
      artist: "フィギュ@ラジオ",
      startTime: 448,
      endTime: 464,
      color: "bg-pink-500",
      genre: "その他",
      originalLink: ""
    },
    {
      id: 21,
      title: "創聖のアクエリオン",
      artist: "AKINO",
      startTime: 464,
      endTime: 486,
      color: "bg-orange-300",
      genre: "アニソン",
      originalLink: ""
    },
    {
      id: 22,
      title: "ふたりのもじぴったん",
      artist: "ことばのパズル もじぴったん",
      startTime: 486,
      endTime: 495,
      color: "bg-green-300",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 23,
      title: "つるぺったん",
      artist: "NYO (Silver Forest)",
      startTime: 495,
      endTime: 507,
      color: "bg-yellow-200",
      genre: "東方",
      originalLink: ""
    },
    {
      id: 24,
      title: "地上BGM（Here we go!）",
      artist: "スーパーマリオワールド",
      startTime: 507,
      endTime: 515,
      color: "bg-red-300",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 25,
      title: "true my heart",
      artist: "ナースリィ♪ライム",
      startTime: 515,
      endTime: 531,
      color: "bg-pink-300",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 26,
      title: "kiss my lips",
      artist: "ave;new feat. 佐倉紗織",
      startTime: 531,
      endTime: 538,
      color: "bg-cyan-300",
      genre: "その他",
      originalLink: ""
    },
    {
      id: 27,
      title: "Rodeo Machine",
      artist: "HALFBY",
      startTime: 538,
      endTime: 548,
      color: "bg-blue-200",
      genre: "その他",
      originalLink: ""
    },
    {
      id: 28,
      title: "序曲",
      artist: "ドラゴンクエスト",
      startTime: 548,
      endTime: 561,
      color: "bg-purple-200",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 29,
      title: "メインテーマ",
      artist: "ファイナルファンタジー",
      startTime: 561,
      endTime: 569,
      color: "bg-gray-300",
      genre: "ゲーム音楽",
      originalLink: ""
    },
    {
      id: 30,
      title: "ガチャガチャきゅ〜と・フィギュ@メイト",
      artist: "フィギュ@メイト",
      startTime: 569,
      endTime: 573,
      color: "bg-orange-200",
      genre: "その他",
      originalLink: ""
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
