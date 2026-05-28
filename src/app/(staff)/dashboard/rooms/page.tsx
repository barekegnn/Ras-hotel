'use client';

// ============================================================
// Room Status Grid
// src/app/(staff)/dashboard/rooms/page.tsx
// ============================================================

import { useRoomStatus } from '@/shared/hooks/useRoomStatus';
import type { Room } from '@/shared/types/domain';

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  available:       { label: 'Available',       color: 'bg-green-50 border-green-200',   dot: 'bg-green-500' },
  occupied:        { label: 'Occupied',         color: 'bg-red-50 border-red-200',       dot: 'bg-red-500' },
  reserved_paid:   { label: 'Reserved (paid)',  color: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500' },
  reserved_unpaid: { label: 'Awaiting payment', color: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
};
const DEFAULT_STATUS = { label: 'Unknown', color: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400' };

function RoomCard({ room }: { room: Room }) {
  const cfg = STATUS_CONFIG[room.room_status] ?? DEFAULT_STATUS;
  return (
    <div className={`rounded-xl border-2 p-4 transition-all hover:shadow-md ${cfg.color}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-black text-gray-900">Room {room.room_number}</p>
          <p className="text-xs text-gray-500 mt-0.5">{room.room_type} · Floor {room.floor}</p>
        </div>
        <div className={`h-3 w-3 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Rate</span>
          <span className="text-xs font-semibold text-gray-900">
            ETB {room.base_price_per_night?.toLocaleString()}/night
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Status</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
            ${room.room_status === 'available'       ? 'bg-green-100 text-green-700' :
              room.room_status === 'occupied'         ? 'bg-red-100 text-red-700' :
              room.room_status === 'reserved_paid'    ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'}`}>
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { rooms, loading, error } = useRoomStatus();

  const counts = {
    available:       rooms.filter((r) => r.room_status === 'available').length,
    occupied:        rooms.filter((r) => r.room_status === 'occupied').length,
    reserved_paid:   rooms.filter((r) => r.room_status === 'reserved_paid').length,
    reserved_unpaid: rooms.filter((r) => r.room_status === 'reserved_unpaid').length,
  };

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Status</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live room availability — updates in real time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Available',       count: counts.available,       color: 'bg-green-100 text-green-800' },
          { label: 'Occupied',        count: counts.occupied,        color: 'bg-red-100 text-red-800' },
          { label: 'Reserved (paid)', count: counts.reserved_paid,   color: 'bg-blue-100 text-blue-800' },
          { label: 'Awaiting payment',count: counts.reserved_unpaid, color: 'bg-yellow-100 text-yellow-800' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${color}`}>
            {count} {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {rooms.filter((r) => r.is_active).map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
