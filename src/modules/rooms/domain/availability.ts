// ============================================================
// Room Availability Checker
// src/modules/rooms/domain/availability.ts
//
// Checks whether a room is free for a given date range.
// Property 2: No Overlapping Confirmed Bookings — Req 28.1, 28.2
// ============================================================

import { createSupabaseServerClient } from '@/modules/auth/infrastructure/supabase';

// Statuses that block availability (active bookings)
const BLOCKING_STATUSES = [
  'Reserved_Unpaid',
  'Paid',
  'Checked_In',
];

/**
 * Returns true if the room is available for the entire [checkIn, checkOut) range.
 *
 * Cancelled and no-show bookings do NOT block availability.
 * An existing booking with excludeBookingId is ignored (for modification flows).
 *
 * Date overlap condition: existing.check_in < checkOut AND existing.check_out > checkIn
 * (strict — check-out of one booking on same day as check-in of next is fine)
 *
 * Requirements 3.1, 28.1
 */
export async function checkRoomAvailability(
  roomId: string,
  checkIn: string,    // YYYY-MM-DD
  checkOut: string,   // YYYY-MM-DD
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .in('booking_status', BLOCKING_STATUSES)
    // Overlap: existing starts before our checkout AND existing ends after our checkin
    .lt('check_in_date', checkOut)
    .gt('check_out_date', checkIn);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { count, error } = await query;
  if (error) throw new Error(`checkRoomAvailability: ${error.message}`);
  return count === 0;
}

/**
 * Returns the first conflicting booking for a room in a given date range.
 * Used to surface conflict details to the staff member (Req 28.2).
 */
export async function getConflictingBooking(
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from('bookings')
    .select('id, booking_reference, guest_name, check_in_date, check_out_date, booking_status')
    .eq('room_id', roomId)
    .in('booking_status', BLOCKING_STATUSES)
    .lt('check_in_date', checkOut)
    .gt('check_out_date', checkIn)
    .limit(1);

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getConflictingBooking: ${error.message}`);
  return data?.[0] ?? null;
}

/**
 * Pure function version of overlap check — operates on in-memory booking arrays.
 * Used for property-based tests and local validation (Property 2).
 *
 * Requirement 28.1
 */
export function hasOverlap(
  existingCheckIn: string,
  existingCheckOut: string,
  newCheckIn: string,
  newCheckOut: string
): boolean {
  return existingCheckIn < newCheckOut && existingCheckOut > newCheckIn;
}

/**
 * Pure function: finds all overlapping confirmed booking pairs in a list.
 * "Confirmed" means status is in BLOCKING_STATUSES.
 * Used for the nightly integrity check. Requirement 28.4
 */
export function findOverlappingBookingPairs(
  bookings: Array<{
    id: string;
    room_id: string;
    check_in_date: string;
    check_out_date: string;
    booking_status: string;
  }>
): Array<[typeof bookings[0], typeof bookings[0]]> {
  const active = bookings.filter((b) => BLOCKING_STATUSES.includes(b.booking_status));
  const conflicts: Array<[typeof bookings[0], typeof bookings[0]]> = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;
      if (a.room_id === b.room_id && hasOverlap(a.check_in_date, a.check_out_date, b.check_in_date, b.check_out_date)) {
        conflicts.push([a, b]);
      }
    }
  }
  return conflicts;
}
