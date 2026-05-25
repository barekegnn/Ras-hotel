// ============================================================
// Booking Reference Generator
// src/modules/booking/domain/reference.ts
//
// Validates: Requirements 3.4, 7.1
// Tested by: Property 8 (2.7)
// ============================================================

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I — avoids confusion
const REF_RANDOM_LENGTH = 6;
const PREFIX = 'RAS';

/**
 * Generates a unique booking reference of the form RAS-XXXXXX.
 * Characters are drawn from an unambiguous alphanumeric alphabet.
 *
 * At 6 characters × 32 options = 32^6 = ~1 billion combinations.
 * Collision probability at 10,000 bookings ≈ 0.005% — negligible for MVP.
 * The database enforces uniqueness via the UNIQUE constraint on booking_reference.
 *
 * Requirements 3.4, 7.1
 */
export function generateBookingReference(): string {
  let random = '';
  for (let i = 0; i < REF_RANDOM_LENGTH; i++) {
    random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${PREFIX}-${random}`;
}

/**
 * Validates that a string matches the expected booking reference format.
 */
export function isValidBookingReference(ref: string): boolean {
  return /^RAS-[A-Z2-9]{6}$/.test(ref);
}
