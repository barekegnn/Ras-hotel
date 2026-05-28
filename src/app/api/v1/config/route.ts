// ============================================================
// GET /api/v1/config   — public, returns hotel config as key-value map
// PUT /api/v1/config   — manager-only, upserts config keys
// src/app/api/v1/config/route.ts
// Requirements 35.1–35.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

// ── GET — public ──────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('hotel_configuration')
      .select('key, value')
      .order('key');

    if (error) throw new Error(error.message);

    // Return as flat key-value map for easy consumption
    const map: Record<string, string> = {};
    for (const row of (data ?? [])) {
      map[row.key] = row.value;
    }

    return NextResponse.json({ data: map });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch config';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: msg } },
      { status: 500 }
    );
  }
}

// ── PUT — manager only ────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const body = await request.json() as Record<string, string>;

    const supabase = createSupabaseServiceClient();

    // Resolve staff_accounts.id from auth UUID (hotel_configuration.updated_by is a FK to staff_accounts.id)
    const { data: staffRow } = await supabase
      .from('staff_accounts')
      .select('id')
      .eq('auth_id', auth.user!.id)
      .single();
    const staffId = staffRow?.id ?? null;

    // Upsert each key
    const upserts = Object.entries(body).map(([key, value]) => ({
      key,
      value:      String(value),
      updated_by: staffId,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('hotel_configuration')
      .upsert(upserts, { onConflict: 'key' });

    if (error) throw new Error(error.message);

    return NextResponse.json({ data: { success: true, updated: upserts.length } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update config';
    console.error('[PUT /api/v1/config]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
