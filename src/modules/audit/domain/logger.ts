// ============================================================
// Audit Log Writer
// src/modules/audit/domain/logger.ts
//
// Append-only audit log. Every staff action is captured here.
// Requirements 37.5, 37.6
// ============================================================

import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import type { AuditActionType, EntityType } from '@/shared/types/domain';

export interface AuditLogInput {
  actor:       string;          // staff user ID or "system"
  action_type: AuditActionType;
  entity_type: EntityType;
  entity_id:   string;
  description: string;
  metadata?:   Record<string, unknown>;
}

/**
 * Writes an immutable audit log entry.
 * Uses the service-role client so RLS does not block the insert.
 * The DB trigger prevents any subsequent UPDATE or DELETE on audit_log.
 *
 * Requirements 37.5, 37.6
 */
export async function writeAuditLog(entry: AuditLogInput): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('audit_log').insert({
    actor:       entry.actor,
    action_type: entry.action_type,
    entity_type: entry.entity_type,
    entity_id:   entry.entity_id,
    description: entry.description,
    metadata:    entry.metadata ?? {},
    action_at:   new Date().toISOString(),
  });

  if (error) {
    // Log but don't throw — a failed audit write must not block the business operation
    console.error('[writeAuditLog] Failed to write audit entry:', error.message, entry);
  }
}

/**
 * Writes an audit entry for a rejected status transition attempt. Req 38.3
 */
export async function writeRejectedTransitionLog(
  actor: string,
  bookingId: string,
  bookingRef: string,
  currentStatus: string,
  attemptedStatus: string,
  validNextStatuses: string[]
): Promise<void> {
  const { AuditActionType, EntityType } = await import('@/shared/types/domain');
  await writeAuditLog({
    actor,
    action_type: AuditActionType.InvalidTransitionAttempt,
    entity_type: EntityType.Booking,
    entity_id:   bookingId,
    description: `Invalid transition attempted on booking ${bookingRef}: ${currentStatus} → ${attemptedStatus}`,
    metadata:    { currentStatus, attemptedStatus, validNextStatuses },
  });
}
