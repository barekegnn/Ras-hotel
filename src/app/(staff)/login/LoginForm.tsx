'use client';

// ============================================================
// Staff Login Form
// src/app/(staff)/login/LoginForm.tsx
//
// Username/password login for Receptionists and Managers.
// Requirements 11.1, 11.2, 11.5
// ============================================================

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LoginError {
  message:            string;
  attemptsRemaining?: number;
  locked?:            boolean;
  unlocksAt?:         string;
}

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get('redirect') ?? '/dashboard';
  const reason       = searchParams.get('reason');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<LoginError | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res  = await fetch('/api/v1/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username.trim(), password }),
      });
      const body = await res.json();
      if (!res.ok) {
        const { error: err } = body;
        setError({
          message:           err?.message ?? 'Login failed',
          attemptsRemaining: err?.details?.attemptsRemaining,
          locked:            err?.details?.locked || err?.code === 'ACCOUNT_LOCKED',
          unlocksAt:         err?.details?.unlocksAt,
        });
        return;
      }
      if (body.data?.mustChangePassword) {
        router.push('/dashboard/settings/change-password?first=1');
      } else {
        router.push(redirectTo);
      }
      router.refresh();
    } catch {
      setError({ message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-brand-700 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white text-xl font-black">R</span>
          </div>
          <span className="text-white text-xl font-bold">Ras Hotel</span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Welcome back to<br />the staff portal
            </h1>
            <p className="mt-4 text-brand-100 text-lg leading-relaxed">
              Manage bookings, check-ins, and operations for Ras Hotel — Harar&apos;s premier hospitality destination.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '🏨', label: 'Room management' },
              { icon: '📋', label: 'Booking control' },
              { icon: '📊', label: 'Revenue reports' },
              { icon: '🔔', label: 'Real-time alerts' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-brand-200 text-sm">
          © {new Date().getFullYear()} Ras Hotel · Harar, Ethiopia
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-4">
              <span className="text-white text-2xl font-black">R</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Ras Hotel</h1>
            <p className="text-sm text-gray-500 mt-1">Staff portal</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
            <p className="text-sm text-gray-500 mt-1">Enter your staff credentials to continue</p>
          </div>

          {/* Banners */}
          {reason === 'inactive' && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm text-red-700 flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <p>Your account has been deactivated. Contact your manager.</p>
            </div>
          )}
          {reason === 'session' && (
            <div className="mb-5 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3.5 text-sm text-yellow-800 flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5">🔒</span>
              <p>Your session has expired. Please sign in again.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <input
                  id="username" type="text" autoComplete="username" autoCapitalize="off" required
                  value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading}
                  placeholder="receptionist01"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm
                             text-gray-900 placeholder:text-gray-400
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  id="password" type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-12 py-3 text-sm
                             text-gray-900 placeholder:text-gray-400
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPwd ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3.5 text-sm text-red-700 space-y-1">
                <p className="font-semibold">{error.message}</p>
                {error.attemptsRemaining !== undefined && error.attemptsRemaining > 0 && (
                  <p className="text-red-600 text-xs">
                    {error.attemptsRemaining} attempt{error.attemptsRemaining !== 1 ? 's' : ''} remaining before lockout.
                  </p>
                )}
                {error.locked && error.unlocksAt && (
                  <p className="text-red-600 text-xs">
                    Account unlocks at {new Date(error.unlocksAt).toLocaleTimeString()}.
                  </p>
                )}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading || !username || !password}
              className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white
                         hover:bg-brand-600 active:bg-brand-700 transition-all shadow-sm hover:shadow-md
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to guest site
            </Link>
          </div>

          <p className="text-center text-xs text-gray-300 mt-6">
            Ras Hotel Management System · Staff access only
          </p>
        </div>
      </div>
    </div>
  );
}
