// ============================================================
// POST /api/v1/auth/change-password
// src/app/api/v1/auth/change-password/route.ts
// Requirements 11.4
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { current_password, new_password } = await request.json() as {
      current_password?: string;
      new_password?:     string;
    };

    if (!new_password || new_password.length < 8) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Verify current password by re-authenticating
    if (current_password) {
      const serviceClient = createSupabaseServiceClient();
      const { data: staffData } = await serviceClient
        .from('staff_accounts')
        .select('auth_id')
        .eq('auth_id', auth.user.id)
        .single();

      if (!staffData) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Staff account not found' } },
          { status: 404 }
        );
      }

      // Get email for re-auth
      const { data: authUser } = await serviceClient.auth.admin.getUserById(auth.user.id);
      const email = authUser?.user?.email;
      if (email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: current_password,
        });
        if (signInError) {
          return NextResponse.json(
            { error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' } },
            { status: 401 }
          );
        }
      }
    }

    // Update password via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({ password: new_password });
    if (updateError) {
      return NextResponse.json(
        { error: { code: 'UPDATE_FAILED', message: updateError.message } },
        { status: 400 }
      );
    }

    // Clear must_change_password flag
    const serviceClient = createSupabaseServiceClient();
    await serviceClient
      .from('staff_accounts')
      .update({ must_change_password: false })
      .eq('auth_id', auth.user.id);

    return NextResponse.json({ data: { success: true } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to change password';
    console.error('[POST /api/v1/auth/change-password]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
