// ============================================================
// Room Repository
// src/modules/rooms/infrastructure/repository.ts
//
// All database operations for rooms and room photos.
// Requirements 26.1–26.4
// ============================================================

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import type { Room, RoomPhoto, CreateRoomInput } from '@/shared/types/domain';

// ── Room CRUD ─────────────────────────────────────────────────

/**
 * Returns all active rooms, optionally joined with their photos.
 * Used by the public room listing and the staff booking forms.
 */
export async function listActiveRooms(withPhotos = true): Promise<Room[]> {
  const supabase = createSupabaseServerClient();
  const query = supabase
    .from('rooms')
    .select(withPhotos ? '*, room_photos(*)' : '*')
    .eq('is_active', true)
    .order('room_number', { ascending: true });

  const { data, error } = await query;
  if (error) throw new Error(`listActiveRooms: ${error.message}`);
  return (data ?? []) as Room[];
}

/**
 * Returns a single room by ID, including photos.
 * Returns null if not found or deactivated (for public callers).
 */
export async function getRoomById(id: string, includeInactive = false): Promise<Room | null> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from('rooms')
    .select('*, room_photos(*)')
    .eq('id', id);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query.single();
  if (error) return null;
  return data as Room;
}

/**
 * Returns a room together with its current active booking (if any).
 * Used by the staff dashboard room grid.
 */
export async function getRoomWithCurrentBooking(id: string) {
  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      room_photos(*),
      bookings!inner(
        id, booking_reference, guest_name, guest_phone,
        check_in_date, check_out_date, booking_status,
        total_amount, payment_method, special_request
      )
    `)
    .eq('id', id)
    .eq('bookings.booking_status', 'Checked_In')
    .lte('bookings.check_in_date', today)
    .gte('bookings.check_out_date', today)
    .maybeSingle();

  if (error) throw new Error(`getRoomWithCurrentBooking: ${error.message}`);
  return data;
}

/**
 * Creates a new room record.
 * Immediately makes the room available in the booking flow (Req 26.2).
 */
export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      room_number:          input.room_number.trim(),
      room_type:            input.room_type.trim(),
      floor:                input.floor,
      description:          input.description.trim(),
      base_price_per_night: input.base_price_per_night,
      room_status:          'Available',
      is_active:            true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Room number "${input.room_number}" already exists.`);
    }
    throw new Error(`createRoom: ${error.message}`);
  }
  return data as Room;
}

/**
 * Updates mutable fields on a room (description, base price, photos).
 * Room number and floor are intentionally not editable after creation.
 * Requirement 26.3
 */
export async function updateRoom(
  id: string,
  updates: Partial<Pick<Room, 'description' | 'base_price_per_night' | 'room_type'>>
): Promise<Room> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('rooms')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateRoom: ${error.message}`);
  return data as Room;
}

/**
 * Deactivates a room — it stops appearing in booking flows but
 * all historical booking records are preserved. Requirement 26.4
 */
export async function deactivateRoom(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('rooms')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`deactivateRoom: ${error.message}`);
}

/**
 * Lists future bookings for a room — used before deactivation to show
 * the Manager which bookings will be affected. Requirement 28.3
 */
export async function listFutureBookingsForRoom(roomId: string) {
  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_reference, guest_name, check_in_date, check_out_date, booking_status')
    .eq('room_id', roomId)
    .gte('check_in_date', today)
    .not('booking_status', 'in', '("Cancelled_Full_Refund","Cancelled_Partial_Refund","Cancelled_No_Refund","No_Show")')
    .order('check_in_date', { ascending: true });

  if (error) throw new Error(`listFutureBookingsForRoom: ${error.message}`);
  return data ?? [];
}

// ── Room Photos ───────────────────────────────────────────────

export async function listRoomPhotos(roomId: string): Promise<RoomPhoto[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('room_photos')
    .select('*')
    .eq('room_id', roomId)
    .order('display_order', { ascending: true });

  if (error) throw new Error(`listRoomPhotos: ${error.message}`);
  return data as RoomPhoto[];
}

export async function countRoomPhotos(roomId: string): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from('room_photos')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);

  if (error) return 0;
  return count ?? 0;
}

export async function insertRoomPhoto(
  roomId: string,
  storagePath: string,
  storageUrl: string,
  displayOrder: number
): Promise<RoomPhoto> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('room_photos')
    .insert({ room_id: roomId, storage_path: storagePath, storage_url: storageUrl, display_order: displayOrder })
    .select()
    .single();

  if (error) throw new Error(`insertRoomPhoto: ${error.message}`);
  return data as RoomPhoto;
}

export async function deleteRoomPhoto(photoId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('room_photos').delete().eq('id', photoId);
  if (error) throw new Error(`deleteRoomPhoto: ${error.message}`);
}

// ── Room Status Updates ───────────────────────────────────────

export type RoomStatusValue = 'Available' | 'Occupied' | 'Reserved_Paid' | 'Reserved_Unpaid';

/**
 * Updates a room's operational status.
 * Called by check-in, check-out, and booking creation flows.
 */
export async function updateRoomStatus(roomId: string, status: RoomStatusValue): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('rooms')
    .update({ room_status: status, updated_at: new Date().toISOString() })
    .eq('id', roomId);

  if (error) throw new Error(`updateRoomStatus: ${error.message}`);
}
