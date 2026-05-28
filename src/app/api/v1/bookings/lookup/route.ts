// ============================================================
// GET /api/v1/bookings/lookup
// src/app/api/v1/bookings/lookup/route.ts
//
// Public: guest looks up their booking by reference + phone.
// Deliberately does NOT reveal which field was wrong. Req 30.3
// Requirements 30.1–30.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getBookingByReferenceAndPhone } from '@/modules/booking/infrastructure/repository';
import { getRoomById } from '@/modules/rooms/infrastructure/repository';
import { createSupabaseServerClient } from '@/modules/auth/infrastructure/supabase';

const LOOKUP_ERROR = {
  code:    'INVALID_LOOKUP',
  message: 'No booking found for that reference and phone number combination.',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ref   = searchParams.get('ref')?.trim().toUpperCase();
    const phone = searchParams.get('phone')?.trim();

    if (!ref || !phone) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ref and phone query parameters are required' } },
        { status: 400 }
      );
    }

    const booking = await getBookingByReferenceAndPhone(ref, phone);
    if (!booking) {
      // Generic error — don't reveal which field was wrong (Req 30.3)
      return NextResponse.json({ error: LOOKUP_ERROR }, { status: 404 });
    }

    // Fetch room details
    const room = await getRoomById(booking.room_id, true);

    // Fetch PDF ticket if available
    const supabase = createSupabaseServerClient();
    const { data: ticket } = await supabase
      .from('pdf_tickets')
      .select('storage_url, language')
      .eq('booking_id', booking.id)
      .eq('language', booking.guest_language)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build check-in instructions (from hotel config)
    const { data: config } = await supabase
      .from('hotel_configuration')
      .select('key, value');

    const configMap = Object.fromEntries((config ?? []).map((c) => [c.key, c.value]));

    const checkInInstructions = {
      hotel_address:   configMap.hotel_address ?? '',
      hotel_phone:     configMap.hotel_phone   ?? '',
      reception_hours: configMap.reception_hours ?? '',
      checkin_time:    configMap.checkin_time   ?? '14:00',
      what_to_bring:   'A valid government-issued ID and your Booking Reference',
    };

    const response = {
      booking_reference: booking.booking_reference,
      guest_name:        booking.guest_name,
      room_type:         room?.room_type ?? '',
      room_number:       room?.room_number ?? '',
      check_in_date:     booking.check_in_date,
      check_out_date:    booking.check_out_date,
      booking_status:    booking.booking_status,
      total_amount:      booking.total_amount,
      payment_method:    booking.payment_method,
      special_request:   booking.special_request,
      pdf_download_url:  ticket?.storage_url ?? null,
      check_in_instructions: checkInInstructions,
      // For Reserved_Unpaid: show outstanding amount (Req 30.6)
      outstanding_amount: booking.booking_status === 'reserved_unpaid' ? booking.total_amount : null,
      hotel_contact: configMap.hotel_phone ?? '',
    };

    return NextResponse.json({ data: response });
  } catch (err) {
    console.error('[GET /api/v1/bookings/lookup]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Lookup failed' } },
      { status: 500 }
    );
  }
}
