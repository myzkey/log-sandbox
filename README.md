# ALB Log Analyzer

[![CI](https://github.com/myzkey/log-sandbox/actions/workflows/ci.yml/badge.svg)](https://github.com/myzkey/log-sandbox/actions/workflows/ci.yml)
[![Coverage](https://github.com/myzkey/log-sandbox/actions/workflows/coverage.yml/badge.svg)](https://github.com/myzkey/log-sandbox/actions/workflows/coverage.yml)

AWS Application Load Balancer (ALB) のアクセスログを解析する CLI ツールです。

## 機能

- レスポンスタイム統計（最小値、最大値、平均値、中央値、標準偏差）
- ステータスコード分布
- HTTP メソッド分布
- よくアクセスされるエンドポイント
- クライアント IP 分析
- エラー追跡（4xx、5xx）
- 遅いリクエストの検出（カスタマイズ可能な閾値）
- 複数の出力形式（テキスト、JSON、CSV）

## インストール

```bash
# リポジトリのクローン
git clone https://github.com/myzkey/log-sandbox.git
cd log-sandbox

# 依存関係のインストール
pnpm install

# ビルド
pnpm build
```

## クイックスタート

最も簡単な使い方は、S3から自動ダウンロードして解析することです：

```bash
# 1. 設定ファイルを作成
cp config.example.json config.json
# config.jsonを編集してAWS情報を設定

# 2. 今日のログをダウンロード＆解析
pnpm download

# 3. 期間を指定して解析
pnpm download --from=2025/10/29 --to=2025/10/31
```

詳細は「[S3からのログダウンロード＆解析](#s3-からのログダウンロード解析推奨)」を参照してください。

## 使い方

### 手動でログファイルを解析する場合

```bash
# ファイルから読み込んで画面に表示
tsx src/main.ts logfile.txt

# 出力形式を指定
tsx src/main.ts logfile.txt --output=result.json --format=json
tsx src/main.ts logfile.txt --output=result.csv --format=csv

# 遅いリクエストの閾値を変更
tsx src/main.ts logfile.txt --slow-threshold=0.5 --slow-limit=50
```

## オプション一覧

| オプション                | 説明                                   | デフォルト値 |
| ------------------------- | -------------------------------------- | ------------ |
| `--output=<ファイル名>`   | 結果をファイルに保存                   | 標準出力     |
| `--format=<形式>`         | 出力形式（txt/json/csv）               | txt          |
| `--slow-threshold=<秒数>` | 遅いリクエストの閾値（秒）             | 1.0          |
| `--slow-limit=<件数>`     | 遅いリクエストの表示件数（all で全件） | 100          |

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

# ビルド
pnpm build
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

### CI/CD

GitHub Actions で以下のチェックが自動実行されます：

- **TypeScript 型チェック** - `tsc --noEmit`で型エラーを検出
- **ESLint** - コード品質とスタイルをチェック
- **テスト** - Vitest で全テストを実行
- **ビルド** - TypeScript をコンパイル
- **カバレッジ** - テストカバレッジを Codecov にアップロード

実行タイミング：

- main ブランチへの push
- main ブランチへの PR 作成・更新

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

## S3 からのログダウンロード＆解析（推奨）

S3 バケットから直接 ALB ログをダウンロードして解析できます。

### 設定ファイルの作成

```bash
# config.example.jsonをコピー
cp config.example.json config.json

# config.jsonを編集してAWS情報を設定
```

`config.json`の例：

```json
{
  "awsProfile": "your-aws-profile",
  "s3Bucket": "your-alb-logs-bucket",
  "s3Prefix": "app/",
  "awsAccountId": "123456789012",
  "region": "ap-northeast-1"
}
```

### ダウンロード＆解析の実行

```bash
# 今日のログを自動ダウンロード＆解析
pnpm download

# 特定の日付を指定
pnpm download 2025/10/29

# 期間を指定（複数日分を一括ダウンロード）
pnpm download --from=2025/10/29 --to=2025/10/31

# 開始日のみ指定（その日だけ）
pnpm download --from=2025/10/29
```

### 実行の流れ

1. **S3からダウンロード** - 指定した日付（または期間）のログファイルを取得
2. **解凍・結合** - gzipファイルを解凍して1つのログファイルに結合
3. **解析実行** - 結合したログを自動で解析
4. **結果保存** - `logs/YYYY-MM-DD/analysis.txt`に保存

### 出力ファイル

```
logs/
├── 2025-10-29/                    # 単日の場合
│   ├── *.gz                       # ダウンロードしたログファイル
│   ├── combined.log               # 結合されたログ
│   └── analysis.txt               # 解析結果
│
└── 2025-10-29_to_2025-10-31/      # 期間指定の場合
    ├── *.gz
    ├── combined.log
    └── analysis.txt
```

### スキップ機能

- すでにログファイルがダウンロード済みの場合は再ダウンロードをスキップ
- すでに結合ログが存在する場合は再結合をスキップ
- 効率的に再実行可能

## ライセンス

MIT
