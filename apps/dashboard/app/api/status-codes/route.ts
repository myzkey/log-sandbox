import { db } from '@alb-analyzer/db/client'
import { albLogs } from '@alb-analyzer/db/schema'
import { desc, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const profile = searchParams.get('profile')

  const whereClause = profile ? eq(albLogs.awsProfile, profile) : undefined
  const query = db
    .select({
      statusCode: albLogs.elbStatusCode,
      count: sql<number>`count(*)`,
    })
    .from(albLogs)

  const result = await (whereClause ? query.where(whereClause) : query)
    .groupBy(albLogs.elbStatusCode)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

  return NextResponse.json(result)
}
