/**
 * Presentation: Console Presenter
 */

import { AnalysisResult } from '@domain/analysis-result.entity';

export interface PresentationOptions {
  slowRequestLimit?: number | null;
  slowRequestThreshold?: number;
}

export class ConsolePresenter {
  present(result: AnalysisResult, options: PresentationOptions = {}): void {
    if (result.entries.length === 0) {
      console.log('ログエントリが見つかりませんでした。');
      return;
    }

    const slowRequestLimit = options.slowRequestLimit !== undefined ? options.slowRequestLimit : 100;
    const slowRequestThreshold = options.slowRequestThreshold || 1.0;

    console.log('='.repeat(80));
    console.log('ALBログ分析サマリー');
    console.log('='.repeat(80));
    console.log();

    // Basic statistics
    console.log(`総リクエスト数: ${result.entries.length}`);
    if (result.timeouts.length > 0) {
      console.log(`タイムアウト: ${result.timeouts.length} (${((result.timeouts.length / result.entries.length) * 100).toFixed(1)}%)`);
    }
    if (result.rejectedRequests.length > 0) {
      console.log(`拒否されたリクエスト: ${result.rejectedRequests.length} (${((result.rejectedRequests.length / result.entries.length) * 100).toFixed(1)}%)`);
    }
    console.log();

    // Response time statistics
    if (result.responseTimes.length > 0 && result.stats) {
      console.log('レスポンスタイム統計(秒):');
      console.log(`  分析対象リクエスト: ${result.responseTimes.length} (タイムアウト・拒否を除く)`);
      console.log(`  最小値:     ${result.stats.min.toFixed(4)}`);
      console.log(`  最大値:     ${result.stats.max.toFixed(4)}`);
      console.log(`  平均値:    ${result.stats.mean.toFixed(4)}`);
      console.log(`  中央値:  ${result.stats.median.toFixed(4)}`);
      if (result.responseTimes.length > 1) {
        console.log(`  標準偏差:  ${result.stats.stdDev.toFixed(4)}`);
      }
      console.log();
    }

    // Status code distribution
    console.log('ステータスコード分布:');
    const sortedStatusCodes = this.sortMapByValue(result.statusCodes, null);
    for (const [code, count] of sortedStatusCodes) {
      const percentage = (count / result.entries.length) * 100;
      console.log(`  ${code}: ${count.toString().padStart(6)} (${percentage.toFixed(1).padStart(5)}%)`);
    }
    console.log();

    // HTTP methods
    console.log('HTTPメソッド:');
    const sortedMethods = this.sortMapByValue(result.methods, null);
    for (const [method, count] of sortedMethods) {
      const percentage = (count / result.entries.length) * 100;
      console.log(`  ${method}: ${count.toString().padStart(6)} (${percentage.toFixed(1).padStart(5)}%)`);
    }
    console.log();

    // Top endpoints
    console.log('トップ10エンドポイント:');
    const topEndpoints = this.sortMapByValue(result.endpoints, 10);
    for (const [endpoint, count] of topEndpoints) {
      const percentage = (count / result.entries.length) * 100;
      console.log(`  ${endpoint}`);
      console.log(`    件数: ${count} (${percentage.toFixed(1)}%)`);
    }
    console.log();

    // Top client IPs
    console.log('トップ10クライアントIP:');
    const topIPs = this.sortMapByValue(result.clientIps, 10);
    for (const [ip, count] of topIPs) {
      const percentage = (count / result.entries.length) * 100;
      console.log(`  ${ip}: ${count.toString().padStart(6)} (${percentage.toFixed(1).padStart(5)}%)`);
    }
    console.log();

    // Timeouts
    if (result.timeouts.length > 0) {
      console.log(`タイムアウトエラー（502/504）: ${result.timeouts.length}`);
      console.log('\nタイムアウト詳細:');
      for (let i = 0; i < Math.min(10, result.timeouts.length); i++) {
        const entry = result.timeouts[i];
        console.log(`  ${i + 1}. [${entry.timestamp}] ${entry.elbStatusCode} - ${entry.requestMethod} ${entry.requestPath}`);
        console.log(`     クライアント: ${entry.clientIp}`);
      }
      console.log();
    }

    // Rejected requests
    if (result.rejectedRequests.length > 0) {
      console.log(`拒否されたリクエスト（ALBレベル）: ${result.rejectedRequests.length}`);
      console.log('\n拒否リクエスト詳細:');
      for (let i = 0; i < Math.min(10, result.rejectedRequests.length); i++) {
        const entry = result.rejectedRequests[i];
        console.log(`  ${i + 1}. [${entry.timestamp}] ${entry.elbStatusCode} - ${entry.requestMethod} ${entry.requestPath}`);
        console.log(`     クライアント: ${entry.clientIp}`);
      }
      console.log();
    }

    // Errors
    if (result.errors.length > 0) {
      console.log(`エラー検出: ${result.errors.length}`);
      console.log('\nエラー詳細（最初の10件）:');
      for (let i = 0; i < Math.min(10, result.errors.length); i++) {
        const entry = result.errors[i];
        console.log(`  ${i + 1}. [${entry.timestamp}] ${entry.targetStatusCode} - ${entry.requestMethod} ${entry.requestPath}`);
        console.log(`     クライアント: ${entry.clientIp}`);
      }
      console.log();
    }

    // Slow requests
    const slowRequests = result.entries.filter(e => e.totalTime > slowRequestThreshold);
    if (slowRequests.length > 0) {
      const sorted = [...slowRequests].sort((a, b) => b.totalTime - a.totalTime);
      const displayLimit = slowRequestLimit ? Math.min(slowRequestLimit, sorted.length) : sorted.length;

      const slowTitle = slowRequestThreshold !== 1.0
        ? `遅いリクエスト（>${slowRequestThreshold}秒）`
        : '遅いリクエスト（>1秒）';

      console.log(`${slowTitle}: ${slowRequests.length}`);
      if (slowRequestLimit && slowRequests.length > slowRequestLimit) {
        console.log(`（上位${slowRequestLimit}件を表示）`);
      }
      console.log('\n詳細な遅いレスポンス一覧:');
      console.log('-'.repeat(80));

      for (let i = 0; i < displayLimit; i++) {
        const entry = sorted[i];
        console.log(`\n${i + 1}. 合計: ${entry.totalTime.toFixed(3)}s`);
        console.log(`   タイムスタンプ: ${entry.timestamp}`);
        console.log(`   メソッド:    ${entry.requestMethod} ${entry.requestPath}`);
        console.log(`   ステータス:    ${entry.targetStatusCode}`);
        console.log(`   クライアントIP: ${entry.clientIp}`);
        console.log('   時間内訳:');
        console.log(`     - リクエスト処理:  ${entry.requestProcessingTime.toFixed(3)}s`);
        console.log(`     - ターゲット処理:   ${entry.targetProcessingTime.toFixed(3)}s`);
        console.log(`     - レスポンス処理: ${entry.responseProcessingTime.toFixed(3)}s`);

        const times = {
          'リクエスト処理': entry.requestProcessingTime,
          'ターゲット処理': entry.targetProcessingTime,
          'レスポンス処理': entry.responseProcessingTime
        };
        const bottleneck = Object.entries(times).reduce((a, b) => a[1] > b[1] ? a : b);
        if (bottleneck[1] > 0.1) {
          console.log(`   ボトルネック: ${bottleneck[0]} (${bottleneck[1].toFixed(3)}s)`);
        }
      }
      console.log('\n' + '-'.repeat(80));
      console.log();
    }

    // Time-based analysis
    console.log('分単位のリクエストトラフィック:');
    console.log('='.repeat(80));

    if (result.timeAnalysis.length > 0) {
      console.log('\n時刻         | リクエスト | 平均(秒) | 最大(秒) | エラー | タイムアウト');
      console.log('-'.repeat(75));

      for (const bucket of result.timeAnalysis) {
        const time = bucket.timestamp.substring(11);
        const count = bucket.count.toString().padStart(4);
        const avg = bucket.avgResponseTime > 0 ? bucket.avgResponseTime.toFixed(3).padStart(6) : '  N/A';
        const max = bucket.maxResponseTime > 0 ? bucket.maxResponseTime.toFixed(3).padStart(6) : '  N/A';
        const errors = bucket.errors.toString().padStart(6);
        const timeouts = bucket.timeouts.toString().padStart(10);

        console.log(`${time}    | ${count} | ${avg} | ${max} | ${errors} | ${timeouts}`);
      }

      console.log();

      const sortedByCount = [...result.timeAnalysis].sort((a, b) => b.count - a.count);
      const sortedByAvgTime = [...result.timeAnalysis].sort((a, b) => b.avgResponseTime - a.avgResponseTime);

      console.log('ピークトラフィック時間帯:');
      for (let i = 0; i < Math.min(3, sortedByCount.length); i++) {
        const bucket = sortedByCount[i];
        console.log(`  ${i + 1}. ${bucket.timestamp.substring(11)} - ${bucket.count} リクエスト`);
      }
      console.log();

      console.log('最も遅い時間帯（平均レスポンスタイム）:');
      for (let i = 0; i < Math.min(3, sortedByAvgTime.length); i++) {
        const bucket = sortedByAvgTime[i];
        if (bucket.avgResponseTime > 0) {
          console.log(`  ${i + 1}. ${bucket.timestamp.substring(11)} - ${bucket.avgResponseTime.toFixed(3)}s 平均 (${bucket.count} リクエスト)`);
        }
      }
      console.log();
    }
  }

  private sortMapByValue<K>(map: ReadonlyMap<K, number>, limit: number | null): [K, number][] {
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return limit ? sorted.slice(0, limit) : sorted;
  }
}
