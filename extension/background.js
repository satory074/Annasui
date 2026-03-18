/**
 * Medlean Auto Annotator — Service Worker (background.js)
 *
 * フロー:
 * 1. popup.js から "START_CAPTURE" メッセージを受信
 * 2. chrome.tabCapture.getMediaStreamId() でキャプチャID取得
 * 3. offscreen document を経由して MediaStream → WAV チャンク生成
 * 4. WAV チャンクを MuQ Feature Server に POST
 * 5. 解析結果を content.js へ転送 (window.postMessage)
 */

const DEFAULT_MUQEXTRACTOR_URL = "http://localhost:8000";
const DEFAULT_ANASUI_URL = "http://localhost:3000";
const CHUNK_DURATION_MS = 10_000; // 10秒チャンク

// ── 状態管理 ─────────────────────────────────────────────────────────────────

/** @type {{ capturing: boolean, captureTabId: number|null, anasuiTabId: number|null, streamId: string|null, medleyId: string|null }} */
const state = {
  capturing: false,
  captureTabId: null,
  anasuiTabId: null,
  streamId: null,
  medleyId: null,
};

// ── ユーティリティ ─────────────────────────────────────────────────────────────

async function getSettings() {
  const result = await chrome.storage.local.get([
    "muqExtractorUrl",
    "anasuiUrl",
  ]);
  return {
    muqExtractorUrl: result.muqExtractorUrl ?? DEFAULT_MUQEXTRACTOR_URL,
    anasuiUrl: result.anasuiUrl ?? DEFAULT_ANASUI_URL,
  };
}

/** Anasui タブへメッセージを送信 */
async function sendToAnasuiTab(message) {
  if (!state.anasuiTabId) return;
  try {
    await chrome.tabs.sendMessage(state.anasuiTabId, message);
  } catch {
    // タブが閉じられた場合は無視
  }
}

/** popup へ状態更新を通知 */
function notifyPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}

// ── Offscreen Document（MediaStream 処理） ──────────────────────────────────

const OFFSCREEN_URL = chrome.runtime.getURL("offscreen.html");

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  return contexts.length > 0;
}

async function setupOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["USER_MEDIA"],
    justification: "Tab audio capture for medley auto-annotation",
  });
}

// ── メッセージハンドラ ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "START_CAPTURE":
        await handleStartCapture(message);
        sendResponse({ ok: true });
        break;

      case "STOP_CAPTURE":
        await handleStopCapture();
        sendResponse({ ok: true });
        break;

      case "GET_STATE":
        sendResponse({ state });
        break;

      case "WAV_CHUNK_READY":
        // offscreen.js からのチャンク受信
        await handleWavChunk(message.wavBase64, message.chunkIndex);
        sendResponse({ ok: true });
        break;

      case "CAPTURE_ERROR":
        state.capturing = false;
        notifyPopup({ type: "STATUS_UPDATE", status: "error", error: message.error });
        sendResponse({ ok: true });
        break;

      default:
        sendResponse({ ok: false, error: "unknown message type" });
    }
  })();
  return true; // async response
});

// ── キャプチャ開始 ─────────────────────────────────────────────────────────────

async function handleStartCapture({ tabId, anasuiTabId, medleyId }) {
  if (state.capturing) {
    notifyPopup({ type: "STATUS_UPDATE", status: "error", error: "Already capturing" });
    return;
  }

  try {
    // chrome.tabCapture.getMediaStreamId を使ってキャプチャ ID を取得
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId(
        { targetTabId: tabId },
        (id) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(id);
          }
        }
      );
    });

    state.capturing = true;
    state.captureTabId = tabId;
    state.anasuiTabId = anasuiTabId;
    state.streamId = streamId;
    state.medleyId = medleyId ?? null;

    // offscreen document を起動してキャプチャ開始
    await setupOffscreenDocument();
    chrome.runtime.sendMessage({
      type: "START_RECORDING",
      streamId,
      chunkDurationMs: CHUNK_DURATION_MS,
    });

    notifyPopup({ type: "STATUS_UPDATE", status: "capturing" });
  } catch (err) {
    state.capturing = false;
    notifyPopup({ type: "STATUS_UPDATE", status: "error", error: err.message });
  }
}

// ── キャプチャ停止 ─────────────────────────────────────────────────────────────

async function handleStopCapture() {
  if (!state.capturing) return;
  state.capturing = false;

  chrome.runtime.sendMessage({ type: "STOP_RECORDING" });
  notifyPopup({ type: "STATUS_UPDATE", status: "idle" });
}

// ── WAV チャンク処理 ───────────────────────────────────────────────────────────

/** @type {string[]} */
const wavChunks = [];

async function handleWavChunk(wavBase64, chunkIndex) {
  wavChunks.push(wavBase64);
  notifyPopup({
    type: "STATUS_UPDATE",
    status: "capturing",
    chunksReceived: wavChunks.length,
  });
}

// ── 解析実行 ───────────────────────────────────────────────────────────────────

/**
 * popup の「解析」ボタンから呼ばれる（WAVチャンクが溜まった後）
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "ANALYZE_CHUNKS") return;
  (async () => {
    const { muqExtractorUrl } = await getSettings();
    try {
      const results = await analyzeChunks(muqExtractorUrl);
      // Anasui タブへ結果を送信
      await sendToAnasuiTab({
        type: "CSIDE_ANALYSIS_RESULT",
        entries: results.entries,
        segments: results.segments,
      });
      sendResponse({ ok: true, entryCount: results.entries.length });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();
  return true;
});

async function analyzeChunks(muqExtractorUrl) {
  if (wavChunks.length === 0) {
    throw new Error("No audio chunks recorded");
  }

  // チャンクを結合して1つの WAV ファイルにする（簡易: 最後のチャンクのみ使用）
  // TODO: 複数チャンクの結合は将来実装
  const lastChunk = wavChunks[wavChunks.length - 1];
  const wavBytes = base64ToArrayBuffer(lastChunk);
  const wavBlob = new Blob([wavBytes], { type: "audio/wav" });

  const formData = new FormData();
  formData.append("audio", wavBlob, "capture.wav");
  if (state.medleyId) {
    formData.append("medley_id", state.medleyId);
  }

  // Next.js API route に送信
  const { anasuiUrl } = await getSettings();
  const res = await fetch(`${anasuiUrl}/api/audio/analyze/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `Analysis failed: ${res.status}`);
  }

  return res.json();
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
