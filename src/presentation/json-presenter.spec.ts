/**
 * Presentation Layer: JSON Presenter Tests
 */

import { ALBLogEntry } from "@domain/alb-log-entry.entity";
import { AnalysisResult } from "@domain/analysis-result.entity";
import { beforeEach, describe, expect, it } from "vitest";
import { JsonPresenter } from "./json-presenter";

describe("JsonPresenter", () => {
  let presenter: JsonPresenter;

  beforeEach(() => {
    presenter = new JsonPresenter();
  });

  describe("format", () => {
    it("基本的なJSON出力ができること", () => {
      const entry = new ALBLogEntry(
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.500 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );
      const result = new AnalysisResult(
        [entry],
        new Map([["200", 1]]),
        new Map([["GET /test", 1]]),
        new Map([["203.0.113.10", 1]]),
        new Map([["GET", 1]]),
        [1.5],
        [],
        [],
        [],
        {
          min: 1.5,
          max: 1.5,
          mean: 1.5,
          median: 1.5,
          stdDev: 0.0,
        },
        []
      );

      const json = presenter.format(result);

      expect(json.summary.totalRequests).toBe(1);
      expect(json.summary.slowRequests).toBe(1);
      expect(json.responseTimeStats).not.toBeNull();
      expect(json.responseTimeStats?.min).toBe(1.5);
      expect(json.statusCodes["200"]).toBe(1);
      expect(json.httpMethods["GET"]).toBe(1);
    });

    it("複数のエントリを正しく処理できること", () => {
      const entries = [
        new ALBLogEntry(
          'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 2.000 0.000 200 200 58 231 "GET https://api.example.com:443/api/users HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
        ),
        new ALBLogEntry(
          'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 198.51.100.20:40743 10.0.1.100:3000 0.000 0.500 0.000 201 201 60 250 "POST https://api.example.com:443/api/users HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
        ),
      ];

      const result = new AnalysisResult(
        entries,
        new Map([
          ["200", 1],
          ["201", 1],
        ]),
        new Map([
          ["GET /api/users", 1],
          ["POST /api/users", 1],
        ]),
        new Map([
          ["203.0.113.10", 1],
          ["198.51.100.20", 1],
        ]),
        new Map([
          ["GET", 1],
          ["POST", 1],
        ]),
        [2.0, 0.5],
        [],
        [],
        [],
        {
          min: 0.5,
          max: 2.0,
          mean: 1.25,
          median: 1.25,
          stdDev: 0.75,
        },
        []
      );

      const json = presenter.format(result);

      expect(json.summary.totalRequests).toBe(2);
      expect(json.summary.slowRequests).toBe(1); // 2.0秒のみ
      expect(json.topEndpoints).toHaveLength(2);
      expect(json.topClientIPs).toHaveLength(2);
    });

    it("エラーとタイムアウトを含む結果を正しく処理できること", () => {
      const normalEntry = new ALBLogEntry(
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 0.500 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );
      const errorEntry = new ALBLogEntry(
        'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 203.0.113.10:40743 10.0.1.100:3000 0.000 0.500 0.000 500 500 58 231 "GET https://api.example.com:443/error HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );
      const timeoutEntry = new ALBLogEntry(
        'h2 2025-10-28T01:41:13.673240Z app/my-alb/abc123 203.0.113.10:40744 - 0.000 0.000 0.000 502 - 0 0 "GET https://api.example.com:443/timeout HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );

      const result = new AnalysisResult(
        [normalEntry, errorEntry, timeoutEntry],
        new Map([
          ["200", 1],
          ["500", 1],
          ["502", 1],
        ]),
        new Map([
          ["GET /test", 1],
          ["GET /error", 1],
          ["GET /timeout", 1],
        ]),
        new Map([["203.0.113.10", 3]]),
        new Map([["GET", 3]]),
        [0.5, 0.5],
        [errorEntry],
        [timeoutEntry],
        [],
        null,
        []
      );

      const json = presenter.format(result);

      expect(json.summary.totalRequests).toBe(3);
      expect(json.summary.errors).toBe(1);
      expect(json.summary.timeouts).toBe(1);
      expect(json.errors).toHaveLength(1);
      expect(json.errors[0].statusCode).toBe("500");
      expect(json.timeouts).toHaveLength(1);
      expect(json.timeouts[0].statusCode).toBe("502");
    });

    it("統計情報がnullの場合を正しく処理できること", () => {
      const entry = new ALBLogEntry(
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 0.500 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );
      const result = new AnalysisResult(
        [entry],
        new Map([["200", 1]]),
        new Map(),
        new Map(),
        new Map(),
        [0.5],
        [],
        [],
        [],
        null, // 統計情報なし
        []
      );

      const json = presenter.format(result);

      expect(json.responseTimeStats).toBeNull();
    });

    it("遅いリクエストが時間順にソートされること", () => {
      const entries = [
        new ALBLogEntry(
          'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.500 0.000 200 200 58 231 "GET https://api.example.com:443/test1 HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
        ),
        new ALBLogEntry(
          'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 203.0.113.10:40743 10.0.1.100:3000 0.000 3.000 0.000 200 200 58 231 "GET https://api.example.com:443/test2 HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
        ),
        new ALBLogEntry(
          'h2 2025-10-28T01:41:13.673240Z app/my-alb/abc123 203.0.113.10:40744 10.0.1.100:3000 0.000 2.000 0.000 200 200 58 231 "GET https://api.example.com:443/test3 HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
        ),
      ];

      const result = new AnalysisResult(
        entries,
        new Map([["200", 3]]),
        new Map(),
        new Map(),
        new Map(),
        [1.5, 3.0, 2.0],
        [],
        [],
        [],
        null,
        []
      );

      const json = presenter.format(result);

      expect(json.slowRequests).toHaveLength(3);
      expect(json.slowRequests[0].totalTime).toBe(3.0); // 最も遅い
      expect(json.slowRequests[1].totalTime).toBe(2.0);
      expect(json.slowRequests[2].totalTime).toBe(1.5);
    });

    it("エンドポイントとIPアドレスが上位10件に制限されること", () => {
      const entries = [];
      const endpointsMap = new Map<string, number>();
      const ipsMap = new Map<string, number>();

      // 15個のエンドポイントと15個のIPを生成
      for (let i = 0; i < 15; i++) {
        const entry = new ALBLogEntry(
          `h2 2025-10-28T01:41:${String(i).padStart(
            2,
            "0"
          )}.673240Z app/my-alb/abc123 192.168.1.${i}:40742 10.0.1.100:3000 0.000 0.500 0.000 200 200 58 231 "GET https://api.example.com:443/api/endpoint${i} HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -`
        );
        entries.push(entry);
        endpointsMap.set(`GET /api/endpoint${i}`, 1);
        ipsMap.set(`192.168.1.${i}`, 1);
      }

      const result = new AnalysisResult(
        entries,
        new Map([["200", 15]]),
        endpointsMap,
        ipsMap,
        new Map([["GET", 15]]),
        Array(15).fill(0.5),
        [],
        [],
        [],
        null,
        []
      );

      const json = presenter.format(result);

      expect(json.topEndpoints).toHaveLength(10); // 上位10件
      expect(json.topClientIPs).toHaveLength(10); // 上位10件
    });
  });
});
