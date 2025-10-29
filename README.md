# ALB Log Analyzer

[![CI](https://github.com/YOUR_USERNAME/log-sandbox/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/log-sandbox/actions/workflows/ci.yml)
[![Coverage](https://github.com/YOUR_USERNAME/log-sandbox/actions/workflows/coverage.yml/badge.svg)](https://github.com/YOUR_USERNAME/log-sandbox/actions/workflows/coverage.yml)

AWS Application Load Balancer (ALB) のアクセスログを解析するツールです。

## 機能

- レスポンスタイム統計（最小値、最大値、平均値、中央値、標準偏差）
- ステータスコード分布
- よくアクセスされるエンドポイント
- クライアントIP分析
- エラー追跡（4xx、5xx）
- 遅いリクエストの検出（5秒以上）

## 使い方

### 基本的な使い方

```bash
# ファイルから読み込んで画面に表示
node alb-log-analyzer.js logfile.txt

# 日本語で表示
node alb-log-analyzer.js logfile.txt --lang=ja

# 結果をテキストファイルに保存
node alb-log-analyzer.js logfile.txt --output=result.txt

# 結果をJSONファイルに保存
node alb-log-analyzer.js logfile.txt --output=result.json --format=json

# 結果をCSVファイルに保存
node alb-log-analyzer.js logfile.txt --output=result.csv --format=csv

# 日本語でテキストファイルに保存
node alb-log-analyzer.js logfile.txt --lang=ja --output=result.txt
```

### 標準入力から読み込む

```bash
cat logfile.txt | node alb-log-analyzer.js --output=result.txt
```

または

```bash
node alb-log-analyzer.js < logfile.txt
```

### ログを直接貼り付ける

```bash
node alb-log-analyzer.js
# ログを貼り付けて Ctrl+D で終了
```

## オプション

- `--lang=ja` - 日本語で出力（デフォルト: en）
- `--output=<ファイル名>` - 結果をファイルに保存
- `--format=<形式>` - 出力形式（txt/json/csv、デフォルト: txt）
- `--slow-limit=<件数>` - 遅いリクエストの表示件数（デフォルト: 100、all で全件表示）
- `--slow-threshold=<秒数>` - 遅いリクエストの閾値（デフォルト: 1.0秒）

### 例

```bash
# デフォルト（上位100件）
node alb-log-analyzer.js log.txt --lang=ja

# すべての遅いリクエストを表示
node alb-log-analyzer.js log.txt --lang=ja --slow-limit=all

# 上位50件のみ表示
node alb-log-analyzer.js log.txt --lang=ja --slow-limit=50

# 0.5秒以上のリクエストを上位100件表示
node alb-log-analyzer.js log.txt --lang=ja --slow-threshold=0.5 --slow-limit=100
```

## 実行例

```bash
# サンプルログファイルを作成
cat > sample.log << 'EOF'
h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123def456 203.0.113.10:40742 10.0.1.100:3000 0.002 0.526 0.000 204 204 58 231 "OPTIONS https://api.example.com:443/v1/services/123/items/456/location HTTP/2.0" "Mozilla/5.0" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:targetgroup/my-target-group/abc123 "Root=1-69001f37-621bfadc46ed205510eacd15" "api.example.com" "arn:aws:acm:ap-northeast-1:123456789012:certificate/abc-123-def-456" 1 2025-10-28T01:41:11.145000Z "forward" "-" "-" "10.0.1.100:3000" "204" "-" "-" TID_abc123def456 "-" "-" "-"
EOF

# 解析実行
node alb-log-analyzer.js sample.log
```

## 出力例

```
================================================================================
ALB Log Analysis Summary
================================================================================

Total Requests: 8

Response Time Statistics (seconds):
  Min:     0.0070
  Max:     12.4690
  Mean:    1.5763
  Median:  0.0460
  StdDev:  4.2031

Status Code Distribution:
  201:      4 ( 50.0%)
  204:      4 ( 50.0%)

HTTP Methods:
  POST:      4 ( 50.0%)
  OPTIONS:   4 ( 50.0%)

Top 10 Endpoints:
  POST /v1/services/23706/lots/15499/current_location
    Count: 4 (50.0%)
  OPTIONS /v1/services/23706/lots/15499/current_location
    Count: 4 (50.0%)

Top 10 Client IPs:
  106.131.184.101:      8 (100.0%)

Slow Requests (>5s): 1

Slowest Requests (top 5):
  1. 12.469s - POST /v1/services/23706/lots/15499/current_location
     [2025-10-28T01:41:23.692780Z] Status: 201
```

## 必要な環境

- Node.js 20.0 以上
- pnpm 10.0 以上

## 開発

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# ビルド
pnpm build

# 開発モード
pnpm dev
```

### テスト

```bash
# テスト実行
pnpm test

# テスト実行（UIモード）
pnpm test:ui

# カバレッジ付きテスト
pnpm test:coverage
```

### リント

```bash
# ESLintチェック
pnpm lint

# ESLint自動修正
pnpm lint:fix
```

### プロジェクト構成

このプロジェクトはクリーンアーキテクチャに基づいて構成されています：

```
src/
├── domain/           # ドメイン層（エンティティ）
├── application/      # アプリケーション層（ユースケース）
├── infrastructure/   # インフラ層（外部システム連携）
│   ├── config/      # 設定管理
│   ├── filesystem/  # ファイルシステム操作
│   └── s3/          # S3操作
├── presentation/     # プレゼンテーション層（出力フォーマット）
└── scripts/         # ユーティリティスクリプト
```

## ライセンス

MIT
