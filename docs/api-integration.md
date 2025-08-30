# ニコニコ動画API統合ガイド

このドキュメントでは、Medleanがニコニコ動画の埋め込みプレイヤーAPIとどのように統合しているかを詳細に解説します。

## 概要

ニコニコ動画は埋め込みプレイヤー用のJavaScript APIを提供しており、iframe経由でプレイヤーを制御することができます。Medleanはこのプレイヤーをカスタムコントロールで拡張し、高度なメドレーアノテーション機能を提供しています。

## 埋め込みプレイヤーの初期化

### 基本的な埋め込みURL構造

ニコニコ動画プレイヤーを埋め込むためのURLは以下の構造になっています：

```
https://embed.nicovideo.jp/watch/{videoId}?jsapi=1&playerId=1&_frontendId=6&_frontendVersion=0&noRelatedVideo=1
```

パラメータの説明：
- `videoId`: 再生する動画のID（例: sm9）
- `jsapi=1`: JavaScript APIを有効化
- `playerId=1`: このプレイヤーの識別子
- `_frontendId=6&_frontendVersion=0`: フロントエンドの識別情報
- `noRelatedVideo=1`: 関連動画の非表示

### iframe要素の実装

```typescript
<iframe
  ref={playerRef}
  src={getEmbedUrl()}
  width="100%"
  height="100%"
  allowFullScreen
  allow="autoplay; fullscreen"
  frameBorder="0"
  className="w-full h-full"
  onLoad={handleIframeLoad}
></iframe>
```

### 初期化シーケンス

プレイヤーが読み込まれると、以下の初期化シーケンスが実行されます：

```typescript
// iframeの読み込み完了時の処理
const handleIframeLoad = () => {
  console.log("Player iframe loaded");
  setIframeLoaded(true);

  if (playerRef.current) {
    // 初期化メッセージシーケンス
    const initMessages = [
      {
        sourceConnectorType: 1,
        playerId: "1",
        eventName: "registerCallback",
        data: {
          _frontendId: 6,
          _frontendVersion: 0,
        },
      },
      {
        sourceConnectorType: 1,
        playerId: "1",
        eventName: "setFrontendId",
        data: { frontendId: "6", version: "0" },
      },
      {
        sourceConnectorType: 1,
        playerId: "1",
        eventName: "getStatus",
        data: {
          _frontendId: 6,
          _frontendVersion: 0,
        },
      },
    ];

    // 順次送信
    initMessages.forEach((msg, index) => {
      setTimeout(() => {
        playerRef.current?.contentWindow?.postMessage(msg, "https://embed.nicovideo.jp");
      }, index * 500);
    });
  }
};
```

## メッセージング（postMessage API）

ニコニコプレイヤーとの通信には`window.postMessage` APIを使用します。

### メッセージ送信関数

プレイヤーへのメッセージは以下の関数で送信します：

```typescript
function sendMessageToPlayer(message: any) {
  if (playerRef.current?.contentWindow) {
    playerRef.current.contentWindow.postMessage(message, "https://embed.nicovideo.jp");
    console.log("COMMAND TO PLAYER:", message);
  }
}
```

### イベントリスニング

プレイヤーからのメッセージは以下のようにリスンします：

```typescript
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== "https://embed.nicovideo.jp") return;
    
    try {
      const data = event.data;
      
      if (data && data.eventName) {
        switch (data.eventName) {
          case "loadComplete":
            // 処理...
            break;
          case "playerMetadataChange":
            // 処理...
            break;
          // その他のイベント...
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, []);
```

## サポートされているAPI操作

### 再生制御

```typescript
// 再生
const playMessage = {
  sourceConnectorType: 1,
  playerId: "1",
  eventName: "play"
};

// 一時停止
const pauseMessage = {
  sourceConnectorType: 1,
  playerId: "1",
  eventName: "pause"
};
```

### シーク操作

```typescript
const seekMessage = {
  sourceConnectorType: 1,
  playerId: "1",
  eventName: "seek",
  data: {
    time: seekTime, // 秒単位
    _frontendId: 6,
    _frontendVersion: 0
  }
};
```

### 音量制御

```typescript
const volumeMessage = {
  sourceConnectorType: 1,
  playerId: "1",
  eventName: "volumeChange",
  data: {
    volume: newVolume / 100 // 0-1の範囲
  }
};
```

### フルスクリーン切り替え

```typescript
const fullscreenMessage = {
  sourceConnectorType: 1,
  playerId: "1",
  eventName: "fullscreenChange"
};
```

### 状態取得

```typescript
const getStatusMessage = {
  sourceConnectorType: 1,
  playerId: "1",
  eventName: "getStatus"
};
```

## イベントタイプ

プレイヤーから受信する主なイベントタイプ：

| イベント名 | 説明 | 主なデータプロパティ |
|------------|------|----------------------|
| `loadComplete` | プレイヤーのロード完了 | `videoInfo.lengthInSeconds` |
| `playerMetadataChange` | メタデータ更新 | `currentTime` |
| `seekStatusChange` | シーク状態の変更 | `seekStatus` |
| `statusChange` | プレイヤー状態の変更 | `playerStatus`, `seekStatus` |
| `error` | エラー発生 | `errorCode`, `message` |

### 状態コード

#### playerStatus
- 0: 未初期化
- 1: 準備完了
- 2: 再生中
- 3: 一時停止中
- 4: 終了

#### seekStatus
- 0: シーク完了
- 1: シーク中

## 複雑なシーケンス例：シーク操作

シーク操作は複数のステップを必要とする複雑な操作です。以下はMedleanが実装している最適化されたシーク関数です：

```typescript
const seekAndPlay = (seekTime: number) => {
  if (!playerRef.current?.contentWindow || commandInProgress) {
    console.log("Cannot seek: player not ready or command in progress");
    return;
  }

  // コマンド処理中フラグを設定
  setCommandInProgress(true);

  // UIを即時に更新
  setCurrentTime(seekTime);

  const executeSeek = async () => {
    try {
      // ステップ1: 一時停止（必要な場合）
      if (isPlaying) {
        const pauseMessage = {
          sourceConnectorType: 1,
          playerId: "1",
          eventName: "pause",
        };

        sendMessageToPlayer(pauseMessage);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      // ステップ2: シーク実行
      const seekMessage = {
        sourceConnectorType: 1,
        playerId: "1",
        eventName: "seek",
        data: {
          time: seekTime,
          _frontendId: 6,
          _frontendVersion: 0,
        },
      };

      sendMessageToPlayer(seekMessage);

      // シーク完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ステップ3: 再生状態の復元
      if (isPlaying) {
        const playMessage = {
          sourceConnectorType: 1,
          playerId: "1",
          eventName: "play",
        };

        sendMessageToPlayer(playMessage);
      }

      // 処理完了
      setTimeout(() => {
        setCommandInProgress(false);
      }, 500);
    } catch (e) {
      console.error("Error during seek operation:", e);
      setCommandInProgress(false);
    }
  };

  executeSeek();
};
```

## トラブルシューティング

### よくある問題

1. **イベントが受信されない**
   - オリジンが `https://embed.nicovideo.jp` であることを確認
   - `jsapi=1` パラメータが設定されていることを確認

2. **シーク操作が機能しない**
   - シーク前にプレイヤーが完全に初期化されていることを確認
   - 適切な遅延を入れてコマンドが確実に処理されるようにする

3. **メタデータの更新が不規則**
   - playerMetadataChange イベントの受信頻度は一定でない場合がある
   - タイマーを併用して補完するとよい

### デバッグツール

Medleanには開発用のデバッグツールが含まれています：

```javascript
// コンソールデバッグ用
// イベント履歴のロギング
let eventTimeline = [];
window.addEventListener("message", function (event) {
  if (event.origin === "https://embed.nicovideo.jp") {
    eventTimeline.push({
      time: Date.now(),
      event: event.data.eventName,
      data: event.data,
    });

    // 過去10秒間のイベント履歴を表示
    console.log(
      "RECENT EVENTS:",
      eventTimeline
        .filter((e) => Date.now() - e.time < 10000)
        .map((e) => ({
          timeAgo: Date.now() - e.time + "ms",
          event: e.event,
          details: e.data,
        }))
    );
  }
});

// イベントタイプの統計
let eventTypes = {};
window.addEventListener("message", function (event) {
  if (event.origin === "https://embed.nicovideo.jp" && event.data && event.data.eventName) {
    if (!eventTypes[event.data.eventName]) {
      eventTypes[event.data.eventName] = {
        count: 0,
        examples: [],
      };
    }

    eventTypes[event.data.eventName].count++;
    if (eventTypes[event.data.eventName].examples.length < 3) {
      eventTypes[event.data.eventName].examples.push(event.data);
    }

    console.log(
      "EVENT STATISTICS:",
      Object.keys(eventTypes).map((type) => ({
        type,
        count: eventTypes[type].count,
        examples: eventTypes[type].examples,
      }))
    );
  }
});
```

## 制限事項

1. **クロスオリジン制限**  
   プレイヤーとの通信は同一オリジンポリシーの制限を受けるため、`postMessage` APIのみが使用可能です。

2. **非公式API**  
   このAPIは公式にドキュメント化されていないため、将来的に変更される可能性があります。

3. **イベントの遅延**  
   イベント処理に遅延が生じる場合があるため、UIの即時更新と組み合わせて使用することが推奨されます。

4. **同期の問題**  
   プレイヤーの状態取得が常に最新とは限らないため、適切なエラーハンドリングが必要です。

## 参考リンク

- [ニコニコ動画 埋め込みプレイヤー公式情報](https://site.nicovideo.jp/doga-support/about/common/player/embed.html)
- [iframe API一般情報](https://developer.mozilla.org/ja/docs/Web/API/Window/postMessage)
