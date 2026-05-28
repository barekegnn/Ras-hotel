'use client';

// ============================================================
// Offline Fallback Page
// src/app/offline/page.tsx
//
// Served by the service worker when the user is offline and
// the requested page is not in the cache.
// Requirement 12.3
// ============================================================

import { useEffect } from 'react';

export default function OfflinePage() {
  // Auto-redirect to home when connectivity is restored
  useEffect(() => {
    function handleOnline() {
      window.location.href = '/';
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-orange-100 shadow-xl p-10 text-center">

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
          <svg
            width="40" height="40" viewBox="0 0 24 24" fill="none"
            stroke="#d96428" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
        </div>

        {/* Status badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          No internet connection
        </div>

        <h1 className="mb-3 text-2xl font-bold text-gray-900">You&apos;re offline</h1>
        <p className="mb-8 text-sm leading-relaxed text-gray-500">
          It looks like you&apos;ve lost your internet connection.
          Some pages may still be available from cache — try navigating back,
          or retry once you&apos;re back online.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white
                     hover:bg-brand-600 active:scale-95 transition-all focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          style={{ backgroundColor: '#d96428' }}
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Try again
        </button>

        <p className="mt-6 text-xs text-gray-400">Ras Hotel · Harar, Ethiopia</p>
      </div>
    </div>
  );
}
