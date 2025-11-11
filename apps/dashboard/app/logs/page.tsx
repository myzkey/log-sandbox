'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LogsTable } from '@/components/logs-table';
import { LogsFilters } from '@/components/logs-filters';
import type { ALBLog } from '@alb-analyzer/db/schema';

interface LogsResponse {
  logs: ALBLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildApiUrl(params: URLSearchParams) {
  const url = new URL('/api/logs', window.location.origin);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

function LoadingSkeleton() {
  return (
    <div className="p-8 animate-pulse">
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
      <div className="bg-gray-200 rounded-lg h-20 mb-6"></div>
      <div className="bg-gray-200 rounded-lg h-96"></div>
    </div>
  );
}

export default function LogsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: profiles } = useQuery<string[]>({
    queryKey: ['profiles'],
    queryFn: () => fetchApi<string[]>('/api/profiles'),
  });

  const { data: logsData, isLoading } = useQuery<LogsResponse>({
    queryKey: ['logs', searchParams.toString()],
    queryFn: () => fetchApi<LogsResponse>(buildApiUrl(searchParams)),
  });

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/logs?${params.toString()}`);
  };

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams);
    const currentSortBy = params.get('sortBy');
    const currentSortOrder = params.get('sortOrder');

    if (currentSortBy === column) {
      // Toggle sort order
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to desc for response time, asc for timestamp
      params.set('sortBy', column);
      params.set('sortOrder', column === 'totalTime' ? 'desc' : 'desc');
    }
    params.delete('page'); // Reset to first page
    router.push(`/logs?${params.toString()}`);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const { logs = [], pagination } = logsData || { pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Access Logs</h1>
        <p className="text-gray-600 mt-2">
          Showing {logs.length} of {pagination.total.toLocaleString()} total logs
        </p>
      </div>

      {profiles && <LogsFilters profiles={profiles} />}

      <div className="mt-6">
        <LogsTable
          logs={logs}
          sortBy={searchParams.get('sortBy') || undefined}
          sortOrder={(searchParams.get('sortOrder') as 'asc' | 'desc') || undefined}
          onSort={handleSort}
        />
      </div>

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
            )}
            {pagination.page < pagination.totalPages && (
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
