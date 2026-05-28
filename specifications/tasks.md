# Implementation Plan: Ras Hotel Management System

## Overview

This plan converts the Ras Hotel Management System design into incremental coding tasks. The implementation follows a bottom-up approach: database schema and core types first, then service logic, then API routes, then UI components, and finally integration and wiring. Each task builds on the previous ones so there is no orphaned code at any stage.

The system is built with Next.js 14 (App Router), TypeScript, Tailwind CSS + shadcn/ui, Supabase (PostgreSQL + pgvector + Auth + Realtime + Storage), Supabase Edge Functions, Africa's Talking SMS, Chapa payment gateway, Gemini 2.5 Flash + text-embedding-004, next-intl, Recharts, and @react-pdf/renderer.

**Project Structure:** The codebase follows a modular architecture organized by feature modules under `src/modules/`, with each module containing `domain/` (business logic), `infrastructure/` (database/external APIs), and `application/` (service layer) subdirectories. Shared utilities live in `src/shared/`, and UI components are organized in `src/components/`. App routes use Next.js 14 route groups: `(guest)` for public pages and `(staff)` for the dashboard.

---

## Tasks

- [ ] 1. Project scaffolding, configuration, and database schema
  - [ ] 1.1 Initialise Next.js 14 App Router project with TypeScript, Tailwind CSS, and shadcn/ui
    - Run `create-next-app` with TypeScript and App Router; install and initialise shadcn/ui; configure `tailwind.config.ts` with the hotel brand palette; set up `tsconfig.json` with strict mode and path aliases (`@/`)
    - Install all required dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `next-intl`, `next-pwa`, `@react-pdf/renderer`, `qrcode`, `recharts`, `fast-check`, `vitest`, `@testing-library/react`
    - Create `.env.local.example` documenting all required environment variables (Supabase URL/anon/service keys, Chapa secret, Africa's Talking key, Gemini API key, Google Maps embed key)
    - _Requirements: 11.5, 12.1_

  - [ ] 1.2 Set up Supabase project and apply full database schema migration
    - Create all tables defined in the data model: `rooms`, `room_photos`, `seasonal_rates`, `bookings`, `booking_status_history`, `cash_collection_events`, `payment_records`, `pdf_tickets`, `guest_notes`, `shift_notes`, `notifications`, `staff_accounts`, `audit_log`, `hotel_configuration`, `documents`, `document_chunks`, `feedback`
    - Apply all indexes defined in the design: `idx_bookings_reference`, `idx_bookings_phone`, `idx_bookings_room_dates`, `idx_bookings_status`, `idx_bookings_checkin_date`, `idx_audit_log_actor`, `idx_audit_log_action_at`, `idx_audit_log_entity`, `idx_document_chunks_embedding` (ivfflat), `idx_seasonal_rates_type_dates`
    - Enable `pgvector` extension; configure Supabase Auth with custom `role` claim (receptionist / manager); enable Realtime on `rooms`, `bookings`, `notifications`, `shift_notes` tables
    - Write Row-Level Security policies: public read on `rooms`/`hotel_configuration`; authenticated staff read/write on dashboard tables; append-only insert-only on `audit_log`
    - Seed `hotel_configuration` with default values (check-in 14:00, check-out 12:00, no-show threshold 20:00, cancellation window 48 hours)
    - _Requirements: 10.5, 11.3, 37.6_

  - [ ] 1.3 Generate TypeScript types from Supabase schema and create shared domain types
    - Run `supabase gen types typescript` and commit the output to `src/shared/types/supabase.ts`
    - Define domain types in `src/shared/types/domain.ts`: `BookingStatus` enum (all 8 statuses from Req 38.1), `BookingStatusTransition` map, `PaymentMethod` enum, `UserRole` enum, `RoomStatus` enum, `IndexStatus` enum
    - Define API response types in `src/shared/types/api.ts`: `ApiError`, `ApiResponse<T>`, structured error shape from design
    - _Requirements: 38.1_

- [ ] 2. Core business logic — booking lifecycle and validation
  - [ ] 2.1 Implement booking status transition validator
    - Create `src/modules/booking/domain/transitions.ts` exporting `PERMITTED_TRANSITIONS: Record<BookingStatus, BookingStatus[]>` and `validateTransition(current: BookingStatus, next: BookingStatus): { allowed: boolean; validNextStatuses: BookingStatus[] }`
    - The permitted transitions map MUST exactly match Requirement 38.2
    - _Requirements: 38.2, 38.3_

  - [ ]* 2.2 Write property test for booking status transition validity (Property 1)
    - **Property 1: Booking Status Transition Validity**
    - Use fast-check to generate random (currentStatus, attemptedNextStatus) pairs from the BookingStatus enum
    - Assert: `validateTransition` returns `allowed: true` only for pairs in `PERMITTED_TRANSITIONS`; all other pairs return `allowed: false` with a non-empty `validNextStatuses` array
    - **Validates: Requirements 38.2, 38.3**

  - [ ]* 2.3 Write property test for terminal status immutability (Property 11)
    - **Property 11: Terminal Status Immutability**
    - Use fast-check to generate random terminal statuses (Checked_Out, Cancelled_Full_Refund, Cancelled_Partial_Refund, Cancelled_No_Refund, No_Show) and any attempted next status
    - Assert: `validateTransition` always returns `allowed: false` for any terminal status as current
    - **Validates: Requirements 38.6**

  - [ ] 2.4 Implement cancellation refund tier calculator
    - Create `src/modules/booking/domain/cancellation.ts` exporting `calculateRefundTier(cancellationAt: Date, checkInDate: Date, policyWindowHours: number): 'full' | 'partial' | 'none'`
    - Full refund: cancellation more than `policyWindowHours` before check-in; partial: within window; none: on check-in day or after
    - _Requirements: 16.5, 16.6, 16.7, 34.6_

  - [ ]* 2.5 Write property test for cancellation refund tier consistency (Property 4)
    - **Property 4: Cancellation Refund Tier Consistency**
    - Use fast-check to generate random (cancellationTimestamp, checkInDate, policyWindowHours) triples
    - Assert: the refund tier returned by `calculateRefundTier` is consistent with the computed time difference and the policy window
    - **Validates: Requirements 16.5, 16.6, 16.7, 34.6**

  - [ ] 2.6 Implement booking reference generator and uniqueness validator
    - Create `src/modules/booking/domain/reference.ts` exporting `generateBookingReference(): string` producing a unique alphanumeric reference (e.g., `RAS-XXXXXX`)
    - _Requirements: 3.4, 7.1_

  - [ ]* 2.7 Write property test for booking reference uniqueness (Property 8)
    - **Property 8: Booking Reference Uniqueness**
    - Use fast-check to generate batches of N references (N between 10 and 1000)
    - Assert: all N references in each batch are distinct (Set size equals N)
    - **Validates: Requirements 3.4, 7.1**

  - [ ] 2.8 Implement Ethiopian phone number validator and date range validator
    - Create `src/shared/lib/validation.ts` exporting `validateEthiopianPhone(phone: string): boolean` using regex `^(\+251|0)(9|7)\d{8}$` and `validateDateRange(checkIn: Date, checkOut: Date): boolean` (check-out strictly after check-in)
    - _Requirements: 13.3, 34.7_

  - [ ] 2.9 Implement seasonal rate overlap detector
    - Create `src/modules/pricing/domain/seasonalRates.ts` exporting `detectSeasonalRateOverlap(existing: SeasonalRate[], candidate: SeasonalRate): SeasonalRate | null` and `getApplicableRate(roomType: string, date: Date, rates: SeasonalRate[], basePrice: number): number`
    - _Requirements: 26.6, 26.7_

  - [ ]* 2.10 Write property test for seasonal rate non-overlap (Property 7)
    - **Property 7: Seasonal Rate Non-Overlap**
    - Use fast-check to generate random sets of seasonal rates for the same room type with varying date ranges
    - Assert: `detectSeasonalRateOverlap` correctly identifies all conflicting rate pairs; non-overlapping pairs return null
    - **Validates: Requirements 26.7**

  - [ ] 2.11 Implement occupancy rate calculator
    - Create `src/modules/reports/domain/occupancy.ts` exporting `calculateOccupancyRate(occupiedRooms: number, totalActiveRooms: number): number` returning a percentage rounded to two decimal places
    - _Requirements: 25.1, 24.1_

  - [ ] 2.12 Implement cash collection event validator
    - Create `src/modules/booking/domain/cashCollection.ts` exporting `validateCashCollectionEvent(event: Partial<CashCollectionEvent>): { valid: boolean; errors: string[] }` — rejects events missing bookingId, receptionistId, amount ≤ 0, or missing timestamp
    - _Requirements: 31.3, 31.5, 4.9_

  - [ ]* 2.13 Write property test for cash collection accountability (Property 5)
    - **Property 5: Cash Collection Accountability**
    - Use fast-check to generate random CashCollectionEvent inputs (valid and invalid combinations)
    - Assert: events with missing bookingId, receptionistId, amount ≤ 0, or missing timestamp are always rejected; valid events always pass
    - **Validates: Requirements 31.3, 31.5, 4.9**

- [ ] 3. Checkpoint — core business logic
  - Ensure all property tests and unit tests for booking lifecycle, validation, and pricing pass. Ask the user if questions arise before proceeding.


- [ ] 4. Supabase Auth integration and RBAC middleware
  - [ ] 4.1 Configure Supabase Auth with custom role claim and create auth helpers
    - Create `src/modules/auth/infrastructure/supabase.ts` with server-side Supabase client factory using `@supabase/ssr` (`createServerClient`, `createBrowserClient`)
    - Create `src/modules/auth/domain/session.ts` exporting `getSession()`, `requireAuth(role?: UserRole)`, and `getUserRole()` helpers for use in API routes and Server Components
    - _Requirements: 11.1, 11.5_

  - [ ] 4.2 Implement RBAC middleware for Next.js App Router
    - Create `src/middleware.ts` using Supabase SSR to validate JWT on every request to `/dashboard/*` and `/api/v1/*` routes
    - Enforce role-based access: Receptionists blocked from `/dashboard/reports/*`, `/dashboard/settings/*`, and corresponding API routes; Managers have full access
    - Redirect unauthenticated requests to `/login`; return 401/403 JSON for API routes
    - _Requirements: 11.3_

  - [ ] 4.3 Implement account lockout logic and session timeout
    - Create `src/modules/auth/domain/lockout.ts` exporting `recordFailedLogin(username: string)` and `checkAccountLocked(username: string): { locked: boolean; unlocksAt?: Date }` using the `failed_login_attempts` and `locked_until` columns on `staff_accounts`
    - Implement 60-minute session inactivity timeout by setting Supabase JWT expiry and handling token refresh failure with redirect to login
    - _Requirements: 11.2, 11.4_

  - [ ] 4.4 Build login page and staff authentication UI
    - Create `src/app/(staff)/login/page.tsx` with a username/password form using shadcn/ui `Input` and `Button` components
    - On successful login, redirect to `/dashboard`; on failure, display error message and remaining attempts; on lockout, display lockout duration
    - Enforce HTTPS by setting `Strict-Transport-Security` header in `next.config.js`
    - _Requirements: 11.1, 11.2, 11.5_

- [ ] 5. Room management — data layer and API
  - [ ] 5.1 Implement room repository functions
    - Create `src/modules/rooms/infrastructure/repository.ts` with: `listActiveRooms()`, `getRoomById(id: string)`, `createRoom(data: CreateRoomInput)`, `updateRoom(id: string, data: UpdateRoomInput)`, `deactivateRoom(id: string)`, `getRoomWithCurrentBooking(id: string)`
    - All functions use the Supabase server client and return typed results
    - _Requirements: 26.1, 26.2, 26.3, 26.4_

  - [ ] 5.2 Implement room availability checker
    - Create `src/modules/rooms/domain/availability.ts` exporting `checkRoomAvailability(roomId: string, checkIn: Date, checkOut: Date, excludeBookingId?: string): Promise<boolean>` — queries `bookings` for confirmed bookings (not in cancelled/no-show statuses) with overlapping dates
    - _Requirements: 3.1, 28.1_

  - [ ]* 5.3 Write property test for no overlapping confirmed bookings (Property 2)
    - **Property 2: No Overlapping Confirmed Bookings for Same Room**
    - Use fast-check to generate random sets of bookings for the same room with varying date ranges and statuses
    - Assert: `checkRoomAvailability` correctly identifies all overlapping confirmed booking pairs; cancelled/no-show bookings do not block availability
    - **Validates: Requirements 28.1, 28.2**

  - [ ] 5.4 Implement seasonal rate repository and price resolver
    - Create `src/modules/pricing/infrastructure/repository.ts` with: `listSeasonalRates()`, `createSeasonalRate(data)`, `deleteSeasonalRate(id: string)`, `getActiveRatesForRoomType(roomType: string, startDate: Date, endDate: Date)`
    - Create `src/modules/pricing/domain/resolver.ts` exporting `resolveNightlyRate(roomType: string, date: Date): Promise<number>` — applies seasonal rate if active, otherwise returns base price
    - _Requirements: 26.5, 26.6, 26.9_

  - [ ] 5.5 Implement room photo upload to Supabase Storage
    - Create `src/modules/rooms/infrastructure/photos.ts` exporting `uploadRoomPhoto(roomId: string, file: File): Promise<string>` (returns storage URL) and `deleteRoomPhoto(photoId: string)`
    - Enforce maximum 10 photos per room at the application layer
    - _Requirements: 26.1, 26.3_

  - [ ] 5.6 Create room API routes
    - Implement `GET /api/v1/rooms` (public) — returns active rooms with current availability status and resolved nightly rate
    - Implement `GET /api/v1/rooms/[id]` (public) — returns room detail with photos and availability calendar data
    - Implement `POST /api/v1/rooms`, `PATCH /api/v1/rooms/[id]`, `DELETE /api/v1/rooms/[id]` (Manager only) — create, update, deactivate rooms; write audit log entries
    - Implement `POST /api/v1/rooms/[id]/rates`, `DELETE /api/v1/rooms/rates/[rateId]` (Manager only) — create/delete seasonal rates with overlap validation
    - _Requirements: 26.1–26.9_

- [ ] 6. Booking engine — core booking flow
  - [ ] 6.1 Implement room lock service using Supabase Edge Function and pg_advisory_lock
    - Create Supabase Edge Function `room-lock` that acquires `pg_advisory_lock(room_id_hash)` for 10 minutes; expose `acquireLock(roomId: string, sessionId: string)` and `releaseLock(roomId: string, sessionId: string)`
    - Create `src/modules/booking/infrastructure/roomLock.ts` as the Next.js-side client for the Edge Function
    - Implement lock expiry: a cron Edge Function runs every minute to release expired locks and mark rooms available
    - _Requirements: 3.2, 3.3, 3.6_

  - [ ]* 6.2 Write property test for room lock preventing double booking (Property 3)
    - **Property 3: Room Lock Prevents Double Booking**
    - Use fast-check to simulate concurrent lock acquisition attempts for the same room
    - Assert: only the first caller succeeds; all subsequent attempts while the lock is active return a rejection
    - **Validates: Requirements 3.2, 3.3, 3.6**

  - [ ] 6.3 Implement booking repository
    - Create `src/modules/booking/infrastructure/repository.ts` with: `createBooking(data: CreateBookingInput)`, `getBookingById(id: string)`, `getBookingByReference(ref: string)`, `getBookingByReferenceAndPhone(ref: string, phone: string)`, `updateBookingStatus(id: string, newStatus: BookingStatus, actor: string)`, `listBookings(filters: BookingFilters)`, `getBookingsByPhone(phone: string)`
    - `updateBookingStatus` MUST call `validateTransition` before writing; on rejection, write an audit log entry for the rejected attempt and throw
    - `createBooking` MUST call `checkRoomAvailability` inside a Postgres transaction to prevent race conditions
    - _Requirements: 38.2, 38.3, 38.4, 28.1_

  - [ ] 6.4 Implement booking status history recorder
    - Create `src/modules/booking/domain/statusHistory.ts` exporting `recordStatusTransition(bookingId: string, previousStatus: BookingStatus, newStatus: BookingStatus, actor: string)` — inserts into `booking_status_history` and `audit_log` atomically
    - _Requirements: 38.4, 38.5_

  - [ ] 6.5 Create booking API routes — create, lookup, modify, cancel
    - Implement `POST /api/v1/bookings` (public) — validates guest registration fields (Req 13.1–13.3), acquires room lock, resolves price, creates booking, triggers PDF and SMS generation asynchronously; returns booking reference and confirmation data
    - Implement `GET /api/v1/bookings/lookup` (public) — accepts `ref` + `phone` query params; returns booking details without revealing which field was wrong on mismatch (Req 30.3)
    - Implement `PATCH /api/v1/bookings/[id]` (guest token or staff) — date modification with availability check, price diff display, pre-arrival reminder rescheduling
    - Implement `DELETE /api/v1/bookings/[id]` (guest token or staff) — cancellation with refund tier calculation, room release, SMS notification
    - _Requirements: 3.1–3.12, 13.1–13.6, 16.1–16.12, 30.1–30.6_

  - [ ] 6.6 Create staff booking management API routes
    - Implement `POST /api/v1/bookings` staff path (Receptionist+) — manual booking creation with cash/paid status, special request, staff accountability recording (Req 4.9)
    - Implement `POST /api/v1/bookings/[id]/checkin` (Receptionist+) — validates booking is Paid, updates status to Checked_In, records staff ID and timestamp, updates room status
    - Implement `POST /api/v1/bookings/[id]/checkout` (Receptionist+) — validates room is Occupied, checks for outstanding payment, updates status to Checked_Out, records staff ID and timestamp, triggers feedback SMS
    - Implement `POST /api/v1/bookings/[id]/extend` (Receptionist+) — availability check for additional nights, price calculation with seasonal rates, audit log entry
    - Implement `POST /api/v1/bookings/[id]/no-show` (Receptionist+) — marks No_Show, releases room, records staff ID and timestamp
    - Implement `POST /api/v1/bookings/[id]/cash-payment` (Receptionist+) — validates not already paid, creates Cash_Collection_Event, transitions status to Paid, audit log entry
    - _Requirements: 4.1–4.9, 8.1–8.7, 18.1–18.6, 20.9, 31.1–31.7, 36.1–36.8_

- [ ] 7. Checkpoint — booking engine
  - Ensure all booking lifecycle tests pass, including status transitions, availability checks, and cash collection. Ask the user if questions arise before proceeding.


- [ ] 8. Payment integration — Chapa gateway and cash recording
  - [ ] 8.1 Implement Chapa payment service
    - Create `src/modules/payment/infrastructure/chapa.ts` exporting `initiatePayment(bookingId, amount, guestPhone, txRef)` and `verifyPayment(txRef)`
    - Store Chapa API key in environment variable; never expose in client-side code
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.2 Implement Chapa webhook handler with HMAC verification and idempotency
    - Create `POST /api/v1/payments/webhook` — verify Chapa HMAC-SHA256 signature before processing; check `chapa_tx_ref` for duplicate delivery (idempotency); on success, transition booking to Paid and trigger PDF + SMS generation; on failure, update booking status and notify guest
    - _Requirements: 5.3, 5.4, 5.7_

  - [ ] 8.3 Implement manual payment verification API route
    - Create `POST /api/v1/payments/[id]/verify` (Manager only) — marks transaction as verified (Paid) or rejected (Payment Failed), records Manager user ID and timestamp, notifies guest on rejection
    - Create `GET /api/v1/payments/pending` (Manager only) — lists all bookings with Pending Verification status including transaction reference numbers
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 8.4 Implement payment initiation API route
    - Create `POST /api/v1/payments/initiate` (public) — creates a `payment_records` row, calls Chapa initiate, returns redirect URL; handles payment session timeout by releasing room lock
    - _Requirements: 5.1, 5.2, 5.7_

- [ ] 9. PDF ticket generation and QR code
  - [ ] 9.1 Implement PDF ticket generator using @react-pdf/renderer
    - Create `src/modules/tickets/domain/generator.ts` exporting `generatePdfTicket(booking, language)` returning a Buffer
    - The PDF MUST include: guest name, Booking_Reference, room type, check-in date, check-out date, QR code (encoding Booking_Reference via the `qrcode` package), hotel address, reception phone number, and check-in instructions (Req 7.7)
    - Generate PDF in the guest's selected language using next-intl message keys
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.7, 29.5_

  - [ ] 9.2 Implement PDF storage and signed URL generation
    - Create `src/modules/tickets/infrastructure/storage.ts` exporting `storePdfTicket(bookingId, pdfBuffer, language, version)` — uploads to Supabase Storage bucket `pdf-tickets` and inserts a `pdf_tickets` row; returns a signed download URL valid for 7 days
    - Enforce 500 KB file size limit; log a warning if exceeded
    - _Requirements: 7.2, 7.4_

  - [ ] 9.3 Create PDF ticket download API route
    - Implement `GET /api/v1/bookings/[id]/ticket` (public with booking token) — retrieves the stored PDF from Supabase Storage and streams it to the client within 3 seconds; regenerates if not found
    - _Requirements: 7.4, 7.6_

  - [ ]* 9.4 Write property test for PDF ticket idempotence (Property 9)
    - **Property 9: PDF Ticket Idempotence**
    - Use fast-check to generate random confirmed booking data objects
    - Assert: calling the PDF data assembler (the pure data-preparation function, not the renderer) twice with the same input produces identical output — same guest name, booking reference, room type, dates, and QR content
    - **Validates: Requirements 7.6, 7.3**

- [ ] 10. SMS notification service
  - [ ] 10.1 Implement Africa's Talking SMS client
    - Create `src/modules/sms/infrastructure/client.ts` wrapping the Africa's Talking API with `sendSms(to, message, language)` — includes 2-attempt retry with 30-second delay; logs failure to booking record on final failure and creates a Dashboard warning notification
    - _Requirements: 15.5, 32.4_

  - [ ] 10.2 Implement SMS template system with multilingual support
    - Create `src/modules/sms/domain/templates.ts` with typed template functions for each SMS type: `bookingConfirmationSms`, `checkInInstructionsSms`, `cashPendingSms`, `cancellationSms`, `preArrivalReminderSms`, `feedbackSms`
    - Each template function accepts a booking object and a `SupportedLocale` and returns the message string in the correct language using next-intl message keys
    - _Requirements: 15.1–15.6, 29.4, 32.1–32.7_

  - [ ]* 10.3 Write property test for multilingual SMS language consistency (Property 12)
    - **Property 12: Multilingual SMS Language Consistency**
    - Use fast-check to generate random booking records with non-English language selections (Amharic, Afaan Oromo)
    - Assert: every SMS template function called with a non-English locale returns a string that does NOT equal the English version of the same template
    - **Validates: Requirements 29.4, 32.7**

  - [ ] 10.4 Implement pre-arrival reminder scheduler as Supabase Edge Function (cron)
    - Create Edge Function `pre-arrival-reminders` scheduled to run daily at 08:00 local time — queries bookings with Paid status and check-in date = tomorrow; sends Pre_Arrival_Reminder SMS for each; reschedules on booking date modification; cancels on booking cancellation
    - _Requirements: 32.1, 32.2, 32.3, 32.5, 32.6_

  - [ ] 10.5 Implement no-show escalation as Supabase Edge Function (cron)
    - Create Edge Function `no-show-escalation` scheduled to run every 30 minutes — queries bookings with check-in date = today, status = Paid, no check-in recorded; at 18:00 local time creates overdue Notification_Alert; at No_Show_Threshold time escalates to Manager with "Action Required" indicator
    - _Requirements: 20.6, 20.7, 20.11_

- [ ] 11. Audit log service
  - [ ] 11.1 Implement audit log writer
    - Create `src/modules/audit/domain/logger.ts` exporting `writeAuditLog(entry)` — inserts into `audit_log` table; the function is append-only (no update/delete operations); called from all service functions that perform auditable actions
    - Auditable action types MUST cover all types listed in Requirement 37.5
    - _Requirements: 37.5, 37.6_

  - [ ]* 11.2 Write property test for audit log completeness (Property 6)
    - **Property 6: Audit Log Completeness**
    - Use fast-check to generate random auditable action inputs for each action type in Requirement 37.5
    - Assert: `writeAuditLog` always produces an entry with non-null actor, action_type, entity_type, entity_id, and action_at; the function never throws for valid inputs
    - **Validates: Requirements 37.5, 37.6**

  - [ ] 11.3 Create audit log API route
    - Implement `GET /api/v1/reports/audit` (Manager only) — supports filtering by staff account, action type, entity type, and date range; returns paginated results within 5 seconds; supports CSV export
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.7, 37.8_

- [ ] 12. Checkpoint — payments, tickets, SMS, and audit log
  - Ensure payment webhook, PDF generation, SMS delivery, and audit log writing all work end-to-end in the local Supabase environment. Ask the user if questions arise before proceeding.


- [ ] 13. Real-time subscriptions and notification system
  - [ ] 13.1 Implement Supabase Realtime subscription hooks for the staff dashboard
    - Create `src/shared/hooks/useRoomStatus.ts` — subscribes to `rooms` table changes via Supabase Realtime; updates the room grid state in real time
    - Create `src/shared/hooks/useBookingNotifications.ts` — subscribes to `bookings` INSERT and UPDATE events; triggers in-app Notification_Alert display
    - Create `src/shared/hooks/useNotifications.ts` — subscribes to `notifications` INSERT events; updates unread badge count
    - Create `src/shared/hooks/useShiftNotes.ts` — subscribes to `shift_notes` INSERT events; updates the home screen shift note list
    - All hooks implement auto-reconnect with exponential backoff on disconnect
    - _Requirements: 10.2, 20.1, 20.3, 23.5, 33.5_

  - [ ] 13.2 Implement notification repository and API
    - Create `src/modules/notifications/infrastructure/repository.ts` with: `createNotification(type, payload, priority)`, `listNotifications(filters)`, `acknowledgeNotification(id, staffId)`, `getUnreadCount()`
    - Create `GET /api/v1/notifications` (Receptionist+) — returns notification history for past 7 days
    - Create `PATCH /api/v1/notifications/[id]/acknowledge` (Receptionist+) — marks notification as read, records staff ID and timestamp
    - _Requirements: 20.1, 20.2, 20.4, 20.5_

- [ ] 14. Staff dashboard — core UI components
  - [ ] 14.1 Build the room status grid component
    - Create `src/components/staff/RoomStatusGrid.tsx` — renders all rooms in a grid with color-coded status indicators (Green=Available, Red=Occupied, Yellow=Reserved_Unpaid, Blue=Reserved_Paid); displays summary counts at the top; supports filter by status; clicking a room opens a detail panel
    - Wire to `useRoomStatus` hook for real-time updates
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [ ] 14.2 Build the Receptionist Dashboard Home screen
    - Create `src/app/(staff)/dashboard/page.tsx` — displays today's arrival count, departure count, available rooms count, outstanding payment count, overdue arrivals count (all real-time); three most recent shift notes; unread notification badge; quick-action buttons for "New Manual Booking", "Scan QR Code", "Today's Arrivals"
    - Overdue arrivals count displayed in warning colour when non-zero
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7_

  - [ ] 14.3 Build the Today's Arrivals and Departures views
    - Create `src/app/(staff)/dashboard/arrivals/page.tsx` — lists all bookings with check-in date = today, sorted by status (Paid first); highlights Reserved_Unpaid in distinct colour; shows summary counts; check-in action moves booking to In-House section in real time
    - Create `src/app/(staff)/dashboard/departures/page.tsx` — lists all bookings with check-out date = today, sorted by Room_Status (Occupied first); check-out action updates room status in real time
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ] 14.4 Build the QR scanner interface
    - Create `src/app/(staff)/dashboard/qr-scan/page.tsx` — uses the browser's camera API (via a QR scanning library) to scan QR codes; on valid scan, retrieves and displays booking details within 2 seconds; shows unpaid payment warning for Reserved_Unpaid bookings; displays Special_Request; provides confirm check-in action
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ] 14.5 Build the booking search and detail views
    - Create `src/app/(staff)/dashboard/bookings/page.tsx` — search by guest name, phone, booking reference, room number, check-in/check-out date; filter by status, date range, room type; partial-name search support; results within 3 seconds
    - Create `src/app/(staff)/dashboard/bookings/[id]/page.tsx` — full booking detail: guest details, payment history, Special_Request, Guest_Notes indicator, status history timeline, available actions (check-in, check-out, extend, no-show, record cash payment, cancel)
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 38.5_

  - [ ] 14.6 Build the manual booking form
    - Create `src/app/(staff)/dashboard/bookings/new/page.tsx` — form collecting guest name, age, sex, phone (with Ethiopian format validation), nationality, room selection, check-in/check-out dates, payment method (Cash Paid / Cash Pending), Special_Request; displays calculated total price before save; rejects conflicting rooms with conflict details
    - On save with "Paid" cash status, records Receptionist Staff_Account identifier and timestamp (Req 4.9); generates PDF ticket
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ] 14.7 Build the shift handover log UI
    - Create `src/app/(staff)/dashboard/shift-notes/page.tsx` — shift note creation form with optional "Urgent" tag; searchable archive of past 90 days; urgent notes display with distinct visual indicator until Manager acknowledges
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_

  - [ ] 14.8 Build the guest profile lookup view
    - Create `src/app/(staff)/dashboard/guests/[phone]/page.tsx` — displays most recently submitted registration details (name, age, sex, nationality) and chronological booking history; Guest_Notes section with add/edit/delete (Manager only) capability; "no guest found" message for unknown phone numbers
    - Create `GET /api/v1/guests/[phone]` (Receptionist+) and `POST /api/v1/guests/[phone]/notes` (Receptionist+) API routes
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

- [ ] 15. Checkpoint — staff dashboard core UI
  - Ensure the room grid, arrivals/departures, QR scanner, booking search, and manual booking form all render correctly and connect to the API. Ask the user if questions arise before proceeding.


- [ ] 16. Manager-only features — reports, settings, and staff management
  - [ ] 16.1 Build revenue summary report
    - Create `src/app/(staff)/dashboard/reports/revenue/page.tsx` — displays today's Revenue_Summary on load; date picker for historical dates; itemised cash payments by Receptionist; itemised mobile money payments by Chapa tx ref; discrepancy warning when cash total differs from expected; revenue breakdown by room type; CSV export
    - Create `GET /api/v1/reports/revenue` (Manager only) — accepts date range query params; returns aggregated revenue data within 3 seconds
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7_

  - [ ] 16.2 Build occupancy analytics report
    - Create `src/app/(staff)/dashboard/reports/occupancy/page.tsx` — line chart of daily Occupancy_Rate (Recharts); total bookings, total revenue, average length of stay, average occupancy for selected range; breakdown by room type and payment method; top 5 busiest dates; cancellation count and rate; CSV export; 10-second target for 90-day+ ranges
    - Create `GET /api/v1/reports/occupancy` (Manager only) — accepts date range; returns analytics data
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8_

  - [ ] 16.3 Build guest feedback report and feedback submission form
    - Create `src/app/(staff)/dashboard/reports/feedback/page.tsx` — lists all submitted ratings with guest name, booking reference, check-out date, star rating, comment; displays average star rating for selected date range; low-rating (1-2 star) entries highlighted
    - Create `src/app/(guest)/[locale]/feedback/[token]/page.tsx` — mobile-optimised star rating form (1-5) with optional 500-character comment; token expiry check (7 days); no authentication required
    - Create `GET /api/v1/reports/feedback` (Manager only) and `POST /api/v1/feedback/[token]` (public) API routes; low-rating submission triggers Manager Notification_Alert
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6, 35.7, 35.8_

  - [ ] 16.4 Build room and pricing management UI
    - Create `src/app/(staff)/dashboard/settings/rooms/page.tsx` — room list with create/edit/deactivate actions; room form with room number, type, floor, description, base price, photo upload (max 10); deactivation warning showing affected future bookings
    - Create `src/app/(staff)/dashboard/settings/pricing/page.tsx` — seasonal rate calendar view; create/delete seasonal rates with overlap validation; conflict error display
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8, 26.9_

  - [ ] 16.5 Build staff account management UI
    - Create `src/app/(staff)/dashboard/settings/staff/page.tsx` — staff account list with name, username, role, status, last login; create account form (name, username, role, temp password); edit role; deactivate (with self-deactivation prevention); password reset
    - Create `GET /api/v1/staff`, `POST /api/v1/staff`, `PATCH /api/v1/staff/[id]` (Manager only) API routes; all mutations write audit log entries
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8_

  - [ ] 16.6 Build hotel configuration settings UI
    - Create `src/app/(staff)/dashboard/settings/hotel/page.tsx` — form displaying current values for all Hotel_Configuration parameters (hotel name, address, phone, reception hours, check-in time, check-out time, no-show threshold, cancellation window); validation: check-out time must be strictly before check-in time; saves write audit log entries
    - Create `GET /api/v1/config` (public read) and `PATCH /api/v1/config` (Manager only) API routes
    - _Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 34.6, 34.7, 34.8_

  - [ ] 16.7 Build chatbot document management UI
    - Create `src/app/(staff)/dashboard/settings/documents/page.tsx` — document list with filename, upload date, indexing status (pending/indexed/failed); upload form (PDF/text, max 20 MB); replace-on-same-name behaviour; delete with confirmation; retry indexing for failed documents
    - Create `POST /api/v1/documents` and `DELETE /api/v1/documents/[id]` (Manager only) API routes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 16.8 Build pending refunds management UI
    - Create `src/app/(staff)/dashboard/settings/refunds/page.tsx` — lists all bookings flagged for refund (Cancelled_Full_Refund, Cancelled_Partial_Refund) with guest name, booking reference, cancellation time, refund amount due, original payment method; Manager can mark refund as processed (records Manager ID, amount, timestamp)
    - _Requirements: 16.8, 16.9_


- [ ] 17. RAG-based AI chatbot
  - [ ] 17.1 Implement document ingestion pipeline
    - Create `src/modules/rag/infrastructure/ingestion.ts` exporting `ingestDocument(documentId)` — reads document from Supabase Storage, splits into chunks, generates embeddings via Google text-embedding-004 API, stores chunks with embeddings in `document_chunks` table; updates `documents.index_status` to "indexed" on success or "failed" on error; preserves previously indexed content on failure
    - _Requirements: 2.1, 2.3, 2.4_

  - [ ] 17.2 Implement RAG retrieval and response generation
    - Create `src/modules/rag/domain/rag.ts` exporting `generateChatbotResponse(query, locale, conversationHistory)` — embeds the query using text-embedding-004, performs cosine similarity search on `document_chunks` via pgvector, passes top-k chunks as context to Gemini 2.5 Flash, returns response in the requested language; returns "unavailable" message when no relevant chunks found (Req 1.3)
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ] 17.3 Create chatbot API route with session management
    - Create `POST /api/v1/chatbot/message` (public) — accepts query, locale, and session ID; enforces 30-minute session inactivity reset; returns response within 5 seconds under normal conditions; no authentication required
    - _Requirements: 1.2, 1.4, 1.6_

  - [ ] 17.4 Build the chatbot UI component
    - Create `src/components/guest/ChatbotWidget.tsx` — text input and response display; language selector (English/Amharic/Afaan Oromo); 30-minute inactivity reset; accessible without authentication; embedded on the landing page
    - Create `src/app/(guest)/[locale]/chatbot/page.tsx` as a full-page chatbot view
    - _Requirements: 1.1, 1.4, 1.5, 29.1_


- [ ] 18. Guest-facing frontend — public PWA
  - [ ] 18.1 Set up next-intl for multilingual routing
    - Configure `next-intl` with locale routing for `en`, `am` (Amharic), and `om` (Afaan Oromo); create translation message files for all guest-facing strings; implement language selector component visible on first page visit; default to English; fall back to English for missing translations and log the missing key
    - _Requirements: 29.1, 29.2, 29.3, 29.6_

  - [ ] 18.2 Build the hotel landing page
    - Create `src/app/(guest)/[locale]/page.tsx` — hotel overview, room highlights, embedded Google Maps iframe showing hotel location with link to Google Maps for navigation; hotel address and contact info displayed alongside map; plain-text address fallback when map service unavailable; chatbot widget entry point
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 11.6_

  - [ ] 18.3 Build the room listing and detail pages
    - Create `src/app/(guest)/[locale]/rooms/page.tsx` — lists all active rooms with room type, price per night (seasonal rate applied), photos, and availability calendar; real-time availability status
    - Create `src/app/(guest)/[locale]/rooms/[roomId]/page.tsx` — full room detail with photos, description, amenities, price, availability calendar, and "Book Now" button
    - _Requirements: 3.1, 3.7_

  - [ ] 18.4 Build the multi-step booking flow
    - Create `src/app/(guest)/[locale]/book/[roomId]/details/page.tsx` — guest registration form (name, age, sex, phone with Ethiopian format validation, nationality); Special_Request field; Cancellation_Policy display
    - Create `src/app/(guest)/[locale]/book/[roomId]/payment/page.tsx` — payment method selection (TeleBirr, CBE Birr, Cash); Chapa redirect for mobile money; cash path creates Reserved_Unpaid booking; 10-minute countdown timer shown when 2 minutes remain on room lock
    - Create `src/app/(guest)/[locale]/book/[roomId]/confirm/page.tsx` — booking confirmation screen showing Booking_Reference, room type, check-in/check-out dates, total amount paid; PDF ticket download link
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 5.1, 5.2, 5.3, 5.4, 5.5, 13.1, 13.2, 13.3_

  - [ ] 18.5 Build the guest booking lookup and management pages
    - Create `src/app/(guest)/[locale]/booking/lookup/page.tsx` — public form accepting Booking_Reference and phone number; displays booking details, Check_In_Instructions, PDF download link, and outstanding payment info for Reserved_Unpaid bookings; error message does not reveal which field was wrong
    - Create `src/app/(guest)/[locale]/booking/[ref]/manage/page.tsx` — displays current booking details, full Cancellation_Policy with refund tiers, options to modify dates or cancel; date modification shows price difference and requires confirmation; rejects modifications for past check-in dates
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.11, 30.1, 30.2, 30.3, 30.4, 30.5, 30.6_

  - [ ] 18.6 Build the post-stay feedback form
    - Create `src/app/(guest)/[locale]/feedback/[token]/page.tsx` — lightweight mobile-optimised form with star rating selector (1-5 stars) and optional comment field (max 500 characters); validates feedback token is not expired (7-day window); displays "feedback window closed" message for expired tokens; accessible without authentication; no personal details required beyond pre-populated booking data
    - Create `POST /api/v1/feedback/[token]` — validates token, stores rating and comment against booking record with submission timestamp
    - _Requirements: 35.1, 35.2, 35.3, 35.4, 35.8_

  - [ ] 18.7 Configure PWA with next-pwa
    - Install and configure `next-pwa` in `next.config.js`; create `public/manifest.json` with hotel name, icons (192x192, 512x512), theme colour, display mode "standalone"
    - Configure Service Worker to cache guest-facing routes: `/`, `/rooms`, `/rooms/[id]`, `/book/*`, `/booking/lookup`, `/chatbot`
    - Create offline fallback page `src/app/(guest)/offline/page.tsx` with clear "You are offline" message and cached content notice
    - Ensure all guest-facing pages render correctly on screen widths 320px to 1920px without horizontal scrolling; use touch-optimized controls with 44x44px tap targets on touch devices
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.7, 12.8_

  - [ ]* 18.8 Optimize PWA performance for 3G connections
    - Implement code splitting for route-based chunks; lazy-load images with next/image; compress all assets; configure CDN caching headers
    - Run Google Lighthouse audit on all primary guest-facing pages; ensure PWA score ≥ 90 and mobile performance score ≥ 70
    - Measure and verify initial page load time < 3 seconds on simulated 3G connection
    - _Requirements: 12.5, 12.6, 12.8_

- [ ] 19. Checkpoint — guest-facing PWA
  - Ensure all guest-facing pages render correctly in all three languages, the booking flow completes end-to-end, PWA installs on mobile devices, and offline caching works. Ask the user if questions arise before proceeding.


- [ ] 20. Integration and wiring — connect all components
  - [ ] 20.1 Wire booking creation to PDF and SMS generation
    - Update `POST /api/v1/bookings` to trigger asynchronous PDF generation and SMS sending (confirmation + check-in instructions) immediately after booking confirmation; handle SMS delivery failures with Dashboard warning
    - _Requirements: 7.1, 7.4, 7.5, 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ] 20.2 Wire check-out to feedback SMS
    - Update `POST /api/v1/bookings/[id]/checkout` to generate a unique feedback token with 7-day expiry and trigger feedback SMS with Feedback_Link within 60 minutes of check-out
    - _Requirements: 35.1, 35.3_

  - [ ] 20.3 Wire booking cancellation to refund workflow
    - Update `DELETE /api/v1/bookings/[id]` to calculate refund tier, add booking to "Pending Refunds" list for Manager, send cancellation SMS with refund amount, and record cancellation action in audit log
    - _Requirements: 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 16.12_

  - [ ] 20.4 Wire booking modification to pre-arrival reminder rescheduling
    - Update `PATCH /api/v1/bookings/[id]` to cancel any existing scheduled pre-arrival reminder for the old check-in date and schedule a new reminder for the new check-in date
    - _Requirements: 32.5, 32.6_

  - [ ] 20.5 Wire room status updates to real-time dashboard
    - Ensure all booking status transitions (check-in, check-out, no-show, cancellation) trigger Supabase Realtime events that update the room status grid, arrivals/departures lists, and notification badges in real time
    - _Requirements: 10.2, 17.5, 17.6, 18.4, 20.1, 20.3_

  - [ ] 20.6 Wire cash collection to revenue summary
    - Ensure all Cash_Collection_Events are immediately reflected in the Manager's Revenue_Summary for the current day, itemised by Receptionist Staff_Account identifier
    - _Requirements: 24.1, 24.3, 31.6_

  - [ ] 20.7 Wire low-rating feedback to Manager alerts
    - Update feedback submission handler to check star rating; if rating is 1 or 2, create a Notification_Alert for all logged-in Managers with Guest name, Booking_Reference, and comment
    - _Requirements: 35.7_

  - [ ] 20.8 Wire hotel configuration changes to system logic
    - Ensure all Hotel_Configuration updates (check-in/check-out times, no-show threshold, cancellation window) are immediately applied to SMS templates, PDF tickets, no-show escalation logic, and refund tier calculations
    - _Requirements: 34.3, 34.5, 34.6_

- [ ] 21. Final checkpoint — end-to-end integration
  - Ensure all tests pass, including property tests, unit tests, and integration tests. Run a full end-to-end test covering: guest books online → pays via Chapa → receives SMS and PDF → checks in via QR scan → extends stay → checks out → submits feedback. Ask the user if questions arise before proceeding.


- [ ] 22. Deployment preparation and environment configuration
  - [ ] 22.1 Set up production environment variables
    - Document all required environment variables in `.env.production.example`: Supabase production URL/keys, Chapa production secret, Africa's Talking production key, Gemini API key, Google Maps API key
    - Configure Vercel environment variables for production deployment
    - _Requirements: 11.5_

  - [ ] 22.2 Configure Supabase production project
    - Create production Supabase project; apply all database migrations; enable pgvector extension; configure RLS policies; enable Realtime on required tables; set up Supabase Storage buckets (`pdf-tickets`, `room-photos`, `documents`) with appropriate access policies
    - Seed production `hotel_configuration` table with actual hotel values
    - _Requirements: 1.2, 10.5, 37.6_

  - [ ] 22.3 Deploy Supabase Edge Functions
    - Deploy `room-lock`, `pre-arrival-reminders`, and `no-show-escalation` Edge Functions to production Supabase project; configure cron schedules for reminder and escalation functions
    - _Requirements: 6.1, 10.4, 20.6, 20.7, 20.11, 32.1_

  - [ ] 22.4 Configure Chapa webhook endpoint
    - Register production webhook URL (`https://[production-domain]/api/v1/payments/webhook`) with Chapa; verify HMAC signature validation is working; test with Chapa sandbox before going live
    - _Requirements: 5.3, 5.4, 8.2_

  - [ ] 22.5 Set up Africa's Talking SMS sender ID
    - Register hotel's SMS sender ID with Africa's Talking; configure production API credentials; test SMS delivery to Ethiopian phone numbers in all three languages
    - _Requirements: 15.1, 15.5, 29.4, 32.1_

  - [ ] 22.6 Configure security headers and rate limiting
    - Set `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Content-Security-Policy` headers in `next.config.js`; implement rate limiting on authentication endpoints (10 req/min per IP) and payment endpoints (5 req/min per IP)
    - _Requirements: 11.5_

  - [ ] 22.7 Set up monitoring and error tracking
    - Configure error tracking service (e.g., Sentry) for production; set up uptime monitoring for critical endpoints; configure Supabase database performance monitoring; set up alerts for failed SMS deliveries, payment webhook failures, and audit log anomalies
    - _Requirements: 15.5, 8.2_

- [ ] 23. Final verification and launch checklist
  - [ ] 23.1 Run full test suite
    - Execute all unit tests, property tests, integration tests, and E2E tests against production-like environment; verify all tests pass
    - _Requirements: All_

  - [ ] 23.2 Verify RBAC and authentication
    - Test Manager and Receptionist role restrictions; verify account lockout after 3 failed logins; verify session timeout after 60 minutes inactivity; verify deactivated accounts cannot log in
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 27.4_

  - [ ] 23.3 Verify booking lifecycle state machine
    - Test all permitted status transitions; verify rejected transitions are logged; verify terminal statuses cannot transition; verify status history is recorded for all transitions
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6_

  - [ ] 23.4 Verify payment flows
    - Test TeleBirr payment end-to-end; test CBE Birr payment end-to-end; test cash payment recording; test Chapa webhook idempotency; test payment verification by Manager
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 8.2_

  - [ ] 23.5 Verify SMS delivery in all languages
    - Send test SMS for each template type (confirmation, check-in instructions, pre-arrival reminder, cancellation, feedback) in English, Amharic, and Afaan Oromo; verify correct language is used based on guest's selection
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 29.4, 32.1, 32.7, 35.1_

  - [ ] 23.6 Verify PDF ticket generation and QR scanning
    - Generate PDF tickets for bookings in all three languages; verify QR codes scan correctly; verify PDF contains all required information; verify file size < 500 KB
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 29.5_

  - [ ] 23.7 Verify real-time updates
    - Test room status grid updates in real time when bookings change; test notification alerts appear within 10 seconds; test shift notes appear on home screen immediately; test Realtime reconnection after network interruption
    - _Requirements: 10.2, 20.1, 20.2, 20.3, 23.5_

  - [ ] 23.8 Verify audit log completeness
    - Perform sample actions for each auditable action type; verify all actions appear in audit log with correct actor, timestamp, and entity details; verify audit log is append-only
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7, 37.8_

  - [ ] 23.9 Verify PWA installation and offline functionality
    - Install PWA on Android and iOS devices; verify offline caching works for guest-facing pages; verify Service Worker updates correctly; verify Lighthouse scores meet targets (PWA ≥ 90, mobile performance ≥ 70)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [ ] 23.10 Verify chatbot functionality
    - Test chatbot with sample queries in all three languages; verify RAG retrieval returns relevant document chunks; verify 30-minute inactivity reset; verify chatbot accessible without authentication
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 23.11 Perform security review
    - Review OWASP Top 10 compliance; verify SQL injection prevention via parameterized queries; verify CSRF protection on all state-changing endpoints; verify Chapa webhook signature validation; verify input sanitization for XSS prevention; verify HTTPS enforcement
    - _Requirements: 11.5_

  - [ ] 23.12 Create Manager and Receptionist training documentation
    - Document all Dashboard workflows with screenshots; create quick-reference guides for common tasks (manual booking, QR check-in, cash collection, shift handover); document hotel configuration settings and their effects
    - _Requirements: All staff-facing features_

- [ ] 24. Final checkpoint — production readiness
  - All tests pass, all integrations verified, security review complete, documentation ready. System is ready for production deployment. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: database and core logic first, then services, then API routes, then UI components, then integration
- All SMS, PDF, and UI content must support English, Amharic, and Afaan Oromo
- The system uses TypeScript throughout for type safety
- Supabase provides database, auth, real-time, storage, and background jobs in a single managed platform
- The PWA architecture ensures the system works on intermittent connections common in the Ethiopian market
- Every cash collection and status transition is tied to a specific staff member for accountability
- The booking lifecycle state machine prevents invalid status transitions
- The audit log provides complete traceability of all staff actions