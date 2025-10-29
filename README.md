# ALB Log Analyzer

[![CI](https://github.com/YOUR_USERNAME/log-sandbox/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/log-sandbox/actions/workflows/ci.yml)
[![Coverage](https://github.com/YOUR_USERNAME/log-sandbox/actions/workflows/coverage.yml/badge.svg)](https://github.com/YOUR_USERNAME/log-sandbox/actions/workflows/coverage.yml)

AWS Application Load Balancer (ALB) のアクセスログを解析するCLIツールです。

## 機能

- レスポンスタイム統計（最小値、最大値、平均値、中央値、標準偏差）
- ステータスコード分布
- HTTPメソッド分布
- よくアクセスされるエンドポイント
- クライアントIP分析
- エラー追跡（4xx、5xx）
- 遅いリクエストの検出（カスタマイズ可能な閾値）
- 複数の出力形式（テキスト、JSON、CSV）

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/YOUR_USERNAME/log-sandbox.git
cd log-sandbox

# 依存関係のインストール
pnpm install

# ビルド
pnpm build
```

## 使い方

### 基本的な使い方

```bash
# ファイルから読み込んで画面に表示
node dist/main.js logfile.txt

# 標準入力から読み込む
cat logfile.txt | node dist/main.js

# ログを直接貼り付ける（Ctrl+Dで終了）
node dist/main.js
```

### 出力形式の指定

```bash
# テキストファイルに保存
node dist/main.js logfile.txt --output=result.txt

# JSON形式で保存
node dist/main.js logfile.txt --output=result.json --format=json

# CSV形式で保存
node dist/main.js logfile.txt --output=result.csv --format=csv
```

### 遅いリクエストの検出オプション

```bash
# デフォルト（1秒以上のリクエストを上位100件表示）
node dist/main.js logfile.txt

# 0.5秒以上のリクエストを検出
node dist/main.js logfile.txt --slow-threshold=0.5

# 上位50件のみ表示
node dist/main.js logfile.txt --slow-limit=50

# すべての遅いリクエストを表示
node dist/main.js logfile.txt --slow-limit=all

# 組み合わせ
node dist/main.js logfile.txt --slow-threshold=0.5 --slow-limit=50
```

## オプション一覧

| オプション | 説明 | デフォルト値 |
|-----------|------|------------|
| `--output=<ファイル名>` | 結果をファイルに保存 | 標準出力 |
| `--format=<形式>` | 出力形式（txt/json/csv） | txt |
| `--slow-threshold=<秒数>` | 遅いリクエストの閾値（秒） | 1.0 |
| `--slow-limit=<件数>` | 遅いリクエストの表示件数（allで全件） | 100 |

## 出力例

```
================================================================================
ALB Log Analysis Summary
================================================================================

Total Requests: 1000

Response Time Statistics (seconds):
  Min:     0.0010
  Max:     5.2340
  Mean:    0.4521
  Median:  0.1234
  StdDev:  0.8765

Status Code Distribution:
  200:      850 ( 85.0%)
  201:       50 (  5.0%)
  404:       80 (  8.0%)
  500:       20 (  2.0%)

HTTP Methods:
  GET:      700 ( 70.0%)
  POST:     250 ( 25.0%)
  PUT:       30 (  3.0%)
  DELETE:    20 (  2.0%)

Top 10 Endpoints:
  GET /api/users
    Count: 350 (35.0%)
  POST /api/users
    Count: 200 (20.0%)
  ...

Top 10 Client IPs:
  203.0.113.10:      150 (15.0%)
  198.51.100.20:     120 (12.0%)
  ...

Slow Requests (>1.0s): 45

Slowest Requests (top 100):
  1. 5.234s - POST /api/heavy-operation
     [2025-10-28T01:41:23.692780Z] Status: 200
  2. 3.456s - GET /api/large-data
     [2025-10-28T01:41:25.123456Z] Status: 200
  ...
```

## 開発

### 必要な環境

- Node.js 20.0 以上
- pnpm 10.0 以上

### セットアップ

```bash
# 依存関係のインストール
pnpm install

# 開発モード（ビルドせずに実行）
pnpm dev

# ビルド
pnpm build

# ウォッチモード（ファイル変更時に自動ビルド）
pnpm watch
```

### テスト

```bash
# テスト実行
pnpm test

# テスト実行（ウォッチモード）
pnpm test

# テスト実行（UIモード）
pnpm test:ui

# カバレッジ付きテスト
pnpm test:coverage
```

### コード品質チェック

```bash
# TypeScript型チェック
pnpm typecheck

# ESLintチェック
pnpm lint

# ESLint自動修正
pnpm lint:fix

# すべてのチェックを実行（CI相当）
pnpm typecheck && pnpm lint && pnpm test run
```

### CI/CD

GitHub Actionsで以下のチェックが自動実行されます：

- **TypeScript型チェック** - `tsc --noEmit`で型エラーを検出
- **ESLint** - コード品質とスタイルをチェック
- **テスト** - Vitestで全テストを実行
- **ビルド** - TypeScriptをコンパイル
- **カバレッジ** - テストカバレッジをCodecovにアップロード

実行タイミング：
- mainブランチへのpush
- mainブランチへのPR作成・更新

### プロジェクト構成

このプロジェクトはクリーンアーキテクチャに基づいて構成されています：

```
src/
├── domain/              # ドメイン層（ビジネスロジックの中核）
│   ├── alb-log-entry.entity.ts       # ALBログエントリのエンティティ
│   └── analysis-result.entity.ts     # 解析結果のエンティティ
│
├── application/         # アプリケーション層（ユースケース）
│   └── log-analyzer.usecase.ts       # ログ解析のユースケース
│
├── infrastructure/      # インフラ層（外部システム連携）
│   ├── config/         # 設定管理
│   │   └── config-loader.ts          # 設定ファイル読み込み
│   ├── filesystem/     # ファイルシステム操作
│   │   ├── log-reader.interface.ts   # ログ読み込みインターフェース
│   │   ├── file-log-reader.ts        # ファイルからログ読み込み
│   │   ├── stdin-log-reader.ts       # 標準入力からログ読み込み
│   │   └── log-combiner.ts           # gzipファイルの結合
│   └── s3/             # AWS S3操作
│       ├── s3-downloader.ts          # S3からログダウンロード
│       └── s3-log-reader.ts          # S3から直接ログ読み込み
│
├── presentation/        # プレゼンテーション層（出力フォーマット）
│   ├── console-presenter.ts          # テキスト形式出力
│   ├── json-presenter.ts             # JSON形式出力
│   └── csv-presenter.ts              # CSV形式出力
│
├── scripts/            # ユーティリティスクリプト
│   └── download-and-analyze.ts       # S3ダウンロード＆解析スクリプト
│
└── main.ts             # エントリーポイント
```

### アーキテクチャの特徴

- **依存性逆転の原則**: 外側の層が内側の層に依存（domain ← application ← infrastructure/presentation）
- **テスタビリティ**: インターフェースを使用し、各層を独立してテスト可能
- **拡張性**: 新しい出力形式やログソースを簡単に追加可能
- **関心の分離**: ビジネスロジックと技術的詳細を明確に分離

## S3からのログダウンロード（オプション）

S3バケットから直接ALBログをダウンロードして解析することもできます。

### 設定ファイルの作成

```bash
# config.example.jsonをコピー
cp config.example.json config.json

# config.jsonを編集してS3バケット情報を設定
```

`config.json`の例：

```json
{
  "s3": {
    "bucket": "your-alb-logs-bucket",
    "prefix": "alb-logs/",
    "region": "ap-northeast-1"
  }
}
```

### S3ダウンロードスクリプトの実行

```bash
# 開発モード
pnpm download

# 本番モード（ビルド後）
pnpm download:prod
```

## ライセンス

MIT
