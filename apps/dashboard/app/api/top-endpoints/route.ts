import { NextRequest, NextResponse } from 'next/server';
import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { sql, eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const profile = searchParams.get('profile');

  const whereClause = profile ? eq(albLogs.awsProfile, profile) : undefined;
  const query = db
    .select({
      path: albLogs.requestPath,
      count: sql<number>`count(*)`,
      avgResponseTime: sql<number>`avg(${albLogs.totalTime})`,
    })
    .from(albLogs);

  const result = await (whereClause ? query.where(whereClause) : query)
    .groupBy(albLogs.requestPath)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return NextResponse.json(result);
}
