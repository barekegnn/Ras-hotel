// ============================================================
// Guest Frontend Layout
// src/app/(guest)/layout.tsx
// ============================================================

import type { ReactNode } from 'react';

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="guest min-h-screen bg-white text-foreground antialiased">
      {/* Minimal top nav */}
      <header className="border-b border-gray-100">
        <nav className="mx-auto max-w-7xl px-6 py-4 sm:px-8 flex items-center justify-between">
          <a href="/"
            className="flex items-center gap-3 text-2xl font-bold text-brand-600">
            <span className="h-8 w-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-black">R</span>
            Ras Hotel
          </a>
          <div className="flex items-center gap-6">
            <a href="/book" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Book now
            </a>
            <a href="/lookup" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Find booking
            </a>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main>
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-gray-100 bg-gray-50 mt-16 sm:mt-24">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Ras Hotel</h3>
              <p className="mt-3 text-sm text-gray-600">
                Experience Ethiopian hospitality in the historic walled city of Harar.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Contact</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li><a href="tel:+251XXX" className="hover:text-gray-900">+251 XXX XXX XXX</a></li>
                <li><a href="mailto:info@rashotel.example.com" className="hover:text-gray-900">info@rashotel.example.com</a></li>
                <li>Harar, Ethiopia</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Links</h4>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Privacy policy</a></li>
                <li><a href="#" className="hover:text-gray-900">Terms of service</a></li>
                <li><a href="#" className="hover:text-gray-900">Cancellation policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Ras Hotel. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
