/**
 * Infrastructure Interface: Log Reader
 */

export interface ILogReader {
  readLines(): Promise<string[]>;
}
