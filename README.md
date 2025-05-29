# EA Deep Research

AI駆動型企業分析ツール - 深層的な企業情報リサーチシステム

## 概要

EA Deep Researchは、企業名を入力するだけで、AIを使用して多段階の深層分析を行い、提案骨子を自動生成するツールです。

## 機能

- 🔍 Google Search APIによる企業情報の収集
- 🤖 Claude AIによる多段階分析（3段階以上の推論・検索）
- 📊 リアルタイムの分析進捗表示（WebSocket使用）
- 📑 提案スライド骨子の自動生成
- 📋 スライドごとのコピー機能

## セットアップ

1. 依存関係のインストール
```bash
npm install
```

2. サーバーの起動
```bash
npm start
```

3. ブラウザで `http://localhost:3000` にアクセス

## 使用方法

1. 検索窓に分析したい企業名を入力
2. 「分析開始」ボタンをクリック
3. リアルタイムで分析進捗を確認
4. 分析完了後、提案スライドが表示される
5. 各スライドの「コピー」ボタンで内容をコピー可能

## 技術スタック

- Frontend: HTML5, CSS3, JavaScript (Vanilla)
- Backend: Node.js, Express
- WebSocket: ws
- APIs: Google Search API, Claude API (Anthropic)
- UI: グラデーション、ガラスモーフィズムを使用した洗練されたデザイン

## 分析フロー

1. **基本情報収集**: Google検索で企業の基本情報を取得
2. **AI分析**: Claude AIが情報を整理・分析
3. **深層リサーチ**: 追加検索と詳細分析を3段階以上実施
4. **提案骨子作成**: 分析結果から提案スライドを自動生成

## デプロイ

### Renderでのデプロイ方法

1. [Render](https://render.com)にアクセスしてアカウントを作成
2. New → Web Service を選択
3. GitHubリポジトリ `https://github.com/ryouryout/ea-deep-research` を接続
4. 環境変数を設定:
   - `GOOGLE_API_KEY`: Google Custom Search APIキー
   - `GOOGLE_CX`: Google Custom Search Engine ID
   - `CLAUDE_API_KEY`: Anthropic Claude APIキー

### 環境変数の設定

1. `.env.example`を`.env`にコピー
2. 各APIキーを設定

## 注意事項

- APIキーは環境変数または設定ファイルで管理してください
- 本番環境では適切なセキュリティ対策を実施してください
- APIキーは絶対にGitHubにコミットしないでください