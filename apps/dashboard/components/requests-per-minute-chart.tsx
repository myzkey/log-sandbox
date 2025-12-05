'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
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

interface PerMinuteData {
  minute: string
  count: number
  errors: number
  avgResponseTime: number
}

interface PerMinuteResponse {
  date: string
  data: PerMinuteData[]
  summary: {
    totalRequests: number
    totalErrors: number
    peakMinute: { minute: string; count: number }
  }
}

interface Props {
  profile?: string
}

const STATUS_OPTIONS = [
  { value: '200', label: '200 OK', color: 'bg-green-100 text-green-800' },
  { value: '301', label: '301 Redirect', color: 'bg-blue-100 text-blue-800' },
  { value: '302', label: '302 Redirect', color: 'bg-blue-100 text-blue-800' },
  { value: '400', label: '400 Bad Request', color: 'bg-orange-100 text-orange-800' },
  { value: '401', label: '401 Unauthorized', color: 'bg-orange-100 text-orange-800' },
  { value: '403', label: '403 Forbidden', color: 'bg-orange-100 text-orange-800' },
  { value: '404', label: '404 Not Found', color: 'bg-orange-100 text-orange-800' },
  { value: '500', label: '500 Server Error', color: 'bg-red-100 text-red-800' },
  { value: '502', label: '502 Bad Gateway', color: 'bg-red-100 text-red-800' },
  { value: '503', label: '503 Unavailable', color: 'bg-red-100 text-red-800' },
  { value: '504', label: '504 Timeout', color: 'bg-red-100 text-red-800' },
]

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
]

export function RequestsPerMinuteChart({ profile }: Props) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [dataMap, setDataMap] = useState<Map<string, PerMinuteResponse>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedDates.length === 0) {
      setDataMap(new Map())
      return
    }

    const fetchAllData = async () => {
      setIsLoading(true)
      try {
        const newDataMap = new Map<string, PerMinuteResponse>()

        await Promise.all(
          selectedDates.map(async (date) => {
            const dateStr = format(date, 'yyyy-MM-dd')
            const url = new URL('/api/logs/per-minute', window.location.origin)
            url.searchParams.set('date', dateStr)
            if (profile) {
              url.searchParams.set('profile', profile)
            }
            if (selectedStatuses.length > 0) {
              url.searchParams.set('status', selectedStatuses.join(','))
            }

            const res = await fetch(url.toString())
            if (res.ok) {
              const json = await res.json()
              newDataMap.set(dateStr, json)
            }
          })
        )

        setDataMap(newDataMap)
      } catch (error) {
        console.error('Failed to fetch per-minute data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, [selectedDates, profile, selectedStatuses])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    const dateStr = format(date, 'yyyy-MM-dd')
    const alreadySelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr)

    if (alreadySelected) {
      setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== dateStr))
    } else if (selectedDates.length < 5) {
      setSelectedDates([...selectedDates, date])
    }
  }

  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== format(dateToRemove, 'yyyy-MM-dd')))
  }

  const toggleStatus = (statusValue: string) => {
    if (selectedStatuses.includes(statusValue)) {
      setSelectedStatuses(selectedStatuses.filter(s => s !== statusValue))
    } else {
      setSelectedStatuses([...selectedStatuses, statusValue])
    }
  }

  // Merge data for chart
  const chartData = (() => {
    if (dataMap.size === 0) return []

    const firstData = Array.from(dataMap.values())[0]?.data || []
    return firstData.map((item, index) => {
      const merged: Record<string, string | number> = { minute: item.minute }

      Array.from(dataMap.entries()).forEach(([dateStr, response]) => {
        merged[dateStr] = response.data[index]?.count || 0
      })

      return merged
    })
  })()

  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime())

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Traffic Comparison</h2>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white flex items-center gap-2 hover:bg-gray-50"
            >
              <span className="text-gray-600">
                {selectedStatuses.length === 0 ? 'All Status' : `${selectedStatuses.length} selected`}
              </span>
            </button>

            {isStatusOpen && (
              <div className="absolute right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]">
                <div className="flex justify-between items-center mb-2 px-2">
                  <span className="text-xs text-gray-500">Filter by status</span>
                  {selectedStatuses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatuses([])}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(option.value)}
                      onChange={() => toggleStatus(option.value)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${option.color}`}>
                      {option.value}
                    </span>
                    <span className="text-sm text-gray-600">{option.label.split(' ').slice(1).join(' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Selected dates as chips */}
          {sortedDates.map((date, index) => (
            <div
              key={format(date, 'yyyy-MM-dd')}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm text-white"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            >
              {format(date, 'MM/dd')}
              <button
                type="button"
                onClick={() => removeDate(date)}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <div className="relative" ref={containerRef}>
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white flex items-center gap-2 hover:bg-gray-50"
            >
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                {selectedDates.length === 0 ? 'Select dates' : 'Add date'}
              </span>
            </button>

            {isCalendarOpen && (
              <div className="absolute right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Select up to 5 dates to compare</p>
                <DayPicker
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => {
                    if (dates && dates.length <= 5) {
                      setSelectedDates(dates)
                    }
                  }}
                  locale={ja}
                  showOutsideDays
                  className="!font-sans"
                  classNames={{
                    months: 'flex flex-col',
                    month: 'space-y-4',
                    month_caption: 'flex justify-center pt-1 relative items-center mb-4',
                    caption_label: 'text-sm font-medium text-gray-900',
                    nav: 'space-x-1 flex items-center',
                    button_previous:
                      'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-gray-100',
                    button_next:
                      'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-gray-100',
                    month_grid: 'w-full border-collapse',
                    weekdays: 'flex w-full',
                    weekday: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem] text-center',
                    week: 'flex w-full mt-1',
                    day: 'h-9 w-9 text-center text-sm p-0 relative inline-flex items-center justify-center',
                    day_button:
                      'h-9 w-9 p-0 font-normal rounded-md hover:bg-gray-100 inline-flex items-center justify-center',
                    selected: 'bg-indigo-600 text-white hover:bg-indigo-700 rounded-md',
                    today: 'bg-gray-100 text-gray-900 rounded-md',
                    outside: 'text-gray-400 opacity-50',
                    disabled: 'text-gray-400 opacity-50',
                  }}
                  components={{
                    PreviousMonthButton: (props) => (
                      <button
                        {...props}
                        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-gray-100 absolute left-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    ),
                    NextMonthButton: (props) => (
                      <button
                        {...props}
                        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-gray-100 absolute right-1"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ),
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDates.length === 0 && (
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          Select dates to compare traffic patterns
        </div>
      )}

      {isLoading && (
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      )}

      {selectedDates.length > 0 && !isLoading && dataMap.size > 0 && (
        <>
          {/* Summary table */}
          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Date</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Total Requests</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Errors</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Peak Time</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">Peak Count</th>
                </tr>
              </thead>
              <tbody>
                {sortedDates.map((date, index) => {
                  const dateStr = format(date, 'yyyy-MM-dd')
                  const response = dataMap.get(dateStr)
                  if (!response) return null
                  return (
                    <tr key={dateStr} className="border-b">
                      <td className="py-2 px-3">
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {format(date, 'yyyy/MM/dd')}
                      </td>
                      <td className="text-right py-2 px-3">{response.summary.totalRequests.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{response.summary.totalErrors.toLocaleString()}</td>
                      <td className="text-right py-2 px-3">{response.summary.peakMinute.minute || '-'}</td>
                      <td className="text-right py-2 px-3">{response.summary.peakMinute.count.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="minute"
                tick={{ fontSize: 10 }}
                interval={11}
                tickFormatter={(value) => value.split(':')[0] + ':00'}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => `Time: ${label} (JST)`}
              />
              <Legend />
              {sortedDates.map((date, index) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                return (
                  <Line
                    key={dateStr}
                    type="monotone"
                    dataKey={dateStr}
                    stroke={COLORS[index % COLORS.length]}
                    name={format(date, 'MM/dd')}
                    dot={false}
                    strokeWidth={2}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
