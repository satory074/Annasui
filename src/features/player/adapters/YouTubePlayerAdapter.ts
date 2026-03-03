import type { PlayerAdapter } from "./types";

type Callback<T> = (value: T) => void;

/**
 * YouTube Player Adapter — uses YouTube iFrame API
 * Currently a stub implementation for embed-only mode.
 */
export class YouTubePlayerAdapter implements PlayerAdapter {
  private videoId: string;
  private readyListeners = new Set<Callback<void>>();
  private errorListeners = new Set<Callback<string>>();

  constructor(videoId: string) {
    this.videoId = videoId;
  }

  play(): void {
    // YouTube embeds don't support programmatic control without the IFrame API
  }

  pause(): void {}

  seek(): void {}

  setVolume(): void {}

  toggleFullscreen(): void {}

  getEmbedUrl(): string {
    return `https://www.youtube.com/embed/${this.videoId}?autoplay=0&enablejsapi=1`;
  }

  onTimeUpdate(): () => void {
    return () => {};
  }

  onDurationChange(): () => void {
    return () => {};
  }

  onPlayingChange(): () => void {
    return () => {};
  }

  onReady(cb: Callback<void>): () => void {
    this.readyListeners.add(cb);
    return () => this.readyListeners.delete(cb);
  }

  onError(cb: Callback<string>): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  destroy(): void {
    this.readyListeners.clear();
    this.errorListeners.clear();
  }
}
