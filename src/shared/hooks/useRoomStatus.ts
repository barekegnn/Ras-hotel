// ============================================================
// Real-time Hooks — Supabase Realtime subscriptions
// src/shared/hooks/useRoomStatus.ts
// Requirements 10.2, 20.1, 23.5, 33.5
// ============================================================

'use client';

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/modules/auth/infrastructure/supabase';
import type { Room, Notification, ShiftNote, Booking } from '@/shared/types/domain';

// ── useRoomStatus ─────────────────────────────────────────────

interface RoomStatusState {
  rooms:    Room[];
  loading:  boolean;
  error:    string | null;
}

type RoomAction =
  | { type: 'SET_ROOMS'; rooms: Room[] }
  | { type: 'UPDATE_ROOM'; room: Room }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_LOADING'; loading: boolean };

function roomReducer(state: RoomStatusState, action: RoomAction): RoomStatusState {
  switch (action.type) {
    case 'SET_ROOMS':    return { ...state, rooms: action.rooms, loading: false };
    case 'UPDATE_ROOM':  return {
      ...state,
      rooms: state.rooms.map((r) => r.id === action.room.id ? { ...r, ...action.room } : r),
    };
    case 'SET_ERROR':    return { ...state, error: action.error, loading: false };
    case 'SET_LOADING':  return { ...state, loading: action.loading };
    default:             return state;
  }
}

/**
 * Subscribes to real-time room status changes via Supabase Realtime.
 * Updates the room grid within 5 seconds of any status change. Req 10.2
 */
export function useRoomStatus() {
  const [state, dispatch] = useReducer(roomReducer, { rooms: [], loading: true, error: null });
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Initial fetch
    async function loadRooms() {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, room_photos(*)')
        .order('room_number');

      if (error) { dispatch({ type: 'SET_ERROR', error: error.message }); return; }
      dispatch({ type: 'SET_ROOMS', rooms: (data ?? []) as Room[] });
    }
    loadRooms();

    // Realtime subscription
    const channel = supabase
      .channel('room-status-grid')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' },
        (payload) => dispatch({ type: 'UPDATE_ROOM', room: payload.new as Room })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return state;
}

// ── useNotifications ──────────────────────────────────────────

interface NotificationState {
  notifications: Notification[];
  unreadCount:   number;
}

/**
 * Subscribes to new notifications and maintains unread count. Req 20.1, 33.4
 */
export function useNotifications() {
  const [state, dispatch] = useReducer(
    (s: NotificationState, action: { type: string; payload?: any }): NotificationState => {
      if (action.type === 'SET') {
        const unread = action.payload.filter((n: Notification) => !n.is_read).length;
        return { notifications: action.payload, unreadCount: unread };
      }
      if (action.type === 'ADD') {
        return {
          notifications: [action.payload, ...state.notifications].slice(0, 50),
          unreadCount:   state.unreadCount + 1,
        };
      }
      if (action.type === 'ACK') {
        const updated = state.notifications.map((n) =>
          n.id === action.payload ? { ...n, is_read: true } : n
        );
        return { notifications: updated, unreadCount: Math.max(0, state.unreadCount - 1) };
      }
      return s;
    },
    { notifications: [], unreadCount: 0 }
  );

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Initial fetch (last 7 days)
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    supabase
      .from('notifications')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => dispatch({ type: 'SET', payload: data ?? [] }));

    const channel = supabase
      .channel('notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => dispatch({ type: 'ADD', payload: payload.new as Notification })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const acknowledge = useCallback(async (id: string) => {
    dispatch({ type: 'ACK', payload: id });
    await supabase
      .from('notifications')
      .update({ is_read: true, acknowledged_at: new Date().toISOString() })
      .eq('id', id);
  }, []);

  return { ...state, acknowledge };
}

// ── useShiftNotes ─────────────────────────────────────────────

/**
 * Fetches the 3 most recent shift notes and listens for new ones. Req 23.3, 33.3
 */
export function useShiftNotes() {
  const [notes, setNotes] = useReducer(
    (s: ShiftNote[], action: { type: 'SET'; payload: ShiftNote[] } | { type: 'ADD'; payload: ShiftNote }) => {
      if (action.type === 'SET') return action.payload;
      return [action.payload, ...s].slice(0, 3);
    },
    []
  );

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase
      .from('shift_notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setNotes({ type: 'SET', payload: (data ?? []) as ShiftNote[] }));

    const channel = supabase
      .channel('shift-notes-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shift_notes' },
        (payload) => setNotes({ type: 'ADD', payload: payload.new as ShiftNote })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

/**
 * Provides real-time dashboard snapshot counts. Req 33.2
 */
export function useDashboardCounts(): DashboardCounts {
  const [counts, setCounts] = useReducer(
    (s: DashboardCounts, p: Partial<DashboardCounts>) => ({ ...s, ...p }),
    { arrivals: 0, departures: 0, available: 0, outstanding: 0, overdue: 0, loading: true }
  );

  const supabase = createSupabaseBrowserClient();

  async function refresh() {
    const today = new Date().toISOString().slice(0, 10);
    const hour  = new Date().getHours();

    const [arrRes, depRes, avRes, unpaidRes] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('check_in_date', today)
        .not('booking_status', 'in', '("Cancelled_Full_Refund","Cancelled_Partial_Refund","Cancelled_No_Refund","No_Show","Checked_Out")'),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('check_out_date', today)
        .in('booking_status', ['Checked_In']),
      supabase.from('rooms').select('*', { count: 'exact', head: true })
        .eq('room_status', 'Available').eq('is_active', true),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('check_in_date', today).eq('booking_status', 'Reserved_Unpaid'),
    ]);

    // Overdue: Paid/Reserved bookings today with no check-in, past 18:00
    let overdue = 0;
    if (hour >= 18) {
      const { count } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('check_in_date', today)
        .in('booking_status', ['Paid', 'Reserved_Unpaid']);
      overdue = count ?? 0;
    }

    setCounts({
      arrivals:    arrRes.count ?? 0,
      departures:  depRes.count ?? 0,
      available:   avRes.count  ?? 0,
      outstanding: unpaidRes.count ?? 0,
      overdue,
      loading:     false,
    });
  }

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('dashboard-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return counts;
}
