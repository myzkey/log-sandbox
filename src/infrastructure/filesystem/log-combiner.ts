/**
 * Infrastructure: Log File Combiner
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream';

const pipelineAsync = promisify(pipeline);

export class LogCombiner {
  /**
   * 複数のgzipファイルを解凍して1つのファイルに結合
   */
  async combineGzipFiles(gzipFiles: string[], outputPath: string): Promise<number> {
    // 既に結合済みのファイルがあるかチェック
    if (fs.existsSync(outputPath)) {
      const lines = this.countLines(outputPath);
      return lines;
    }

    const writeStream = fs.createWriteStream(outputPath);

    try {
      for (const gzipFile of gzipFiles) {
        const readStream = fs.createReadStream(gzipFile);
        const gunzip = zlib.createGunzip();

        await pipelineAsync(
          readStream,
          gunzip,
          writeStream,
          { end: false }
        );
      }

      writeStream.end();

      return this.countLines(outputPath);
    } catch (error) {
      throw new Error(`ログファイルの結合に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * ディレクトリ内のgzipファイル一覧を取得
   */
  getGzipFiles(dir: string): string[] {
    try {
      return fs.readdirSync(dir)
        .filter(file => file.endsWith('.gz'))
        .map(file => path.join(dir, file));
    } catch {
      return [];
    }
  }

  /**
   * ファイルの行数をカウント
   */
  private countLines(filePath: string): number {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.split('\n').filter(line => line.trim()).length;
    } catch {
      return 0;
    }
  }

  /**
   * 結合済みファイルが存在するかチェック
   */
  isAlreadyCombined(outputPath: string): boolean {
    return fs.existsSync(outputPath);
  }
}
