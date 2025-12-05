import { db } from '@alb-analyzer/db/client'
import { sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const profile = searchParams.get('profile')

  const profileCondition = profile ? `AND aws_profile = '${profile}'` : ''

  // Use a single efficient query with approximate P95 using NTILE
  const result = await db.all<{
    path: string
    count: number
    avgResponseTime: number
    maxResponseTime: number
    minResponseTime: number
    p95ResponseTime: number
    errorCount: number
    timeoutCount: number
  }>(sql`
    WITH stats AS (
      SELECT
        request_path as path,
        count(*) as count,
        avg(total_time) as avgResponseTime,
        max(total_time) as maxResponseTime,
        min(total_time) as minResponseTime,
        sum(case when cast(elb_status_code as integer) >= 400 then 1 else 0 end) as errorCount,
        sum(case when is_timeout = 1 then 1 else 0 end) as timeoutCount
      FROM alb_logs
      WHERE 1=1 ${sql.raw(profileCondition)}
      GROUP BY request_path
      ORDER BY avg(total_time) DESC
      LIMIT 50
    ),
    p95_calc AS (
      SELECT
        request_path as path,
        total_time,
        ROW_NUMBER() OVER (PARTITION BY request_path ORDER BY total_time) as rn,
        COUNT(*) OVER (PARTITION BY request_path) as total_count
      FROM alb_logs
      WHERE request_path IN (SELECT path FROM stats)
      ${sql.raw(profile ? `AND aws_profile = '${profile}'` : '')}
    ),
    p95_values AS (
      SELECT
        path,
        total_time as p95ResponseTime
      FROM p95_calc
      WHERE rn = CAST(total_count * 0.95 AS INTEGER) + 1
    )
    SELECT
      s.*,
      COALESCE(p.p95ResponseTime, s.maxResponseTime) as p95ResponseTime
    FROM stats s
    LEFT JOIN p95_values p ON s.path = p.path
    ORDER BY s.avgResponseTime DESC
  `)

  return NextResponse.json(result)
}
