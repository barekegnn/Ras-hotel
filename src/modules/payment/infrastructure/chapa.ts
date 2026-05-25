// ============================================================
// Chapa Payment Service
// src/modules/payment/infrastructure/chapa.ts
//
// Handles payment initiation and webhook verification.
// Requirements 31.1–31.7, 7.1–7.8
// ============================================================

import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { updateBookingStatus } from '@/modules/booking/infrastructure/repository';
import { writeAuditLog } from '@/modules/audit/domain/logger';
import { AuditActionType, EntityType } from '@/shared/types/domain';

const CHAPA_API = 'https://api.chapa.co/v1';

interface InitializePaymentInput {
  bookingId:      string;
  bookingRef:     string;
  guestName:      string;
  guestEmail:     string;
  guestPhone:     string;
  amount:         number;
  successUrl:     string;
  callbackUrl:    string;
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
    amount:              input.amount,
    currency:            'ETB',
    email:               input.guestEmail,
    first_name:          input.guestName.split(' ')[0],
    last_name:           input.guestName.split(' ').slice(1).join(' ') || 'Guest',
    phone_number:        input.guestPhone,
    tx_ref:              `RAS-${input.bookingRef}-${Date.now()}`,
    callback_url:        input.callbackUrl,
    return_url:          input.successUrl,
    customization: {
      title:       'Ras Hotel',
      description: `Booking ${input.bookingRef} — ${input.amount} ETB`,
      logo:        'https://rashotel.example.com/logo.png', // TODO: set actual URL
    },
    meta: {
      booking_id:        input.bookingId,
      booking_reference: input.bookingRef,
    },
  };

  const res = await fetch(`${CHAPA_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ChapaCheckoutResponse;
  if (json.status !== 'success' || !json.data?.checkout_url) {
    throw new Error(`Chapa payment init failed: ${json.message}`);
  }
  return json.data.checkout_url;
}

/**
 * Verifies a Chapa webhook signature.
 * Requirements 7.5
 */
export function verifyChapaWebhook(body: string, signature: string): boolean {
  const secretKey = process.env.CHAPA_SECRET_KEY ?? '';
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha256', secretKey).update(body).digest('hex');
  return hash === signature;
}

/**
 * Handles a Chapa payment verification webhook.
 * Updates booking status to "Paid" on successful payment.
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

  // 3. Idempotency check — ensure we only process once
  const supabase = createSupabaseServiceClient();
  const { data: existing } = await supabase
    .from('payment_records')
    .select('id')
    .eq('transaction_reference', txRef)
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log(`[handleChapaWebhook] Already processed ${txRef}`);
    return;
  }

  // 4. Record payment in DB
  const { error: recordError } = await supabase.from('payment_records').insert({
    booking_id:             bookingId,
    amount:                 transaction.amount,
    currency:               transaction.currency ?? 'ETB',
    payment_method:         'online_chapa',
    transaction_reference:  txRef,
    transaction_status:     transaction.status,
    received_at:            new Date().toISOString(),
  });

  if (recordError) {
    console.error(`[handleChapaWebhook] Failed to record payment: ${recordError.message}`);
    throw recordError;
  }

  // 5. Update booking status to "Paid"
  await updateBookingStatus(bookingId, 'Paid', 'system');

  // 6. Write audit log
  await writeAuditLog({
    actor:       'system',
    action_type: AuditActionType.CashCollectionEvent,
    entity_type: EntityType.Payment,
    entity_id:   bookingId,
    description: `Online payment of ETB ${transaction.amount} received via Chapa for booking ${transaction.meta?.booking_reference}`,
    metadata:    { txRef, amount: transaction.amount, chapa_response: transaction },
  });
}
