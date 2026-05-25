// ============================================================
// POST /api/v1/payments/chapa-webhook
// src/app/api/v1/payments/chapa-webhook/route.ts
//
// Receives payment confirmation from Chapa.
// Verifies signature and updates booking status.
// Requirements 7.5–7.8
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { handleChapaWebhook, verifyChapaWebhook } from '@/modules/payment/infrastructure/chapa';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-chapa-signature') ?? '';

    // Verify webhook is authentic
    if (!verifyChapaWebhook(rawBody, signature)) {
      console.warn('[chapa-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { tx_ref } = body;

    if (!tx_ref) {
      return NextResponse.json({ error: 'Missing tx_ref' }, { status: 400 });
    }

    // Process the payment
    await handleChapaWebhook(tx_ref);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[chapa-webhook] Error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Chapa sends GET requests to verify the endpoint exists
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
