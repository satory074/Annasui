# Anasui アーキテクチャ設計

このドキュメントではAnasui（ニコニコプレイヤー）の技術的アーキテクチャと設計思想について解説します。

## 技術スタック

- **フロントエンド**
  - Next.js 15.2.1 - Reactフレームワーク
  - React 19.0.0 - UIライブラリ
  - TypeScript - 型安全な開発
  - TailwindCSS 4 - スタイリング
  - Emotion - CSSinJS
  - Wavesurfer.js 7.9.1 - 音声波形表示
  - Tone.js 15.0.4 - オーディオ処理

- **バックエンド**
  - Express 4.21.2 - サーバーフレームワーク（必要に応じて）
  - CORS - クロスオリジンリクエストの処理

- **開発ツール**
  - ESLint 9 - コード品質保証
  - Next.js ESLint構成

## アプリケーション構造

Anasuiは主に以下のコンポーネントで構成されています：

1. **メインプレイヤーコンポーネント**
   - ニコニコ動画の埋め込みiframeの制御
   - プレイヤーAPI通信処理
   - 再生制御（再生/一時停止、シーク、音量など）

2. **シーンナビゲーション**
   - 動画内のセグメント（シーン）の可視化
   - シーン間のナビゲーション機能

3. **コード進行表示**
   - 音楽コード進行の時間ベースの可視化
   - コードナビゲーション機能

## コンポーネント設計

### プレイヤーコンポーネント

プレイヤーコンポーネントはiframeベースのニコニコ動画プレイヤーをラップし、`postMessage` APIを通じて通信します。以下の機能を実装しています：

- プレイヤーAPI初期化シーケンス
- イベントリスナーとステート管理
- 再生状態の追跡と制御
- UIコントロール（再生/一時停止、シーク、音量など）

```typescript
// プレイヤー制御の中核ロジック
const sendMessageToPlayer = (message: any) => {
  if (playerRef.current?.contentWindow) {
    playerRef.current.contentWindow.postMessage(message, "https://embed.nicovideo.jp");
  }
};

// シーク操作の例
const seekAndPlay = (seekTime: number) => {
  // ...シーク処理ロジック
  const seekMessage = {
    sourceConnectorType: 1,
    playerId: "1",
    eventName: "seek",
    data: {
      time: seekTime,
      _frontendId: 6,
      _frontendVersion: 0,
    }
  };
  
  sendMessageToPlayer(seekMessage);
  // ...追加処理
};
```

### データモデル

アプリケーションは次の主要なデータモデルを使用します：

```typescript
// 動画シーンのデータモデル
type Scene = {
  id: number;
  title: string;
  startTime: number; // 秒単位
  endTime: number;   // 秒単位
  color: string;     // スタイリング用
};

// コードプログレッションデータモデル
type ChordSection = {
  id: number;
  chord: string;     // コード名
  startTime: number;
  endTime: number;
  color: string;     // スタイリング用
};
```

## ステート管理

このアプリケーションはReactのuseStateとuseEffectフックを使用して以下のステートを管理します：

- 動画ID（`videoId`）
- 再生状態（`isPlaying`）
- 再生時間（`currentTime`）
- 動画の長さ（`duration`）
- 音量（`volume`）
- フルスクリーン状態（`isFullscreen`）
- 現在のシーン（`currentScene`）
- 現在のコード（`currentChord`）
- ブラウザとDOMの準備状態（`browserReady`, `domReady`）
- iframe読み込み状態（`iframeLoaded`）
- コマンド実行状態（`commandInProgress`）

## ニコニコプレイヤーAPI統合

ニコニコ動画の埋め込みプレイヤーAPIとの通信は`postMessage` APIを使用して実装されています。イベントリスナーはプレイヤーからのメッセージをキャプチャし、アプリケーションの状態を更新します。

主要なイベントタイプ：
- `loadComplete` - プレイヤーロード完了
- `playerMetadataChange` - メタデータ更新
- `seekStatusChange` - シーク状態変更
- `statusChange` - プレイヤー状態変更
- `error` - エラー発生

```typescript
// イベントハンドラの例
const handleMessage = (event: MessageEvent) => {
  if (event.origin !== "https://embed.nicovideo.jp") return;
  
  const data = event.data;
  
  switch (data.eventName) {
    case "loadComplete":
      // プレイヤー読み込み完了処理
      break;
    case "playerMetadataChange":
      // メタデータ変更処理
      break;
    // その他のイベント...
  }
};
```

## パフォーマンス最適化

アプリケーションは以下のパフォーマンス最適化を実装しています：

1. **イベントバッチング** - 高頻度イベントのバッチ処理
2. **条件付きレンダリング** - 必要なコンポーネントのみのレンダリング
3. **メモ化** - 不要な再計算の回避
4. **シーク操作の最適化** - 複雑なシーク操作シーケンスの効率化

## 今後の展望

将来的な拡張として以下の機能の実装が検討されています：

1. **ローカルストレージの活用** - ユーザー設定とシーンデータの保存
2. **カスタムシーン作成** - ユーザーによるシーンアノテーション機能
3. **外部APIとの連携** - 楽曲情報や歌詞の自動同期
4. **複数プレイヤーサポート** - 同時表示による比較機能
5. **プレイリスト機能** - 連続再生と管理
