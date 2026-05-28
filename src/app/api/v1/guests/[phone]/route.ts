// ============================================================
// GET  /api/v1/guests/:phone  — Guest profile + booking history
// POST /api/v1/guests/:phone/notes — Add guest note
// src/app/api/v1/guests/[phone]/route.ts
// Requirements 33.1–33.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

type Params = { params: { phone: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth('receptionist');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();
    const phone = decodeURIComponent(params.phone);

    // Fetch all bookings for this phone number
    const { data: bookings, error: bookErr } = await supabase
      .from('bookings')
      .select('*, rooms(room_number, room_type)')
      .eq('guest_phone', phone)
      .order('created_at', { ascending: false });

    if (bookErr) throw new Error(bookErr.message);

    // Fetch guest notes (non-deleted)
    const { data: notes, error: noteErr } = await supabase
      .from('guest_notes')
      .select('*, staff_accounts(full_name)')
      .eq('guest_phone', phone)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (noteErr) throw new Error(noteErr.message);

    if (!bookings || bookings.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No guest found with that phone number' } },
        { status: 404 }
      );
    }

    // Build profile from most recent booking
    const latest = bookings[0];
    const totalStays = bookings.filter(
      (b) => b.booking_status === 'checked_out'
    ).length;
    const totalSpend = bookings
      .filter((b) => !['cancelled_full_refund', 'cancelled_partial_refund', 'cancelled_no_refund', 'no_show'].includes(b.booking_status))
      .reduce((sum, b) => sum + (b.total_amount ?? 0), 0);

    return NextResponse.json({
      data: {
        guest_phone:       phone,
        guest_name:        latest.guest_name,
        guest_nationality: latest.guest_nationality,
        guest_language:    latest.guest_language,
        total_bookings:    bookings.length,
        total_stays:       totalStays,
        total_spend:       totalSpend,
        bookings:          bookings.map((b) => ({
          id:                b.id,
          booking_reference: b.booking_reference,
          room_number:       (b.rooms as any)?.room_number ?? '—',
          room_type:         (b.rooms as any)?.room_type   ?? '—',
          check_in_date:     b.check_in_date,
          check_out_date:    b.check_out_date,
          booking_status:    b.booking_status,
          total_amount:      b.total_amount,
          payment_method:    b.payment_method,
          source:            b.source,
          created_at:        b.created_at,
        })),
        notes: (notes ?? []).map((n) => ({
          id:         n.id,
          note_text:  n.note_text,
          author:     (n.staff_accounts as any)?.full_name ?? 'Staff',
          created_at: n.created_at,
          edited_at:  n.edited_at,
        })),
      },
    });
  } catch (err: any) {
    console.error(`[GET /api/v1/guests/${params.phone}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch guest profile' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth('receptionist');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();
    const phone = decodeURIComponent(params.phone);
    const body = await request.json();
    const { note_text } = body;

    if (!note_text?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'note_text is required' } },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('guest_notes')
      .insert({
        guest_phone: phone,
        note_text:   note_text.trim(),
        author_id:   auth.user!.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error(`[POST /api/v1/guests/${params.phone}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to add guest note' } },
      { status: 500 }
    );
  }
}
