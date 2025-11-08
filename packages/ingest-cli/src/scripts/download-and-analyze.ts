#!/usr/bin/env node

/**
 * ALBログをS3からダウンロードして解析するスクリプト
 * 使い方:
 *   pnpm download [YYYY/MM/DD]
 *   pnpm download --from=YYYY/MM/DD --to=YYYY/MM/DD
 *   pnpm download --from=YYYY/MM/DD --to=YYYY/MM/DD --config=path/to/config.json
 * 例:
 *   pnpm download 2025/10/27
 *   pnpm download --from=2025/10/27 --to=2025/10/31
 *   pnpm download --from=2025/10/27 --to=2025/10/31 --config=./config.prod.json
 */

import { ConfigLoader } from "~/infrastructure/config/config-loader";
import { LogCombiner } from "~/infrastructure/filesystem/log-combiner";
import { S3Downloader } from "~/infrastructure/s3/s3-downloader";
import { execSync } from "child_process";
import * as path from "path";

interface DateRange {
  from: string;
  to: string;
}

interface ScriptOptions {
  dateRange: DateRange;
  configPath?: string;
}

class DownloadAndAnalyzeScript {
  private dateRange: DateRange;
  private outputDir: string;
  private s3Downloader: S3Downloader;
  private logCombiner: LogCombiner;
  private config;

  constructor(options: ScriptOptions) {
    // 設定を読み込み
    this.config = ConfigLoader.getInstance().load(options.configPath);
    this.dateRange = options.dateRange;

    // 出力ディレクトリ名を決定（バケット名を含める）
    const dateStr = this.dateRange.from === this.dateRange.to
      ? this.dateRange.from.replace(/\//g, "-")
      : `${this.dateRange.from.replace(/\//g, "-")}_to_${this.dateRange.to.replace(/\//g, "-")}`;

    this.outputDir = path.join("./logs", this.config.s3Bucket, dateStr);

    // インフラ層のクラスを初期化
    this.s3Downloader = new S3Downloader({
      bucket: this.config.s3Bucket,
      prefix: this.config.s3Prefix,
      awsProfile: this.config.awsProfile,
    });

    this.logCombiner = new LogCombiner();
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }

  private getDateRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const current = new Date(from.replace(/\//g, "-"));
    const endDate = new Date(to.replace(/\//g, "-"));

    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      dates.push(`${year}/${month}/${day}`);

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private async downloadLogs(): Promise<number> {
    // 既にログファイルが存在するかチェック
    const existingFiles = this.logCombiner.getGzipFiles(this.outputDir);

    if (existingFiles.length > 0) {
      console.log(`📁 既存のログファイルを発見: ${existingFiles.length}個`);
      console.log("ℹ️  ダウンロードをスキップします");
      return existingFiles.length;
    }

    // S3からダウンロード
    console.log("📥 S3からログをダウンロード中...");

    try {
      const dates = this.getDateRange(this.dateRange.from, this.dateRange.to);
      let totalFiles = 0;

      for (const date of dates) {
        console.log(`  ${date} のログを取得中...`);
        const s3Path = this.s3Downloader.buildS3Path(
          date,
          this.config.awsAccountId,
          this.config.region
        );

        try {
          const files = await this.s3Downloader.download(
            s3Path,
            this.outputDir
          );
          totalFiles += files.length;
          console.log(`  ✓ ${files.length}個のファイルを取得`);
        } catch {
          console.log(`  ⚠ ${date} のログが見つかりませんでした`);
        }
      }

      console.log(
        `✅ 合計 ${totalFiles}個のログファイルをダウンロードしました`
      );
      return totalFiles;
    } catch (error) {
      console.error("❌ エラー: ログのダウンロードに失敗しました");
      console.error((error as Error).message);
      process.exit(1);
    }
  }

  private async combineLogs(): Promise<void> {
    const combinedLogPath = path.join(this.outputDir, "combined.log");

    // 既に結合済みかチェック
    if (this.logCombiner.isAlreadyCombined(combinedLogPath)) {
      const lines = await this.logCombiner.combineGzipFiles(
        [],
        combinedLogPath
      );
      console.log(`📄 既存の結合ログを発見: ${lines}行`);
      console.log("ℹ️  解凍・結合をスキップします");
      return;
    }

    console.log("📦 ログファイルを解凍して結合中...");

    const gzipFiles = this.logCombiner.getGzipFiles(this.outputDir);

    try {
      const lines = await this.logCombiner.combineGzipFiles(
        gzipFiles,
        combinedLogPath
      );
      console.log(`✅ ${lines}行のログを結合しました`);
    } catch (error) {
      console.error("❌ エラー:", (error as Error).message);
      process.exit(1);
    }
  }

  private analyze(): void {
    console.log("");
    console.log("📊 ログを解析中...");

    const combinedLogPath = path.join(this.outputDir, "combined.log");
    const analysisPath = path.join(this.outputDir, "analysis.txt");

    try {
      const command = `tsx src/main.ts ${combinedLogPath} --slow-limit=100 --output=${analysisPath}`;
      execSync(command, { stdio: "inherit" });

      this.printCompletionMessage(combinedLogPath);
    } catch {
      console.error("❌ エラー: ログ解析に失敗しました");
      process.exit(1);
    }
  }

  private printCompletionMessage(combinedLogPath: string): void {
    const analysisPath = path.join(this.outputDir, "analysis.txt");

    console.log("");
    console.log("=".repeat(60));
    console.log("✅ 完了！");
    console.log("=".repeat(60));
    console.log(`結合ログ: ${combinedLogPath}`);
    console.log(`解析結果: ${analysisPath}`);
    console.log("");
    console.log("その他のオプション:");
    console.log("  # すべての遅いリクエストを表示");
    console.log(
      `  tsx src/main.ts ${combinedLogPath} --slow-limit=all --output=${this.outputDir}/analysis-full.txt`
    );
    console.log("");
    console.log("  # 上位50件のみ表示");
    console.log(
      `  tsx src/main.ts ${combinedLogPath} --slow-limit=50 --output=${this.outputDir}/analysis-top50.txt`
    );
    console.log("");
    console.log("  # 0.5秒以上のリクエストを上位100件");
    console.log(
      `  tsx src/main.ts ${combinedLogPath} --slow-threshold=0.5 --slow-limit=100 --output=${this.outputDir}/analysis-slow.txt`
    );
    console.log("");
    console.log("  # JSONで保存");
    console.log(
      `  tsx src/main.ts ${combinedLogPath} --output=${this.outputDir}/analysis.json --format=json`
    );
    console.log("");
    console.log("  # CSVで保存");
    console.log(
      `  tsx src/main.ts ${combinedLogPath} --output=${this.outputDir}/analysis.csv --format=csv`
    );
  }

  async run(): Promise<void> {
    console.log("=".repeat(60));
    console.log("ALBログダウンロード＆解析");
    console.log("=".repeat(60));
    console.log(`AWSプロファイル: ${this.config.awsProfile}`);

    if (this.dateRange.from === this.dateRange.to) {
      console.log(`日付: ${this.dateRange.from}`);
    } else {
      console.log(`期間: ${this.dateRange.from} 〜 ${this.dateRange.to}`);
    }

    console.log(`出力先: ${this.outputDir}`);
    console.log("");

    // 1. ログをダウンロード
    await this.downloadLogs();

    console.log("");

    // 2. ログファイルを解凍して結合
    await this.combineLogs();

    // 3. 解析実行
    this.analyze();
  }
}

// 引数パース
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  let from: string | undefined;
  let to: string | undefined;
  let configPath: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--from=")) {
      from = arg.split("=")[1];
    } else if (arg.startsWith("--to=")) {
      to = arg.split("=")[1];
    } else if (arg.startsWith("--config=")) {
      configPath = arg.split("=")[1];
    } else if (!arg.startsWith("--")) {
      // 位置引数（後方互換性）
      from = arg;
      to = arg;
    }
  }

  // デフォルトは今日
  if (!from) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    from = `${year}/${month}/${day}`;
  }

  // toが指定されていない場合はfromと同じ
  if (!to) {
    to = from;
  }

  return {
    dateRange: { from, to },
    configPath
  };
}

// メイン処理
async function main(): Promise<void> {
  const options = parseArgs();
  const script = new DownloadAndAnalyzeScript(options);
  await script.run();
}

main().catch((error: Error) => {
  console.error("Error:", error);
  process.exit(1);
});
