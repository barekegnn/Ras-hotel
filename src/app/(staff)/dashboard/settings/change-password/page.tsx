'use client';

// ============================================================
// Change Password Page
// src/app/(staff)/dashboard/settings/change-password/page.tsx
// Requirements 11.4
// ============================================================

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckIcon, AlertIcon } from '@/components/staff/Icons';

function ChangePasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isFirst      = searchParams.get('first') === '1';

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch('/api/v1/auth/change-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ current_password: current, new_password: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to change password');
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isFirst ? 'Set your password' : 'Change password'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isFirst
            ? 'Your account requires a password change before you can continue.'
            : 'Update your staff account password.'}
        </p>
      </div>

      {isFirst && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3.5 text-sm text-yellow-800 flex items-start gap-3">
          <span className="flex-shrink-0 mt-0.5">🔒</span>
          <p>For security, you must set a new password before accessing the dashboard.</p>
        </div>
      )}

      {success ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
            <CheckIcon className="h-6 w-6 text-white" />
          </div>
          <p className="font-semibold text-green-900">Password changed successfully</p>
          <p className="text-sm text-green-700">Redirecting to dashboard…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">

          {!isFirst && (
            <div>
              <label className="field-label">Current password</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
                required autoComplete="current-password" className="field-input" />
            </div>
          )}

          <div>
            <label className="field-label">New password</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)}
              required autoComplete="new-password" minLength={8}
              placeholder="At least 8 characters"
              className="field-input" />
          </div>

          <div>
            <label className="field-label">Confirm new password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              required autoComplete="new-password"
              className={`field-input ${confirm && confirm !== next ? 'border-red-400' : ''}`} />
            {confirm && confirm !== next && (
              <p className="field-error">Passwords do not match</p>
            )}
          </div>

          {/* Password strength hint */}
          {next && (
            <div className="space-y-1.5">
              {[
                { label: 'At least 8 characters', ok: next.length >= 8 },
                { label: 'Contains a number',     ok: /\d/.test(next) },
                { label: 'Contains a letter',     ok: /[a-zA-Z]/.test(next) },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className={ok ? 'text-green-500' : 'text-gray-300'}>
                    {ok ? '✓' : '○'}
                  </span>
                  <span className={ok ? 'text-green-700' : 'text-gray-400'}>{label}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <AlertIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading || !next || next !== confirm || (!isFirst && !current)}
            className="btn-primary w-full justify-center">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Changing password…
              </span>
            ) : 'Change password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-md h-64 skeleton rounded-xl" />}>
      <ChangePasswordForm />
    </Suspense>
  );
}
