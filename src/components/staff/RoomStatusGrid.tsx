'use client';

// ============================================================
// Room Status Grid
// src/components/staff/RoomStatusGrid.tsx
//
// Real-time color-coded room status display.
// Requirements 10.1–10.6
// ============================================================

import { useState, useMemo } from 'react';
import { useRoomStatus } from '@/shared/hooks/useRoomStatus';
import type { Room, RoomStatus } from '@/shared/types/domain';

const STATUS_COLORS: Record<RoomStatus, { bg: string; text: string; border: string }> = {
  Available:       { bg: 'bg-green-50',  text: 'text-green-900',  border: 'border-green-300' },
  Occupied:        { bg: 'bg-red-50',    text: 'text-red-900',    border: 'border-red-300' },
  Reserved_Paid:   { bg: 'bg-blue-50',   text: 'text-blue-900',   border: 'border-blue-300' },
  Reserved_Unpaid: { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-300' },
};

const STATUS_LABELS: Record<RoomStatus, string> = {
  Available:       'Available',
  Occupied:        'Occupied',
  Reserved_Paid:   'Reserved',
  Reserved_Unpaid: 'Unpaid',
};

export function RoomStatusGrid() {
  const { rooms, loading, error } = useRoomStatus();
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Group and filter rooms
  const filtered = useMemo(() => {
    if (filter === 'all') return rooms;
    return rooms.filter((r) => r.room_status === filter);
  }, [rooms, filter]);

  // Summary counts (Req 10.4)
  const counts = useMemo(() => {
    const c = { Available: 0, Occupied: 0, Reserved_Paid: 0, Reserved_Unpaid: 0 };
    for (const r of rooms) c[r.room_status] = (c[r.room_status] ?? 0) + 1;
    return c;
  }, [rooms]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Failed to load room status: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Summary counts at top (Req 10.4) */}
      <div className="grid grid-cols-4 gap-4">
        {(['Available', 'Occupied', 'Reserved_Paid', 'Reserved_Unpaid'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`
              relative rounded-lg border-2 transition-all
              ${filter === status ? STATUS_COLORS[status].border : 'border-gray-200'}
              ${STATUS_COLORS[status].bg} p-4 text-left hover:scale-[1.02]
            `}
          >
            <div className={`text-sm font-medium ${STATUS_COLORS[status].text}`}>
              {STATUS_LABELS[status]}
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{counts[status]}</div>
          </button>
        ))}
      </div>

      {/* Room grid */}
      {loading ? (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {filtered.map((room) => {
            const colors = STATUS_COLORS[room.room_status];
            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`
                  group relative rounded-lg border-2 p-4 text-left transition-all
                  hover:scale-[1.03] hover:shadow-md
                  ${colors.bg} ${colors.border}
                `}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-bold text-gray-900">{room.room_number}</div>
                    <div className="mt-0.5 text-xs font-medium text-gray-600">{room.room_type}</div>
                  </div>
                  <div className={`rounded px-2 py-0.5 text-xs font-semibold ${colors.text} bg-white/80`}>
                    {STATUS_LABELS[room.room_status]}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">Floor {room.floor}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Room detail panel (Req 10.3, 10.6) */}
      {selectedRoom && (
        <RoomDetailPanel room={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}
    </div>
  );
}

function RoomDetailPanel({ room, onClose }: { room: Room; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Room {room.room_number}</h3>
            <p className="mt-1 text-sm text-gray-500">{room.room_type} · Floor {room.floor}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Status</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {STATUS_LABELS[room.room_status]}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-gray-500">Base Rate</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                ETB {room.base_price_per_night.toFixed(2)}/night
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500">Floor</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{room.floor}</div>
            </div>
          </div>

          {room.description && (
            <div>
              <div className="text-xs font-medium text-gray-500">Description</div>
              <p className="mt-1 text-sm text-gray-700">{room.description}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              View Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
