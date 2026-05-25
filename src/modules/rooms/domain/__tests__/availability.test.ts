// ============================================================
// Property Test — No Overlapping Confirmed Bookings (Property 2)
// src/modules/rooms/domain/__tests__/availability.test.ts
//
// Property 2: No Overlapping Confirmed Bookings for Same Room
// Validates: Requirements 28.1, 28.2
// ============================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { hasOverlap, findOverlappingBookingPairs } from '../availability';

// ── Arbitraries ───────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const BLOCKING = ['Reserved_Unpaid', 'Paid', 'Checked_In'];
const CANCELLED = ['Cancelled_Full_Refund', 'Cancelled_Partial_Refund', 'Cancelled_No_Refund', 'No_Show'];
const ALL_STATUSES = [...BLOCKING, ...CANCELLED];

/** Generates a booking with a valid date range */
const bookingArb = (roomId: string) =>
  fc.record({
    id:             fc.uuidV(4),
    room_id:        fc.constant(roomId),
    booking_status: fc.constantFrom(...ALL_STATUSES),
  }).chain((b) =>
    fc.date({ min: new Date('2025-01-01'), max: new Date('2026-01-01') }).chain((start) =>
      fc.integer({ min: 1, max: 14 }).map((nights) => {
        const checkIn  = new Date(start);
        const checkOut = new Date(start);
        checkOut.setDate(checkOut.getDate() + nights);
        return { ...b, check_in_date: isoDate(checkIn), check_out_date: isoDate(checkOut) };
      })
    )
  );

// ============================================================
// PROPERTY 2: No Overlapping Confirmed Bookings
// ============================================================

describe('Feature: ras-hotel-management — Property 2: No Overlapping Confirmed Bookings', () => {

  it('findOverlappingBookingPairs reports every actual overlap among active bookings', () => {
    fc.assert(
      fc.property(
        fc.array(bookingArb('room-1'), { minLength: 0, maxLength: 10 }),
        (bookings) => {
          const pairs = findOverlappingBookingPairs(bookings);

          // Every reported pair must genuinely overlap
          for (const [a, b] of pairs) {
            expect(hasOverlap(a.check_in_date, a.check_out_date, b.check_in_date, b.check_out_date)).toBe(true);
            expect(BLOCKING).toContain(a.booking_status);
            expect(BLOCKING).toContain(b.booking_status);
            expect(a.room_id).toBe(b.room_id);
          }

          // No overlapping active pair must be missed
          const active = bookings.filter((b) => BLOCKING.includes(b.booking_status));
          for (let i = 0; i < active.length; i++) {
            for (let j = i + 1; j < active.length; j++) {
              const a = active[i]!;
              const b = active[j]!;
              if (a.room_id === b.room_id && hasOverlap(a.check_in_date, a.check_out_date, b.check_in_date, b.check_out_date)) {
                const found = pairs.some(
                  ([pa, pb]) =>
                    (pa.id === a.id && pb.id === b.id) ||
                    (pa.id === b.id && pb.id === a.id)
                );
                expect(found).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('cancelled and no-show bookings never appear in overlap pairs', () => {
    fc.assert(
      fc.property(
        fc.array(bookingArb('room-1'), { minLength: 0, maxLength: 8 }),
        (bookings) => {
          const pairs = findOverlappingBookingPairs(bookings);
          for (const [a, b] of pairs) {
            expect(CANCELLED).not.toContain(a.booking_status);
            expect(CANCELLED).not.toContain(b.booking_status);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── hasOverlap Unit Tests ─────────────────────────────────────

describe('hasOverlap — date range overlap logic', () => {
  it('detects a clear overlap', () => {
    expect(hasOverlap('2025-08-01', '2025-08-10', '2025-08-05', '2025-08-15')).toBe(true);
  });

  it('detects containment (inner range fully inside outer)', () => {
    expect(hasOverlap('2025-08-01', '2025-08-20', '2025-08-05', '2025-08-10')).toBe(true);
  });

  it('allows back-to-back bookings (checkout = next checkin)', () => {
    // Booking A: Aug 1–10; Booking B: Aug 10–15 — no overlap (checkout is exclusive)
    expect(hasOverlap('2025-08-01', '2025-08-10', '2025-08-10', '2025-08-15')).toBe(false);
  });

  it('returns false for fully non-overlapping ranges', () => {
    expect(hasOverlap('2025-08-01', '2025-08-05', '2025-08-10', '2025-08-15')).toBe(false);
  });

  it('detects exact same range as overlapping', () => {
    expect(hasOverlap('2025-08-01', '2025-08-10', '2025-08-01', '2025-08-10')).toBe(true);
  });

  it('detects 1-night overlap at boundary', () => {
    expect(hasOverlap('2025-08-08', '2025-08-12', '2025-08-11', '2025-08-15')).toBe(true);
  });
});
