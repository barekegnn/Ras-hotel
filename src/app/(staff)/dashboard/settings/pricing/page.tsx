'use client';

// ============================================================
// Seasonal Pricing Settings Page
// src/app/(staff)/dashboard/settings/pricing/page.tsx
// Requirements 26.1–26.8
// ============================================================

import { useState, useEffect, useCallback } from 'react';

interface SeasonalRate {
  id: string;
  room_type: string;
  start_date: string;
  end_date: string;
  override_price: number;
  created_at: string;
}

export default function PricingSettingsPage() {
  const [rates,      setRates]      = useState<SeasonalRate[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);

  const [roomType,   setRoomType]   = useState('Standard');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [price,      setPrice]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/rooms/rates');
      if (!res.ok) throw new Error('Failed to load rates');
      const json = await res.json();
      setRates(json.data ?? []);
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
      const res = await fetch('/api/v1/rooms/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_type:      roomType,
          start_date:     startDate,
          end_date:       endDate,
          override_price: Number(price),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error?.message ?? 'Failed to create rate'); return; }
      setShowModal(false);
      setRoomType('Standard'); setStartDate(''); setEndDate(''); setPrice('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this seasonal rate?')) return;
    await fetch(`/api/v1/rooms/rates/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seasonal pricing</h1>
          <p className="text-sm text-gray-500 mt-1">Override base prices for specific date ranges</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          + Add rate
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {rates.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No seasonal rates configured</div>
          ) : rates.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{r.room_type}</p>
                <p className="text-xs text-gray-500">{r.start_date} → {r.end_date}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-bold text-brand-600">ETB {r.override_price}/night</p>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-red-500 hover:text-red-700 underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add seasonal rate</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room type</label>
                <select value={roomType} onChange={(e) => setRoomType(e.target.value)}
                  className="field-input w-full bg-white">
                  <option>Standard</option>
                  <option>Deluxe</option>
                  <option>Suite</option>
                  <option>Family</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required
                    className="field-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required
                    min={startDate} className="field-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Override price / night (ETB)</label>
                <input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} required
                  className="field-input w-full" placeholder="e.g. 2000" />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Saving…' : 'Save rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
