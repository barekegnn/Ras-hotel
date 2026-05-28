// ============================================================
// POST /api/v1/bookings/[id]/no-show
// src/app/api/v1/bookings/[id]/no-show/route.ts
// Requirements 20.9, 20.10
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

    const updated = await updateBookingStatus(params.id, 'no_show', auth.user!.id);
    await updateRoomStatus(booking.room_id, 'available');

    return NextResponse.json({
      data: {
        booking_reference: updated.booking_reference,
        booking_status:    updated.booking_status,
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
    console.error(`[POST /api/v1/bookings/${params.id}/no-show]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to mark no-show' } },
      { status: 500 }
    );
  }
}
