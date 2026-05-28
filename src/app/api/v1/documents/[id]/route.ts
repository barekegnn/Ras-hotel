// ============================================================
// DELETE /api/v1/documents/:id  — Delete a document
// src/app/api/v1/documents/[id]/route.ts
// Requirements 2.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';

type Params = { params: { id: string } };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();

    // Fetch document to get storage path
    const { data: doc, error: fetchErr } = await supabase
      .from('documents')
      .select('id, filename, storage_path')
      .eq('id', params.id)
      .single();

    if (fetchErr || !doc) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      );
    }

    // Delete from storage
    await supabase.storage.from('documents').remove([doc.storage_path]).catch(() => {});

    // Delete document chunks (cascade via FK, but explicit for clarity)
    await supabase.from('document_chunks').delete().eq('document_id', params.id);

    // Delete document record
    const { error: deleteErr } = await supabase
      .from('documents')
      .delete()
      .eq('id', params.id);

    if (deleteErr) throw new Error(deleteErr.message);

    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.DocumentDeleted,
      entity_type: EntityType.Document,
      entity_id:   params.id,
      description: `Document "${doc.filename}" deleted`,
      metadata:    { filename: doc.filename },
    });

    return NextResponse.json({ data: { message: 'Document deleted' } });
  } catch (err: any) {
    console.error(`[DELETE /api/v1/documents/${params.id}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete document' } },
      { status: 500 }
    );
  }
}
