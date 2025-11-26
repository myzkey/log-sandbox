import { db } from "@alb-analyzer/db/client";
import { albLogs } from "@alb-analyzer/db/schema";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [];

  const profile = searchParams.get("profile");
  const status = searchParams.get("status");
  const method = searchParams.get("method");
  const path = searchParams.get("path");
  const search = searchParams.get("search");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const minTime = searchParams.get("minTime");
  const sortBy = searchParams.get("sortBy") || "timestamp";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  if (profile) {
    conditions.push(eq(albLogs.awsProfile, profile));
  }
  if (status) {
    const statuses = status.split(",").filter(Boolean);
    if (statuses.length === 1) {
      conditions.push(eq(albLogs.elbStatusCode, statuses[0]));
    } else if (statuses.length > 1) {
      conditions.push(inArray(albLogs.elbStatusCode, statuses));
    }
  }
  if (method) {
    const methods = method.split(",").filter(Boolean);
    if (methods.length === 1) {
      conditions.push(eq(albLogs.requestMethod, methods[0]));
    } else if (methods.length > 1) {
      conditions.push(inArray(albLogs.requestMethod, methods));
    }
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
    // Treat datetime-local value as JST (UTC+9) and convert to UTC
    const startISO = new Date(startDate + "+09:00").toISOString();
    conditions.push(gte(albLogs.timestamp, startISO));
  }
  if (endDate) {
    // Treat datetime-local value as JST (UTC+9) and convert to UTC
    const endISO = new Date(endDate + "+09:00").toISOString();
    conditions.push(lte(albLogs.timestamp, endISO));
  }
  if (minTime) {
    const minTimeValue = parseFloat(minTime);
    if (!isNaN(minTimeValue)) {
      conditions.push(gte(albLogs.totalTime, minTimeValue));
    }
  }

  // Determine sort column and order
  const sortColumn =
    sortBy === "totalTime" ? albLogs.totalTime : albLogs.timestamp;
  const orderFn = sortOrder === "asc" ? asc : desc;

  // Get logs with filters
  const logsQueryBase = db.select().from(albLogs);
  const logsQuery =
    conditions.length > 0
      ? logsQueryBase.where(and(...conditions))
      : logsQueryBase;

  const logs = await logsQuery
    .orderBy(orderFn(sortColumn))
    .limit(limit)
    .offset(offset);

  // Get total count with same filters
  const countQueryBase = db
    .select({ count: sql<number>`count(*)` })
    .from(albLogs);
  const countQuery =
    conditions.length > 0
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
