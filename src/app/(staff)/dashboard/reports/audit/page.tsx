'use client';

// ============================================================
// Audit Log Page
// src/app/(staff)/dashboard/reports/audit/page.tsx
// Manager-only. Requirements 37.1–37.6
// ============================================================

import { useState, useEffect, useCallback } from 'react';

interface AuditEntry {
  id:          string;
  action_at:   string;
  actor:       string;
  action_type: string;
  entity_type: string;
  entity_id:   string;
  description: string;
}

const ACTION_COLORS: Record<string, string> = {
  booking_created:          'bg-blue-100 text-blue-800',
  booking_modified:         'bg-yellow-100 text-yellow-800',
  booking_cancelled:        'bg-red-100 text-red-800',
  check_in:                 'bg-green-100 text-green-800',
  check_out:                'bg-gray-100 text-gray-700',
  cash_collection_event:    'bg-emerald-100 text-emerald-800',
  payment_verification:     'bg-purple-100 text-purple-800',
  no_show_marked:           'bg-orange-100 text-orange-800',
  staff_account_created:    'bg-harar-100 text-harar-800',
  staff_account_modified:   'bg-harar-100 text-harar-800',
  staff_account_deactivated:'bg-red-100 text-red-800',
  password_reset:           'bg-yellow-100 text-yellow-800',
  invalid_transition_attempt:'bg-red-100 text-red-800',
};
const DEFAULT_COLOR = 'bg-gray-100 text-gray-700';

export default function AuditLogPage() {
  const [entries,  setEntries]  = useState<AuditEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(false);
  const [filter,   setFilter]   = useState('');

  const load = useCallback(async (pageNum = 1, reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum), per_page: '50' });
      if (filter) params.set('action_type', filter);
      const res  = await fetch(`/api/v1/reports/audit?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load audit log');
      const newEntries = json.data ?? [];
      setEntries(reset ? newEntries : (prev) => [...prev, ...newEntries]);
      setHasMore(newEntries.length === 50);
      setPage(pageNum);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(1, true); }, [load]);

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete record of all system actions</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="field-input text-sm w-64">
          <option value="">All actions</option>
          <option value="booking_created">Booking created</option>
          <option value="booking_modified">Booking modified</option>
          <option value="booking_cancelled">Booking cancelled</option>
          <option value="check_in">Check-in</option>
          <option value="check_out">Check-out</option>
          <option value="cash_collection_event">Cash collection</option>
          <option value="no_show_marked">No-show marked</option>
          <option value="staff_account_created">Staff account created</option>
          <option value="password_reset">Password reset</option>
          <option value="invalid_transition_attempt">Invalid transition</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Log table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
          <p className="text-sm font-semibold text-gray-700">Audit entries</p>
        </div>

        {loading && entries.length === 0 ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-gray-700">No audit entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => {
              const color = ACTION_COLORS[entry.action_type] ?? DEFAULT_COLOR;
              const time  = new Date(entry.action_at).toLocaleString('en-ET', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              });
              return (
                <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-36 text-xs text-gray-400 font-mono pt-0.5">{time}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
                        {entry.action_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">{entry.entity_type}</span>
                    </div>
                    <p className="text-sm text-gray-800 mt-1 leading-relaxed">{entry.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">by {entry.actor}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="border-t border-gray-100 px-5 py-4 text-center">
            <button onClick={() => load(page + 1)} disabled={loading}
              className="btn-secondary text-sm">
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
