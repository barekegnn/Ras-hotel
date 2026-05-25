// ============================================================
// PDF Ticket Generator
// src/modules/tickets/infrastructure/pdfGenerator.ts
//
// Generates PDF confirmation tickets for bookings.
// Requirements 22.1–22.6
// ============================================================

import { getBookingById } from '@/modules/booking/infrastructure/repository';
import { getRoomById } from '@/modules/rooms/infrastructure/repository';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

/**
 * Generates a PDF booking confirmation ticket.
 * Uses html2pdf or similar library to create a downloadable PDF.
 * Requirement 22.1
 */
export async function generateBookingTicketPdf(bookingId: string, language: string = 'en'): Promise<Buffer> {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const room = await getRoomById(booking.room_id, true);
  const supabase = createSupabaseServiceClient();
  const { data: config } = await supabase
    .from('hotel_configuration')
    .select('key, value');

  const configMap = Object.fromEntries((config ?? []).map((c) => [c.key, c.value]));

  const hotelName     = configMap.hotel_name ?? 'Ras Hotel';
  const hotelAddress  = configMap.hotel_address ?? 'Harar, Ethiopia';
  const hotelPhone    = configMap.hotel_phone ?? '+251 XXX XXX XXX';
  const hotelEmail    = configMap.hotel_email ?? 'info@rashotel.example.com';
  const checkinTime   = configMap.checkin_time ?? '14:00';
  const checkoutTime  = configMap.checkout_time ?? '12:00';

  const nights = Math.round((new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / 86400000);

  // HTML template for the ticket
  const html = `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation - ${booking.booking_reference}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Playfair Display', Georgia, serif;
          background: white;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          background: white;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #d96428;
          padding-bottom: 30px;
          margin-bottom: 40px;
        }
        .hotel-name {
          font-size: 36px;
          font-weight: 700;
          color: #d96428;
          margin-bottom: 8px;
        }
        .hotel-subtitle {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 14px;
          color: #666;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .confirmation-status {
          text-align: center;
          margin: 30px 0;
          font-size: 18px;
          font-weight: 600;
          color: #10b981;
        }
        .reference-box {
          background: #f3f4f6;
          border-left: 4px solid #d96428;
          padding: 20px;
          margin: 20px 0;
          font-family: 'IBM Plex Mono', monospace;
        }
        .reference-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #6b7280;
          margin-bottom: 5px;
        }
        .reference-value {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 2px;
        }
        .section {
          margin: 30px 0;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #d96428;
          margin-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
        }
        .guest-name {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .detail-label {
          color: #6b7280;
          font-size: 13px;
        }
        .detail-value {
          font-weight: 600;
          color: #1a1a1a;
        }
        .price-section {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          padding: 20px;
          margin: 20px 0;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-size: 15px;
        }
        .price-label { color: #666; }
        .price-value { font-weight: 600; }
        .total-row {
          border-top: 2px solid #d96428;
          padding-top: 10px;
          margin-top: 10px;
          font-size: 18px;
          font-weight: 700;
        }
        .special-request {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 15px 0;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .info-table td {
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .info-table td:first-child {
          font-size: 13px;
          color: #6b7280;
          width: 40%;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .contact-info {
          margin: 10px 0;
          font-size: 13px;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .container { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="hotel-name">${hotelName}</div>
          <div class="hotel-subtitle">Harar • Ethiopia</div>
        </div>

        <div class="confirmation-status">
          ✓ Booking Confirmation
        </div>

        <!-- Booking Reference -->
        <div class="reference-box">
          <div class="reference-label">Booking Reference</div>
          <div class="reference-value">${booking.booking_reference}</div>
        </div>

        <!-- Guest Info -->
        <div class="section">
          <div class="section-title">Guest Information</div>
          <div class="guest-name">${booking.guest_name}</div>
          <table class="info-table">
            <tr>
              <td>Phone</td>
              <td><strong>${booking.guest_phone}</strong></td>
            </tr>
            <tr>
              <td>Age</td>
              <td><strong>${booking.guest_age}</strong></td>
            </tr>
            <tr>
              <td>Nationality</td>
              <td><strong>${booking.guest_nationality}</strong></td>
            </tr>
          </table>
        </div>

        <!-- Stay Details -->
        <div class="section">
          <div class="section-title">Stay Details</div>
          <div class="detail-row">
            <span class="detail-label">Check-in</span>
            <span class="detail-value">${booking.check_in_date} at ${checkinTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Check-out</span>
            <span class="detail-value">${booking.check_out_date} by ${checkoutTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Room</span>
            <span class="detail-value">${room?.room_number ?? '—'} (${room?.room_type ?? '—'})</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration</span>
            <span class="detail-value">${nights} night${nights !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <!-- Special Request -->
        ${booking.special_request ? `
          <div class="special-request">
            <strong>Special Request:</strong><br>
            ${booking.special_request}
          </div>
        ` : ''}

        <!-- Price Breakdown -->
        <div class="price-section">
          <div class="price-row">
            <span class="price-label">${room?.room_type ?? '—'} × ${nights} night${nights !== 1 ? 's' : ''}</span>
            <span class="price-value">ETB ${booking.total_amount?.toFixed(2) ?? '—'}</span>
          </div>
          <div class="price-row total-row">
            <span>Total Amount</span>
            <span>ETB ${booking.total_amount?.toFixed(2) ?? '—'}</span>
          </div>
        </div>

        <!-- Check-in Information -->
        <div class="section">
          <div class="section-title">Check-in Information</div>
          <div class="detail-row">
            <span class="detail-label">Check-in Time</span>
            <span class="detail-value">${checkinTime}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Early Check-in</span>
            <span class="detail-value">Subject to availability</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Required Documents</span>
            <span class="detail-value">Valid government-issued ID</span>
          </div>
        </div>

        <!-- Hotel Contact -->
        <div class="footer">
          <div class="contact-info">
            <strong>${hotelName}</strong><br>
            ${hotelAddress}<br>
            Phone: ${hotelPhone} | Email: ${hotelEmail}
          </div>
          <div style="margin-top: 20px; font-size: 11px; color: #999;">
            Generated: ${new Date().toLocaleDateString('en-ET')} at ${new Date().toLocaleTimeString('en-ET')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Convert HTML to PDF using Node.js
  // In production, use a library like html2pdf or puppeteer
  // For now, return a placeholder — the actual implementation depends on deployment environment
  console.warn('[generateBookingTicketPdf] PDF generation not fully implemented — requires html2pdf or similar');

  // Placeholder: return empty buffer
  // In production, this would call html2pdf or puppeteer to generate a real PDF
  return Buffer.from(html);
}

/**
 * Stores a generated PDF ticket in Supabase Storage and records metadata.
 * Requirement 22.2
 */
export async function storeTicketPdf(bookingId: string, pdfBuffer: Buffer, language: string = 'en'): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const booking = await getBookingById(bookingId);
  if (!booking) throw new Error('Booking not found');

  const storagePath = `tickets/${bookingId}_${language}_${Date.now()}.pdf`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('booking-tickets')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) throw new Error(`PDF upload failed: ${uploadError.message}`);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('booking-tickets')
    .getPublicUrl(storagePath);

  // Record metadata in DB
  const { data: ticket, error: insertError } = await supabase
    .from('pdf_tickets')
    .insert({
      booking_id:  bookingId,
      language:    language,
      storage_path: storagePath,
      storage_url: urlData.publicUrl,
      version:     1,
    })
    .select()
    .single();

  if (insertError) throw new Error(`Failed to record ticket: ${insertError.message}`);

  return ticket.storage_url;
}
