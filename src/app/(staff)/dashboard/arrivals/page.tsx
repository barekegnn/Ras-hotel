'use client';

// ============================================================
// Today's Arrivals
// src/app/(staff)/dashboard/arrivals/page.tsx
// Requirements 17.1–17.7, 20.6–20.7
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingStatusBadge } from '@/components/staff/BookingStatusBadge';
import { AlertIcon, PhoneIcon, CheckIcon, ChevronRightIcon, RefreshIcon } from '@/components/staff/Icons';
import Link from 'next/link';
import type { Booking } from '@/shared/types/domain';

interface ArrivalBooking extends Booking {
  room_number?: string;
  room_type?: string;
}

type Tab = 'all' | 'paid' | 'unpaid' | 'checked_in';

function statusSort(a: Booking, b: Booking): number {
  const order: Record<string, number> = { Paid: 0, Reserved_Unpaid: 1, Checked_In: 2 };
  return (order[a.booking_status] ?? 9) - (order[b.booking_status] ?? 9);
}

export default function ArrivalsPage() {
  const searchParams = useSearchParams();
  const overdueOnly  = searchParams.get('overdue') === '1';

  const [bookings, setBookings] = useState<ArrivalBooking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>('all');
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/v1/bookings?check_in_from=' +
        new Date().toISOString().slice(0, 10) +
        '&check_in_to=' + new Date().toISOString().slice(0, 10) +
        '&per_page=100');
      const json = await res.json();
      const sorted = ((json.data ?? []) as ArrivalBooking[])
        .filter((b) => !['Cancelled_Full_Refund','Cancelled_Partial_Refund','Cancelled_No_Refund','No_Show','Checked_Out'].includes(b.booking_status))
        .sort(statusSort);
      setBookings(sorted);
    } catch { setError('Failed to load arrivals'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCheckin(bookingId: string) {
    setActingOn(bookingId);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/checkin`, { method: 'POST' });
      if (res.ok) load();
      else {
        const j = await res.json();
        alert(j.error?.message ?? 'Check-in failed');
      }
    } finally { setActingOn(null); }
  }

  const now   = new Date();
  const isOverdue = (b: Booking) =>
    now.getHours() >= 18 && (b.booking_status === 'Paid' || b.booking_status === 'Reserved_Unpaid');

  const filtered = bookings.filter((b) => {
    if (overdueOnly) return isOverdue(b);
    if (tab === 'paid')      return b.booking_status === 'Paid';
    if (tab === 'unpaid')    return b.booking_status === 'Reserved_Unpaid';
    if (tab === 'checked_in')return b.booking_status === 'Checked_In';
    return true;
  });

  const paid     = bookings.filter((b) => b.booking_status === 'Paid').length;
  const unpaid   = bookings.filter((b) => b.booking_status === 'Reserved_Unpaid').length;
  const checkedIn= bookings.filter((b) => b.booking_status === 'Checked_In').length;
  const overdue  = bookings.filter(isOverdue).length;

  return (
    <div className="max-w-5xl space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {overdueOnly ? 'Overdue Arrivals' : "Today's Arrivals"}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-ET', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-gray-500">
          <RefreshIcon className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Overdue banner */}
      {overdue > 0 && !overdueOnly && (
        <Link href="/dashboard/arrivals?overdue=1"
          className="flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 hover:bg-red-100 transition-colors">
          <AlertIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              {overdue} overdue arrival{overdue !== 1 ? 's' : ''} past 18:00
            </p>
            <p className="text-xs text-red-700">Contact these guests immediately</p>
          </div>
          <ChevronRightIcon className="ml-auto h-4 w-4 text-red-500" />
        </Link>
      )}

      {/* Summary counts + tabs */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="grid grid-cols-4 divide-x divide-gray-200 border-b border-gray-200">
          {[
            { key: 'all',       label: 'All arrivals',  count: bookings.length,   color: 'text-gray-900' },
            { key: 'paid',      label: 'Paid & ready',  count: paid,              color: 'text-blue-700' },
            { key: 'unpaid',    label: 'Awaiting cash', count: unpaid,            color: 'text-yellow-700' },
            { key: 'checked_in',label: 'Checked in',    count: checkedIn,         color: 'text-green-700' },
          ].map(({ key, label, count, color }) => (
            <button key={key} onClick={() => setTab(key as Tab)}
              className={`p-5 text-left transition-colors hover:bg-gray-50
                ${tab === key ? 'bg-gray-50' : ''}`}>
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{loading ? '–' : count}</div>
              <div className="text-xs font-medium text-gray-500 mt-1">{label}</div>
            </button>
          ))}
        </div>

        {/* Arrivals table */}
        {loading ? (
          <div className="space-y-0">
            {[1,2,3,4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 w-40 rounded" />
                <div className="skeleton h-4 w-24 rounded ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            {overdueOnly ? 'No overdue arrivals — all guests accounted for.' : 'No arrivals match this filter.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((booking) => {
              const overdue = isOverdue(booking);
              const isActing = actingOn === booking.id;
              return (
                <div key={booking.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50
                    ${overdue ? 'bg-red-50/50' : ''}`}>

                  {/* Status indicator */}
                  <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full
                    ${booking.booking_status === 'Paid' ? 'bg-blue-500' :
                      booking.booking_status === 'Reserved_Unpaid' ? 'bg-yellow-500' :
                      booking.booking_status === 'Checked_In' ? 'bg-green-500' : 'bg-gray-300'}`}
                  />

                  {/* Guest info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">{booking.guest_name}</span>
                      {overdue && <span className="badge-urgent">Overdue</span>}
                      {booking.special_request && (
                        <span title={booking.special_request}
                          className="badge-paid cursor-help">Special request</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span className="font-mono-data">{booking.booking_reference}</span>
                      {booking.room_number && <span>Room {booking.room_number}</span>}
                      {booking.guest_phone && (
                        <a href={`tel:${booking.guest_phone}`}
                          className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium">
                          <PhoneIcon className="h-3 w-3" />
                          {booking.guest_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <BookingStatusBadge status={booking.booking_status as any} />

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/dashboard/bookings/${booking.id}`}
                      className="btn-ghost text-xs">
                      Details
                    </Link>
                    {booking.booking_status === 'Paid' && (
                      <button
                        onClick={() => handleCheckin(booking.id)}
                        disabled={isActing}
                        className="btn-primary text-xs">
                        {isActing ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Checking in…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CheckIcon className="h-3.5 w-3.5" />
                            Check in
                          </span>
                        )}
                      </button>
                    )}
                    {booking.booking_status === 'Reserved_Unpaid' && (
                      <Link href={`/dashboard/bookings/${booking.id}?action=cash`}
                        className="btn-secondary text-xs border-yellow-300 text-yellow-800 bg-yellow-50 hover:bg-yellow-100">
                        Collect cash
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
