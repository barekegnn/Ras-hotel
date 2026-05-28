// ============================================================
// Staff Login API Route
// src/app/api/v1/auth/login/route.ts
//
// Handles username/password login for staff.
// Enforces lockout, records attempts, issues Supabase JWT session.
// Requirements 11.1, 11.2, 11.5
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { checkAccountLocked, recordFailedLogin, recordSuccessfulLogin } from '@/modules/auth/domain/lockout';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' } },
        { status: 400 }
      );
    }

    // 1. Check lockout BEFORE attempting auth (Req 11.2)
    const lockStatus = await checkAccountLocked(username);
    if (lockStatus.locked) {
      return NextResponse.json(
        {
          error: {
            code: 'ACCOUNT_LOCKED',
            message: lockStatus.unlocksAt
              ? `Account locked. Try again in ${lockStatus.remainingMinutes} minute(s).`
              : 'Account is deactivated. Contact your manager.',
            details: { unlocksAt: lockStatus.unlocksAt?.toISOString() },
          },
        },
        { status: 403 }
      );
    }

    // 2. Resolve email from username (Supabase Auth uses email)
    const serviceClient = createSupabaseServiceClient();
    const { data: staffData } = await serviceClient
      .from('staff_accounts')
      .select('id, auth_id')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    // 3. Fetch email from auth.users using auth_id (not the staff_accounts.id)
    let email: string | null = null;
    if (staffData?.auth_id) {
      const { data: authUser } = await serviceClient.auth.admin.getUserById(staffData.auth_id);
      email = authUser?.user?.email ?? null;
    }

    if (!email) {
      // Record the failed attempt even for unknown usernames (timing attack mitigation)
      await recordFailedLogin(username);
      return NextResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } },
        { status: 401 }
      );
    }

    // 4. Attempt Supabase sign-in with email + password
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      const lockResult = await recordFailedLogin(username);
      const attemptsLeft = Math.max(0, 3 - lockResult.failedAttempts);

      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid username or password',
            details: lockResult.locked
              ? { locked: true, unlocksAt: lockResult.unlocksAt?.toISOString() }
              : { attemptsRemaining: attemptsLeft },
          },
        },
        { status: 401 }
      );
    }

    // 5. Successful login — reset attempts, update last_login_at
    await recordSuccessfulLogin(data.session.user.id);

    // 6. Check if password change is required
    // Use auth_id (= data.session.user.id) to look up the staff account
    const { data: staffAccount } = await serviceClient
      .from('staff_accounts')
      .select('must_change_password, role, full_name')
      .eq('auth_id', data.session.user.id)
      .single();

    return NextResponse.json({
      data: {
        role:               staffAccount?.role,
        fullName:           staffAccount?.full_name,
        mustChangePassword: staffAccount?.must_change_password ?? false,
      },
    });
  } catch (err) {
    console.error('[auth/login] Unexpected error:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
