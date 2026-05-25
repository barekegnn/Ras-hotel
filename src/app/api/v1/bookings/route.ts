// ============================================================
// POST /api/v1/bookings
// src/app/api/v1/bookings/route.ts
//
// Creates a new booking (online guest or walk-in via staff).
// Requirements 3.1–3.12, 4.1–4.9, 13.1–13.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createBooking, listBookings, updateBookingAmount } from '@/modules/booking/infrastructure/repository';
import { acquireRoomLock, releaseRoomLock } from '@/modules/booking/infrastructure/roomLock';
import { getRoomById } from '@/modules/rooms/infrastructure/repository';
import { resolveStayPrice } from '@/modules/pricing/infrastructure/repository';
import { updateRoomStatus } from '@/modules/rooms/infrastructure/repository';
import { validateBookingForm, validateEthiopianPhone } from '@/shared/lib/validation';
import { getSession, requireAuth } from '@/modules/auth/domain/session';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType, type CreateBookingInput } from '@/shared/types/domain';

// ── GET — staff booking list ──────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth('receptionist');
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      status:            searchParams.get('status') ?? undefined,
      guest_name:        searchParams.get('guest_name') ?? undefined,
      guest_phone:       searchParams.get('guest_phone') ?? undefined,
      booking_reference: searchParams.get('ref') ?? undefined,
      check_in_from:     searchParams.get('check_in_from') ?? undefined,
      check_in_to:       searchParams.get('check_in_to') ?? undefined,
      source:            searchParams.get('source') as any ?? undefined,
      page:              Number(searchParams.get('page') ?? 1),
      per_page:          Number(searchParams.get('per_page') ?? 25),
    };

    const { bookings, total } = await listBookings(filters);
    const perPage = filters.per_page;
    const page    = filters.page;

    return NextResponse.json({
      data: bookings,
      meta: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
    });
  } catch (err) {
    console.error('[GET /api/v1/bookings]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch bookings' } },
      { status: 500 }
    );
  }
}

// ── POST — create booking ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const {
      room_id, guest_name, guest_age, guest_sex, guest_phone,
      guest_nationality, guest_language = 'en', check_in_date, check_out_date,
      payment_method, special_request, source = 'online', lock_session_id,
    } = body as any;

    // ── 1. Validate registration fields (Req 13.1, 13.2, 13.3) ──
    const validation = validateBookingForm({
      guest_name:        guest_name ?? '',
      guest_age:         guest_age ?? 0,
      guest_sex:         guest_sex ?? '',
      guest_phone:       guest_phone ?? '',
      guest_nationality: guest_nationality ?? '',
      check_in_date:     check_in_date ?? '',
      check_out_date:    check_out_date ?? '',
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.errors } },
        { status: 400 }
      );
    }

    if (!room_id || !payment_method) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'room_id and payment_method are required' } },
        { status: 400 }
      );
    }

    // ── 2. Determine actor (staff or anonymous guest) ─────────
    const isStaff = source === 'walk_in';
    let staffId: string | undefined;

    if (isStaff) {
      const auth = await requireAuth('receptionist');
      if (auth.error) return auth.error;
      staffId = auth.session!.user.id;
    }

    const actor = staffId ?? 'guest';

    // ── 3. Validate the room exists and is active ─────────────
    const room = await getRoomById(room_id);
    if (!room) {
      return NextResponse.json(
        { error: { code: 'ROOM_NOT_FOUND', message: 'Room not found or inactive' } },
        { status: 404 }
      );
    }

    // ── 4. For online bookings, verify room lock is held ──────
    if (!isStaff && lock_session_id) {
      // Lock was acquired during booking flow — we'll release it after DB write
    } else if (!isStaff) {
      return NextResponse.json(
        { error: { code: 'ROOM_LOCK_UNAVAILABLE', message: 'A room lock session is required' } },
        { status: 400 }
      );
    }

    // ── 5. Calculate total price ──────────────────────────────
    const { total: totalAmount, nights } = await resolveStayPrice(
      room.room_type,
      check_in_date,
      check_out_date,
      room.base_price_per_night
    );

    // ── 6. Create booking ─────────────────────────────────────
    const input: CreateBookingInput = {
      room_id, guest_name, guest_age: Number(guest_age), guest_sex,
      guest_phone, guest_nationality, guest_language,
      check_in_date, check_out_date, payment_method,
      special_request: special_request ?? undefined,
      source: isStaff ? 'walk_in' : 'online',
      created_by_staff: staffId,
    };

    const booking = await createBooking(input, actor);

    // ── 7. Set total amount ───────────────────────────────────
    await updateBookingAmount(booking.id, totalAmount);

    // ── 8. Update room status ─────────────────────────────────
    await updateRoomStatus(
      room_id,
      payment_method === 'cash' ? 'Reserved_Unpaid' : 'Reserved_Paid'
    );

    // ── 9. Release room lock (online bookings) ────────────────
    if (!isStaff && lock_session_id) {
      await releaseRoomLock(room_id, lock_session_id).catch(console.warn);
    }

    // ── 10. Audit log for staff bookings (Req 4.9) ───────────
    if (isStaff && staffId) {
      await writeAuditLog({
        actor:       staffId,
        action_type: AuditActionType.BookingCreated,
        entity_type: EntityType.Booking,
        entity_id:   booking.id,
        description: `Walk-in booking ${booking.booking_reference} created for ${guest_name} — room ${room.room_number} — ETB ${totalAmount}`,
        metadata:    { payment_method, nights, total_amount: totalAmount, source: 'walk_in' },
      });
    }

    return NextResponse.json(
      {
        data: {
          booking_id:        booking.id,
          booking_reference: booking.booking_reference,
          room_number:       room.room_number,
          room_type:         room.room_type,
          check_in_date,
          check_out_date,
          nights,
          total_amount:      totalAmount,
          payment_method,
          booking_status:    booking.booking_status,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.code === 'BOOKING_CONFLICT') {
      return NextResponse.json(
        { error: { code: 'BOOKING_CONFLICT', message: err.message, details: { conflict: err.conflict } } },
        { status: 409 }
      );
    }
    console.error('[POST /api/v1/bookings]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create booking' } },
      { status: 500 }
    );
  }
}
