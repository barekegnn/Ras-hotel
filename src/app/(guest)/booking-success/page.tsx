'use client';

// ============================================================
// Booking Success Page
// src/app/(guest)/booking-success/page.tsx
// ============================================================

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface BookingDetails {
  booking_reference: string;
  guest_name:        string;
  room_number:       string;
  room_type:         string;
  check_in_date:     string;
  check_out_date:    string;
  nights:            number;
  total_amount:      number;
  booking_status:    string;
  payment_method:    string;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId    = searchParams.get('booking_id');

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided.');
      setLoading(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 6;

    async function fetchBooking() {
      try {
        const res  = await fetch(`/api/v1/bookings/${bookingId}/summary`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load booking');
        setBooking(json.data);
        setLoading(false);
      } catch (err: unknown) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(fetchBooking, 2000);
        } else {
          const msg = err instanceof Error ? err.message : 'Could not load booking details.';
          setError(msg);
          setLoading(false);
        }
      }
    }

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full border-4 border-brand-200 border-t-brand-500 animate-spin" />
          <p className="text-gray-600 font-medium">Confirming your booking…</p>
          <p className="text-sm text-gray-400">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center text-3xl">⚠️</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment received</h1>
            <p className="mt-2 text-gray-600">
              Your payment was processed but we couldn&apos;t load your booking details right now.
            </p>
          </div>
          {bookingId && (
            <p className="text-sm text-gray-500">
              Booking ID: <span className="font-mono text-gray-700">{bookingId}</span>
            </p>
          )}
          <p className="text-sm text-gray-600">
            Use{' '}
            <Link href="/lookup" className="text-brand-600 underline hover:text-brand-700">
              Find my booking
            </Link>{' '}
            to look up your reservation.
          </p>
          <Link href="/"
            className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-6 py-2.5
                       font-semibold text-white hover:bg-brand-600 transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = ['paid', 'checked_in'].includes(booking.booking_status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 sm:py-20">
      <div className="mx-auto max-w-lg px-6 sm:px-8">

        <div className="text-center mb-10">
          <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center text-4xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isPaid ? 'Booking confirmed!' : 'Booking received!'}
          </h1>
          <p className="mt-2 text-gray-600">
            {isPaid
              ? 'Your payment was successful. See you soon!'
              : 'Your booking is being processed. You will receive a confirmation shortly.'}
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-xl overflow-hidden">
          <div className="bg-brand-500 px-8 py-5 text-center">
            <p className="text-sm font-medium text-brand-100">Booking reference</p>
            <p className="text-3xl font-black text-white tracking-widest mt-1">{booking.booking_reference}</p>
          </div>
          <div className="p-8 space-y-4">
            <Row label="Guest" value={booking.guest_name} />
            <Row label="Room"  value={`${booking.room_number} — ${booking.room_type}`} />
            <div className="grid grid-cols-2 gap-4">
              <Row label="Check-in"  value={formatDate(booking.check_in_date)} />
              <Row label="Check-out" value={formatDate(booking.check_out_date)} />
            </div>
            <Row label="Duration" value={`${booking.nights} night${booking.nights !== 1 ? 's' : ''}`} />
            <div className="border-t border-gray-100 pt-4">
              <Row label="Total paid" value={`ETB ${Number(booking.total_amount).toLocaleString()}`} bold />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold
                ${isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {isPaid ? '✓ Payment confirmed' : '⏳ Payment pending'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Link href="/lookup"
            className="flex w-full items-center justify-center rounded-lg border-2 border-brand-500
                       px-6 py-3 font-semibold text-brand-600 hover:bg-brand-50 transition-colors">
            View booking details
          </Link>
          <Link href="/"
            className="flex w-full items-center justify-center rounded-lg bg-gray-100
                       px-6 py-3 font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
            Back to home
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Questions? Contact us at{' '}
          <a href="tel:+251256660027" className="text-brand-600 hover:underline">+251256660027</a>
        </p>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white">
        <div className="h-16 w-16 rounded-full border-4 border-brand-200 border-t-brand-500 animate-spin" />
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm ${bold ? 'text-lg font-bold text-brand-600' : 'font-semibold text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}
