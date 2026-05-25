'use client';

// ============================================================
// Dashboard Home — Receptionist operational snapshot
// src/app/(staff)/dashboard/page.tsx
// Requirements 33.1–33.7
// ============================================================

import { useDashboardCounts, useShiftNotes, useNotifications } from '@/shared/hooks/useRoomStatus';
import { BookingStatusBadge } from '@/components/staff/BookingStatusBadge';
import {
  QrCodeIcon, PlusIcon, DoorOpenIcon, BellIcon, ClockIcon,
  AlertIcon, PhoneIcon, ChevronRightIcon,
} from '@/components/staff/Icons';
import Link from 'next/link';

// ── KPI card ─────────────────────────────────────────────────

function KpiCard({
  label, value, sub, href, accent = false, urgent = false, loading = false,
}: {
  label: string; value: number | string; sub?: string;
  href?: string; accent?: boolean; urgent?: boolean; loading?: boolean;
}) {
  const content = (
    <div className={`
      stat-card group transition-all duration-150
      ${href ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
      ${urgent && (value as number) > 0 ? 'border-red-300 bg-red-50' : ''}
    `}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      {loading ? (
        <div className="mt-3 h-8 w-16 skeleton rounded" />
      ) : (
        <div className={`mt-2 text-4xl font-bold tabular-nums leading-none
          ${urgent && (value as number) > 0 ? 'text-red-700' : accent ? 'text-brand-600' : 'text-gray-900'}`}>
          {value}
        </div>
      )}
      {sub && <div className="mt-2 text-xs text-gray-500">{sub}</div>}
      {href && (
        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
          View all <ChevronRightIcon className="h-3 w-3" />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── Quick action ──────────────────────────────────────────────

function QuickAction({ href, icon: Icon, label, sublabel, primary = false }: {
  href: string; icon: React.FC<{ className?: string }>;
  label: string; sublabel: string; primary?: boolean;
}) {
  return (
    <Link href={href}
      className={`
        flex items-center gap-4 rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5
        ${primary ? 'border-brand-200 bg-brand-50 hover:bg-brand-100' : 'border-gray-200 bg-white hover:bg-gray-50'}
      `}>
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl
        ${primary ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className={`text-sm font-semibold ${primary ? 'text-brand-800' : 'text-gray-900'}`}>{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{sublabel}</div>
      </div>
      <ChevronRightIcon className="ml-auto h-4 w-4 text-gray-400 flex-shrink-0" />
    </Link>
  );
}

// ── Shift note preview ────────────────────────────────────────

function ShiftNotePreview({ note }: { note: { note_text: string; is_urgent: boolean; created_at: string; author_id: string } }) {
  const time = new Date(note.created_at).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(note.created_at).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' });
  return (
    <div className={`rounded-lg border p-4 text-sm
      ${note.is_urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`flex-1 leading-relaxed ${note.is_urgent ? 'text-red-900' : 'text-gray-800'}`}>
          {note.note_text}
        </p>
        {note.is_urgent && (
          <span className="badge-urgent flex-shrink-0">Urgent</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
        <ClockIcon className="h-3 w-3" />
        {date} at {time}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const counts    = useDashboardCounts();
  const shiftNotes = useShiftNotes();
  const { notifications, unreadCount } = useNotifications();

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-ET', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="max-w-7xl space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{dateStr}</p>
        </div>
        {unreadCount > 0 && (
          <Link href="/dashboard/notifications"
            className="flex items-center gap-2 rounded-lg bg-brand-50 border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors">
            <BellIcon className="h-4 w-4" />
            {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
          </Link>
        )}
      </div>

      {/* KPI row — Req 33.2 */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label="Arrivals today"    value={counts.arrivals}    href="/dashboard/arrivals"    accent loading={counts.loading} sub="Expected check-ins" />
        <KpiCard label="Departures today"  value={counts.departures}  href="/dashboard/departures"  loading={counts.loading} sub="Expected check-outs" />
        <KpiCard label="Available rooms"   value={counts.available}   href="/dashboard/rooms"       loading={counts.loading} sub="Ready for guests" />
        <KpiCard label="Awaiting payment"  value={counts.outstanding} href="/dashboard/bookings?status=Reserved_Unpaid" loading={counts.loading} sub="Cash pending" />
        <KpiCard
          label="Overdue arrivals"
          value={counts.overdue}
          href="/dashboard/arrivals?overdue=1"
          urgent
          loading={counts.loading}
          sub={counts.overdue > 0 ? 'Past 18:00 — action needed' : 'None past 18:00'}
        />
      </div>

      {/* Body: quick actions + shift notes + recent notifications */}
      <div className="grid grid-cols-3 gap-6">

        {/* Quick actions — Req 33.6 */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Quick actions</h2>
          <QuickAction
            href="/dashboard/bookings/new"
            icon={PlusIcon}
            label="New manual booking"
            sublabel="Walk-in guest registration"
            primary
          />
          <QuickAction
            href="/dashboard/qr-scan"
            icon={QrCodeIcon}
            label="Scan QR code"
            sublabel="Camera-based guest check-in"
          />
          <QuickAction
            href="/dashboard/arrivals"
            icon={DoorOpenIcon}
            label="Today's arrivals"
            sublabel={counts.loading ? '…' : `${counts.arrivals} guest${counts.arrivals !== 1 ? 's' : ''} expected`}
          />
          {counts.outstanding > 0 && (
            <Link href="/dashboard/bookings?status=Reserved_Unpaid"
              className="flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-4 hover:bg-yellow-100 transition-colors">
              <AlertIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-yellow-900">
                  {counts.outstanding} unpaid booking{counts.outstanding !== 1 ? 's' : ''}
                </div>
                <div className="text-xs text-yellow-700">Collect payment at reception</div>
              </div>
            </Link>
          )}
        </div>

        {/* Shift notes — Req 33.3, 23.3 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Shift handover</h2>
            <Link href="/dashboard/shift-notes"
              className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Write note →
            </Link>
          </div>
          {shiftNotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
              No shift notes yet today
            </div>
          ) : (
            <div className="space-y-3">
              {shiftNotes.slice(0, 3).map((note, i) => (
                <ShiftNotePreview key={i} note={note as any} />
              ))}
            </div>
          )}
        </div>

        {/* Recent notifications — Req 33.4 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </h2>
            <Link href="/dashboard/notifications"
              className="text-xs font-medium text-brand-600 hover:text-brand-700">
              All →
            </Link>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
              No recent alerts
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 6).map((n) => {
                const payload = n.payload as Record<string, string>;
                return (
                  <div key={n.id}
                    className={`rounded-lg border p-3.5 text-sm transition-colors
                      ${n.is_read ? 'border-gray-200 bg-white' : 'border-brand-200 bg-brand-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium leading-snug ${n.is_read ? 'text-gray-700' : 'text-brand-900'}`}>
                          {payload.guest_name ?? 'System alert'}
                        </p>
                        {payload.booking_reference && (
                          <p className="font-mono-data mt-0.5 text-xs text-gray-500">{payload.booking_reference}</p>
                        )}
                      </div>
                      {!n.is_read && (
                        <span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-500 mt-1" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
