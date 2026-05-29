'use client';

// ============================================================
// Room Management Settings Page
// src/app/(staff)/dashboard/settings/rooms/page.tsx
// Requirements 25.1–25.8
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  base_price_per_night: number;
  status: string;
  is_active: boolean;
}

export default function RoomsSettingsPage() {
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);

  const [roomNumber,   setRoomNumber]   = useState('');
  const [roomType,     setRoomType]     = useState('Standard');
  const [floor,        setFloor]        = useState('1');
  const [description,  setDescription]  = useState('');
  const [basePrice,    setBasePrice]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/rooms?include_inactive=true');
      if (!res.ok) throw new Error('Failed to load rooms');
      const json = await res.json();
      setRooms(json.data ?? []);
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
      const res = await fetch('/api/v1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number:          roomNumber.trim(),
          room_type:            roomType,
          floor:                Number(floor),
          description:          description.trim(),
          base_price_per_night: Number(basePrice),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setFormError(json.error?.message ?? 'Failed to create room'); return; }
      setShowModal(false);
      setRoomNumber(''); setRoomType('Standard'); setFloor('1'); setDescription(''); setBasePrice('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/v1/rooms/${id}`, {
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
          <h1 className="text-2xl font-bold text-gray-900">Room management</h1>
          <p className="text-sm text-gray-500 mt-1">Add, edit, and manage hotel rooms</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          + Add room
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
          {rooms.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No rooms yet</div>
          ) : rooms.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center text-sm font-bold text-brand-700 flex-shrink-0">
                  {r.room_number}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.room_type} · Floor {r.floor}</p>
                  <p className="text-xs text-gray-500">ETB {r.base_price_per_night}/night</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-13 sm:pl-0">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold
                  ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                  {r.is_active ? 'Active' : 'Inactive'}
                </span>
                <Link href={`/dashboard/settings/rooms/${r.id}`}
                  className="text-xs text-brand-600 hover:text-brand-800 underline">
                  Edit
                </Link>
                <button
                  onClick={() => toggleActive(r.id, r.is_active)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline">
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add room</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room number</label>
                  <input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} required
                    className="field-input w-full" placeholder="e.g. 101" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                  <input type="number" min="1" value={floor} onChange={(e) => setFloor(e.target.value)} required
                    className="field-input w-full" />
                </div>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base price / night (ETB)</label>
                <input type="number" min="1" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required
                  className="field-input w-full" placeholder="e.g. 1500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={2} className="field-input w-full resize-none" placeholder="Optional room description" />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Creating…' : 'Create room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
