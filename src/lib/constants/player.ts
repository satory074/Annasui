export const PLAYER_CONFIG = {
    EMBED_ORIGIN: "https://embed.nicovideo.jp",
    SOURCE_CONNECTOR_TYPE: 1,
    PLAYER_ID: "1",
    FRONTEND_ID: 6,
    FRONTEND_VERSION: 0,
    SEEK_DEBOUNCE_MS: 100,
    POLLING_INTERVAL_MS: 100,
} as const;

export const PLAYER_STATUS = {
    READY: 1,
    PLAYING: 2,
    PAUSED: 3,
    ENDED: 4,
} as const;

export const SEEK_STATUS = {
    COMPLETE: 0,
    IN_PROGRESS: 1,
    STARTED: 2,
} as const;