// ============================================================
// BookingStatusBadge
// src/components/staff/BookingStatusBadge.tsx
// ============================================================

import type { BookingStatus } from '@/shared/types/domain';

const CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  Reserved_Unpaid:         { label: 'Unpaid',       className: 'badge-unpaid' },
  Paid:                    { label: 'Paid',          className: 'badge-paid' },
  Checked_In:              { label: 'Checked In',    className: 'badge-checked-in' },
  Checked_Out:             { label: 'Checked Out',   className: 'badge-cancelled' },
  Cancelled_Full_Refund:   { label: 'Cancelled',     className: 'badge-cancelled' },
  Cancelled_Partial_Refund:{ label: 'Cancelled 50%', className: 'badge-cancelled' },
  Cancelled_No_Refund:     { label: 'Cancelled',     className: 'badge-cancelled' },
  No_Show:                 { label: 'No Show',       className: 'badge-no-show' },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, className } = CONFIG[status] ?? { label: status, className: 'badge-cancelled' };
  return <span className={className}>{label}</span>;
}
