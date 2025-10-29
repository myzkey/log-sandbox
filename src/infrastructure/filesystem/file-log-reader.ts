/**
 * Infrastructure: File Log Reader
 */

import * as fs from 'fs';
import * as readline from 'readline';
import * as zlib from 'zlib';
import type { ILogReader } from './log-reader.interface';

export class FileLogReader implements ILogReader {
  constructor(private readonly filePath: string) {}

  async readLines(): Promise<string[]> {
    const lines: string[] = [];
    let fileStream: NodeJS.ReadableStream = fs.createReadStream(this.filePath);

    // Check if file is gzipped
    if (this.filePath.endsWith('.gz')) {
      fileStream = fileStream.pipe(zlib.createGunzip());
    }

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (line.trim()) {
        lines.push(line.trim());
      }
    }

    return lines;
  }
}
