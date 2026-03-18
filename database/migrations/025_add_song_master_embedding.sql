-- Migration 025: song_master に MuQ 埋め込みベクトルカラムを追加
--
-- Supabase は pgvector 拡張をサポート。
-- vector(1024) カラムを追加し、ivfflat インデックスでコサイン近傍検索を高速化する。
--
-- 適用方法:
--   Supabase SQL Editor に貼り付けて実行
-- または:
--   psql $DATABASE_URL -f database/migrations/025_add_song_master_embedding.sql

-- pgvector 拡張を有効化（未有効の場合）
CREATE EXTENSION IF NOT EXISTS vector;

-- 埋め込みカラムを追加（NULL = 未登録）
ALTER TABLE song_master
  ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- コサイン類似度検索用 ivfflat インデックス
-- lists はデータ量に応じて調整 (目安: sqrt(行数))
CREATE INDEX IF NOT EXISTS song_master_embedding_idx
  ON song_master
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- スキーマ変更を PostgREST にリロード通知
NOTIFY pgrst, 'reload schema';
