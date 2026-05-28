// ============================================================
// GET  /api/v1/feedback/:token  — Fetch feedback form data
// POST /api/v1/feedback/:token  — Submit guest feedback
// src/app/api/v1/feedback/[token]/route.ts
// Requirements 35.1–35.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

type Params = { params: { token: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const supabase = createSupabaseServiceClient();

    const { data: feedback, error } = await supabase
      .from('feedback')
      .select('*, bookings(guest_name, check_in_date, check_out_date, rooms(room_type))')
      .eq('feedback_token', params.token)
      .single();

    if (error || !feedback) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Feedback link not found or expired' } },
        { status: 404 }
      );
    }

    // Check expiry (Req 35.4)
    if (feedback.token_expired || new Date(feedback.expires_at) < new Date()) {
      return NextResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'This feedback link has expired' } },
        { status: 410 }
      );
    }

    // Already submitted
    if (feedback.submitted_at) {
      return NextResponse.json(
        { error: { code: 'ALREADY_SUBMITTED', message: 'Feedback has already been submitted for this booking' } },
        { status: 409 }
      );
    }

    const booking = (feedback.bookings as any) ?? {};
    return NextResponse.json({
      data: {
        guest_name:     booking.guest_name ?? 'Guest',
        check_in_date:  booking.check_in_date,
        check_out_date: booking.check_out_date,
        room_type:      booking.rooms?.room_type ?? '',
        expires_at:     feedback.expires_at,
      },
    });
  } catch (err) {
    console.error(`[GET /api/v1/feedback/${params.token}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch feedback form' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await request.json();
    const { star_rating, comment } = body;

    // Validate rating (Req 35.2)
    if (!star_rating || star_rating < 1 || star_rating > 5) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'star_rating must be between 1 and 5' } },
        { status: 400 }
      );
    }

    // Fetch and validate token
    const { data: feedback, error: fetchErr } = await supabase
      .from('feedback')
      .select('id, token_expired, expires_at, submitted_at')
      .eq('feedback_token', params.token)
      .single();

    if (fetchErr || !feedback) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Feedback link not found' } },
        { status: 404 }
      );
    }

    if (feedback.token_expired || new Date(feedback.expires_at) < new Date()) {
      return NextResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'This feedback link has expired' } },
        { status: 410 }
      );
    }

    if (feedback.submitted_at) {
      return NextResponse.json(
        { error: { code: 'ALREADY_SUBMITTED', message: 'Feedback already submitted' } },
        { status: 409 }
      );
    }

    // Submit feedback (Req 35.3)
    const { error: updateErr } = await supabase
      .from('feedback')
      .update({
        star_rating,
        comment:      comment?.trim() ?? null,
        submitted_at: new Date().toISOString(),
        token_expired: true,
      })
      .eq('id', feedback.id);

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ data: { message: 'Thank you for your feedback!' } });
  } catch (err: any) {
    console.error(`[POST /api/v1/feedback/${params.token}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to submit feedback' } },
      { status: 500 }
    );
  }
}
