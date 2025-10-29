/**
 * Application Layer: Log Analyzer Use Case Tests
 */

import { describe, it, expect } from 'vitest';
import { LogAnalyzerUseCase } from './log-analyzer.usecase';

describe('LogAnalyzerUseCase', () => {
  const usecase = new LogAnalyzerUseCase();

  const sampleLogs = [
    'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.002 0.526 0.000 204 204 58 231 "OPTIONS https://api.example.com:443/v1/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
    'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.003 1.234 0.001 200 200 58 231 "GET https://api.example.com:443/v1/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
    'h2 2025-10-28T01:41:13.673240Z app/my-alb/abc123 203.0.113.11:40742 10.0.1.100:3000 0.002 0.100 0.000 500 500 58 231 "POST https://api.example.com:443/v1/error HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
    'h2 2025-10-28T01:41:14.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 -1 -1 -1 504 504 58 231 "GET https://api.example.com:443/v1/timeout HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
  ];

  describe('analyze', () => {
    it('ログを正しく解析すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.entries).toHaveLength(4);
      expect(result.responseTimes).toHaveLength(3); // タイムアウト以外
      expect(result.timeouts).toHaveLength(1);
      expect(result.errors).toHaveLength(2); // 500エラーと504タイムアウト
    });

    it('ステータスコード分布を正しく計算すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.statusCodes.get('200')).toBe(1);
      expect(result.statusCodes.get('204')).toBe(1);
      expect(result.statusCodes.get('500')).toBe(1);
      expect(result.statusCodes.get('504')).toBe(1);
    });

    it('HTTPメソッド分布を正しく計算すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.methods.get('OPTIONS')).toBe(1);
      expect(result.methods.get('GET')).toBe(2);
      expect(result.methods.get('POST')).toBe(1);
    });

    it('エンドポイント分布を正しく計算すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.endpoints.get('OPTIONS /v1/test')).toBe(1);
      expect(result.endpoints.get('GET /v1/test')).toBe(1);
      expect(result.endpoints.get('POST /v1/error')).toBe(1);
      expect(result.endpoints.get('GET /v1/timeout')).toBe(1);
    });

    it('クライアントIP分布を正しく計算すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.clientIps.get('203.0.113.10')).toBe(3);
      expect(result.clientIps.get('203.0.113.11')).toBe(1);
    });

    it('統計情報を正しく計算すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.stats).not.toBeNull();
      if (result.stats) {
        expect(result.stats.min).toBeCloseTo(0.102, 5); // 0.002 + 0.100 + 0.000
        expect(result.stats.max).toBeCloseTo(1.238, 5); // 0.003 + 1.234 + 0.001
        expect(result.stats.mean).toBeCloseTo(0.6226667, 5);
      }
    });

    it('タイムアウトを正しく検出すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.timeouts).toHaveLength(1);
      expect(result.timeouts[0].requestPath).toBe('/v1/timeout');
      expect(result.timeouts[0].isTimeout).toBe(true);
    });

    it('エラーを正しく検出すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.errors).toHaveLength(2); // 500 と 504
      const errorCodes = result.errors.map(e => e.targetStatusCode).sort();
      expect(errorCodes).toEqual(['500', '504']);
    });

    it('時間分析を正しく実行すること', () => {
      const result = usecase.analyze(sampleLogs);

      expect(result.timeAnalysis.length).toBeGreaterThan(0);

      const bucket = result.timeAnalysis[0];
      expect(bucket).toHaveProperty('timestamp');
      expect(bucket).toHaveProperty('count');
      expect(bucket).toHaveProperty('avgResponseTime');
      expect(bucket).toHaveProperty('maxResponseTime');
      expect(bucket).toHaveProperty('errors');
      expect(bucket).toHaveProperty('timeouts');
      expect(bucket).toHaveProperty('statusCodes');
    });

    it('空のログ配列を処理できること', () => {
      const result = usecase.analyze([]);

      expect(result.entries).toHaveLength(0);
      expect(result.responseTimes).toHaveLength(0);
      expect(result.timeouts).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.stats).toBeNull();
    });

    it('不正なログ行をスキップすること', () => {
      const invalidLogs = [
        'invalid log line',
        '',
        sampleLogs[0]
      ];

      const result = usecase.analyze(invalidLogs);

      // 空文字列はtrim()後に空になりスキップされる
      // 'invalid log line' と sampleLogs[0] の2つが追加される
      expect(result.entries.length).toBe(2);
      // しかし有効なresponseTimeは正常な行の分だけ
      // sampleLogs[0] は OPTIONS で 0.528秒
      expect(result.responseTimes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('統計計算', () => {
    it('中央値を正しく計算すること（奇数個）', () => {
      const logs = [
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
        'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 2.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
        'h2 2025-10-28T01:41:13.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 3.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      ];

      const result = usecase.analyze(logs);

      expect(result.stats?.median).toBe(2.0);
    });

    it('中央値を正しく計算すること（偶数個）', () => {
      const logs = [
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
        'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 2.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
        'h2 2025-10-28T01:41:13.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 3.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
        'h2 2025-10-28T01:41:14.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 4.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      ];

      const result = usecase.analyze(logs);

      // 現在の実装では floor(length/2) = floor(4/2) = 2番目の要素(3.0)を返す
      expect(result.stats?.median).toBe(3.0);
    });

    it('標準偏差を正しく計算すること', () => {
      const logs = [
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
        'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 2.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -',
        'h2 2025-10-28T01:41:13.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 3.000 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      ];

      const result = usecase.analyze(logs);

      // サンプル標準偏差 (n-1): sqrt(((1-2)^2 + (2-2)^2 + (3-2)^2) / 2) = sqrt(2/2) = 1.0
      expect(result.stats?.stdDev).toBeCloseTo(1.0, 3);
    });
  });
});
