// ============================================================
// DELETE /api/v1/rooms/rates/:id  — Delete a seasonal rate
// src/app/api/v1/rooms/rates/[id]/route.ts
// Requirements 26.8
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { deleteSeasonalRate } from '@/modules/pricing/infrastructure/repository';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';

type Params = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    await deleteSeasonalRate(params.id);

    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.SeasonalRateDeleted,
      entity_type: EntityType.SeasonalRate,
      entity_id:   params.id,
      description: `Seasonal rate ${params.id} deleted`,
      metadata:    {},
    });

    return NextResponse.json({ data: { message: 'Seasonal rate deleted' } });
  } catch (err: any) {
    console.error(`[DELETE /api/v1/rooms/rates/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete seasonal rate' } },
      { status: 500 }
    );
  }
}
