# ALB Log Analyzer - Web Dashboard

ALBログを解析してSQLite/Tursoに保存し、Next.jsダッシュボードで可視化します。

## プロジェクト構成

```
.
├── packages/
│   ├── db/                 # Drizzle ORM + libSQL client (共通DB層)
│   └── ingest-cli/         # ログ取り込みCLI (既存の解析ツール拡張)
└── apps/
    └── dashboard/          # Next.js ダッシュボード
```

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. データベースのセットアップ

ローカルSQLiteファイルを使用します:

```bash
# データベースディレクトリ作成
mkdir -p data

# スキーマを適用
pnpm db:push
```

### 3. ログデータのインポート

既存のALBログファイルをデータベースにインポート:

```bash
# ファイルから
pnpm --filter @alb-analyzer/ingest-cli import ./logs/your-alb-logs.log

# 標準入力から
cat ./logs/*.log | pnpm --filter @alb-analyzer/ingest-cli import --stdin

# S3から (config.jsonが必要)
pnpm --filter @alb-analyzer/ingest-cli import --s3 --config=./config.json
```

### 4. ダッシュボードの起動

```bash
pnpm dev:dashboard
```

http://localhost:3000 でダッシュボードが開きます。

## 機能

### ダッシュボード

- **統計サマリー**: 総リクエスト数、平均レスポンスタイム、エラー数、タイムアウト数
- **時系列グラフ**: リクエスト数とエラー数の推移
- **ステータスコード分布**: 各HTTPステータスコードの出現頻度
- **トップエンドポイント**: 最もアクセスされたエンドポイント
- **直近のエラー**: 最新のエラーログ詳細

### CLI (既存機能)

```bash
# 既存のコンソール出力機能
pnpm --filter @alb-analyzer/ingest-cli build
./packages/ingest-cli/dist/main.js ./logs/*.log
```

## Turso Cloudへの移行 (本番デプロイ時)

ローカル開発は `file:./data/alb-logs.db` で完結しますが、
本番環境やチーム共有したい場合はTurso Cloudに移行できます。

### 1. Tursoのセットアップ

```bash
# Turso CLIでログイン (初回のみ)
turso auth login

# データベース作成
turso db create alb-logs

# 接続情報取得
turso db show alb-logs
turso db tokens create alb-logs
```

### 2. 環境変数設定

`.env.local` を作成:

```bash
TURSO_DATABASE_URL="libsql://your-db.turso.io"
TURSO_AUTH_TOKEN="your-token-here"
```

### 3. デプロイ

Vercel、Netlify、Cloudflare Pages等にデプロイ可能:

```bash
# Vercel例
vercel --cwd apps/dashboard
```

環境変数 `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` を設定すれば完了です。

## スキーマ管理

```bash
# マイグレーションファイル生成
pnpm db:generate

# マイグレーション実行
pnpm db:migrate

# Drizzle Studioで可視化
pnpm --filter @alb-analyzer/db db:studio
```

## 開発コマンド

```bash
# すべてのパッケージをビルド
pnpm build

# 型チェック
pnpm typecheck

# リント
pnpm lint

# テスト (既存のingest-cliのテスト)
pnpm test
```

## トラブルシューティング

### データベースが空の場合

```bash
# スキーマを再プッシュ
pnpm db:push

# ログを再インポート
pnpm import ./logs/*.log
```

### ダッシュボードでデータが表示されない

1. `data/alb-logs.db` が存在するか確認
2. データがインポートされているか確認: `sqlite3 data/alb-logs.db "SELECT count(*) FROM alb_logs;"`
3. Next.jsを再起動: `pnpm dev:dashboard`

## ライセンス

MIT
