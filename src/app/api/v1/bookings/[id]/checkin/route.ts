// ============================================================
// POST /api/v1/bookings/[id]/checkin
// src/app/api/v1/bookings/[id]/checkin/route.ts
// Requirements 8.1–8.7, 4.1–4.9
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getBookingById, updateBookingStatus } from '@/modules/booking/infrastructure/repository';
import { updateRoomStatus } from '@/modules/rooms/infrastructure/repository';
import { requireAuth } from '@/modules/auth/domain/session';

type Params = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Params) {
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

    const updated = await updateBookingStatus(
      params.id,
      'Checked_In',
      auth.session!.user.id
    );

    // Update room status to Occupied
    await updateRoomStatus(booking.room_id, 'Occupied');

    return NextResponse.json({ data: { booking_reference: updated.booking_reference, booking_status: updated.booking_status } });
  } catch (err: any) {
    if (err.code === 'INVALID_TRANSITION') {
      return NextResponse.json(
        { error: { code: 'INVALID_TRANSITION', message: err.message, details: { validNextStatuses: err.validNextStatuses } } },
        { status: 422 }
      );
    }
    console.error(`[POST /api/v1/bookings/${params.id}/checkin]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Check-in failed' } },
      { status: 500 }
    );
  }
}
