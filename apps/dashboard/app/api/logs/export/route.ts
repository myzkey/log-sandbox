import { db } from '@alb-analyzer/db/client'
import { albLogs } from '@alb-analyzer/db/schema'
import { and, asc, desc, eq, gte, inArray, like, lte, or } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Build WHERE conditions (same as /api/logs)
  const conditions = []

  const profile = searchParams.get('profile')
  const status = searchParams.get('status')
  const method = searchParams.get('method')
  const path = searchParams.get('path')
  const search = searchParams.get('search')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const minTime = searchParams.get('minTime')
  const sortBy = searchParams.get('sortBy') || 'timestamp'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

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
  if (method) {
    const methods = method.split(',').filter(Boolean)
    if (methods.length === 1) {
      conditions.push(eq(albLogs.requestMethod, methods[0]))
    } else if (methods.length > 1) {
      conditions.push(inArray(albLogs.requestMethod, methods))
    }
  }
  if (path) {
    conditions.push(like(albLogs.requestPath, `%${path}%`))
  }
  if (search) {
    conditions.push(
      or(
        like(albLogs.clientIp, `%${search}%`),
        like(albLogs.requestPath, `%${search}%`),
        like(albLogs.userAgent, `%${search}%`),
      ),
    )
  }
  if (startDate) {
    const startISO = new Date(`${startDate}+09:00`).toISOString()
    conditions.push(gte(albLogs.timestamp, startISO))
  }
  if (endDate) {
    const endISO = new Date(`${endDate}+09:00`).toISOString()
    conditions.push(lte(albLogs.timestamp, endISO))
  }
  if (minTime) {
    const minTimeValue = parseFloat(minTime)
    if (!Number.isNaN(minTimeValue)) {
      conditions.push(gte(albLogs.totalTime, minTimeValue))
    }
  }

  // Determine sort column and order
  const sortColumn = sortBy === 'totalTime' ? albLogs.totalTime : albLogs.timestamp
  const orderFn = sortOrder === 'asc' ? asc : desc

  // Get all logs with filters (limit to 10000 for safety)
  const logsQueryBase = db.select().from(albLogs)
  const logsQuery = conditions.length > 0 ? logsQueryBase.where(and(...conditions)) : logsQueryBase

  const logs = await logsQuery.orderBy(orderFn(sortColumn)).limit(10000)

  // Generate CSV
  const headers = [
    'timestamp',
    'method',
    'path',
    'status',
    'client_ip',
    'response_time_sec',
    'target_processing_time',
    'request_processing_time',
    'response_processing_time',
    'user_agent',
    'aws_profile',
  ]

  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Convert UTC timestamp to JST (UTC+9) in YYYY/MM/DD HH:mm:ss format
  const toJST = (utcTimestamp: string): string => {
    const date = new Date(utcTimestamp)
    const jstOffset = 9 * 60 * 60 * 1000
    const jstDate = new Date(date.getTime() + jstOffset)
    const y = jstDate.getUTCFullYear()
    const m = String(jstDate.getUTCMonth() + 1).padStart(2, '0')
    const d = String(jstDate.getUTCDate()).padStart(2, '0')
    const h = String(jstDate.getUTCHours()).padStart(2, '0')
    const min = String(jstDate.getUTCMinutes()).padStart(2, '0')
    const s = String(jstDate.getUTCSeconds()).padStart(2, '0')
    return `${y}/${m}/${d} ${h}:${min}:${s}`
  }

  const csvRows = [
    headers.join(','),
    ...logs.map((log) =>
      [
        escapeCSV(toJST(log.timestamp)),
        escapeCSV(log.requestMethod),
        escapeCSV(log.requestPath),
        escapeCSV(log.elbStatusCode),
        escapeCSV(log.clientIp),
        escapeCSV(log.totalTime),
        escapeCSV(log.targetProcessingTime),
        escapeCSV(log.requestProcessingTime),
        escapeCSV(log.responseProcessingTime),
        escapeCSV(log.userAgent),
        escapeCSV(log.awsProfile),
      ].join(','),
    ),
  ]

  const csv = csvRows.join('\n')

  // Generate filename with current date
  const now = new Date()
  const filename = `alb-logs-${now.toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
