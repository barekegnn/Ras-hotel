'use client';

// ============================================================
// Manual Booking Form — Walk-in guest registration
// src/app/(staff)/dashboard/bookings/new/page.tsx
// Requirements 4.1–4.9
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validateBookingForm, validateEthiopianPhone } from '@/shared/lib/validation';
import { ArrowLeftIcon, CheckIcon, AlertIcon } from '@/components/staff/Icons';
import Link from 'next/link';

interface RoomOption {
  id:           string;
  room_number:  string;
  room_type:    string;
  floor:        number;
  nightly_rate: number;
  is_available: boolean;
  room_status:  string;
}

const NATIONALITIES = [
  'Ethiopian', 'Eritrean', 'Kenyan', 'Somali', 'Djiboutian', 'Sudanese',
  'American', 'British', 'French', 'German', 'Chinese', 'Indian', 'Other',
];

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Cash',     icon: '💵', desc: 'Physical cash at the desk' },
  { value: 'telebirr', label: 'TeleBirr', icon: '📱', desc: 'TeleBirr mobile payment' },
  { value: 'cbe_birr', label: 'CBE Birr', icon: '🏦', desc: 'Commercial Bank of Ethiopia' },
  { value: 'chapa',    label: 'Chapa',    icon: '💳', desc: 'Chapa digital payment' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'paid',    label: 'Paid now',    desc: 'Guest has paid in full at the desk' },
  { value: 'pending', label: 'Pay on arrival', desc: 'Guest will pay at check-in' },
];

export default function NewBookingPage() {
  const router = useRouter();

  // Step tracking
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form state
  const [guestName,    setGuestName]    = useState('');
  const [guestAge,     setGuestAge]     = useState('');
  const [guestSex,     setGuestSex]     = useState('');
  const [guestPhone,   setGuestPhone]   = useState('');
  const [guestNat,     setGuestNat]     = useState('Ethiopian');
  const [checkIn,      setCheckIn]      = useState('');
  const [checkOut,     setCheckOut]     = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [payMethod,    setPayMethod]    = useState('cash');
  const [payStatus,    setPayStatus]    = useState<'paid' | 'pending'>('paid');
  const [specialReq,   setSpecialReq]   = useState('');

  // Data state
  const [rooms,        setRooms]        = useState<RoomOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [success,      setSuccess]      = useState<{ ref: string; id: string } | null>(null);

  const today    = new Date().toISOString().slice(0, 10);
  const minCheck = checkIn || today;
  const nights   = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;
  const room     = rooms.find((r) => r.id === selectedRoom);
  const total    = room && nights > 0 ? room.nightly_rate * nights : 0;

  // Fetch available rooms when dates change
  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setLoadingRooms(true);
    setSelectedRoom('');
    fetch(`/api/v1/rooms?check_in=${checkIn}&check_out=${checkOut}`)
      .then((r) => r.json())
      .then((j) => setRooms((j.data ?? []) as RoomOption[]))
      .finally(() => setLoadingRooms(false));
  }, [checkIn, checkOut]);

  // Phone validation
  useEffect(() => {
    if (!guestPhone) return;
    if (!validateEthiopianPhone(guestPhone)) {
      setErrors((e) => ({ ...e, guestPhone: 'Enter a valid Ethiopian number (e.g. 0912345678)' }));
    } else {
      setErrors((e) => { const { guestPhone: _, ...rest } = e; return rest; });
    }
  }, [guestPhone]);

  function validateStep1() {
    const errs: Record<string, string> = {};
    if (!checkIn)              errs.check_in_date  = 'Check-in date is required';
    if (!checkOut)             errs.check_out_date = 'Check-out date is required';
    if (checkOut && checkIn && checkOut <= checkIn) errs.check_out_date = 'Check-out must be after check-in';
    if (!selectedRoom)         errs.room           = 'Please select a room';
    return errs;
  }

  function validateStep2() {
    const v = validateBookingForm({
      guest_name: guestName, guest_age: guestAge, guest_sex: guestSex,
      guest_phone: guestPhone, guest_nationality: guestNat,
      check_in_date: checkIn, check_out_date: checkOut,
    });
    const errs: Record<string, string> = {};
    Object.entries(v.errors).forEach(([k, msg]) => { if (msg) errs[k] = msg; });
    return errs;
  }

  function handleNext() {
    if (step === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setErrors({});
      setStep(2);
    } else if (step === 2) {
      const errs = validateStep2();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setErrors({});
      setStep(3);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          room_id:           selectedRoom,
          guest_name:        guestName.trim(),
          guest_age:         Number(guestAge),
          guest_sex:         guestSex,
          guest_phone:       guestPhone.trim(),
          guest_nationality: guestNat,
          guest_language:    'en',
          check_in_date:     checkIn,
          check_out_date:    checkOut,
          payment_method:    payMethod,
          special_request:   specialReq.trim() || undefined,
          source:            'walk_in',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? 'Booking failed. Please try again.');
        return;
      }

      const { booking_reference, booking_id } = json.data;

      // If paid now, record the cash/payment immediately
      if (payStatus === 'paid' && total > 0) {
        await fetch(`/api/v1/bookings/${booking_id}/cash-payment`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ amount: total }),
        });
      }

      setSuccess({ ref: booking_reference, id: booking_id });
      setTimeout(() => router.push(`/dashboard/bookings/${booking_id}`), 2000);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-500 flex items-center justify-center">
            <CheckIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-900">Booking created successfully</h2>
            <p className="text-green-700 mt-1">Redirecting to booking details…</p>
          </div>
          <div className="inline-block rounded-xl bg-white border border-green-200 px-6 py-3">
            <p className="text-xs text-gray-500 mb-1">Booking reference</p>
            <p className="text-2xl font-black font-mono-data text-brand-600 tracking-widest">{success.ref}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/bookings" className="btn-ghost text-gray-500 -ml-1">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New walk-in booking</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register a guest at the front desk</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {[
          { n: 1, label: 'Dates & Room' },
          { n: 2, label: 'Guest Details' },
          { n: 3, label: 'Payment' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${step > n ? 'bg-green-500 text-white' : step === n ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > n ? '✓' : n}
              </div>
              <span className={`text-xs mt-1 font-medium ${step === n ? 'text-brand-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={`h-0.5 flex-1 mx-1 mb-5 transition-colors ${step > n ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Step 1: Dates & Room ──────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-gray-700">Select dates</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Check-in date</label>
                    <input type="date" min={today} value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className={`field-input ${errors.check_in_date ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                    {errors.check_in_date && <p className="field-error">{errors.check_in_date}</p>}
                  </div>
                  <div>
                    <label className="field-label">Check-out date</label>
                    <input type="date" min={minCheck} value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className={`field-input ${errors.check_out_date ? 'border-red-400 ring-1 ring-red-400' : ''}`} />
                    {errors.check_out_date && <p className="field-error">{errors.check_out_date}</p>}
                  </div>
                </div>

                {nights > 0 && (
                  <div className="rounded-lg bg-harar-50 border border-harar-200 px-4 py-2.5 text-sm text-harar-800 font-medium">
                    {nights} night{nights !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            </section>

            {/* Room selector */}
            {checkIn && checkOut && checkOut > checkIn && (
              <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
                  <h2 className="text-sm font-semibold text-gray-700">Select room</h2>
                </div>
                <div className="p-5">
                  {loadingRooms ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 text-center">
                      No rooms available for these dates.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {rooms.map((r) => (
                        <button key={r.id} type="button"
                          disabled={!r.is_available}
                          onClick={() => setSelectedRoom(r.id === selectedRoom ? '' : r.id)}
                          className={`rounded-xl border-2 p-4 text-left transition-all
                            ${!r.is_available
                              ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
                              : r.id === selectedRoom
                                ? 'border-brand-500 bg-brand-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/30'}`}>
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-bold text-gray-900 text-base">Room {r.room_number}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                              ${r.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {r.is_available ? 'Free' : 'Taken'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{r.room_type} · Floor {r.floor}</p>
                          <p className="text-sm font-bold text-brand-600 mt-2">
                            ETB {r.nightly_rate.toLocaleString()}<span className="text-xs font-normal text-gray-400">/night</span>
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.room && <p className="field-error mt-2">{errors.room}</p>}
                </div>
              </section>
            )}

            {/* Price preview */}
            {room && nights > 0 && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-brand-900">Room {room.room_number} · {room.room_type}</p>
                    <p className="text-sm text-brand-700 mt-0.5">
                      ETB {room.nightly_rate.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-brand-700 font-mono-data">
                      ETB {total.toLocaleString()}
                    </p>
                    <p className="text-xs text-brand-500">Total</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={handleNext}
                disabled={!checkIn || !checkOut || !selectedRoom}
                className="btn-primary px-8">
                Continue to guest details →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Guest Details ─────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-gray-700">Guest information</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="field-label">Full name <span className="text-red-400">*</span></label>
                  <input type="text" value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="As on government ID"
                    className={`field-input ${errors.guest_name ? 'border-red-400' : ''}`} />
                  {errors.guest_name && <p className="field-error">{errors.guest_name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Age <span className="text-red-400">*</span></label>
                    <input type="number" min="1" max="120" value={guestAge}
                      onChange={(e) => setGuestAge(e.target.value)}
                      placeholder="e.g. 30"
                      className={`field-input ${errors.guest_age ? 'border-red-400' : ''}`} />
                    {errors.guest_age && <p className="field-error">{errors.guest_age}</p>}
                  </div>
                  <div>
                    <label className="field-label">Sex <span className="text-red-400">*</span></label>
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Phone number <span className="text-red-400">*</span></label>
                    <input type="tel" value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
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

                <div>
                  <label className="field-label">Special request <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={specialReq} onChange={(e) => setSpecialReq(e.target.value)}
                    rows={2} placeholder="Early check-in, extra bedding, ground floor…"
                    className="field-input resize-none" />
                </div>
              </div>
            </section>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                ← Back
              </button>
              <button type="button" onClick={handleNext} className="btn-primary flex-1">
                Continue to payment →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Payment ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">

            {/* Booking summary */}
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-gray-700">Booking summary</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Guest',     value: guestName },
                    { label: 'Phone',     value: guestPhone },
                    { label: 'Room',      value: room ? `${room.room_number} (${room.room_type})` : '—' },
                    { label: 'Check-in',  value: checkIn },
                    { label: 'Check-out', value: checkOut },
                    { label: 'Nights',    value: `${nights}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-xs text-gray-400 font-medium">{label}</span>
                      <span className="font-semibold text-gray-900 mt-0.5">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total amount</span>
                  <span className="text-2xl font-black text-brand-600 font-mono-data">
                    ETB {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </section>

            {/* Payment method */}
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-gray-700">Payment method</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map(({ value, label, icon, desc }) => (
                  <label key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all
                      ${payMethod === value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input type="radio" name="payMethod" value={value}
                      checked={payMethod === value}
                      onChange={() => setPayMethod(value)}
                      className="mt-0.5 accent-brand-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{icon} {label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Payment status */}
            <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-gray-700">Payment status</h2>
              </div>
              <div className="p-5 grid grid-cols-2 gap-3">
                {PAYMENT_STATUS_OPTIONS.map(({ value, label, desc }) => (
                  <label key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all
                      ${payStatus === value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input type="radio" name="payStatus" value={value}
                      checked={payStatus === value}
                      onChange={() => setPayStatus(value as 'paid' | 'pending')}
                      className="mt-0.5 accent-brand-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Submit error */}
            {submitError && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900">
                <AlertIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                {submitError}
              </div>
            )}

            <div className="flex gap-3 pb-8">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                ← Back
              </button>
              <button type="submit" disabled={submitting}
                className="btn-primary flex-1 justify-center">
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Creating booking…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4" />
                    Confirm booking · ETB {total.toLocaleString()}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
