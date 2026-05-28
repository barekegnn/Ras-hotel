'use client';

// ============================================================
// Pending Refunds Page
// src/app/(staff)/dashboard/settings/refunds/page.tsx
//
// Manager view of all cancelled bookings with refund amounts
// that need to be processed.
// Requirements 16.8–16.9
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BookingStatusBadge } from '@/components/staff/BookingStatusBadge';

interface RefundBooking {
  id:                string;
  booking_reference: string;
  guest_name:        string;
  guest_phone:       string;
  total_amount:      number;
  booking_status:    string;
  payment_method:    string;
  check_in_date:     string;
  updated_at:        string;
  refund_amount:     number | null;
  refund_processed_at: string | null;
}

const REFUND_TIERS: Record<string, { label: string; pct: number; color: string }> = {
  cancelled_full_refund:    { label: 'Full refund',    pct: 100, color: 'text-green-700 bg-green-50 border-green-200' },
  cancelled_partial_refund: { label: '50% refund',     pct: 50,  color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  cancelled_no_refund:      { label: 'No refund',      pct: 0,   color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

export default function RefundsPage() {
  const [bookings,  setBookings]  = useState<RefundBooking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all cancelled bookings
      const statuses = [
        'cancelled_full_refund',
        'cancelled_partial_refund',
        'cancelled_no_refund',
      ];
      const results = await Promise.all(
        statuses.map((s) =>
          fetch(`/api/v1/bookings?status=${s}&per_page=100`).then((r) => r.json())
        )
      );
      const all: RefundBooking[] = results.flatMap((r) => r.data ?? []);
      // Sort by most recently cancelled
      all.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setBookings(all);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayed = filter === 'pending'
    ? bookings.filter((b) => !b.refund_processed_at && b.booking_status !== 'cancelled_no_refund')
    : bookings;

  const totalPending = bookings
    .filter((b) => !b.refund_processed_at && b.booking_status !== 'cancelled_no_refund')
    .reduce((sum, b) => {
      const tier = REFUND_TIERS[b.booking_status];
      return sum + (b.total_amount * (tier?.pct ?? 0)) / 100;
    }, 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Refunds</h1>
        <p className="text-sm text-gray-500 mt-1">Cancelled bookings requiring refund processing</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="text-2xl font-bold text-yellow-800">
            ETB {totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-yellow-700 mt-1">Total pending refunds</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-2xl font-bold text-gray-900">
            {bookings.filter((b) => !b.refund_processed_at && b.booking_status !== 'cancelled_no_refund').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Bookings awaiting refund</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors
              ${filter === f
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'pending' ? 'Pending refunds' : 'All cancellations'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold text-gray-700">
            {filter === 'pending' ? 'No pending refunds' : 'No cancellations yet'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {displayed.map((b) => {
            const tier = REFUND_TIERS[b.booking_status];
            const refundAmt = tier ? (b.total_amount * tier.pct) / 100 : 0;
            return (
              <div key={b.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-semibold text-gray-900">{b.booking_reference}</p>
                    <BookingStatusBadge status={b.booking_status as any} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {b.guest_name} · {b.guest_phone} · Check-in: {b.check_in_date}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Payment: {b.payment_method ?? '—'} · Cancelled: {new Date(b.updated_at).toLocaleDateString('en-ET')}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ETB {refundAmt.toFixed(2)}
                    </p>
                    {tier && (
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${tier.color}`}>
                        {tier.label}
                      </span>
                    )}
                  </div>
                  <Link href={`/dashboard/bookings/${b.id}`}
                    className="text-xs text-brand-600 hover:text-brand-800 underline whitespace-nowrap">
                    View booking
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
