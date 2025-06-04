// ニコニコプレイヤーの状態
export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isFullscreen: boolean;
  commandInProgress: boolean;
}

// プレイヤーイベントのデータ型
export interface PlayerEventData {
  eventName: string;
  data?: {
    currentTime?: number;
    duration?: number;
    playerStatus?: number;
    seekStatus?: number;
    videoInfo?: {
      lengthInSeconds?: number;
    };
    volume?: number;
  };
}

// プレイヤーメッセージの型
export interface PlayerMessage {
  sourceConnectorType: number;
  playerId: string;
  eventName: string;
  data?: Record<string, unknown>;
}

// プレイヤーのプロパティ
export interface PlayerProps {
  videoId: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}