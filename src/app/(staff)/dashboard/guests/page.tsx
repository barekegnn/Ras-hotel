'use client';

// ============================================================
// Guest Profiles Page
// src/app/(staff)/dashboard/guests/page.tsx
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { PhoneIcon, SearchIcon } from '@/components/staff/Icons';
import Link from 'next/link';

interface GuestRecord {
  guest_phone:       string;
  guest_name:        string;
  guest_nationality: string;
  total_bookings:    number;
  last_stay:         string;
  total_spent:       number;
}

export default function GuestsPage() {
  const [guests,  setGuests]  = useState<GuestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ per_page: '50', page: '1' });
      if (q) params.set('guest_phone', q);
      const res  = await fetch(`/api/v1/bookings?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load');

      // Aggregate by phone
      const map = new Map<string, GuestRecord>();
      for (const b of (json.data ?? [])) {
        const key = b.guest_phone;
        const existing = map.get(key);
        if (existing) {
          existing.total_bookings += 1;
          existing.total_spent    += b.total_amount ?? 0;
          if (b.check_in_date > existing.last_stay) existing.last_stay = b.check_in_date;
        } else {
          map.set(key, {
            guest_phone:       b.guest_phone,
            guest_name:        b.guest_name,
            guest_nationality: b.guest_nationality ?? '—',
            total_bookings:    1,
            last_stay:         b.check_in_date,
            total_spent:       b.total_amount ?? 0,
          });
        }
      }
      setGuests([...map.values()].sort((a, b) => b.last_stay.localeCompare(a.last_stay)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load guests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search.trim());
  }

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Profiles</h1>
          <p className="text-sm text-gray-500 mt-0.5">Search and view guest history</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone number…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-4
                       text-sm text-gray-900 placeholder:text-gray-400
                       focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <button type="submit" className="btn-primary flex-shrink-0">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(); }} className="btn-secondary flex-shrink-0">
            Clear
          </button>
        )}
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
          <p className="text-sm font-semibold text-gray-700">
            {loading ? 'Loading…' : `${guests.length} guest${guests.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : guests.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl mb-3">👤</div>
            <p className="font-semibold text-gray-700">No guests found</p>
            <p className="text-sm text-gray-400 mt-1">Guest records appear here after bookings are made</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {guests.map((guest) => (
              <div key={guest.guest_phone}
                className="flex items-center gap-3 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors">

                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-harar-100 flex items-center justify-center
                                text-sm font-bold text-harar-700 flex-shrink-0">
                  {guest.guest_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{guest.guest_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                    <a href={`tel:${guest.guest_phone}`}
                      className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium">
                      <PhoneIcon className="h-3 w-3" />
                      {guest.guest_phone}
                    </a>
                    <span className="hidden sm:inline">{guest.guest_nationality}</span>
                  </div>
                  {/* Mobile stats */}
                  <div className="flex items-center gap-3 mt-1 sm:hidden text-xs text-gray-500">
                    <span><span className="font-bold text-gray-900">{guest.total_bookings}</span> stays</span>
                    <span className="font-bold text-brand-600 font-mono-data">ETB {guest.total_spent.toLocaleString()}</span>
                  </div>
                </div>

                {/* Desktop stats */}
                <div className="hidden sm:flex items-center gap-5 text-sm flex-shrink-0">
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{guest.total_bookings}</p>
                    <p className="text-xs text-gray-400">stays</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-brand-600 font-mono-data">
                      ETB {guest.total_spent.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">total spent</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-700">{guest.last_stay}</p>
                    <p className="text-xs text-gray-400">last stay</p>
                  </div>
                </div>

                {/* Action */}
                <Link
                  href={`/dashboard/bookings?q=${encodeURIComponent(guest.guest_phone)}`}
                  className="btn-ghost text-xs flex-shrink-0 hidden sm:inline-flex">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
