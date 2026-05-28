// ============================================================
// /api/v1/rooms/[id]
// src/app/api/v1/rooms/[id]/route.ts
//
// GET  — public room detail with photos and availability calendar
// PATCH — Manager: update description / base price
// DELETE — Manager: deactivate room
// Requirements 26.2, 26.3, 26.4, 28.3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getRoomById,
  updateRoom,
  deactivateRoom,
  listFutureBookingsForRoom,
} from '@/modules/rooms/infrastructure/repository';
import { getActiveRatesForRoomType, resolveStayPrice } from '@/modules/pricing/infrastructure/repository';
import { requireAuth } from '@/modules/auth/domain/session';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const room = await getRoomById(params.id);
    if (!room) {
      return NextResponse.json(
        { error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    // Attach seasonal rates for calendar view
    const today = new Date().toISOString().slice(0, 10);
    const sixtyDaysOut = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
    const rates = await getActiveRatesForRoomType(room.room_type, today, sixtyDaysOut);

    return NextResponse.json({ data: { ...room, seasonal_rates: rates } });
  } catch (err) {
    console.error(`[GET /api/v1/rooms/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch room' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const room = await getRoomById(params.id, true);
    if (!room) {
      return NextResponse.json(
        { error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowedUpdates = ['description', 'base_price_per_night', 'room_type'] as const;
    const updates: Record<string, unknown> = {};
    for (const field of allowedUpdates) {
      if (field in body) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 }
      );
    }

    if ('base_price_per_night' in updates && (updates.base_price_per_night as number) <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'base_price_per_night must be greater than 0' } },
        { status: 400 }
      );
    }

    const updated = await updateRoom(params.id, updates as any);

    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.RoomModified,
      entity_type: EntityType.Room,
      entity_id:   params.id,
      description: `Room ${room.room_number} updated`,
      metadata:    { previous: { description: room.description, base_price_per_night: room.base_price_per_night }, updated: updates },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error(`[PATCH /api/v1/rooms/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update room' } },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const room = await getRoomById(params.id, true);
    if (!room) {
      return NextResponse.json(
        { error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    // Warn about affected future bookings (Req 28.3) — caller must pass ?confirm=true to proceed
    const futureBookings = await listFutureBookingsForRoom(params.id);
    const url = new URL(_req.url);
    if (futureBookings.length > 0 && url.searchParams.get('confirm') !== 'true') {
      return NextResponse.json(
        {
          error: {
            code:    'DEACTIVATION_HAS_FUTURE_BOOKINGS',
            message: `Room ${room.room_number} has ${futureBookings.length} future booking(s). Pass ?confirm=true to proceed.`,
            details: { affectedBookings: futureBookings },
          },
        },
        { status: 409 }
      );
    }

    await deactivateRoom(params.id);

    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.RoomDeactivated,
      entity_type: EntityType.Room,
      entity_id:   params.id,
      description: `Room ${room.room_number} deactivated`,
      metadata:    { affectedFutureBookings: futureBookings.length },
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error(`[DELETE /api/v1/rooms/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate room' } },
      { status: 500 }
    );
  }
}
