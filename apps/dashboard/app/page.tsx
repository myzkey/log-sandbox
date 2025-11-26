"use client";

import {
  RecentClientErrors,
  RecentServerErrors,
} from "@/components/recent-errors";
import { StatsCards } from "@/components/stats-cards";
import { StatusCodeChart } from "@/components/status-code-chart";
import { TimeSeriesChart } from "@/components/time-series-chart";
import { TopEndpoints } from "@/components/top-endpoints";
import type { ALBLog } from "@alb-analyzer/db/schema";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

interface Stats {
  totalRequests: number;
  avgResponseTime: number;
  clientErrorCount: number;
  serverErrorCount: number;
  timeoutCount: number;
}

interface StatusCode {
  statusCode: string;
  count: number;
}

interface TimeSeries {
  hour: string;
  count: number;
  avgResponseTime: number;
  errors: number;
}

interface Endpoint {
  path: string;
  count: number;
  avgResponseTime: number;
}

function buildApiUrl(endpoint: string, profile?: string | null) {
  const url = new URL(endpoint, window.location.origin);
  if (profile) {
    url.searchParams.set("profile", profile);
  }
  return url.toString();
}

async function fetchApi<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-200 rounded-lg h-80"></div>
        <div className="bg-gray-200 rounded-lg h-80"></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const profile = searchParams.get("profile");

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["stats", profile],
    queryFn: () => fetchApi<Stats>(buildApiUrl("/api/stats", profile)),
  });

  const { data: statusCodes, isLoading: statusCodesLoading } = useQuery<
    StatusCode[]
  >({
    queryKey: ["status-codes", profile],
    queryFn: () =>
      fetchApi<StatusCode[]>(buildApiUrl("/api/status-codes", profile)),
  });

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery<
    TimeSeries[]
  >({
    queryKey: ["time-series", profile],
    queryFn: () =>
      fetchApi<TimeSeries[]>(buildApiUrl("/api/time-series", profile)),
  });

  const { data: topEndpoints, isLoading: topEndpointsLoading } = useQuery<
    Endpoint[]
  >({
    queryKey: ["top-endpoints", profile],
    queryFn: () =>
      fetchApi<Endpoint[]>(buildApiUrl("/api/top-endpoints", profile)),
  });

  const { data: clientErrors, isLoading: clientErrorsLoading } = useQuery<
    ALBLog[]
  >({
    queryKey: ["client-errors", profile],
    queryFn: () =>
      fetchApi<ALBLog[]>(buildApiUrl("/api/client-errors", profile)),
  });

  const { data: serverErrors, isLoading: serverErrorsLoading } = useQuery<
    ALBLog[]
  >({
    queryKey: ["server-errors", profile],
    queryFn: () =>
      fetchApi<ALBLog[]>(buildApiUrl("/api/server-errors", profile)),
  });

  const isLoading =
    statsLoading ||
    statusCodesLoading ||
    timeSeriesLoading ||
    topEndpointsLoading ||
    clientErrorsLoading ||
    serverErrorsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          ALB Log Analytics Dashboard
        </h1>

        {stats && <StatsCards stats={stats} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {timeSeries && <TimeSeriesChart data={timeSeries} />}
          {statusCodes && <StatusCodeChart data={statusCodes} />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {topEndpoints && <TopEndpoints data={topEndpoints} />}
          {clientErrors && <RecentClientErrors data={clientErrors} />}
        </div>

        <div className="grid grid-cols-1 gap-6 mt-6">
          {serverErrors && <RecentServerErrors data={serverErrors} />}
        </div>
      </div>
    </div>
  );
}
