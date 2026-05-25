// ============================================================
// POST /api/v1/bookings/[id]/cash-payment
// src/app/api/v1/bookings/[id]/cash-payment/route.ts
// Requirements 31.1–31.7
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, updateBookingStatus } from '@/modules/booking/infrastructure/repository';
import { updateRoomStatus } from '@/modules/rooms/infrastructure/repository';
import { validateCashCollectionEvent } from '@/shared/lib/validation';
import { requireAuth } from '@/modules/auth/domain/session';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth('receptionist');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { amount } = body as { amount?: number };

    const booking = await getBookingById(params.id);
    if (!booking) {
      return NextResponse.json(
        { error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } },
        { status: 404 }
      );
    }

    // Guard: reject if already paid (Req 31.7)
    if (booking.booking_status === 'Paid' || booking.booking_status === 'Checked_In') {
      return NextResponse.json(
        {
          error: {
            code:    'ALREADY_PAID',
            message: `Booking ${booking.booking_reference} already has "Paid" status. Duplicate cash collection prevented.`,
          },
        },
        { status: 409 }
      );
    }

    if (booking.booking_status !== 'Reserved_Unpaid') {
      return NextResponse.json(
        {
          error: {
            code:    'INVALID_TRANSITION',
            message: `Cannot record cash payment for booking in status "${booking.booking_status}"`,
          },
        },
        { status: 422 }
      );
    }

    // Validate the event (Property 5)
    const validation = validateCashCollectionEvent({
      booking_id:      params.id,
      receptionist_id: auth.session!.user.id,
      amount_collected: amount,
      collected_at:    new Date().toISOString(),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: validation.errors.join('; ') } },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const collectedAt = new Date().toISOString();

    // Insert Cash_Collection_Event (Req 31.3)
    const { data: event, error: eventError } = await supabase
      .from('cash_collection_events')
      .insert({
        booking_id:       params.id,
        receptionist_id:  auth.session!.user.id,
        amount_collected: amount,
        collected_at:     collectedAt,
      })
      .select()
      .single();

    if (eventError) throw new Error(`Failed to record cash event: ${eventError.message}`);

    // Transition booking to Paid (Req 31.3)
    const updated = await updateBookingStatus(
      params.id,
      'Paid',
      auth.session!.user.id
    );

    // Update room status to Reserved_Paid
    await updateRoomStatus(booking.room_id, 'Reserved_Paid');

    // Write audit log (Req 31.5)
    await writeAuditLog({
      actor:       auth.session!.user.id,
      action_type: AuditActionType.CashCollectionEvent,
      entity_type: EntityType.CashCollection,
      entity_id:   event.id,
      description: `Cash payment of ETB ${amount} recorded for booking ${booking.booking_reference} by receptionist`,
      metadata:    {
        booking_id:       params.id,
        booking_reference: booking.booking_reference,
        amount_collected:  amount,
        collected_at:      collectedAt,
      },
    });

    return NextResponse.json({
      data: {
        event_id:          event.id,
        booking_reference: updated.booking_reference,
        booking_status:    updated.booking_status,
        amount_collected:  amount,
        collected_at:      collectedAt,
      },
    });
  } catch (err: any) {
    console.error(`[POST /api/v1/bookings/${params.id}/cash-payment]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to record cash payment' } },
      { status: 500 }
    );
  }
}
