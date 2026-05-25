// ============================================================
// GET/POST /api/v1/shift-notes
// src/app/api/v1/shift-notes/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentStaffAccount } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

export async function GET(request: NextRequest) {
  try {
    const staff = await getCurrentStaffAccount();
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const perPage = Number(request.nextUrl.searchParams.get('per_page') ?? 50);
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from('shift_notes')
      .select('*, staff_accounts(full_name)')
      .order('created_at', { ascending: false })
      .limit(perPage);

    if (error) throw error;

    return NextResponse.json({
      data: (data ?? []).map((n: any) => ({
        ...n,
        author_name: n.staff_accounts?.full_name ?? 'Unknown',
      })),
    });
  } catch (err: any) {
    console.error('[shift-notes-get]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await getCurrentStaffAccount();
    if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { note_text, is_urgent } = await request.json();
    if (!note_text?.trim()) {
      return NextResponse.json({ error: 'Note text required' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('shift_notes')
      .insert({
        staff_id: staff.id,
        note_text: note_text.trim(),
        is_urgent: !!is_urgent,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error('[shift-notes-post]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
