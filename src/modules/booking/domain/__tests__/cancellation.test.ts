// @vitest-environment node
// ============================================================
// Unit Tests — Cancellation Domain (describeRefundTier)
// src/modules/booking/domain/__tests__/cancellation.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import { describeRefundTier } from '../cancellation';

describe('describeRefundTier', () => {
  it('returns full refund amount for "full" tier', () => {
    const result = describeRefundTier('full', 1000);
    expect(result.label).toBe('Full Refund');
    expect(result.refundAmount).toBe(1000);
  });

  it('returns 50% of amount for "partial" tier', () => {
    const result = describeRefundTier('partial', 1000);
    expect(result.label).toBe('50% Partial Refund');
    expect(result.refundAmount).toBe(500);
  });

  it('returns 0 for "none" tier', () => {
    const result = describeRefundTier('none', 1000);
    expect(result.label).toBe('No Refund');
    expect(result.refundAmount).toBe(0);
  });

  it('handles zero total amount', () => {
    expect(describeRefundTier('full', 0).refundAmount).toBe(0);
    expect(describeRefundTier('partial', 0).refundAmount).toBe(0);
    expect(describeRefundTier('none', 0).refundAmount).toBe(0);
  });

  it('partial refund is exactly half of total', () => {
    const total = 750;
    const result = describeRefundTier('partial', total);
    expect(result.refundAmount).toBe(total * 0.5);
  });
});
