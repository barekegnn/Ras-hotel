// ============================================================
// POST /api/v1/bookings/[id]/cancel
// src/app/api/v1/bookings/[id]/cancel/route.ts
//
// Cancels a booking, calculates the refund tier based on the
// hotel's cancellation policy, and sends a cancellation SMS.
// Requirements 16.1–16.10, 34.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, updateBookingStatus } from '@/modules/booking/infrastructure/repository';
import { updateRoomStatus } from '@/modules/rooms/infrastructure/repository';
import { requireAuth } from '@/modules/auth/domain/session';
import { calculateRefundTier } from '@/modules/booking/domain/cancellation';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { sendCancellationSms } from '@/modules/notifications/infrastructure/sms';
import type { BookingStatus } from '@/shared/types/domain';

type Params = { params: { id: string } };

// Statuses that are eligible for cancellation
const CANCELLABLE_STATUSES: BookingStatus[] = [
  'reserved_unpaid',
  'paid',
  'checked_in',
];

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

    // Guard: only cancellable statuses (Req 16.1)
    if (!CANCELLABLE_STATUSES.includes(booking.booking_status as BookingStatus)) {
      return NextResponse.json(
        {
          error: {
            code:    'INVALID_TRANSITION',
            message: `Booking cannot be cancelled — current status is "${booking.booking_status}"`,
            details: { currentStatus: booking.booking_status },
          },
        },
        { status: 422 }
      );
    }

    // ── Fetch hotel cancellation policy window ────────────────
    let policyWindowHours = 48; // default per spec
    try {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase
        .from('hotel_configuration')
        .select('value')
        .eq('key', 'cancellation_window_hours')
        .single();
      if (data?.value) policyWindowHours = Number(data.value);
    } catch { /* use default */ }

    // ── Calculate refund tier (Req 16.5–16.7) ────────────────
    const checkInDate = new Date(`${booking.check_in_date}T14:00:00`); // hotel check-in time
    const refundTier  = calculateRefundTier(new Date(), checkInDate, policyWindowHours);

    // Map refund tier to the correct cancelled status
    const cancelledStatus: BookingStatus =
      refundTier === 'full'    ? 'cancelled_full_refund'    :
      refundTier === 'partial' ? 'cancelled_partial_refund' :
                                 'cancelled_no_refund';

    // ── Transition booking status ─────────────────────────────
    const updated = await updateBookingStatus(params.id, cancelledStatus, auth.user!.id);

    // ── Free the room ─────────────────────────────────────────
    await updateRoomStatus(booking.room_id, 'available');

    // ── Audit log ─────────────────────────────────────────────
    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.BookingCancelled,
      entity_type: EntityType.Booking,
      entity_id:   params.id,
      description: `Booking ${booking.booking_reference} cancelled by staff — refund tier: ${refundTier}`,
      metadata:    { refundTier, cancelledStatus, previousStatus: booking.booking_status },
    });

    // ── Send cancellation SMS (Req 16.10) ─────────────────────
    void sendCancellationSms(
      {
        booking_reference: booking.booking_reference,
        guest_name:        booking.guest_name,
        room_type:         (booking as any).room_type ?? '',
        check_in_date:     booking.check_in_date,
        check_out_date:    booking.check_out_date,
        total_amount:      booking.total_amount,
        guest_phone:       booking.guest_phone,
        guest_language:    booking.guest_language ?? 'en',
        booking_status:    cancelledStatus,
      },
      refundTier
    ).catch(console.warn);

    return NextResponse.json({
      data: {
        booking_reference: updated.booking_reference,
        booking_status:    updated.booking_status,
        refund_tier:       refundTier,
        room_status:       'Available',
      },
    });
  } catch (err: any) {
    if (err.code === 'INVALID_TRANSITION') {
      return NextResponse.json(
        { error: { code: 'INVALID_TRANSITION', message: err.message } },
        { status: 422 }
      );
    }
    console.error(`[POST /api/v1/bookings/${params.id}/cancel]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Cancellation failed' } },
      { status: 500 }
    );
  }
}
