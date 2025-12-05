'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { SlowEndpointsChart } from '@/components/slow-endpoints-chart'
import { SlowEndpointsTable } from '@/components/slow-endpoints-table'

interface SlowEndpoint {
  path: string
  count: number
  avgResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  p95ResponseTime: number
  errorCount: number
  timeoutCount: number
}

interface SlowRequest {
  id: number
  timestamp: string
  path: string
  method: string
  statusCode: string
  totalTime: number
  clientIp: string
  isTimeout: number
}

interface SlowRequestsResponse {
  items: SlowRequest[]
  pagination: {
    hasMore: boolean
    nextCursor: string | null
  }
}

function buildApiUrl(endpoint: string, profile?: string | null, cursor?: string | null) {
  const url = new URL(endpoint, window.location.origin)
  if (profile) {
    url.searchParams.set('profile', profile)
  }
  if (cursor) {
    url.searchParams.set('cursor', cursor)
  }
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
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
        ))}
      </div>
      <div className="bg-gray-200 rounded-lg h-96 mb-8"></div>
      <div className="bg-gray-200 rounded-lg h-96"></div>
    </div>
  )
}

const ROW_HEIGHT = 53

function SlowRequestsVirtualTable({
  requests,
  hasMore,
  isFetchingNextPage,
  fetchNextPage,
}: {
  requests: SlowRequest[]
  hasMore: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: requests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const handleScroll = useCallback(() => {
    if (!parentRef.current || !hasMore || isFetchingNextPage) return

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current
    if (scrollHeight - scrollTop - clientHeight < 500) {
      fetchNextPage()
    }
  }, [hasMore, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const el = parentRef.current
    if (!el) return

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const virtualRows = rowVirtualizer.getVirtualItems()

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Slowest Individual Requests ({requests.length.toLocaleString()}
          {hasMore ? '+' : ''})
        </h2>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[180px_80px_1fr_100px_120px_140px] bg-gray-50 border-b border-gray-200">
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Timestamp
        </div>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Method
        </div>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path</div>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Status
        </div>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Response Time
        </div>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Client IP
        </div>
      </div>

      {/* Virtualized body */}
      <div ref={parentRef} className="h-[500px] overflow-auto">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const req = requests[virtualRow.index]
            return (
              <div
                key={req.id}
                className="grid grid-cols-[180px_80px_1fr_100px_120px_140px] border-b border-gray-200 hover:bg-gray-50 absolute w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(req.timestamp).toLocaleString()}
                </div>
                <div className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {req.method}
                  </span>
                </div>
                <div className="px-6 py-4 text-sm text-gray-900 font-mono truncate">{req.path}</div>
                <div className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      parseInt(req.statusCode, 10) >= 400
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {req.statusCode}
                  </span>
                  {req.isTimeout === 1 && (
                    <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                      Timeout
                    </span>
                  )}
                </div>
                <div className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                  {req.totalTime.toFixed(3)}s
                </div>
                <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {req.clientIp}
                </div>
              </div>
            )
          })}
        </div>

        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading more...</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SlowEndpointsPage() {
  const searchParams = useSearchParams()
  const profile = searchParams.get('profile')

  const { data: slowEndpoints, isLoading: endpointsLoading } = useQuery<SlowEndpoint[]>({
    queryKey: ['slow-endpoints', profile],
    queryFn: () => fetchApi<SlowEndpoint[]>(buildApiUrl('/api/slow-endpoints', profile)),
  })

  const {
    data: slowRequestsData,
    isLoading: requestsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<SlowRequestsResponse>({
    queryKey: ['slow-requests', profile],
    queryFn: ({ pageParam }) =>
      fetchApi<SlowRequestsResponse>(
        buildApiUrl('/api/slow-requests', profile, pageParam as string | null),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined,
  })

  const allSlowRequests = useMemo(() => {
    if (!slowRequestsData?.pages) return []
    return slowRequestsData.pages.flatMap((page) => page.items)
  }, [slowRequestsData?.pages])

  if (endpointsLoading || requestsLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Slow Endpoints Analysis</h1>
        <p className="text-gray-600 mt-2">
          Analyze endpoints by average response time and identify performance bottlenecks
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Slowest Endpoint</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {slowEndpoints?.[0]?.avgResponseTime.toFixed(3) || '0.000'}s
          </p>
          <p className="text-sm text-gray-600 mt-1 truncate">{slowEndpoints?.[0]?.path || 'N/A'}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Endpoints Analyzed</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{slowEndpoints?.length || 0}</p>
          <p className="text-sm text-gray-600 mt-1">Top 50 by avg response time</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Slowest Request</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {allSlowRequests[0]?.totalTime.toFixed(3) || '0.000'}s
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {allSlowRequests[0] ? new Date(allSlowRequests[0].timestamp).toLocaleString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Chart */}
      {slowEndpoints && slowEndpoints.length > 0 && (
        <div className="mb-8">
          <SlowEndpointsChart data={slowEndpoints.slice(0, 15)} />
        </div>
      )}

      {/* Slow Endpoints Table */}
      {slowEndpoints && slowEndpoints.length > 0 && (
        <div className="mb-8">
          <SlowEndpointsTable endpoints={slowEndpoints} />
        </div>
      )}

      {/* Slowest Individual Requests with virtualization */}
      {allSlowRequests.length > 0 && (
        <SlowRequestsVirtualTable
          requests={allSlowRequests}
          hasMore={hasNextPage ?? false}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      )}
    </div>
  )
}
