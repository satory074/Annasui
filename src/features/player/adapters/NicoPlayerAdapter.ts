import type { PlayerAdapter } from "./types";

const EMBED_ORIGIN = "https://embed.nicovideo.jp";
const SOURCE_CONNECTOR_TYPE = 1;
const PLAYER_ID = "1";
const FRONTEND_ID = 6;
const FRONTEND_VERSION = 0;
const PLAYER_STATUS_PLAYING = 2;

type Callback<T> = (value: T) => void;

export class NicoPlayerAdapter implements PlayerAdapter {
  private iframe: HTMLIFrameElement;
  private videoId: string;

  // Listeners
  private timeListeners = new Set<Callback<number>>();
  private durationListeners = new Set<Callback<number>>();
  private playingListeners = new Set<Callback<boolean>>();
  private readyListeners = new Set<Callback<void>>();
  private errorListeners = new Set<Callback<string>>();

  // State
  private ready = false;
  private previousTime = 0;
  private duration = 0;

  // Command queue — prevents overlapping postMessage commands
  private commandQueue: Promise<void> = Promise.resolve();

  // Polling
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  // Message listener reference for cleanup
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(iframe: HTMLIFrameElement, videoId: string) {
    this.iframe = iframe;
    this.videoId = videoId;
    this.setupMessageListener();
  }

  // ─── Public API ───────────────────────────────────────────

  play(): void {
    this.enqueue("play");
  }

  pause(): void {
    this.enqueue("pause");
  }

  seek(timeInSeconds: number): void {
    if (!this.ready) return;
    if (timeInSeconds < 0 || (this.duration > 0 && timeInSeconds > this.duration)) return;

    // Optimistic UI update
    this.previousTime = timeInSeconds;
    this.timeListeners.forEach((cb) => cb(timeInSeconds));

    this.enqueue("seek", { time: Math.floor(timeInSeconds * 1000) });
  }

  setVolume(volume: number): void {
    this.enqueue("volumeChange", { volume });
  }

  toggleFullscreen(): void {
    this.enqueue("fullscreenChange");
  }

  getEmbedUrl(): string {
    return `https://embed.nicovideo.jp/watch/${this.videoId}?jsapi=1&playerId=${PLAYER_ID}&from=0&allowProgrammaticFullScreen=1&noRelatedVideo=1&autoplay=0&_frontendId=${FRONTEND_ID}&_frontendVersion=${FRONTEND_VERSION}`;
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
    // If already ready, call immediately
    if (this.ready) cb();
    return () => this.readyListeners.delete(cb);
  }

  onError(cb: Callback<string>): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.timeListeners.clear();
    this.durationListeners.clear();
    this.playingListeners.clear();
    this.readyListeners.clear();
    this.errorListeners.clear();
  }

  // ─── Private ──────────────────────────────────────────────

  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      if (event.origin !== EMBED_ORIGIN) return;
      const data = event.data;
      if (!data || typeof data !== "object" || !data.eventName) return;

      switch (data.eventName) {
        case "loadComplete":
          this.ready = true;
          this.readyListeners.forEach((cb) => cb());

          if (data.data) {
            this.handleDurationFromData(data.data);
          }

          // Start time sync polling
          this.startSyncInterval();

          // Request initial status
          this.sendCommand("getStatus");
          break;

        case "playerMetadataChange":
          if (data.data) {
            if (data.data.currentTime !== undefined) {
              const time = data.data.currentTime / 1000;
              const maxTime = this.duration > 0 ? this.duration : 10800;
              const validated = Math.max(0, Math.min(time, maxTime));

              if (Math.abs(validated - this.previousTime) > 0.1) {
                this.previousTime = validated;
                this.timeListeners.forEach((cb) => cb(validated));
              }
            }
            if (data.data.duration !== undefined) {
              const dur = data.data.duration / 1000;
              if (dur > 0 && isFinite(dur) && dur < 10800) {
                this.duration = dur;
                this.durationListeners.forEach((cb) => cb(dur));
              }
            }
          }
          break;

        case "playerStatusChange":
        case "statusChange":
          if (data.data?.playerStatus !== undefined) {
            const playing = data.data.playerStatus === PLAYER_STATUS_PLAYING;
            this.playingListeners.forEach((cb) => cb(playing));

            if (playing) {
              this.startSyncInterval();
            } else {
              this.stopSyncInterval();
            }
          }
          break;

        case "error":
          this.errorListeners.forEach((cb) =>
            cb(data.data?.message || "Unknown player error")
          );
          break;
      }
    };

    window.addEventListener("message", this.messageHandler);
  }

  private handleDurationFromData(data: Record<string, unknown>): void {
    // Try videoInfo.lengthInSeconds first, then duration field
    const videoInfo = data.videoInfo as
      | { lengthInSeconds?: number }
      | undefined;
    let dur = 0;

    if (videoInfo?.lengthInSeconds && typeof videoInfo.lengthInSeconds === "number") {
      dur = videoInfo.lengthInSeconds;
    } else if (typeof data.duration === "number") {
      dur = data.duration / 1000; // ms → s
    }

    if (dur > 0 && isFinite(dur) && dur < 10800) {
      this.duration = dur;
      this.durationListeners.forEach((cb) => cb(dur));
    }
  }

  private startSyncInterval(): void {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => {
      if (this.ready) {
        this.sendCommand("getStatus");
      }
    }, 250);
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private sendCommand(eventName: string, data?: Record<string, unknown>): void {
    if (!this.iframe.contentWindow) return;
    this.iframe.contentWindow.postMessage(
      {
        sourceConnectorType: SOURCE_CONNECTOR_TYPE,
        playerId: PLAYER_ID,
        eventName,
        data: {
          ...data,
          _frontendId: FRONTEND_ID,
          _frontendVersion: FRONTEND_VERSION,
        },
      },
      EMBED_ORIGIN
    );
  }

  /** Queue commands to prevent overlap */
  private enqueue(eventName: string, data?: Record<string, unknown>): void {
    this.commandQueue = this.commandQueue.then(
      () =>
        new Promise<void>((resolve) => {
          this.sendCommand(eventName, data);
          setTimeout(resolve, 100); // Minimum spacing between commands
        })
    );
  }
}
