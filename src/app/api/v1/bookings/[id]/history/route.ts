// ============================================================
// GET /api/v1/bookings/:id/history
// src/app/api/v1/bookings/[id]/history/route.ts
//
// Returns the full status transition history for a booking.
// Used by the booking detail page timeline.
// Requirements 38.4, 38.5
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { getBookingStatusHistory } from '@/modules/booking/infrastructure/repository';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth('receptionist');
  if (auth.error) return auth.error;

  try {
    const history = await getBookingStatusHistory(params.id);
    return NextResponse.json({ data: history });
  } catch (err) {
    console.error(`[GET /api/v1/bookings/${params.id}/history]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch booking history' } },
      { status: 500 }
    );
  }
}
