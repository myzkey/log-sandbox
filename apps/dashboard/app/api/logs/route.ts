import { NextRequest, NextResponse } from 'next/server';
import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { desc, sql, and, like, or, eq } from 'drizzle-orm';

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

  // Get logs with filters
  const logsQueryBase = db.select().from(albLogs);
  const logsQuery = conditions.length > 0
    ? logsQueryBase.where(and(...conditions))
    : logsQueryBase;

  const logs = await logsQuery
    .orderBy(desc(albLogs.timestamp))
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
