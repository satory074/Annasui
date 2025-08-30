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
- **データベース**: Supabase (オプション、静的データにフォールバック)
- **デプロイ**: Netlify (静的エクスポート)
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
├── data/               # 静的データファイル
├── hooks/              # カスタムReactフック
├── lib/                # ユーティリティ・API
└── types/              # TypeScript型定義
```

## デプロイ

### Netlifyへのデプロイ

```bash
# プロダクションビルド
npm run build

# Netlifyにデプロイ
npx netlify deploy --prod
```

現在のプロダクション環境: https://illustrious-figolla-20f57e.netlify.app

## ドキュメント

詳細なドキュメントは [docs/](./docs/) ディレクトリを参照してください：

- [アーキテクチャ設計](./docs/architecture.md)
- [API統合](./docs/api-integration.md)
- [要件仕様](./docs/requirements.md)
- [コントリビューションガイド](./docs/contributing.md)

## ライセンス

このプロジェクトはプライベートプロジェクトです。

## 貢献

バグ報告や機能要望については、GitHubのIssuesを利用してください。プルリクエストも歓迎します。

## サポート

プロジェクトに関する質問や問題については、[CLAUDE.md](./CLAUDE.md) のガイドラインを参照してください。