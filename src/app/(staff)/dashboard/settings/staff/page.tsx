'use client';

// ============================================================
// Staff Account Management Page
// src/app/(staff)/dashboard/settings/staff/page.tsx
// Requirements 11.1–11.6
// ============================================================

import { useState, useEffect, useCallback } from 'react';

interface StaffAccount {
  id: string;
  full_name: string;
  username: string;
  role: 'receptionist' | 'manager';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export default function StaffSettingsPage() {
  const [staff,       setStaff]       = useState<StaffAccount[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState<string | null>(null);

  const [fullName,  setFullName]  = useState('');
  const [username,  setUsername]  = useState('');
  const [role,      setRole]      = useState<'receptionist' | 'manager'>('receptionist');
  const [password,  setPassword]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/staff');
      if (!res.ok) throw new Error('Failed to load staff');
      const json = await res.json();
      setStaff(json.data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, username, role, password }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error?.message ?? 'Failed to create account'); return; }
      setShowModal(false);
      setFullName(''); setUsername(''); setRole('receptionist'); setPassword('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/v1/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    await load();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff accounts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage receptionist and manager accounts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          + Add staff
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {staff.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No staff accounts yet</div>
          ) : staff.map((s) => (
            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
                  {s.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.full_name}</p>
                  <p className="text-xs text-gray-500">@{s.username} · {s.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-13 sm:pl-0">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                  ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggleActive(s.id, s.is_active)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline">
                  {s.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add staff account</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required
                  className="field-input w-full" placeholder="e.g. Abebe Girma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} required
                  className="field-input w-full" placeholder="e.g. abebe.girma" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as any)}
                  className="field-input w-full bg-white">
                  <option value="receptionist">Receptionist</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="field-input w-full" placeholder="Min. 8 characters" minLength={8} />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
