// ============================================================
// DELETE /api/v1/shift-notes/:id
// src/app/api/v1/shift-notes/[id]/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentStaffAccount } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

type Params = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const staff = await getCurrentStaffAccount();
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = createSupabaseServiceClient();

    // Only the author or a manager can delete
    const { data: note, error: fetchErr } = await supabase
      .from('shift_notes')
      .select('author_id')
      .eq('id', params.id)
      .single();

    if (fetchErr || !note) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Shift note not found' } },
        { status: 404 }
      );
    }

    if (note.author_id !== staff.id && staff.role !== 'manager') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'You can only delete your own shift notes' } },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await supabase
      .from('shift_notes')
      .delete()
      .eq('id', params.id);

    if (deleteErr) throw new Error(deleteErr.message);

    return NextResponse.json({ data: { message: 'Shift note deleted' } });
  } catch (err: any) {
    console.error(`[DELETE /api/v1/shift-notes/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete shift note' } },
      { status: 500 }
    );
  }
}
