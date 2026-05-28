// ============================================================
// PATCH  /api/v1/staff/:id  — Update staff account
// DELETE /api/v1/staff/:id  — Deactivate staff account
// src/app/api/v1/staff/[id]/route.ts
// Requirements 11.3–11.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';

type Params = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();
    const body = await request.json();
    const { full_name, role, is_active } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (role !== undefined) {
      if (!['receptionist', 'manager'].includes(role)) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'role must be receptionist or manager' } },
          { status: 400 }
        );
      }
      updates.role = role;
    }
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data, error } = await supabase
      .from('staff_accounts')
      .update(updates)
      .eq('id', params.id)
      .select('id, full_name, username, role, is_active')
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.StaffAccountModified,
      entity_type: EntityType.StaffAccount,
      entity_id:   params.id,
      description: `Staff account ${data.username} updated`,
      metadata:    updates,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error(`[PATCH /api/v1/staff/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update staff account' } },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();

    // Soft-delete: deactivate rather than hard delete (Req 11.6)
    const { data, error } = await supabase
      .from('staff_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, username')
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.StaffAccountDeactivated,
      entity_type: EntityType.StaffAccount,
      entity_id:   params.id,
      description: `Staff account ${data.username} deactivated`,
      metadata:    {},
    });

    return NextResponse.json({ data: { message: 'Staff account deactivated' } });
  } catch (err: any) {
    console.error(`[DELETE /api/v1/staff/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate staff account' } },
      { status: 500 }
    );
  }
}
