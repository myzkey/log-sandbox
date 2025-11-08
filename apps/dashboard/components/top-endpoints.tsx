interface EndpointData {
  path: string;
  count: number;
  avgResponseTime: number;
}

export function TopEndpoints({ data }: { data: EndpointData[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Top Endpoints
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Path
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Requests
              </th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                Avg Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((endpoint, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900 font-mono truncate max-w-xs">
                  {endpoint.path}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                  {endpoint.count.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                  {endpoint.avgResponseTime.toFixed(3)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
