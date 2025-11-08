#!/usr/bin/env tsx
import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { ALBLogEntry } from '../domain/alb-log-entry';
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

async function readLogsFromPath(logPath: string): Promise<string[]> {
  const stats = fs.statSync(logPath);

  if (stats.isFile()) {
    return readLogFile(logPath);
  } else if (stats.isDirectory()) {
    const allLines: string[] = [];
    const files = fs.readdirSync(logPath);

    for (const file of files) {
      const filePath = path.join(logPath, file);
      if (fs.statSync(filePath).isFile()) {
        console.log(`Reading ${filePath}...`);
        const lines = await readLogFile(filePath);
        allLines.push(...lines);
      }
    }

    return allLines;
  }

  throw new Error(`Path ${logPath} is neither a file nor a directory`);
}

async function importLogsToDB(): Promise<void> {
  const args = process.argv.slice(2);
  const logPath = args[0] || './logs';

  console.log(`Reading logs from ${logPath}...`);
  const lines = await readLogsFromPath(logPath);
  console.log(`Found ${lines.length} log lines`);

  console.log('Parsing and inserting into database...');
  let insertedCount = 0;
  const batchSize = 100;
  const batch: typeof albLogs.$inferInsert[] = [];

  for (const line of lines) {
    try {
      const entry = new ALBLogEntry(line);

      batch.push({
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
