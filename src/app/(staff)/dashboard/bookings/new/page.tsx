'use client';

// ============================================================
// Manual Booking Form — Walk-in guest registration
// src/app/(staff)/dashboard/bookings/new/page.tsx
// Requirements 4.1–4.9
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { validateBookingForm, validateEthiopianPhone } from '@/shared/lib/validation';
import { ArrowLeftIcon, CheckIcon, AlertIcon } from '@/components/staff/Icons';
import Link from 'next/link';

interface RoomOption {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  nightly_rate: number;
  is_available: boolean;
  room_status: string;
}

interface PricePreview {
  nights: number;
  total: number;
  breakdown: Array<{ date: string; rate: number }>;
}

type PaymentStatus = 'cash_paid' | 'cash_pending';

const NATIONALITIES = [
  'Ethiopian', 'Eritrean', 'Kenyan', 'Somali', 'Djiboutian', 'Sudanese',
  'American', 'British', 'French', 'German', 'Chinese', 'Indian', 'Other',
];

export default function NewBookingPage() {
  const router = useRouter();

  // Form state
  const [guestName,    setGuestName]    = useState('');
  const [guestAge,     setGuestAge]     = useState('');
  const [guestSex,     setGuestSex]     = useState('');
  const [guestPhone,   setGuestPhone]   = useState('');
  const [guestNat,     setGuestNat]     = useState('Ethiopian');
  const [checkIn,      setCheckIn]      = useState('');
  const [checkOut,     setCheckOut]     = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [payStatus,    setPayStatus]    = useState<PaymentStatus>('cash_paid');
  const [specialReq,   setSpecialReq]   = useState('');

  // Data state
  const [rooms,        setRooms]        = useState<RoomOption[]>([]);
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);

  // Fetch available rooms when dates change
  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setLoadingRooms(true);
    setSelectedRoom('');
    setPricePreview(null);
    fetch(`/api/v1/rooms?check_in=${checkIn}&check_out=${checkOut}`)
      .then((r) => r.json())
      .then((j) => setRooms((j.data ?? []) as RoomOption[]))
      .finally(() => setLoadingRooms(false));
  }, [checkIn, checkOut]);

  // Price preview when room + dates are set
  useEffect(() => {
    if (!selectedRoom || !checkIn || !checkOut) { setPricePreview(null); return; }
    const room = rooms.find((r) => r.id === selectedRoom);
    if (!room) return;
    setLoadingPrice(true);
    const nights = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
    const total  = room.nightly_rate * nights;
    setPricePreview({ nights, total, breakdown: [] });
    setLoadingPrice(false);
  }, [selectedRoom, checkIn, checkOut, rooms]);

  // Validate phone on change
  useEffect(() => {
    if (!guestPhone) return;
    if (!validateEthiopianPhone(guestPhone)) {
      setErrors((e) => ({ ...e, guestPhone: 'Enter a valid Ethiopian number (e.g. 0912345678)' }));
    } else {
      setErrors((e) => { const { guestPhone: _, ...rest } = e; return rest; });
    }
  }, [guestPhone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    // Client validation
    const v = validateBookingForm({
      guest_name: guestName, guest_age: guestAge, guest_sex: guestSex,
      guest_phone: guestPhone, guest_nationality: guestNat,
      check_in_date: checkIn, check_out_date: checkOut,
    });
    if (!v.valid || !selectedRoom) {
      const errs: Record<string, string> = {};
      Object.entries(v.errors).forEach(([k, msg]) => { if (msg) errs[k] = msg; });
      if (!selectedRoom) errs.room = 'Please select a room';
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id:          selectedRoom,
          guest_name:       guestName.trim(),
          guest_age:        Number(guestAge),
          guest_sex:        guestSex,
          guest_phone:      guestPhone.trim(),
          guest_nationality:guestNat,
          guest_language:   'en',
          check_in_date:    checkIn,
          check_out_date:   checkOut,
          payment_method:   'cash',
          special_request:  specialReq.trim() || undefined,
          source:           'walk_in',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? 'Booking failed');
        return;
      }

      const { booking_reference, booking_id } = json.data;

      // If cash paid, record the payment immediately
      if (payStatus === 'cash_paid' && pricePreview) {
        await fetch(`/api/v1/bookings/${booking_id}/cash-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: pricePreview.total }),
        });
      }

      setSuccess(booking_reference);
      setTimeout(() => router.push(`/dashboard/bookings/${booking_id}`), 1500);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const today    = new Date().toISOString().slice(0, 10);
  const minCheck = checkIn || today;
  const room     = rooms.find((r) => r.id === selectedRoom);

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/bookings" className="btn-ghost text-gray-500">
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New walk-in booking</h1>
          <p className="mt-0.5 text-sm text-gray-500">Register a guest at the front desk</p>
        </div>
      </div>

      {/* Success state */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
            <CheckIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-green-900">Booking confirmed</p>
            <p className="text-sm text-green-700 font-mono-data mt-0.5">{success}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Step 1: Dates and Room ─────────────────────────── */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-700">1 · Dates &amp; room</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Check-in date</label>
                <input type="date" min={today} value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className={`field-input ${errors.check_in_date ? 'border-red-400' : ''}`} />
                {errors.check_in_date && <p className="field-error">{errors.check_in_date}</p>}
              </div>
              <div>
                <label className="field-label">Check-out date</label>
                <input type="date" min={minCheck} value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={`field-input ${errors.check_out_date ? 'border-red-400' : ''}`} />
                {errors.check_out_date && <p className="field-error">{errors.check_out_date}</p>}
              </div>
            </div>

            {/* Room selector */}
            {checkIn && checkOut && checkOut > checkIn && (
              <div>
                <label className="field-label">Room</label>
                {loadingRooms ? (
                  <div className="skeleton h-10 rounded-lg w-full" />
                ) : rooms.length === 0 ? (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                    No rooms available for these dates.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {rooms.map((r) => (
                      <button
                        key={r.id} type="button"
                        disabled={!r.is_available}
                        onClick={() => setSelectedRoom(r.id === selectedRoom ? '' : r.id)}
                        className={`rounded-lg border-2 p-3.5 text-left transition-all
                          ${!r.is_available ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50' :
                            r.id === selectedRoom
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">Room {r.room_number}</span>
                          <span className={`text-xs font-semibold ${r.is_available ? 'text-green-700' : 'text-gray-400'}`}>
                            {r.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.room_type} · Floor {r.floor}</div>
                        <div className="text-sm font-semibold text-brand-700 mt-1.5">
                          ETB {r.nightly_rate.toFixed(0)}/night
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {errors.room && <p className="field-error">{errors.room}</p>}
              </div>
            )}

            {/* Price preview — Req 4.7 */}
            {pricePreview && room && (
              <div className="rounded-lg bg-harar-50 border border-harar-200 p-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-semibold text-harar-900">
                      Room {room.room_number} · {pricePreview.nights} night{pricePreview.nights !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-harar-700 mt-0.5">
                      ETB {room.nightly_rate.toFixed(0)} × {pricePreview.nights} nights
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-harar-900">
                      ETB {pricePreview.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-harar-600">Total amount</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Step 2: Guest details ──────────────────────────── */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-700">2 · Guest details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="field-label">Full name</label>
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                  placeholder="As on government ID"
                  className={`field-input ${errors.guest_name ? 'border-red-400' : ''}`} />
                {errors.guest_name && <p className="field-error">{errors.guest_name}</p>}
              </div>
              <div>
                <label className="field-label">Age</label>
                <input type="number" min="1" max="120" value={guestAge}
                  onChange={(e) => setGuestAge(e.target.value)}
                  className={`field-input ${errors.guest_age ? 'border-red-400' : ''}`} />
                {errors.guest_age && <p className="field-error">{errors.guest_age}</p>}
              </div>
              <div>
                <label className="field-label">Sex</label>
                <select value={guestSex} onChange={(e) => setGuestSex(e.target.value)}
                  className={`field-input ${errors.guest_sex ? 'border-red-400' : ''}`}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                {errors.guest_sex && <p className="field-error">{errors.guest_sex}</p>}
              </div>
              <div>
                <label className="field-label">Phone number</label>
                <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className={`field-input ${errors.guestPhone || errors.guest_phone ? 'border-red-400' : ''}`} />
                {(errors.guestPhone || errors.guest_phone) && (
                  <p className="field-error">{errors.guestPhone ?? errors.guest_phone}</p>
                )}
              </div>
              <div>
                <label className="field-label">Nationality</label>
                <select value={guestNat} onChange={(e) => setGuestNat(e.target.value)}
                  className="field-input">
                  {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Special request — Req 4.8 */}
            <div>
              <label className="field-label">Special request <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={specialReq} onChange={(e) => setSpecialReq(e.target.value)}
                rows={2} placeholder="Early check-in, extra bedding, ground floor…"
                className="field-input resize-none" />
            </div>
          </div>
        </section>

        {/* ── Step 3: Payment ────────────────────────────────── */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-700">3 · Payment status</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              { value: 'cash_paid',    label: 'Cash paid now',    sub: 'Guest has paid in full at the desk' },
              { value: 'cash_pending', label: 'Cash pending',     sub: 'Guest will pay at arrival' },
            ].map(({ value, label, sub }) => (
              <label key={value}
                className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all
                  ${payStatus === value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <input type="radio" name="payStatus" value={value}
                  checked={payStatus === value}
                  onChange={() => setPayStatus(value as PaymentStatus)}
                  className="mt-0.5 accent-brand-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Submit error */}
        {submitError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3.5 text-sm text-red-900">
            <AlertIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-600" />
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Link href="/dashboard/bookings" className="btn-secondary flex-1 justify-center">Cancel</Link>
          <button type="submit" disabled={submitting || !selectedRoom}
            className="btn-primary flex-1 justify-center">
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Creating booking…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4" />
                Create booking
                {pricePreview && ` · ETB ${pricePreview.total.toFixed(2)}`}
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
