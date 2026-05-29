'use client';

// ============================================================
// Revenue Analytics Dashboard
// src/app/(staff)/dashboard/reports/revenue/page.tsx
//
// Manager-only. Comprehensive revenue analytics with charts.
// Requirements 16.1, 25.2–25.4
// ============================================================

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface RevenueSummary {
  total_revenue:     number;
  total_bookings:    number;
  avg_booking_value: number;
  revenue_growth:    number;
  period:            string;
}
interface BreakdownItem { source?: string; method?: string; room_type?: string; revenue: number; percentage: number; }
interface TimePoint     { date: string; revenue: number; bookings: number; }
interface RevenueData {
  summary:     RevenueSummary;
  breakdown:   { by_source: BreakdownItem[]; by_payment_method: BreakdownItem[]; by_room_type: BreakdownItem[] };
  time_series: TimePoint[];
  top_days:    Array<{ date: string; revenue: number }>;
  insights:    string[];
}

const PALETTE = ['#d96428', '#2e9083', '#f4a261', '#264653', '#e9c46a', '#e76f51'];

const PRESET_RANGES = [
  { label: '7 days',  days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function kpiDate(offset = 0) {
  return new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
}

export default function RevenueAnalyticsPage() {
  const [data,      setData]      = useState<RevenueData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [startDate, setStartDate] = useState(kpiDate(30));
  const [endDate,   setEndDate]   = useState(kpiDate(0));
  const [period,    setPeriod]    = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => { fetchData(); }, [startDate, endDate, period]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate, period });
      const res  = await fetch(`/api/v1/reports/revenue?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load revenue data');
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(days: number) {
    setStartDate(kpiDate(days));
    setEndDate(kpiDate(0));
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-80 bg-gray-200 rounded-xl" />
    </div>
  );

  // ── Error ─────────────────────────────────────────────────
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">📊</div>
      <p className="text-lg font-semibold text-gray-900">Failed to load revenue data</p>
      <p className="text-sm text-gray-500">{error}</p>
      <button onClick={fetchData} className="btn-primary">Try again</button>
    </div>
  );

  const { summary, breakdown, time_series, top_days, insights } = data;
  const growthPositive = summary.revenue_growth >= 0;

  return (
    <div className="max-w-7xl space-y-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">{summary.period}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
          {/* Preset buttons */}
          <div className="flex gap-1.5 rounded-lg border border-gray-200 bg-white p-1">
            {PRESET_RANGES.map(({ label, days }) => (
              <button key={days} onClick={() => applyPreset(days)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                  ${startDate === kpiDate(days) && endDate === kpiDate(0)
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field-input text-xs py-1.5 w-36" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field-input text-xs py-1.5 w-36" />
          </div>

          {/* Period granularity */}
          <select value={period} onChange={(e) => setPeriod(e.target.value as any)}
            className="field-input text-xs py-1.5 w-28">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={`ETB ${summary.total_revenue.toLocaleString()}`}
          icon="💰"
          accent="brand"
        />
        <KpiCard
          label="Total Bookings"
          value={summary.total_bookings.toString()}
          icon="📋"
          accent="harar"
        />
        <KpiCard
          label="Avg Booking Value"
          value={`ETB ${summary.avg_booking_value.toLocaleString()}`}
          icon="📊"
          accent="sand"
        />
        <KpiCard
          label="Revenue Growth"
          value={`${growthPositive ? '+' : ''}${summary.revenue_growth}%`}
          icon={growthPositive ? '📈' : '📉'}
          accent={growthPositive ? 'green' : 'red'}
          sub="vs previous period"
        />
      </div>

      {/* ── Revenue Trend Chart ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-6">Revenue Trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={time_series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11}
                tickFormatter={(v) => period === 'daily'
                  ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : v}
              />
              <YAxis yAxisId="left"  stroke="#9ca3af" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                formatter={(value: number, name: string) => [
                  name === 'Revenue (ETB)' ? `ETB ${value.toLocaleString()}` : value,
                  name,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left"  type="monotone" dataKey="revenue"  name="Revenue (ETB)"
                stroke="#d96428" strokeWidth={2.5}
                dot={{ fill: '#d96428', r: 3 }} activeDot={{ r: 5 }} />
              <Line yAxisId="right" type="monotone" dataKey="bookings" name="Bookings"
                stroke="#2e9083" strokeWidth={2}
                dot={{ fill: '#2e9083', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Breakdown Charts ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* By Source */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">By Booking Source</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakdown.by_source} cx="50%" cy="50%" outerRadius={80}
                  dataKey="revenue" nameKey="source"
                  label={({ source, percentage }) => `${source}: ${percentage}%`}
                  labelLine={false}>
                  {breakdown.by_source.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`ETB ${v.toLocaleString()}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-2">
            {breakdown.by_source.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                  <span className="text-gray-700">{item.source}</span>
                </div>
                <span className="font-semibold font-mono-data text-gray-900">
                  ETB {(item.revenue as number).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Payment Method */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">By Payment Method</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown.by_payment_method} layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                <YAxis type="category" dataKey="method" stroke="#9ca3af" fontSize={11} width={110} />
                <Tooltip formatter={(v: number) => [`ETB ${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#d96428" radius={[0, 4, 4, 0]}>
                  {breakdown.by_payment_method.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Room Type + Top Days ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* By Room Type */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">By Room Type</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown.by_room_type} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="room_type" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip formatter={(v: number) => [`ETB ${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#2e9083" radius={[4, 4, 0, 0]}>
                  {breakdown.by_room_type.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Days */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Top Performing Days</h3>
          <div className="space-y-3">
            {top_days.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No data for this period</p>
            ) : top_days.map((day, i) => (
              <div key={day.date}
                className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                  ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                <p className="font-bold text-brand-600 font-mono-data text-sm">
                  ETB {(day.revenue as number).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Insights ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={i}
              className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">💡</span>
              <p className="text-sm text-blue-800 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────

function KpiCard({
  label, value, icon, accent, sub,
}: {
  label: string; value: string; icon: string;
  accent: 'brand' | 'harar' | 'sand' | 'green' | 'red';
  sub?: string;
}) {
  const accentMap = {
    brand: { bg: 'bg-brand-50',  text: 'text-brand-600',  icon: 'bg-brand-100' },
    harar: { bg: 'bg-harar-50',  text: 'text-harar-600',  icon: 'bg-harar-100' },
    sand:  { bg: 'bg-sand-50',   text: 'text-sand-600',   icon: 'bg-sand-100'  },
    green: { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100' },
    red:   { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'bg-red-100'   },
  };
  const c = accentMap[accent];
  return (
    <div className={`rounded-xl border border-gray-200 ${c.bg} p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold font-mono-data truncate ${c.text}`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-lg ${c.icon} flex items-center justify-center text-xl flex-shrink-0 ml-3`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
