# Medlean トンマナ（Tone & Manner）ガイド

AI エージェント・開発者向けデザイン言語リファレンス。新しいコンポーネントや UI コピーを作成する際はこのドキュメントを参照すること。

---

## 1. ブランドコンセプト

### プロダクト
**Medlean**（旧称: Anasui）— ニコニコ動画・YouTube のメドレー楽曲にアノテーション情報を付与するマルチプラットフォーム対応 Web アプリケーション。

### ミッション
メドレーをより深く楽しむ。各楽曲の時間情報・詳細情報をインタラクティブなタイムライン上で可視化し、音楽の聴き方を豊かにする。

### ターゲットユーザー
ニコニコ動画のメドレー文化に親しんだ日本語話者。楽曲情報への強い興味・編集参加への意欲を持つ。

### パーソナリティキーワード
**エネルギッシュ・精密・コミュニティ・可視化・楽しさ**

### デザイン原則
1. **明快さ** — 情報の階層が一目でわかる。余計な装飾より機能を優先する
2. **活気** — オレンジ・インディゴ・ミントの鮮やかな配色でエネルギーを表現する
3. **温かみ** — コミュニティが作るプラットフォームとして、硬すぎない親しみやすいトーンを保つ

---

## 2. カラーシステム

### ブランドカラー 3色

| 役割 | 名称 | Hex（Light） | Hex（Dark） | 用途 |
|------|------|-------------|------------|------|
| **プライマリ** | Orange | `#ff8c42` | `#ff9944` | CTA ボタン、アクティブ状態、ブランドアイコン |
| **セカンダリ** | Indigo | `#5b6dee` | `#8a99ff` | アクセント、リンク、非アクティブタブ |
| **アクセント** | Mint | `#00d9a3` | `#00f5b0` | ポジティブ状態、タイムライン中間色 |

### ニュートラル（Light モード）

| 変数 | Hex | 用途 |
|------|-----|------|
| `--background` | `#fffbf7` | ページ背景（ウォームホワイト） |
| `--foreground` | `#1a1a2e` | 本文テキスト |
| `--surface` | `#f9fafb` | カード・パネル背景 |
| `--border` | `#e5e7eb` | 区切り線 |
| `--text-secondary` | `#6b7280` | サブテキスト、プレースホルダー |

### ダークモード対応

| 変数 | Light | Dark (`.dark` / `prefers-color-scheme: dark`) |
|------|-------|-----------------------------------------------|
| `--background` | `#fffbf7` | `#1a1a2e` |
| `--foreground` | `#1a1a2e` | `#f0f0f0` |
| `--surface` | `#f9fafb` | `#1f2937` |
| `--border` | `#e5e7eb` | `#374151` |
| `--text-secondary` | `#6b7280` | `#9ca3af` |

### グラデーション定義

```css
/* 定義済みグラデーション */
--gradient-primary:   linear-gradient(135deg, #ff8c42 0%, #ffa55c 100%)  /* CTA、ヒーロー */
--gradient-secondary: linear-gradient(135deg, #5b6dee 0%, #4c63d2 100%) /* サブアクション */

/* インタラクション用 */
--gradient-hover:   linear-gradient(135deg, #ffa55c 0%, #ffb876 100%)
--gradient-active:  linear-gradient(135deg, #ff7728 0%, #ff8c42 100%)
```

### セマンティックカラー

| 用途 | 名称 | Hex | ブランドカラー対応 | Tailwind |
|------|------|-----|-------------------|----------|
| **Success** | Mint | `#00d9a3` | Mint (Accent) | `text-mint-600`, `bg-[var(--color-success-light)]` |
| **Warning** | Amber | `#f59e0b` | — | `text-amber-600`, `bg-amber-50` |
| **Error** | Red | `#ef4444` | — | `text-red-500`, `bg-red-50` |
| **Info** | Indigo | `#5b6dee` | Indigo (Secondary) | `text-indigo-600`, `bg-indigo-50` |

CSS変数: `--color-success`, `--color-warning`, `--color-error`, `--color-info`（各 `-light` バリアントあり）

### 使用比率ルール（75:20:5）
- **75%** — ニュートラル（白・グレー・背景色）
- **20%** — プライマリ（オレンジ）: ボタン・アイコン・ハイライト
- **5%** — セカンダリ＋アクセント（インディゴ・ミント）: 補助的強調

### 使用禁止色
- **`blue-*`** — デバッグパネル以外で使用禁止。代わりに `indigo-*` を使用

### Tailwind クラス対応

```
orange-600 → #ff8c42  (--color-orange-primary)
orange-700 → #ffa55c  (--color-orange-secondary)
indigo-600 → #5b6dee  (--color-indigo-primary)
mint-600   → #00d9a3  (--color-mint-primary)
```

---

## 3. タイポグラフィ

### フォントファミリー

| 変数 | フォント | 分類 | 用途 |
|------|---------|------|------|
| `--font-display` (`font-display`) | **Fraunces** | Serif / Display | ページタイトル・ヒーロー見出し |
| `--font-ui` (`font-ui`, `font-sans`) | **Onest** | Sans-serif | UI テキスト全般（主要フォント） |
| `--font-accent` (`font-accent`, `font-mono`) | **Space Grotesk** | Geometric Sans | コード・数値・技術的要素 |

### サイズスケール（Tailwind 標準）

| クラス | サイズ | 用途 |
|--------|--------|------|
| `text-xs` | 12px | キャプション、バッジ |
| `text-sm` | 14px | サブテキスト、フォームラベル |
| `text-base` | 16px | 本文（デフォルト） |
| `text-lg` | 18px | セクション内見出し |
| `text-xl` | 20px | カード見出し |
| `text-2xl` | 24px | ページセクション見出し |
| `text-3xl` | 30px | ページタイトル |

### ウェイト使用ルール

- `font-normal` (400) — 本文、サブテキスト
- `font-medium` (500) — ラベル、ボタン、強調テキスト
- `font-semibold` (600) — 見出し、カードタイトル
- `font-bold` (700) — ページタイトル、最重要情報

---

## 4. スペーシング・レイアウト

### 8px グリッドシステム

Tailwind の spacing スケール（1単位 = 4px）を使用。コンポーネント間隔は **8px の倍数**で揃える。

| 値 | px | 用途 |
|----|----|------|
| `p-1` / `gap-1` | 4px | アイコン内パディング |
| `p-2` / `gap-2` | 8px | コンパクトな要素内パディング |
| `p-3` / `gap-3` | 12px | ボタン縦パディング |
| `p-4` / `gap-4` | 16px | カード内パディング（標準） |
| `p-6` / `gap-6` | 24px | カード内パディング（ゆとりあり） |
| `p-8` / `gap-8` | 32px | セクション内パディング |

### カード規則

```
基本カード:
  rounded-xl    (12px 角丸)
  border border-gray-200
  shadow または shadow-sm
  p-4 または p-6

モーダル:
  rounded-2xl   (16px 角丸)
  shadow-xl
  p-6
```

### セクション間隔

- コンポーネント間: `space-y-4` (16px)
- セクション間: `space-y-6` または `space-y-8` (24–32px)
- ページ上下マージン: `py-8` または `py-12`

### レスポンシブブレークポイント

| ブレークポイント | 幅 | 対象 |
|----------------|-----|------|
| デフォルト | < 640px | スマートフォン |
| `sm:` | 640px | 小型タブレット |
| `md:` | 768px | タブレット |
| `lg:` | 1024px | デスクトップ |
| `xl:` | 1280px | ワイドスクリーン |

---

## 5. コンポーネントパターン

### ボタン（`src/components/ui/button.tsx`）

| バリアント | スタイル | 用途 |
|-----------|---------|------|
| `default` | `bg-orange-600 text-white hover:bg-orange-700` | 主要アクション（保存・追加） |
| `destructive` | `bg-red-500 text-white hover:bg-red-600` | 削除・危険な操作 |
| `outline` | `border-gray-300 bg-white text-gray-900 hover:bg-gray-50` | 二次的アクション |
| `secondary` | `bg-gray-100 text-gray-900 hover:bg-gray-200` | 補助アクション |
| `ghost` | `hover:bg-gray-100 text-gray-700` | ツールバー・インラインアクション |
| `link` | `text-orange-600 hover:underline` | テキストリンク |

サイズ: `sm`（h-8）/ `default`（h-9）/ `lg`（h-10）/ `icon`（h-9 w-9）

### カード

```tsx
<div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
  {/* カード内容 */}
</div>
```

### インプット・テキストエリア

**重要**: TailwindCSS 4 の制約により `text-gray-900` を必ず明示的に付与すること。省略するとテキストが不可視になる。

```tsx
<input className="... text-gray-900" />
<textarea className="... text-gray-900" />
```

### モーダル（Radix UI ベース）

```
Dialog.Content: rounded-2xl shadow-xl p-6
Dialog.Title: text-lg font-semibold
Dialog.Description: text-sm text-gray-500
```

### タブ

```
アクティブ: border-b-2 border-indigo-500 text-indigo-600
非アクティブ: text-gray-500 hover:text-gray-700
```

### テーブル

```
ヘッダー行: bg-gray-50 text-xs font-medium text-gray-500 uppercase
データ行: hover:bg-gray-50 border-b border-gray-200
```

---

## 6. アイコノグラフィ

**ライブラリ**: Lucide React（`lucide-react`）

### サイズ規則

| クラス | サイズ | 用途 |
|--------|--------|------|
| `w-3 h-3` | 12px | バッジ内・極小アイコン |
| `w-4 h-4` | 16px | インラインアイコン（ボタン内・デフォルト） |
| `w-5 h-5` | 20px | スタンドアロンアイコン（標準） |
| `w-6 h-6` | 24px | セクション見出し横のアイコン |
| `w-8 h-8` | 32px | 空状態イラスト等の大きなアイコン |

### カラー規則

- テキストに合わせる: `text-gray-500`（サブ）、`text-gray-700`（標準）
- アクティブ状態: `text-orange-600`
- 成功: `text-green-500`
- エラー: `text-red-500`

---

## 7. モーション・アニメーション

### 定義済み keyframes（`globals.css`）

```css
slide-in:  translateX(100%) → translateX(0), opacity 0 → 1  (0.5s ease-out)
slide-out: translateX(0) → translateX(100%), opacity 1 → 0  (0.3s ease-in)
```

Tailwind クラス: `.animate-slide-in` / `.animate-slide-out`（アクティブ楽曲ポップアップ用）

### transition 使用基準

| クラス | 時間 | 用途 |
|--------|------|------|
| `transition-colors duration-150` | 150ms | ホバー色変化（ボタン・リンク） |
| `transition-all duration-200` | 200ms | 展開・折りたたみ、サイズ変化 |
| `transition-all duration-300` | 300ms | モーダル表示、ページ遷移 |

### 原則

- アニメーションは**補助的**。情報を遅らせない
- `prefers-reduced-motion` を尊重する（Radix UI が自動対応）
- ローディングスピナー: `animate-spin`（Lucide `Loader2` アイコン）

---

## 8. ボイス＆トーン（日本語 UI コピー）

### 語調
- **です・ます調**（丁寧体）を基本とする
- 過度に丁寧すぎない。「〜いただく」より「〜する」を優先
- 主語省略優先。「あなた」は使わない

### UI コピーパターン

#### ボタンラベル
動詞 + オブジェクト の順で簡潔に。

```
◯ 楽曲を追加   ◯ 保存する   ◯ 削除   ◯ キャンセル
✕ 楽曲追加ボタン   ✕ セーブ
```

#### エラーメッセージ
原因 + 解決策 の構造。ユーザーを責めない。

```
◯ ネットワークエラーが発生しました。接続を確認して再試行してください。
◯ パスワードが正しくありません。
✕ 無効な入力です。
```

#### 空状態（Empty State）
行動を促す。ポジティブに。

```
◯ まだ楽曲が登録されていません。「楽曲を追加」から始めましょう。
◯ 検索結果が見つかりませんでした。別のキーワードをお試しください。
```

#### ローディング
進行形で。簡潔に。

```
◯ 読み込み中...   ◯ 保存しています...   ◯ 検索中...
✕ データを読み込んでいます。しばらくお待ちください。
```

#### 確認ダイアログ
何が起きるかを明示。取り消せない操作では警告を入れる。

```
タイトル: 楽曲を削除しますか？
本文: この操作は取り消せません。
ボタン: 削除する / キャンセル
```

#### 成功メッセージ（Toast）
短く、何が完了したかを示す。

```
◯ 保存しました
◯ 楽曲を追加しました
✕ 操作が正常に完了しました
```

---

## 9. アクセシビリティ基準

### カラーコントラスト
- **WCAG AA 準拠**: テキストと背景の比率 **4.5:1 以上**（通常テキスト）
- 大きなテキスト（18px 以上 / bold 14px 以上）: **3:1 以上**

主要な組み合わせチェック:
| テキスト | 背景 | コントラスト比 |
|---------|------|--------------|
| `#ffffff` (white) | `#ff8c42` (orange-600) | 約 3.1:1（大きめフォント推奨） |
| `#1a1a2e` (foreground) | `#fffbf7` (background) | 約 16:1 ✓ |
| `#374151` (gray-700) | `#ffffff` | 約 10.7:1 ✓ |

### フォーカス状態
- すべてのインタラクティブ要素に可視フォーカスを必ず付ける
- `focus-visible:ring-1 focus-visible:ring-ring`（button.tsx の基本スタイル。`--color-ring` = `#ff8c42`）
- カスタム input/textarea: `focus:ring-2 focus:ring-orange-500`
- `outline-none` 単独での使用は禁止。必ず代替フォーカス表示を追加する

### Orange コントラストに関する注意
- `#ff8c42` の白背景上コントラスト比は **3.1:1**（WCAG AA 不合格）
- ボタンでは `font-medium` + 大きめサイズで許容されるが、**テキスト用途**には `#e07030`（`--color-orange-dark`、4.1:1）を使用すること

### セマンティクス
- Radix UI コンポーネントは ARIA 属性を自動付与 — カスタム上書きは慎重に
- アイコンのみのボタン: `aria-label` を必ず付与する
- モーダル: `Dialog.Title` を必ず含める

---

## 10. CLAUDE.md との連携

このドキュメントは `CLAUDE.md` のデザイン実装セクションを補完する。コンポーネント実装時の制約（TailwindCSS 4 の `text-gray-900` 必須、Radix UI の使用方針等）は `CLAUDE.md` の「Critical Constraints」セクションも参照すること。

デザイントークン（CSS 変数）の最新定義は常に `src/app/globals.css` が正とする。このドキュメントと差異がある場合は `globals.css` を優先し、本ドキュメントを更新する。
