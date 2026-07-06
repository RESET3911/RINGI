# 稟議 — ふたりの決裁 (RINGI)

カップル2人で使う購入申請・決裁Webアプリ。
「和紙 × 墨 × 朱印」の稟議書デザインで、決裁は**ハンコを押す**体験になっています。

## 機能

- 📝 **7タイプの申請** — 購入 / 外食 / 旅行 / 贈り物 / 投資 / 予定 / 家計ルール変更
- 🖋 **5択決裁** — 承認・条件付き・保留・要相談・否決（押印アニメーション付き）
- 🔖 条件付き承認テンプレート（価格上限・来月ならOK 等）→ 条件を反映して再申請
- 📦 購入後レビュー（満足度・使用頻度・また買うか）と統計
- 📋 履歴（月別グルーピング・検索・ステータス/タイプフィルタ）
- 💰 **CASHFLOW連携** — 月次余剰・貯蓄予測の表示、承認時に経費/変動費として自動記帳
- ⚠️ 余剰資金アラート（警戒/危険ライン設定可）
- 🔔 ntfyプッシュ通知 + ST APPS HUB通知（notificationsコレクション）
- 👤 ユーザー選択は端末に記憶（ヘッダーからワンタップ切替）

## 技術スタック

- React 18 + TypeScript + Vite + Tailwind CSS
- Firebase Firestore（`ringi/settings`・`applications`・`notifications`・`cashflow_*`）
- フォント: Shippori Mincho（見出し）+ Zen Kaku Gothic New（本文）

## 開発

```bash
npm install
npm run dev     # http://localhost:5173/RINGI/
npm run build
```

## デプロイ

`main` にpushすると GitHub Actions（`.github/workflows/deploy.yml`）が
GitHub Pages（`/RINGI/`）へ自動デプロイします。

## ディレクトリ構成

```
src/
├── App.tsx            # タブナビ・状態管理・ユーザーゲート
├── types.ts           # ドメイン型 + ステータス/申請タイプ定義
├── firebase.ts
├── lib/               # store / notify / cashflow / alert / format
├── screens/           # Home / Apply / Decide / History / Settings
└── components/
    ├── ui/            # Stamp(丸印) / Seal(角印) / Medallion / Sheet / Toast など
    ├── CashflowPanel.tsx
    └── ReviewSheet.tsx
```
