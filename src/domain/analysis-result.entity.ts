/**
 * Domain Entity: Analysis Result
 */

import type { ALBLogEntry } from './alb-log-entry.entity';

export interface Stats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
}

export interface TimeAnalysisBucket {
  timestamp: string;
  count: number;
  avgResponseTime: number;
  maxResponseTime: number;
  errors: number;
  timeouts: number;
  statusCodes: Record<string, number>;
}

export class AnalysisResult {
  constructor(
    public readonly entries: ReadonlyArray<ALBLogEntry>,
    public readonly statusCodes: ReadonlyMap<string, number>,
    public readonly endpoints: ReadonlyMap<string, number>,
    public readonly clientIps: ReadonlyMap<string, number>,
    public readonly methods: ReadonlyMap<string, number>,
    public readonly responseTimes: ReadonlyArray<number>,
    public readonly errors: ReadonlyArray<ALBLogEntry>,
    public readonly timeouts: ReadonlyArray<ALBLogEntry>,
    public readonly rejectedRequests: ReadonlyArray<ALBLogEntry>,
    public readonly stats: Stats | null,
    public readonly timeAnalysis: ReadonlyArray<TimeAnalysisBucket>
  ) {}
}
