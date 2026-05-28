// ============================================================
// Real-time Hooks — Supabase Realtime subscriptions
// src/shared/hooks/useRoomStatus.ts
// Requirements 10.2, 20.1, 23.5, 33.5
// ============================================================

'use client';

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/modules/auth/infrastructure/supabase.browser';
import type { Room, Notification, ShiftNote } from '@/shared/types/domain';

// Singleton browser client — one instance for the whole app lifetime.
// Avoids creating a new client (and new Realtime socket) on every render.
let _browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null;
function getClient() {
  if (!_browserClient) _browserClient = createSupabaseBrowserClient();
  return _browserClient;
}

// ── useRoomStatus ─────────────────────────────────────────────

interface RoomStatusState {
  rooms:   Room[];
  loading: boolean;
  error:   string | null;
}

type RoomAction =
  | { type: 'SET_ROOMS';   rooms: Room[] }
  | { type: 'UPDATE_ROOM'; room: Room }
  | { type: 'SET_ERROR';   error: string }
  | { type: 'SET_LOADING'; loading: boolean };

function roomReducer(state: RoomStatusState, action: RoomAction): RoomStatusState {
  switch (action.type) {
    case 'SET_ROOMS':   return { ...state, rooms: action.rooms, loading: false };
    case 'UPDATE_ROOM': return {
      ...state,
      rooms: state.rooms.map((r) => r.id === action.room.id ? { ...r, ...action.room } : r),
    };
    case 'SET_ERROR':   return { ...state, error: action.error, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.loading };
    default:            return state;
  }
}

// ── DB → Domain mapping (browser-side) ───────────────────────
// The DB column is 'status' but the domain type uses 'room_status'.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRoom(row: any): Room {
  const { status, ...rest } = row ?? {};
  return { ...rest, room_status: status ?? rest.room_status } as Room;
}

export function useRoomStatus() {
  const [state, dispatch] = useReducer(roomReducer, { rooms: [], loading: true, error: null });
  const channelNameRef = useRef(`room-status-grid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const supabase = getClient();
    let cancelled = false;

    async function loadRooms() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, room_photos(*)')
        .order('room_number');
      if (cancelled) return;
      if (error) { dispatch({ type: 'SET_ERROR', error: error.message }); return; }
      dispatch({ type: 'SET_ROOMS', rooms: ((data ?? []) as any[]).map(mapRoom) });
    }
    loadRooms();

    const channel = supabase
      .channel(channelNameRef.current)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' },
        (payload) => {
          if (!cancelled) dispatch({ type: 'UPDATE_ROOM', room: mapRoom(payload.new) });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      channelNameRef.current = `room-status-grid-${Math.random().toString(36).slice(2)}`;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}

// ── useNotifications ──────────────────────────────────────────

interface NotificationState {
  notifications: Notification[];
  unreadCount:   number;
}

type NotifAction =
  | { type: 'SET'; payload: Notification[] }
  | { type: 'ADD'; payload: Notification }
  | { type: 'ACK'; payload: string };

function notifReducer(state: NotificationState, action: NotifAction): NotificationState {
  switch (action.type) {
    case 'SET': {
      const unread = action.payload.filter((n) => !n.is_read).length;
      return { notifications: action.payload, unreadCount: unread };
    }
    case 'ADD':
      return {
        notifications: [action.payload, ...state.notifications].slice(0, 50),
        unreadCount:   state.unreadCount + 1,
      };
    case 'ACK': {
      const updated = state.notifications.map((n) =>
        n.id === action.payload ? { ...n, is_read: true } : n
      );
      return { notifications: updated, unreadCount: Math.max(0, state.unreadCount - 1) };
    }
    default: return state;
  }
}

export function useNotifications() {
  const [state, dispatch] = useReducer(notifReducer, { notifications: [], unreadCount: 0 });
  // Stable channel name per component instance — avoids StrictMode double-subscribe
  const channelNameRef = useRef(`notifications-feed-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const supabase = getClient();
    let cancelled = false;
    const channelName = channelNameRef.current;

    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    supabase
      .from('notifications')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) dispatch({ type: 'SET', payload: (data ?? []) as Notification[] });
      });

    // Build and subscribe in one chain — .on() must come before .subscribe()
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          if (!cancelled) dispatch({ type: 'ADD', payload: payload.new as Notification });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      // Update ref so next mount gets a fresh name
      channelNameRef.current = `notifications-feed-${Math.random().toString(36).slice(2)}`;
      supabase.removeChannel(channel);
    };
  }, []);

  const acknowledge = useCallback(async (id: string) => {
    dispatch({ type: 'ACK', payload: id });
    await getClient()
      .from('notifications')
      .update({ is_read: true, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
  }, []);

  return { ...state, acknowledge };
}

// ── useShiftNotes ─────────────────────────────────────────────

type ShiftAction =
  | { type: 'SET'; payload: ShiftNote[] }
  | { type: 'ADD'; payload: ShiftNote };

function shiftReducer(state: ShiftNote[], action: ShiftAction): ShiftNote[] {
  if (action.type === 'SET') return action.payload;
  return [action.payload, ...state].slice(0, 3);
}

export function useShiftNotes() {
  const [notes, dispatch] = useReducer(shiftReducer, []);
  const channelNameRef = useRef(`shift-notes-feed-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const supabase = getClient();
    let cancelled = false;

    supabase
      .from('shift_notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (!cancelled) dispatch({ type: 'SET', payload: (data ?? []) as ShiftNote[] });
      });

    const channel = supabase
      .channel(channelNameRef.current)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shift_notes' },
        (payload) => {
          if (!cancelled) dispatch({ type: 'ADD', payload: payload.new as ShiftNote });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      channelNameRef.current = `shift-notes-feed-${Math.random().toString(36).slice(2)}`;
      supabase.removeChannel(channel);
    };
  }, []);

  return notes;
}

// ── useDashboardCounts ────────────────────────────────────────

interface DashboardCounts {
  arrivals:    number;
  departures:  number;
  available:   number;
  outstanding: number;
  overdue:     number;
  loading:     boolean;
}

export function useDashboardCounts(): DashboardCounts {
  const [counts, setCounts] = useReducer(
    (s: DashboardCounts, p: Partial<DashboardCounts>) => ({ ...s, ...p }),
    { arrivals: 0, departures: 0, available: 0, outstanding: 0, overdue: 0, loading: true }
  );

  const refresh = useCallback(async () => {
    const supabase = getClient();
    const today = new Date().toISOString().slice(0, 10);
    const hour  = new Date().getHours();

    const [arrRes, depRes, avRes, unpaidRes] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('check_in_date', today)
        .not('booking_status', 'in', '("cancelled_full_refund","cancelled_partial_refund","cancelled_no_refund","no_show","checked_out")'),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('check_out_date', today)
        .in('booking_status', ['checked_in']),
      supabase.from('rooms').select('*', { count: 'exact', head: true })
        .eq('status', 'available').eq('is_active', true),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('check_in_date', today).eq('booking_status', 'reserved_unpaid'),
    ]);

    let overdue = 0;
    if (hour >= 18) {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('check_in_date', today)
        .in('booking_status', ['paid', 'reserved_unpaid']);
      overdue = count ?? 0;
    }

    setCounts({
      arrivals:    arrRes.count    ?? 0,
      departures:  depRes.count    ?? 0,
      available:   avRes.count     ?? 0,
      outstanding: unpaidRes.count ?? 0,
      overdue,
      loading:     false,
    });
  }, []);

  useEffect(() => {
    const supabase = getClient();
    refresh();

    const channel = supabase
      .channel(`dashboard-counts-${Date.now()}`)
      .on('postgres_changes', { event: '*',    schema: 'public', table: 'bookings' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' },  refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return counts;
}
