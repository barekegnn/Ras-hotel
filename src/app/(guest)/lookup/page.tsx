'use client';

// ============================================================
// Booking Lookup Page
// src/app/(guest)/lookup/page.tsx
//
// Guests can find their booking and view confirmation details.
// Requirements 30.1–30.6, 18.5
// ============================================================

import { useState, FormEvent } from 'react';
import { CheckIcon, AlertIcon, PhoneIcon, DoorOpenIcon, CalendarIcon, CreditCardIcon, DownloadIcon } from '@/components/staff/Icons';
import Link from 'next/link';

interface BookingInfo {
  booking_reference: string;
  guest_name: string;
  room_type: string;
  room_number?: string;
  check_in_date: string;
  check_out_date: string;
  booking_status: string;
  total_amount: number;
  payment_method: string;
  special_request: string | null;
  pdf_download_url: string | null;
  outstanding_amount: number | null;
  check_in_instructions: {
    hotel_address: string;
    hotel_phone: string;
    reception_hours: string;
    checkin_time: string;
    what_to_bring: string;
  };
}

const BOOKING_STATUS_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  reserved_unpaid:          { bg: 'bg-yellow-50',  text: 'text-yellow-900', icon: '⏳' },
  paid:                     { bg: 'bg-blue-50',    text: 'text-blue-900',   icon: '✓' },
  checked_in:               { bg: 'bg-green-50',   text: 'text-green-900',  icon: '🔑' },
  checked_out:              { bg: 'bg-gray-50',    text: 'text-gray-900',   icon: '✓' },
  cancelled_full_refund:    { bg: 'bg-red-50',     text: 'text-red-900',    icon: '✗' },
  cancelled_partial_refund: { bg: 'bg-red-50',     text: 'text-red-900',    icon: '✗' },
  cancelled_no_refund:      { bg: 'bg-red-50',     text: 'text-red-900',    icon: '✗' },
  no_show:                  { bg: 'bg-orange-50',  text: 'text-orange-900', icon: '—' },
};
const DEFAULT_STATUS_COLOR = { bg: 'bg-gray-50', text: 'text-gray-900', icon: '📋' };
function getStatusColor(status: string) {
  return BOOKING_STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR;
}

export default function LookupPage() {
  const [ref, setRef]           = useState('');
  const [phone, setPhone]       = useState('');
  const [booking, setBooking]   = useState<BookingInfo | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBooking(null);
    setSearched(true);

    try {
      const res = await fetch(
        `/api/v1/bookings/lookup?ref=${encodeURIComponent(ref.trim().toUpperCase())}&phone=${encodeURIComponent(phone.trim())}`
      );

      if (!res.ok) {
        setError('Booking not found. Please check your reference and phone number.');
        return;
      }

      const json = await res.json();
      setBooking(json.data);
    } catch {
      setError('Unable to look up your booking. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-harar-50 to-white py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">

        {/* Header */}
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Find your booking</h1>
          <p className="text-lg text-gray-600">
            Enter your booking reference and phone number to view your reservation details.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch}
          className="rounded-2xl bg-white shadow-lg p-8 sm:p-10 mb-8 space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Booking reference
              </label>
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value.toUpperCase())}
                placeholder="RAS-XXXXXX"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono
                           text-gray-900 placeholder:text-gray-400
                           focus:border-harar-500 focus:outline-none focus:ring-2 focus:ring-harar-500/20
                           uppercase tracking-wider"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center
                           text-gray-900 placeholder:text-gray-400
                           focus:border-harar-500 focus:outline-none focus:ring-2 focus:ring-harar-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !ref || !phone}
            className="w-full rounded-lg bg-harar-600 px-6 py-3 font-semibold text-white
                       hover:bg-harar-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? 'Searching...' : 'Find booking'}
          </button>
        </form>

        {/* Results */}
        {searched && !booking && error && (
          <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-8 text-center space-y-4">
            <AlertIcon className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h2 className="text-lg font-bold text-red-900">{error}</h2>
              <p className="text-sm text-red-700 mt-2">
                Double-check the booking reference and phone number you used when booking.
              </p>
            </div>
          </div>
        )}

        {booking && (
          <div className="space-y-6">

            {/* Status card */}
            <div className={`rounded-2xl ${getStatusColor(booking.booking_status).bg} border-2 border-current p-8`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-5xl font-bold ${getStatusColor(booking.booking_status).text}`}>
                    {getStatusColor(booking.booking_status).icon}
                  </p>
                  <h2 className="text-3xl font-bold text-gray-900 mt-4">
                    {booking.guest_name}
                  </h2>
                  <p className="font-mono text-lg text-gray-600 mt-2">{booking.booking_reference}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold uppercase tracking-wide ${getStatusColor(booking.booking_status).text}`}>
                    {booking.booking_status === 'reserved_unpaid' ? 'Awaiting payment' :
                     booking.booking_status === 'paid'            ? 'Paid & ready' :
                     booking.booking_status === 'checked_in'      ? 'Currently staying' :
                     booking.booking_status === 'checked_out'     ? 'Completed' :
                     booking.booking_status.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              {/* Outstanding payment alert */}
              {booking.outstanding_amount && booking.outstanding_amount > 0 && (
                <div className="mt-6 flex items-center gap-3 rounded-lg bg-white/50 px-4 py-3 border border-yellow-300">
                  <AlertIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-900">Outstanding balance</p>
                    <p className="text-sm text-yellow-800 mt-0.5">
                      ETB {booking.outstanding_amount.toFixed(2)} pending
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: CalendarIcon, label: 'Check-in', value: booking.check_in_date },
                { icon: CalendarIcon, label: 'Check-out', value: booking.check_out_date },
                { icon: DoorOpenIcon, label: 'Room', value: booking.room_number ? `${booking.room_number} (${booking.room_type})` : booking.room_type },
                { icon: CreditCardIcon, label: 'Amount', value: `ETB ${booking.total_amount.toFixed(2)}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg bg-white border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-harar-600" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Special request */}
            {booking.special_request && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide text-blue-600 mb-2">Special request</h3>
                <p className="text-gray-900">{booking.special_request}</p>
              </div>
            )}

            {/* Check-in information */}
            <div className="rounded-2xl bg-harar-50 border border-harar-200 p-8 space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Check-in information</h3>

              {[
                { label: 'Check-in time', value: booking.check_in_instructions.checkin_time },
                { label: 'Hotel address', value: booking.check_in_instructions.hotel_address },
                { label: 'Reception', value: booking.check_in_instructions.reception_hours },
                { label: 'What to bring', value: booking.check_in_instructions.what_to_bring },
              ].map(({ label, value }) => (
                <div key={label} className="pb-4 border-b border-harar-200 last:pb-0 last:border-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-harar-600 mb-1">{label}</p>
                  <p className="text-gray-900">{value}</p>
                </div>
              ))}

              <div className="flex items-center gap-2 text-harar-700">
                <PhoneIcon className="h-5 w-5 flex-shrink-0" />
                <a href={`tel:${booking.check_in_instructions.hotel_phone}`}
                  className="font-semibold hover:underline">
                  {booking.check_in_instructions.hotel_phone}
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              {booking.pdf_download_url && (
                <a href={booking.pdf_download_url} download
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 py-3
                             font-semibold text-white hover:bg-brand-600 transition-all">
                  <DownloadIcon className="h-4 w-4" />
                  Download ticket
                </a>
              )}
              <Link href="/book"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-center
                           font-semibold text-gray-700 hover:bg-gray-50 transition-all">
                Make another booking
              </Link>
            </div>

            {/* Help section */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-700">
                Questions about your booking?{' '}
                <a href="mailto:reservation@hararrashotel.com" className="font-semibold text-harar-600 hover:text-harar-700">
                  Contact us
                </a>
              </p>
            </div>
          </div>
        )}

        {!searched && !booking && (
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-600">
              Use the form above to find your booking and view all the details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
