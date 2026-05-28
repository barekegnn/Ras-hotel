// ============================================================
// POST   /api/v1/rooms/:id/photos  — Upload a room photo
// DELETE /api/v1/rooms/:id/photos/:photoId  — handled in [photoId]/route.ts
// src/app/api/v1/rooms/[id]/photos/route.ts
// Requirements 26.1, 26.3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth/domain/session';
import { uploadRoomPhoto } from '@/modules/rooms/infrastructure/photos';
import { getRoomById } from '@/modules/rooms/infrastructure/repository';

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth('manager');
  if (auth.error) return auth.error;

  try {
    const room = await getRoomById(params.id, true);
    if (!room) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'photo file is required' } },
        { status: 400 }
      );
    }

    const result = await uploadRoomPhoto(params.id, file);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    const code = err.code ?? 'INTERNAL_ERROR';
    const status = ['UNSUPPORTED_FILE_TYPE', 'FILE_TOO_LARGE', 'TOO_MANY_PHOTOS'].includes(code) ? 422 : 500;
    console.error(`[POST /api/v1/rooms/${params.id}/photos]`, err);
    return NextResponse.json(
      { error: { code, message: err.message } },
      { status }
    );
  }
}
