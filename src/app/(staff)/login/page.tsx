'use client';

// ============================================================
// Staff Login Page
// src/app/(staff)/login/page.tsx
//
// Username/password login form for Receptionists and Managers.
// Displays remaining attempts and lockout state on failure.
// Requirements 11.1, 11.2, 11.5
// ============================================================

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface LoginError {
  message: string;
  attemptsRemaining?: number;
  locked?: boolean;
  unlocksAt?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';
  const reason = searchParams.get('reason');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const body = await res.json();

      if (!res.ok) {
        const { error: err } = body;
        setError({
          message: err?.message ?? 'Login failed',
          attemptsRemaining: err?.details?.attemptsRemaining,
          locked: err?.details?.locked || err?.code === 'ACCOUNT_LOCKED',
          unlocksAt: err?.details?.unlocksAt,
        });
        return;
      }

      // Redirect: force password change if required
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
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Hotel name */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-4">
            <span className="text-white text-2xl font-bold">R</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Ras Hotel</h1>
          <p className="text-sm text-gray-500 mt-1">Staff portal</p>
        </div>

        {/* Inactive account banner */}
        {reason === 'inactive' && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Your account has been deactivated. Contact your manager.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-sand-200 p-8 space-y-5">

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900
                         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500
                         focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="receptionist01"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900
                         placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500
                         focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-1">
              <p className="font-medium">{error.message}</p>
              {error.attemptsRemaining !== undefined && error.attemptsRemaining > 0 && (
                <p className="text-red-600">
                  {error.attemptsRemaining} attempt{error.attemptsRemaining !== 1 ? 's' : ''} remaining before lockout.
                </p>
              )}
              {error.locked && error.unlocksAt && (
                <p className="text-red-600">
                  Account unlocks at {new Date(error.unlocksAt).toLocaleTimeString()}.
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white
                       hover:bg-brand-600 active:bg-brand-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ras Hotel Management System · Staff access only
        </p>
      </div>
    </div>
  );
}
