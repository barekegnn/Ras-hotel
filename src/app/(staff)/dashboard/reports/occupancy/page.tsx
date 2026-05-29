'use client';

// ============================================================
// Manager Occupancy Report
// src/app/(staff)/dashboard/reports/occupancy/page.tsx
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface OccupancyData {
  date:        string;
  total_rooms: number;
  occupied:    number;
  available:   number;
  rate:        number;
}

interface OccupancyStats {
  current_occupancy:  number;
  average_occupancy:  number;
  trend:              number;
  forecast_tonight:   number;
  peak_date:          string;
  lowest_date:        string;
  data:               OccupancyData[];
}

const DAY_OPTIONS = [7, 14, 30, 60, 90];

export default function OccupancyReportPage() {
  const [stats,   setStats]   = useState<OccupancyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days,    setDays]    = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/v1/reports/occupancy?days=${days}`);
      const json = await res.json();
      setStats(json.data);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading || !stats) {
    return (
      <div className="max-w-6xl space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-72 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const trendUp      = stats.trend > 0;
  const occupancyPct = Math.round(stats.current_occupancy * 100);
  const totalRooms   = stats.data[0]?.total_rooms ?? 25;

  // Format chart data
  const chartData = stats.data.map((d) => ({
    ...d,
    date:    new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    rate_pct: Math.round(d.rate * 100),
  }));

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Occupancy Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Last {days} days</p>
        </div>
        <button onClick={load}
          className="btn-ghost text-gray-500 hover:text-gray-700">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current</p>
          <p className="mt-2 text-4xl font-bold text-gray-900">{occupancyPct}%</p>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${occupancyPct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {Math.round(stats.current_occupancy * totalRooms)} of {totalRooms} rooms
          </p>
        </div>

        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Trend</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className={`text-4xl font-bold ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trendUp ? '+' : ''}{Math.abs(stats.trend).toFixed(1)}%
            </p>
            <span className={`text-lg ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
              {trendUp ? '↑' : '↓'}
            </span>
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
            {Math.round(stats.forecast_tonight * totalRooms)}
          </p>
          <p className="text-xs text-gray-500 mt-2">rooms expected tonight</p>
        </div>
      </div>

      {/* Day range selector */}
      <div className="flex gap-2 flex-wrap">
        {DAY_OPTIONS.map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors
              ${days === d ? 'bg-brand-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {d}d
          </button>
        ))}
      </div>

      {/* Occupancy trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-6">Occupancy Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#d96428" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#d96428" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11}
                interval={Math.floor(chartData.length / 6)} />
              <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]}
                tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, 'Occupancy']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="rate_pct" name="Occupancy"
                stroke="#d96428" strokeWidth={2.5}
                fill="url(#occupancyGrad)"
                dot={false} activeDot={{ r: 4, fill: '#d96428' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rooms occupied bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-6">Rooms Occupied per Day</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11}
                interval={Math.floor(chartData.length / 6)} />
              <YAxis stroke="#9ca3af" fontSize={11} domain={[0, totalRooms]} />
              <Tooltip
                formatter={(v: number, name: string) => [v, name === 'occupied' ? 'Occupied' : 'Available']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
              />
              <Bar dataKey="occupied"  name="Occupied"  fill="#d96428" radius={[2, 2, 0, 0]} stackId="a" />
              <Bar dataKey="available" name="Available" fill="#e5e7eb" radius={[2, 2, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2">Peak occupancy</p>
          <p className="text-xl font-bold text-green-800">{stats.peak_date}</p>
          <p className="text-xs text-green-600 mt-1">Highest occupancy date in period</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-600 mb-2">Lowest occupancy</p>
          <p className="text-xl font-bold text-yellow-800">{stats.lowest_date}</p>
          <p className="text-xs text-yellow-600 mt-1">Opportunity to promote availability</p>
        </div>
      </div>

      {/* Daily breakdown table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Daily Breakdown</h3>
        </div>
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto scrollbar-thin">
          {stats.data.map((day) => (
            <div key={day.date} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 hover:bg-gray-50 transition-colors">
              <div className="w-24 sm:w-28 flex-shrink-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-900">{day.date}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${Math.round(day.rate * 100)}%` }} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 w-9 sm:w-10 text-right">
                    {Math.round(day.rate * 100)}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 w-20 sm:w-24 text-right flex-shrink-0">
                {day.occupied}/{day.total_rooms}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
