// ============================================================
// Room Photo Storage
// src/modules/rooms/infrastructure/photos.ts
//
// Handles room photo upload/deletion via Supabase Storage.
// Enforces max-10-photos-per-room rule. Requirements 26.1, 26.3
// ============================================================

import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { countRoomPhotos, insertRoomPhoto, deleteRoomPhoto as dbDeleteRoomPhoto } from './repository';

const BUCKET = 'room-photos';
const MAX_PHOTOS = 10;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per photo
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface UploadPhotoResult {
  photoId:    string;
  storageUrl: string;
  storagePath:string;
}

/**
 * Uploads a room photo to Supabase Storage and registers it in the DB.
 * Enforces the 10-photo limit at the application layer. Requirement 26.1
 */
export async function uploadRoomPhoto(
  roomId: string,
  file: File
): Promise<UploadPhotoResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw Object.assign(
      new Error(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP.`),
      { code: 'UNSUPPORTED_FILE_TYPE' }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw Object.assign(
      new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum is 5 MB.`),
      { code: 'FILE_TOO_LARGE' }
    );
  }

  // Enforce max-photos limit
  const currentCount = await countRoomPhotos(roomId);
  if (currentCount >= MAX_PHOTOS) {
    throw Object.assign(
      new Error(`Maximum ${MAX_PHOTOS} photos per room. Delete one before uploading.`),
      { code: 'TOO_MANY_PHOTOS' }
    );
  }

  // Build storage path
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const storagePath = `${roomId}/${filename}`;

  // Upload to Supabase Storage
  const supabase = createSupabaseServiceClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const storageUrl = urlData.publicUrl;

  // Register in DB
  const photo = await insertRoomPhoto(roomId, storagePath, storageUrl, currentCount);

  return { photoId: photo.id, storageUrl, storagePath };
}

/**
 * Deletes a room photo from both Supabase Storage and the database.
 */
export async function deleteRoomPhoto(
  photoId: string,
  storagePath: string
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  // Remove from storage first
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  // Don't block DB delete even if storage file is missing (idempotent)
  if (storageError) {
    console.warn(`[deleteRoomPhoto] Storage removal warning for ${storagePath}:`, storageError.message);
  }

  // Remove DB record
  await dbDeleteRoomPhoto(photoId);
}
