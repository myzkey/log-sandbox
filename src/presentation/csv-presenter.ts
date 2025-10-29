/**
 * Presentation: CSV Presenter
 */

import type { AnalysisResult } from '@domain/analysis-result.entity';

export class CsvPresenter {
  format(result: AnalysisResult): string {
    let csv = 'Timestamp,Method,Path,Status Code,Client IP,Request Processing Time,Target Processing Time,Response Processing Time,Total Time,Is Timeout\n';

    for (const entry of result.entries) {
      const row = [
        entry.timestamp,
        entry.requestMethod,
        `"${entry.requestPath.replace(/"/g, '""')}"`,
        entry.targetStatusCode,
        entry.clientIp,
        entry.requestProcessingTime,
        entry.targetProcessingTime,
        entry.responseProcessingTime,
        entry.totalTime,
        entry.isTimeout ? 'true' : 'false'
      ];
      csv += `${row.join(',')  }\n`;
    }

    return csv;
  }
}
