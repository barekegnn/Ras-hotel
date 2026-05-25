'use client';

// ============================================================
// Bookings List & Search
// src/app/(staff)/dashboard/bookings/page.tsx
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BookingStatusBadge } from '@/components/staff/BookingStatusBadge';
import { SearchIcon, ChevronRightIcon, FilterIcon, XIcon } from '@/components/staff/Icons';
import Link from 'next/link';
import type { Booking } from '@/shared/types/domain';

interface SearchFilters {
  q?: string;
  status?: string;
  check_in_from?: string;
  check_in_to?: string;
}

const STATUS_OPTIONS = [
  { value: 'Reserved_Unpaid',         label: 'Awaiting payment' },
  { value: 'Paid',                    label: 'Paid & ready' },
  { value: 'Checked_In',              label: 'Checked in' },
  { value: 'Checked_Out',             label: 'Checked out' },
  { value: 'Cancelled_Full_Refund',   label: 'Cancelled (full refund)' },
  { value: 'Cancelled_Partial_Refund',label: 'Cancelled (50% refund)' },
  { value: 'Cancelled_No_Refund',     label: 'Cancelled (no refund)' },
  { value: 'No_Show',                 label: 'No-show' },
];

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [showFilter,setShowFilter] = useState(false);

  // Filter state from URL
  const filters: SearchFilters = {
    q:             searchParams.get('q') ?? undefined,
    status:        searchParams.get('status') ?? undefined,
    check_in_from: searchParams.get('check_in_from') ?? undefined,
    check_in_to:   searchParams.get('check_in_to') ?? undefined,
  };

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('per_page', '25');
      params.set('page', String(pageNum));
      if (filters.q)              params.set('ref', filters.q);
      if (filters.status)         params.set('status', filters.status);
      if (filters.check_in_from)  params.set('check_in_from', filters.check_in_from);
      if (filters.check_in_to)    params.set('check_in_to', filters.check_in_to);

      const res = await fetch(`/api/v1/bookings?${params}`);
      const json = await res.json();
      setBookings(json.data ?? []);
      setTotal(json.meta?.total ?? 0);
      setPage(pageNum);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1); }, [filters, load]);

  function updateFilter(key: keyof SearchFilters, value: string | undefined) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard/bookings?${params}`);
  }

  function clearAllFilters() {
    router.push('/dashboard/bookings');
  }

  const perPage = 25;
  const totalPages = Math.ceil(total / perPage);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${total.toLocaleString()} total`}
          </p>
        </div>
        <Link href="/dashboard/bookings/new" className="btn-primary">
          New booking
        </Link>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by booking reference or guest name…"
            defaultValue={filters.q ?? ''}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = e.currentTarget.value.trim();
                updateFilter('q', value || undefined);
              }
            }}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4
                       text-sm text-gray-900 placeholder:text-gray-400
                       focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20
                       transition-all"
          />
        </div>

        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors
            ${showFilter ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
          <FilterIcon className="h-4 w-4 inline mr-2" />
          Filters
        </button>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Status filter */}
            <div>
              <label className="field-label">Booking status</label>
              <select
                value={filters.status ?? ''}
                onChange={(e) => updateFilter('status', e.target.value || undefined)}
                className="field-input">
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="field-label">Check-in from</label>
              <input
                type="date"
                value={filters.check_in_from ?? ''}
                onChange={(e) => updateFilter('check_in_from', e.target.value || undefined)}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Check-in to</label>
              <input
                type="date"
                value={filters.check_in_to ?? ''}
                onChange={(e) => updateFilter('check_in_to', e.target.value || undefined)}
                className="field-input"
              />
            </div>
          </div>

          {hasFilters && (
            <div className="flex justify-end">
              <button onClick={clearAllFilters} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results count and quick filters */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600">Active filters:</span>
          {filters.q && (
            <button
              onClick={() => updateFilter('q', undefined)}
              className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200">
              Ref: {filters.q}
              <XIcon className="h-3 w-3" />
            </button>
          )}
          {filters.status && (
            <button
              onClick={() => updateFilter('status', undefined)}
              className="flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 hover:bg-purple-200">
              {STATUS_OPTIONS.find((s) => s.value === filters.status)?.label ?? filters.status}
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      )}

      {/* Bookings table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 font-medium">No bookings found</p>
            <p className="text-sm text-gray-400 mt-1">
              {hasFilters ? 'Try adjusting your filters' : 'Bookings will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings.map((booking) => (
              <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">

                {/* Status indicator */}
                <div className={`h-3 w-3 flex-shrink-0 rounded-full
                  ${booking.booking_status === 'Paid' ? 'bg-blue-500' :
                    booking.booking_status === 'Reserved_Unpaid' ? 'bg-yellow-500' :
                    booking.booking_status === 'Checked_In' ? 'bg-green-500' :
                    booking.booking_status === 'Checked_Out' ? 'bg-gray-400' :
                    'bg-red-500'}`}
                />

                {/* Booking info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono-data text-sm font-semibold text-gray-900">
                      {booking.booking_reference}
                    </span>
                    <span className="text-sm text-gray-600 truncate">{booking.guest_name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span>{booking.check_in_date} to {booking.check_out_date}</span>
                    {booking.special_request && <span className="badge-paid">Special request</span>}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900">ETB {booking.total_amount?.toFixed(2)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{booking.payment_method}</p>
                </div>

                {/* Status badge */}
                <BookingStatusBadge status={booking.booking_status as any} />

                {/* Chevron */}
                <ChevronRightIcon className="h-4 w-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => load(page - 1)}
              disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-50">
              Previous
            </button>
            <button
              onClick={() => load(page + 1)}
              disabled={page === totalPages}
              className="btn-secondary text-sm disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
