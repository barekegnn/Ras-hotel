// @vitest-environment node
// ============================================================
// Unit & Property Tests — Occupancy Rate Calculator
// src/modules/reports/domain/__tests__/occupancy.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateOccupancyRate,
  calculateAverageOccupancyRate,
  calculateAverageLengthOfStay,
  topBusiestDates,
} from '../occupancy';

describe('calculateOccupancyRate', () => {
  it('returns 0 when there are no active rooms', () => {
    expect(calculateOccupancyRate(0, 0)).toBe(0);
    expect(calculateOccupancyRate(5, 0)).toBe(0);
  });

  it('returns 0 when occupied rooms is negative', () => {
    expect(calculateOccupancyRate(-1, 10)).toBe(0);
  });

  it('returns 100 when all rooms are occupied', () => {
    expect(calculateOccupancyRate(10, 10)).toBe(100);
  });

  it('returns 50 for half occupancy', () => {
    expect(calculateOccupancyRate(5, 10)).toBe(50);
  });

  it('caps at 100 when occupied > total', () => {
    expect(calculateOccupancyRate(15, 10)).toBe(100);
  });

  it('rounds to 2 decimal places', () => {
    // 1/3 = 33.33...%
    expect(calculateOccupancyRate(1, 3)).toBe(33.33);
  });

  it('property: result is always between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 1, max: 500 }),
        (occupied, total) => {
          const rate = calculateOccupancyRate(occupied, total);
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('calculateAverageOccupancyRate', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverageOccupancyRate([])).toBe(0);
  });

  it('returns the single value for a one-element array', () => {
    expect(calculateAverageOccupancyRate([75])).toBe(75);
  });

  it('calculates average correctly', () => {
    expect(calculateAverageOccupancyRate([50, 100, 75])).toBe(75);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateAverageOccupancyRate([100, 0, 0])).toBe(33.33);
  });
});

describe('calculateAverageLengthOfStay', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverageLengthOfStay([])).toBe(0);
  });

  it('returns correct average', () => {
    expect(calculateAverageLengthOfStay([2, 4, 6])).toBe(4);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateAverageLengthOfStay([1, 1, 2])).toBe(1.33);
  });
});

describe('topBusiestDates', () => {
  const data = [
    { date: '2025-08-01', occupancy_rate: 60 },
    { date: '2025-08-02', occupancy_rate: 95 },
    { date: '2025-08-03', occupancy_rate: 40 },
    { date: '2025-08-04', occupancy_rate: 80 },
    { date: '2025-08-05', occupancy_rate: 100 },
    { date: '2025-08-06', occupancy_rate: 70 },
  ];

  it('returns top 5 by default', () => {
    const result = topBusiestDates(data);
    expect(result).toHaveLength(5);
    expect(result[0]!.occupancy_rate).toBe(100);
    expect(result[1]!.occupancy_rate).toBe(95);
  });

  it('returns top N when specified', () => {
    const result = topBusiestDates(data, 3);
    expect(result).toHaveLength(3);
    expect(result[0]!.date).toBe('2025-08-05');
  });

  it('does not mutate the original array', () => {
    const original = [...data];
    topBusiestDates(data, 3);
    expect(data).toEqual(original);
  });

  it('returns empty array for empty input', () => {
    expect(topBusiestDates([])).toHaveLength(0);
  });
});
