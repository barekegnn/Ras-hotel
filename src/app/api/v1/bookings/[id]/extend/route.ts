// ============================================================
// POST /api/v1/bookings/[id]/extend
// src/app/api/v1/bookings/[id]/extend/route.ts
// Requirements 36.1–36.8
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, updateBookingDates } from '@/modules/booking/infrastructure/repository';
import { checkRoomAvailability, getConflictingBooking } from '@/modules/rooms/domain/availability';
import { resolveStayPrice } from '@/modules/pricing/infrastructure/repository';
import { getRoomById } from '@/modules/rooms/infrastructure/repository';
import { requireAuth } from '@/modules/auth/domain/session';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth('receptionist');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { new_check_out_date } = body as { new_check_out_date?: string };

    if (!new_check_out_date) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'new_check_out_date is required' } },
        { status: 400 }
      );
    }

    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json(
        { error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } },
        { status: 404 }
      );
    }

    // Must be checked_in to extend (Req 36.1)
    if (booking.booking_status !== 'checked_in') {
      return NextResponse.json(
        {
          error: {
            code:    'INVALID_TRANSITION',
            message: `Stay extension is only available for checked-in bookings. Current status: "${booking.booking_status}"`,
          },
        },
        { status: 422 }
      );
    }

    if (new_check_out_date <= booking.check_out_date) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'new_check_out_date must be after the current check-out date' } },
        { status: 400 }
      );
    }

    // Check availability for the additional nights (Req 36.2)
    const available = await checkRoomAvailability(
      booking.room_id,
      booking.check_out_date,   // from current checkout
      new_check_out_date,
      booking.id                // exclude self
    );

    if (!available) {
      const conflict = await getConflictingBooking(
        booking.room_id,
        booking.check_out_date,
        new_check_out_date,
        booking.id
      );
      return NextResponse.json(
        {
          error: {
            code:    'BOOKING_CONFLICT',
            message: conflict
              ? `Room is already booked from ${conflict.check_in_date} (${conflict.booking_reference}, ${conflict.guest_name})`
              : 'Room is not available for the requested extension dates',
            details: { conflict },
          },
        },
        { status: 409 }
      );
    }

    // Calculate new total price (Req 36.4)
    const room = await getRoomById(booking.room_id, true);
    const { total: newTotal, nights } = await resolveStayPrice(
      room!.room_type,
      booking.check_in_date,
      new_check_out_date,
      room!.base_price_per_night
    );

    const additionalAmount = newTotal - booking.total_amount;

    // If this is a preview request (confirm=false), return price before saving
    const confirm = body.confirm === true;
    if (!confirm) {
      return NextResponse.json({
        data: {
          preview:              true,
          original_checkout:    booking.check_out_date,
          new_checkout:         new_check_out_date,
          original_total:       booking.total_amount,
          new_total:            newTotal,
          additional_amount:    additionalAmount,
          total_nights:         nights,
        },
      });
    }

    // Apply the extension (Req 36.5)
    const updated = await updateBookingDates(
      params.id,
      booking.check_in_date,
      new_check_out_date,
      newTotal,
      auth.user!.id
    );

    // Audit log (Req 36.6)
    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.ExtensionRequest,
      entity_type: EntityType.Booking,
      entity_id:   params.id,
      description: `Stay extended: booking ${booking.booking_reference} — checkout ${booking.check_out_date} → ${new_check_out_date} (ETB +${additionalAmount.toFixed(2)})`,
      metadata: {
        original_checkout: booking.check_out_date,
        new_checkout:      new_check_out_date,
        original_total:    booking.total_amount,
        new_total:         newTotal,
        additional_amount: additionalAmount,
      },
    });

    return NextResponse.json({
      data: {
        booking_reference: updated.booking_reference,
        new_check_out_date,
        new_total:         newTotal,
        additional_amount: additionalAmount,
      },
    });
  } catch (err: any) {
    console.error(`[POST /api/v1/bookings/${params.id}/extend]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Extension failed' } },
      { status: 500 }
    );
  }
}
