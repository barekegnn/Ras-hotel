// ============================================================
// Guest Frontend Layout — Real Ras Hotel branding
// src/app/(guest)/layout.tsx
// ============================================================

import type { ReactNode } from 'react';
import Image from 'next/image';
import { HotelAssistant } from '@/components/guest/HotelAssistant';
import { OfflineBanner } from '@/components/shared/OfflineBanner';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase.server';
import { GuestMobileNav } from '@/components/guest/GuestMobileNav';

async function getHotelContact() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from('hotel_configuration')
      .select('key, value')
      .in('key', ['hotel_name', 'hotel_phone', 'hotel_email', 'hotel_address']);
    return Object.fromEntries((data ?? []).map((c) => [c.key, c.value]));
  } catch {
    return {};
  }
}

export default async function GuestLayout({ children }: { children: ReactNode }) {
  const config = await getHotelContact();
  const hotelName    = config.hotel_name    ?? 'Ras Hotel';
  const hotelPhone   = config.hotel_phone   ?? '+251256660027';
  const hotelEmail   = config.hotel_email   ?? 'reservation@hararrashotel.com';
  const hotelAddress = config.hotel_address ?? 'Harar Jugol (Walled City), Harar, Ethiopia';

  return (
    <div className="guest min-h-screen bg-white text-foreground antialiased">

      {/* ── Sticky top nav ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-8 flex items-center justify-between">

          {/* Real hotel logo */}
          <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/Ras hotel pictures/RAS-HOTEL.png"
              alt="Ras Hotel"
              width={120}
              height={44}
              sizes="(max-width: 640px) 90px, 120px"
              className="object-contain h-9 sm:h-10 w-auto"
              priority
            />
          </a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            <a href="/#rooms"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              Rooms
            </a>
            <a href="/#services"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              Services
            </a>
            <a href="/#location"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              Location
            </a>
            <a href="/lookup"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              My booking
            </a>

            <div className="h-5 w-px bg-gray-200 mx-1" />

            <a href="/book"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white
                         hover:bg-amber-600 transition-colors shadow-sm">
              Book now
            </a>

            <a href="/login"
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-400
                         hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-colors
                         inline-flex items-center gap-1.5 ml-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
              Staff
            </a>
          </div>

          {/* Mobile: Book now + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <a href="/book"
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white
                         hover:bg-amber-600 transition-colors shadow-sm">
              Book now
            </a>
            <GuestMobileNav />
          </div>
        </nav>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16 sm:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

            {/* Brand + logo */}
            <div className="lg:col-span-2">
              <div className="mb-5">
                <Image
                  src="/Ras hotel pictures/harar-ras-hotel-logo-footer2.png"
                  alt="Ras Hotel"
                  width={160}
                  height={60}
                  sizes="160px"
                  className="object-contain h-14 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Experience authentic Ethiopian hospitality in the heart of Harar Jugol —
                a UNESCO World Heritage Site and one of Africa&apos;s most sacred cities.
              </p>
              <div className="mt-6 flex gap-3">
                {[
                  { label: 'F', href: '#', title: 'Facebook' },
                  { label: 'I', href: '#', title: 'Instagram' },
                  { label: 'T', href: '#', title: 'Twitter' },
                ].map(({ label, href, title }) => (
                  <a key={title} href={href} title={title}
                    className="h-9 w-9 rounded-lg bg-gray-800 hover:bg-amber-600 flex items-center justify-center
                               text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase">
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact — real data, two phone numbers */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Contact</h4>
              <ul className="space-y-4 text-sm">
                <li>
                  <a href="tel:+251256660027"
                    className="flex items-start gap-3 hover:text-amber-400 transition-colors">
                    <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.79-1.79a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    +251 256 660 027
                  </a>
                </li>
                <li>
                  <a href="tel:+251930179947"
                    className="flex items-start gap-3 hover:text-amber-400 transition-colors">
                    <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.79-1.79a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    +251 930 179 947
                  </a>
                </li>
                <li>
                  <a href="mailto:reservation@hararrashotel.com"
                    className="flex items-start gap-3 hover:text-amber-400 transition-colors">
                    <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    reservation@hararrashotel.com
                  </a>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {hotelAddress}
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  24 hours, 7 days a week
                </li>
              </ul>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Quick links</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { href: '/book',      label: 'Book a room' },
                  { href: '/lookup',    label: 'Find my booking' },
                  { href: '/#rooms',    label: 'Room types' },
                  { href: '/#services', label: 'Services' },
                  { href: '/#location', label: 'Location & map' },
                ].map(({ href, label }) => (
                  <li key={label}>
                    <a href={href}
                      className="text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-2">
                      <svg className="h-3 w-3 text-gray-600" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth={2.5}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      {label}
                    </a>
                  </li>
                ))}
                <li className="pt-2 border-t border-gray-800 mt-2">
                  <a href="/login"
                    className="text-gray-500 hover:text-amber-400 transition-colors flex items-center gap-2 text-xs">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                    </svg>
                    Staff portal
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} {hotelName}. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-5 text-xs text-gray-600">
              <a href="#" className="hover:text-gray-400 transition-colors">Privacy policy</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Terms of service</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Cancellation policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating AI assistant */}
      <HotelAssistant />

      {/* Offline connectivity banner */}
      <OfflineBanner />
    </div>
  );
}


async function getHotelContact() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from('hotel_configuration')
      .select('key, value')
      .in('key', ['hotel_name', 'hotel_phone', 'hotel_email', 'hotel_address']);
    return Object.fromEntries((data ?? []).map((c) => [c.key, c.value]));
  } catch {
    return {};
  }
}

export default async function GuestLayout({ children }: { children: ReactNode }) {
  const config = await getHotelContact();
  const hotelName    = config.hotel_name    ?? 'Ras Hotel';
  const hotelPhone   = config.hotel_phone   ?? '+251256660027';
  const hotelEmail   = config.hotel_email   ?? 'reservation@hararrashotel.com';
  const hotelAddress = config.hotel_address ?? 'Harar Jugol (Walled City), Harar, Ethiopia';

  return (
    <div className="guest min-h-screen bg-white text-foreground antialiased">

      {/* ── Sticky top nav ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm shadow-sm">
        <nav className="mx-auto max-w-7xl px-6 py-3 sm:px-8 flex items-center justify-between">

          {/* Real hotel logo */}
          <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/Ras hotel pictures/RAS-HOTEL.png"
              alt="Ras Hotel"
              width={120}
              height={44}
              className="object-contain h-10 w-auto"
              priority
            />
          </a>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <a href="/#rooms"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors hidden md:block">
              Rooms
            </a>
            <a href="/#services"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors hidden md:block">
              Services
            </a>
            <a href="/#location"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors hidden md:block">
              Location
            </a>
            <a href="/lookup"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              My booking
            </a>

            <div className="h-5 w-px bg-gray-200 mx-1 hidden sm:block" />

            <a href="/book"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white
                         hover:bg-amber-600 transition-colors shadow-sm">
              Book now
            </a>

            <a href="/login"
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-400
                         hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-colors
                         hidden sm:inline-flex items-center gap-1.5 ml-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
              </svg>
              Staff
            </a>
          </div>
        </nav>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">

            {/* Brand + logo */}
            <div className="lg:col-span-2">
              <div className="mb-5">
                <Image
                  src="/Ras hotel pictures/harar-ras-hotel-logo-footer2.png"
                  alt="Ras Hotel"
                  width={160}
                  height={60}
                  className="object-contain h-14 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                Experience authentic Ethiopian hospitality in the heart of Harar Jugol —
                a UNESCO World Heritage Site and one of Africa&apos;s most sacred cities.
              </p>
              <div className="mt-6 flex gap-3">
                {[
                  { label: 'F', href: '#', title: 'Facebook' },
                  { label: 'I', href: '#', title: 'Instagram' },
                  { label: 'T', href: '#', title: 'Twitter' },
                ].map(({ label, href, title }) => (
                  <a key={title} href={href} title={title}
                    className="h-9 w-9 rounded-lg bg-gray-800 hover:bg-amber-600 flex items-center justify-center
                               text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase">
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Contact — real data, two phone numbers */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Contact</h4>
              <ul className="space-y-4 text-sm">
                {/* Phone 1 */}
                <li>
                  <a href="tel:+251256660027"
                    className="flex items-start gap-3 hover:text-amber-400 transition-colors">
                    <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.79-1.79a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    +251 256 660 027
                  </a>
                </li>
                {/* Phone 2 */}
                <li>
                  <a href="tel:+251930179947"
                    className="flex items-start gap-3 hover:text-amber-400 transition-colors">
                    <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.79-1.79a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    +251 930 179 947
                  </a>
                </li>
                <li>
                  <a href="mailto:reservation@hararrashotel.com"
                    className="flex items-start gap-3 hover:text-amber-400 transition-colors">
                    <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    reservation@hararrashotel.com
                  </a>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  {hotelAddress}
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <svg className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  24 hours, 7 days a week
                </li>
              </ul>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-5">Quick links</h4>
              <ul className="space-y-3 text-sm">
                {[
                  { href: '/book',      label: 'Book a room' },
                  { href: '/lookup',    label: 'Find my booking' },
                  { href: '/#rooms',    label: 'Room types' },
                  { href: '/#services', label: 'Services' },
                  { href: '/#location', label: 'Location & map' },
                ].map(({ href, label }) => (
                  <li key={label}>
                    <a href={href}
                      className="text-gray-400 hover:text-amber-400 transition-colors flex items-center gap-2">
                      <svg className="h-3 w-3 text-gray-600" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth={2.5}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                      {label}
                    </a>
                  </li>
                ))}
                <li className="pt-2 border-t border-gray-800 mt-2">
                  <a href="/login"
                    className="text-gray-500 hover:text-amber-400 transition-colors flex items-center gap-2 text-xs">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2}>
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>
                    </svg>
                    Staff portal
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-14 border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} {hotelName}. All rights reserved.
            </p>
            <div className="flex gap-5 text-xs text-gray-600">
              <a href="#" className="hover:text-gray-400 transition-colors">Privacy policy</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Terms of service</a>
              <a href="#" className="hover:text-gray-400 transition-colors">Cancellation policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating AI assistant */}
      <HotelAssistant />

      {/* Offline connectivity banner */}
      <OfflineBanner />
    </div>
  );
}
