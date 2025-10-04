# Medleanプロジェクト オンボーディングチェックリスト

エンジニアリングマネージャー向け4週間のオンボーディング計画とチェックリスト

## 📋 概要

このチェックリストは、プログラミング初心者のエンジニアリングマネージャーがMedleanプロジェクトを完全に理解するための段階的な学習計画です。各項目をチェックしながら進めることで、プロジェクトの技術的な詳細を体系的に学習できます。

**進行方法:**
- 各チェックボックス `[ ]` を完了したら `[x]` に変更
- 理解度チェックの質問に答えられるか確認
- 困った時は参考リンクを確認
- 週末に進捗を振り返り、理解度を確認

---

## 🗓️ 第1週: プロジェクト基盤の理解

### Day 1-2: 開発環境セットアップと基本動作確認

#### 環境準備
- [ ] Node.js 18.0.0以上がインストールされている
  ```bash
  node --version  # v18.0.0以上を確認
  ```
- [ ] npmが正常に動作する
  ```bash
  npm --version
  ```
- [ ] Gitが設定されている
  ```bash
  git --version
  git config --global user.name  # 設定確認
  git config --global user.email
  ```
- [ ] Visual Studio Code (推奨)またはお好みのIDEが設定済み

#### プロジェクトセットアップ
- [ ] プロジェクトディレクトリに移動
  ```bash
  cd /Users/satory074/Basecamp/src/Anasui
  ```
- [ ] 依存関係のインストールが完了
  ```bash
  npm install
  ```
- [ ] 環境変数ファイル `.env.local` が存在する
- [ ] 開発サーバーが正常に起動する
  ```bash
  npm run dev
  ```
- [ ] ローカル環境 http://localhost:3000 でアプリが表示される

#### 基本動作確認
- [ ] ホームページが正常に表示される
- [ ] ニコニコ動画プレイヤーページにアクセスできる
  ```
  http://localhost:3000/niconico/sm500873
  ```
- [ ] YouTube動画プレイヤーページにアクセスできる
  ```
  http://localhost:3000/youtube/dQw4w9WgXcQ
  ```
- [ ] レスポンシブデザインが動作する（ブラウザサイズを変更）

#### 本番環境確認
- [ ] 本番環境 https://anasui-e6f49.web.app にアクセスできる
- [ ] 本番環境で基本機能が動作する
- [ ] 本番とローカルの違いを確認

**理解度チェック:**
- プロジェクトはどのポート番号で起動しますか？
- 本番環境のURLは何ですか？
- 開発サーバーの起動コマンドは何ですか？

### Day 3-4: 技術スタックの理解

#### Next.js App Router
- [ ] `src/app/` ディレクトリの構造を理解
- [ ] `layout.tsx` の役割を理解
- [ ] `page.tsx` の役割を理解
- [ ] `[videoId]` 動的ルーティングを理解
- [ ] API Routes (`src/app/api/`) の構造を確認

#### React 19.0.0
- [ ] コンポーネントの基本構造を理解
- [ ] useState, useEffect, useCallbackフックを確認
- [ ] `"use client"` ディレクティブの意味を理解
- [ ] カスタムフック（`src/hooks/`）の存在を確認

#### TypeScript
- [ ] `src/types/index.ts` の型定義を確認
- [ ] `SongSection` インターフェースを理解
- [ ] `MedleyData` インターフェースを理解
- [ ] プロジェクト内の主要な型定義を把握

#### TailwindCSS 4
- [ ] `tailwind.config.js` の設定を確認
- [ ] 既存コンポーネントのスタイリングを観察
- [ ] レスポンシブクラス（`md:`, `lg:`）の使用を確認
- [ ] カスタムカラーの定義を確認

**理解度チェック:**
- Next.js App Routerでページを作成するには何が必要ですか？
- TypeScriptの型定義ファイルはどこにありますか？
- "use client"はなぜ必要ですか？

### Day 5: プロジェクト構造の把握

#### ディレクトリ構造の理解
- [ ] `src/app/` - ルーティングとページ
- [ ] `src/components/` - UIコンポーネント
  - [ ] `features/` - 機能別コンポーネント
  - [ ] `pages/` - ページレベルコンポーネント
  - [ ] `ui/` - 再利用可能なUIコンポーネント
  - [ ] `layout/` - レイアウトコンポーネント
- [ ] `src/hooks/` - カスタムReactフック
- [ ] `src/lib/` - ユーティリティとAPI
- [ ] `src/contexts/` - React Context
- [ ] `src/types/` - TypeScript型定義

#### 主要ファイルの把握
- [ ] `src/components/pages/MedleyPlayer.tsx` - メインプレイヤー
- [ ] `src/hooks/useMedleyEdit.ts` - 編集機能
- [ ] `src/hooks/useNicoPlayer.ts` - ニコニコプレイヤー制御
- [ ] `src/contexts/AuthContext.tsx` - 認証管理
- [ ] `src/lib/supabase.ts` - データベース接続

#### 設定ファイルの理解
- [ ] `package.json` - 依存関係とスクリプト
- [ ] `next.config.ts` - Next.js設定
- [ ] `tsconfig.json` - TypeScript設定
- [ ] `tailwind.config.js` - TailwindCSS設定
- [ ] `firebase.json` - Firebase設定

**理解度チェック:**
- メインのプレイヤーコンポーネントはどのファイルですか？
- 認証関連のコードはどこにありますか？
- カスタムフックはどのディレクトリにありますか？

---

## 🗓️ 第2週: コア機能の理解

### Day 6-7: 認証・認可システム

#### Supabase認証の理解
- [ ] `src/lib/supabase.ts` のクライアント設定を理解
- [ ] 環境変数（SUPABASE_URL, SUPABASE_ANON_KEY）の役割を理解
- [ ] OAuth（Google）の設定を確認

#### AuthContext の理解
- [ ] `src/contexts/AuthContext.tsx` を詳しく読む
- [ ] `useAuth` フックの使用方法を理解
- [ ] 認証状態の管理方法を理解
- [ ] セッション管理の仕組みを理解

#### 管理者承認システム
- [ ] `isApproved` の仕組みを理解
- [ ] `approved_users` テーブルの役割を理解
- [ ] 権限レベルの違いを理解:
  - `anonymous` - 読み取り専用
  - `authenticated` - ログイン済み、編集不可
  - `approved` - 完全なCRUD権限
  - `admin` - ユーザー管理権限

#### 認証コンポーネント
- [ ] `src/components/features/auth/AuthModal.tsx` を確認
- [ ] `src/components/features/auth/UserProfileDropdown.tsx` を確認
- [ ] `src/components/ui/AuthorizationBanner.tsx` を確認

**理解度チェック:**
- なぜ認証と認可が分離されているのですか？
- 新規ユーザーが編集するには何が必要ですか？
- 管理者はどのページで承認作業を行いますか？

### Day 8-9: メドレー再生機能

#### MedleyPlayer コンポーネント
- [ ] `src/components/pages/MedleyPlayer.tsx` の全体構造を理解
- [ ] プロップスの型定義を確認
- [ ] 状態管理（useState）を理解
- [ ] プレイヤーコンテナの参照（useRef）を理解

#### ニコニコプレイヤー統合
- [ ] `src/hooks/useNicoPlayer.ts` を詳しく読む
- [ ] postMessage API の使用方法を理解
- [ ] iframe との通信方法を理解
- [ ] プレイヤーの状態管理を理解
- [ ] シーク機能の実装を確認

#### YouTubeプレイヤー統合
- [ ] `src/components/features/player/YouTubePlayer.tsx` を確認
- [ ] YouTube embed の仕組みを理解
- [ ] プレイヤー API の違いを理解

#### タイムライン表示
- [ ] `src/components/features/medley/SongListGrouped.tsx` を確認
- [ ] 楽曲セクションの表示方法を理解
- [ ] タイムライン上での楽曲の配置を理解

**理解度チェック:**
- ニコニコプレイヤーとの通信はどの技術を使っていますか？
- プレイヤーの現在時刻はどのように取得していますか？
- タイムラインで楽曲をクリックするとどうなりますか？

### Day 10: タイムライン編集機能

#### useMedleyEdit フック
- [ ] `src/hooks/useMedleyEdit.ts` を詳しく読む
- [ ] 編集状態の管理を理解
- [ ] 楽曲の追加・更新・削除機能を理解
- [ ] バッチ更新機能を理解

#### 自動保存システム
- [ ] 2秒デバウンスの仕組みを理解
- [ ] 自動保存のトリガー条件を理解
- [ ] 保存失敗時の処理を理解
- [ ] バリデーションロジックを確認

#### Undo/Redo機能
- [ ] 履歴管理の実装を理解
- [ ] 最大履歴数（50）の制限を確認
- [ ] キーボードショートカット（Ctrl+Z/Y）を確認

#### 編集モーダル
- [ ] `src/components/features/medley/SongEditModal.tsx` を確認
- [ ] 楽曲情報の編集フォームを理解
- [ ] バリデーション機能を確認

**理解度チェック:**
- 自動保存はいつ実行されますか？
- Undo/Redoの履歴は何件まで保存されますか？
- 楽曲の編集にはどのような権限が必要ですか？

---

## 🗓️ 第3週: データフローとAPI理解

### Day 11-12: データベース構造

#### Supabaseテーブル構造
- [ ] `database/migrations/` ディレクトリの確認
- [ ] `users` テーブルの構造を理解
  - id (UUID)
  - email
  - name
  - avatar_url
  - created_at, updated_at
- [ ] `medleys` テーブルの構造を理解
  - id (UUID)
  - video_id (文字列)
  - title, creator
  - duration (秒)
  - user_id (外部キー)
- [ ] `songs` テーブルの構造を理解
  - id (UUID)
  - medley_id (外部キー)
  - title, artist
  - start_time, end_time (秒)
  - color, genre
  - order_index
- [ ] `approved_users` テーブルの構造を理解

#### マイグレーションファイル
- [ ] `001_create_users_table.sql` を確認
- [ ] `002_add_user_id_to_medleys.sql` を確認
- [ ] `005_create_approved_users_table.sql` を確認
- [ ] `007_setup_admin_user.sql` を確認
- [ ] マイグレーションの実行順序を理解

#### Row Level Security (RLS)
- [ ] RLS ポリシーの概念を理解
- [ ] 読み取り権限のポリシーを確認
- [ ] 編集権限のポリシーを確認
- [ ] 管理者権限のポリシーを確認

**理解度チェック:**
- メドレーと楽曲はどのような関係ですか？
- 新規ユーザーはなぜすぐに編集できないのですか？
- RLSは何のために使われていますか？

### Day 13-14: API統合

#### プロキシAPIの必要性
- [ ] CORS（Cross-Origin Resource Sharing）の問題を理解
- [ ] なぜプロキシAPIが必要なのかを理解
- [ ] サーバーサイドでの API コールの利点を理解

#### ニコニコAPI統合
- [ ] `src/app/api/thumbnail/niconico/[videoId]/route.ts` を確認
- [ ] `src/app/api/metadata/niconico/[videoId]/route.ts` を確認
- [ ] User-Agent ヘッダーの必要性を理解
- [ ] XMLレスポンスの解析方法を理解

#### Firebase Hosting設定
- [ ] `next.config.ts` の `trailingSlash: true` 設定を理解
- [ ] Firebase Hosting が自動的にスラッシュを追加する問題を理解
- [ ] APIのURL形式（末尾スラッシュ必須）を理解
- [ ] リダイレクトループの回避方法を理解

#### メドレーデータAPI
- [ ] `src/lib/api/medleys.ts` を確認
- [ ] `createMedley` 関数を理解
- [ ] `updateMedley` 関数を理解
- [ ] エラーハンドリングを確認

**理解度チェック:**
- なぜニコニコのサムネイルを直接取得できないのですか？
- trailingSlash設定はなぜ必要ですか？
- APIエラーはどのように処理されますか？

### Day 15: リアルタイム更新

#### ActiveSongPopup
- [ ] `src/components/ui/song/ActiveSongPopup.tsx` を確認
- [ ] 現在再生中の楽曲表示機能を理解
- [ ] ポップアップの位置計算を理解
- [ ] 衝突回避機能を理解

#### usePlayerPosition フック
- [ ] `src/hooks/usePlayerPosition.ts` を確認
- [ ] プレイヤー位置の追跡方法を理解
- [ ] 116pxのポップアップ表示ゾーンを理解
- [ ] 衝突検知アルゴリズムを理解

#### useMousePosition フック
- [ ] `src/hooks/useMousePosition.ts` を確認
- [ ] マウス位置の追跡を理解
- [ ] リアルタイム更新の仕組みを理解

#### キーボードショートカット
- [ ] Space キー（再生/一時停止）を確認
- [ ] S キー（開始時刻設定）を確認
- [ ] E キー（終了時刻設定）を確認
- [ ] M キー（楽曲追加）を確認
- [ ] 編集モード時のみ有効な制御を確認

**理解度チェック:**
- 現在の楽曲はどのように特定されますか？
- ActiveSongPopupの位置はどのように決まりますか？
- キーボードショートカットが無効になるのはどんな時ですか？

---

## 🗓️ 第4週: 運用とベストプラクティス

### Day 16-17: デプロイメント理解

#### Firebase App Hosting
- [ ] Firebase プロジェクトの設定を確認
- [ ] `firebase.json` の設定を理解
- [ ] ホスティング設定を理解
- [ ] リライトルールを理解

#### デプロイプロセス
- [ ] ビルドコマンドを実行
  ```bash
  npm run build
  ```
- [ ] TypeScriptチェックを実行
  ```bash
  npx tsc --noEmit
  ```
- [ ] Lintチェックを実行
  ```bash
  npm run lint
  ```
- [ ] デプロイコマンドを理解（実行は不要）
  ```bash
  firebase deploy --only hosting
  ```

#### 環境変数管理
- [ ] 開発環境（`.env.local`）の設定を理解
- [ ] 本番環境（Firebase Console）の設定を理解
- [ ] 環境変数のセキュリティを理解
- [ ] NEXT_PUBLIC_ プレフィックスの意味を理解

#### SSR (Server-Side Rendering)
- [ ] Next.js の SSR 機能を理解
- [ ] Firebase での SSR 対応を理解
- [ ] 静的ファイルとの違いを理解

**理解度チェック:**
- デプロイ前に実行すべきコマンドは何ですか？
- 本番環境とローカル環境の主な違いは何ですか？
- NEXT_PUBLIC_ プレフィックスはなぜ必要ですか？

### Day 18-19: トラブルシューティング

#### よくある問題の理解
- [ ] `docs/TROUBLESHOOTING.md` を詳しく読む
- [ ] プレイヤー問題（シーク失敗、iframe非応答）を理解
- [ ] 認証問題（OAuthループ、編集ボタンなし）を理解
- [ ] API問題（CORS エラー、サムネイル未表示）を理解
- [ ] タイムライン問題（自動保存失敗、Undo/Redo）を理解
- [ ] 本番環境問題（コンポーネント欠如、ビルド失敗）を理解

#### デバッグツールの使用
- [ ] ブラウザの開発者ツールを活用
- [ ] `logger.debug/info/warn/error` の使用方法を理解
- [ ] ネットワークタブでAPI通信を確認
- [ ] コンソールタブでエラーを確認

#### ログ分析
- [ ] `src/lib/utils/logger.ts` の実装を確認
- [ ] ログレベルの設定を理解
- [ ] 本番環境でのログ出力を理解

**理解度チェック:**
- プレイヤーが応答しない時の確認項目は？
- CORS エラーが発生する原因は？
- デバッグ情報はどこで確認できますか？

### Day 20: 管理者機能

#### 管理者ページ
- [ ] `/admin` ページにアクセス（ローカル）
- [ ] `src/components/pages/AdminPage.tsx` を確認
- [ ] ユーザー一覧表示機能を理解
- [ ] 承認/取り消し機能を理解

#### ユーザー管理
- [ ] 承認待ちユーザーの確認方法を理解
- [ ] 承認プロセスの理解
- [ ] 権限取り消しの理解
- [ ] 管理者権限の委譲方法を理解

#### メドレーデータ管理
- [ ] メドレー作成の流れを理解
- [ ] 楽曲データの品質管理を理解
- [ ] 重複データの処理を理解
- [ ] データのバックアップ方法を理解

#### セキュリティ考慮事項
- [ ] Row Level Security の重要性を理解
- [ ] 権限エスカレーションの防止を理解
- [ ] セキュリティログの確認を理解

**理解度チェック:**
- 新規ユーザーを承認するにはどうしますか？
- 管理者権限を持つユーザーを確認するには？
- セキュリティ上の懸念事項は何ですか？

---

## 📊 完了チェック

### 各週の理解度確認

#### 第1週完了チェック (20/20項目完了)
- [ ] 開発環境が完全にセットアップされている
- [ ] ローカルでアプリケーションが起動できる
- [ ] 本番環境にアクセスできる
- [ ] 基本的なファイル構造を理解している
- [ ] 主要な技術スタックを把握している

#### 第2週完了チェック (25/25項目完了)
- [ ] 認証・認可システムを理解している
- [ ] プレイヤーの動作原理を理解している
- [ ] タイムライン編集機能を理解している
- [ ] 自動保存とUndo/Redo機能を理解している
- [ ] コア機能のコードを読める

#### 第3週完了チェック (20/20項目完了)
- [ ] データベース構造を完全に理解している
- [ ] API統合とプロキシの必要性を理解している
- [ ] リアルタイム更新の仕組みを理解している
- [ ] Firebase設定の重要性を理解している
- [ ] データフローを説明できる

#### 第4週完了チェック (15/15項目完了)
- [ ] デプロイプロセスを理解している
- [ ] トラブルシューティング方法を把握している
- [ ] 管理者機能を操作できる
- [ ] セキュリティ考慮事項を理解している
- [ ] プロジェクト全体を管理できる

### 最終理解度テスト

**技術アーキテクチャ:**
- [ ] Next.js App Routerの利点を説明できる
- [ ] React 19の新機能を理解している
- [ ] TypeScriptの型安全性の利点を説明できる
- [ ] Supabaseの役割を明確に説明できる

**機能要件:**
- [ ] メドレーアノテーションの目的を説明できる
- [ ] マルチプラットフォーム対応の仕組みを理解している
- [ ] 認証と認可の分離の理由を説明できる
- [ ] リアルタイム編集機能の価値を理解している

**運用・保守:**
- [ ] デプロイプロセスを実行できる
- [ ] 一般的な問題を解決できる
- [ ] 新機能開発の影響範囲を評価できる
- [ ] チームメンバーに技術説明できる

## 🎯 総合評価

**合格基準: 全80項目の完了**

- **優秀** (75-80項目): プロジェクトリーダーとして十分な理解
- **良好** (65-74項目): 基本的な管理業務に対応可能
- **合格** (55-64項目): 追加学習が必要だが基礎は理解
- **要再学習** (55項目未満): 基礎から学習し直しが必要

## 📚 継続学習の推奨

オンボーディング完了後の継続学習項目：
- [ ] Next.js の最新機能追跡
- [ ] React のパフォーマンス最適化
- [ ] Supabase の高度な機能
- [ ] Firebase の他サービス連携
- [ ] Web アクセシビリティ対応
- [ ] SEO 最適化手法
- [ ] セキュリティベストプラクティス

---

**記録用:**
- 開始日: _____
- 完了日: _____
- 完了項目数: ___/80
- 理解度レベル: _____