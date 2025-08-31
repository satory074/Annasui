# Medlean

Medleanは、ニコニコ動画、YouTube、Spotify、Apple Musicのメドレー楽曲に対するアノテーション（楽曲情報の注釈）を提供する包括的なプラットフォームです。各メドレー動画において、どの時間帯にどの楽曲が演奏されているかを視覚的に表示し、ユーザーが楽曲を効率的に楽しめる環境を提供します。

## 主な機能

- **マルチプラットフォーム対応**: ニコニコ動画とYouTubeの両方に対応
- **インタラクティブなタイムライン**: 楽曲の開始・終了時間を視覚的に表示
- **楽曲検索**: メドレー間を横断した楽曲検索機能
- **アノテーション編集**: ドラッグ&ドロップによる楽曲時間の調整
- **プレイヤー連携**: 動画プレイヤーとの完全同期
- **レスポンシブデザイン**: モバイル・デスクトップ両対応

## 技術スタック

- **フロントエンド**: Next.js 15.2.1, React 19.0.0, TypeScript
- **スタイリング**: TailwindCSS 4, Emotion
- **データベース**: Supabase PostgreSQL
- **認証**: Supabase Auth (OAuth with GitHub/Google)
- **デプロイ**: Firebase App Hosting (SSR対応)
- **プレイヤー統合**: postMessage API (ニコニコ), iframe embed (YouTube)

## 開発環境のセットアップ

### 必要な環境

- Node.js 18.0.0 以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone [repository-url]
cd medlean

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーは [http://localhost:3000](http://localhost:3000) で起動します。

### 環境変数の設定（オプション）

Supabaseを使用する場合は、環境変数を設定してください：

```bash
# .env.localファイルを作成
cp .env.example .env.local

# 以下の変数を設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start

# ESLint実行
npm run lint

# TypeScriptタイプチェック
npx tsc --noEmit
```

## プロジェクト構造

```
src/
├── app/                 # Next.js App Router
├── components/          # Reactコンポーネント
│   ├── features/       # 機能別コンポーネント
│   ├── layout/         # レイアウトコンポーネント
│   ├── pages/          # ページコンポーネント
│   └── ui/             # 汎用UIコンポーネント
├── contexts/           # React Context (認証等)
├── hooks/              # カスタムReactフック
├── lib/                # ユーティリティ・API
└── types/              # TypeScript型定義
```

## デプロイ

### Firebase App Hostingへのデプロイ

#### 前提条件
- Firebase CLIのインストール: `npm install -g firebase-tools`
- Firebaseプロジェクトへのアクセス権限

#### デプロイコマンド

```bash
# Firebaseログイン
firebase login

# プロジェクト選択
firebase use anasui-e6f49

# プロダクションビルドチェック
npm run build
npx tsc --noEmit
npm run lint

# ホスティングへデプロイ (推奨)
firebase deploy --only hosting

# フルデプロイ (非推奨)
# firebase deploy
```

#### プロダクション環境
- **メイン**: https://anasui-e6f49.web.app
- **サブ**: https://anasui-e6f49.firebaseapp.com

#### 環境変数の設定
Firebase Consoleで以下の環境変数を設定:
```
NEXT_PUBLIC_SUPABASE_URL=https://dheairurkxjftugrwdjl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[supabase-anon-key]
```

## ドキュメント

詳細なドキュメントは [docs/](./docs/) ディレクトリを参照してください：

- [アーキテクチャ設計](./docs/architecture.md)
- [API統合](./docs/api-integration.md)
- [要件仕様](./docs/requirements.md)
- [コントリビューションガイド](./docs/contributing.md)

## ライセンス

このプロジェクトはアルファ版です。MITライセンスの下でリリースされています。

## 重要な注意事項

### 動作確認について
**重要**: 機能の動作確認は必ずプロダクション環境 (https://anasui-e6f49.web.app) で行ってください。
ローカル環境とプロダクション環境では、iframe通信やSSR等の違いにより動作が異なる場合があります。

### データベース設定
アプリケーションを正しく動作させるためには、以下のデータベースマイグレーションをSupabase Dashboardで実行してください:

1. `database/migrations/001_create_users_table.sql`
2. `database/migrations/002_add_user_id_to_medleys.sql`  
3. `database/migrations/003_fix_rick_astley_medley.sql`
4. `database/migrations/004_add_rick_astley_song_data.sql`

OAuthプロバイダーの設定もSupabase Auth設定でGitHubとGoogleを有効化してください。

### アルファ版について
- 現在はアルファ版 (v0.1.0-alpha.1) です
- 予期しないエラーや不安定な動作が起こる可能性があります
- フィードバックは [GitHub Issues](https://github.com/anthropics/claude-code/issues) で受け付けています

## 貢献

バグ報告や機能要望については、GitHubのIssuesを利用してください。プルリクエストも歓迎します。

## サポート

プロジェクトに関する質問や問題については、[CLAUDE.md](./CLAUDE.md) のガイドラインを参照してください。