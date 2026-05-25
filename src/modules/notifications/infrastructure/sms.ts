// ============================================================
// SMS Notification Service
// src/modules/notifications/infrastructure/sms.ts
//
// Sends SMS notifications via Africa's Talking.
// Requirements 24.1–24.6
// ============================================================

import { getBookingById } from '@/modules/booking/infrastructure/repository';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

interface SmsMessage {
  phone: string;
  message: string;
  templateId?: string;
}

interface AfricasTalkingResponse {
  SMSMessageData: {
    Message: string;
    Recipients: Array<{
      statusCode: number;
      number: string;
      cost: string;
      status: string;
      messageId: string;
    }>;
  };
}

const AT_BASE_URL = 'https://api.sandbox.africastalking.com/version1/messaging';
const AT_LIVE_URL = 'https://api.africastalking.com/version1/messaging';

async function sendSmsViaAT(message: SmsMessage): Promise<boolean> {
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;
  const username = process.env.AFRICAS_TALKING_USERNAME ?? 'sandbox';

  if (!apiKey) {
    console.warn('[sendSmsViaAT] AFRICAS_TALKING_API_KEY not configured');
    return false;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction ? AT_LIVE_URL : AT_BASE_URL;

  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('to', message.phone);
  formData.append('message', message.message);

  try {
    const res = await fetch(`${baseUrl}/send`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey,
      },
      body: formData,
    });

    const json = (await res.json()) as AfricasTalkingResponse;
    const recipient = json.SMSMessageData?.Recipients?.[0];

    if (recipient?.statusCode === 101) {
      console.warn(`[sendSmsViaAT] Message rejected: ${recipient.status}`);
      return false;
    }

    console.log(`[sendSmsViaAT] Message sent to ${message.phone} (${recipient?.messageId})`);
    return true;
  } catch (err: any) {
    console.error('[sendSmsViaAT] Request failed:', err.message);
    return false;
  }
}

/**
 * Sends a booking confirmation SMS to a guest.
 * Requirement 24.1
 */
export async function sendBookingConfirmationSms(bookingId: string): Promise<boolean> {
  const booking = await getBookingById(bookingId);
  if (!booking) return false;

  const nights = Math.round((new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000);
  const message = [
    `Booking confirmed! ${booking.booking_reference}`,
    `Guest: ${booking.guest_name}`,
    `Check-in: ${booking.check_in_date} · Check-out: ${booking.check_out_date}`,
    `${nights} night(s) · ETB ${booking.total_amount?.toFixed(2)}`,
    `Status: ${booking.booking_status}`,
    `Contact: +251 XXX XXX XXX`,
  ].join('\n');

  return sendSmsViaAT({
    phone: booking.guest_phone,
    message,
    templateId: 'booking_confirmation',
  });
}

/**
 * Sends a check-in reminder SMS to a guest.
 * Requirement 24.2
 */
export async function sendCheckinReminderSms(bookingId: string): Promise<boolean> {
  const booking = await getBookingById(bookingId);
  if (!booking) return false;

  const message = [
    `Welcome to Ras Hotel! ${booking.booking_reference}`,
    `Check-in time: 14:00 today`,
    `Come to the front desk with your ID.`,
    `Questions? Call +251 XXX XXX XXX`,
  ].join('\n');

  return sendSmsViaAT({
    phone: booking.guest_phone,
    message,
    templateId: 'checkin_reminder',
  });
}

/**
 * Sends a checkout/feedback SMS to a guest.
 * Requirement 24.3
 */
export async function sendFeedbackSms(bookingId: string): Promise<boolean> {
  const booking = await getBookingById(bookingId);
  if (!booking) return false;

  const message = [
    `Thank you for staying at Ras Hotel!`,
    `${booking.guest_name}, please rate your experience:`,
    `https://rashotel.example.com/feedback/${booking.id}`,
    `Your feedback helps us improve.`,
  ].join('\n');

  return sendSmsViaAT({
    phone: booking.guest_phone,
    message,
    templateId: 'feedback_request',
  });
}

/**
 * Sends an outstanding payment reminder SMS.
 * Requirement 24.4
 */
export async function sendPaymentReminderSms(bookingId: string): Promise<boolean> {
  const booking = await getBookingById(bookingId);
  if (!booking || booking.booking_status !== 'Reserved_Unpaid') return false;

  const message = [
    `Payment pending: ${booking.booking_reference}`,
    `Outstanding: ETB ${booking.total_amount?.toFixed(2)}`,
    `Check-in: ${booking.check_in_date}`,
    `Please complete payment. Contact us at +251 XXX XXX XXX`,
  ].join('\n');

  return sendSmsViaAT({
    phone: booking.guest_phone,
    message,
    templateId: 'payment_reminder',
  });
}

/**
 * Records an SMS message in the audit log for historical reference.
 * Requirement 24.5
 */
export async function recordSmsLog(bookingId: string, templateId: string, success: boolean): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from('notifications').insert({
    booking_id:       bookingId,
    notification_type: 'sms',
    template_id:      templateId,
    status:           success ? 'sent' : 'failed',
    created_at:       new Date().toISOString(),
    payload:          { template: templateId, success },
  }).catch(() => {
    // Don't block if audit logging fails
    console.warn('[recordSmsLog] Failed to record SMS in audit log');
  });
}

/**
 * Queues an SMS for asynchronous sending.
 * Used by background jobs (Task 20.2).
 */
export async function enqueueSms(bookingId: string, templateId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from('notification_queue').insert({
    booking_id:       bookingId,
    template_id:      templateId,
    status:           'pending',
    created_at:       new Date().toISOString(),
  }).catch((err) => {
    console.error('[enqueueSms] Failed to queue SMS:', err.message);
  });
}
