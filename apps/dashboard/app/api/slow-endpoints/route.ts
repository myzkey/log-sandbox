import { NextRequest, NextResponse } from 'next/server';
import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { sql, desc, eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const profile = searchParams.get('profile');

  const whereClause = profile ? eq(albLogs.awsProfile, profile) : undefined;

  // Get endpoint statistics
  const query = db
    .select({
      path: albLogs.requestPath,
      count: sql<number>`count(*)`,
      avgResponseTime: sql<number>`avg(${albLogs.totalTime})`,
      maxResponseTime: sql<number>`max(${albLogs.totalTime})`,
      minResponseTime: sql<number>`min(${albLogs.totalTime})`,
      errorCount: sql<number>`sum(case when cast(${albLogs.elbStatusCode} as integer) >= 400 then 1 else 0 end)`,
      timeoutCount: sql<number>`sum(case when ${albLogs.isTimeout} = 1 then 1 else 0 end)`,
    })
    .from(albLogs);

  const endpoints = await (whereClause ? query.where(whereClause) : query)
    .groupBy(albLogs.requestPath)
    .orderBy(desc(sql`avg(${albLogs.totalTime})`))
    .limit(50);

  // Calculate p95 for each endpoint
  const endpointsWithP95 = await Promise.all(
    endpoints.map(async (endpoint) => {
      const pathCondition = sql`${albLogs.requestPath} = ${endpoint.path}`;

      const timesQuery = db
        .select({ time: albLogs.totalTime })
        .from(albLogs);

      const times = await (whereClause
        ? timesQuery.where(and(whereClause, pathCondition)!)
        : timesQuery.where(pathCondition)
      ).orderBy(albLogs.totalTime);

      const p95Index = Math.floor(times.length * 0.95);
      const p95ResponseTime = times[p95Index]?.time || endpoint.maxResponseTime;

      return {
        ...endpoint,
        p95ResponseTime,
      };
    })
  );

  return NextResponse.json(endpointsWithP95);
}
