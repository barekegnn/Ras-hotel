// ============================================================
// GET  /api/v1/staff  — List staff accounts
// POST /api/v1/staff  — Create staff account
// src/app/api/v1/staff/route.ts
// Requirements 11.1–11.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

export async function GET(_req: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('staff_accounts')
      .select('id, full_name, username, role, is_active, last_login_at, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    console.error('[GET /api/v1/staff]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch staff accounts' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();
    const body = await request.json();
    const { full_name, username, role, password } = body;

    if (!full_name?.trim() || !username?.trim() || !role || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'full_name, username, role, and password are required' } },
        { status: 400 }
      );
    }

    if (!['receptionist', 'manager'].includes(role)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'role must be receptionist or manager' } },
        { status: 400 }
      );
    }

    // Create Supabase Auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email:    `${username.trim().toLowerCase()}@rashotel.internal`,
      password,
      email_confirm: true,
    });

    if (authErr || !authData.user) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: authErr?.message ?? 'Failed to create auth user' } },
        { status: 422 }
      );
    }

    // Create staff_accounts record
    const { data: staff, error: staffErr } = await supabase
      .from('staff_accounts')
      .insert({
        auth_id:              authData.user.id,
        full_name:            full_name.trim(),
        username:             username.trim().toLowerCase(),
        role,
        is_active:            true,
        must_change_password: true,
      })
      .select('id, full_name, username, role, is_active, created_at')
      .single();

    if (staffErr) {
      // Rollback auth user on DB failure
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      throw new Error(staffErr.message);
    }

    return NextResponse.json({ data: staff }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/v1/staff]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create staff account' } },
      { status: 500 }
    );
  }
}
