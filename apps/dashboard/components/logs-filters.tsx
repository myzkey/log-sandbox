'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function LogsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    params.delete('page'); // Reset to first page
    router.push(`/logs?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to first page
    router.push(`/logs?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    router.push('/logs');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="IP, Path, or User Agent..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </form>

        {/* Status Code Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status Code
          </label>
          <select
            value={searchParams.get('status') || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All</option>
            <option value="200">200 OK</option>
            <option value="301">301 Moved</option>
            <option value="302">302 Found</option>
            <option value="304">304 Not Modified</option>
            <option value="400">400 Bad Request</option>
            <option value="401">401 Unauthorized</option>
            <option value="403">403 Forbidden</option>
            <option value="404">404 Not Found</option>
            <option value="500">500 Server Error</option>
            <option value="502">502 Bad Gateway</option>
            <option value="504">504 Gateway Timeout</option>
          </select>
        </div>

        {/* Method Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            HTTP Method
          </label>
          <select
            value={searchParams.get('method') || ''}
            onChange={(e) => handleFilterChange('method', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="OPTIONS">OPTIONS</option>
            <option value="HEAD">HEAD</option>
          </select>
        </div>
      </div>

      {(searchParams.get('search') ||
        searchParams.get('status') ||
        searchParams.get('method')) && (
        <div className="mt-4">
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
