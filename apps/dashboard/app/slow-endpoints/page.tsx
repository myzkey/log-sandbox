'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SlowEndpointsTable } from '@/components/slow-endpoints-table';
import { SlowEndpointsChart } from '@/components/slow-endpoints-chart';

interface SlowEndpoint {
  path: string;
  count: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  p95ResponseTime: number;
  errorCount: number;
  timeoutCount: number;
}

interface SlowRequest {
  id: number;
  timestamp: string;
  path: string;
  method: string;
  statusCode: string;
  totalTime: number;
  clientIp: string;
  isTimeout: number;
}

function buildApiUrl(endpoint: string, profile?: string | null) {
  const url = new URL(endpoint, window.location.origin);
  if (profile) {
    url.searchParams.set('profile', profile);
  }
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
  );
}

export default function SlowEndpointsPage() {
  const searchParams = useSearchParams();
  const profile = searchParams.get('profile');

  const { data: slowEndpoints, isLoading: endpointsLoading } = useQuery<SlowEndpoint[]>({
    queryKey: ['slow-endpoints', profile],
    queryFn: () => fetchApi<SlowEndpoint[]>(buildApiUrl('/api/slow-endpoints', profile)),
  });

  const { data: slowRequests, isLoading: requestsLoading } = useQuery<SlowRequest[]>({
    queryKey: ['slow-requests', profile],
    queryFn: () => fetchApi<SlowRequest[]>(buildApiUrl('/api/slow-requests', profile)),
  });

  if (endpointsLoading || requestsLoading) {
    return <LoadingSkeleton />;
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
          <p className="text-sm text-gray-600 mt-1 truncate">
            {slowEndpoints?.[0]?.path || 'N/A'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Endpoints Analyzed</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {slowEndpoints?.length || 0}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Top 50 by avg response time
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Slowest Request</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {slowRequests?.[0]?.totalTime.toFixed(3) || '0.000'}s
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {slowRequests?.[0]
              ? new Date(slowRequests[0].timestamp).toLocaleString()
              : 'N/A'}
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

      {/* Slowest Individual Requests */}
      {slowRequests && slowRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Slowest Individual Requests
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Path
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Client IP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slowRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(req.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {req.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono max-w-md truncate">
                      {req.path}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          parseInt(req.statusCode) >= 400
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {req.totalTime.toFixed(3)}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {req.clientIp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
