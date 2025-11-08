'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, List, Home, Filter, TrendingDown } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'All Logs', href: '/logs', icon: List },
  { name: 'Slow Endpoints', href: '/slow-endpoints', icon: TrendingDown },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Filters', href: '/filters', icon: Filter },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">ALB Log Analyzer</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-800 p-4">
        <div className="text-xs text-gray-400">
          <p>Version 1.0.0</p>
          <p className="mt-1">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
