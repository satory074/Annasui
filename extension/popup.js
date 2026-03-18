/**
 * popup.js — Medlean Auto Annotator ポップアップ
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const anasuiTabSelect = document.getElementById("anasuiTabSelect");
const medleyIdInput = document.getElementById("medleyId");
const chunkCountEl = document.getElementById("chunkCount");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultInfo = document.getElementById("resultInfo");
const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const muqUrlInput = document.getElementById("muqUrl");
const anasuiUrlInput = document.getElementById("anasuiUrl");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

// ── 初期化 ────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await populateAnasuiTabs();
  await syncState();
});

// ── 設定 ──────────────────────────────────────────────────────────────────────

async function loadSettings() {
  const result = await chrome.storage.local.get(["muqExtractorUrl", "anasuiUrl"]);
  muqUrlInput.value = result.muqExtractorUrl ?? "http://localhost:8000";
  anasuiUrlInput.value = result.anasuiUrl ?? "http://localhost:3000";
}

saveSettingsBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({
    muqExtractorUrl: muqUrlInput.value.trim() || "http://localhost:8000",
    anasuiUrl: anasuiUrlInput.value.trim() || "http://localhost:3000",
  });
  saveSettingsBtn.textContent = "保存しました ✓";
  setTimeout(() => (saveSettingsBtn.textContent = "保存"), 1500);
});

settingsToggle.addEventListener("click", () => {
  settingsPanel.classList.toggle("open");
});

// ── Anasui タブ一覧 ────────────────────────────────────────────────────────────

async function populateAnasuiTabs() {
  const tabs = await chrome.tabs.query({});
  const anasuiTabs = tabs.filter(
    (t) =>
      t.url &&
      (t.url.includes("anasui-e6f49.web.app") || t.url.includes("localhost:3000"))
  );

  anasuiTabSelect.innerHTML = '<option value="">タブを選択...</option>';
  for (const tab of anasuiTabs) {
    const opt = document.createElement("option");
    opt.value = String(tab.id);
    opt.textContent = `[${tab.id}] ${tab.title?.slice(0, 40) ?? tab.url}`;
    anasuiTabSelect.appendChild(opt);
  }

  if (anasuiTabs.length === 1) {
    anasuiTabSelect.value = String(anasuiTabs[0].id);
  }
}

// ── 状態同期 ──────────────────────────────────────────────────────────────────

async function syncState() {
  const res = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  updateUI(res.state);
}

function updateUI(state) {
  const { capturing } = state;

  startBtn.style.display = capturing ? "none" : "block";
  stopBtn.style.display = capturing ? "block" : "none";
  analyzeBtn.style.display = capturing ? "none" : "block";

  if (capturing) {
    setStatus("capturing", "録音中...");
  } else {
    setStatus("idle", "待機中");
  }
}

function setStatus(cls, text) {
  statusDot.className = `status-dot ${cls}`;
  statusText.textContent = text;
}

// ── ボタン操作 ────────────────────────────────────────────────────────────────

startBtn.addEventListener("click", async () => {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const anasuiTabId = anasuiTabSelect.value
    ? parseInt(anasuiTabSelect.value)
    : null;

  if (!activeTab?.id) {
    showResult("error", "アクティブタブが見つかりません");
    return;
  }

  resultInfo.style.display = "none";

  await chrome.runtime.sendMessage({
    type: "START_CAPTURE",
    tabId: activeTab.id,
    anasuiTabId,
    medleyId: medleyIdInput.value.trim() || null,
  });

  startBtn.style.display = "none";
  stopBtn.style.display = "block";
  analyzeBtn.style.display = "none";
  chunkCountEl.style.display = "block";
  setStatus("capturing", "録音中...");
});

stopBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });
  stopBtn.style.display = "none";
  startBtn.style.display = "block";
  analyzeBtn.style.display = "block";
  setStatus("idle", "録音停止 — 解析できます");
});

analyzeBtn.addEventListener("click", async () => {
  setStatus("analyzing", "解析中...");
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "解析中...";

  const res = await chrome.runtime.sendMessage({ type: "ANALYZE_CHUNKS" });

  analyzeBtn.disabled = false;
  analyzeBtn.textContent = "✦ 解析 & Anasui へ送信";

  if (res.ok) {
    setStatus("done", "完了");
    showResult("ok", `${res.entryCount} 曲を Anasui に送信しました`);
  } else {
    setStatus("error", "エラー");
    showResult("error", res.error ?? "解析に失敗しました");
  }
});

// ── background.js からのメッセージ ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATUS_UPDATE") {
    handleStatusUpdate(message);
  }
});

function handleStatusUpdate({ status, error, chunksReceived }) {
  switch (status) {
    case "capturing":
      setStatus("capturing", "録音中...");
      if (chunksReceived != null) {
        chunkCountEl.textContent = `チャンク: ${chunksReceived} 個`;
      }
      break;
    case "idle":
      setStatus("idle", "待機中");
      break;
    case "error":
      setStatus("error", "エラー");
      showResult("error", error ?? "不明なエラー");
      startBtn.style.display = "block";
      stopBtn.style.display = "none";
      break;
  }
}

// ── ヘルパー ──────────────────────────────────────────────────────────────────

function showResult(type, message) {
  resultInfo.className = `info${type === "error" ? " error" : ""}`;
  resultInfo.textContent = message;
  resultInfo.style.display = "block";
}
