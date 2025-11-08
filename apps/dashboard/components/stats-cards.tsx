import { Activity, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface Stats {
  totalRequests: number;
  avgResponseTime: number;
  errorCount: number;
  timeoutCount: number;
}

export function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    {
      title: 'Total Requests',
      value: stats.totalRequests.toLocaleString(),
      icon: Activity,
      color: 'bg-blue-500',
    },
    {
      title: 'Avg Response Time',
      value: `${stats.avgResponseTime.toFixed(3)}s`,
      icon: Clock,
      color: 'bg-green-500',
    },
    {
      title: 'Errors (4xx/5xx)',
      value: stats.errorCount.toLocaleString(),
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
    {
      title: 'Timeouts',
      value: stats.timeoutCount.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => (
        <div key={card.title} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`${card.color} p-3 rounded-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
