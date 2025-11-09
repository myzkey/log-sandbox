import type { ALBLog } from '@alb-analyzer/db/schema';

export function RecentClientErrors({ data }: { data: ALBLog[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Recent Client Errors (4xx)
      </h2>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-gray-500 text-sm">No client errors found</p>
        ) : (
          data.map((log) => (
            <div
              key={log.id}
              className="border-l-4 border-yellow-500 bg-yellow-50 p-3 rounded"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-yellow-900">
                  {log.elbStatusCode}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 font-mono truncate">
                {log.requestMethod} {log.requestPath}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Client: {log.clientIp} • Time: {log.totalTime.toFixed(3)}s
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function RecentServerErrors({ data }: { data: ALBLog[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Recent Server Errors (5xx)
      </h2>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-gray-500 text-sm">No server errors found</p>
        ) : (
          data.map((log) => (
            <div
              key={log.id}
              className="border-l-4 border-red-500 bg-red-50 p-3 rounded"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-red-900">
                  {log.elbStatusCode}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 font-mono truncate">
                {log.requestMethod} {log.requestPath}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Client: {log.clientIp} • Time: {log.totalTime.toFixed(3)}s
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
