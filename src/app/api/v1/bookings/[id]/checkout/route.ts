// ============================================================
// POST /api/v1/bookings/[id]/checkout
// src/app/api/v1/bookings/[id]/checkout/route.ts
// Requirements 18.1–18.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, updateBookingStatus } from '@/modules/booking/infrastructure/repository';
import { updateRoomStatus } from '@/modules/rooms/infrastructure/repository';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { sendFeedbackSms } from '@/modules/notifications/infrastructure/sms';

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth('receptionist');
  if (auth.error) return auth.error;

  try {
    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json(
        { error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } },
        { status: 404 }
      );
    }

    // Guard: reject if not currently checked_in (Req 18.5)
    if (booking.booking_status !== 'checked_in') {
      return NextResponse.json(
        {
          error: {
            code:    'INVALID_TRANSITION',
            message: `Room cannot be checked out — current status is "${booking.booking_status}"`,
            details: { currentStatus: booking.booking_status },
          },
        },
        { status: 422 }
      );
    }

    // Guard: warn if payment is outstanding (Req 18.3)
    // Caller must pass { confirm_payment_collected: true } in body to proceed
    const body = await request.json().catch(() => ({}));
    const cashEvents = await (async () => {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase
        .from('cash_collection_events')
        .select('amount_collected')
        .eq('booking_id', params.id);
      return data ?? [];
    })();

    const totalCashCollected = cashEvents.reduce((s, e) => s + e.amount_collected, 0);
    const outstanding = booking.total_amount - totalCashCollected;

    if (outstanding > 0 && !body.confirm_payment_collected) {
      return NextResponse.json(
        {
          error: {
            code:    'PAYMENT_OUTSTANDING',
            message: `Guest has an outstanding balance of ETB ${outstanding.toFixed(2)}. Confirm payment was collected before checking out.`,
            details: { outstanding_amount: outstanding },
          },
        },
        { status: 409 }
      );
    }

    const updated = await updateBookingStatus(params.id, 'checked_out', auth.user!.id);
    await updateRoomStatus(booking.room_id, 'available');

    // Send post-stay feedback SMS (Req 35.1)
    void triggerFeedbackSms(booking).catch(console.warn);

    return NextResponse.json({
      data: {
        booking_reference: updated.booking_reference,
        booking_status:    updated.booking_status,
        room_status:       'Available',
      },
    });
  } catch (err: any) {
    console.error(`[POST /api/v1/bookings/${params.id}/checkout]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Check-out failed' } },
      { status: 500 }
    );
  }
}

async function triggerFeedbackSms(booking: Awaited<ReturnType<typeof getBookingById>>): Promise<void> {
  if (!booking) return;

  // Generate a short feedback token (booking ID prefix is sufficient for lookup)
  const feedbackToken = booking.id.replace(/-/g, '').slice(0, 16);

  await sendFeedbackSms(
    {
      booking_reference: booking.booking_reference,
      guest_name:        booking.guest_name,
      room_type:         (booking as any).room_type ?? '',
      check_in_date:     booking.check_in_date,
      check_out_date:    booking.check_out_date,
      total_amount:      booking.total_amount,
      guest_phone:       booking.guest_phone,
      guest_language:    booking.guest_language ?? 'en',
    },
    feedbackToken
  );
}
