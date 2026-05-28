'use client';

// ============================================================
// Chatbot Document Management Page
// src/app/(staff)/dashboard/settings/documents/page.tsx
// Requirements 2.1–2.6
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface Document {
  id: string;
  filename: string;
  mime_type: string;
  file_size_bytes: number;
  index_status: 'pending' | 'indexed' | 'failed';
  uploaded_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  indexed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed:  'bg-red-100 text-red-800',
};

export default function DocumentsSettingsPage() {
  const [docs,       setDocs]       = useState<Document[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [uploadErr,  setUploadErr]  = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/documents');
      if (!res.ok) throw new Error('Failed to load documents');
      const json = await res.json();
      setDocs(json.data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/v1/documents', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) { setUploadErr(json.error?.message ?? 'Upload failed'); return; }
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Delete "${filename}"? This will remove it from the chatbot knowledge base.`)) return;
    await fetch(`/api/v1/documents/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chatbot documents</h1>
        <p className="text-sm text-gray-500 mt-1">Upload PDFs or text files to train the AI assistant</p>
      </div>

      {/* Upload area */}
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center hover:border-brand-400 transition-colors">
        <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <p className="text-sm font-semibold text-gray-700 mb-1">Upload a document</p>
        <p className="text-xs text-gray-500 mb-4">PDF or plain text · max 20 MB</p>
        <label className="cursor-pointer rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          {uploading ? 'Uploading…' : 'Choose file'}
          <input ref={fileRef} type="file" accept=".pdf,.txt,text/plain,application/pdf"
            className="sr-only" onChange={handleUpload} disabled={uploading} />
        </label>
        {uploadErr && <p className="mt-3 text-sm text-red-600">{uploadErr}</p>}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          No documents uploaded yet
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{doc.filename}</p>
                  <p className="text-xs text-gray-500">
                    {(doc.file_size_bytes / 1024).toFixed(1)} KB ·{' '}
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[doc.index_status] ?? ''}`}>
                  {doc.index_status}
                </span>
                <button
                  onClick={() => handleDelete(doc.id, doc.filename)}
                  className="text-xs text-red-500 hover:text-red-700 underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
