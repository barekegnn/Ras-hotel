// ============================================================
// POST /api/v1/payments/chapa-init
// src/app/api/v1/payments/chapa-init/route.ts
//
// Initiates a Chapa payment checkout for a booking.
// Called by the guest booking flow.
// Requirements 7.1–7.4
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { initializeChapaPayment } from '@/modules/payment/infrastructure/chapa';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, amount, guest_email, guest_phone, guest_name } = body;

    if (!booking_id || !amount || !guest_email || !guest_phone || !guest_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract booking reference from booking (simplified - would fetch from DB in production)
    const bookingRef = `BOOK-${Date.now()}`;

    const checkoutUrl = await initializeChapaPayment({
      bookingId,
      bookingRef,
      guestName,
      guestEmail,
      guestPhone,
      amount,
      successUrl: `${request.headers.get('origin')}/booking-success?booking_id=${booking_id}`,
      callbackUrl: `${request.headers.get('origin')}/api/v1/payments/chapa-webhook`,
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
