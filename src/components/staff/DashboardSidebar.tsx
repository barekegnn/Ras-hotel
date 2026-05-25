'use client';

// ============================================================
// DashboardSidebar
// src/components/staff/DashboardSidebar.tsx
// ============================================================

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

const MANAGER_ONLY_NAV = [
  { href: '/dashboard/reports/revenue',  icon: ChartIcon,      label: 'Revenue' },
  { href: '/dashboard/reports/occupancy',icon: ChartIcon,      label: 'Occupancy' },
  { href: '/dashboard/reports/audit',    icon: AlertIcon,      label: 'Audit Log' },
  { href: '/dashboard/settings/hotel',   icon: SettingsIcon,   label: 'Settings' },
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

interface Props { role: 'manager' | 'receptionist'; staffName: string; }

export function DashboardSidebar({ role, staffName }: Props) {
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

        {/* Main nav */}
        {RECEPTIONIST_NAV.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          const isNotifications = href === '/dashboard/notifications';
          return (
            <Link key={href} href={href}
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

        {/* Manager-only section */}
        {role === 'manager' && (
          <>
            <div className="my-3 border-t border-gray-200" />
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Manager
            </div>
            {MANAGER_ONLY_NAV.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
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
