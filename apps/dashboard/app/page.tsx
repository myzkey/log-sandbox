import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { sql, desc } from 'drizzle-orm';
import { StatsCards } from '@/components/stats-cards';
import { StatusCodeChart } from '@/components/status-code-chart';
import { TimeSeriesChart } from '@/components/time-series-chart';
import { TopEndpoints } from '@/components/top-endpoints';
import { RecentErrors } from '@/components/recent-errors';

export const dynamic = 'force-dynamic';

async function getStats() {
  const totalRequests = await db
    .select({ count: sql<number>`count(*)` })
    .from(albLogs);

  const avgResponseTime = await db
    .select({ avg: sql<number>`avg(${albLogs.totalTime})` })
    .from(albLogs);

  const errorCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(albLogs)
    .where(sql`cast(${albLogs.elbStatusCode} as integer) >= 400`);

  const timeoutCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(albLogs)
    .where(sql`${albLogs.isTimeout} = 1`);

  return {
    totalRequests: totalRequests[0]?.count ?? 0,
    avgResponseTime: avgResponseTime[0]?.avg ?? 0,
    errorCount: errorCount[0]?.count ?? 0,
    timeoutCount: timeoutCount[0]?.count ?? 0,
  };
}

async function getStatusCodeDistribution() {
  return db
    .select({
      statusCode: albLogs.elbStatusCode,
      count: sql<number>`count(*)`,
    })
    .from(albLogs)
    .groupBy(albLogs.elbStatusCode)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
}

async function getTimeSeriesData() {
  return db
    .select({
      hour: sql<string>`strftime('%Y-%m-%d %H:00', ${albLogs.timestamp})`,
      count: sql<number>`count(*)`,
      avgResponseTime: sql<number>`avg(${albLogs.totalTime})`,
      errors: sql<number>`sum(case when cast(${albLogs.elbStatusCode} as integer) >= 400 then 1 else 0 end)`,
    })
    .from(albLogs)
    .groupBy(sql`strftime('%Y-%m-%d %H:00', ${albLogs.timestamp})`)
    .orderBy(sql`strftime('%Y-%m-%d %H:00', ${albLogs.timestamp})`)
    .limit(24);
}

async function getTopEndpoints() {
  return db
    .select({
      path: albLogs.requestPath,
      count: sql<number>`count(*)`,
      avgResponseTime: sql<number>`avg(${albLogs.totalTime})`,
    })
    .from(albLogs)
    .groupBy(albLogs.requestPath)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
}

async function getRecentErrors() {
  return db
    .select()
    .from(albLogs)
    .where(sql`cast(${albLogs.elbStatusCode} as integer) >= 400`)
    .orderBy(desc(albLogs.timestamp))
    .limit(10);
}

export default async function DashboardPage() {
  const [stats, statusCodes, timeSeries, topEndpoints, recentErrors] =
    await Promise.all([
      getStats(),
      getStatusCodeDistribution(),
      getTimeSeriesData(),
      getTopEndpoints(),
      getRecentErrors(),
    ]);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          ALB Log Analytics Dashboard
        </h1>

        <StatsCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <TimeSeriesChart data={timeSeries} />
          <StatusCodeChart data={statusCodes} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopEndpoints data={topEndpoints} />
          <RecentErrors data={recentErrors} />
        </div>
      </div>
    </div>
  );
}
