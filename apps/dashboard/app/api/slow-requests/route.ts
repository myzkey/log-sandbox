import { db } from '@alb-analyzer/db/client'
import { albLogs } from '@alb-analyzer/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const profile = searchParams.get('profile')
  const cursor = searchParams.get('cursor') // Format: "totalTime:id"
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  const conditions = []

  if (profile) {
    conditions.push(eq(albLogs.awsProfile, profile))
  }

  // Cursor-based pagination for totalTime DESC ordering
  if (cursor) {
    const [cursorTime, cursorId] = cursor.split(':')
    const time = parseFloat(cursorTime)
    const id = parseInt(cursorId, 10)
    if (!Number.isNaN(time) && !Number.isNaN(id)) {
      // Get items with lower totalTime, or same totalTime but lower id
      conditions.push(
        sql`(${albLogs.totalTime} < ${time} OR (${albLogs.totalTime} = ${time} AND ${albLogs.id} < ${id}))`,
      )
    }
  }

  const query = db
    .select({
      id: albLogs.id,
      timestamp: albLogs.timestamp,
      path: albLogs.requestPath,
      method: albLogs.requestMethod,
      statusCode: albLogs.elbStatusCode,
      totalTime: albLogs.totalTime,
      clientIp: albLogs.clientIp,
      isTimeout: albLogs.isTimeout,
    })
    .from(albLogs)

  const result = await (conditions.length > 0 ? query.where(and(...conditions)) : query)
    .orderBy(desc(albLogs.totalTime), desc(albLogs.id))
    .limit(limit + 1)

  const hasMore = result.length > limit
  const items = hasMore ? result.slice(0, limit) : result
  const nextCursor =
    hasMore && items.length > 0
      ? `${items[items.length - 1].totalTime}:${items[items.length - 1].id}`
      : null

  return NextResponse.json({
    items,
    pagination: {
      hasMore,
      nextCursor,
    },
  })
}
