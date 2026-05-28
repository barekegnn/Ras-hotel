// ============================================================
// DELETE /api/v1/rooms/:id/photos/:photoId
// src/app/api/v1/rooms/[id]/photos/[photoId]/route.ts
// Requirements 26.3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { deleteRoomPhoto } from '@/modules/rooms/infrastructure/photos';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

type Params = { params: { id: string; photoId: string } };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const supabase = createSupabaseServiceClient();

    // Fetch photo to get storage path
    const { data: photo, error } = await supabase
      .from('room_photos')
      .select('id, storage_path, room_id')
      .eq('id', params.photoId)
      .eq('room_id', params.id)
      .single();

    if (error || !photo) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Photo not found' } },
        { status: 404 }
      );
    }

    await deleteRoomPhoto(photo.id, photo.storage_path);

    return NextResponse.json({ data: { message: 'Photo deleted' } });
  } catch (err: any) {
    console.error(`[DELETE /api/v1/rooms/${params.id}/photos/${params.photoId}]`, err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete photo' } },
      { status: 500 }
    );
  }
}
