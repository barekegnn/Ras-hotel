'use client';

// ============================================================
// Booking Detail Page
// src/app/(staff)/dashboard/bookings/[id]/page.tsx
//
// Full booking management: status transitions, payments, extensions, history
// Requirements 20.1–20.10, 31.1–31.7, 36.1–36.8, 38.1–38.5
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookingStatusBadge } from '@/components/staff/BookingStatusBadge';
import {
  ArrowLeftIcon, CheckIcon, AlertIcon, PhoneIcon, MailIcon,
  ClockIcon, DoorOpenIcon, CreditCardIcon, EditIcon, FileTextIcon,
  RefreshIcon, ChevronDownIcon,
} from '@/components/staff/Icons';
import Link from 'next/link';
import type { Booking } from '@/shared/types/domain';

interface ExtendedBooking extends Booking {
  room_number?: string;
  room_type?: string;
  room_photos?: Array<{ storage_url: string }>;
}

interface StatusHistory {
  booking_id: string;
  previous_status: string | null;
  new_status: string;
  actor: string;
  transitioned_at: string;
}

function MailIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');

  const [booking,    setBooking]    = useState<ExtendedBooking | null>(null);
  const [history,    setHistory]    = useState<StatusHistory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [expanding,  setExpanding]  = useState<Record<string, boolean>>({ actions: true, history: false, guest: true });

  // Modals
  const [showCashModal,   setShowCashModal]   = useState(action === 'cash');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [cashAmount,      setCashAmount]      = useState('');
  const [newCheckOut,     setNewCheckOut]     = useState('');
  const [extendPreview,   setExtendPreview]   = useState<any>(null);
  const [modalLoading,    setModalLoading]    = useState(false);
  const [modalError,      setModalError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/bookings/${params.id}`);
      if (!res.ok) throw new Error('Booking not found');
      const json = await res.json();
      setBooking(json.data);
      const histRes = await fetch(`/api/v1/bookings/${params.id}/history`);
      if (histRes.ok) {
        const histJson = await histRes.json();
        setHistory(histJson.data ?? []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  // Standalone action handlers
  async function handleAction(action: string) {
    if (!booking) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const endpoint = `/api/v1/bookings/${booking.id}/${action}`;
      const res = await fetch(endpoint, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error?.message ?? `Action failed: ${action}`);
        return;
      }
      await load();
      setShowCashModal(false);
      setShowExtendModal(false);
    } finally {
      setModalLoading(false);
    }
  }

  // Record cash payment
  async function handleCashPayment() {
    if (!booking || !cashAmount) return;
    const amount = Number(cashAmount);
    if (isNaN(amount) || amount <= 0) {
      setModalError('Please enter a valid amount');
      return;
    }
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${booking.id}/cash-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error?.message ?? 'Payment recording failed');
        return;
      }
      setCashAmount('');
      setShowCashModal(false);
      await load();
    } finally {
      setModalLoading(false);
    }
  }

  // Extend stay
  async function handleExtend(confirm = false) {
    if (!booking || !newCheckOut) return;
    if (newCheckOut <= booking.check_out_date) {
      setModalError('New check-out must be after current date');
      return;
    }
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${booking.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_check_out_date: newCheckOut, confirm }),
      });
      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error?.message ?? 'Extension failed');
        return;
      }
      if (!confirm && json.data?.preview) {
        setExtendPreview(json.data);
        return;
      }
      setNewCheckOut('');
      setExtendPreview(null);
      setShowExtendModal(false);
      await load();
    } finally {
      setModalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-4xl space-y-4">
        <Link href="/dashboard/bookings" className="btn-ghost text-gray-500">
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertIcon className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-900 font-semibold">{error ?? 'Booking not found'}</p>
        </div>
      </div>
    );
  }

  const isCheckedIn = booking.booking_status === 'Checked_In';
  const isPaid = booking.booking_status === 'Paid';
  const isUnpaid = booking.booking_status === 'Reserved_Unpaid';

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bookings" className="btn-ghost text-gray-500">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {booking.booking_reference}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{booking.guest_name}</p>
          </div>
        </div>
        <BookingStatusBadge status={booking.booking_status as any} />
      </div>

      {/* Action buttons — Req 20.1–20.10 */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => setExpanding((e) => ({ ...e, actions: !e.actions }))}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 font-semibold text-gray-900">
          <span>Quick actions</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanding.actions ? 'rotate-180' : ''}`} />
        </button>

        {expanding.actions && (
          <div className="border-t border-gray-200 grid grid-cols-2 gap-3 p-4">
            {/* Check-in */}
            {isPaid && (
              <button
                onClick={() => handleAction('checkin')}
                className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 hover:bg-green-100 transition-colors">
                <DoorOpenIcon className="h-4 w-4" />
                Check in guest
              </button>
            )}

            {/* Check-out */}
            {isCheckedIn && (
              <button
                onClick={() => handleAction('checkout')}
                className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100 transition-colors">
                <CheckIcon className="h-4 w-4" />
                Check out guest
              </button>
            )}

            {/* Record cash payment */}
            {isUnpaid && (
              <button
                onClick={() => setShowCashModal(true)}
                className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800 hover:bg-yellow-100 transition-colors">
                <CreditCardIcon className="h-4 w-4" />
                Collect payment
              </button>
            )}

            {/* Extend stay */}
            {isCheckedIn && (
              <button
                onClick={() => setShowExtendModal(true)}
                className="flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-100 transition-colors">
                <ClockIcon className="h-4 w-4" />
                Extend stay
              </button>
            )}

            {/* No-show */}
            {(isUnpaid || isPaid) && !isCheckedIn && (
              <button
                onClick={() => {
                  if (confirm('Mark as no-show?')) handleAction('no-show');
                }}
                className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 hover:bg-orange-100 transition-colors">
                <AlertIcon className="h-4 w-4" />
                Mark no-show
              </button>
            )}

            {/* Print/download ticket */}
            {!['Cancelled_Full_Refund', 'Cancelled_Partial_Refund', 'Cancelled_No_Refund', 'No_Show'].includes(booking.booking_status) && (
              <a
                href={`/api/v1/bookings/${booking.id}/ticket/pdf`}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <FileTextIcon className="h-4 w-4" />
                Download ticket
              </a>
            )}
          </div>
        )}
      </div>

      {/* Outstanding payment alert */}
      {isUnpaid && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
          <AlertIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-yellow-900">Outstanding balance</p>
            <p className="text-sm text-yellow-700 mt-0.5">
              ETB {booking.total_amount?.toFixed(2)} pending payment
            </p>
          </div>
          <button
            onClick={() => setShowCashModal(true)}
            className="btn-secondary text-xs border-yellow-400 text-yellow-900 bg-yellow-100 hover:bg-yellow-200">
            Collect now
          </button>
        </div>
      )}

      {/* Guest info section */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => setExpanding((e) => ({ ...e, guest: !e.guest }))}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 font-semibold text-gray-900">
          <span>Guest information</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanding.guest ? 'rotate-180' : ''}`} />
        </button>

        {expanding.guest && (
          <div className="border-t border-gray-200 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Full name', value: booking.guest_name },
                { label: 'Age', value: booking.guest_age },
                { label: 'Sex', value: booking.guest_sex },
                { label: 'Nationality', value: booking.guest_nationality },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 flex items-center gap-4">
              <a href={`tel:${booking.guest_phone}`}
                className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
                <PhoneIcon className="h-4 w-4" />
                {booking.guest_phone}
              </a>
              {booking.special_request && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-gray-400 mb-1">Special request</p>
                  <p className="text-sm text-gray-700">{booking.special_request}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Booking details */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Check-in', value: booking.check_in_date },
          { label: 'Check-out', value: booking.check_out_date },
          { label: 'Room', value: booking.room_number ? `${booking.room_number} (${booking.room_type})` : booking.room_type ?? '—' },
          { label: 'Total amount', value: `ETB ${booking.total_amount?.toFixed(2) ?? '—'}` },
          { label: 'Payment method', value: booking.payment_method ?? '—' },
          { label: 'Booked via', value: booking.source === 'walk_in' ? 'Walk-in (staff)' : 'Online' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Status history */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => setExpanding((e) => ({ ...e, history: !e.history }))}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 font-semibold text-gray-900">
          <span>Status history</span>
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${expanding.history ? 'rotate-180' : ''}`} />
        </button>

        {expanding.history && (
          <div className="border-t border-gray-200 divide-y divide-gray-100">
            {history.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-gray-400">No history yet</div>
            ) : (
              history.map((entry, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <div className="text-xs font-mono text-gray-500 flex-shrink-0 w-20">
                    {new Date(entry.transitioned_at).toLocaleTimeString('en-ET')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {entry.previous_status ? `${entry.previous_status} → ${entry.new_status}` : `Created as ${entry.new_status}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Cash payment modal */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Record cash payment</h3>
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm font-semibold text-yellow-900">Outstanding amount</p>
              <p className="text-2xl font-bold text-yellow-700 mt-1">ETB {booking.total_amount?.toFixed(2)}</p>
            </div>
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="ETB 0.00"
              className="field-input text-lg font-semibold tabular-nums"
              autoFocus
            />
            {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowCashModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCashPayment} disabled={modalLoading} className="btn-primary flex-1">
                {modalLoading ? 'Recording…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend stay modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Extend stay</h3>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current check-out</p>
              <p className="text-lg font-semibold text-gray-900">{booking.check_out_date}</p>
            </div>
            <input
              type="date"
              value={newCheckOut}
              onChange={(e) => setNewCheckOut(e.target.value)}
              min={booking.check_out_date}
              className="field-input"
              autoFocus
            />
            {extendPreview && (
              <div className="rounded-lg bg-harar-50 border border-harar-200 p-4">
                <p className="text-xs font-semibold text-harar-600 uppercase tracking-wide mb-2">Additional charge</p>
                <p className="text-2xl font-bold text-harar-700">ETB {extendPreview.additional_amount?.toFixed(2)}</p>
                <p className="text-xs text-harar-600 mt-2">
                  {extendPreview.total_nights} night{extendPreview.total_nights !== 1 ? 's' : ''} · Total: ETB {extendPreview.new_total?.toFixed(2)}
                </p>
              </div>
            )}
            {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setShowExtendModal(false); setExtendPreview(null); }} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => handleExtend(!!extendPreview)}
                disabled={modalLoading}
                className="btn-primary flex-1">
                {modalLoading ? 'Processing…' : extendPreview ? 'Confirm extension' : 'Preview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
