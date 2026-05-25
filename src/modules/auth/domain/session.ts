// ============================================================
// Auth Session Helpers
// src/modules/auth/domain/session.ts
//
// Server-side helpers for authentication and role-based access control.
// Requirements 11.1, 11.3, 11.5
// ============================================================

import { createSupabaseServerClient } from '../infrastructure/supabase';
import type { UserRole } from '@/shared/types/domain';
import { NextResponse, type NextRequest } from 'next/server';

// ── Session Helpers ───────────────────────────────────────────

/**
 * Retrieves the current authenticated session from the request cookies.
 * Returns null if no valid session exists.
 */
export async function getSession() {
  const supabase = createSupabaseServerClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session;
}

/**
 * Returns the role of the currently authenticated user.
 * Reads from the `staff_accounts` table using the session's user ID.
 * Returns null if the user is not authenticated or has no staff record.
 */
export async function getUserRole(): Promise<UserRole | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('role')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data.role as UserRole;
}

/**
 * Returns the full staff account for the currently authenticated user.
 * Returns null if not authenticated or account is inactive.
 */
export async function getCurrentStaffAccount() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('*')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

// ── API Route Auth Guards ─────────────────────────────────────

/**
 * Requires an authenticated session in an API route.
 * Returns the session if valid, or a 401 NextResponse.
 */
export async function requireAuth(
  minRole?: UserRole
): Promise<
  | { session: Awaited<ReturnType<typeof getSession>>; role: UserRole; error: null }
  | { session: null; role: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      role: null,
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      ),
    };
  }

  const role = await getUserRole();
  if (!role) {
    return {
      session: null,
      role: null,
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Staff account not found or inactive' } },
        { status: 401 }
      ),
    };
  }

  if (minRole === 'manager' && role !== 'manager') {
    return {
      session: null,
      role: null,
      error: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Manager role required' } },
        { status: 403 }
      ),
    };
  }

  return { session, role, error: null };
}

/**
 * Checks if the current user is a manager.
 */
export async function isManager(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'manager';
}
