// ニコニコ動画のIDが有効な形式かチェックする関数
export function isValidNicoVideoId(videoId: string): boolean {
  // 空文字列チェック
  if (!videoId || videoId.trim() === '') {
    return false;
  }

  // ニコニコ動画のID形式をチェック
  // sm123456 または nm123456 または so123456 形式
  const nicoVideoIdPattern = /^(sm|nm|so)\d+$/i;
  
  return nicoVideoIdPattern.test(videoId.trim());
}

// 動画IDを正規化する関数（不要な文字を除去）
export function normalizeVideoId(videoId: string): string {
  return videoId.trim().toLowerCase();
}

// 動画IDのエラーメッセージを生成する関数
export function getVideoIdErrorMessage(videoId: string): string | null {
  if (!videoId || videoId.trim() === '') {
    return '動画IDを入力してください';
  }
  
  if (!isValidNicoVideoId(videoId)) {
    return '有効なニコニコ動画IDを入力してください（例: sm500873）';
  }
  
  return null;
}