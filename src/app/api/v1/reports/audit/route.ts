// ============================================================
// GET /api/v1/reports/audit
// src/app/api/v1/reports/audit/route.ts
// Manager-only audit log endpoint. Requirements 37.1–37.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  const { searchParams } = request.nextUrl;
  const page        = Math.max(1, Number(searchParams.get('page') ?? 1));
  const perPage     = Math.min(100, Number(searchParams.get('per_page') ?? 50));
  const actionType  = searchParams.get('action_type') ?? undefined;
  const entityType  = searchParams.get('entity_type') ?? undefined;
  const actor       = searchParams.get('actor') ?? undefined;
  const from        = searchParams.get('from') ?? undefined;
  const to          = searchParams.get('to') ?? undefined;

  try {
    const supabase = createSupabaseServiceClient();
    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('action_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (actionType) query = query.eq('action_type', actionType);
    if (entityType) query = query.eq('entity_type', entityType);
    if (actor)      query = query.ilike('actor', `%${actor}%`);
    if (from)       query = query.gte('action_at', from);
    if (to)         query = query.lte('action_at', to);

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({
      data: data ?? [],
      meta: { page, per_page: perPage, total: count ?? 0 },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch audit log';
    console.error('[GET /api/v1/reports/audit]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
