/**
 * Presentation: JSON Presenter
 */

import type { AnalysisResult } from '@domain/analysis-result.entity';

interface JsonOutput {
  summary: {
    totalRequests: number;
    timeouts: number;
    errors: number;
    slowRequests: number;
  };
  responseTimeStats: {
    requestsAnalyzed: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  } | null;
  statusCodes: Record<string, number>;
  httpMethods: Record<string, number>;
  topEndpoints: Array<{ endpoint: string; count: number; percentage: string }>;
  topClientIPs: Array<{ ip: string; count: number; percentage: string }>;
  timeouts: Array<{
    timestamp: string;
    statusCode: string;
    method: string;
    path: string;
    clientIp: string;
  }>;
  errors: Array<{
    timestamp: string;
    statusCode: string;
    method: string;
    path: string;
    clientIp: string;
  }>;
  slowRequests: Array<{
    timestamp: string;
    method: string;
    path: string;
    statusCode: string;
    clientIp: string;
    totalTime: number;
    requestProcessingTime: number;
    targetProcessingTime: number;
    responseProcessingTime: number;
  }>;
  trafficByMinute: Array<{
    timestamp: string;
    count: number;
    avgResponseTime: number;
    maxResponseTime: number;
    errors: number;
    timeouts: number;
    statusCodes: Record<string, number>;
  }>;
}

export class JsonPresenter {
  format(result: AnalysisResult): JsonOutput {
    return {
      summary: {
        totalRequests: result.entries.length,
        timeouts: result.timeouts.length,
        errors: result.errors.length,
        slowRequests: result.entries.filter(e => e.totalTime > 1.0).length
      },
      responseTimeStats: result.stats ? {
        requestsAnalyzed: result.responseTimes.length,
        min: result.stats.min,
        max: result.stats.max,
        mean: result.stats.mean,
        median: result.stats.median,
        stdDev: result.stats.stdDev
      } : null,
      statusCodes: Object.fromEntries(result.statusCodes),
      httpMethods: Object.fromEntries(result.methods),
      topEndpoints: this.sortMapByValue(result.endpoints, 10).map(([endpoint, count]) => ({
        endpoint,
        count,
        percentage: ((count / result.entries.length) * 100).toFixed(1)
      })),
      topClientIPs: this.sortMapByValue(result.clientIps, 10).map(([ip, count]) => ({
        ip,
        count,
        percentage: ((count / result.entries.length) * 100).toFixed(1)
      })),
      timeouts: result.timeouts.map(entry => ({
        timestamp: entry.timestamp,
        statusCode: entry.elbStatusCode,
        method: entry.requestMethod,
        path: entry.requestPath,
        clientIp: entry.clientIp
      })),
      errors: result.errors.map(entry => ({
        timestamp: entry.timestamp,
        statusCode: entry.targetStatusCode,
        method: entry.requestMethod,
        path: entry.requestPath,
        clientIp: entry.clientIp
      })),
      slowRequests: result.entries
        .filter(e => e.totalTime > 1.0)
        .sort((a, b) => b.totalTime - a.totalTime)
        .map(entry => ({
          timestamp: entry.timestamp,
          method: entry.requestMethod,
          path: entry.requestPath,
          statusCode: entry.targetStatusCode,
          clientIp: entry.clientIp,
          totalTime: entry.totalTime,
          requestProcessingTime: entry.requestProcessingTime,
          targetProcessingTime: entry.targetProcessingTime,
          responseProcessingTime: entry.responseProcessingTime
        })),
      trafficByMinute: result.timeAnalysis.map(bucket => ({
        timestamp: bucket.timestamp,
        count: bucket.count,
        avgResponseTime: bucket.avgResponseTime,
        maxResponseTime: bucket.maxResponseTime,
        errors: bucket.errors,
        timeouts: bucket.timeouts,
        statusCodes: bucket.statusCodes
      }))
    };
  }

  private sortMapByValue<K>(map: ReadonlyMap<K, number>, limit: number | null): [K, number][] {
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return limit ? sorted.slice(0, limit) : sorted;
  }
}
