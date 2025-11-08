import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { desc, sql, and, like, or, eq } from 'drizzle-orm';
import Link from 'next/link';
import { LogsTable } from '@/components/logs-table';
import { LogsFilters } from '@/components/logs-filters';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  status?: string;
  method?: string;
  path?: string;
  search?: string;
}

async function getLogs(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [];

  if (searchParams.status) {
    conditions.push(eq(albLogs.elbStatusCode, searchParams.status));
  }
  if (searchParams.method) {
    conditions.push(eq(albLogs.requestMethod, searchParams.method));
  }
  if (searchParams.path) {
    conditions.push(like(albLogs.requestPath, `%${searchParams.path}%`));
  }
  if (searchParams.search) {
    conditions.push(
      or(
        like(albLogs.clientIp, `%${searchParams.search}%`),
        like(albLogs.requestPath, `%${searchParams.search}%`),
        like(albLogs.userAgent, `%${searchParams.search}%`)
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

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { logs, pagination } = await getLogs(params);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Access Logs</h1>
        <p className="text-gray-600 mt-2">
          Showing {logs.length} of {pagination.total.toLocaleString()} total logs
        </p>
      </div>

      <LogsFilters />

      <div className="mt-6">
        <LogsTable logs={logs} />
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Page {pagination.page} of {pagination.totalPages}
        </div>
        <div className="flex gap-2">
          {pagination.page > 1 && (
            <Link
              href={`/logs?page=${pagination.page - 1}`}
              className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          {pagination.page < pagination.totalPages && (
            <Link
              href={`/logs?page=${pagination.page + 1}`}
              className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
