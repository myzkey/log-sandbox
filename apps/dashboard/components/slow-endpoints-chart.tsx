'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SlowEndpoint {
  path: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  maxResponseTime: number;
}

export function SlowEndpointsChart({ data }: { data: SlowEndpoint[] }) {
  const chartData = data.map((endpoint) => ({
    name: endpoint.path.length > 30
      ? endpoint.path.substring(0, 30) + '...'
      : endpoint.path,
    fullPath: endpoint.path,
    avg: parseFloat(endpoint.avgResponseTime.toFixed(3)),
    p95: parseFloat(endpoint.p95ResponseTime.toFixed(3)),
    max: parseFloat(endpoint.maxResponseTime.toFixed(3)),
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Top 15 Slowest Endpoints
      </h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" label={{ value: 'Time (seconds)', position: 'bottom' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
                    <p className="font-mono text-xs mb-2 break-all max-w-xs">
                      {payload[0].payload.fullPath}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Avg:</span> {payload[0].value}s
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">P95:</span> {payload[1].value}s
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Max:</span> {payload[2].value}s
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Bar dataKey="avg" fill="#3b82f6" name="Average" />
          <Bar dataKey="p95" fill="#f59e0b" name="P95" />
          <Bar dataKey="max" fill="#ef4444" name="Maximum" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
