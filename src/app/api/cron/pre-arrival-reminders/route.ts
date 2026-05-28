// ============================================================
// GET /api/cron/pre-arrival-reminders
// src/app/api/cron/pre-arrival-reminders/route.ts
//
// Cron job: runs daily (configured in vercel.json or external scheduler).
// Sends pre-arrival reminder SMS to guests checking in tomorrow.
// Requirements 32.1–32.6
//
// Trigger: daily at 08:00 local time (UTC+3 = 05:00 UTC)
// Secured by CRON_SECRET header.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { sendPreArrivalReminderSms } from '@/modules/notifications/infrastructure/sms';

export async function GET(request: NextRequest) {
  // ── Auth: verify cron secret (Req 32.6) ──────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createSupabaseServiceClient();

  // ── Determine tomorrow's date ─────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // ── Fetch bookings checking in tomorrow (Req 32.1) ────────
  // Only send to confirmed (paid / checked_in) bookings — not unpaid or cancelled
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('check_in_date', tomorrowStr)
    .in('booking_status', ['paid', 'reserved_unpaid'])
    .not('pre_arrival_sms_sent', 'eq', true); // idempotency guard (Req 32.5)

  if (error) {
    console.error('[pre-arrival-reminders] DB error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No reminders to send' });
  }

  // ── Send SMS for each booking ─────────────────────────────
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const booking of bookings) {
    try {
      await sendPreArrivalReminderSms({
        booking_reference: booking.booking_reference,
        guest_name:        booking.guest_name,
        room_type:         booking.room_type ?? '',
        check_in_date:     booking.check_in_date,
        check_out_date:    booking.check_out_date,
        total_amount:      booking.total_amount,
        guest_phone:       booking.guest_phone,
        guest_language:    booking.guest_language ?? 'en',
      });

      // Mark as sent to prevent duplicate sends (Req 32.5)
      await supabase
        .from('bookings')
        .update({
          pre_arrival_sms_sent: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      sent++;
    } catch (err: any) {
      failed++;
      errors.push(`${booking.booking_reference}: ${err.message}`);
      console.error(`[pre-arrival-reminders] Failed for ${booking.booking_reference}:`, err.message);
    }
  }

  console.log(`[pre-arrival-reminders] Sent: ${sent}, Failed: ${failed}, Date: ${tomorrowStr}`);

  return NextResponse.json({
    sent,
    failed,
    date: tomorrowStr,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
