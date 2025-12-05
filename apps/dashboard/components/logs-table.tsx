'use client'

import type { ALBLog } from '@alb-analyzer/db/schema'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'

interface LogsTableProps {
  logs: ALBLog[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string) => void
}

function getStatusColor(status: string) {
  const code = parseInt(status, 10)
  if (code >= 500) return 'text-red-600 bg-red-50'
  if (code >= 400) return 'text-orange-600 bg-orange-50'
  if (code >= 300) return 'text-blue-600 bg-blue-50'
  if (code >= 200) return 'text-green-600 bg-green-50'
  return 'text-gray-600 bg-gray-50'
}

export function LogsTable({
  logs,
  sortBy,
  sortOrder,
  onSort,
}: LogsTableProps) {
  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <button
      type="button"
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors flex items-center gap-2 w-full"
      onClick={() => onSort?.(column)}
    >
      {children}
      <SortIcon column={column} />
    </button>
  )

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[180px_80px_1fr_80px_140px_100px_70px] bg-gray-50 border-b border-gray-200">
        <SortableHeader column="timestamp">Timestamp</SortableHeader>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Method
        </div>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Path
        </div>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Status
        </div>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Client IP
        </div>
        <SortableHeader column="totalTime">Time</SortableHeader>
        <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
        </div>
      </div>

      {/* Table body */}
      <div>
        {logs.map((log) => (
          <div
            key={log.id}
            className="grid grid-cols-[180px_80px_1fr_80px_140px_100px_70px] border-b border-gray-200 hover:bg-gray-50"
          >
            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {new Date(log.timestamp).toLocaleString()}
            </div>
            <div className="px-6 py-4 whitespace-nowrap">
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                {log.requestMethod}
              </span>
            </div>
            <div className="px-6 py-4 text-sm text-gray-900 font-mono truncate">
              {log.requestPath}
            </div>
            <div className="px-6 py-4 whitespace-nowrap">
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                  log.elbStatusCode,
                )}`}
              >
                {log.elbStatusCode}
              </span>
            </div>
            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
              {log.clientIp}
            </div>
            <div className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {log.totalTime.toFixed(3)}s
            </div>
            <div className="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <Link href={`/logs/${log.id}`} className="text-indigo-600 hover:text-indigo-900">
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
