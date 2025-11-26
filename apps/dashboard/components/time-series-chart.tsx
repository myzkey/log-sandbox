'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface TimeSeriesData {
  hour: string
  count: number
  avgResponseTime: number
  errors: number
}

export function TimeSeriesChart({ data }: { data: TimeSeriesData[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Requests Over Time</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" name="Requests" />
          <Line yAxisId="right" type="monotone" dataKey="errors" stroke="#ef4444" name="Errors" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
