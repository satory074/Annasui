/**
 * offscreen.js
 *
 * MediaStream → WAV チャンク変換を行う Offscreen Document。
 * Chrome MV3 では tabCapture の MediaStream を Service Worker 内で直接扱えないため、
 * Offscreen API を使って DOM 環境で処理する。
 */

let mediaRecorder = null;
let chunkIndex = 0;
let chunkDurationMs = 10_000;
let recordingInterval = null;

// WAV エンコーダ（PCM 16bit モノラル）
function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset + i * 2, s * 0x7fff, true);
  }

  return buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "START_RECORDING") {
    chunkDurationMs = message.chunkDurationMs ?? 10_000;
    startRecording(message.streamId);
    sendResponse({ ok: true });
  } else if (message.type === "STOP_RECORDING") {
    stopRecording();
    sendResponse({ ok: true });
  }
  return true;
});

async function startRecording(streamId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: false,
    });

    const audioCtx = new AudioContext({ sampleRate: 24000 });
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);

    /** @type {Float32Array[]} */
    let currentChunkBuffers = [];
    let chunkStartTime = Date.now();

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      currentChunkBuffers.push(new Float32Array(inputData));

      if (Date.now() - chunkStartTime >= chunkDurationMs) {
        // チャンクを WAV に変換して Service Worker へ送信
        const totalSamples = currentChunkBuffers.reduce(
          (s, b) => s + b.length,
          0
        );
        const merged = new Float32Array(totalSamples);
        let offset = 0;
        for (const buf of currentChunkBuffers) {
          merged.set(buf, offset);
          offset += buf.length;
        }

        const wavBuffer = encodeWAV(merged, audioCtx.sampleRate);
        const wavBase64 = arrayBufferToBase64(wavBuffer);

        chrome.runtime.sendMessage({
          type: "WAV_CHUNK_READY",
          wavBase64,
          chunkIndex: chunkIndex++,
        });

        // リセット
        currentChunkBuffers = [];
        chunkStartTime = Date.now();
      }
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    // クリーンアップ用に保持
    window._mediaRecorder = { stream, audioCtx, processor, source };
  } catch (err) {
    chrome.runtime.sendMessage({
      type: "CAPTURE_ERROR",
      error: err.message,
    });
  }
}

function stopRecording() {
  const r = window._mediaRecorder;
  if (!r) return;

  r.processor.disconnect();
  r.source.disconnect();
  r.stream.getTracks().forEach((t) => t.stop());
  r.audioCtx.close();
  window._mediaRecorder = null;
  chunkIndex = 0;
}
