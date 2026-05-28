// ============================================================
// Seasonal Rate Overlap Detector & Price Resolver
// src/modules/pricing/domain/seasonalRates.ts
//
// Validates: Requirements 26.6, 26.7
// Tested by: Property 7 (2.10)
// ============================================================

import type { SeasonalRate } from '@/shared/types/domain';

// ── Overlap Detection ─────────────────────────────────────────

/**
 * Returns true if two date ranges overlap (inclusive of boundary dates).
 * Two ranges [a_start, a_end] and [b_start, b_end] overlap when:
 *   a_start <= b_end AND b_start <= a_end
 */
function datesOverlap(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Checks if a candidate seasonal rate conflicts with any existing rate
 * for the same room type.
 *
 * @param existing   Currently active rates in the system
 * @param candidate  The proposed new rate (id may be undefined for new rates)
 * @returns          The first conflicting SeasonalRate, or null if no conflict
 *
 * Requirement 26.7
 */
export function detectSeasonalRateOverlap(
  existing: SeasonalRate[],
  candidate: Pick<SeasonalRate, 'room_type' | 'start_date' | 'end_date'> & { id?: string }
): SeasonalRate | null {
  for (const rate of existing) {
    // Skip self-comparison when editing an existing rate
    if (candidate.id && rate.id === candidate.id) continue;
    // Only compare rates for the same room type
    if (rate.room_type !== candidate.room_type) continue;
    if (datesOverlap(rate.start_date, rate.end_date, candidate.start_date, candidate.end_date)) {
      return rate;
    }
  }
  return null;
}

/**
 * Returns all conflicting seasonal rate pairs within a set of rates.
 * Used for property-based tests and integrity checks.
 */
export function findAllOverlappingPairs(
  rates: SeasonalRate[]
): Array<[SeasonalRate, SeasonalRate]> {
  const conflicts: Array<[SeasonalRate, SeasonalRate]> = [];
  for (let i = 0; i < rates.length; i++) {
    for (let j = i + 1; j < rates.length; j++) {
      const a = rates[i]!;
      const b = rates[j]!;
      if (a.room_type === b.room_type &&
          datesOverlap(a.start_date, a.end_date, b.start_date, b.end_date)) {
        conflicts.push([a, b]);
      }
    }
  }
  return conflicts;
}

// ── Price Resolution ──────────────────────────────────────────

/**
 * Returns a local YYYY-MM-DD string for a Date, avoiding UTC offset issues.
 */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the applicable nightly rate for a room type on a specific date.
 * Applies the seasonal rate if one is active for that date; otherwise uses basePrice.
 *
 * @param roomType   The room type (e.g. "Deluxe")
 * @param date       The specific night date
 * @param rates      All active seasonal rates
 * @param basePrice  The room's base price per night
 * @returns          The effective nightly rate in ETB
 *
 * Requirements 26.5, 26.6
 */
export function getApplicableRate(
  roomType: string,
  date: Date,
  rates: SeasonalRate[],
  basePrice: number
): number {
  const dateStr = toLocalDateString(date);

  const applicable = rates.find(
    (r) =>
      r.room_type === roomType &&
      r.start_date <= dateStr &&
      r.end_date >= dateStr
  );

  return applicable ? applicable.override_price : basePrice;
}

/**
 * Calculates the total price for a stay across multiple nights,
 * applying seasonal rates per night as required.
 *
 * @param roomType    Room type
 * @param checkIn     Check-in date
 * @param checkOut    Check-out date
 * @param rates       Active seasonal rates
 * @param basePrice   Base nightly price
 * @returns           Total stay price and per-night breakdown
 */
export function calculateStayPrice(
  roomType: string,
  checkIn: Date,
  checkOut: Date,
  rates: SeasonalRate[],
  basePrice: number
): { total: number; nights: number; breakdown: Array<{ date: string; rate: number }> } {
  const breakdown: Array<{ date: string; rate: number }> = [];
  let total = 0;
  const current = new Date(checkIn);
  current.setHours(0, 0, 0, 0);
  const end = new Date(checkOut);
  end.setHours(0, 0, 0, 0);

  while (current < end) {
    const rate = getApplicableRate(roomType, current, rates, basePrice);
    breakdown.push({ date: toLocalDateString(current), rate });
    total += rate;
    current.setDate(current.getDate() + 1);
  }

  return { total, nights: breakdown.length, breakdown };
}
