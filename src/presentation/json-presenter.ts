/**
 * Presentation: JSON Presenter
 */

import { AnalysisResult } from '@domain/analysis-result.entity';

export class JsonPresenter {
  format(result: AnalysisResult): any {
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
      trafficByMinute: result.timeAnalysis
    };
  }

  private sortMapByValue<K>(map: ReadonlyMap<K, number>, limit: number | null): [K, number][] {
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return limit ? sorted.slice(0, limit) : sorted;
  }
}
