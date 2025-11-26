'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Download, Check } from 'lucide-react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { DateTimePicker } from './date-time-picker';

interface LogsFiltersProps {
  profiles: string[];
}

const STATUS_OPTIONS = [
  { value: '200', label: '200 OK' },
  { value: '201', label: '201 Created' },
  { value: '301', label: '301 Moved' },
  { value: '302', label: '302 Found' },
  { value: '304', label: '304 Not Modified' },
  { value: '400', label: '400 Bad Request' },
  { value: '401', label: '401 Unauthorized' },
  { value: '403', label: '403 Forbidden' },
  { value: '404', label: '404 Not Found' },
  { value: '500', label: '500 Server Error' },
  { value: '502', label: '502 Bad Gateway' },
  { value: '503', label: '503 Service Unavailable' },
  { value: '504', label: '504 Gateway Timeout' },
];

const METHOD_OPTIONS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'OPTIONS', label: 'OPTIONS' },
  { value: 'HEAD', label: 'HEAD' },
];

const RESPONSE_TIME_OPTIONS = [
  { value: '', label: 'All' },
  ...Array.from({ length: 30 }, (_, i) => {
    const val = ((i + 1) * 0.1).toFixed(1);
    return { value: val, label: `≥ ${val}s` };
  }),
];

export function LogsFilters({ profiles }: LogsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for all filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [minResponseTime, setMinResponseTime] = useState(searchParams.get('minTime') || '');
  const [profile, setProfile] = useState(searchParams.get('profile') || '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    searchParams.get('status')?.split(',').filter(Boolean) || []
  );
  const [selectedMethods, setSelectedMethods] = useState<string[]>(
    searchParams.get('method')?.split(',').filter(Boolean) || []
  );

  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const methodDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (methodDropdownRef.current && !methodDropdownRef.current.contains(event.target as Node)) {
        setMethodDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusToggle = (statusValue: string) => {
    setSelectedStatuses(prev =>
      prev.includes(statusValue)
        ? prev.filter(s => s !== statusValue)
        : [...prev, statusValue]
    );
  };

  const handleMethodToggle = (methodValue: string) => {
    setSelectedMethods(prev =>
      prev.includes(methodValue)
        ? prev.filter(m => m !== methodValue)
        : [...prev, methodValue]
    );
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (minResponseTime) params.set('minTime', minResponseTime);
    if (profile) params.set('profile', profile);
    if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','));
    if (selectedMethods.length > 0) params.set('method', selectedMethods.join(','));

    router.push(`/logs?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setMinResponseTime('');
    setProfile('');
    setSelectedStatuses([]);
    setSelectedMethods([]);
    router.push('/logs');
  };

  // Build export URL from current local state
  const buildExportUrl = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (minResponseTime) params.set('minTime', minResponseTime);
    if (profile) params.set('profile', profile);
    if (selectedStatuses.length > 0) params.set('status', selectedStatuses.join(','));
    if (selectedMethods.length > 0) params.set('method', selectedMethods.join(','));
    return `/api/logs/export?${params.toString()}`;
  };

  const hasFilters = search || startDate || endDate || minResponseTime || profile ||
    selectedStatuses.length > 0 || selectedMethods.length > 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>

      <div className="space-y-4">
        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-gray-400 font-normal">(JST)</span>
            </label>
            <DateTimePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Select start date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date <span className="text-gray-400 font-normal">(JST)</span>
            </label>
            <DateTimePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="Select end date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Time
            </label>
            <Listbox value={minResponseTime} onChange={setMinResponseTime}>
              <div className="relative">
                <ListboxButton className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <span className={minResponseTime ? 'text-gray-900' : 'text-gray-500'}>
                    {RESPONSE_TIME_OPTIONS.find(o => o.value === minResponseTime)?.label || 'All'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </ListboxButton>
                <ListboxOptions className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto focus:outline-none">
                  {RESPONSE_TIME_OPTIONS.map((option) => (
                    <ListboxOption
                      key={option.value}
                      value={option.value}
                      className="cursor-pointer select-none px-4 py-2 hover:bg-gray-50 data-[selected]:bg-indigo-50 flex items-center justify-between"
                    >
                      {({ selected }) => (
                        <>
                          <span className={selected ? 'font-medium text-indigo-600' : 'text-gray-700'}>
                            {option.label}
                          </span>
                          {selected && <Check className="h-4 w-4 text-indigo-600" />}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
          </div>
        </div>

        {/* Other Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* AWS Profile Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AWS Profile
            </label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Profiles</option>
              {profiles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="col-span-2">
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
          </div>

          {/* Status Code Filter (Multi-select) */}
          <div className="relative" ref={statusDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Code
            </label>
            <button
              type="button"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-left flex items-center justify-between"
            >
              <span className={selectedStatuses.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
                {selectedStatuses.length === 0
                  ? 'All'
                  : `${selectedStatuses.length} selected`}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {statusDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {selectedStatuses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStatuses([])}
                    className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-gray-50 border-b flex items-center gap-2"
                  >
                    <X className="h-3 w-3" />
                    Clear selection
                  </button>
                )}
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(option.value)}
                      onChange={() => handleStatusToggle(option.value)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Method Filter (Multi-select) */}
          <div className="relative" ref={methodDropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTTP Method
            </label>
            <button
              type="button"
              onClick={() => setMethodDropdownOpen(!methodDropdownOpen)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-left flex items-center justify-between"
            >
              <span className={selectedMethods.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
                {selectedMethods.length === 0
                  ? 'All'
                  : `${selectedMethods.length} selected`}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {methodDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {selectedMethods.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMethods([])}
                    className="w-full px-4 py-2 text-left text-sm text-indigo-600 hover:bg-gray-50 border-b flex items-center gap-2"
                  >
                    <X className="h-3 w-3" />
                    Clear selection
                  </button>
                )}
                {METHOD_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMethods.includes(option.value)}
                      onChange={() => handleMethodToggle(option.value)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
        <a
          href={buildExportUrl()}
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>
    </div>
  );
}
