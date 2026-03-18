/**
 * content.js — Anasui ページ埋め込みスクリプト
 *
 * background.js から chrome.tabs.sendMessage で受け取った解析結果を
 * window.postMessage でページ本体（React）へ転送する。
 *
 * ページ側（ImportSetlistModal）は "CSIDE_ANALYSIS_RESULT" タイプの
 * postMessage を監視して自動入力を行う。
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CSIDE_ANALYSIS_RESULT") {
    // Chrome 拡張 → ページへ postMessage
    window.postMessage(
      {
        source: "MEDLEAN_EXTENSION",
        type: "CSIDE_ANALYSIS_RESULT",
        entries: message.entries,
        segments: message.segments,
      },
      "*"
    );
    sendResponse({ ok: true });
  }
  return true;
});

// ページロード完了を background.js に通知（デバッグ用）
window.addEventListener("load", () => {
  chrome.runtime.sendMessage({
    type: "CONTENT_READY",
    url: window.location.href,
  }).catch(() => {});
});
