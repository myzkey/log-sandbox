/**
 * Presentation Layer: Console Presenter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsolePresenter } from './console-presenter';
import { AnalysisResult } from '@domain/analysis-result.entity';
import { ALBLogEntry } from '@domain/alb-log-entry.entity';

describe('ConsolePresenter', () => {
  let presenter: ConsolePresenter;
  let consoleLogSpy: any;

  beforeEach(() => {
    presenter = new ConsolePresenter();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('present', () => {
    it('基本的な統計情報を表示すること', () => {
      const entry = new ALBLogEntry('h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -');
      const entries: ALBLogEntry[] = [entry];
      const result = new AnalysisResult(
        entries,
        new Map([['200', 1]]),
        new Map([['GET /test', 1]]),
        new Map([['192.168.1.1', 1]]),
        new Map([['GET', 1]]),
        [1.0],
        [],
        [],
        [],
        {
          min: 1.0,
          max: 1.0,
          mean: 1.0,
          median: 1.0,
          stdDev: 0.0
        },
        []
      );

      presenter.present(result, {});

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('ALBログ分析サマリー');
      expect(output).toContain('総リクエスト数');
      expect(output).toContain('レスポンスタイム統計');
    });

    it('エラーがない場合は正常に表示すること', () => {
      const entry = new ALBLogEntry('h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -');
      const result = new AnalysisResult(
        [entry],
        new Map([['200', 1]]),
        new Map(),
        new Map(),
        new Map(),
        [1.0],
        [], // エラーなし
        [], // タイムアウトなし
        [],
        null,
        []
      );

      presenter.present(result, {});

      const output = consoleLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('総リクエスト数');
      expect(output).toContain('200:');
    });

    it('タイムアウトがない場合は正常に表示すること', () => {
      const entry = new ALBLogEntry('h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -');
      const result = new AnalysisResult(
        [entry],
        new Map([['200', 1]]),
        new Map(),
        new Map(),
        new Map(),
        [1.0],
        [],
        [], // タイムアウトなし
        [],
        null,
        []
      );

      presenter.present(result, {});

      const output = consoleLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('総リクエスト数');
      expect(output).toContain('ALBログ分析サマリー');
    });

    it('slowThresholdオプションを適用すること', () => {
      const entry = new ALBLogEntry('h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 2.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -');

      const result = new AnalysisResult(
        [entry],
        new Map([['200', 1]]),
        new Map(),
        new Map(),
        new Map([['GET', 1]]),
        [2.0],
        [],
        [],
        [],
        {
          min: 2.0,
          max: 2.0,
          mean: 2.0,
          median: 2.0,
          stdDev: 0.0
        },
        []
      );

      presenter.present(result, { slowThreshold: 1.5 });

      const output = consoleLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('遅いリクエスト');
      // デフォルトが1秒なので、slowThreshold:1.5でもフィルタリングされ1件表示される
      expect(output).toContain('GET /test');
    });

    it('slowLimitオプションを適用すること', () => {
      const entries: ALBLogEntry[] = [];
      for (let i = 0; i < 5; i++) {
        const entry = new ALBLogEntry(`h2 2025-10-28T01:41:1${i}.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 2.000 0.000 200 200 58 231 "GET https://api.example.com:443/test${i} HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -`);
        entries.push(entry);
      }

      const result = new AnalysisResult(
        entries,
        new Map([['200', 5]]),
        new Map(),
        new Map(),
        new Map([['GET', 5]]),
        [2.0, 2.0, 2.0, 2.0, 2.0],
        [],
        [],
        [],
        null,
        []
      );

      presenter.present(result, { slowThreshold: 1.0, slowLimit: 3 });

      const output = consoleLogSpy.mock.calls.map((call: any[]) => call[0]).join('\n');
      expect(output).toContain('遅いリクエスト');
      expect(output).toContain('GET /test0');
    });
  });
});
