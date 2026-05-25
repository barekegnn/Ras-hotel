// ============================================================
// Booking Status Transition Validator
// src/modules/booking/domain/transitions.ts
//
// Validates: Requirements 38.2, 38.3
// Tested by: Property 1 (2.2), Property 11 (2.3)
// ============================================================

import {
  BookingStatus,
  PERMITTED_TRANSITIONS,
  TERMINAL_STATUSES,
} from '@/shared/types/domain';

export type TransitionResult =
  | { allowed: true }
  | { allowed: false; currentStatus: BookingStatus; validNextStatuses: BookingStatus[] };

/**
 * Validates whether a booking status transition is permitted.
 *
 * @param current  The booking's current status
 * @param next     The proposed next status
 * @returns        { allowed: true } or { allowed: false, currentStatus, validNextStatuses }
 *
 * Requirements 38.2, 38.3
 */
export function validateTransition(
  current: BookingStatus,
  next: BookingStatus
): TransitionResult {
  const validNextStatuses = PERMITTED_TRANSITIONS[current];

  // validNextStatuses is always defined because PERMITTED_TRANSITIONS covers
  // every BookingStatus value — but guard defensively.
  if (!validNextStatuses) {
    return {
      allowed:          false,
      currentStatus:    current,
      validNextStatuses: [],
    };
  }

  if ((validNextStatuses as ReadonlyArray<BookingStatus>).includes(next)) {
    return { allowed: true };
  }

  return {
    allowed:          false,
    currentStatus:    current,
    validNextStatuses: [...validNextStatuses],
  };
}

/**
 * Returns true if the booking status is terminal (no further transitions).
 * Requirement 38.6
 */
export function isTerminalStatus(status: BookingStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Returns all BookingStatus values as a typed array.
 * Useful for property-based test generators.
 */
export function allBookingStatuses(): BookingStatus[] {
  return Object.values(BookingStatus);
}

/**
 * Returns all terminal statuses as an array.
 */
export function terminalStatuses(): BookingStatus[] {
  return [...TERMINAL_STATUSES];
}

/**
 * Returns all non-terminal statuses.
 */
export function nonTerminalStatuses(): BookingStatus[] {
  return allBookingStatuses().filter((s) => !TERMINAL_STATUSES.has(s));
}
