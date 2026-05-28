// ============================================================
// Auth Session Helpers
// src/modules/auth/domain/session.ts
//
// Server-side helpers for authentication and role-based access control.
// Uses getUser() (not getSession()) to authenticate via Supabase Auth server.
// Requirements 11.1, 11.3, 11.5
// ============================================================

import { createSupabaseServerClient } from '../infrastructure/supabase';
import type { UserRole } from '@/shared/types/domain';
import { NextResponse } from 'next/server';

// ── Auth User Helper ──────────────────────────────────────────

/**
 * Returns the authenticated user by contacting the Supabase Auth server.
 * Uses getUser() — NOT getSession() — to prevent cookie-spoofing attacks.
 * Returns null if no valid session exists.
 */
export async function getAuthUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Returns the role of the currently authenticated user.
 * Reads from the `staff_accounts` table using the verified user ID.
 * Returns null if the user is not authenticated or has no staff record.
 */
export async function getUserRole(): Promise<UserRole | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('role')
    .eq('auth_id', user.id)
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
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('*')
    .eq('auth_id', user.id)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

// ── API Route Auth Guards ─────────────────────────────────────

/**
 * Requires an authenticated session in an API route.
 * Returns the user + role if valid, or a 401/403 NextResponse.
 */
export async function requireAuth(
  minRole?: UserRole
): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>; role: UserRole; error: null }
  | { user: null; role: null; error: NextResponse }
> {
  const user = await getAuthUser();
  if (!user) {
    return {
      user: null,
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
      user: null,
      role: null,
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Staff account not found or inactive' } },
        { status: 401 }
      ),
    };
  }

  // 'manager' minRole requires manager; 'receptionist' allows any staff
  if (minRole === 'manager' && role !== 'manager') {
    return {
      user: null,
      role: null,
      error: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Manager role required' } },
        { status: 403 }
      ),
    };
  }

  return { user, role, error: null };
}

/**
 * Checks if the current user is a manager.
 */
export async function isManager(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'manager';
}
