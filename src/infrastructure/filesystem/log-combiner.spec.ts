/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Infrastructure Layer: Log Combiner Tests
 */

import * as fs from "fs";
import * as path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogCombiner } from "./log-combiner";

// fs モジュールをモック
vi.mock("fs");

describe("LogCombiner", () => {
  let combiner: LogCombiner;

  beforeEach(() => {
    combiner = new LogCombiner();
    vi.clearAllMocks();
  });

  describe("getGzipFiles", () => {
    it("指定ディレクトリの.gzファイルを取得すること", () => {
      const mockFiles = ["file1.gz", "file2.gz", "file3.txt", "file4.log"];

      vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as any);
      vi.mocked(fs.statSync).mockReturnValue({
        isFile: () => true,
      } as any);

      const result = combiner.getGzipFiles("/test/dir");

      expect(result).toEqual([
        path.join("/test/dir", "file1.gz"),
        path.join("/test/dir", "file2.gz"),
      ]);
    });

    it("ディレクトリを除外すること", () => {
      const mockFiles = ["file1.gz", "subdir"];

      vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as any);
      vi.mocked(fs.statSync).mockImplementation((filePath) => {
        if (filePath.toString().endsWith("subdir")) {
          return { isFile: () => false } as any;
        }
        return { isFile: () => true } as any;
      });

      const result = combiner.getGzipFiles("/test/dir");

      expect(result).toEqual([path.join("/test/dir", "file1.gz")]);
    });

    it("空のディレクトリを処理できること", () => {
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const result = combiner.getGzipFiles("/test/dir");

      expect(result).toEqual([]);
    });
  });

  describe("isAlreadyCombined", () => {
    it("ファイルが存在する場合trueを返すこと", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = combiner.isAlreadyCombined("/test/combined.log");

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith("/test/combined.log");
    });

    it("ファイルが存在しない場合falseを返すこと", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = combiner.isAlreadyCombined("/test/combined.log");

      expect(result).toBe(false);
    });
  });
});
