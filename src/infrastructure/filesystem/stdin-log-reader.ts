/**
 * Infrastructure: Stdin Log Reader
 */

import * as readline from 'readline';
import type { ILogReader } from './log-reader.interface';

export class StdinLogReader implements ILogReader {
  async readLines(): Promise<string[]> {
    const lines: string[] = [];
    const rl = readline.createInterface({
      input: process.stdin,
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
