// ============================================================
// GET /api/v1/reports/feedback
// src/app/api/v1/reports/feedback/route.ts
//
// Returns submitted guest feedback for the manager report.
// Requirements 35.5–35.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

export async function GET(request: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') ?? 100);

    const { data, error } = await supabase
      .from('feedback')
      .select(`
        id,
        star_rating,
        comment,
        submitted_at,
        expires_at,
        token_expired,
        bookings (
          guest_name,
          guest_phone,
          check_in_date,
          check_out_date,
          rooms ( room_type, room_number )
        )
      `)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    // Compute summary stats
    const entries = data ?? [];
    const totalResponses = entries.length;
    const avgRating = totalResponses > 0
      ? entries.reduce((s, f) => s + (f.star_rating ?? 0), 0) / totalResponses
      : null;

    const distribution = [1, 2, 3, 4, 5].map((star) => ({
      star,
      count: entries.filter((f) => f.star_rating === star).length,
    }));

    return NextResponse.json({
      data: entries,
      meta: {
        total_responses: totalResponses,
        avg_rating:      avgRating ? Math.round(avgRating * 10) / 10 : null,
        distribution,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/v1/reports/feedback]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch feedback report' } },
      { status: 500 }
    );
  }
}
