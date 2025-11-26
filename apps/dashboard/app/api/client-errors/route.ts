import { db } from '@alb-analyzer/db/client'
import { albLogs } from '@alb-analyzer/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const profile = searchParams.get('profile')

  const whereClause = profile ? eq(albLogs.awsProfile, profile) : undefined
  const errorCondition = sql`cast(${albLogs.elbStatusCode} as integer) >= 400 AND cast(${albLogs.elbStatusCode} as integer) < 500`
  const query = db.select().from(albLogs)

  const result = await (whereClause
    ? query.where(and(whereClause, errorCondition)!)
    : query.where(errorCondition)
  )
    .orderBy(desc(albLogs.timestamp))
    .limit(10)

  return NextResponse.json(result)
}
