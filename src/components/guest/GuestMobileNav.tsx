'use client';

// ============================================================
// GuestMobileNav — Hamburger menu for mobile guest navigation
// src/components/guest/GuestMobileNav.tsx
// ============================================================

import { useState, useEffect, useRef } from 'react';

const NAV_LINKS = [
  { href: '/#rooms',    label: 'Rooms' },
  { href: '/#services', label: 'Services' },
  { href: '/#location', label: 'Location' },
  { href: '/lookup',    label: 'My booking' },
  { href: '/login',     label: 'Staff portal' },
];

export function GuestMobileNav() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on route change (hash links)
  useEffect(() => {
    if (!open) return;
    function handleHashChange() { setOpen(false); }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [open]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200
                   text-gray-600 hover:bg-gray-100 transition-colors">
        {open ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          id="mobile-nav-menu"
          role="menu"
          className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-200
                     bg-white shadow-xl animate-slide-in-bottom overflow-hidden">
          <nav className="py-2">
            {NAV_LINKS.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700
                           hover:bg-amber-50 hover:text-amber-700 transition-colors">
                {label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
