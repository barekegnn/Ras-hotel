'use client';

// ============================================================
// Manager Occupancy Report
// src/app/(staff)/dashboard/reports/occupancy/page.tsx
// Task 16.1 - Occupancy Analytics
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { ChartIcon, RefreshIcon, ArrowUpIcon, ArrowDownIcon } from '@/components/staff/Icons';

interface OccupancyData {
  date: string;
  total_rooms: number;
  occupied: number;
  available: number;
  rate: number;
}

interface OccupancyStats {
  current_occupancy: number;
  average_occupancy: number;
  trend: number;
  forecast_tonight: number;
  peak_date: string;
  lowest_date: string;
  data: OccupancyData[];
}

export default function OccupancyReportPage() {
  const [stats, setStats] = useState<OccupancyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/reports/occupancy?days=${days}`);
      const json = await res.json();
      setStats(json.data);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (!stats) {
    return (
      <div className="max-w-6xl space-y-6">
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  const trendUp = stats.trend > 0;
  const occupancyPct = Math.round(stats.current_occupancy * 100);

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Occupancy Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Last {days} days</p>
        </div>
        <button onClick={load} className="btn-ghost text-gray-500">
          <RefreshIcon className="h-4 w-4" />
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Now</p>
          <p className="mt-2 text-4xl font-bold text-gray-900">{occupancyPct}%</p>
          <p className="text-xs text-gray-500 mt-2">
            {Math.round(stats.current_occupancy * 25)} of 25 rooms occupied
          </p>
        </div>

        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trend</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className={`text-4xl font-bold ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(stats.trend).toFixed(1)}%
            </p>
            {trendUp ? (
              <ArrowUpIcon className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowDownIcon className="h-5 w-5 text-red-600" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">vs previous period</p>
        </div>

        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Average</p>
          <p className="mt-2 text-4xl font-bold text-harar-600">
            {Math.round(stats.average_occupancy * 100)}%
          </p>
          <p className="text-xs text-gray-500 mt-2">over {days} days</p>
        </div>

        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tonight</p>
          <p className="mt-2 text-4xl font-bold text-brand-600">
            {Math.round(stats.forecast_tonight * 25)} rooms
          </p>
          <p className="text-xs text-gray-500 mt-2">expected occupied</p>
        </div>
      </div>

      {/* Days selector */}
      <div className="flex gap-2">
        {[7, 14, 30, 60, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${days === d
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {d}d
          </button>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white p-8">
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <div className="text-center space-y-3">
            <ChartIcon className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 font-medium">
              Occupancy chart — visual coming soon
            </p>
            <p className="text-sm text-gray-400">
              Integration with Recharts library
            </p>
          </div>
        </div>
      </div>

      {/* Daily breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Daily breakdown</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {stats.data.map((day) => (
            <div key={day.date} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{day.date}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {day.occupied} of {day.total_rooms} rooms
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-500 h-full transition-all"
                    style={{ width: `${day.rate * 100}%` }}
                  />
                </div>
                <p className="text-sm font-bold text-gray-900 w-12 text-right">
                  {Math.round(day.rate * 100)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">Peak occupancy</p>
          <p className="text-2xl font-bold text-green-700">{stats.peak_date}</p>
          <p className="text-xs text-green-700 mt-1">Highest occupancy date</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-yellow-900 mb-2">Lowest occupancy</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.lowest_date}</p>
          <p className="text-xs text-yellow-700 mt-1">Opportunity to promote</p>
        </div>
      </div>
    </div>
  );
}
