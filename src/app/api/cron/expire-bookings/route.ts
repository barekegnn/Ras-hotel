// ============================================================
// GET /api/cron/expire-bookings
// src/app/api/cron/expire-bookings/route.ts
//
// Cron job: runs every 10 minutes (configured in vercel.json).
// Marks no-show bookings whose check-in date is today and the
// no-show threshold time has passed without a check-in.
// Also releases expired room locks.
// Requirements 20.6–20.11
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

export async function GET(request: NextRequest) {
  // ── Auth: verify cron secret ──────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // ── 1. Fetch hotel no-show threshold time ─────────────────
  let noShowThreshold = '20:00'; // default
  try {
    const { data } = await supabase
      .from('hotel_configuration')
      .select('value')
      .eq('key', 'no_show_threshold_time')
      .single();
    if (data?.value) noShowThreshold = data.value;
  } catch { /* use default */ }

  // Build threshold datetime for today
  const [threshHour, threshMin] = noShowThreshold.split(':').map(Number);
  const thresholdTime = new Date(now);
  thresholdTime.setHours(threshHour ?? 20, threshMin ?? 0, 0, 0);

  let noShowCount = 0;
  let lockCount   = 0;
  const errors: string[] = [];

  // ── 2. Mark no-shows (Req 20.6–20.9) ─────────────────────
  // Only run after the threshold time has passed
  if (now >= thresholdTime) {
    const { data: overdueBookings, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, booking_reference, room_id')
      .eq('check_in_date', todayStr)
      .in('booking_status', ['paid', 'reserved_unpaid']);

    if (fetchErr) {
      errors.push(`Fetch overdue bookings: ${fetchErr.message}`);
    } else if (overdueBookings && overdueBookings.length > 0) {
      for (const booking of overdueBookings) {
        try {
          // Transition to no_show
          await supabase
            .from('bookings')
            .update({
              booking_status: 'no_show',
              no_show_marked_by: null,
              no_show_marked_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', booking.id);

          // Record status history
          await supabase.from('booking_status_history').insert({
            booking_id:      booking.id,
            previous_status: 'paid',
            new_status:      'no_show',
            actor:           'system:cron',
            transitioned_at: now.toISOString(),
          });

          // Free the room
          await supabase
            .from('rooms')
            .update({ status: 'available', updated_at: now.toISOString() })
            .eq('id', booking.room_id);

          // Write audit log
          await supabase.from('audit_log').insert({
            action_at:   now.toISOString(),
            actor:       'system:cron',
            action_type: 'no_show_marked',
            entity_type: 'Booking',
            entity_id:   booking.id,
            description: `Booking ${booking.booking_reference} auto-marked as no-show after threshold ${noShowThreshold}`,
            metadata:    { threshold: noShowThreshold, date: todayStr },
          });

          noShowCount++;
        } catch (err: any) {
          errors.push(`No-show ${booking.booking_reference}: ${err.message}`);
        }
      }
    }
  }

  // ── 3. Release expired room locks (Req 3.3) ───────────────
  const { error: lockErr, count } = await supabase
    .from('room_locks')
    .delete({ count: 'exact' })
    .lt('expires_at', now.toISOString());

  if (lockErr) {
    errors.push(`Lock cleanup: ${lockErr.message}`);
  } else {
    lockCount = count ?? 0;
  }

  console.log(`[expire-bookings] no_show=${noShowCount}, locks_released=${lockCount}, errors=${errors.length}`);

  return NextResponse.json({
    no_show_marked:  noShowCount,
    locks_released:  lockCount,
    threshold_time:  noShowThreshold,
    ran_at:          now.toISOString(),
    ...(errors.length > 0 ? { errors } : {}),
  });
}
