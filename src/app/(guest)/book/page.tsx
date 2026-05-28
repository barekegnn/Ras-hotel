'use client';

// ============================================================
// Guest Booking Page
// src/app/(guest)/book/page.tsx
// Requirements 3.4–3.12, 18.1–18.4
// ============================================================

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  nightly_rate: number;
  is_available: boolean;
}

interface StepState { dates: boolean; room: boolean; guest: boolean; payment: boolean; }

const STEP_TITLES: Record<string, string> = {
  dates:   'Select dates',
  room:    'Choose room',
  guest:   'Your details',
  payment: 'Confirm booking',
};

// ── Inner component (uses useSearchParams) ────────────────────
function BookingForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Pre-fill dates from hero search form query params
  const [checkIn,  setCheckIn]  = useState(searchParams.get('check_in')  ?? '');
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') ?? '');
  const [rooms,    setRooms]    = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');

  const [guestName,        setGuestName]        = useState('');
  const [guestAge,         setGuestAge]         = useState('');
  const [guestSex,         setGuestSex]         = useState('');
  const [guestNationality, setGuestNationality] = useState('');
  const [guestEmail,       setGuestEmail]       = useState('');
  const [guestPhone,       setGuestPhone]       = useState('');
  const [specialReq,       setSpecialReq]       = useState('');

  const [step,      setStep]      = useState<keyof StepState>('dates');
  const [completed, setCompleted] = useState<StepState>({ dates: false, room: false, guest: false, payment: false });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const today      = new Date().toISOString().slice(0, 10);
  const minCheckOut = checkIn
    ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().slice(0, 10)
    : '';

  // Auto-advance to room step when dates arrive pre-filled from hero
  useEffect(() => {
    if (searchParams.get('check_in') && searchParams.get('check_out')) {
      setCompleted((c) => ({ ...c, dates: true }));
      setStep('room');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available rooms whenever dates change
  useEffect(() => {
    if (!checkIn || !checkOut) { setRooms([]); return; }
    setLoading(true);
    fetch(`/api/v1/rooms?check_in=${checkIn}&check_out=${checkOut}`)
      .then((r) => r.json())
      .then((j) => setRooms(j.data ?? []))
      .finally(() => setLoading(false));
  }, [checkIn, checkOut]);

  const room   = rooms.find((r) => r.id === selectedRoom);
  const nights = checkIn && checkOut
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;
  const total = room ? room.nightly_rate * nights : 0;

  function handleNext() {
    const steps: Array<keyof StepState> = ['dates', 'room', 'guest', 'payment'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setCompleted((c) => ({ ...c, [step]: true }));
      setStep(steps[idx + 1]!);
    }
  }

  function handlePrev() {
    const steps: Array<keyof StepState> = ['dates', 'room', 'guest', 'payment'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]!);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const bookRes = await fetch('/api/v1/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id:           selectedRoom,
          guest_name:        guestName.trim(),
          guest_age:         Number(guestAge),
          guest_sex:         guestSex,
          guest_phone:       guestPhone.trim(),
          guest_nationality: guestNationality.trim() || 'Ethiopian',
          guest_language:    'en',
          check_in_date:     checkIn,
          check_out_date:    checkOut,
          payment_method:    'chapa',
          special_request:   specialReq.trim() || undefined,
          source:            'online',
        }),
      });
      if (!bookRes.ok) {
        const j = await bookRes.json();
        throw new Error(j.error?.message ?? 'Booking creation failed');
      }
      const bookJson = await bookRes.json();

      const payRes = await fetch('/api/v1/payments/chapa-init', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id:  bookJson.data.booking_id,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          guest_name:  guestName,
        }),
      });
      if (!payRes.ok) {
        const j = await payRes.json();
        throw new Error(j.error?.message ?? 'Payment initialization failed');
      }
      const payJson = await payRes.json();
      window.location.href = payJson.checkout_url;
    } catch (err: any) {
      setError(err.message ?? 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = (['dates', 'room', 'guest', 'payment'] as const).indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Book Your Stay</h1>
          <p className="text-gray-500 mt-2">Ras Hotel · Harar Jugol, Ethiopia</p>
        </div>

        {/* Progress steps */}
        <div className="mb-10">
          <div className="flex items-center">
            {(['dates', 'room', 'guest', 'payment'] as const).map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => { if (completed[s]) setStep(s); }}
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-semibold text-sm transition-all
                    ${step === s
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                      : completed[s]
                        ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                        : 'bg-gray-200 text-gray-400 cursor-default'}`}>
                  {completed[s] ? '✓' : i + 1}
                </button>
                {i < 3 && (
                  <div className={`h-1 flex-1 mx-2 rounded transition-colors
                    ${completed[s] ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm font-semibold text-gray-700">
            Step {stepIndex + 1} of 4 — {STEP_TITLES[step]}
          </p>
        </div>

        <form onSubmit={handleSubmit}
          className="rounded-2xl bg-white shadow-xl overflow-hidden border border-gray-100">
          <div className="p-8 sm:p-10 space-y-6">

            {/* ── Step 1: Dates ─────────────────────────────── */}
            {step === 'dates' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">When will you stay?</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-in</label>
                    <input type="date" min={today} value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                                 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-out</label>
                    <input type="date" min={minCheckOut} value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                                 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                </div>
                {checkIn && checkOut && nights > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      {nights} night{nights !== 1 ? 's' : ''} at Ras Hotel
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Room ──────────────────────────────── */}
            {step === 'room' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Choose your room</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {checkIn} → {checkOut} · {nights} night{nights !== 1 ? 's' : ''}
                  </p>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map((i) => (
                      <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-8 text-center">
                    <p className="text-gray-500 font-medium">No rooms available for these dates.</p>
                    <button type="button" onClick={() => setStep('dates')}
                      className="mt-4 text-sm text-amber-600 underline">
                      Change dates
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((r) => (
                      <button key={r.id} type="button"
                        onClick={() => setSelectedRoom(r.id === selectedRoom ? '' : r.id)}
                        disabled={!r.is_available}
                        className={`w-full rounded-xl border-2 p-4 text-left transition-all
                          ${!r.is_available
                            ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
                            : r.id === selectedRoom
                              ? 'border-amber-500 bg-amber-50 shadow-md'
                              : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-900">Room {r.room_number}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {r.room_type} · Floor {r.floor}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-amber-600 text-lg">
                              ETB {r.nightly_rate.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">per night</p>
                          </div>
                        </div>
                        {r.id === selectedRoom && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth={3}>
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            Selected · ETB {(r.nightly_rate * nights).toLocaleString()} total
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Guest details ─────────────────────── */}
            {step === 'guest' && (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-gray-900">Your information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={guestName}
                    onChange={(e) => setGuestName(e.target.value)} required
                    placeholder="e.g. Abebe Girma"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input type="number" min="1" max="129" value={guestAge}
                      onChange={(e) => setGuestAge(e.target.value)} required
                      placeholder="e.g. 30"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                                 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sex <span className="text-red-500">*</span>
                    </label>
                    <select value={guestSex} onChange={(e) => setGuestSex(e.target.value)} required
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                                 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white">
                      <option value="">Select…</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input type="email" value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)} required
                    placeholder="your@email.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)} required
                    placeholder="0912345678 or +251912345678"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                  <p className="text-xs text-gray-400 mt-1">
                    Booking confirmation will be sent to this number via SMS.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nationality <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={guestNationality}
                    onChange={(e) => setGuestNationality(e.target.value)} required
                    placeholder="e.g. Ethiopian"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Special requests{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea value={specialReq} onChange={(e) => setSpecialReq(e.target.value)}
                    rows={3} placeholder="Early check-in, extra bedding, dietary needs…"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none" />
                </div>
              </div>
            )}

            {/* ── Step 4: Confirmation ──────────────────────── */}
            {step === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Confirm your booking</h2>
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 space-y-3">
                  {[
                    { label: 'Guest',     value: guestName },
                    { label: 'Check-in',  value: checkIn },
                    { label: 'Check-out', value: checkOut },
                    { label: 'Room',      value: `${room?.room_number} (${room?.room_type})` },
                    { label: 'Duration',  value: `${nights} night${nights !== 1 ? 's' : ''}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-3 flex justify-between">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="font-bold text-amber-600 text-lg">
                      ETB {total.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                  <p className="font-semibold mb-1">💳 Secure payment via Chapa</p>
                  <p>
                    You will be redirected to Chapa to pay with TeleBirr, CBE Birr, or card.
                    Your booking is confirmed instantly after payment.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-900
                              flex items-start gap-2">
                <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-100 px-8 sm:px-10 py-5 flex gap-3 bg-gray-50">
            <button type="button" onClick={handlePrev} disabled={step === 'dates'}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold
                         text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors">
              ← Back
            </button>
            {step === 'payment' ? (
              <button type="submit" disabled={loading}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-bold text-white
                           hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors shadow-md shadow-amber-200">
                {loading ? 'Processing…' : 'Pay with Chapa →'}
              </button>
            ) : (
              <button type="button" onClick={handleNext}
                disabled={
                  (step === 'dates'  && (!checkIn || !checkOut || nights < 1)) ||
                  (step === 'room'   && !selectedRoom) ||
                  (step === 'guest'  && (!guestName || !guestEmail || !guestPhone || !guestAge || !guestSex || !guestNationality))
                }
                className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-bold text-white
                           hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors shadow-md shadow-amber-200">
                Next →
              </button>
            )}
          </div>
        </form>

        {/* Trust signals */}
        <div className="mt-10 grid grid-cols-3 gap-4 text-center text-xs text-gray-500">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">🔒</span>
            <span>Secure payment</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">📱</span>
            <span>SMS confirmation</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">↩</span>
            <span>Free cancellation 48h+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page export with Suspense boundary (required for useSearchParams) ──
export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="h-10 w-10 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
      </div>
    }>
      <BookingForm />
    </Suspense>
  );
}
