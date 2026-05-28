// ============================================================
// GET /api/v1/bookings/:id/summary
// src/app/api/v1/bookings/[id]/summary/route.ts
//
// Public endpoint — returns a minimal booking summary for the
// guest-facing booking-success page after Chapa redirect.
// No auth required; only non-sensitive fields are returned.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const supabase = createSupabaseServiceClient();

    // Join bookings → rooms in one query
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        guest_name,
        check_in_date,
        check_out_date,
        total_amount,
        booking_status,
        payment_method,
        rooms ( room_number, room_type )
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
    const checkIn  = new Date(data.check_in_date);
    const checkOut = new Date(data.check_out_date);
    const nights   = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / 86_400_000
    );

    return NextResponse.json({
      data: {
        booking_reference: data.booking_reference,
        guest_name:        data.guest_name,
        room_number:       room.room_number ?? '—',
        room_type:         room.room_type   ?? '—',
        check_in_date:     data.check_in_date,
        check_out_date:    data.check_out_date,
        nights,
        total_amount:      data.total_amount,
        booking_status:    data.booking_status,
        payment_method:    data.payment_method,
      },
    });
  } catch (err) {
    console.error('[GET /api/v1/bookings/:id/summary]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch booking summary' } },
      { status: 500 }
    );
  }
}
