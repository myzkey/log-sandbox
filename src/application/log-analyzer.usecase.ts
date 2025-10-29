/**
 * Application Layer: Log Analyzer Use Case
 */

import { ALBLogEntry } from '@domain/alb-log-entry.entity';
import { AnalysisResult, Stats, TimeAnalysisBucket } from '@domain/analysis-result.entity';

export class LogAnalyzerUseCase {
  analyze(lines: string[]): AnalysisResult {
    const entries: ALBLogEntry[] = [];
    const statusCodes = new Map<string, number>();
    const endpoints = new Map<string, number>();
    const clientIps = new Map<string, number>();
    const methods = new Map<string, number>();
    const responseTimes: number[] = [];
    const errors: ALBLogEntry[] = [];
    const timeouts: ALBLogEntry[] = [];
    const rejectedRequests: ALBLogEntry[] = [];

    // Process each line
    for (const line of lines) {
      if (!line.trim()) continue;

      const entry = new ALBLogEntry(line.trim());
      entries.push(entry);

      // Update counters
      this.incrementMap(statusCodes, entry.targetStatusCode);
      this.incrementMap(endpoints, `${entry.requestMethod} ${entry.requestPath}`);
      this.incrementMap(clientIps, entry.clientIp);
      this.incrementMap(methods, entry.requestMethod);

      // Only add valid response times (not timeouts or rejected)
      if (!entry.isTimeout && !entry.isRejected) {
        responseTimes.push(entry.totalTime);
      }

      // Track errors (4xx and 5xx) - but not rejected requests
      if ((entry.targetStatusCode.startsWith('4') || entry.targetStatusCode.startsWith('5')) && !entry.isRejected) {
        errors.push(entry);
      }

      // Track timeouts (502, 504)
      if (entry.isTimeout) {
        timeouts.push(entry);
      }

      // Track rejected requests (ALB-level rejections)
      if (entry.isRejected) {
        rejectedRequests.push(entry);
      }
    }

    // Calculate statistics
    const stats = this.calculateStats(responseTimes);
    const timeAnalysis = this.analyzeByTimeInterval(entries);

    return new AnalysisResult(
      entries,
      statusCodes,
      endpoints,
      clientIps,
      methods,
      responseTimes,
      errors,
      timeouts,
      rejectedRequests,
      stats,
      timeAnalysis
    );
  }

  private incrementMap(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) || 0) + 1);
  }

  private calculateStats(numbers: number[]): Stats | null {
    if (numbers.length === 0) return null;

    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    let stdDev = 0;
    if (numbers.length > 1) {
      const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
      stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / (numbers.length - 1));
    }

    return {
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      mean,
      median,
      stdDev
    };
  }

  private analyzeByTimeInterval(entries: ALBLogEntry[]): TimeAnalysisBucket[] {
    if (entries.length === 0) return [];

    const byMinute = new Map<string, {
      timestamp: string;
      count: number;
      responseTimes: number[];
      errors: number;
      timeouts: number;
      statusCodes: Record<string, number>;
    }>();

    entries.forEach(entry => {
      if (!entry.timestampDate || isNaN(entry.timestampDate.getTime())) return;

      const minuteKey = new Date(entry.timestampDate);
      minuteKey.setSeconds(0, 0);
      const key = minuteKey.toISOString().substring(0, 16);

      if (!byMinute.has(key)) {
        byMinute.set(key, {
          timestamp: key,
          count: 0,
          responseTimes: [],
          errors: 0,
          timeouts: 0,
          statusCodes: {}
        });
      }

      const bucket = byMinute.get(key)!;
      bucket.count++;

      if (!entry.isTimeout) {
        bucket.responseTimes.push(entry.totalTime);
      }

      if (entry.targetStatusCode.startsWith('4') || entry.targetStatusCode.startsWith('5')) {
        bucket.errors++;
      }

      if (entry.isTimeout) {
        bucket.timeouts++;
      }

      bucket.statusCodes[entry.targetStatusCode] = (bucket.statusCodes[entry.targetStatusCode] || 0) + 1;
    });

    const results = Array.from(byMinute.values()).map(bucket => {
      let avgResponseTime = 0;
      let maxResponseTime = 0;

      if (bucket.responseTimes.length > 0) {
        avgResponseTime = bucket.responseTimes.reduce((a, b) => a + b, 0) / bucket.responseTimes.length;
        maxResponseTime = Math.max(...bucket.responseTimes);
      }

      return {
        timestamp: bucket.timestamp,
        count: bucket.count,
        avgResponseTime,
        maxResponseTime,
        errors: bucket.errors,
        timeouts: bucket.timeouts,
        statusCodes: bucket.statusCodes
      };
    });

    return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
