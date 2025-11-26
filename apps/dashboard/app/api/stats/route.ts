import { db } from '@alb-analyzer/db/client'
import { albLogs } from '@alb-analyzer/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const profile = searchParams.get('profile')

  const whereClause = profile ? eq(albLogs.awsProfile, profile) : undefined

  const totalRequests = await (whereClause
    ? db.select({ count: sql<number>`count(*)` }).from(albLogs).where(whereClause)
    : db.select({ count: sql<number>`count(*)` }).from(albLogs))

  const avgResponseTime = await (whereClause
    ? db
        .select({ avg: sql<number>`avg(${albLogs.totalTime})` })
        .from(albLogs)
        .where(whereClause)
    : db.select({ avg: sql<number>`avg(${albLogs.totalTime})` }).from(albLogs))

  const clientErrorCondition = sql`cast(${albLogs.elbStatusCode} as integer) >= 400 AND cast(${albLogs.elbStatusCode} as integer) < 500`
  const clientErrorCount = await (whereClause
    ? db
        .select({ count: sql<number>`count(*)` })
        .from(albLogs)
        .where(and(whereClause, clientErrorCondition)!)
    : db.select({ count: sql<number>`count(*)` }).from(albLogs).where(clientErrorCondition))

  const serverErrorCondition = sql`cast(${albLogs.elbStatusCode} as integer) >= 500`
  const serverErrorCount = await (whereClause
    ? db
        .select({ count: sql<number>`count(*)` })
        .from(albLogs)
        .where(and(whereClause, serverErrorCondition)!)
    : db.select({ count: sql<number>`count(*)` }).from(albLogs).where(serverErrorCondition))

  const timeoutCondition = sql`${albLogs.isTimeout} = 1`
  const timeoutCount = await (whereClause
    ? db
        .select({ count: sql<number>`count(*)` })
        .from(albLogs)
        .where(and(whereClause, timeoutCondition)!)
    : db.select({ count: sql<number>`count(*)` }).from(albLogs).where(timeoutCondition))

  return NextResponse.json({
    totalRequests: totalRequests[0]?.count ?? 0,
    avgResponseTime: avgResponseTime[0]?.avg ?? 0,
    clientErrorCount: clientErrorCount[0]?.count ?? 0,
    serverErrorCount: serverErrorCount[0]?.count ?? 0,
    timeoutCount: timeoutCount[0]?.count ?? 0,
  })
}
