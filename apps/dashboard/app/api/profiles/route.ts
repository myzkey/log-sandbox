import { db } from "@alb-analyzer/db/client";
import { albLogs } from "@alb-analyzer/db/schema";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = await db
    .selectDistinct({ profile: albLogs.awsProfile })
    .from(albLogs)
    .orderBy(albLogs.awsProfile);

  return NextResponse.json(profiles.map((p) => p.profile));
}
