'use client';

// ============================================================
// Guest Booking Page
// src/app/(guest)/book/page.tsx
//
// Beautiful online booking flow with room selection and payment.
// Requirements 3.4–3.12, 18.1–18.4
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Room { id: string; room_number: string; room_type: string; floor: number; nightly_rate: number; is_available: boolean; }
interface StepState { dates: boolean; room: boolean; guest: boolean; payment: boolean; }

const STEP_TITLES: Record<string, string> = {
  dates: 'Select dates',
  room: 'Choose room',
  guest: 'Your details',
  payment: 'Confirm booking',
};

export default function BookingPage() {
  // Form state
  const [checkIn, setCheckIn]     = useState('');
  const [checkOut, setCheckOut]   = useState('');
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialReq, setSpecialReq] = useState('');

  // UI state
  const [step, setStep] = useState<keyof StepState>('dates');
  const [completed, setCompleted] = useState<StepState>({ dates: false, room: false, guest: false, payment: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const minCheckOut = checkIn ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().slice(0, 10) : '';

  // Fetch rooms when dates change
  useEffect(() => {
    if (!checkIn || !checkOut) { setRooms([]); return; }
    setLoading(true);
    fetch(`/api/v1/rooms?check_in=${checkIn}&check_out=${checkOut}`)
      .then((r) => r.json())
      .then((j) => setRooms(j.data ?? []))
      .finally(() => setLoading(false));
  }, [checkIn, checkOut]);

  const room = rooms.find((r) => r.id === selectedRoom);
  const nights = checkIn && checkOut ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000) : 0;
  const total = room ? room.nightly_rate * nights : 0;

  function handleNext() {
    const steps: Array<keyof StepState> = ['dates', 'room', 'guest', 'payment'];
    const currentIdx = steps.indexOf(step);
    if (currentIdx < steps.length - 1) {
      setCompleted((c) => ({ ...c, [step]: true }));
      setStep(steps[currentIdx + 1]);
    }
  }

  function handlePrev() {
    const steps: Array<keyof StepState> = ['dates', 'room', 'guest', 'payment'];
    const currentIdx = steps.indexOf(step);
    if (currentIdx > 0) setStep(steps[currentIdx - 1]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Create booking
      const bookRes = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: selectedRoom,
          guest_name: guestName.trim(),
          guest_phone: guestPhone.trim(),
          guest_nationality: 'Guest',
          guest_language: 'en',
          check_in_date: checkIn,
          check_out_date: checkOut,
          payment_method: 'chapa',
          special_request: specialReq.trim() || undefined,
          source: 'online',
        }),
      });

      if (!bookRes.ok) throw new Error('Booking creation failed');
      const bookJson = await bookRes.json();
      const { booking_id, total_amount } = bookJson.data;

      // 2. Initiate Chapa payment
      const payRes = await fetch('/api/v1/payments/chapa-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id,
          amount: total_amount,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          guest_name: guestName,
        }),
      });

      if (!payRes.ok) throw new Error('Payment initialization failed');
      const payJson = await payRes.json();
      window.location.href = payJson.checkout_url;
    } catch (err: any) {
      setError(err.message ?? 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-6 sm:px-8">

        {/* Progress steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {['dates', 'room', 'guest', 'payment'].map((s, i) => (
              <div key={s} className="flex items-center">
                <button
                  onClick={() => {
                    if (completed[s as keyof StepState]) setStep(s as keyof StepState);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all
                    ${step === s
                      ? 'bg-brand-500 text-white shadow-lg'
                      : completed[s as keyof StepState]
                        ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                        : 'bg-gray-200 text-gray-400'}`}>
                  {completed[s as keyof StepState] ? '✓' : i + 1}
                </button>
                {i < 3 && (
                  <div className={`h-1 flex-1 mx-2 rounded transition-colors
                    ${completed[s as keyof StepState] ? 'bg-green-500' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm font-semibold text-gray-700">
            {STEP_TITLES[step]}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white shadow-xl overflow-hidden">
          <div className="p-8 sm:p-10 space-y-6">

            {/* Step 1: Dates */}
            {step === 'dates' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">When will you stay?</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-in</label>
                    <input type="date" min={today} value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                                 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Check-out</label>
                    <input type="date" min={minCheckOut} value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                                 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                  </div>
                </div>
                {checkIn && checkOut && (
                  <div className="rounded-lg bg-harar-50 border border-harar-200 p-4">
                    <p className="text-sm font-semibold text-harar-900">
                      {nights} night{nights !== 1 ? 's' : ''} at Ras Hotel
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Room */}
            {step === 'room' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Choose your room</h2>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
                  </div>
                ) : rooms.length === 0 ? (
                  <p className="text-gray-600">No rooms available for these dates.</p>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((r) => (
                      <button key={r.id} type="button"
                        onClick={() => setSelectedRoom(r.id === selectedRoom ? '' : r.id)}
                        disabled={!r.is_available}
                        className={`w-full rounded-lg border-2 p-4 text-left transition-all
                          ${!r.is_available ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50' :
                            r.id === selectedRoom
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-gray-900">Room {r.room_number}</p>
                            <p className="text-sm text-gray-600">{r.room_type} • Floor {r.floor}</p>
                          </div>
                          <p className="font-bold text-brand-600">ETB {r.nightly_rate}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Guest details */}
            {step === 'guest' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Your information</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full name</label>
                  <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special requests (optional)</label>
                  <textarea value={specialReq} onChange={(e) => setSpecialReq(e.target.value)}
                    rows={3} placeholder="Early check-in, extra bedding, etc."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900
                               focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none" />
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Confirm your booking</h2>
                <div className="rounded-lg bg-gray-50 p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in</span>
                    <span className="font-semibold text-gray-900">{checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-out</span>
                    <span className="font-semibold text-gray-900">{checkOut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room</span>
                    <span className="font-semibold text-gray-900">{room?.room_number} ({room?.room_type})</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4 flex justify-between text-lg font-bold">
                    <span>Total ({nights} nights)</span>
                    <span className="text-brand-600">ETB {total.toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  You will be redirected to our payment gateway to complete your booking securely.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-900">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 px-8 sm:px-10 py-6 flex gap-4 bg-gray-50">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 'dates'}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold
                         text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Back
            </button>
            {step === 'payment' ? (
              <button type="submit" disabled={loading}
                className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-white
                           hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Processing...' : 'Continue to payment'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  (step === 'dates' && (!checkIn || !checkOut)) ||
                  (step === 'room' && !selectedRoom) ||
                  (step === 'guest' && (!guestName || !guestEmail || !guestPhone))
                }
                className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-white
                           hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed">
                Next
              </button>
            )}
          </div>
        </form>

        {/* Trust elements */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
          <div>🔒 Secure payment</div>
          <div>📧 Instant confirmation</div>
          <div>📞 24/7 support</div>
        </div>
      </div>
    </div>
  );
}
