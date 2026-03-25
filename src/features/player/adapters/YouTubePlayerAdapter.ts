import type { PlayerAdapter } from "./types";

type Callback<T> = (value: T) => void;

// Module-level promise to load the YouTube IFrame API once
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve) => {
    // Already loaded
    if (window.YT?.Player) {
      resolve();
      return;
    }

    // Set the callback before loading the script
    const existingCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      existingCallback?.();
      resolve();
    };

    // Check if script tag already exists (avoid double-loading)
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      // Script exists but API not ready yet — just wait for callback
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });

  return apiLoadPromise;
}

/**
 * YouTube Player Adapter — uses YouTube IFrame API for full playback control.
 */
export class YouTubePlayerAdapter implements PlayerAdapter {
  private iframe: HTMLIFrameElement;
  private videoId: string;
  private player: YT.Player | null = null;

  // Listeners
  private timeListeners = new Set<Callback<number>>();
  private durationListeners = new Set<Callback<number>>();
  private playingListeners = new Set<Callback<boolean>>();
  private readyListeners = new Set<Callback<void>>();
  private errorListeners = new Set<Callback<string>>();

  // Polling
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  // State
  private destroyed = false;

  constructor(iframe: HTMLIFrameElement, videoId: string) {
    this.iframe = iframe;
    this.videoId = videoId;
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await loadYouTubeAPI();
      if (this.destroyed) return;

      this.player = new YT.Player(this.iframe, {
        events: {
          onReady: () => {
            if (this.destroyed) return;
            this.readyListeners.forEach((cb) => cb());

            // Emit duration once ready
            const dur = this.player?.getDuration() ?? 0;
            if (dur > 0) {
              this.durationListeners.forEach((cb) => cb(dur));
            }

            // Start time polling
            this.startPolling();
          },
          onStateChange: (event) => {
            if (this.destroyed) return;
            const playing = event.data === YT.PlayerState.PLAYING;
            this.playingListeners.forEach((cb) => cb(playing));

            // When playback starts, re-check duration (it may not be available until playing)
            if (playing) {
              const dur = this.player?.getDuration() ?? 0;
              if (dur > 0) {
                this.durationListeners.forEach((cb) => cb(dur));
              }
            }
          },
          onError: (event) => {
            if (this.destroyed) return;
            const errorMessages: Record<number, string> = {
              2: "Invalid video ID",
              5: "HTML5 player error",
              100: "Video not found",
              101: "Embedding not allowed",
              150: "Embedding not allowed",
            };
            const msg = errorMessages[event.data] ?? `YouTube error: ${event.data}`;
            this.errorListeners.forEach((cb) => cb(msg));
          },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load YouTube API";
      this.errorListeners.forEach((cb) => cb(msg));
    }
  }

  play(): void {
    this.player?.playVideo();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  seek(timeInSeconds: number): void {
    this.player?.seekTo(timeInSeconds, true);
    // Optimistic time update
    this.timeListeners.forEach((cb) => cb(timeInSeconds));
  }

  setVolume(volume: number): void {
    // PlayerAdapter volume is 0-1, YouTube API expects 0-100
    this.player?.setVolume(volume * 100);
  }

  toggleFullscreen(): void {
    this.iframe.requestFullscreen?.();
  }

  getEmbedUrl(): string {
    return `https://www.youtube.com/embed/${this.videoId}?autoplay=0&enablejsapi=1`;
  }

  onTimeUpdate(cb: Callback<number>): () => void {
    this.timeListeners.add(cb);
    return () => this.timeListeners.delete(cb);
  }

  onDurationChange(cb: Callback<number>): () => void {
    this.durationListeners.add(cb);
    return () => this.durationListeners.delete(cb);
  }

  onPlayingChange(cb: Callback<boolean>): () => void {
    this.playingListeners.add(cb);
    return () => this.playingListeners.delete(cb);
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
    this.destroyed = true;
    this.stopPolling();

    try {
      this.player?.destroy();
    } catch {
      // Player may already be destroyed
    }

    this.player = null;
    this.timeListeners.clear();
    this.durationListeners.clear();
    this.playingListeners.clear();
    this.readyListeners.clear();
    this.errorListeners.clear();
  }

  // ─── Private ──────────────────────────────────────────────

  private startPolling(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => {
      if (!this.player || this.destroyed) return;
      try {
        const time = this.player.getCurrentTime();
        if (typeof time === "number" && isFinite(time)) {
          this.timeListeners.forEach((cb) => cb(time));
        }
      } catch {
        // Player may be in an invalid state
      }
    }, 250);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
