// @vitest-environment node
// ============================================================
// Unit & Property Tests — Shared Validation Utilities
// src/shared/lib/__tests__/validation.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateEthiopianPhone,
  normaliseEthiopianPhone,
  validateDateRange,
  validateCheckinCheckoutTimes,
  validateBookingForm,
} from '../validation';

// ── Ethiopian Phone Validation ────────────────────────────────

describe('validateEthiopianPhone', () => {
  it('accepts +251 format with 9 prefix', () => {
    expect(validateEthiopianPhone('+251912345678')).toBe(true);
  });
  it('accepts +251 format with 7 prefix', () => {
    expect(validateEthiopianPhone('+251712345678')).toBe(true);
  });
  it('accepts 0 format with 9 prefix', () => {
    expect(validateEthiopianPhone('0912345678')).toBe(true);
  });
  it('accepts 0 format with 7 prefix', () => {
    expect(validateEthiopianPhone('0712345678')).toBe(true);
  });
  it('rejects numbers with wrong prefix digit', () => {
    expect(validateEthiopianPhone('+251812345678')).toBe(false);
    expect(validateEthiopianPhone('0812345678')).toBe(false);
  });
  it('rejects too-short numbers', () => {
    expect(validateEthiopianPhone('+25191234567')).toBe(false);
    expect(validateEthiopianPhone('091234567')).toBe(false);
  });
  it('rejects too-long numbers', () => {
    expect(validateEthiopianPhone('+2519123456789')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(validateEthiopianPhone('')).toBe(false);
  });
  it('rejects non-numeric characters', () => {
    expect(validateEthiopianPhone('+251912abc678')).toBe(false);
  });
  it('trims whitespace before validating', () => {
    expect(validateEthiopianPhone('  0912345678  ')).toBe(true);
  });

  it('property: all valid +251 9x numbers pass', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9]{8}$/), (suffix) => {
        expect(validateEthiopianPhone(`+2519${suffix}`)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

describe('normaliseEthiopianPhone', () => {
  it('converts 0-prefix to +251', () => {
    expect(normaliseEthiopianPhone('0912345678')).toBe('+251912345678');
  });
  it('leaves +251 format unchanged', () => {
    expect(normaliseEthiopianPhone('+251912345678')).toBe('+251912345678');
  });
  it('returns original string for invalid numbers', () => {
    expect(normaliseEthiopianPhone('invalid')).toBe('invalid');
  });
});

// ── Date Range Validation ─────────────────────────────────────

describe('validateDateRange', () => {
  it('returns true when checkout is after checkin', () => {
    expect(validateDateRange('2025-10-01', '2025-10-05')).toBe(true);
  });
  it('returns false when checkout equals checkin', () => {
    expect(validateDateRange('2025-10-01', '2025-10-01')).toBe(false);
  });
  it('returns false when checkout is before checkin', () => {
    expect(validateDateRange('2025-10-05', '2025-10-01')).toBe(false);
  });
  it('accepts Date objects', () => {
    expect(validateDateRange(new Date('2025-10-01'), new Date('2025-10-02'))).toBe(true);
  });

  it('property: checkout always after checkin → true', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-01') }),
        fc.integer({ min: 1, max: 30 }),
        (checkIn, nights) => {
          const checkOut = new Date(checkIn.getTime() + nights * 86400000);
          expect(validateDateRange(checkIn, checkOut)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('validateCheckinCheckoutTimes', () => {
  it('returns true when checkout time is before checkin time', () => {
    expect(validateCheckinCheckoutTimes('14:00', '12:00')).toBe(true);
  });
  it('returns false when checkout time is after checkin time', () => {
    expect(validateCheckinCheckoutTimes('12:00', '14:00')).toBe(false);
  });
  it('returns false when times are equal', () => {
    expect(validateCheckinCheckoutTimes('12:00', '12:00')).toBe(false);
  });
  it('returns false for malformed time strings', () => {
    expect(validateCheckinCheckoutTimes('bad', '12:00')).toBe(false);
  });
});

// ── Booking Form Validation ───────────────────────────────────

describe('validateBookingForm', () => {
  const validBase = {
    guest_name:        'Abebe Bikila',
    guest_age:         35,
    guest_sex:         'male',
    guest_phone:       '0912345678',
    guest_nationality: 'Ethiopian',
    check_in_date:     '2099-12-01',
    check_out_date:    '2099-12-05',
  };

  it('accepts a fully valid form', () => {
    const result = validateBookingForm(validBase);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('rejects empty guest name', () => {
    const result = validateBookingForm({ ...validBase, guest_name: '   ' });
    expect(result.valid).toBe(false);
    expect(result.errors.guest_name).toBeDefined();
  });

  it('rejects age 0', () => {
    const result = validateBookingForm({ ...validBase, guest_age: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.guest_age).toBeDefined();
  });

  it('rejects age 130+', () => {
    const result = validateBookingForm({ ...validBase, guest_age: 130 });
    expect(result.valid).toBe(false);
    expect(result.errors.guest_age).toBeDefined();
  });

  it('rejects invalid phone', () => {
    const result = validateBookingForm({ ...validBase, guest_phone: '12345' });
    expect(result.valid).toBe(false);
    expect(result.errors.guest_phone).toBeDefined();
  });

  it('rejects checkout before checkin', () => {
    const result = validateBookingForm({
      ...validBase,
      check_in_date:  '2099-12-10',
      check_out_date: '2099-12-05',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.check_out_date).toBeDefined();
  });

  it('rejects checkin in the past', () => {
    const result = validateBookingForm({
      ...validBase,
      check_in_date:  '2020-01-01',
      check_out_date: '2020-01-05',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.check_in_date).toBeDefined();
  });

  it('rejects missing nationality', () => {
    const result = validateBookingForm({ ...validBase, guest_nationality: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.guest_nationality).toBeDefined();
  });

  it('property: valid forms always pass', () => {
    fc.assert(
      fc.property(
        fc.record({
          guest_name:        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          guest_age:         fc.integer({ min: 1, max: 129 }),
          guest_sex:         fc.constantFrom('male', 'female'),
          guest_phone:       fc.constantFrom('0912345678', '+251912345678', '0712345678'),
          guest_nationality: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
        }),
        (fields) => {
          const result = validateBookingForm({
            ...fields,
            check_in_date:  '2099-12-01',
            check_out_date: '2099-12-10',
          });
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
