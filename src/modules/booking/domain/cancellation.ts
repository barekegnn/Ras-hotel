// ============================================================
// Cancellation Refund Tier Calculator
// src/modules/booking/domain/cancellation.ts
//
// Validates: Requirements 16.5, 16.6, 16.7, 34.6
// Tested by: Property 4 (2.5)
// ============================================================

import type { RefundTier } from '@/shared/types/domain';

/**
 * Calculates the appropriate refund tier for a cancellation.
 *
 * Rules (using the configurable policy window from Hotel_Configuration):
 *   - Full refund   : cancellation more than policyWindowHours before check-in
 *   - Partial refund: cancellation within policyWindowHours of check-in (but not on check-in day)
 *   - No refund     : cancellation on the check-in day (same calendar date) or after
 *
 * The "on check-in day" rule compares calendar dates in the hotel's local timezone
 * context — we receive them as Date objects already adjusted for timezone by callers.
 *
 * @param cancellationAt      UTC timestamp of the cancellation
 * @param checkInDate         Calendar date of check-in (time component = hotel's check-in time)
 * @param policyWindowHours   Hours before check-in that triggers partial vs full refund (default 48)
 * @returns                   'full' | 'partial' | 'none'
 *
 * Requirements 16.5, 16.6, 16.7, 34.6
 */
export function calculateRefundTier(
  cancellationAt: Date,
  checkInDate: Date,
  policyWindowHours: number
): RefundTier {
  // Normalise check-in to start of day (midnight) for the "on check-in day" comparison
  const checkInDay = new Date(checkInDate);
  checkInDay.setHours(0, 0, 0, 0);

  const cancellationDay = new Date(cancellationAt);
  cancellationDay.setHours(0, 0, 0, 0);

  // No refund: cancelled on the check-in day or after
  if (cancellationDay >= checkInDay) {
    return 'none';
  }

  // Hours difference between cancellation time and check-in time
  const hoursBeforeCheckin =
    (checkInDate.getTime() - cancellationAt.getTime()) / (1000 * 60 * 60);

  // Full refund: more than policyWindowHours before check-in
  if (hoursBeforeCheckin > policyWindowHours) {
    return 'full';
  }

  // Partial refund: within window but before check-in day
  return 'partial';
}

/**
 * Human-readable description of the refund tier outcome for SMS / UI.
 */
export function describeRefundTier(
  tier: RefundTier,
  totalAmount: number
): { label: string; refundAmount: number } {
  switch (tier) {
    case 'full':
      return { label: 'Full Refund', refundAmount: totalAmount };
    case 'partial':
      return { label: '50% Partial Refund', refundAmount: totalAmount * 0.5 };
    case 'none':
      return { label: 'No Refund', refundAmount: 0 };
  }
}
