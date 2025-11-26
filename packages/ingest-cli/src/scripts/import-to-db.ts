#!/usr/bin/env tsx
import { db } from "@alb-analyzer/db/client";
import { albLogs, awsProfiles, importedFiles } from "@alb-analyzer/db/schema";
import { sql } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import * as zlib from "node:zlib";
import { ALBLogEntry } from "../domain/alb-log-entry";

/**
 * インポート済みファイルを取得（パス → サイズのMap）
 */
async function getImportedFiles(): Promise<Map<string, number>> {
  const files = await db
    .select({
      filePath: importedFiles.filePath,
      fileSize: importedFiles.fileSize,
    })
    .from(importedFiles);
  return new Map(files.map((f) => [f.filePath, f.fileSize]));
}

/**
 * ファイルをインポート済みとして記録（サイズ変更時は更新）
 */
async function markFileAsImported(
  filePath: string,
  fileSize: number,
  lineCount: number
): Promise<void> {
  await db
    .insert(importedFiles)
    .values({
      filePath,
      fileSize,
      lineCount,
      importedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: importedFiles.filePath,
      set: {
        fileSize,
        lineCount,
        importedAt: new Date().toISOString(),
      },
    });
}

async function readLogFile(filePath: string): Promise<string[]> {
  const lines: string[] = [];
  let fileStream: NodeJS.ReadableStream = fs.createReadStream(filePath);

  if (filePath.endsWith(".gz")) {
    fileStream = fileStream.pipe(zlib.createGunzip());
  }

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim() && !line.startsWith("#")) {
      lines.push(line.trim());
    }
  }

  return lines;
}

interface FileInfo {
  path: string;
  awsProfile: string;
  size: number;
}

async function collectLogFiles(
  dirPath: string,
  result: FileInfo[]
): Promise<void> {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await collectLogFiles(fullPath, result);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".log") || entry.name.endsWith(".gz"))
    ) {
      const awsProfile = extractAwsProfileFromPath(fullPath);
      const stats = fs.statSync(fullPath);
      result.push({ path: fullPath, awsProfile, size: stats.size });
    }
  }
}

/**
 * ファイルパスから awsProfile を抽出
 * logs/{awsProfile}/{date}/... の形式を想定
 */
function extractAwsProfileFromPath(filePath: string): string {
  const parts = filePath.split(path.sep);
  const logsIndex = parts.indexOf("logs");

  if (logsIndex !== -1 && logsIndex + 1 < parts.length) {
    return parts[logsIndex + 1];
  }

  return "default";
}

/**
 * AWS プロファイルを登録する（存在しない場合のみ）
 */
async function ensureProfileExists(profileName: string): Promise<void> {
  const existing = await db
    .select()
    .from(awsProfiles)
    .where(sql`${awsProfiles.name} = ${profileName}`)
    .limit(1);

  if (existing.length === 0) {
    await db.insert(awsProfiles).values({
      name: profileName,
      displayName: profileName.charAt(0).toUpperCase() + profileName.slice(1),
      description: `AWS Profile: ${profileName}`,
    });
    console.log(`  ✓ Registered new AWS profile: ${profileName}`);
  }
}

function findMonorepoRoot(): string | null {
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

async function processFile(
  file: FileInfo,
  batch: (typeof albLogs.$inferInsert)[],
  batchSize: number
): Promise<{ insertedCount: number; lineCount: number }> {
  const lines = await readLogFile(file.path);
  let insertedCount = 0;

  for (const line of lines) {
    try {
      const entry = new ALBLogEntry(line);

      batch.push({
        awsProfile: file.awsProfile,
        type: entry.type,
        timestamp: entry.timestamp,
        elbName: entry.elbName,
        clientIp: entry.clientIp,
        clientPort: entry.clientPort,
        targetIp: entry.targetPort.split(":")[0] || null,
        targetPort: entry.targetPort,
        requestProcessingTime: entry.requestProcessingTime,
        targetProcessingTime: entry.targetProcessingTime,
        responseProcessingTime: entry.responseProcessingTime,
        totalTime: entry.totalTime,
        elbStatusCode: entry.elbStatusCode,
        targetStatusCode: entry.targetStatusCode,
        isTimeout: entry.isTimeout,
        isRejected: entry.isRejected,
        receivedBytes: entry.receivedBytes,
        sentBytes: entry.sentBytes,
        requestMethod: entry.requestMethod,
        requestUrl: entry.requestUrl,
        requestPath: entry.requestPath,
        requestProtocol: entry.requestProtocol,
        userAgent: entry.userAgent,
        sslCipher: entry.sslCipher,
        sslProtocol: entry.sslProtocol,
        targetGroupArn: entry.targetGroupArn,
        traceId: entry.traceId,
        domainName: entry.domainName,
        rawLine: entry.rawLine,
      });

      if (batch.length >= batchSize) {
        await db.insert(albLogs).values(batch).onConflictDoNothing();
        insertedCount += batch.length;
        batch.length = 0;
      }
    } catch {
      // Skip invalid lines
    }
  }

  return { insertedCount, lineCount: lines.length };
}

/**
 * 全テーブルのレコードを削除
 */
async function resetDatabase(): Promise<void> {
  console.log("Resetting database...");
  await db.delete(albLogs);
  await db.delete(importedFiles);
  await db.delete(awsProfiles);
  console.log("✓ All records deleted\n");
}

async function importLogsToDB(): Promise<void> {
  const args = process.argv.slice(2);
  const forceImport = args.includes("--force");
  const resetDb = args.includes("--reset");
  const filteredArgs = args.filter((a) => !a.startsWith("--"));
  let logPath = filteredArgs[0] || "./logs";

  // --reset: 全レコード削除してからインポート
  if (resetDb) {
    await resetDatabase();
  }

  // 相対パスの場合、モノレポルートを基準にする
  if (!path.isAbsolute(logPath)) {
    const monorepoRoot = findMonorepoRoot();
    if (monorepoRoot) {
      logPath = path.join(monorepoRoot, logPath);
    }
  }

  console.log(`Scanning ${logPath} for log files...`);

  // ログファイルを収集
  const allFiles: FileInfo[] = [];
  const stats = fs.statSync(logPath);
  if (stats.isFile()) {
    const awsProfile = extractAwsProfileFromPath(logPath);
    allFiles.push({ path: logPath, awsProfile, size: stats.size });
  } else {
    await collectLogFiles(logPath, allFiles);
  }

  console.log(`Found ${allFiles.length} log files`);

  // インポート済みファイルを取得
  const importedFileMap = await getImportedFiles();

  // 新規または更新されたファイルのみフィルタ
  const newFiles = forceImport
    ? allFiles
    : allFiles.filter((f) => {
        const importedSize = importedFileMap.get(f.path);
        // 未インポート or サイズが変わった場合は対象
        return importedSize === undefined || importedSize !== f.size;
      });

  const skippedCount = allFiles.length - newFiles.length;
  if (skippedCount > 0) {
    console.log(`Skipping ${skippedCount} unchanged files`);
  }

  if (newFiles.length === 0) {
    console.log("No new files to import.");
    return;
  }

  console.log(`Importing ${newFiles.length} new files...`);

  // 使用されるプロファイルを収集して登録
  const uniqueProfiles = new Set(newFiles.map((f) => f.awsProfile));
  console.log(`\nRegistering AWS profiles...`);
  for (const profile of uniqueProfiles) {
    await ensureProfileExists(profile);
  }

  console.log("\nParsing and inserting into database...");
  let totalInserted = 0;
  const batchSize = 100;
  const batch: (typeof albLogs.$inferInsert)[] = [];

  for (let i = 0; i < newFiles.length; i++) {
    const file = newFiles[i];
    process.stdout.write(
      `\r[${i + 1}/${newFiles.length}] Processing ${path.basename(
        file.path
      )}...`
    );

    const { insertedCount, lineCount } = await processFile(
      file,
      batch,
      batchSize
    );
    totalInserted += insertedCount;

    // バッチの残りをフラッシュしてファイルを記録
    if (batch.length > 0) {
      await db.insert(albLogs).values(batch).onConflictDoNothing();
      totalInserted += batch.length;
      batch.length = 0;
    }

    // インポート済みとして記録
    await markFileAsImported(file.path, file.size, lineCount);
  }

  console.log(
    `\n\nImported ${totalInserted} records from ${newFiles.length} files.`
  );
}

importLogsToDB().catch((error) => {
  console.error("Error importing logs:", error);
  process.exit(1);
});
