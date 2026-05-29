'use client';

// ============================================================
// Today's Departures
// src/app/(staff)/dashboard/departures/page.tsx
// Requirements 17.2, 17.5, 17.6, 18.1–18.6
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { BookingStatusBadge } from '@/components/staff/BookingStatusBadge';
import { CheckIcon, AlertIcon, RefreshIcon } from '@/components/staff/Icons';
import Link from 'next/link';
import type { Booking } from '@/shared/types/domain';

export default function DeparturesPage() {
  const [bookings,        setBookings]        = useState<Booking[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [actingOn,        setActingOn]        = useState<string | null>(null);
  const [confirmPayment,  setConfirmPayment]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res   = await fetch(`/api/v1/bookings?check_in_from=${today}&check_in_to=${today}&per_page=100`);
      const json  = await res.json();
      const departures = ((json.data ?? []) as Booking[])
        .filter((b) => b.booking_status === 'checked_in' || b.booking_status === 'paid')
        .sort((a) => (a.booking_status === 'checked_in' ? -1 : 1));
      setBookings(departures);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCheckout(bookingId: string, forceConfirm = false) {
    setActingOn(bookingId);
    try {
      const res  = await fetch(`/api/v1/bookings/${bookingId}/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ confirm_payment_collected: forceConfirm }),
      });
      const json = await res.json();
      if (res.status === 409 && json.error?.code === 'PAYMENT_OUTSTANDING') {
        setConfirmPayment(bookingId);
        return;
      }
      if (res.ok) { setConfirmPayment(null); load(); }
      else alert(json.error?.message ?? 'Check-out failed');
    } finally { setActingOn(null); }
  }

  const checkedIn = bookings.filter((b) => b.booking_status === 'checked_in').length;
  const expected  = bookings.filter((b) => b.booking_status === 'paid').length;

  return (
    <div className="max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Departures</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {new Date().toLocaleDateString('en-ET', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-gray-500">
          <RefreshIcon className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Payment confirmation modal */}
      {confirmPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <h3 className="text-base font-semibold text-gray-900">Outstanding payment</h3>
            </div>
            <p className="text-sm text-gray-600">
              This booking has an outstanding balance. Confirm that payment has been collected before completing check-out.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmPayment(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleCheckout(confirmPayment, true)} className="btn-primary flex-1">
                Payment collected — check out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="stat-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Checked in (due out)</div>
          <div className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">{loading ? '–' : checkedIn}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Expected (not checked in)</div>
          <div className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">{loading ? '–' : expected}</div>
        </div>
      </div>

      {/* Departures table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Departures list</h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">No departures today.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {bookings.map((booking) => {
              const isCheckedIn = booking.booking_status === 'checked_in';
              const isActing    = actingOn === booking.id;
              return (
                <div key={booking.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-gray-50 transition-colors
                    ${isCheckedIn ? '' : 'bg-gray-50/50 opacity-70'}`}>

                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full
                      ${isCheckedIn ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{booking.guest_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                        <span className="font-mono-data">{booking.booking_reference}</span>
                        <span>Out: {booking.check_out_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 pl-5 sm:pl-0">
                    <BookingStatusBadge status={booking.booking_status} />
                    <Link href={`/dashboard/bookings/${booking.id}`} className="btn-ghost text-xs">
                      Details
                    </Link>
                    {isCheckedIn && (
                      <button onClick={() => handleCheckout(booking.id)} disabled={isActing}
                        className="btn-primary text-xs">
                        {isActing ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            <span className="hidden sm:inline">Checking out…</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CheckIcon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Check out</span>
                          </span>
                        )}
                      </button>
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
