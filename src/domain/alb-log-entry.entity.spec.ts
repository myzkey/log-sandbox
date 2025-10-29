/**
 * Domain Layer: ALB Log Entry Entity Tests
 */

import { describe, it, expect } from 'vitest';
import { ALBLogEntry } from './alb-log-entry.entity';

describe('ALBLogEntry', () => {
  const sampleLogLine = 'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123def456 203.0.113.10:40742 10.0.1.100:3000 0.002 0.526 0.000 204 204 58 231 "OPTIONS https://api.example.com:443/v1/services/123/items/456/location HTTP/2.0" "Mozilla/5.0" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:ap-northeast-1:123456789012:targetgroup/my-target-group/abc123 "Root=1-69001f37-621bfadc46ed205510eacd15" "api.example.com" "arn:aws:acm:ap-northeast-1:123456789012:certificate/abc-123-def-456" 1 2025-10-28T01:41:11.145000Z "forward" "-" "-" "10.0.1.100:3000" "204" "-" "-" TID_abc123def456 "-" "-" "-"';

  describe('parse', () => {
    it('正常なログ行をパースできること', () => {
      const entry = new ALBLogEntry(sampleLogLine);

      expect(entry.type).toBe('h2');
      expect(entry.timestamp).toBe('2025-10-28T01:41:11.673240Z');
      expect(entry.elbName).toBe('app/my-alb/abc123def456');
      expect(entry.clientIp).toBe('203.0.113.10'); // ポート番号は除かれる
      // targetIpプロパティは存在しない。clientPortとtargetPortがある
      expect(entry.requestProcessingTime).toBe(0.002);
      expect(entry.targetProcessingTime).toBe(0.526);
      expect(entry.responseProcessingTime).toBe(0.000);
      expect(entry.elbStatusCode).toBe('204');
      expect(entry.targetStatusCode).toBe('204');
      expect(entry.requestMethod).toBe('OPTIONS');
      expect(entry.requestUrl).toBe('https://api.example.com:443/v1/services/123/items/456/location');
      expect(entry.requestPath).toBe('/v1/services/123/items/456/location');
      expect(entry.requestProtocol).toBe('HTTP/2.0');
    });

    it('タイムアウトを正しく判定すること', () => {
      const timeoutLog = 'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 -1 -1 -1 504 504 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -';
      const entry = new ALBLogEntry(timeoutLog);

      expect(entry.isTimeout).toBe(true);
      expect(entry.requestProcessingTime).toBe(-1);
      expect(entry.targetProcessingTime).toBe(-1);
      expect(entry.responseProcessingTime).toBe(-1);
    });

    it('合計時間を正しく計算すること', () => {
      const entry = new ALBLogEntry(sampleLogLine);

      expect(entry.totalTime).toBe(0.528); // 0.002 + 0.526 + 0.000
    });

    it('リクエストパスを正しく抽出すること', () => {
      const entry = new ALBLogEntry(sampleLogLine);

      expect(entry.requestPath).toBe('/v1/services/123/items/456/location');
    });

    it('メソッドとパスを正しく抽出すること', () => {
      const entry = new ALBLogEntry(sampleLogLine);

      expect(entry.requestMethod).toBe('OPTIONS');
      expect(entry.requestPath).toBe('/v1/services/123/items/456/location');
    });

    it('timestampDateが正しく生成されること', () => {
      const entry = new ALBLogEntry(sampleLogLine);

      expect(entry.timestampDate).toBeInstanceOf(Date);
      expect(entry.timestampDate?.getFullYear()).toBe(2025);
      expect(entry.timestampDate?.getMonth()).toBe(9); // 0-indexed (October)
      expect(entry.timestampDate?.getDate()).toBe(28);
    });
  });

  describe('エッジケース', () => {
    it('クエリパラメータ付きのURLを正しくパースすること', () => {
      const logWithQuery = 'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.002 0.526 0.000 200 200 58 231 "GET https://api.example.com:443/test?foo=bar&baz=qux HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -';
      const entry = new ALBLogEntry(logWithQuery);

      expect(entry.requestPath).toBe('/test?foo=bar&baz=qux');
    });

    it('ポート番号なしのURLを正しくパースすること', () => {
      const logWithoutPort = 'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.002 0.526 0.000 200 200 58 231 "GET https://api.example.com/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -';
      const entry = new ALBLogEntry(logWithoutPort);

      expect(entry.requestUrl).toBe('https://api.example.com/test');
      expect(entry.requestPath).toBe('/test');
    });

    it('空のログ行を処理できること', () => {
      const entry = new ALBLogEntry('');

      expect(entry.type).toBe('');
      expect(entry.timestamp).toBe('');
    });
  });
});
