'use client'

import type { ALBLog } from '@alb-analyzer/db/schema'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogsFilters } from '@/components/logs-filters'
import { LogsTable } from '@/components/logs-table'

const PAGE_SIZE = 50

interface LogsResponse {
  logs: ALBLog[]
  pagination: {
    hasMore: boolean
    nextCursor: number | null
    total: number | null
  }
}

function buildApiUrl(params: URLSearchParams, page: number) {
  const url = new URL('/api/logs', window.location.origin)
  url.searchParams.set('limit', PAGE_SIZE.toString())
  url.searchParams.set('offset', (page * PAGE_SIZE).toString())
  params.forEach((value, key) => {
    if (key !== 'page') {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
}

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
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
  )
}

export default function LogsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const currentPage = parseInt(searchParams.get('page') || '1', 10)

  const { data: profiles } = useQuery<string[]>({
    queryKey: ['profiles'],
    queryFn: () => fetchApi<string[]>('/api/profiles'),
  })

  const { data: logsData, isLoading } = useQuery<LogsResponse>({
    queryKey: ['logs', searchParams.toString(), currentPage],
    queryFn: () => fetchApi<LogsResponse>(buildApiUrl(searchParams, currentPage - 1)),
  })

  const logs = logsData?.logs ?? []
  const total = logsData?.pagination.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams)
    const currentSortBy = params.get('sortBy')
    const currentSortOrder = params.get('sortOrder')

    if (currentSortBy === column) {
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sortBy', column)
      params.set('sortOrder', column === 'totalTime' ? 'desc' : 'desc')
    }
    params.set('page', '1') // Reset to first page on sort
    router.push(`/logs?${params.toString()}`)
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', page.toString())
    router.push(`/logs?${params.toString()}`)
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const startItem = (currentPage - 1) * PAGE_SIZE + 1
  const endItem = Math.min(currentPage * PAGE_SIZE, total)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Access Logs</h1>
        <p className="text-gray-600 mt-2">
          {total > 0
            ? `Showing ${startItem.toLocaleString()} - ${endItem.toLocaleString()} of ${total.toLocaleString()} logs`
            : 'No logs found'}
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

        {/* Pagination */}
        {total > 0 && (
          <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {startItem.toLocaleString()} - {endItem.toLocaleString()} / {total.toLocaleString()}件
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages.toLocaleString()})`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
