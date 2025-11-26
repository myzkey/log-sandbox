import { db } from "@alb-analyzer/db/client";
import { albLogs } from "@alb-analyzer/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const profile = searchParams.get("profile");

  const whereClause = profile ? eq(albLogs.awsProfile, profile) : undefined;

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
    .from(albLogs);

  const result = await (whereClause ? query.where(whereClause) : query)
    .orderBy(desc(albLogs.totalTime))
    .limit(20);

  return NextResponse.json(result);
}
