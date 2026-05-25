// ============================================================
// Account Lockout Logic
// src/modules/auth/domain/lockout.ts
//
// Tracks failed login attempts and enforces 15-minute lockouts
// after 3 consecutive failures. Requirements 11.2, 11.4
// ============================================================

import { createSupabaseServiceClient } from '../infrastructure/supabase';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

// ── Types ─────────────────────────────────────────────────────

export interface LockoutStatus {
  locked: boolean;
  failedAttempts: number;
  unlocksAt?: Date;
  remainingMinutes?: number;
}

// ── Lockout Checks ────────────────────────────────────────────

/**
 * Checks whether a staff account is currently locked.
 * Returns lock status and unlock time if locked.
 *
 * Requirement 11.2
 */
export async function checkAccountLocked(username: string): Promise<LockoutStatus> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('failed_login_attempts, locked_until, is_active')
    .eq('username', username)
    .single();

  if (error || !data) {
    // Unknown username — return not-locked (don't reveal account existence)
    return { locked: false, failedAttempts: 0 };
  }

  if (!data.is_active) {
    // Deactivated accounts appear permanently locked
    return { locked: true, failedAttempts: MAX_ATTEMPTS };
  }

  if (data.locked_until) {
    const unlocksAt = new Date(data.locked_until);
    if (unlocksAt > new Date()) {
      const remainingMs = unlocksAt.getTime() - Date.now();
      return {
        locked: true,
        failedAttempts: data.failed_login_attempts,
        unlocksAt,
        remainingMinutes: Math.ceil(remainingMs / 60000),
      };
    }
    // Lock has expired — clear it
    await clearLockout(username);
  }

  return { locked: false, failedAttempts: data.failed_login_attempts };
}

// ── Failed Login Recording ────────────────────────────────────

/**
 * Records a failed login attempt. Locks the account after MAX_ATTEMPTS.
 * Requirement 11.2
 */
export async function recordFailedLogin(username: string): Promise<LockoutStatus> {
  const supabase = createSupabaseServiceClient();

  // Fetch current state
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('id, failed_login_attempts')
    .eq('username', username)
    .single();

  if (error || !data) return { locked: false, failedAttempts: 0 };

  const newAttempts = data.failed_login_attempts + 1;
  const shouldLock = newAttempts >= MAX_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
    : null;

  await supabase
    .from('staff_accounts')
    .update({
      failed_login_attempts: newAttempts,
      ...(shouldLock ? { locked_until: lockedUntil } : {}),
    })
    .eq('username', username);

  if (shouldLock && lockedUntil) {
    return {
      locked: true,
      failedAttempts: newAttempts,
      unlocksAt: new Date(lockedUntil),
      remainingMinutes: LOCKOUT_MINUTES,
    };
  }

  return { locked: false, failedAttempts: newAttempts };
}

// ── Successful Login ──────────────────────────────────────────

/**
 * Resets failed login attempts and updates last_login_at on success.
 */
export async function recordSuccessfulLogin(userId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase
    .from('staff_accounts')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

// ── Lockout Clearing ──────────────────────────────────────────

/**
 * Clears an expired lockout from the database.
 */
async function clearLockout(username: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase
    .from('staff_accounts')
    .update({ locked_until: null, failed_login_attempts: 0 })
    .eq('username', username);
}
