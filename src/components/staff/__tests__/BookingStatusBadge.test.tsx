// ============================================================
// Component Tests — BookingStatusBadge
// src/components/staff/__tests__/BookingStatusBadge.test.tsx
// ============================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BookingStatusBadge } from '../BookingStatusBadge';

describe('BookingStatusBadge', () => {
  it('renders "Unpaid" for reserved_unpaid', () => {
    render(<BookingStatusBadge status="reserved_unpaid" />);
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
  });

  it('renders "Paid" for paid', () => {
    render(<BookingStatusBadge status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('renders "Checked In" for checked_in', () => {
    render(<BookingStatusBadge status="checked_in" />);
    expect(screen.getByText('Checked In')).toBeInTheDocument();
  });

  it('renders "Checked Out" for checked_out', () => {
    render(<BookingStatusBadge status="checked_out" />);
    expect(screen.getByText('Checked Out')).toBeInTheDocument();
  });

  it('renders "No Show" for no_show', () => {
    render(<BookingStatusBadge status="no_show" />);
    expect(screen.getByText('No Show')).toBeInTheDocument();
  });

  it('renders "Cancelled" for cancelled_full_refund', () => {
    render(<BookingStatusBadge status="cancelled_full_refund" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('renders "Cancelled 50%" for cancelled_partial_refund', () => {
    render(<BookingStatusBadge status="cancelled_partial_refund" />);
    expect(screen.getByText('Cancelled 50%')).toBeInTheDocument();
  });

  it('falls back to the raw status string for unknown values', () => {
    render(<BookingStatusBadge status={'unknown_status' as any} />);
    expect(screen.getByText('unknown_status')).toBeInTheDocument();
  });

  // PascalCase aliases (legacy support)
  it('handles PascalCase Checked_In alias', () => {
    render(<BookingStatusBadge status={'Checked_In' as any} />);
    expect(screen.getByText('Checked In')).toBeInTheDocument();
  });

  it('applies the correct CSS class for paid status', () => {
    const { container } = render(<BookingStatusBadge status="paid" />);
    expect(container.firstChild).toHaveClass('badge-paid');
  });

  it('applies the correct CSS class for no_show status', () => {
    const { container } = render(<BookingStatusBadge status="no_show" />);
    expect(container.firstChild).toHaveClass('badge-no-show');
  });

  it('applies badge-unpaid class for reserved_unpaid', () => {
    const { container } = render(<BookingStatusBadge status="reserved_unpaid" />);
    expect(container.firstChild).toHaveClass('badge-unpaid');
  });
});
