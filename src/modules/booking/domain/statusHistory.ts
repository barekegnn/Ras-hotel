// ============================================================
// Booking Status History Recorder
// src/modules/booking/domain/statusHistory.ts
//
// Records every status transition in booking_status_history
// and audit_log atomically via sequential inserts.
// Requirements 38.4, 38.5
// ============================================================

import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType, type BookingStatus } from '@/shared/types/domain';

// Map booking status transitions to audit action types
function transitionToActionType(newStatus: BookingStatus): AuditActionType {
  switch (newStatus) {
    case 'checked_in':               return AuditActionType.CheckIn;
    case 'checked_out':              return AuditActionType.CheckOut;
    case 'no_show':                  return AuditActionType.NoShowMarked;
    case 'cancelled_full_refund':
    case 'cancelled_partial_refund':
    case 'cancelled_no_refund':      return AuditActionType.BookingCancelled;
    case 'paid':                     return AuditActionType.CashCollectionEvent;
    default:                         return AuditActionType.BookingModified;
  }
}

/**
 * Records a booking status transition in booking_status_history and audit_log.
 * Must be called every time a booking's status changes. Requirement 38.4
 *
 * @param bookingId       The booking UUID
 * @param bookingRef      The human-readable reference (for audit description)
 * @param previousStatus  The status before this transition (null for initial create)
 * @param newStatus       The status after this transition
 * @param actor           The staff user ID or "system"
 */
export async function recordStatusTransition(
  bookingId: string,
  bookingRef: string,
  previousStatus: BookingStatus | null,
  newStatus: BookingStatus,
  actor: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  // Insert into booking_status_history
  const { error } = await supabase.from('booking_status_history').insert({
    booking_id:      bookingId,
    previous_status: previousStatus,
    new_status:      newStatus,
    actor,
    transitioned_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[recordStatusTransition] Failed to insert history entry:', error.message);
    // Don't throw — continue to audit log
  }

  // Write to audit log
  await writeAuditLog({
    actor,
    action_type: transitionToActionType(newStatus),
    entity_type: EntityType.Booking,
    entity_id:   bookingId,
    description: previousStatus
      ? `Booking ${bookingRef} transitioned: ${previousStatus} → ${newStatus}`
      : `Booking ${bookingRef} created with status ${newStatus}`,
    metadata:    { previousStatus, newStatus, bookingRef },
  });
}
