# 💑 カップル稟議システム

カップル2人で使う購入申請・決裁Webアプリです。

## 機能
- 📝 購入申請（品目・金額・理由）
- 🔖 相手の申請を承認/否決
- 📋 申請履歴・月別サマリー
- ⚙️ 名前・収支・アラート設定
- 💰 余剰資金アラート（警戒/危険）
- 📧 メール通知（mailto:リンク）

## セットアップ

```bash
npm install
npm run dev
```

## GitHub Pages デプロイ

1. `vite.config.ts` の `base` をリポジトリ名に合わせて変更
   ```ts
   base: '/your-repo-name/',
   ```

2. ビルド
   ```bash
   npm run build
   ```

3. GitHub Pages の Source を `gh-pages` ブランチまたは `docs/` フォルダに設定

4. または GitHub Actions を使う場合（`.github/workflows/deploy.yml`）:
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm install
         - run: npm run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

## データ
- 全データは `localStorage` に保存（`ringi_settings`, `ringi_applications`）
- サーバー不要・外部通信なし
