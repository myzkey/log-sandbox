#!/usr/bin/env tsx
import { db } from '@alb-analyzer/db/client';
import { albLogs, awsProfiles } from '@alb-analyzer/db/schema';
import { ALBLogEntry } from '../domain/alb-log-entry';
import { sql } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import * as zlib from 'node:zlib';

async function readLogFile(filePath: string): Promise<string[]> {
  const lines: string[] = [];
  let fileStream: NodeJS.ReadableStream = fs.createReadStream(filePath);

  if (filePath.endsWith('.gz')) {
    fileStream = fileStream.pipe(zlib.createGunzip());
  }

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim() && !line.startsWith('#')) {
      lines.push(line.trim());
    }
  }

  return lines;
}

interface LogLine {
  line: string;
  awsProfile: string;
}

async function readLogsFromPath(logPath: string): Promise<LogLine[]> {
  const stats = fs.statSync(logPath);

  if (stats.isFile()) {
    // ファイルの場合、パスから awsProfile を抽出
    const awsProfile = extractAwsProfileFromPath(logPath);
    const lines = await readLogFile(logPath);
    return lines.map(line => ({ line, awsProfile }));
  } else if (stats.isDirectory()) {
    const allLinesWithProfile: LogLine[] = [];

    // ディレクトリを再帰的に処理
    await processDirectory(logPath, allLinesWithProfile);

    return allLinesWithProfile;
  }

  throw new Error(`Path ${logPath} is neither a file nor a directory`);
}

async function processDirectory(dirPath: string, result: LogLine[]): Promise<void> {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath, result);
    } else if (entry.isFile() && (entry.name.endsWith('.log') || entry.name.endsWith('.gz'))) {
      console.log(`Reading ${fullPath}...`);
      const awsProfile = extractAwsProfileFromPath(fullPath);
      const lines = await readLogFile(fullPath);
      result.push(...lines.map(line => ({ line, awsProfile })));
    }
  }
}

/**
 * ファイルパスから awsProfile を抽出
 * logs/{awsProfile}/{date}/... の形式を想定
 */
function extractAwsProfileFromPath(filePath: string): string {
  const parts = filePath.split(path.sep);
  const logsIndex = parts.indexOf('logs');

  if (logsIndex !== -1 && logsIndex + 1 < parts.length) {
    return parts[logsIndex + 1];
  }

  return 'default';
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
    const workspaceFile = path.join(currentDir, 'pnpm-workspace.yaml');
    if (fs.existsSync(workspaceFile)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

async function importLogsToDB(): Promise<void> {
  const args = process.argv.slice(2);
  let logPath = args[0] || './logs';

  // 相対パスの場合、モノレポルートを基準にする
  if (!path.isAbsolute(logPath)) {
    const monorepoRoot = findMonorepoRoot();
    if (monorepoRoot) {
      logPath = path.join(monorepoRoot, logPath);
    }
  }

  console.log(`Reading logs from ${logPath}...`);
  const logLines = await readLogsFromPath(logPath);
  console.log(`Found ${logLines.length} log lines`);

  // 使用されるプロファイルを収集して登録
  const uniqueProfiles = new Set<string>();
  for (const { awsProfile } of logLines) {
    uniqueProfiles.add(awsProfile);
  }

  console.log(`\nRegistering AWS profiles...`);
  for (const profile of uniqueProfiles) {
    await ensureProfileExists(profile);
  }

  console.log('\nParsing and inserting into database...');
  let insertedCount = 0;
  const batchSize = 100;
  const batch: typeof albLogs.$inferInsert[] = [];

  for (const { line, awsProfile } of logLines) {
    try {
      const entry = new ALBLogEntry(line);

      batch.push({
        awsProfile,
        type: entry.type,
        timestamp: entry.timestamp,
        elbName: entry.elbName,
        clientIp: entry.clientIp,
        clientPort: entry.clientPort,
        targetIp: entry.targetPort.split(':')[0] || null,
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
        await db.insert(albLogs).values(batch);
        insertedCount += batch.length;
        batch.length = 0;
        process.stdout.write(`\rInserted ${insertedCount} records...`);
      }
    } catch (error) {
      console.error('\nFailed to parse line:', error);
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    await db.insert(albLogs).values(batch);
    insertedCount += batch.length;
  }

  console.log(`\n\nSuccessfully imported ${insertedCount} records to database!`);
}

importLogsToDB().catch((error) => {
  console.error('Error importing logs:', error);
  process.exit(1);
});
