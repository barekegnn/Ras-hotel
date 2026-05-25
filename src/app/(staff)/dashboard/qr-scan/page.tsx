'use client';

// ============================================================
// QR Scanner — Camera-based guest check-in
// src/app/(staff)/dashboard/qr-scan/page.tsx
// Requirements 8.1–8.7
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { BookingStatusBadge } from '@/components/staff/BookingStatusBadge';
import { QrCodeIcon, CheckIcon, AlertIcon, PhoneIcon, XIcon } from '@/components/staff/Icons';
import Link from 'next/link';

type ScanState = 'idle' | 'scanning' | 'found' | 'not_found' | 'checking_in' | 'done';

interface BookingResult {
  id: string;
  booking_reference: string;
  guest_name: string;
  room_type: string;
  room_number?: string;
  check_in_date: string;
  check_out_date: string;
  booking_status: string;
  total_amount: number;
  payment_method: string | null;
  special_request: string | null;
  guest_phone: string;
}

export default function QrScanPage() {
  const [state,      setState]      = useState<ScanState>('idle');
  const [booking,    setBooking]    = useState<BookingResult | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [manualRef,  setManualRef]  = useState('');
  const [showManual, setShowManual] = useState(false);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const scannerRef  = useRef<any>(null);

  // Dynamically import html5-qrcode only client-side
  async function startCamera() {
    setState('scanning');
    setBooking(null);
    setErrorMsg(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras?.length) throw new Error('No camera found on this device');

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleQrSuccess,
        () => {}
      );
    } catch (err: any) {
      setState('idle');
      setErrorMsg(err.message ?? 'Camera access denied');
    }
  }

  async function stopCamera() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  }

  async function handleQrSuccess(decodedText: string) {
    await stopCamera();
    await lookupBooking(decodedText.trim());
  }

  async function lookupBooking(ref: string) {
    setState('found');
    setErrorMsg(null);
    const res = await fetch(`/api/v1/bookings/lookup?ref=${encodeURIComponent(ref)}&phone=*`);
    // Our lookup requires phone — QR code path uses the reference to look up via staff endpoint
    const res2 = await fetch(`/api/v1/bookings?ref=${encodeURIComponent(ref)}&per_page=1`);
    const json = await res2.json();
    const found = json.data?.[0] as BookingResult | undefined;

    if (!found) {
      setState('not_found');
      setErrorMsg(`No booking found for reference "${ref}"`);
      return;
    }
    setBooking(found);
    setState('found');
  }

  async function handleManualLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!manualRef.trim()) return;
    await lookupBooking(manualRef.trim().toUpperCase());
  }

  async function handleCheckin() {
    if (!booking) return;
    setState('checking_in');
    try {
      const res = await fetch(`/api/v1/bookings/${booking.id}/checkin`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setState('done');
        setBooking((b) => b ? { ...b, booking_status: 'Checked_In' } : b);
      } else {
        setErrorMsg(json.error?.message ?? 'Check-in failed');
        setState('found');
      }
    } catch {
      setErrorMsg('Network error during check-in');
      setState('found');
    }
  }

  function reset() {
    stopCamera();
    setState('idle');
    setBooking(null);
    setErrorMsg(null);
    setManualRef('');
    setShowManual(false);
  }

  useEffect(() => () => { stopCamera(); }, []);

  const isUnpaid = booking?.booking_status === 'Reserved_Unpaid';

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Check-in</h1>
        <p className="mt-0.5 text-sm text-gray-500">Scan the guest's PDF ticket QR code</p>
      </div>

      {/* Scanner area */}
      {(state === 'idle' || state === 'scanning') && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white overflow-hidden">

          {state === 'scanning' ? (
            <div className="relative">
              <div id="qr-reader" className="w-full" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="h-52 w-52 rounded-xl border-2 border-brand-500 shadow-[0_0_0_999px_rgba(0,0,0,0.4)]" />
              </div>
              <button
                onClick={reset}
                className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="p-10 text-center space-y-5">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
                <QrCodeIcon className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <p className="text-base font-medium text-gray-900">Ready to scan</p>
                <p className="text-sm text-gray-500 mt-1">Point the camera at the guest's QR code</p>
              </div>
              <button onClick={startCamera} className="btn-primary mx-auto">
                <QrCodeIcon className="h-4 w-4" />
                Open camera
              </button>
              {errorMsg && (
                <p className="text-sm text-red-600">{errorMsg}</p>
              )}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-gray-400">or enter manually</span>
                </div>
              </div>
              <form onSubmit={handleManualLookup} className="flex gap-2">
                <input
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value.toUpperCase())}
                  placeholder="RAS-XXXXXX"
                  className="field-input flex-1 font-mono-data tracking-wider uppercase"
                />
                <button type="submit" className="btn-primary flex-shrink-0">Look up</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Booking result card */}
      {(state === 'found' || state === 'checking_in' || state === 'done') && booking && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">

          {/* Success / status banner */}
          {state === 'done' ? (
            <div className="flex items-center gap-3 bg-green-500 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <CheckIcon className="h-4 w-4 text-white" />
              </div>
              <p className="font-semibold text-white">Guest checked in successfully</p>
            </div>
          ) : isUnpaid ? (
            <div className="flex items-center gap-3 bg-yellow-500 px-5 py-4">
              <AlertIcon className="h-5 w-5 text-white flex-shrink-0" />
              <p className="font-semibold text-white">Payment outstanding — collect cash before check-in</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-harar-500 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <CheckIcon className="h-4 w-4 text-white" />
              </div>
              <p className="font-semibold text-white">Booking found — ready to check in</p>
            </div>
          )}

          {/* Booking details */}
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-bold text-gray-900">{booking.guest_name}</p>
                <p className="font-mono-data text-sm text-gray-500 mt-0.5">{booking.booking_reference}</p>
              </div>
              <BookingStatusBadge status={booking.booking_status as any} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Room', value: booking.room_number ?? booking.room_type },
                { label: 'Check-in', value: booking.check_in_date },
                { label: 'Check-out', value: booking.check_out_date },
                { label: 'Amount', value: `ETB ${booking.total_amount?.toFixed(2) ?? '—'}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-gray-50 px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            {/* Special request — Req 8.7 */}
            {booking.special_request && (
              <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 mb-1">Special request</div>
                <p className="text-sm text-brand-900">{booking.special_request}</p>
              </div>
            )}

            {/* Phone */}
            {booking.guest_phone && (
              <a href={`tel:${booking.guest_phone}`}
                className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
                <PhoneIcon className="h-4 w-4" />
                {booking.guest_phone}
              </a>
            )}

            {/* Unpaid warning — Req 8.3 */}
            {isUnpaid && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
                <p className="text-sm font-semibold text-yellow-900">Outstanding balance: ETB {booking.total_amount?.toFixed(2)}</p>
                <p className="text-xs text-yellow-700 mt-1">Collect payment and record it before completing check-in.</p>
                <Link href={`/dashboard/bookings/${booking.id}?action=cash`}
                  className="mt-3 btn-secondary text-xs border-yellow-400 text-yellow-900 bg-yellow-100 hover:bg-yellow-200 inline-flex">
                  Record cash payment
                </Link>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="border-t border-gray-200 px-5 py-4 flex gap-3">
            <button onClick={reset} className="btn-secondary flex-1">Scan another</button>
            {!isUnpaid && state !== 'done' && (
              <button
                onClick={handleCheckin}
                disabled={state === 'checking_in'}
                className="btn-primary flex-1">
                {state === 'checking_in' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Checking in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4" />
                    Confirm check-in
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Not found state */}
      {state === 'not_found' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-4">
          <XIcon className="h-10 w-10 text-red-400 mx-auto" />
          <div>
            <p className="font-semibold text-red-900">Booking not found</p>
            <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
          </div>
          <button onClick={reset} className="btn-secondary mx-auto">Try again</button>
        </div>
      )}
    </div>
  );
}
