-- ============================================================
-- Migration: 20260528000001_documents_storage_bucket
--
-- Creates the 'documents' storage bucket for chatbot RAG uploads.
-- The bucket is private (not publicly accessible).
-- Managers can upload/delete; staff can read (for chatbot queries).
-- ============================================================

-- Create the documents bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  20971520,  -- 20 MB in bytes
  ARRAY['application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS Policies ──────────────────────────────────────

-- Managers can upload documents
CREATE POLICY "documents_manager_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE auth_id = auth.uid()
        AND role = 'manager'
        AND is_active = true
    )
  );

-- Managers can delete documents
CREATE POLICY "documents_manager_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE auth_id = auth.uid()
        AND role = 'manager'
        AND is_active = true
    )
  );

-- All active staff can read documents (needed for chatbot)
CREATE POLICY "documents_staff_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE auth_id = auth.uid()
        AND is_active = true
    )
  );
