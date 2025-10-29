#!/usr/bin/env node

/**
 * ALBログをS3からダウンロードして解析するスクリプト
 * 使い方: pnpm download [YYYY/MM/DD]
 * 例: pnpm download 2025/10/27
 */

import * as path from 'path';
import { execSync } from 'child_process';
import { S3Downloader } from '@infrastructure/s3/s3-downloader';
import { LogCombiner } from '@infrastructure/filesystem/log-combiner';
import { ConfigLoader } from '@infrastructure/config/config-loader';

class DownloadAndAnalyzeScript {
  private date: string;
  private outputDir: string;
  private s3Path: string;
  private s3Downloader: S3Downloader;
  private logCombiner: LogCombiner;
  private config;

  constructor(dateArg?: string) {
    // 設定を読み込み
    this.config = ConfigLoader.getInstance().load();

    // 引数で日付指定、なければ今日
    this.date = dateArg || this.getTodayDate();
    this.outputDir = path.join('./logs', this.date.replace(/\//g, '-'));

    // インフラ層のクラスを初期化
    this.s3Downloader = new S3Downloader({
      bucket: this.config.s3Bucket,
      prefix: this.config.s3Prefix,
      awsProfile: this.config.awsProfile
    });

    this.logCombiner = new LogCombiner();

    // S3パスを構築
    this.s3Path = this.s3Downloader.buildS3Path(
      this.date,
      this.config.awsAccountId,
      this.config.region
    );
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  private async downloadLogs(): Promise<number> {
    // 既にログファイルが存在するかチェック
    const existingFiles = this.logCombiner.getGzipFiles(this.outputDir);

    if (existingFiles.length > 0) {
      console.log(`📁 既存のログファイルを発見: ${existingFiles.length}個`);
      console.log('ℹ️  ダウンロードをスキップします');
      return existingFiles.length;
    }

    // S3からダウンロード
    console.log('📥 S3からログをダウンロード中...');

    try {
      const files = await this.s3Downloader.download(this.s3Path, this.outputDir);
      console.log(`✅ ${files.length}個のログファイルをダウンロードしました`);
      return files.length;
    } catch (error) {
      console.error('❌ エラー: ログのダウンロードに失敗しました');
      console.error((error as Error).message);
      process.exit(1);
    }
  }

  private async combineLogs(): Promise<void> {
    const combinedLogPath = path.join(this.outputDir, 'combined.log');

    // 既に結合済みかチェック
    if (this.logCombiner.isAlreadyCombined(combinedLogPath)) {
      const lines = await this.logCombiner.combineGzipFiles([], combinedLogPath);
      console.log(`📄 既存の結合ログを発見: ${lines}行`);
      console.log('ℹ️  解凍・結合をスキップします');
      return;
    }

    console.log('📦 ログファイルを解凍して結合中...');

    const gzipFiles = this.logCombiner.getGzipFiles(this.outputDir);

    try {
      const lines = await this.logCombiner.combineGzipFiles(gzipFiles, combinedLogPath);
      console.log(`✅ ${lines}行のログを結合しました`);
    } catch (error) {
      console.error('❌ エラー:', (error as Error).message);
      process.exit(1);
    }
  }

  private analyze(): void {
    console.log('');
    console.log('📊 ログを解析中...');

    const combinedLogPath = path.join(this.outputDir, 'combined.log');
    const analysisPath = path.join(this.outputDir, 'analysis.txt');

    try {
      const command = `node dist/main.js ${combinedLogPath} --slow-limit=100 --output=${analysisPath}`;
      execSync(command, { stdio: 'inherit' });

      this.printCompletionMessage(combinedLogPath);
    } catch {
      console.error('❌ エラー: ログ解析に失敗しました');
      process.exit(1);
    }
  }

  private printCompletionMessage(combinedLogPath: string): void {
    const analysisPath = path.join(this.outputDir, 'analysis.txt');

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 完了！');
    console.log('='.repeat(60));
    console.log(`結合ログ: ${combinedLogPath}`);
    console.log(`解析結果: ${analysisPath}`);
    console.log('');
    console.log('その他のオプション:');
    console.log('  # すべての遅いリクエストを表示');
    console.log(`  node dist/main.js ${combinedLogPath} --slow-limit=all --output=${this.outputDir}/analysis-full.txt`);
    console.log('');
    console.log('  # 上位50件のみ表示');
    console.log(`  node dist/main.js ${combinedLogPath} --slow-limit=50 --output=${this.outputDir}/analysis-top50.txt`);
    console.log('');
    console.log('  # 0.5秒以上のリクエストを上位100件');
    console.log(`  node dist/main.js ${combinedLogPath} --slow-threshold=0.5 --slow-limit=100 --output=${this.outputDir}/analysis-slow.txt`);
    console.log('');
    console.log('  # JSONで保存');
    console.log(`  node dist/main.js ${combinedLogPath} --output=${this.outputDir}/analysis.json --format=json`);
    console.log('');
    console.log('  # CSVで保存');
    console.log(`  node dist/main.js ${combinedLogPath} --output=${this.outputDir}/analysis.csv --format=csv`);
  }

  async run(): Promise<void> {
    console.log('='.repeat(60));
    console.log('ALBログダウンロード＆解析');
    console.log('='.repeat(60));
    console.log(`AWSプロファイル: ${this.config.awsProfile}`);
    console.log(`日付: ${this.date}`);
    console.log(`S3パス: ${this.s3Path}`);
    console.log(`出力先: ${this.outputDir}`);
    console.log('');

    // 1. ログをダウンロード
    await this.downloadLogs();

    console.log('');

    // 2. ログファイルを解凍して結合
    await this.combineLogs();

    // 3. 解析実行
    this.analyze();
  }
}

// メイン処理
async function main(): Promise<void> {
  const dateArg = process.argv[2];
  const script = new DownloadAndAnalyzeScript(dateArg);
  await script.run();
}

main().catch((error: Error) => {
  console.error('Error:', error);
  process.exit(1);
});
