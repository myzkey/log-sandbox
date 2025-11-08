import { db } from '@alb-analyzer/db/client';
import { albLogs } from '@alb-analyzer/db/schema';
import { sql, desc } from 'drizzle-orm';
import { SlowEndpointsTable } from '@/components/slow-endpoints-table';
import { SlowEndpointsChart } from '@/components/slow-endpoints-chart';

export const dynamic = 'force-dynamic';

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

async function getSlowEndpoints(): Promise<SlowEndpoint[]> {
  // Get endpoint statistics
  const endpoints = await db
    .select({
      path: albLogs.requestPath,
      count: sql<number>`count(*)`,
      avgResponseTime: sql<number>`avg(${albLogs.totalTime})`,
      maxResponseTime: sql<number>`max(${albLogs.totalTime})`,
      minResponseTime: sql<number>`min(${albLogs.totalTime})`,
      errorCount: sql<number>`sum(case when cast(${albLogs.elbStatusCode} as integer) >= 400 then 1 else 0 end)`,
      timeoutCount: sql<number>`sum(case when ${albLogs.isTimeout} = 1 then 1 else 0 end)`,
    })
    .from(albLogs)
    .groupBy(albLogs.requestPath)
    .orderBy(desc(sql`avg(${albLogs.totalTime})`))
    .limit(50);

  // Calculate p95 for each endpoint (simplified approach)
  const endpointsWithP95 = await Promise.all(
    endpoints.map(async (endpoint) => {
      const times = await db
        .select({ time: albLogs.totalTime })
        .from(albLogs)
        .where(sql`${albLogs.requestPath} = ${endpoint.path}`)
        .orderBy(albLogs.totalTime);

      const p95Index = Math.floor(times.length * 0.95);
      const p95ResponseTime = times[p95Index]?.time || endpoint.maxResponseTime;

      return {
        ...endpoint,
        p95ResponseTime,
      };
    })
  );

  return endpointsWithP95;
}

async function getSlowRequests() {
  return db
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
    .from(albLogs)
    .orderBy(desc(albLogs.totalTime))
    .limit(20);
}

export default async function SlowEndpointsPage() {
  const [slowEndpoints, slowRequests] = await Promise.all([
    getSlowEndpoints(),
    getSlowRequests(),
  ]);

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
            {slowEndpoints[0]?.avgResponseTime.toFixed(3)}s
          </p>
          <p className="text-sm text-gray-600 mt-1 truncate">
            {slowEndpoints[0]?.path}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Endpoints Analyzed</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {slowEndpoints.length}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Top 50 by avg response time
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Slowest Request</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {slowRequests[0]?.totalTime.toFixed(3)}s
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(slowRequests[0]?.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-8">
        <SlowEndpointsChart data={slowEndpoints.slice(0, 15)} />
      </div>

      {/* Slow Endpoints Table */}
      <div className="mb-8">
        <SlowEndpointsTable endpoints={slowEndpoints} />
      </div>

      {/* Slowest Individual Requests */}
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
                    {req.isTimeout && (
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
    </div>
  );
}
