import { db } from '@alb-analyzer/db/client'
import { albLogs } from '@alb-analyzer/db/schema'
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date') // Format: "YYYY-MM-DD" in JST
  const profile = searchParams.get('profile')
  const status = searchParams.get('status') // Comma-separated status codes

  if (!date) {
    return NextResponse.json({ error: 'date parameter is required' }, { status: 400 })
  }

  // Convert JST date to UTC range
  // JST is UTC+9, so JST 00:00 = UTC 15:00 (previous day)
  const jstStartOfDay = new Date(`${date}T00:00:00+09:00`)
  const jstEndOfDay = new Date(`${date}T23:59:59+09:00`)

  const conditions = [
    gte(albLogs.timestamp, jstStartOfDay.toISOString()),
    lt(albLogs.timestamp, new Date(jstEndOfDay.getTime() + 1000).toISOString()),
  ]

  if (profile) {
    conditions.push(eq(albLogs.awsProfile, profile))
  }

  if (status) {
    const statuses = status.split(',').filter(Boolean)
    if (statuses.length === 1) {
      conditions.push(eq(albLogs.elbStatusCode, statuses[0]))
    } else if (statuses.length > 1) {
      conditions.push(inArray(albLogs.elbStatusCode, statuses))
    }
  }

  // Aggregate by 5-minute intervals (in JST)
  // SQLite stores timestamps in UTC, so we need to add 9 hours for JST
  // Round down to 5-minute intervals: (minute / 5) * 5
  const result = await db
    .select({
      minute: sql<string>`strftime('%H:', datetime(${albLogs.timestamp}, '+9 hours')) || printf('%02d', (cast(strftime('%M', datetime(${albLogs.timestamp}, '+9 hours')) as integer) / 5) * 5)`.as(
        'minute',
      ),
      count: sql<number>`count(*)`.as('count'),
      errors: sql<number>`sum(case when ${albLogs.elbStatusCode} >= '400' then 1 else 0 end)`.as(
        'errors',
      ),
      avgResponseTime: sql<number>`avg(${albLogs.totalTime})`.as('avgResponseTime'),
    })
    .from(albLogs)
    .where(and(...conditions))
    .groupBy(sql`strftime('%H:', datetime(${albLogs.timestamp}, '+9 hours')) || printf('%02d', (cast(strftime('%M', datetime(${albLogs.timestamp}, '+9 hours')) as integer) / 5) * 5)`)
    .orderBy(sql`minute`)

  // Fill in missing minutes with zero values
  const dataMap = new Map<string, { count: number; errors: number; avgResponseTime: number }>()
  for (const row of result) {
    dataMap.set(row.minute, {
      count: row.count,
      errors: row.errors || 0,
      avgResponseTime: row.avgResponseTime || 0,
    })
  }

  // Generate all 5-minute intervals of the day
  const allIntervals: Array<{
    minute: string
    count: number
    errors: number
    avgResponseTime: number
  }> = []

  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const minute = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      const data = dataMap.get(minute)
      allIntervals.push({
        minute,
        count: data?.count || 0,
        errors: data?.errors || 0,
        avgResponseTime: data?.avgResponseTime || 0,
      })
    }
  }

  return NextResponse.json({
    date,
    data: allIntervals,
    summary: {
      totalRequests: result.reduce((sum, r) => sum + r.count, 0),
      totalErrors: result.reduce((sum, r) => sum + (r.errors || 0), 0),
      peakMinute: result.reduce(
        (max, r) => (r.count > max.count ? r : max),
        { minute: '', count: 0 } as { minute: string; count: number },
      ),
    },
  })
}
