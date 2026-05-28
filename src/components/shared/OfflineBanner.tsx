'use client';

// ============================================================
// Offline Banner
// src/components/shared/OfflineBanner.tsx
//
// Displays a sticky banner when the browser loses connectivity.
// Automatically hides when the connection is restored.
// Requirement 12.3
// ============================================================

import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Initialise from current state
    setIsOffline(!navigator.onLine);

    function handleOffline() {
      setIsOffline(true);
      setWasOffline(true);
    }

    function handleOnline() {
      setIsOffline(false);
      // Show a brief "back online" flash, then clear
      setTimeout(() => setWasOffline(false), 3000);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-0 inset-x-0 z-[9999] flex items-center justify-center gap-2.5
        px-4 py-3 text-sm font-semibold transition-all duration-300
        ${isOffline
          ? 'bg-orange-600 text-white'
          : 'bg-green-600 text-white'
        }`}
    >
      {isOffline ? (
        <>
          {/* Wifi-off icon */}
          <svg
            className="h-4 w-4 flex-shrink-0"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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
          You&apos;re offline — some features may be unavailable
        </>
      ) : (
        <>
          {/* Check icon */}
          <svg
            className="h-4 w-4 flex-shrink-0"
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Back online
        </>
      )}
    </div>
  );
}
