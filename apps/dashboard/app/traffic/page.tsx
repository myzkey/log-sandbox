'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { RequestsPerMinuteChart } from '@/components/requests-per-minute-chart'

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function TrafficPage() {
  const searchParams = useSearchParams()
  const profile = searchParams.get('profile') || undefined

  const { data: profiles } = useQuery<string[]>({
    queryKey: ['profiles'],
    queryFn: () => fetchApi<string[]>('/api/profiles'),
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Traffic Analysis</h1>
        <p className="text-gray-600 mt-2">
          View request distribution by minute to identify peak traffic times
        </p>
      </div>

      <RequestsPerMinuteChart profile={profile} />
    </div>
  )
}
