/**
 * Infrastructure: Configuration Loader
 */

import * as fs from "fs";
import * as path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface AppConfig {
  awsProfile: string;
  s3Bucket: string;
  s3Prefix: string;
  awsAccountId: string;
  region: string;
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * 設定を読み込む
   * @param configPath 設定ファイルのパス（オプション）
   * 優先順位: 指定されたconfigPath > 環境変数 > config.json > config.example.json
   */
  load(configPath?: string): AppConfig {
    // 指定されたパスがある場合は、キャッシュを無視して読み込む
    if (configPath) {
      const resolvedPath = this.resolveConfigPath(configPath);
      return this.loadFromFile(resolvedPath);
    }

    // キャッシュがある場合は返す
    if (this.config) {
      return this.config;
    }

    // 環境変数から読み込み
    if (this.hasAllEnvVars()) {
      this.config = this.loadFromEnv();
      return this.config;
    }

    // config.jsonから読み込み
    const defaultConfigPath = this.findConfigFile();
    if (defaultConfigPath) {
      this.config = this.loadFromFile(defaultConfigPath);
      return this.config;
    }

    throw new Error(
      "設定ファイルが見つかりません。config.example.jsonをconfig.jsonにコピーして設定してください。\n" +
        "または、以下の環境変数を設定してください:\n" +
        "  AWS_PROFILE, S3_BUCKET, S3_PREFIX, AWS_ACCOUNT_ID, AWS_REGION"
    );
  }

  /**
   * 指定された設定ファイルパスを解決する
   * 相対パスの場合、モノレポルートからの相対パスとして解決を試みる
   */
  private resolveConfigPath(configPath: string): string {
    // 絶対パスの場合はそのまま返す
    if (path.isAbsolute(configPath)) {
      return configPath;
    }

    // 相対パスの場合、まずカレントディレクトリから解決
    const fromCwd = path.join(process.cwd(), configPath);
    if (fs.existsSync(fromCwd)) {
      return fromCwd;
    }

    // モノレポルートから解決を試みる
    const monorepoRoot = this.findMonorepoRoot();
    if (monorepoRoot) {
      const fromMonorepoRoot = path.join(monorepoRoot, configPath);
      if (fs.existsSync(fromMonorepoRoot)) {
        return fromMonorepoRoot;
      }
    }

    // どちらでも見つからない場合は、元のパスを返す（エラーは loadFromFile で発生）
    return configPath;
  }

  /**
   * 環境変数から設定を読み込み
   */
  private loadFromEnv(): AppConfig {
    return {
      awsProfile: process.env.AWS_PROFILE ?? "",
      s3Bucket: process.env.S3_BUCKET ?? "",
      s3Prefix: process.env.S3_PREFIX ?? "",
      awsAccountId: process.env.AWS_ACCOUNT_ID ?? "",
      region: process.env.AWS_REGION ?? "ap-northeast-1",
    };
  }

  /**
   * ファイルから設定を読み込み
   */
  private loadFromFile(filePath: string): AppConfig {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const config = JSON.parse(content);

      // 必須フィールドの検証
      this.validateConfig(config);

      return config;
    } catch (error) {
      throw new Error(
        `設定ファイルの読み込みに失敗しました: ${(error as Error).message}`
      );
    }
  }

  /**
   * 設定ファイルを探す
   */
  private findConfigFile(): string | null {
    // モノレポのルートディレクトリを探す
    const monorepoRoot = this.findMonorepoRoot();

    const possiblePaths = [
      // カレントディレクトリ
      path.join(process.cwd(), "config.json"),
      path.join(process.cwd(), "config.example.json"),
      // モノレポルート
      ...(monorepoRoot
        ? [
            path.join(monorepoRoot, "config.json"),
            path.join(monorepoRoot, "config.example.json"),
          ]
        : []),
      // パッケージディレクトリからの相対パス
      path.join(__dirname, "../../../config.json"),
      path.join(__dirname, "../../../config.example.json"),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * モノレポのルートディレクトリを探す
   * pnpm-workspace.yaml があるディレクトリをルートとみなす
   */
  private findMonorepoRoot(): string | null {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const workspaceFile = path.join(currentDir, "pnpm-workspace.yaml");
      if (fs.existsSync(workspaceFile)) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * すべての環境変数が設定されているかチェック
   */
  private hasAllEnvVars(): boolean {
    return !!(
      process.env.AWS_PROFILE &&
      process.env.S3_BUCKET &&
      process.env.S3_PREFIX &&
      process.env.AWS_ACCOUNT_ID
    );
  }

  /**
   * 設定の検証
   */
  private validateConfig(config: AppConfig): void {
    const requiredFields: (keyof AppConfig)[] = [
      "awsProfile",
      "s3Bucket",
      "s3Prefix",
      "awsAccountId",
      "region",
    ];

    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`設定ファイルに必須フィールド「${field}」がありません`);
      }
    }
  }
}
