import { NextRequest, NextResponse } from 'next/server';
import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { desc, asc, sql, and, like, or, eq, gte, lte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [];

  const profile = searchParams.get('profile');
  const status = searchParams.get('status');
  const method = searchParams.get('method');
  const path = searchParams.get('path');
  const search = searchParams.get('search');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortBy = searchParams.get('sortBy') || 'timestamp';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  if (profile) {
    conditions.push(eq(albLogs.awsProfile, profile));
  }
  if (status) {
    conditions.push(eq(albLogs.elbStatusCode, status));
  }
  if (method) {
    conditions.push(eq(albLogs.requestMethod, method));
  }
  if (path) {
    conditions.push(like(albLogs.requestPath, `%${path}%`));
  }
  if (search) {
    conditions.push(
      or(
        like(albLogs.clientIp, `%${search}%`),
        like(albLogs.requestPath, `%${search}%`),
        like(albLogs.userAgent, `%${search}%`)
      )
    );
  }
  if (startDate) {
    // Convert datetime-local format to ISO string for comparison
    const startISO = new Date(startDate).toISOString();
    conditions.push(gte(albLogs.timestamp, startISO));
  }
  if (endDate) {
    // Convert datetime-local format to ISO string for comparison
    const endISO = new Date(endDate).toISOString();
    conditions.push(lte(albLogs.timestamp, endISO));
  }

  // Determine sort column and order
  const sortColumn = sortBy === 'totalTime' ? albLogs.totalTime : albLogs.timestamp;
  const orderFn = sortOrder === 'asc' ? asc : desc;

  // Get logs with filters
  const logsQueryBase = db.select().from(albLogs);
  const logsQuery = conditions.length > 0
    ? logsQueryBase.where(and(...conditions))
    : logsQueryBase;

  const logs = await logsQuery
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  // Get total count with same filters
  const countQueryBase = db.select({ count: sql<number>`count(*)` }).from(albLogs);
  const countQuery = conditions.length > 0
    ? countQueryBase.where(and(...conditions))
    : countQueryBase;

  const totalResult = await countQuery;
  const total = totalResult[0]?.count || 0;

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
