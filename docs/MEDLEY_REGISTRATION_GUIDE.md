# メドレー楽曲メタデータ登録・更新手順書

## 概要

Medleanアプリケーションにおけるメドレー楽曲の登録・更新作業の標準手順を定める。

---

## 1. 事前準備

### 1.1 必要な情報の確認
ユーザーから以下の情報を取得する：
- **動画ID**（例: `sm500873`）
- **プラットフォーム**（niconico / youtube / spotify / appleMusic）
- **楽曲リスト**（タイムスタンプ付きが望ましい）

### 1.2 データベース接続情報
```
Project ID: dheairurkxjftugrwdjl
テーブル: medley_songs, medleys
```

---

## 2. メドレー情報の確認

### 2.1 メドレーIDの取得
```sql
SELECT id, video_id, title, duration
FROM medleys
WHERE video_id = '{動画ID}';
```

### 2.2 既存楽曲の確認
```sql
SELECT id, title, artist, start_time, end_time, order_index, composers, arrangers
FROM medley_songs
WHERE medley_id = '{メドレーID}'
ORDER BY order_index;
```

---

## 3. 楽曲情報の調査

### 3.1 調査対象フィールド
| フィールド | 説明 | 例 |
|-----------|------|-----|
| `artist` | 歌唱者・演奏者 | 平野綾, JAM Project |
| `composers` | 作曲者（カンマ区切り） | 神前暁, 菅野よう子 |
| `arrangers` | 編曲者（カンマ区切り） | 神前暁, ARM |

### 3.2 調査方法
Web検索を使用して以下のクエリで調査：
- `"{楽曲名}" 作詞 作曲 編曲`
- `"{楽曲名}" {アニメ/ゲーム名} 作曲者`
- `"{楽曲名}" Wikipedia`

### 3.3 特殊ケースの処理

#### 東方アレンジ曲
- **作曲者**: `ZUN (原曲)` と記載
- **編曲者**: アレンジャー名（ARM, beatMARIO, NYO など）
- **アーティスト**: ボーカル担当者とサークル名（例: `miko (IOSYS)`）

#### ゲームBGM
- **アーティスト**: `{ゲーム名} BGM` と記載
- **作曲者/編曲者**: 作曲者名（下村陽子, 近藤浩治, すぎやまこういち など）

#### アニメ主題歌
- **アーティスト**: 実際の歌唱者名
- **作曲者/編曲者**: クレジット通りに記載

#### 伝統曲・民謡
- **アーティスト**: `日本民謡` など
- **作曲者**: `(伝統曲)` と記載
- **編曲者**: NULL

---

## 4. 原曲URLの登録

### 4.1 URL優先順位

原曲URLは**公式ソースを優先**する。以下の優先順位で登録する：

| 優先度 | ソース | 条件 | 例 |
|--------|--------|------|-----|
| 1 | **Spotify** | 公式配信がある場合 | レーベル公式、アーティスト公式 |
| 2 | **YouTube** | 公式チャンネルがある場合 | VEVO、公式MV |
| 3 | **Apple Music** | 上記がない場合 | 公式配信 |
| 4 | **niconico** | 公式配信がない場合のみ | 歌い手オリジナル、東方アレンジ等 |

**重要**: niconicoのユーザー投稿動画は、公式配信が存在しない場合にのみ使用する。

### 4.2 公式配信がないケース

以下のカテゴリは公式配信がないことが多い：
- **東方アレンジ曲**: 同人サークル作品（niconicoを使用）
- **ゲームBGM**: サウンドトラック未配信の場合（リンクなし）
- **同人曲**: 商業配信されていない作品（niconicoを使用）
- **ミュージカル曲**: テニミュ等（リンクなし）
- **伝統曲**: 著作権フリー（リンクなし）

### 4.3 URL調査方法

```
# Spotify検索
"{楽曲名}" site:open.spotify.com

# YouTube公式検索
"{楽曲名}" 公式 site:youtube.com

# niconico (公式がない場合のみ)
"{楽曲名}" site:nicovideo.jp
```

### 4.4 URLフィールド

| フィールド | プラットフォーム |
|------------|------------------|
| `spotify_link` | Spotify |
| `youtube_link` | YouTube |
| `applemusic_link` | Apple Music |
| `niconico_link` | niconico |

**注意**: 1曲につき1つのリンクのみ設定する（優先度の高いもの）

---

## 4.5 既存楽曲の検索（必須）

**重要**: 新規登録の前に、必ず `song_master` テーブルで既存の楽曲を検索すること。既存の楽曲が見つかった場合は、そのIDを使用して `medley_songs` に登録する。

### 4.5.1 検索クエリ

#### タイトルで検索
```sql
SELECT id, title, artist, normalized_id,
       niconico_link, youtube_link, spotify_link, applemusic_link
FROM song_master
WHERE title ILIKE '%{楽曲名}%';
```

#### normalized_id で検索（推奨）
```sql
SELECT id, title, artist, normalized_id
FROM song_master
WHERE normalized_id LIKE '%{正規化楽曲名}%';
```

#### アーティスト名で検索
```sql
SELECT id, title, artist
FROM song_master
WHERE artist ILIKE '%{アーティスト名}%';
```

### 4.5.2 検索結果の判断

| 結果 | 対応 |
|------|------|
| **一致する楽曲が見つかった** | その `id` を `medley_songs.song_id` に設定して登録 |
| **類似する楽曲が見つかった** | 内容を確認し、同一曲なら既存IDを使用。異なる場合は新規登録 |
| **見つからなかった** | セクション5.0の手順で `song_master` に新規登録 |

### 4.5.3 検索のポイント

- **表記揺れに注意**: 「〜」と「~」、「・」と「･」など
- **英語/日本語の違い**: 「God knows...」と「ゴッドノウズ」
- **部分一致で幅広く検索**: `%キーワード%` で検索範囲を広げる
- **複数条件で絞り込み**: タイトルとアーティストの両方で確認

---

## 5. データベース更新

### 5.0 重要: song_masterへの新規登録（既存楽曲が見つからない場合のみ）

**注意**: セクション4.5で既存楽曲を検索し、**見つからなかった場合のみ**このセクションの手順で新規登録すること。

ライブラリページで楽曲を編集可能にするには、`song_master`テーブルへの登録が必要です。

#### 5.0.1 normalized_idの生成

`normalized_id`はタイトルとアーティスト名から生成される一意キーです：
- カタカナ → ひらがな変換
- 全角 → 半角変換
- 小文字化、スペース・記号除去
- フォーマット: `{正規化タイトル}_{正規化アーティスト}`

例:
- 「エージェント夜を往く」+ 「THE IDOLM@STER」 → `えじぇんと夜を往く_theidolm@ster`
- 「ハレ晴レユカイ」+ 「平野綾」 → `はれはれゆかい_平野綾`

#### 5.0.2 song_masterへの登録
```sql
-- 1. アーティストを登録（存在しない場合）
INSERT INTO artists (name, normalized_name)
VALUES ('{アーティスト}', '{正規化アーティスト}')
RETURNING id;

-- 2. song_masterに登録
INSERT INTO song_master (
  title, artist, normalized_id,
  niconico_link, youtube_link, spotify_link, applemusic_link
) VALUES (
  '{楽曲名}',
  '{アーティスト}',
  '{normalized_id}',
  '{niconicoのURL}',
  '{YouTubeのURL}',
  '{SpotifyのURL}',
  '{Apple MusicのURL}'
)
RETURNING id;

-- 3. song_artist_relationsに登録
INSERT INTO song_artist_relations (song_id, artist_id, role, order_index)
VALUES ('{song_master.id}', '{artists.id}', 'artist', 0);
```

### 5.1 新規楽曲の登録（medley_songs）

**注意**: song_masterに登録済みの場合は`song_id`を設定すること

```sql
INSERT INTO medley_songs (
  medley_id, title, artist, start_time, end_time,
  order_index, composers, arrangers, last_editor,
  song_id, niconico_link, youtube_link, spotify_link, applemusic_link
) VALUES (
  '{メドレーID}',
  '{楽曲名}',
  '{アーティスト}',
  {開始秒},
  {終了秒},
  {順番},
  '{作曲者}',
  '{編曲者}',
  'Claude',
  '{song_master.id}',  -- song_masterのUUID（必須ではないが推奨）
  '{niconicoのURL}',
  '{YouTubeのURL}',
  '{SpotifyのURL}',
  '{Apple MusicのURL}'
);
```

### 5.2 既存楽曲の更新
```sql
UPDATE medley_songs SET
  artist = '{アーティスト}',
  composers = '{作曲者}',
  arrangers = '{編曲者}',
  last_editor = 'Claude'
WHERE medley_id = '{メドレーID}' AND order_index = {順番};
```

### 5.3 一括更新（複数曲）
効率化のため、複数のUPDATE文を1つのクエリにまとめて実行する。

### 5.4 既存medley_songsとsong_masterの紐付け
既にmedley_songsに登録済みだがsong_masterに紐付いていない楽曲がある場合：
```sql
-- song_masterのIDを確認
SELECT id, normalized_id, title FROM song_master WHERE title LIKE '%{楽曲名}%';

-- medley_songsに紐付け
UPDATE medley_songs
SET song_id = '{song_master.id}'
WHERE title = '{楽曲名}' AND song_id IS NULL;
```

---

## 6. 検証

### 6.1 更新結果の確認
```sql
SELECT order_index, title, artist, composers, arrangers
FROM medley_songs
WHERE medley_id = '{メドレーID}'
ORDER BY order_index;
```

### 6.2 Webアプリでの確認
更新後、以下のURLで視覚的に確認：
```
https://anasui-e6f49.web.app/{platform}/{video_id}/
```

---

## 7. よく使う作曲家・編曲家リファレンス

### アニソン系
| 名前 | 代表作 |
|------|--------|
| 神前暁 | God knows..., もってけ!セーラーふく, ふたりのもじぴったん |
| 畑亜貴 | ハレ晴レユカイ (作詞), もってけ!セーラーふく (作詞) |
| 菅野よう子 | 創聖のアクエリオン, マクロスF |
| 梶浦由記 | MADLAX, Fate/Zero, 鬼滅の刃 |

### 東方アレンジ系
| サークル/アレンジャー | 代表作 |
|---------------------|--------|
| ARM (IOSYS) | 患部で止まってすぐ溶ける, 魔理沙は大変なものを〜 |
| beatMARIO (COOL&CREATE) | Help me, ERINNNNNN!! |
| NYO (Silver Forest) | つるぺったん |

### ゲーム音楽系
| 名前 | 代表作 |
|------|--------|
| 近藤浩治 | スーパーマリオシリーズ, ゼルダの伝説 |
| 下村陽子 | スーパーマリオRPG, キングダムハーツ |
| すぎやまこういち | ドラゴンクエストシリーズ |
| 植松伸夫 | ファイナルファンタジーシリーズ |
| 桜庭統 | テイルズシリーズ, 黄金の太陽 |

---

## 8. 作業フロー図

```
[ユーザーからの依頼]
       ↓
[1. メドレーID取得] → SELECT medleys
       ↓
[2. 既存データ確認] → SELECT medley_songs
       ↓
[3. 楽曲情報調査] → WebSearch で各曲を調査
       ↓
[4. 原曲URL調査] → 公式ソース優先で検索 (Spotify > YouTube > Apple Music > niconico)
       ↓
[4.5 既存楽曲検索] → SELECT song_master で既存楽曲を検索 ★重要★
       ↓
   ┌─────────────────────────────────────┐
   │ 既存楽曲が見つかった？               │
   └─────────────────────────────────────┘
       │                    │
      YES                  NO
       │                    │
       ↓                    ↓
[既存IDを使用]     [5.0 song_master新規登録]
       │                    │
       └────────┬───────────┘
                ↓
[5. データ整理] → 調査結果をテーブル形式でまとめる
       ↓
[6. SQL実行] → INSERT medley_songs (song_id を設定)
       ↓
[7. 検証] → SELECT で確認 + Webアプリで目視確認
       ↓
[完了報告]
```

---

## 9. 注意事項

1. **タイムスタンプは秒単位**で登録（分:秒形式は秒に変換）
2. **複数のアーティスト/作曲者**はカンマ区切りで記載
3. **編曲者が不明な場合**は作曲者と同じにするか NULL
4. **last_editor は 'Claude'** で統一
5. **order_index は1始まり**で連番
6. **原曲URLは公式ソース優先** (Spotify/YouTube > niconico)
   - niconicoはユーザー投稿のため、公式配信がない場合のみ使用
