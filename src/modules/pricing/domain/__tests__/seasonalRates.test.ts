// ============================================================
// Property Tests — Seasonal Rate Non-Overlap (Property 7)
// src/modules/pricing/domain/__tests__/seasonalRates.test.ts
//
// Property 7: Seasonal Rate Non-Overlap — Req 26.7
// ============================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  detectSeasonalRateOverlap,
  findAllOverlappingPairs,
  getApplicableRate,
  calculateStayPrice,
} from '../seasonalRates';
import type { SeasonalRate } from '@/shared/types/domain';

// ── Arbitraries ───────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Generate a SeasonalRate with a valid date range */
const seasonalRateArb = (roomType: string): fc.Arbitrary<SeasonalRate> =>
  fc.record({
    id:             fc.uuidV(4),
    room_type:      fc.constant(roomType),
    start_date:     fc.date({ min: new Date('2025-01-01'), max: new Date('2026-06-01') })
                      .map(isoDate),
    override_price: fc.double({ min: 100, max: 10000, noNaN: true }),
    created_by:     fc.option(fc.uuidV(4), { nil: undefined }),
    created_at:     fc.constant(new Date().toISOString()),
  }).chain((r) =>
    fc.date({
      min: new Date(r.start_date),
      max: new Date(new Date(r.start_date).getTime() + 90 * 24 * 60 * 60 * 1000),
    }).map((end) => ({
      ...r,
      end_date: isoDate(new Date(Math.max(end.getTime(), new Date(r.start_date).getTime() + 86400000))),
    }))
  );

// ============================================================
// PROPERTY 7: Seasonal Rate Non-Overlap
// ============================================================

describe('Feature: ras-hotel-management — Property 7: Seasonal Rate Non-Overlap', () => {
  it('detectSeasonalRateOverlap identifies overlapping rates', () => {
    // Two rates that deliberately overlap
    const existing: SeasonalRate[] = [
      {
        id: 'rate-1', room_type: 'Deluxe',
        start_date: '2025-08-01', end_date: '2025-08-31',
        override_price: 2000, created_at: '',
      },
    ];
    const candidate = {
      room_type: 'Deluxe',
      start_date: '2025-08-15',
      end_date: '2025-09-15',
    };
    const conflict = detectSeasonalRateOverlap(existing, candidate);
    expect(conflict).not.toBeNull();
    expect(conflict?.id).toBe('rate-1');
  });

  it('detectSeasonalRateOverlap returns null for non-overlapping rates', () => {
    const existing: SeasonalRate[] = [
      {
        id: 'rate-1', room_type: 'Deluxe',
        start_date: '2025-08-01', end_date: '2025-08-31',
        override_price: 2000, created_at: '',
      },
    ];
    // Rate starts after the existing one ends
    const candidate = {
      room_type: 'Deluxe',
      start_date: '2025-09-01',
      end_date: '2025-09-30',
    };
    expect(detectSeasonalRateOverlap(existing, candidate)).toBeNull();
  });

  it('detectSeasonalRateOverlap ignores rates for different room types', () => {
    const existing: SeasonalRate[] = [
      {
        id: 'rate-1', room_type: 'Standard',
        start_date: '2025-08-01', end_date: '2025-08-31',
        override_price: 1500, created_at: '',
      },
    ];
    const candidate = {
      room_type: 'Deluxe',   // different type
      start_date: '2025-08-10',
      end_date: '2025-08-20',
    };
    expect(detectSeasonalRateOverlap(existing, candidate)).toBeNull();
  });

  it('skips self-comparison when editing an existing rate', () => {
    const existing: SeasonalRate[] = [
      {
        id: 'rate-1', room_type: 'Deluxe',
        start_date: '2025-08-01', end_date: '2025-08-31',
        override_price: 2000, created_at: '',
      },
    ];
    // Same id — editing the rate itself
    const candidate = { id: 'rate-1', room_type: 'Deluxe', start_date: '2025-08-01', end_date: '2025-08-31' };
    expect(detectSeasonalRateOverlap(existing, candidate)).toBeNull();
  });

  it('property: findAllOverlappingPairs detects all conflicts in a random set', () => {
    fc.assert(
      fc.property(fc.array(seasonalRateArb('Suite'), { minLength: 0, maxLength: 8 }), (rates) => {
        const pairs = findAllOverlappingPairs(rates);
        // Verify each reported pair actually overlaps
        for (const [a, b] of pairs) {
          expect(a.room_type).toBe(b.room_type);
          const overlaps = a.start_date <= b.end_date && b.start_date <= a.end_date;
          expect(overlaps).toBe(true);
        }
        // Verify no missed overlapping pair
        for (let i = 0; i < rates.length; i++) {
          for (let j = i + 1; j < rates.length; j++) {
            const a = rates[i]!;
            const b = rates[j]!;
            if (a.room_type === b.room_type &&
                a.start_date <= b.end_date && b.start_date <= a.end_date) {
              const found = pairs.some(
                ([pa, pb]) => (pa.id === a.id && pb.id === b.id) ||
                              (pa.id === b.id && pb.id === a.id)
              );
              expect(found).toBe(true);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ── Price Resolution Unit Tests ───────────────────────────────

describe('Seasonal rate price resolution', () => {
  const rates: SeasonalRate[] = [
    {
      id: 'sr-1', room_type: 'Deluxe',
      start_date: '2025-08-01', end_date: '2025-08-31',
      override_price: 3000, created_at: '',
    },
  ];

  it('applies seasonal rate when date is within range', () => {
    const rate = getApplicableRate('Deluxe', new Date('2025-08-15'), rates, 2000);
    expect(rate).toBe(3000);
  });

  it('uses base price when date is outside all seasonal rates', () => {
    const rate = getApplicableRate('Deluxe', new Date('2025-09-15'), rates, 2000);
    expect(rate).toBe(2000);
  });

  it('calculates total stay price correctly across seasonal boundary', () => {
    // Build dates using local time to match the implementation's setHours(0,0,0,0) logic
    // Nights: Jul 30, Jul 31 (base=2000 each), Aug 1, Aug 2 (seasonal=3000 each)
    const checkIn  = new Date(2025, 6, 30); // month is 0-indexed: 6 = July
    const checkOut = new Date(2025, 7, 3);  // 7 = August
    const { total, nights, breakdown } = calculateStayPrice(
      'Deluxe',
      checkIn,
      checkOut,
      rates,
      2000
    );
    expect(nights).toBe(4);
    expect(breakdown[0]!.date).toBe('2025-07-30');
    expect(breakdown[1]!.date).toBe('2025-07-31');
    expect(breakdown[2]!.date).toBe('2025-08-01');
    expect(breakdown[3]!.date).toBe('2025-08-02');
    expect(total).toBe(2000 + 2000 + 3000 + 3000);
    expect(breakdown).toHaveLength(4);
  });
});
