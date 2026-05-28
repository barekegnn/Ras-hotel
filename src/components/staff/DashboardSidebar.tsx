'use client';

// ============================================================
// DashboardSidebar — Responsive: fixed on desktop, drawer on mobile
// src/components/staff/DashboardSidebar.tsx
// ============================================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNotifications } from '@/shared/hooks/useRoomStatus';
import {
  HomeIcon, BedIcon, CalendarIcon, QrCodeIcon, UsersIcon,
  ChartIcon, SettingsIcon, FileTextIcon, BellIcon, LogoutIcon,
  DoorOpenIcon, AlertIcon,
} from './Icons';

const RECEPTIONIST_NAV = [
  { href: '/dashboard',                  icon: HomeIcon,       label: 'Home' },
  { href: '/dashboard/rooms',            icon: BedIcon,        label: 'Rooms' },
  { href: '/dashboard/arrivals',         icon: DoorOpenIcon,   label: 'Arrivals' },
  { href: '/dashboard/departures',       icon: CalendarIcon,   label: 'Departures' },
  { href: '/dashboard/bookings',         icon: FileTextIcon,   label: 'Bookings' },
  { href: '/dashboard/qr-scan',          icon: QrCodeIcon,     label: 'QR Scan' },
  { href: '/dashboard/guests',           icon: UsersIcon,      label: 'Guests' },
  { href: '/dashboard/shift-notes',      icon: EditIcon,       label: 'Shift Notes' },
  { href: '/dashboard/notifications',    icon: BellIcon,       label: 'Notifications' },
];

const MANAGER_REPORTS_NAV = [
  { href: '/dashboard/reports/revenue',   icon: ChartIcon,     label: 'Revenue' },
  { href: '/dashboard/reports/occupancy', icon: ChartIcon,     label: 'Occupancy' },
  { href: '/dashboard/reports/feedback',  icon: StarIcon,      label: 'Feedback' },
  { href: '/dashboard/reports/audit',     icon: AlertIcon,     label: 'Audit Log' },
];

const MANAGER_SETTINGS_NAV = [
  { href: '/dashboard/settings/hotel',     icon: SettingsIcon,  label: 'Hotel config' },
  { href: '/dashboard/settings/rooms',     icon: BedIcon,       label: 'Rooms' },
  { href: '/dashboard/settings/pricing',   icon: TagIcon,       label: 'Pricing' },
  { href: '/dashboard/settings/staff',     icon: UsersIcon,     label: 'Staff accounts' },
  { href: '/dashboard/settings/documents', icon: FileTextIcon,  label: 'Documents' },
  { href: '/dashboard/settings/refunds',   icon: RefundIcon,    label: 'Refunds' },
];

function EditIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function StarIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function TagIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}

function RefundIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
    </svg>
  );
}

interface Props { role: 'manager' | 'receptionist'; staffName: string; }

/** The actual sidebar content — shared between desktop and mobile drawer */
function SidebarContent({ role, staffName, onNavClick }: Props & { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">

      {/* Hotel brand */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500">
          <span className="text-lg font-bold text-white">R</span>
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900 leading-tight">Ras Hotel</div>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Harar · Staff</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scrollbar-thin">

        {RECEPTIONIST_NAV.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          const isNotifications = href === '/dashboard/notifications';
          return (
            <Link key={href} href={href} onClick={onNavClick}
              className={`nav-item ${active ? 'active' : ''}`}>
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isNotifications && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {role === 'manager' && (
          <>
            <div className="my-3 border-t border-gray-200" />
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Reports
            </div>
            {MANAGER_REPORTS_NAV.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} onClick={onNavClick}
                className={`nav-item ${isActive(href) ? 'active' : ''}`}>
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span>{label}</span>
              </Link>
            ))}

            <div className="my-3 border-t border-gray-200" />
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Settings
            </div>
            {MANAGER_SETTINGS_NAV.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} onClick={onNavClick}
                className={`nav-item ${isActive(href) ? 'active' : ''}`}>
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Staff identity + sign out */}
      <div className="border-t border-gray-200 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-harar-100 text-sm font-semibold text-harar-700">
            {staffName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">{staffName}</div>
            <div className="text-xs font-medium text-gray-400 capitalize">{role}</div>
          </div>
        </div>
        <form action="/api/v1/auth/logout" method="POST">
          <button type="submit"
            className="btn-ghost w-full justify-start text-gray-500 hover:text-red-600 hover:bg-red-50">
            <LogoutIcon className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function DashboardSidebar({ role, staffName }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── Desktop sidebar (md+) ─────────────────────────── */}
      <div className="hidden md:flex h-full flex-shrink-0">
        <SidebarContent role={role} staffName={staffName} />
      </div>

      {/* ── Mobile: hamburger button in top-left ──────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="md:hidden fixed top-3.5 left-4 z-50 flex h-9 w-9 items-center justify-center
                   rounded-lg border border-gray-200 bg-white shadow-sm text-gray-600
                   hover:bg-gray-50 transition-colors">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* ── Mobile drawer overlay ─────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="md:hidden fixed inset-y-0 left-0 z-50 flex animate-slide-in">
            <SidebarContent
              role={role}
              staffName={staffName}
              onNavClick={() => setMobileOpen(false)}
            />
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-[-44px] flex h-9 w-9 items-center justify-center
                         rounded-r-lg bg-white border border-l-0 border-gray-200 text-gray-500
                         hover:text-gray-700 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </>
  );
}
