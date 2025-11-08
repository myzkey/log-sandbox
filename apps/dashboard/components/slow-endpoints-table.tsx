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

export function SlowEndpointsTable({
  endpoints,
}: {
  endpoints: SlowEndpoint[];
}) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Endpoints by Response Time
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endpoint
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requests
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                P95 Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Max Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Errors
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timeouts
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {endpoints.map((endpoint, idx) => (
              <tr
                key={idx}
                className={`hover:bg-gray-50 ${
                  endpoint.avgResponseTime > 1 ? 'bg-red-50' : ''
                }`}
              >
                <td className="px-6 py-4 text-sm text-gray-900 font-mono max-w-md truncate">
                  {endpoint.path}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {endpoint.count.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right">
                  <span
                    className={
                      endpoint.avgResponseTime > 1
                        ? 'text-red-600'
                        : endpoint.avgResponseTime > 0.5
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    }
                  >
                    {endpoint.avgResponseTime.toFixed(3)}s
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {endpoint.p95ResponseTime.toFixed(3)}s
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {endpoint.maxResponseTime.toFixed(3)}s
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {endpoint.minResponseTime.toFixed(3)}s
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {endpoint.errorCount > 0 ? (
                    <span className="text-red-600 font-semibold">
                      {endpoint.errorCount}
                    </span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  {endpoint.timeoutCount > 0 ? (
                    <span className="text-orange-600 font-semibold">
                      {endpoint.timeoutCount}
                    </span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
