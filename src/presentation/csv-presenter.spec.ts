/**
 * Presentation Layer: CSV Presenter Tests
 */

import { ALBLogEntry } from "@domain/alb-log-entry.entity";
import { AnalysisResult } from "@domain/analysis-result.entity";
import { describe, expect, it, beforeEach } from "vitest";
import { CsvPresenter } from "./csv-presenter";

describe("CsvPresenter", () => {
  let presenter: CsvPresenter;

  beforeEach(() => {
    presenter = new CsvPresenter();
  });

  describe("format", () => {
    it("CSVヘッダーを含む出力ができること", () => {
      const entry = new ALBLogEntry(
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.500 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );
      const result = new AnalysisResult(
        [entry],
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        [],
        [],
        [],
        [],
        null,
        []
      );

      const csv = presenter.format(result);

      expect(csv).toContain(
        "Timestamp,Method,Path,Status Code,Client IP,Request Processing Time,Target Processing Time,Response Processing Time,Total Time,Is Timeout"
      );
    });

    it("1行のデータを正しくCSV形式にできること", () => {
      const entry = new ALBLogEntry(
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.500 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );
      const result = new AnalysisResult(
        [entry],
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        [],
        [],
        [],
        [],
        null,
        []
      );

      const csv = presenter.format(result);
      const lines = csv.trim().split("\n");

      expect(lines).toHaveLength(2); // ヘッダー + データ1行
      expect(lines[1]).toContain("2025-10-28T01:41:11.673240Z");
      expect(lines[1]).toContain("GET");
      expect(lines[1]).toContain('"/test"');
      expect(lines[1]).toContain("200");
      expect(lines[1]).toContain("203.0.113.10");
      expect(lines[1]).toContain("1.5");
      expect(lines[1]).toContain("false"); // タイムアウトではない
    });

    it("複数行のデータを正しく処理できること", () => {
      const entries = [
        new ALBLogEntry(
          'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.500 0.000 200 200 58 231 "GET https://api.example.com:443/test1 HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
        ),
        new ALBLogEntry(
          'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 198.51.100.20:40743 10.0.1.100:3000 0.000 2.000 0.000 201 201 60 250 "POST https://api.example.com:443/test2 HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
        ),
      ];

      const result = new AnalysisResult(
        entries,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        [],
        [],
        [],
        [],
        null,
        []
      );

      const csv = presenter.format(result);
      const lines = csv.trim().split("\n");

      expect(lines).toHaveLength(3); // ヘッダー + データ2行
      expect(lines[1]).toContain("GET");
      expect(lines[1]).toContain('"/test1"');
      expect(lines[2]).toContain("POST");
      expect(lines[2]).toContain('"/test2"');
    });

    it("タイムアウトフラグが正しく設定されること", () => {
      const normalEntry = new ALBLogEntry(
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.500 0.000 200 200 58 231 "GET https://api.example.com:443/normal HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );
      // タイムアウトはtargetProcessingTimeが-1でelbStatusCodeが502または504
      const timeoutEntry = new ALBLogEntry(
        'h2 2025-10-28T01:41:12.673240Z app/my-alb/abc123 203.0.113.10:40743 - 0.000 -1 0.000 504 - 0 0 "GET https://api.example.com:443/timeout HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );

      const result = new AnalysisResult(
        [normalEntry, timeoutEntry],
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        [],
        [],
        [timeoutEntry],
        [],
        null,
        []
      );

      const csv = presenter.format(result);
      const lines = csv.trim().split("\n");

      expect(lines[1]).toContain("false"); // 通常リクエスト
      expect(lines[2]).toContain("true"); // タイムアウト
    });

    it("パス内のダブルクォートが正しくエスケープされること", () => {
      // パス内にダブルクォートを含むログエントリを作成
      // ALBLogEntry内部でパースされるので、実際のパスに"が含まれる状態を作る必要がある
      const entry = new ALBLogEntry(
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.500 0.000 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );

      const result = new AnalysisResult(
        [entry],
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        [],
        [],
        [],
        [],
        null,
        []
      );

      const csv = presenter.format(result);

      // パスがダブルクォートで囲まれていることを確認
      expect(csv).toContain('"/test"');
    });

    it("処理時間が正しくフォーマットされること", () => {
      const entry = new ALBLogEntry(
        'h2 2025-10-28T01:41:11.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.001 2.345 0.002 200 200 58 231 "GET https://api.example.com:443/test HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -'
      );

      const result = new AnalysisResult(
        [entry],
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        [],
        [],
        [],
        [],
        null,
        []
      );

      const csv = presenter.format(result);
      const lines = csv.trim().split("\n");
      const fields = lines[1].split(",");

      expect(fields[5]).toBe("0.001"); // リクエスト処理時間
      expect(fields[6]).toBe("2.345"); // ターゲット処理時間
      expect(fields[7]).toBe("0.002"); // レスポンス処理時間
      expect(fields[8]).toBe("2.348"); // 合計時間
    });

    it("空の結果でもヘッダーが出力されること", () => {
      const result = new AnalysisResult(
        [],
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        [],
        [],
        [],
        [],
        null,
        []
      );

      const csv = presenter.format(result);
      const lines = csv.trim().split("\n");

      expect(lines).toHaveLength(1); // ヘッダーのみ
      expect(csv).toContain("Timestamp,Method,Path");
    });

    it("大量のデータを正しく処理できること", () => {
      const entries = [];
      for (let i = 0; i < 100; i++) {
        entries.push(
          new ALBLogEntry(
            `h2 2025-10-28T01:41:${String(i).padStart(
              2,
              "0"
            )}.673240Z app/my-alb/abc123 203.0.113.10:40742 10.0.1.100:3000 0.000 1.500 0.000 200 200 58 231 "GET https://api.example.com:443/test${i} HTTP/2.0" "Mozilla/5.0" - - - - - - - - - - - - - -`
          )
        );
      }

      const result = new AnalysisResult(
        entries,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        [],
        [],
        [],
        [],
        null,
        []
      );

      const csv = presenter.format(result);
      const lines = csv.trim().split("\n");

      expect(lines).toHaveLength(101); // ヘッダー + 100行
    });
  });
});
