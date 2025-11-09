import { NextRequest, NextResponse } from 'next/server';
import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const profile = searchParams.get('profile');

  const whereClause = profile ? eq(albLogs.awsProfile, profile) : undefined;
  const query = db
    .select({
      hour: sql<string>`strftime('%Y-%m-%d %H:00', ${albLogs.timestamp})`,
      count: sql<number>`count(*)`,
      avgResponseTime: sql<number>`avg(${albLogs.totalTime})`,
      errors: sql<number>`sum(case when cast(${albLogs.elbStatusCode} as integer) >= 400 then 1 else 0 end)`,
    })
    .from(albLogs);

  const result = await (whereClause ? query.where(whereClause) : query)
    .groupBy(sql`strftime('%Y-%m-%d %H:00', ${albLogs.timestamp})`)
    .orderBy(sql`strftime('%Y-%m-%d %H:00', ${albLogs.timestamp})`)
    .limit(24);

  return NextResponse.json(result);
}
