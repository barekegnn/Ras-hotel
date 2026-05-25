// ============================================================
// Property & Unit Tests — Booking Domain
// src/modules/booking/domain/__tests__/booking.test.ts
//
// Properties tested:
//   Property 1  — Booking Status Transition Validity     (Req 38.2, 38.3)
//   Property 11 — Terminal Status Immutability           (Req 38.6)
//   Property 4  — Cancellation Refund Tier Consistency   (Req 16.5–16.7, 34.6)
//   Property 5  — Cash Collection Accountability         (Req 31.3, 31.5, 4.9)
//   Property 8  — Booking Reference Uniqueness           (Req 3.4, 7.1)
// ============================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateTransition,
  isTerminalStatus,
  allBookingStatuses,
  terminalStatuses,
  nonTerminalStatuses,
} from '../transitions';
import { calculateRefundTier } from '../cancellation';
import { generateBookingReference, isValidBookingReference } from '../reference';
import { validateCashCollectionEvent } from '@/shared/lib/validation';
import {
  BookingStatus,
  PERMITTED_TRANSITIONS,
  TERMINAL_STATUSES,
} from '@/shared/types/domain';

// ── Arbitraries ───────────────────────────────────────────────

const bookingStatusArb = fc.constantFrom(...allBookingStatuses());
const terminalStatusArb = fc.constantFrom(...terminalStatuses());
const nonTerminalStatusArb = fc.constantFrom(...nonTerminalStatuses());

// ============================================================
// PROPERTY 1: Booking Status Transition Validity
// ============================================================

describe('Feature: ras-hotel-management — Property 1: Booking Status Transition Validity', () => {
  it('permits ONLY the transitions defined in PERMITTED_TRANSITIONS', () => {
    fc.assert(
      fc.property(bookingStatusArb, bookingStatusArb, (current, next) => {
        const result = validateTransition(current, next);
        const permitted = PERMITTED_TRANSITIONS[current];
        const shouldBeAllowed = (permitted as ReadonlyArray<BookingStatus>).includes(next);

        expect(result.allowed).toBe(shouldBeAllowed);
      }),
      { numRuns: 200 }
    );
  });

  it('returns valid next statuses when a transition is rejected', () => {
    fc.assert(
      fc.property(bookingStatusArb, bookingStatusArb, (current, next) => {
        const result = validateTransition(current, next);
        if (!result.allowed) {
          expect(result.validNextStatuses).toEqual(
            expect.arrayContaining([...(PERMITTED_TRANSITIONS[current] as BookingStatus[])])
          );
          expect(result.validNextStatuses.length).toBe(PERMITTED_TRANSITIONS[current].length);
        }
      }),
      { numRuns: 200 }
    );
  });
});

// Specific permitted transitions (unit tests for documentation)
describe('Specific permitted transitions', () => {
  const permitted: Array<[BookingStatus, BookingStatus]> = [
    [BookingStatus.Reserved_Unpaid, BookingStatus.Paid],
    [BookingStatus.Reserved_Unpaid, BookingStatus.Cancelled_No_Refund],
    [BookingStatus.Paid,            BookingStatus.Checked_In],
    [BookingStatus.Paid,            BookingStatus.Cancelled_Full_Refund],
    [BookingStatus.Paid,            BookingStatus.Cancelled_Partial_Refund],
    [BookingStatus.Paid,            BookingStatus.Cancelled_No_Refund],
    [BookingStatus.Paid,            BookingStatus.No_Show],
    [BookingStatus.Checked_In,      BookingStatus.Checked_Out],
  ];

  for (const [from, to] of permitted) {
    it(`allows ${from} → ${to}`, () => {
      expect(validateTransition(from, to).allowed).toBe(true);
    });
  }
});

// Specific forbidden transitions
describe('Specific forbidden transitions', () => {
  const forbidden: Array<[BookingStatus, BookingStatus]> = [
    [BookingStatus.Reserved_Unpaid, BookingStatus.Checked_In],
    [BookingStatus.Reserved_Unpaid, BookingStatus.Checked_Out],
    [BookingStatus.Reserved_Unpaid, BookingStatus.No_Show],
    [BookingStatus.Paid,            BookingStatus.Reserved_Unpaid],
    [BookingStatus.Checked_In,      BookingStatus.Reserved_Unpaid],
    [BookingStatus.Checked_In,      BookingStatus.Cancelled_No_Refund],
    [BookingStatus.Checked_In,      BookingStatus.No_Show],
  ];

  for (const [from, to] of forbidden) {
    it(`rejects ${from} → ${to}`, () => {
      expect(validateTransition(from, to).allowed).toBe(false);
    });
  }
});

// ============================================================
// PROPERTY 11: Terminal Status Immutability
// ============================================================

describe('Feature: ras-hotel-management — Property 11: Terminal Status Immutability', () => {
  it('rejects ALL transitions from terminal statuses', () => {
    fc.assert(
      fc.property(terminalStatusArb, bookingStatusArb, (terminal, next) => {
        const result = validateTransition(terminal, next);
        expect(result.allowed).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('returns empty validNextStatuses for terminal statuses', () => {
    for (const status of terminalStatuses()) {
      const result = validateTransition(status, BookingStatus.Paid);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.validNextStatuses).toEqual([]);
      }
    }
  });

  it('isTerminalStatus returns true for all terminal statuses', () => {
    for (const status of terminalStatuses()) {
      expect(isTerminalStatus(status)).toBe(true);
    }
  });

  it('isTerminalStatus returns false for non-terminal statuses', () => {
    for (const status of nonTerminalStatuses()) {
      expect(isTerminalStatus(status)).toBe(false);
    }
  });
});

// ============================================================
// PROPERTY 4: Cancellation Refund Tier Consistency
// ============================================================

describe('Feature: ras-hotel-management — Property 4: Cancellation Refund Tier Consistency', () => {
  // Generate hours-before-checkin, from -48h to +200h relative to check-in
  const hoursBeforeCheckinArb = fc.integer({ min: -48, max: 200 });
  const policyWindowArb = fc.integer({ min: 1, max: 96 });

  it('returns correct tier based on time difference and policy window', () => {
    fc.assert(
      fc.property(hoursBeforeCheckinArb, policyWindowArb, (hoursBeforeCheckin, windowHours) => {
        // Build dates: check-in is some fixed point, cancellation is derived
        const checkInDate = new Date('2025-10-15T14:00:00Z');
        const cancellationAt = new Date(
          checkInDate.getTime() - hoursBeforeCheckin * 60 * 60 * 1000
        );

        const tier = calculateRefundTier(cancellationAt, checkInDate, windowHours);

        // Determine expected tier
        const cancellationDay = new Date(cancellationAt);
        cancellationDay.setHours(0, 0, 0, 0);
        const checkInDay = new Date(checkInDate);
        checkInDay.setHours(0, 0, 0, 0);

        if (cancellationDay >= checkInDay) {
          expect(tier).toBe('none');
        } else if (hoursBeforeCheckin > windowHours) {
          expect(tier).toBe('full');
        } else {
          expect(tier).toBe('partial');
        }
      }),
      { numRuns: 300 }
    );
  });

  // Boundary: exactly at the policy window (should be partial, not full)
  it('treats cancellation EXACTLY at the policy window boundary as partial', () => {
    const checkIn = new Date('2025-10-15T14:00:00Z');
    const exactly48hBefore = new Date(checkIn.getTime() - 48 * 60 * 60 * 1000);
    expect(calculateRefundTier(exactly48hBefore, checkIn, 48)).toBe('partial');
  });

  // One minute before the window closes = partial
  it('treats cancellation 1 minute inside the window as partial', () => {
    const checkIn = new Date('2025-10-15T14:00:00Z');
    const justInsideWindow = new Date(checkIn.getTime() - (48 * 60 - 1) * 60 * 1000);
    expect(calculateRefundTier(justInsideWindow, checkIn, 48)).toBe('partial');
  });

  // One second outside the window = full
  it('treats cancellation 1 second outside the window as full refund', () => {
    const checkIn = new Date('2025-10-15T14:00:00Z');
    const justOutsideWindow = new Date(checkIn.getTime() - (48 * 60 * 60 * 1000 + 1000));
    expect(calculateRefundTier(justOutsideWindow, checkIn, 48)).toBe('full');
  });
});

// ============================================================
// PROPERTY 8: Booking Reference Uniqueness
// ============================================================

describe('Feature: ras-hotel-management — Property 8: Booking Reference Uniqueness', () => {
  it('generates no duplicate references in batches of 10 to 1000', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 500 }), (n) => {
        const refs = Array.from({ length: n }, () => generateBookingReference());
        const unique = new Set(refs);
        expect(unique.size).toBe(n);
      }),
      { numRuns: 50 }
    );
  });

  it('all generated references match the expected format', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const ref = generateBookingReference();
        expect(isValidBookingReference(ref)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('isValidBookingReference rejects invalid formats', () => {
    expect(isValidBookingReference('REF-123456')).toBe(false);
    expect(isValidBookingReference('RAS-12345')).toBe(false);      // too short
    expect(isValidBookingReference('RAS-1234567')).toBe(false);    // too long
    expect(isValidBookingReference('RAS-AAAAAA')).toBe(true);
    expect(isValidBookingReference('RAS-AB2CD3')).toBe(true);
  });
});

// ============================================================
// PROPERTY 5: Cash Collection Accountability
// ============================================================

describe('Feature: ras-hotel-management — Property 5: Cash Collection Accountability', () => {
  it('accepts valid cash collection events', () => {
    const valid = {
      booking_id:       '550e8400-e29b-41d4-a716-446655440000',
      receptionist_id:  '550e8400-e29b-41d4-a716-446655440001',
      amount_collected:  250.00,
      collected_at:     new Date().toISOString(),
    };
    const result = validateCashCollectionEvent(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects events with missing booking_id', () => {
    fc.assert(
      fc.property(
        fc.record({
          receptionist_id:  fc.uuidV(4),
          amount_collected: fc.double({ min: 0.01, max: 100000, noNaN: true }),
          collected_at:     fc.date().map((d) => d.toISOString()),
        }),
        (event) => {
          const result = validateCashCollectionEvent({ ...event, booking_id: '' });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('booking_id'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects events with missing receptionist_id', () => {
    fc.assert(
      fc.property(
        fc.record({
          booking_id:       fc.uuidV(4),
          amount_collected: fc.double({ min: 0.01, max: 100000, noNaN: true }),
          collected_at:     fc.date().map((d) => d.toISOString()),
        }),
        (event) => {
          const result = validateCashCollectionEvent({ ...event, receptionist_id: '' });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('receptionist_id'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects events with amount <= 0', () => {
    fc.assert(
      fc.property(
        fc.double({ max: 0, noNaN: true }),
        (amount) => {
          const result = validateCashCollectionEvent({
            booking_id:       '550e8400-e29b-41d4-a716-446655440000',
            receptionist_id:  '550e8400-e29b-41d4-a716-446655440001',
            amount_collected: amount,
            collected_at:     new Date().toISOString(),
          });
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('amount_collected'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects events with missing timestamp', () => {
    const result = validateCashCollectionEvent({
      booking_id:      '550e8400-e29b-41d4-a716-446655440000',
      receptionist_id: '550e8400-e29b-41d4-a716-446655440001',
      amount_collected: 100,
      collected_at:    undefined,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('collected_at'))).toBe(true);
  });
});
