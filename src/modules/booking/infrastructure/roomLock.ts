// ============================================================
// Room Lock Client
// src/modules/booking/infrastructure/roomLock.ts
//
// Calls Supabase RPC functions to acquire/release 10-min room holds.
// Requirements 3.2, 3.3, 3.6
// ============================================================

import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

const LOCK_DURATION_MS = 10 * 60 * 1000;       // 10 minutes
const WARNING_THRESHOLD_MS = 2 * 60 * 1000;    // warn at 2 minutes remaining

export interface LockResult {
  acquired:  boolean;
  renewed?:  boolean;
  expiresAt?: Date;
  reason?:   string;
}

/**
 * Acquires a 10-minute room lock for the given session.
 * Returns { acquired: true } on success, { acquired: false, reason } if blocked.
 * Requirement 3.2
 */
export async function acquireRoomLock(
  roomId: string,
  sessionId: string
): Promise<LockResult> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc('acquire_room_lock', {
    p_room_id:    roomId,
    p_session_id: sessionId,
  });

  if (error) throw new Error(`acquireRoomLock RPC failed: ${error.message}`);

  return {
    acquired:  data.acquired,
    renewed:   data.renewed,
    expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    reason:    data.reason,
  };
}

/**
 * Releases a room lock held by a specific session.
 * Called on payment session timeout, payment confirmation, or cancellation.
 * Requirement 3.3
 */
export async function releaseRoomLock(
  roomId: string,
  sessionId: string
): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.rpc('release_room_lock', {
    p_room_id:    roomId,
    p_session_id: sessionId,
  });

  if (error) {
    console.warn(`[releaseRoomLock] RPC warning: ${error.message}`);
    return false;
  }
  return !!data;
}

/**
 * Checks whether a room currently has an active (non-expired) lock.
 */
export async function getRoomLockStatus(
  roomId: string
): Promise<{ locked: boolean; expiresAt?: Date; ownedBySession?: string }> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('room_locks')
    .select('session_id, expires_at')
    .eq('room_id', roomId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return { locked: false };
  return { locked: true, expiresAt: new Date(data.expires_at), ownedBySession: data.session_id };
}

/**
 * Returns the number of milliseconds remaining on a lock given its expiry.
 * Used to compute countdown timer and warning threshold.
 */
export function getRemainingMs(expiresAt: Date): number {
  return Math.max(0, expiresAt.getTime() - Date.now());
}

export function shouldShowWarning(expiresAt: Date): boolean {
  return getRemainingMs(expiresAt) <= WARNING_THRESHOLD_MS;
}
