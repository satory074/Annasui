export function formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function normalizeTimeValue(timeValue: number): number {
    // NaNや無効な値のチェック
    if (!isFinite(timeValue) || timeValue < 0) {
        console.warn(`⚠️ Invalid time value: ${timeValue}, returning 0`);
        return 0;
    }

    // 通常の秒単位値として扱う（異常値チェックを削除）
    return timeValue;
}

export function validateAndClampTime(currentTime: number, duration: number, previousTime: number = 0): number {
    // NaNや無効な値のチェック
    if (!isFinite(currentTime) || currentTime < 0) {
        console.warn(`⚠️ Invalid currentTime: ${currentTime}, using previous value: ${previousTime}`);
        return previousTime;
    }

    // durationが有効でない場合はそのまま返す
    if (!isFinite(duration) || duration <= 0) {
        return currentTime;
    }

    // currentTimeがdurationを超過している場合はクランプ（前回値使用を削除）
    if (currentTime > duration) {
        return duration;
    }

    return currentTime;
}

export function detectTimeCorruption(currentTime: number, duration: number): boolean {
    // durationが有効でない場合は判定不可
    if (!isFinite(duration) || duration <= 0) {
        return false;
    }

    // currentTimeがdurationの2倍を超える場合は明らかに異常
    const corruptionThreshold = duration * 2;
    const isCorrupted = currentTime > corruptionThreshold;
    
    if (isCorrupted) {
        console.error(`🚨 PLAYER TIME CORRUPTION DETECTED: currentTime=${currentTime}s, duration=${duration}s (ratio: ${(currentTime/duration).toFixed(2)}x)`);
    }
    
    return isCorrupted;
}