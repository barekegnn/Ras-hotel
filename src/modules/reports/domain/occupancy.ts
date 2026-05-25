// ============================================================
// Occupancy Rate Calculator
// src/modules/reports/domain/occupancy.ts
//
// Validates: Requirements 25.1, 24.1
// ============================================================

/**
 * Calculates the hotel occupancy rate as a percentage.
 *
 * @param occupiedRooms    Number of rooms currently occupied
 * @param totalActiveRooms Total number of active (non-deactivated) rooms
 * @returns                Percentage rounded to 2 decimal places, or 0 if no active rooms
 *
 * Requirements 25.1, 24.1
 */
export function calculateOccupancyRate(
  occupiedRooms: number,
  totalActiveRooms: number
): number {
  if (totalActiveRooms <= 0) return 0;
  if (occupiedRooms < 0)    return 0;
  if (occupiedRooms > totalActiveRooms) occupiedRooms = totalActiveRooms;
  return Math.round((occupiedRooms / totalActiveRooms) * 100 * 100) / 100;
}

/**
 * Calculates the average occupancy rate across a series of daily rates.
 */
export function calculateAverageOccupancyRate(dailyRates: number[]): number {
  if (dailyRates.length === 0) return 0;
  const sum = dailyRates.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / dailyRates.length) * 100) / 100;
}

/**
 * Calculates average length of stay in nights.
 */
export function calculateAverageLengthOfStay(nights: number[]): number {
  if (nights.length === 0) return 0;
  const sum = nights.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / nights.length) * 100) / 100;
}

/**
 * Returns the top N dates sorted by occupancy rate descending.
 */
export function topBusiestDates(
  dailyData: Array<{ date: string; occupancy_rate: number }>,
  n = 5
): Array<{ date: string; occupancy_rate: number }> {
  return [...dailyData]
    .sort((a, b) => b.occupancy_rate - a.occupancy_rate)
    .slice(0, n);
}
