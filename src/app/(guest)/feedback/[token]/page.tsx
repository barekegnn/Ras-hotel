'use client';

// ============================================================
// Guest Feedback Page
// src/app/(guest)/feedback/[token]/page.tsx
//
// Post-stay rating form. Accessed via the link sent in the
// feedback SMS after check-out.
// Requirements 35.1–35.6
// ============================================================

import { useState, useEffect } from 'react';

interface FeedbackMeta {
  guest_name:     string;
  check_in_date:  string;
  check_out_date: string;
  room_type:      string;
  expires_at:     string;
}

export default function FeedbackPage({ params }: { params: { token: string } }) {
  const [meta,        setMeta]        = useState<FeedbackMeta | null>(null);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  const [rating,      setRating]      = useState(0);
  const [hovered,     setHovered]     = useState(0);
  const [comment,     setComment]     = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  useEffect(() => {
    fetch(`/api/v1/feedback/${params.token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setLoadError(j.error.message);
        else setMeta(j.data);
      })
      .catch(() => setLoadError('Failed to load feedback form'))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setSubmitError('Please select a star rating'); return; }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/feedback/${params.token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ star_rating: rating, comment: comment.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setSubmitError(json.error?.message ?? 'Submission failed'); return; }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white">
        <div className="h-8 w-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Error / expired ───────────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-10 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link unavailable</h1>
          <p className="text-sm text-gray-500">{loadError}</p>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-brand-50 to-white p-6">
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-10 text-center">
          <div className="text-5xl mb-4">🌟</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank you!</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your feedback helps us improve the experience for every guest.
            We hope to welcome you back to Ras Hotel soon.
          </p>
          <a href="/"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white
                       hover:bg-brand-600 transition-colors">
            Back to Ras Hotel
          </a>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white py-16 px-6">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 mb-4">
            <span className="text-2xl font-black text-white">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">How was your stay?</h1>
          {meta && (
            <p className="text-sm text-gray-500 mt-2">
              {meta.guest_name} · {meta.room_type} · {meta.check_in_date} → {meta.check_out_date}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}
          className="rounded-2xl bg-white shadow-xl overflow-hidden">
          <div className="p-8 space-y-8">

            {/* Star rating */}
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700 mb-4">
                Rate your overall experience
              </p>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                    className="transition-transform hover:scale-110 focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    <svg
                      className={`h-10 w-10 transition-colors ${
                        star <= (hovered || rating)
                          ? 'text-yellow-400'
                          : 'text-gray-200'
                      }`}
                      viewBox="0 0 24 24" fill="currentColor"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="mt-3 text-sm font-semibold text-brand-600">
                  {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tell us more <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="What did you enjoy? What could we improve?"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900
                           placeholder:text-gray-400 resize-none
                           focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{comment.length}/500</p>
            </div>

            {submitError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {submitError}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-8 py-5">
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white
                         hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              {submitting ? 'Submitting…' : 'Submit feedback'}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ras Hotel · Harar, Ethiopia
        </p>
      </div>
    </div>
  );
}
