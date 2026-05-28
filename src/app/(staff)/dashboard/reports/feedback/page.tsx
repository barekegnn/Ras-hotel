'use client';

// ============================================================
// Guest Feedback Report Page
// src/app/(staff)/dashboard/reports/feedback/page.tsx
// Requirements 35.1–35.6
// ============================================================

import { useState, useEffect, useCallback } from 'react';

interface FeedbackEntry {
  id: string;
  star_rating: number;
  comment: string | null;
  submitted_at: string;
  expires_at: string;
  token_expired: boolean;
  bookings: {
    guest_name: string;
    guest_phone: string;
    check_in_date: string;
    check_out_date: string;
    rooms: { room_type: string; room_number: string } | null;
  } | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <svg key={s} className={`h-4 w-4 ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
          viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

export default function FeedbackReportPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/reports/feedback');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load feedback');
      setFeedback(json.data ?? []);
      const submitted = (json.data ?? []).filter((f: FeedbackEntry) => f.submitted_at);
      if (submitted.length > 0) {
        const avg = submitted.reduce((s: number, f: FeedbackEntry) => s + f.star_rating, 0) / submitted.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitted = feedback.filter((f) => f.submitted_at);
  const pending   = feedback.filter((f) => !f.submitted_at && !f.token_expired);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Guest feedback</h1>
        <p className="text-sm text-gray-500 mt-1">Post-stay ratings and comments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{submitted.length}</p>
          <p className="text-xs text-gray-500 mt-1">Responses received</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-3xl font-bold text-yellow-500">{avgRating ?? '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Average rating</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{pending.length}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : submitted.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="text-4xl mb-3">⭐</div>
          <p className="font-semibold text-gray-700">No feedback yet</p>
          <p className="text-sm text-gray-400 mt-1">Feedback links are sent automatically after check-out</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {submitted.map((f) => (
            <div key={f.id} className="px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <StarRating rating={f.star_rating} />
                    <span className="text-sm font-bold text-gray-900">{f.star_rating}/5</span>
                  </div>
                  {f.comment && (
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">&ldquo;{f.comment}&rdquo;</p>
                  )}
                  {f.bookings && (
                    <p className="text-xs text-gray-400 mt-2">
                      {f.bookings.guest_name} · {f.bookings.rooms?.room_type ?? ''} ·{' '}
                      {f.bookings.check_in_date} → {f.bookings.check_out_date}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(f.submitted_at).toLocaleDateString('en-ET')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
