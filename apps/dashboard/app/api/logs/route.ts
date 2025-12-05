import { db } from '@alb-analyzer/db/client'
import { albLogs } from '@alb-analyzer/db/schema'
import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple in-memory cache for total counts (TTL: 60 seconds)
const countCache = new Map<string, { count: number; timestamp: number }>()
const COUNT_CACHE_TTL = 60 * 1000

function getCachedCount(cacheKey: string): number | null {
  const cached = countCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < COUNT_CACHE_TTL) {
    return cached.count
  }
  return null
}

function setCachedCount(cacheKey: string, count: number): void {
  countCache.set(cacheKey, { count, timestamp: Date.now() })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const cursor = searchParams.get('cursor') // id for cursor-based pagination (legacy)
  const skipCount = searchParams.get('skipCount') === 'true' // Skip count query for performance

  // Build WHERE conditions
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
    // Treat datetime-local value as JST (UTC+9) and convert to UTC
    const startISO = new Date(`${startDate}+09:00`).toISOString()
    conditions.push(gte(albLogs.timestamp, startISO))
  }
  if (endDate) {
    // Treat datetime-local value as JST (UTC+9) and convert to UTC
    const endISO = new Date(`${endDate}+09:00`).toISOString()
    conditions.push(lte(albLogs.timestamp, endISO))
  }
  if (minTime) {
    const minTimeValue = parseFloat(minTime)
    if (!Number.isNaN(minTimeValue)) {
      conditions.push(gte(albLogs.totalTime, minTimeValue))
    }
  }

  // Cursor-based pagination condition
  if (cursor) {
    const cursorId = parseInt(cursor, 10)
    if (!Number.isNaN(cursorId)) {
      // For desc order, get items with id < cursor
      // For asc order, get items with id > cursor
      if (sortOrder === 'desc') {
        conditions.push(sql`${albLogs.id} < ${cursorId}`)
      } else {
        conditions.push(sql`${albLogs.id} > ${cursorId}`)
      }
    }
  }

  // Determine sort column and order
  const sortColumn = sortBy === 'totalTime' ? albLogs.totalTime : albLogs.timestamp
  const orderFn = sortOrder === 'asc' ? asc : desc

  // Get logs with filters
  const logsQueryBase = db.select().from(albLogs)
  const logsQuery = conditions.length > 0 ? logsQueryBase.where(and(...conditions)) : logsQueryBase

  const logs = await logsQuery
    .orderBy(orderFn(sortColumn), orderFn(albLogs.id))
    .limit(limit + 1)
    .offset(offset)

  // Check if there's a next page
  const hasMore = logs.length > limit
  const resultLogs = hasMore ? logs.slice(0, limit) : logs
  const nextCursor = hasMore && resultLogs.length > 0 ? resultLogs[resultLogs.length - 1].id : null

  // Get total count with caching (skip cursor condition for count)
  let total: number | null = null
  if (!skipCount) {
    // Build cache key from filter conditions (excluding cursor)
    const cacheKey = JSON.stringify({
      profile,
      status,
      method,
      path,
      search,
      startDate,
      endDate,
      minTime,
    })

    total = getCachedCount(cacheKey)
    if (total === null) {
      // Remove cursor condition for count query
      const countConditions = conditions.filter(
        (c) => !String(c).includes('id <') && !String(c).includes('id >'),
      )
      const countQueryBase = db.select({ count: sql<number>`count(*)` }).from(albLogs)
      const countQuery =
        countConditions.length > 0 ? countQueryBase.where(and(...countConditions)) : countQueryBase

      const totalResult = await countQuery
      total = totalResult[0]?.count || 0
      setCachedCount(cacheKey, total)
    }
  }

  return NextResponse.json({
    logs: resultLogs,
    pagination: {
      hasMore,
      nextCursor,
      total,
    },
  })
}
