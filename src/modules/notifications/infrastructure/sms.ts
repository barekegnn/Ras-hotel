// ============================================================
// SMS Notification Service
// src/modules/notifications/infrastructure/sms.ts
//
// Sends SMS via Africa's Talking with 2-attempt retry.
// Multilingual: English, Amharic, Afaan Oromo.
// Requirements 15.1–15.6, 29.4, 32.1–32.7
// ============================================================

import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

// ── Africa's Talking client ───────────────────────────────────

const AT_SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging';
const AT_LIVE_URL    = 'https://api.africastalking.com/version1/messaging';

async function sendRaw(phone: string, message: string): Promise<boolean> {
  const apiKey   = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME ?? 'sandbox';
  const senderId = process.env.AFRICASTALKING_SENDER_ID;

  if (!apiKey) {
    console.warn('[SMS] AFRICASTALKING_API_KEY not set — skipping SMS');
    return false;
  }

  const isLive = username !== 'sandbox';
  const url    = isLive ? AT_LIVE_URL : AT_SANDBOX_URL;

  const body = new URLSearchParams({ username, to: phone, message });
  if (senderId) body.append('from', senderId);

  try {
    const res  = await fetch(url, {
      method:  'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', apiKey },
      body,
    });
    const json = await res.json() as any;
    const recipient = json?.SMSMessageData?.Recipients?.[0];

    if (!res.ok || recipient?.statusCode === 401) {
      console.warn(`[SMS] Rejected: ${recipient?.status ?? res.statusText}`);
      return false;
    }

    console.log(`[SMS] Sent to ${phone} — messageId: ${recipient?.messageId}`);
    return true;
  } catch (err: any) {
    console.error('[SMS] Request failed:', err.message);
    return false;
  }
}

/**
 * Sends an SMS with 2-attempt retry (30 s delay between attempts).
 * On final failure, logs the failure to the bookings table.
 * Requirements 15.5, 32.4
 */
export async function sendSms(
  phone: string,
  message: string,
  bookingId?: string,
  templateId?: string
): Promise<boolean> {
  // Attempt 1
  let success = await sendRaw(phone, message);

  // Attempt 2 after 30 s
  if (!success) {
    await new Promise((r) => setTimeout(r, 30_000));
    success = await sendRaw(phone, message);
  }

  // Log failure to booking record (Req 15.5)
  if (!success && bookingId) {
    try {
      const supabase = createSupabaseServiceClient();
      await supabase
        .from('bookings')
        .update({
          sms_failure_count: supabase.rpc('increment_sms_failure', { booking_id: bookingId }) as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);
    } catch { /* non-critical */ }
  }

  return success;
}

// ── SMS Templates ─────────────────────────────────────────────

type Locale = 'en' | 'am' | 'om';

interface BookingData {
  booking_reference: string;
  guest_name: string;
  room_type: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  guest_phone: string;
  guest_language?: string;
  booking_status?: string;
}

interface HotelConfig {
  hotel_address?: string;
  hotel_phone?: string;
  reception_hours?: string;
  checkin_time?: string;
  app_url?: string;
}

function locale(booking: BookingData): Locale {
  const l = booking.guest_language;
  if (l === 'am' || l === 'om') return l;
  return 'en';
}

// ── Template: Booking Confirmation (Req 15.1–15.2) ───────────

export function bookingConfirmationMessage(b: BookingData, config: HotelConfig): string {
  const lang = locale(b);
  const appUrl = config.app_url ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://hararrashotel.com';
  const lookupUrl = `${appUrl}/lookup`;

  const templates: Record<Locale, string> = {
    en: [
      `✅ Booking Confirmed! Ref: ${b.booking_reference}`,
      `Guest: ${b.guest_name}`,
      `Room: ${b.room_type}`,
      `Check-in: ${b.check_in_date} | Check-out: ${b.check_out_date}`,
      `Total: ETB ${b.total_amount?.toFixed(2)}`,
      `View booking: ${lookupUrl}`,
    ].join('\n'),

    am: [
      `✅ ቦታ ማስያዝ ተረጋግጧል! ቁጥር: ${b.booking_reference}`,
      `እንግዳ: ${b.guest_name}`,
      `ክፍል: ${b.room_type}`,
      `ቼክ-ኢን: ${b.check_in_date} | ቼክ-አውት: ${b.check_out_date}`,
      `ጠቅላላ: ETB ${b.total_amount?.toFixed(2)}`,
      `ቦታ ማስያዝ ይመልከቱ: ${lookupUrl}`,
    ].join('\n'),

    om: [
      `✅ Booking mirkaneeffame! Lakk: ${b.booking_reference}`,
      `Keessumaa: ${b.guest_name}`,
      `Kutaa: ${b.room_type}`,
      `Check-in: ${b.check_in_date} | Check-out: ${b.check_out_date}`,
      `Waliigala: ETB ${b.total_amount?.toFixed(2)}`,
      `Booking ilaali: ${lookupUrl}`,
    ].join('\n'),
  };

  return templates[lang];
}

// ── Template: Check-in Instructions (Req 15.3–15.4) ──────────

export function checkInInstructionsMessage(b: BookingData, config: HotelConfig): string {
  const lang = locale(b);
  const address  = config.hotel_address  ?? 'Harar Jugol, Harar, Ethiopia';
  const phone    = config.hotel_phone    ?? '+251256660027';
  const hours    = config.reception_hours ?? '24/7';
  const ciTime   = config.checkin_time   ?? '14:00';

  const templates: Record<Locale, string> = {
    en: [
      `📋 Check-in Instructions — ${b.booking_reference}`,
      `Check-in time: ${ciTime}`,
      `Address: ${address}`,
      `Reception: ${hours} | Tel: ${phone}`,
      `Please bring: Valid government ID + Booking Reference`,
    ].join('\n'),

    am: [
      `📋 የቼክ-ኢን መመሪያ — ${b.booking_reference}`,
      `የቼክ-ኢን ጊዜ: ${ciTime}`,
      `አድራሻ: ${address}`,
      `ሪሴፕሽን: ${hours} | ስልክ: ${phone}`,
      `ያምጡ: ትክክለኛ መታወቂያ + የቦታ ማስያዝ ቁጥር`,
    ].join('\n'),

    om: [
      `📋 Qajeelfama Check-in — ${b.booking_reference}`,
      `Yeroo check-in: ${ciTime}`,
      `Teessoo: ${address}`,
      `Simsiiraa: ${hours} | Bilbila: ${phone}`,
      `Fidi: ID mootummaa + Lakk. booking`,
    ].join('\n'),
  };

  return templates[lang];
}

// ── Template: Cash Pending (Req 15.6) ────────────────────────

export function cashPendingMessage(b: BookingData, config: HotelConfig): string {
  const lang = locale(b);
  const address = config.hotel_address ?? 'Harar Jugol, Harar, Ethiopia';
  const phone   = config.hotel_phone   ?? '+251256660027';

  const templates: Record<Locale, string> = {
    en: [
      `🏨 Room Reserved — ${b.booking_reference}`,
      `${b.guest_name}, your room is held.`,
      `Please pay ETB ${b.total_amount?.toFixed(2)} at the front desk.`,
      `Check-in: ${b.check_in_date}`,
      `Address: ${address} | Tel: ${phone}`,
    ].join('\n'),

    am: [
      `🏨 ክፍል ተይዟል — ${b.booking_reference}`,
      `${b.guest_name}፣ ክፍልዎ ተይዟል።`,
      `ETB ${b.total_amount?.toFixed(2)} ፊት ለፊት ቢሮ ይክፈሉ።`,
      `ቼክ-ኢን: ${b.check_in_date}`,
      `አድራሻ: ${address} | ስልክ: ${phone}`,
    ].join('\n'),

    om: [
      `🏨 Kutaan qabame — ${b.booking_reference}`,
      `${b.guest_name}, kutaan kee qabameera.`,
      `ETB ${b.total_amount?.toFixed(2)} fuula dura kafali.`,
      `Check-in: ${b.check_in_date}`,
      `Teessoo: ${address} | Bilbila: ${phone}`,
    ].join('\n'),
  };

  return templates[lang];
}

// ── Template: Pre-Arrival Reminder (Req 32.1–32.3) ───────────

export function preArrivalReminderMessage(b: BookingData, config: HotelConfig): string {
  const lang = locale(b);
  const address = config.hotel_address ?? 'Harar Jugol, Harar, Ethiopia';
  const ciTime  = config.checkin_time  ?? '14:00';
  const appUrl  = config.app_url ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://hararrashotel.com';

  const templates: Record<Locale, string> = {
    en: [
      `⏰ Reminder: Check-in tomorrow!`,
      `Ref: ${b.booking_reference} | ${b.guest_name}`,
      `Room: ${b.room_type} | Check-in: ${b.check_in_date} at ${ciTime}`,
      `Address: ${address}`,
      `Ticket: ${appUrl}/lookup`,
    ].join('\n'),

    am: [
      `⏰ ማስታወሻ: ነገ ቼክ-ኢን!`,
      `ቁጥር: ${b.booking_reference} | ${b.guest_name}`,
      `ክፍል: ${b.room_type} | ቼክ-ኢን: ${b.check_in_date} ሰዓት ${ciTime}`,
      `አድራሻ: ${address}`,
      `ቲኬት: ${appUrl}/lookup`,
    ].join('\n'),

    om: [
      `⏰ Yaadachiisa: Boru check-in!`,
      `Lakk: ${b.booking_reference} | ${b.guest_name}`,
      `Kutaa: ${b.room_type} | Check-in: ${b.check_in_date} sa'a ${ciTime}`,
      `Teessoo: ${address}`,
      `Tikeeta: ${appUrl}/lookup`,
    ].join('\n'),
  };

  return templates[lang];
}

// ── Template: Cancellation (Req 16.10) ───────────────────────

export function cancellationMessage(b: BookingData, refundTier: 'full' | 'partial' | 'none'): string {
  const lang = locale(b);
  const refundText: Record<typeof refundTier, Record<Locale, string>> = {
    full:    { en: 'Full refund will be processed.', am: 'ሙሉ ተመላሽ ይሰጣል።', om: 'Deebii guutuu ni kennamaaf.' },
    partial: { en: '50% refund will be processed.', am: '50% ተመላሽ ይሰጣል።', om: 'Deebii 50% ni kennamaaf.' },
    none:    { en: 'No refund applicable per policy.', am: 'ፖሊሲ መሰረት ተመላሽ የለም።', om: 'Deebii hin jiru.' },
  };

  const templates: Record<Locale, string> = {
    en: [`❌ Booking Cancelled — ${b.booking_reference}`, refundText[refundTier].en, `Questions? Contact us.`].join('\n'),
    am: [`❌ ቦታ ማስያዝ ተሰርዟል — ${b.booking_reference}`, refundText[refundTier].am, `ጥያቄ ካለ ያግኙን።`].join('\n'),
    om: [`❌ Booking haqame — ${b.booking_reference}`, refundText[refundTier].om, `Gaaffii yoo qabdu nu quunnamaa.`].join('\n'),
  };

  return templates[lang];
}

// ── Template: Feedback (Req 35.1) ────────────────────────────

export function feedbackMessage(b: BookingData, feedbackToken: string, config: HotelConfig): string {
  const lang = locale(b);
  const appUrl = config.app_url ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://hararrashotel.com';
  const feedbackUrl = `${appUrl}/feedback/${feedbackToken}`;

  const templates: Record<Locale, string> = {
    en: [`🌟 Thank you for staying at Ras Hotel, ${b.guest_name}!`, `Rate your experience (1-5 stars):`, feedbackUrl, `Link valid for 7 days.`].join('\n'),
    am: [`🌟 ራስ ሆቴል ስለ ጎበኙ እናመሰግናለን፣ ${b.guest_name}!`, `ልምድዎን ይገምግሙ (1-5 ኮከብ):`, feedbackUrl, `ሊንክ ለ7 ቀናት ይሰራል።`].join('\n'),
    om: [`🌟 Hoteela Ras daawwatteef galatoomi, ${b.guest_name}!`, `Muuxannoo kee madaali (urjii 1-5):`, feedbackUrl, `Liinkiin guyyaa 7 hojjata.`].join('\n'),
  };

  return templates[lang];
}

// ── High-level helpers called from API routes ─────────────────

/**
 * Fetches hotel config from DB for use in SMS templates.
 */
export async function getHotelConfigForSms(): Promise<HotelConfig> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from('hotel_configuration')
      .select('key, value')
      .in('key', ['hotel_address', 'hotel_phone', 'reception_hours', 'checkin_time']);
    const map = Object.fromEntries((data ?? []).map((c) => [c.key, c.value]));
    return {
      hotel_address:   map.hotel_address,
      hotel_phone:     map.hotel_phone,
      reception_hours: map.reception_hours,
      checkin_time:    map.checkin_time,
      app_url:         process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    };
  } catch {
    return { app_url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' };
  }
}

/**
 * Sends booking confirmation + check-in instructions SMS.
 * Called after payment is confirmed (Req 15.1–15.4).
 */
export async function sendBookingConfirmedSms(booking: BookingData): Promise<void> {
  const config = await getHotelConfigForSms();

  // Send confirmation SMS
  const confirmMsg = bookingConfirmationMessage(booking, config);
  await sendSms(booking.guest_phone, confirmMsg, undefined, 'booking_confirmation');

  // Send check-in instructions SMS (second message, Req 15.3)
  const ciMsg = checkInInstructionsMessage(booking, config);
  await sendSms(booking.guest_phone, ciMsg, undefined, 'checkin_instructions');
}

/**
 * Sends cash-pending SMS for walk-in bookings (Req 15.6).
 */
export async function sendCashPendingSms(booking: BookingData): Promise<void> {
  const config = await getHotelConfigForSms();
  const msg = cashPendingMessage(booking, config);
  await sendSms(booking.guest_phone, msg, undefined, 'cash_pending');
}

/**
 * Sends pre-arrival reminder SMS (Req 32.1).
 */
export async function sendPreArrivalReminderSms(booking: BookingData): Promise<void> {
  const config = await getHotelConfigForSms();
  const msg = preArrivalReminderMessage(booking, config);
  await sendSms(booking.guest_phone, msg, undefined, 'pre_arrival_reminder');
}

/**
 * Sends cancellation SMS (Req 16.10).
 */
export async function sendCancellationSms(booking: BookingData, refundTier: 'full' | 'partial' | 'none'): Promise<void> {
  const msg = cancellationMessage(booking, refundTier);
  await sendSms(booking.guest_phone, msg, undefined, 'cancellation');
}

/**
 * Sends post-stay feedback SMS (Req 35.1).
 */
export async function sendFeedbackSms(booking: BookingData, feedbackToken: string): Promise<void> {
  const config = await getHotelConfigForSms();
  const msg = feedbackMessage(booking, feedbackToken, config);
  await sendSms(booking.guest_phone, msg, undefined, 'feedback');
}
