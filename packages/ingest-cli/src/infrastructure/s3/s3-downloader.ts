/**
 * Infrastructure: S3 Downloader
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface S3DownloadConfig {
  bucket: string;
  prefix: string;
  awsProfile: string;
}

export class S3Downloader {
  constructor(private readonly config: S3DownloadConfig) {}

  /**
   * S3からファイルをダウンロード
   */
  async download(s3Path: string, outputDir: string): Promise<string[]> {
    this.ensureDirectory(outputDir);

    const command = `aws s3 sync ${s3Path} ${outputDir}/ --exclude "*" --include "*.gz"`;
    const env = { ...process.env, AWS_PROFILE: this.config.awsProfile };

    try {
      execSync(command, {
        stdio: 'inherit',
        env
      });

      const files = this.getDownloadedFiles(outputDir);

      if (files.length === 0) {
        throw new Error(`ログファイルが見つかりませんでした: ${s3Path}`);
      }

      return files;
    } catch (error) {
      throw new Error(`S3ダウンロードに失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * S3パスを構築
   */
  buildS3Path(date: string, accountId: string, region: string): string {
    return `s3://${this.config.bucket}/${this.config.prefix}/${accountId}/elasticloadbalancing/${region}/${date}/`;
  }

  /**
   * ダウンロード済みのファイル一覧を取得
   */
  private getDownloadedFiles(dir: string): string[] {
    try {
      return fs.readdirSync(dir)
        .filter(file => file.endsWith('.gz'))
        .map(file => path.join(dir, file));
    } catch {
      return [];
    }
  }

  /**
   * ディレクトリを作成
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
