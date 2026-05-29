'use client';

// ============================================================
// Guest Profile Detail Page
// src/app/(staff)/dashboard/guests/[phone]/page.tsx
// Requirements 33.1–33.6
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { BookingStatusBadge } from '@/components/staff/BookingStatusBadge';
import { ArrowLeftIcon, PhoneIcon } from '@/components/staff/Icons';

interface GuestProfile {
  guest_phone:       string;
  guest_name:        string;
  guest_nationality: string;
  guest_language:    string;
  total_bookings:    number;
  total_stays:       number;
  total_spend:       number;
  bookings: Array<{
    id: string;
    booking_reference: string;
    room_number: string;
    room_type: string;
    check_in_date: string;
    check_out_date: string;
    booking_status: string;
    total_amount: number;
    payment_method: string;
    source: string;
    created_at: string;
  }>;
  notes: Array<{
    id: string;
    note_text: string;
    author: string;
    created_at: string;
    edited_at: string | null;
  }>;
}

export default function GuestProfilePage({ params }: { params: { phone: string } }) {
  const phone = decodeURIComponent(params.phone);
  const [profile,    setProfile]    = useState<GuestProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [noteText,   setNoteText]   = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteError,  setNoteError]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/guests/${encodeURIComponent(phone)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Guest not found');
      setProfile(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { load(); }, [load]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setNoteError(null);
    setAddingNote(true);
    try {
      const res = await fetch(`/api/v1/guests/${encodeURIComponent(phone)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: noteText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setNoteError(json.error?.message ?? 'Failed to add note'); return; }
      setNoteText('');
      await load();
    } finally {
      setAddingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl space-y-4">
        <div className="skeleton h-10 w-48 rounded-lg" />
        {[1,2,3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl space-y-4">
        <Link href="/dashboard/guests" className="btn-ghost text-gray-500 inline-flex items-center gap-2">
          <ArrowLeftIcon className="h-4 w-4" /> Back to guests
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-900 font-semibold">{error ?? 'Guest not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/guests" className="btn-ghost text-gray-500">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-harar-100 flex items-center justify-center text-lg font-bold text-harar-700">
            {profile.guest_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.guest_name}</h1>
            <a href={`tel:${profile.guest_phone}`}
              className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 mt-0.5">
              <PhoneIcon className="h-3.5 w-3.5" />
              {profile.guest_phone}
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total bookings', value: profile.total_bookings },
          { label: 'Completed stays', value: profile.total_stays },
          { label: 'Total spend', value: `ETB ${profile.total_spend.toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Booking history */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Booking history</h2>
        </div>
        {profile.bookings.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No bookings yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {profile.bookings.map((b) => (
              <div key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{b.booking_reference}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {b.room_number} ({b.room_type}) · {b.check_in_date} → {b.check_out_date}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold text-gray-700">ETB {b.total_amount?.toFixed(2)}</span>
                  <BookingStatusBadge status={b.booking_status as any} />
                  <Link href={`/dashboard/bookings/${b.id}`}
                    className="text-xs text-brand-600 hover:text-brand-800 underline">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guest notes */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Staff notes</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Add note form */}
          <form onSubmit={handleAddNote} className="flex gap-3">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note about this guest…"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm
                         focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button type="submit" disabled={addingNote || !noteText.trim()} className="btn-primary text-sm">
              {addingNote ? 'Adding…' : 'Add note'}
            </button>
          </form>
          {noteError && <p className="text-sm text-red-600">{noteError}</p>}

          {/* Notes list */}
          {profile.notes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
          ) : (
            <div className="space-y-3">
              {profile.notes.map((n) => (
                <div key={n.id} className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <p className="text-sm text-gray-800">{n.note_text}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {n.author} · {new Date(n.created_at).toLocaleString('en-ET')}
                    {n.edited_at && ' (edited)'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
