// ============================================================
// POST /api/v1/payments/chapa-init
// src/app/api/v1/payments/chapa-init/route.ts
//
// Initiates a Chapa payment checkout for a booking.
// Called by the guest booking flow immediately after booking creation.
// Requirements 7.1–7.4
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { initializeChapaPayment } from '@/modules/payment/infrastructure/chapa';
import { getBookingById } from '@/modules/booking/infrastructure/repository';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, guest_email, guest_phone, guest_name } = body;

    if (!booking_id || !guest_email || !guest_phone || !guest_name) {
      return NextResponse.json(
        { error: 'Missing required fields: booking_id, guest_email, guest_phone, guest_name' },
        { status: 400 }
      );
    }

    // Fetch booking from DB — use server-side total_amount, never trust client
    const booking = await getBookingById(booking_id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.total_amount <= 0) {
      return NextResponse.json(
        { error: 'Booking has no payable amount' },
        { status: 400 }
      );
    }

    // Use NEXT_PUBLIC_APP_URL for reliable callback/success URLs
    // Never use the Origin header — it can be null or spoofed
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const checkoutUrl = await initializeChapaPayment({
      bookingId:   booking_id,
      bookingRef:  booking.booking_reference,
      guestName:   guest_name,
      guestEmail:  guest_email,
      guestPhone:  guest_phone,
      amount:      booking.total_amount,   // authoritative server value
      successUrl:  `${appUrl}/booking-success?booking_id=${booking_id}`,
      callbackUrl: `${appUrl}/api/v1/payments/chapa-webhook`,
    });

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err: any) {
    console.error('[chapa-init]', err);
    return NextResponse.json(
      { error: err.message ?? 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
