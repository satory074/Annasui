"""
cside-bridge/server.py

FastAPI ラッパー — CSIDE の MuQExtractor を HTTP API として公開する。

エンドポイント:
  POST /embed          WAV ファイル → フレーム埋め込み列 (T × 1024)
  POST /embed-song     楽曲 URL → 代表埋め込み (1024次元)
  GET  /health         ヘルスチェック

起動:
  cd cside-bridge
  uv run uvicorn server:app --host 0.0.0.0 --port 8000

必要な環境変数:
  CSIDE_DEVICE   (任意): "cuda" | "mps" | "cpu"  (default: 自動選択)
"""

from __future__ import annotations

import io
import os
import tempfile
from typing import Any

import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# CSIDE の MuQExtractor をインポート
# ローカルパス参照: pyproject.toml で `cside = {path = "../cside", develop = true}`
from cside.features.muq import MuQExtractor  # type: ignore

app = FastAPI(title="CSIDE MuQ Bridge", version="0.1.0")

# Chrome 拡張機能からのリクエストを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番では拡張機能の chrome-extension:// origin に絞る
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── グローバル extractor (起動時に一度ロード) ─────────────────────────────────

_extractor: MuQExtractor | None = None
TARGET_SR = 24_000  # MuQ の入力サンプリングレート


def get_extractor() -> MuQExtractor:
    global _extractor
    if _extractor is None:
        device_env = os.getenv("CSIDE_DEVICE")
        if device_env:
            device = device_env
        elif torch.cuda.is_available():
            device = "cuda"
        elif torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"

        print(f"[cside-bridge] Loading MuQExtractor on {device}...")
        _extractor = MuQExtractor(device=device)
        print("[cside-bridge] MuQExtractor loaded.")
    return _extractor


# ── ヘルパー ──────────────────────────────────────────────────────────────────


def decode_audio(audio_bytes: bytes) -> np.ndarray:
    """
    WAV バイト列を 24kHz モノラル float32 numpy 配列にデコードする。
    """
    buf = io.BytesIO(audio_bytes)
    waveform, sr = sf.read(buf, dtype="float32", always_2d=True)
    # モノラル化
    if waveform.shape[1] > 1:
        waveform = waveform.mean(axis=1)
    else:
        waveform = waveform[:, 0]

    # リサンプリング (librosa を使用)
    if sr != TARGET_SR:
        import librosa  # optional dependency

        waveform = librosa.resample(waveform, orig_sr=sr, target_sr=TARGET_SR)

    return waveform


# ── エンドポイント ─────────────────────────────────────────────────────────────


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/embed")
async def embed_audio(audio: UploadFile = File(...)) -> dict[str, Any]:
    """
    WAV ファイルを受け取り、MuQ フレーム埋め込み列を返す。

    Returns:
        {
          "embeddings": [[float, ...], ...],  # (T, 1024)
          "hop_sec": float
        }
    """
    audio_bytes = await audio.read()
    try:
        waveform = decode_audio(audio_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Audio decode failed: {exc}") from exc

    extractor = get_extractor()

    # MuQExtractor.encode は (T, D) の numpy 配列を返す想定
    # 実際の API は CSIDE の実装に合わせて調整が必要
    embeddings: np.ndarray = extractor.encode(waveform, sr=TARGET_SR)  # (T, 1024)

    # hop_sec を extractor から取得（なければデフォルト 1.0 秒）
    hop_sec: float = getattr(extractor, "hop_sec", 1.0)

    return {
        "embeddings": embeddings.tolist(),
        "hop_sec": hop_sec,
    }


class EmbedSongRequest(BaseModel):
    song_id: str
    title: str
    audio_url: str | None = None


@app.post("/embed-song")
async def embed_song(req: EmbedSongRequest) -> dict[str, Any]:
    """
    楽曲の代表埋め込み（mean pool）を返す。

    audio_url が指定されている場合はダウンロードして埋め込みを計算する。
    指定されていない場合は楽曲タイトルを使ったダミー埋め込みを返す（将来拡張）。

    Returns:
        { "embedding": [float, ...] }  # (1024,)
    """
    if not req.audio_url:
        # URL なし → ゼロベクトル（song_master に登録済みだが音声未取得）
        embedding = np.zeros(1024, dtype=np.float32)
        return {"embedding": embedding.tolist(), "note": "no audio_url, zero embedding"}

    # 音声ダウンロード
    import urllib.request

    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
        urllib.request.urlretrieve(req.audio_url, tmp_path)
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()
        os.unlink(tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Audio download failed: {exc}") from exc

    try:
        waveform = decode_audio(audio_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Audio decode failed: {exc}") from exc

    extractor = get_extractor()
    embeddings: np.ndarray = extractor.encode(waveform, sr=TARGET_SR)  # (T, 1024)

    # 平均プール → 代表ベクトル
    mean_emb = embeddings.mean(axis=0)
    norm = np.linalg.norm(mean_emb)
    if norm > 1e-10:
        mean_emb = mean_emb / norm

    return {"embedding": mean_emb.tolist()}
