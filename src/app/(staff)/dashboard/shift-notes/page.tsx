'use client';

// ============================================================
// Shift Notes - Staff Handover Log
// src/app/(staff)/dashboard/shift-notes/page.tsx
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { AlertIcon, CheckIcon, RefreshIcon, TrashIcon } from '@/components/staff/Icons';

interface ShiftNote {
  id: string;
  note_text: string;
  is_urgent: boolean;
  author_id: string;
  author_name?: string;
  created_at: string;
}

export default function ShiftNotesPage() {
  const [notes, setNotes] = useState<ShiftNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/shift-notes?per_page=50');
      const json = await res.json();
      setNotes(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/shift-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_text: newNote.trim(),
          is_urgent: isUrgent,
        }),
      });

      if (!res.ok) throw new Error('Failed to save note');
      setNewNote('');
      setIsUrgent(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId: string) {
    if (!confirm('Delete this note?')) return;
    try {
      await fetch(`/api/v1/shift-notes/${noteId}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      alert('Failed to delete note');
    }
  }

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift handover</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Leave notes for the next shift. Critical issues are flagged as urgent.
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-gray-500">
          <RefreshIcon className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* New note form */}
      <form onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div>
          <label className="field-label">What's happening next shift?</label>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="E.g. Guest in Room 12 requested early checkout at 11am. Room 8 AC not working—technician coming at 2pm."
            rows={3}
            className="field-input resize-none"
            disabled={submitting}
          />
          {error && <p className="field-error">{error}</p>}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="rounded accent-brand-500"
              disabled={submitting}
            />
            <span className="text-sm font-medium text-gray-700">
              Mark as urgent
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!newNote.trim() || submitting}
            className="btn-primary flex-1 justify-center">
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4" />
                Post note
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Notes list */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 rounded-lg" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            No shift notes yet. Start the handover conversation above.
          </div>
        ) : (
          notes.map((note) => {
            const date = new Date(note.created_at);
            const time = date.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('en-ET', { month: 'short', day: 'numeric' });

            return (
              <div key={note.id}
                className={`rounded-lg border p-4 space-y-3 transition-colors
                  ${note.is_urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>

                <div className="flex items-start justify-between gap-3">
                  <p className={`flex-1 text-sm leading-relaxed
                    ${note.is_urgent ? 'text-red-900 font-medium' : 'text-gray-900'}`}>
                    {note.note_text}
                  </p>

                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    {note.is_urgent && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                        <AlertIcon className="h-3 w-3" />
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400">
                    {dateStr} at {time}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
