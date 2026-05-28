'use client';

// ============================================================
// Room Edit Page
// src/app/(staff)/dashboard/settings/rooms/[id]/page.tsx
// Requirements 25.1–25.8, 26.1–26.4
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@/components/staff/Icons';

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  description: string;
  base_price_per_night: number;
  is_active: boolean;
  room_photos: Array<{ id: string; storage_url: string; storage_path: string; display_order: number }>;
}

export default function RoomEditPage({ params }: { params: { id: string } }) {
  const [room,       setRoom]       = useState<Room | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState<string | null>(null);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [basePrice,   setBasePrice]   = useState('');
  const [roomType,    setRoomType]    = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/rooms/${params.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Room not found');
      const r = json.data;
      setRoom(r);
      setDescription(r.description ?? '');
      setBasePrice(String(r.base_price_per_night));
      setRoomType(r.room_type);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/v1/rooms/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description:          description.trim(),
          base_price_per_night: Number(basePrice),
          room_type:            roomType,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setSaveMsg(json.error?.message ?? 'Save failed'); return; }
      setSaveMsg('Saved successfully');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch(`/api/v1/rooms/${params.id}/photos`, { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) { setUploadErr(json.error?.message ?? 'Upload failed'); return; }
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDeletePhoto(photoId: string, storagePath: string) {
    if (!confirm('Delete this photo?')) return;
    await fetch(`/api/v1/rooms/${params.id}/photos/${photoId}`, { method: 'DELETE' });
    await load();
  }

  if (loading) return (
    <div className="max-w-3xl space-y-4">
      <div className="skeleton h-10 w-48 rounded-lg" />
      {[1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
    </div>
  );

  if (error || !room) return (
    <div className="max-w-3xl space-y-4">
      <Link href="/dashboard/settings/rooms" className="btn-ghost text-gray-500 inline-flex items-center gap-2">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </Link>
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-900 font-semibold">{error ?? 'Room not found'}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/rooms" className="btn-ghost text-gray-500">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room {room.room_number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{room.room_type} · Floor {room.floor}</p>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Room details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room type</label>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)}
            className="field-input w-full bg-white">
            <option>Standard</option>
            <option>Deluxe</option>
            <option>Suite</option>
            <option>Family</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Base price / night (ETB)</label>
          <input type="number" min="1" value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
            required className="field-input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={3} className="field-input w-full resize-none" />
        </div>
        {saveMsg && (
          <p className={`text-sm font-medium ${saveMsg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
            {saveMsg}
          </p>
        )}
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Photos */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Photos ({room.room_photos?.length ?? 0}/10)
          </h2>
          <label className="cursor-pointer rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
            {uploading ? 'Uploading…' : '+ Add photo'}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              className="sr-only" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>
        {uploadErr && <p className="text-sm text-red-600">{uploadErr}</p>}
        {!room.room_photos?.length ? (
          <p className="text-sm text-gray-400 text-center py-6">No photos yet</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {room.room_photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-video bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.storage_url} alt="Room photo"
                  className="w-full h-full object-cover" />
                <button
                  onClick={() => handleDeletePhoto(photo.id, photo.storage_path)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 text-white text-xs
                             opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
