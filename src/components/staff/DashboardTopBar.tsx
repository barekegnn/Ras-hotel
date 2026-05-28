'use client';

// ============================================================
// DashboardTopBar
// src/components/staff/DashboardTopBar.tsx
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/shared/hooks/useRoomStatus';
import { SearchIcon, BellIcon, PlusIcon } from './Icons';

interface Props { staffName: string; role: string; }

export function DashboardTopBar({ role }: Props) {
  const [search, setSearch] = useState('');
  const { unreadCount } = useNotifications();
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/dashboard/bookings?q=${encodeURIComponent(search.trim())}`);
    }
  }

  return (
    <header className="flex h-14 sm:h-16 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">

      {/* Spacer for mobile hamburger button (shown on mobile only) */}
      <div className="w-9 flex-shrink-0 md:hidden" aria-hidden="true" />

      {/* Global quick-search */}
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bookings, guests, or reference…"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4
                     text-sm text-gray-900 placeholder:text-gray-400
                     focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20
                     transition-all"
        />
      </form>

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">

        {/* New booking shortcut */}
        <a href="/dashboard/bookings/new" className="btn-primary hidden sm:inline-flex">
          <PlusIcon className="h-4 w-4" />
          New booking
        </a>

        {/* Notifications */}
        <a href="/dashboard/notifications"
          className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center
                             rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </a>

      </div>
    </header>
  );
}
