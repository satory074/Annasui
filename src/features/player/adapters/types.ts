export interface PlayerAdapter {
  play(): void;
  pause(): void;
  seek(timeInSeconds: number): void;
  setVolume(volume: number): void;
  toggleFullscreen(): void;
  getEmbedUrl(): string;
  onTimeUpdate(callback: (time: number) => void): () => void;
  onDurationChange(callback: (duration: number) => void): () => void;
  onPlayingChange(callback: (playing: boolean) => void): () => void;
  onReady(callback: () => void): () => void;
  onError(callback: (error: string) => void): () => void;
  destroy(): void;
}

export type PlatformType = "niconico" | "youtube" | "spotify" | "appleMusic";
