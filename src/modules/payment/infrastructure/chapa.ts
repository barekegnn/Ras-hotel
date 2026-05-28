// ============================================================
// Chapa Payment Service
// src/modules/payment/infrastructure/chapa.ts
//
// Handles payment initiation and webhook verification.
// Requirements 31.1–31.7, 7.1–7.8
// ============================================================

import crypto from 'crypto';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { updateBookingStatus } from '@/modules/booking/infrastructure/repository';
import { updateRoomStatus } from '@/modules/rooms/infrastructure/repository';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';
import { sendBookingConfirmedSms } from '@/modules/notifications/infrastructure/sms';

const CHAPA_API = 'https://api.chapa.co/v1';

interface InitializePaymentInput {
  bookingId:   string;
  bookingRef:  string;
  guestName:   string;
  guestEmail:  string;
  guestPhone:  string;
  amount:      number;
  successUrl:  string;
  callbackUrl: string;
}

interface ChapaCheckoutResponse {
  status:  string;
  message: string;
  data?: {
    checkout_url: string;
  };
}

/**
 * Initializes a Chapa payment checkout for a booking.
 * Requirements 7.1–7.3
 */
export async function initializeChapaPayment(input: InitializePaymentInput): Promise<string> {
  const secretKey = process.env.CHAPA_SECRET_KEY;
  if (!secretKey) throw new Error('CHAPA_SECRET_KEY not configured');

  const payload = {
    amount:       String(input.amount),   // Chapa expects amount as a string
    currency:     'ETB',
    email:        input.guestEmail,
    first_name:   input.guestName.split(' ')[0],
    last_name:    input.guestName.split(' ').slice(1).join(' ') || 'Guest',
    // Chapa requires international format: +251XXXXXXXXX
    phone_number: input.guestPhone.startsWith('0')
      ? '+251' + input.guestPhone.slice(1)
      : input.guestPhone,
    tx_ref:       `RAS-${input.bookingRef}-${Date.now()}`,
    callback_url: input.callbackUrl,
    return_url:   input.successUrl,
    customization: {
      title:       'Ras Hotel',
      description: `Booking ${input.bookingRef} - ${input.amount} ETB`,
    },
    meta: {
      booking_id:        input.bookingId,
      booking_reference: input.bookingRef,
    },
  };

  console.log('[chapa-init] Sending payload:', JSON.stringify({ ...payload, meta: payload.meta }));

  const res = await fetch(`${CHAPA_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ChapaCheckoutResponse;
  if (json.status !== 'success' || !json.data?.checkout_url) {
    // Stringify the full response so nested objects are visible in logs
    throw new Error(`Chapa payment init failed (HTTP ${res.status}): ${JSON.stringify(json)}`);
  }
  return json.data.checkout_url;
}

/**
 * Verifies a Chapa webhook HMAC-SHA256 signature.
 * Requirement 7.5
 */
export function verifyChapaWebhook(body: string, signature: string): boolean {
  const secretKey = process.env.CHAPA_WEBHOOK_SECRET ?? process.env.CHAPA_SECRET_KEY ?? '';
  const hash = crypto.createHmac('sha256', secretKey).update(body).digest('hex');
  return hash === signature;
}

/**
 * Handles a Chapa payment verification webhook.
 * Verifies the transaction with Chapa, then transitions the booking to 'paid'
 * and the room to 'reserved_paid'.
 * Requirements 7.6–7.8
 */
export async function handleChapaWebhook(txRef: string): Promise<void> {
  const secretKey = process.env.CHAPA_SECRET_KEY;
  if (!secretKey) throw new Error('CHAPA_SECRET_KEY not configured');

  // 1. Verify transaction with Chapa
  const res = await fetch(`${CHAPA_API}/transaction/verify/${txRef}`, {
    headers: { 'Authorization': `Bearer ${secretKey}` },
  });

  const json = (await res.json()) as any;
  if (json.status !== 'success') {
    throw new Error(`Chapa verification failed: ${json.message}`);
  }

  const transaction = json.data;
  if (transaction.status !== 'success') {
    console.warn(`[handleChapaWebhook] Transaction ${txRef} not successful: ${transaction.status}`);
    return;
  }

  // 2. Extract booking ID from metadata
  const bookingId = transaction.meta?.booking_id;
  if (!bookingId) {
    console.error(`[handleChapaWebhook] No booking_id in transaction ${txRef}`);
    return;
  }

  // 3. Idempotency check — only process once
  const supabase = createSupabaseServiceClient();
  const { data: existing } = await supabase
    .from('payment_records')
    .select('id')
    .eq('chapa_tx_ref', txRef)
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`[handleChapaWebhook] Already processed ${txRef}`);
    return;
  }

  // 4. Record payment — using the actual payment_records schema columns
  const { error: recordError } = await supabase.from('payment_records').insert({
    booking_id:     bookingId,
    payment_method: 'chapa',
    chapa_tx_ref:   txRef,
    chapa_status:   transaction.status,
    amount:         transaction.amount,
  });

  if (recordError) {
    console.error(`[handleChapaWebhook] Failed to record payment: ${recordError.message}`);
    throw recordError;
  }

  // 5. Transition booking status: reserved_unpaid → paid
  const updatedBooking = await updateBookingStatus(bookingId, 'paid', 'system');

  // 6. Update room status to reflect confirmed payment
  await updateRoomStatus(updatedBooking.room_id, 'reserved_paid');

  // 7. Send confirmation + check-in instructions SMS (Req 15.1–15.4)
  void sendBookingConfirmedSms({
    booking_reference: transaction.meta?.booking_reference ?? bookingId,
    guest_name:        transaction.customer?.name ?? 'Guest',
    room_type:         '',   // not in Chapa payload — fetched from booking if needed
    check_in_date:     '',
    check_out_date:    '',
    total_amount:      transaction.amount,
    guest_phone:       transaction.customer?.phone ?? '',
    guest_language:    'en',
  }).catch(console.warn);

  // 8. Write audit log
  await writeAuditLog({
    actor:       'system',
    action_type: AuditActionType.PaymentVerification,
    entity_type: EntityType.Payment,
    entity_id:   bookingId,
    description: `Online payment of ETB ${transaction.amount} confirmed via Chapa for booking ${transaction.meta?.booking_reference ?? bookingId}`,
    metadata:    { txRef, amount: transaction.amount },
  });
}
