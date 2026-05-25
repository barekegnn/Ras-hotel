// ============================================================
// GET /api/v1/rooms
// src/app/api/v1/rooms/route.ts
//
// Public: lists all active rooms with nightly rate and availability.
// Manager POST: creates a new room.
// Requirements 26.1, 26.2
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { listActiveRooms, createRoom } from '@/modules/rooms/infrastructure/repository';
import { resolveNightlyRate } from '@/modules/pricing/infrastructure/repository';
import { checkRoomAvailability } from '@/modules/rooms/domain/availability';
import { requireAuth } from '@/modules/auth/domain/session';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';
import type { CreateRoomInput } from '@/shared/types/domain';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn  = searchParams.get('check_in');
    const checkOut = searchParams.get('check_out');

    const rooms = await listActiveRooms(true);

    // Resolve nightly rate for today (or use check-in date if provided)
    const rateDate = checkIn ? new Date(checkIn) : new Date();

    const roomsWithRate = await Promise.all(
      rooms.map(async (room) => {
        const nightlyRate = await resolveNightlyRate(
          room.room_type,
          rateDate,
          room.base_price_per_night
        );

        let isAvailable = true;
        if (checkIn && checkOut) {
          isAvailable = await checkRoomAvailability(room.id, checkIn, checkOut);
        }

        return {
          ...room,
          nightly_rate: nightlyRate,
          is_available: isAvailable,
        };
      })
    );

    return NextResponse.json({ data: roomsWithRate });
  } catch (err) {
    console.error('[GET /api/v1/rooms]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rooms' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const body = await request.json() as Partial<CreateRoomInput>;
    const { room_number, room_type, floor, description, base_price_per_night } = body;

    if (!room_number?.trim() || !room_type?.trim() || floor === undefined || !base_price_per_night) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'room_number, room_type, floor, and base_price_per_night are required' } },
        { status: 400 }
      );
    }

    if (base_price_per_night <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'base_price_per_night must be greater than 0' } },
        { status: 400 }
      );
    }

    const room = await createRoom({ room_number, room_type, floor, description: description ?? '', base_price_per_night });

    await writeAuditLog({
      actor:       auth.session!.user.id,
      action_type: AuditActionType.RoomCreated,
      entity_type: EntityType.Room,
      entity_id:   room.id,
      description: `Room ${room.room_number} (${room.room_type}) created at ETB ${base_price_per_night}/night`,
      metadata:    { room_number, room_type, floor, base_price_per_night },
    });

    return NextResponse.json({ data: room }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: err.message } },
        { status: 409 }
      );
    }
    console.error('[POST /api/v1/rooms]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create room' } },
      { status: 500 }
    );
  }
}
