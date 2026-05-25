// ============================================================
// Shared Validation Utilities
// src/shared/lib/validation.ts
//
// Validates: Requirements 13.3, 34.7, 31.3, 31.5, 4.9
// ============================================================

import type { CashCollectionEvent } from '@/shared/types/domain';

// ── Ethiopian Phone Number Validator ─────────────────────────

/**
 * Validates Ethiopian phone numbers.
 * Accepted formats: +251XXXXXXXXX or 0XXXXXXXXX
 * Second digit must be 9 or 7 (mobile prefixes in Ethiopia).
 *
 * Requirement 13.3
 */
const ETHIOPIAN_PHONE_REGEX = /^(\+251|0)(9|7)\d{8}$/;

export function validateEthiopianPhone(phone: string): boolean {
  return ETHIOPIAN_PHONE_REGEX.test(phone.trim());
}

/**
 * Normalises an Ethiopian phone number to the +251 format.
 * Returns the original string if it doesn't match.
 */
export function normaliseEthiopianPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith('0') && ETHIOPIAN_PHONE_REGEX.test(trimmed)) {
    return '+251' + trimmed.slice(1);
  }
  return trimmed;
}

// ── Date Range Validator ──────────────────────────────────────

/**
 * Validates that check-out is strictly after check-in.
 * Both dates should be ISO date strings (YYYY-MM-DD).
 *
 * Requirement 34.7
 */
export function validateDateRange(checkIn: Date | string, checkOut: Date | string): boolean {
  const inDate  = checkIn  instanceof Date ? checkIn  : new Date(checkIn);
  const outDate = checkOut instanceof Date ? checkOut : new Date(checkOut);
  return outDate > inDate;
}

/**
 * Validates that check-out time string is strictly before check-in time string.
 * Times are in "HH:MM" format on the same calendar day.
 *
 * Requirement 34.7 — hotel configuration validation
 */
export function validateCheckinCheckoutTimes(
  checkinTime: string,
  checkoutTime: string
): boolean {
  // Checkout must be BEFORE check-in (e.g. 12:00 checkout, 14:00 check-in)
  const [inH, inM]  = checkinTime.split(':').map(Number);
  const [outH, outM] = checkoutTime.split(':').map(Number);
  if (inH === undefined || inM === undefined || outH === undefined || outM === undefined) {
    return false;
  }
  const inMinutes  = inH  * 60 + inM;
  const outMinutes = outH * 60 + outM;
  return outMinutes < inMinutes;
}

// ── Cash Collection Event Validator ──────────────────────────

export interface CashCollectionValidationResult {
  valid:  boolean;
  errors: string[];
}

/**
 * Validates a CashCollectionEvent before persisting.
 * All four fields (bookingId, receptionistId, amount > 0, timestamp) are required.
 *
 * Requirements 31.3, 31.5, 4.9
 */
export function validateCashCollectionEvent(
  event: Partial<Pick<CashCollectionEvent, 'booking_id' | 'receptionist_id' | 'amount_collected' | 'collected_at'>>
): CashCollectionValidationResult {
  const errors: string[] = [];

  if (!event.booking_id || event.booking_id.trim() === '') {
    errors.push('booking_id is required');
  }

  if (!event.receptionist_id || event.receptionist_id.trim() === '') {
    errors.push('receptionist_id is required');
  }

  if (event.amount_collected === undefined || event.amount_collected === null) {
    errors.push('amount_collected is required');
  } else if (typeof event.amount_collected !== 'number' || event.amount_collected <= 0) {
    errors.push('amount_collected must be a positive number');
  }

  if (!event.collected_at) {
    errors.push('collected_at timestamp is required');
  } else {
    const d = new Date(event.collected_at as string);
    if (isNaN(d.getTime())) {
      errors.push('collected_at must be a valid timestamp');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ── Booking Form Validator ────────────────────────────────────

export interface BookingFormErrors {
  guest_name?:        string;
  guest_age?:         string;
  guest_sex?:         string;
  guest_phone?:       string;
  guest_nationality?: string;
  check_in_date?:     string;
  check_out_date?:    string;
}

export function validateBookingForm(data: {
  guest_name:        string;
  guest_age:         number | string;
  guest_sex:         string;
  guest_phone:       string;
  guest_nationality: string;
  check_in_date:     string;
  check_out_date:    string;
}): { valid: boolean; errors: BookingFormErrors } {
  const errors: BookingFormErrors = {};

  if (!data.guest_name.trim()) errors.guest_name = 'Full name is required';

  const age = Number(data.guest_age);
  if (isNaN(age) || age <= 0 || age >= 130) errors.guest_age = 'Valid age is required';

  if (!data.guest_sex) errors.guest_sex = 'Sex is required';

  if (!validateEthiopianPhone(data.guest_phone)) {
    errors.guest_phone = 'Enter a valid Ethiopian phone number (e.g. 0912345678 or +251912345678)';
  }

  if (!data.guest_nationality.trim()) errors.guest_nationality = 'Nationality is required';

  if (!data.check_in_date)  errors.check_in_date  = 'Check-in date is required';
  if (!data.check_out_date) errors.check_out_date = 'Check-out date is required';

  if (data.check_in_date && data.check_out_date) {
    if (!validateDateRange(data.check_in_date, data.check_out_date)) {
      errors.check_out_date = 'Check-out date must be after check-in date';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(data.check_in_date) < today) {
      errors.check_in_date = 'Check-in date cannot be in the past';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
