// ============================================================
// GET    /api/v1/documents  — List uploaded documents
// POST   /api/v1/documents  — Upload a document for RAG indexing
// src/app/api/v1/documents/route.ts
// Requirements 2.1–2.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getCurrentStaffAccount } from '@/modules/auth/domain/session';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';

const BUCKET          = 'documents';
const MAX_SIZE_BYTES  = 20 * 1024 * 1024; // 20 MB (Req 2.2)
const ALLOWED_TYPES   = ['application/pdf', 'text/plain'];

export async function GET(_req: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('documents')
      .select('id, filename, mime_type, file_size_bytes, index_status, uploaded_at')
      .order('uploaded_at', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    console.error('[GET /api/v1/documents]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch documents' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  // Fetch the staff_accounts row so we have the integer PK required by the FK
  const staffAccount = await getCurrentStaffAccount();
  if (!staffAccount) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Staff account not found' } },
      { status: 401 }
    );
  }
  const staffId = staffAccount.id; // integer PK that documents.uploaded_by references

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'file is required' } },
        { status: 400 }
      );
    }

    // Validate type (Req 2.2)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE_TYPE', message: 'Only PDF and plain text files are accepted' } },
        { status: 415 }
      );
    }

    // Validate size (Req 2.2)
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'File exceeds the 20 MB limit' } },
        { status: 413 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const arrayBuffer = await file.arrayBuffer();

    // Ensure the bucket exists — create it if it doesn't (private, manager-only)
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) throw new Error(`Storage error: ${listErr.message}`);
    const bucketExists = (buckets ?? []).some((b) => b.name === BUCKET);
    if (!bucketExists) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: MAX_SIZE_BYTES,
        allowedMimeTypes: ALLOWED_TYPES,
      });
      if (createErr) throw new Error(`Failed to create storage bucket: ${createErr.message}`);
    }

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    // Check for existing document with same filename (Req 2.3 — replace)
    const { data: existing } = await supabase
      .from('documents')
      .select('id, storage_path')
      .eq('filename', file.name)
      .maybeSingle();

    let docId: string;

    if (existing) {
      // Delete old storage file and reset index status
      await supabase.storage.from(BUCKET).remove([existing.storage_path]).catch(() => {});
      const { data: updated, error: updateErr } = await supabase
        .from('documents')
        .update({
          storage_path:    storagePath,
          storage_url:     urlData.publicUrl,
          mime_type:       file.type,
          file_size_bytes: file.size,
          index_status:    'pending',
          uploaded_by:     staffId,
          uploaded_at:     new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single();
      if (updateErr) throw new Error(updateErr.message);
      docId = updated.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('documents')
        .insert({
          filename:        file.name,
          storage_path:    storagePath,
          storage_url:     urlData.publicUrl,
          mime_type:       file.type,
          file_size_bytes: file.size,
          index_status:    'pending',
          uploaded_by:     staffId,
        })
        .select('id')
        .single();
      if (insertErr) throw new Error(insertErr.message);
      docId = inserted.id;
    }

    await writeAuditLog({
      actor:       auth.user!.id,
      action_type: AuditActionType.DocumentUploaded,
      entity_type: EntityType.Document,
      entity_id:   docId,
      description: `Document "${file.name}" uploaded (${(file.size / 1024).toFixed(1)} KB)`,
      metadata:    { filename: file.name, mime_type: file.type, size: file.size },
    });

    return NextResponse.json(
      { data: { id: docId, filename: file.name, index_status: 'pending' } },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[POST /api/v1/documents]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Upload failed' } },
      { status: 500 }
    );
  }
}
