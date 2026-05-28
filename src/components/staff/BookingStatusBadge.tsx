// ============================================================
// BookingStatusBadge
// src/components/staff/BookingStatusBadge.tsx
// ============================================================

import type { BookingStatus } from '@/shared/types/domain';

const CONFIG: Record<string, { label: string; className: string }> = {
  // snake_case (canonical DB values)
  reserved_unpaid:          { label: 'Unpaid',       className: 'badge-unpaid' },
  paid:                     { label: 'Paid',          className: 'badge-paid' },
  checked_in:               { label: 'Checked In',    className: 'badge-checked-in' },
  checked_out:              { label: 'Checked Out',   className: 'badge-cancelled' },
  cancelled_full_refund:    { label: 'Cancelled',     className: 'badge-cancelled' },
  cancelled_partial_refund: { label: 'Cancelled 50%', className: 'badge-cancelled' },
  cancelled_no_refund:      { label: 'Cancelled',     className: 'badge-cancelled' },
  no_show:                  { label: 'No Show',       className: 'badge-no-show' },
  // PascalCase aliases (legacy — some pages still use these)
  Reserved_Unpaid:          { label: 'Unpaid',       className: 'badge-unpaid' },
  Paid:                     { label: 'Paid',          className: 'badge-paid' },
  Checked_In:               { label: 'Checked In',    className: 'badge-checked-in' },
  Checked_Out:              { label: 'Checked Out',   className: 'badge-cancelled' },
  Cancelled_Full_Refund:    { label: 'Cancelled',     className: 'badge-cancelled' },
  Cancelled_Partial_Refund: { label: 'Cancelled 50%', className: 'badge-cancelled' },
  Cancelled_No_Refund:      { label: 'Cancelled',     className: 'badge-cancelled' },
  No_Show:                  { label: 'No Show',       className: 'badge-no-show' },
};

export function BookingStatusBadge({ status }: { status: BookingStatus | string }) {
  const cfg = CONFIG[status] ?? { label: status, className: 'badge-cancelled' };
  return <span className={cfg.className}>{cfg.label}</span>;
}
