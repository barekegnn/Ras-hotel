// ============================================================
// GET /api/v1/bookings/:id
// src/app/api/v1/bookings/[id]/route.ts
//
// Returns full booking detail with room info and status history.
// Used by the staff booking detail page.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth('receptionist');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms ( room_number, room_type, floor, base_price_per_night )
      `)
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Booking not found' } },
        { status: 404 }
      );
    }

    const room = (data.rooms as any) ?? {};

    return NextResponse.json({
      data: {
        ...data,
        room_number: room.room_number,
        room_type:   room.room_type,
        floor:       room.floor,
      },
    });
  } catch (err) {
    console.error(`[GET /api/v1/bookings/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch booking' } },
      { status: 500 }
    );
  }
}
