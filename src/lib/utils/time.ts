export function formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function normalizeTimeValue(timeValue: number): number {
    // 明らかに異常に大きい値（10000秒以上）は秒に変換
    // 通常の動画であれば数千秒（1-3時間程度）はあり得るので、閾値を上げる
    if (timeValue > 10000) {
        return timeValue / 1000;
    }

    // すでに適切な秒単位の値と判断
    return timeValue;
}