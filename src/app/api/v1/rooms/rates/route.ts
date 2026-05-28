// ============================================================
// GET  /api/v1/rooms/rates  — List all seasonal rates
// POST /api/v1/rooms/rates  — Create a seasonal rate
// src/app/api/v1/rooms/rates/route.ts
// Requirements 26.5–26.9
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import {
  listSeasonalRates,
  createSeasonalRate,
} from '@/modules/pricing/infrastructure/repository';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';

export async function GET(_req: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const rates = await listSeasonalRates();
    return NextResponse.json({ data: rates });
  } catch (err: any) {
    console.error('[GET /api/v1/rooms/rates]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch seasonal rates' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { room_type, start_date, end_date, override_price } = body;

    if (!room_type || !start_date || !end_date || !override_price) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'room_type, start_date, end_date, and override_price are required' } },
        { status: 400 }
      );
    }

    if (Number(override_price) <= 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'override_price must be greater than 0' } },
        { status: 400 }
      );
    }

    if (end_date <= start_date) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'end_date must be after start_date' } },
        { status: 400 }
      );
    }

    const rate = await createSeasonalRate({
      room_type,
      start_date,
      end_date,
      override_price: Number(override_price),
      created_by: auth.user!.id,
    });

    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.SeasonalRateCreated,
      entity_type: EntityType.SeasonalRate,
      entity_id:   rate.id,
      description: `Seasonal rate created for ${room_type}: ETB ${override_price}/night (${start_date} → ${end_date})`,
      metadata:    { room_type, start_date, end_date, override_price },
    });

    return NextResponse.json({ data: rate }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'SEASONAL_RATE_OVERLAP') {
      return NextResponse.json(
        { error: { code: 'SEASONAL_RATE_OVERLAP', message: err.message } },
        { status: 409 }
      );
    }
    console.error('[POST /api/v1/rooms/rates]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create seasonal rate' } },
      { status: 500 }
    );
  }
}
