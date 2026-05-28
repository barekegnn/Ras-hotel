// ============================================================
// POST /api/v1/auth/logout
// src/app/api/v1/auth/logout/route.ts
// Signs out the current staff session.
// ============================================================

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/modules/auth/infrastructure/supabase';

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();

    // Redirect to login page after sign-out
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'), {
      status: 302,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Logout failed';
    console.error('[POST /api/v1/auth/logout]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
