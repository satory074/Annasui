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
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# CSIDE の MuQExtractor をインポート
# ローカルパス参照: pyproject.toml で cside = {path = "../cside", develop = true}
from cside.features.muq import MuQExtractor, SAMPLE_RATE  # type: ignore

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


def get_extractor() -> MuQExtractor:
    global _extractor
    if _extractor is None:
        device_env = os.getenv("CSIDE_DEVICE")
        print(f"[cside-bridge] Loading MuQExtractor (device={device_env or 'auto'})...")
        _extractor = MuQExtractor(device=device_env or None)
        print("[cside-bridge] MuQExtractor loaded.")
    return _extractor


# ── ヘルパー ──────────────────────────────────────────────────────────────────


def decode_audio_bytes(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    """WAV バイト列を float32 numpy 配列と sample_rate にデコードする。
    リサンプリングは MuQExtractor.encode() に委ねる。
    """
    buf = io.BytesIO(audio_bytes)
    waveform, sr = sf.read(buf, dtype="float32", always_2d=True)
    # モノラル化
    if waveform.shape[1] > 1:
        waveform = waveform.mean(axis=1)
    else:
        waveform = waveform[:, 0]
    return waveform, sr


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
          "hop_sec": float                    # 実際のフレーム時間長（秒）
        }
    """
    audio_bytes = await audio.read()
    try:
        waveform, sr = decode_audio_bytes(audio_bytes)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Audio decode failed: {exc}") from exc

    extractor = get_extractor()

    # encode() は内部でリサンプリングを行い (T, 1024) を返す
    embeddings: np.ndarray = extractor.encode(waveform, sr=sr, aggregate=False)  # (T, 1024)

    # 実際の hop_sec を算出（duration / フレーム数）
    duration_sec = len(waveform) / sr
    T = embeddings.shape[0]
    hop_sec: float = duration_sec / T if T > 0 else 1.0

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
    指定されていない場合はゼロベクトルを返す（将来: テキスト埋め込みで代替）。

    Returns:
        { "embedding": [float, ...] }  # (1024,)
    """
    if not req.audio_url:
        embedding = np.zeros(1024, dtype=np.float32)
        return {"embedding": embedding.tolist(), "note": "no audio_url, zero embedding"}

    # 音声ダウンロード
    import urllib.request

    try:
        suffix = ".wav"
        for ext in [".mp3", ".flac", ".m4a", ".ogg"]:
            if req.audio_url.lower().endswith(ext):
                suffix = ext
                break

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
        urllib.request.urlretrieve(req.audio_url, tmp_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Audio download failed: {exc}") from exc

    try:
        extractor = get_extractor()
        # encode_file は内部で librosa.load を使用し、リサンプリング後に encode を呼ぶ
        mean_emb: np.ndarray = extractor.encode_file(tmp_path, aggregate=True)  # (1024,)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}") from exc
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    # L2正規化
    norm = np.linalg.norm(mean_emb)
    if norm > 1e-10:
        mean_emb = mean_emb / norm

    return {"embedding": mean_emb.tolist()}
