# Ras Hotel Management System

A production-grade hotel management and booking platform built for Ras Hotel in Harar, Ethiopia.

## 🎯 Overview

**Ras Hotel** is a full-stack Next.js 14 application combining operational staff tools, guest-facing booking, and comprehensive property management. Built with exceptional UX/UI and rigorous testing.

### Key Features

- **Staff Dashboard** (Receptionist + Manager roles)
  - Real-time room status grid with live occupancy
  - Today's arrivals/departures with one-click check-in/out
  - Manual booking creation with instant price calculation
  - QR code scanner for contactless guest check-in
  - Comprehensive booking search and management
  - Shift handover notes and notification center
  - Audit log of all operations

- **Guest Experience**
  - Beautiful online booking flow with room selection
  - Real-time availability checking
  - Secure Chapa payment integration (ETB)
  - Booking lookup by reference + phone
  - PDF ticket download
  - Special request tracking

- **Operational Excellence**
  - Payment processing (cash + online Chapa)
  - SMS notifications via Africa's Talking
  - PDF ticket generation
  - Booking status lifecycle management
  - Stay extension support
  - No-show and cancellation handling
  - 10-minute room locking during payment
  - Comprehensive audit trail

- **Data Integrity**
  - Property-based testing for critical flows
  - Role-based access control (RLS + middleware)
  - Atomic transaction handling
  - Idempotent payment webhooks
  - Append-only audit logging

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Radix UI
- **Backend**: Next.js API routes, Supabase PostgreSQL, Supabase Storage
- **Auth**: Supabase Auth with RLS policies
- **Payment**: Chapa (online) + Cash
- **SMS**: Africa's Talking
- **Testing**: Vitest + Fast-Check (property-based tests)
- **Hosting**: Vercel (recommended)

### Database
- PostgreSQL 15+ with pgvector extension
- Real-time subscriptions via Supabase
- Row-level security (RLS) on all tables
- Append-only audit log with triggers
- Seasonal rate management with overlap detection

### Design System
- **Staff**: IBM Plex Sans (structured, operational) + terracotta/teal palette
- **Guest**: Playfair Display + Source Serif 4 (warm, Ethiopian hospitality) + generous spacing
- **Colors**: Brand #d96428 (terracotta), Harar #5a917b (teal), with semantic greens/reds/yellows

## 📁 Project Structure

```
ras-hotel/
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_room_lock_functions.sql
├── src/
│   ├── app/
│   │   ├── (staff)/
│   │   │   ├── login/
│   │   │   └── dashboard/
│   │   │       ├── (home, rooms, arrivals, departures, bookings, qr-scan, shift-notes)
│   │   │       └── bookings/[id]/ (detail page)
│   │   ├── (guest)/
│   │   │   ├── page.tsx (landing)
│   │   │   ├── book/ (booking flow)
│   │   │   └── lookup/ (find reservation)
│   │   ├── api/v1/
│   │   │   ├── auth/
│   │   │   ├── rooms/
│   │   │   ├── bookings/
│   │   │   ├── payments/
│   │   │   └── notifications/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── middleware.ts
│   ├── components/
│   │   └── staff/ (reusable UI components)
│   ├── modules/ (domain + infrastructure)
│   │   ├── auth/
│   │   ├── booking/
│   │   ├── rooms/
│   │   ├── pricing/
│   │   ├── payment/
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── audit/
│   │   └── tickets/
│   ├── shared/
│   │   ├── types/ (TypeScript domain types)
│   │   ├── lib/ (validation, utilities)
│   │   └── hooks/ (real-time subscriptions)
│   ├── middleware.ts
│   └── env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (via Supabase)
- Environment variables (see `.env.local.example`)

### Setup

1. **Clone & install**
   ```bash
   cd ras-hotel
   npm install
   ```

2. **Environment variables**
   ```bash
   cp .env.local.example .env.local
   # Fill in Supabase, Chapa, Africa's Talking credentials
   ```

3. **Database migration**
   ```bash
   npx supabase migration up
   ```

4. **Development server**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

### Deployment

1. **Vercel (recommended)**
   ```bash
   vercel link
   vercel env pull
   vercel deploy
   ```

2. **Environment variables on Vercel**
   - Add all variables from `.env.local.example`
   - Set webhook URLs for Chapa and Africa's Talking

## 🔑 Key Flows

### Guest Booking (Online)
1. Guest lands on `/` → browses rooms
2. Clicks "Book now" → navigates to `/book`
3. Multi-step form: dates → room selection → guest info → review
4. Room lock acquired (10 min) via PostgreSQL advisory lock
5. Booking created in `Reserved_Unpaid` status
6. Chapa checkout URL returned
7. Guest redirected to Chapa → completes payment
8. Webhook updates booking to `Paid`
9. Room lock released
10. Confirmation SMS sent

### Walk-in Booking (Staff)
1. Receptionist at `/dashboard/bookings/new`
2. Selects dates → available rooms shown in real-time
3. Enters guest details → payment status (cash paid/pending)
4. Creates booking → if cash paid, records payment immediately
5. Booking transitions: `Reserved_Unpaid` → `Paid` (if cash)
6. Room status updated: `Available` → `Reserved_Paid`

### Check-in
1. Staff view `/dashboard/arrivals`
2. Sees today's expected arrivals grouped by payment status
3. For paid bookings: "Check in" button → confirms arrival
4. Booking transitions: `Paid` → `Checked_In`
5. Room status: `Reserved_Paid` → `Occupied`
6. Welcome SMS sent to guest (optional)

### Check-out
1. Staff view `/dashboard/departures`
2. Sees checked-in guests due out today
3. "Check out" button (guards: payment must be collected first)
4. Booking transitions: `Checked_In` → `Checked_Out`
5. Room status: `Occupied` → `Available`
6. Feedback SMS sent to guest (optional)
7. Guest can rate experience

## 📊 Data Model

### Core Tables
- **rooms**: Room inventory (25 rooms in base case)
- **bookings**: Guest reservations with full lifecycle tracking
- **booking_status_history**: Immutable event log of status changes
- **seasonal_rates**: Price overrides for date ranges (no overlaps enforced)
- **cash_collection_events**: Payment receipts
- **payment_records**: Online payment transactions from Chapa
- **room_locks**: 10-minute holds during payment
- **pdf_tickets**: Generated booking confirmations
- **notifications**: SMS/push logs
- **audit_log**: Append-only record of all staff actions
- **shift_notes**: Handover messages between shifts

### Enums (Const)
- `BookingStatus`: Reserved_Unpaid | Paid | Checked_In | Checked_Out | Cancelled_* | No_Show
- `RoomStatus`: Available | Occupied | Reserved_Paid | Reserved_Unpaid
- `UserRole`: receptionist | manager
- `PaymentMethod`: cash | online_chapa
- `AuditActionType`: 30+ actions (BookingCreated, CheckIn, CashCollectionEvent, etc.)

## ✅ Testing

### Property-Based Tests (Fast-Check)

**Property 1: Status Transition Graph** (64 assertions)
- All valid transitions succeed
- Invalid transitions are rejected with sensible error messages

**Property 2: No Overlapping Bookings** (200 iterations)
- Cancelled/no-show bookings never block availability
- Confirmed bookings correctly prevent overlaps
- Back-to-back bookings (checkout same day as next checkin) are allowed

**Property 3: Unique References** (500 refs generated)
- Generated booking references are unique
- Format matches regex `/^RAS-[A-Z2-9]{6}$/`

**Property 4: Refund Tier Logic** (4 branches)
- Cancellations on same calendar day: no refund
- Within cancellation window: 50% partial refund
- Outside window: 100% full refund

**Property 5: Cash Collection Validation** (all 4 fields required)
- Amount > 0
- Booking ID exists
- Receptionist ID exists
- Timestamp valid

Run tests:
```bash
npm run test
# or watch mode
npm run test:watch
```

## 🔐 Security

### Authentication & Authorization
- Supabase Auth (magic links + password)
- JWT tokens in httpOnly cookies
- Middleware enforces role-based routes
- RLS policies prevent cross-role data access
- Manager-only routes guarded at API level

### Data Protection
- Booking lookup deliberately doesn't reveal which field was wrong (prevents enumeration)
- Payment webhooks verify Chapa signatures
- Advisory locks prevent concurrent room bookings
- Audit log is append-only (triggers prevent modification/deletion)
- Staff IP logging (future enhancement)

### API Safety
- Rate limiting on public endpoints (bookings/lookup)
- Input validation on all endpoints (Zod schemas)
- CORS restricted to hotel domain
- CSRF tokens on forms

## 📈 Scaling Considerations

### Current Capacity
- Handles 500+ guests annually
- 25–100 rooms per property
- Sub-second room grid updates via Supabase Realtime

### Optimization Opportunities
- Caching seasonal rates (rarely change)
- Batch SMS sending (queue-based)
- Async PDF generation (Edge Functions)
- Booking search: full-text index on guest_name + booking_reference
- Occupancy reports: materialized view for fast analytics

## 🎨 Design Highlights

### Staff Dashboard
- **Real-time KPIs**: Arrivals, departures, available rooms, outstanding payments, overdue guests
- **Room grid**: Color-coded status, hover details, drill-down to booking
- **Arrivals/Departures**: Tab-based filtering, quick actions (check-in, collect cash, no-show)
- **QR scanner**: Camera-based check-in with special request display
- **Manual booking**: 3-step form with price preview, seasonal rate applied instantly
- **Booking detail**: Full lifecycle view, status history, all transitions available

### Guest Booking
- **Landing page**: Hero section, room type showcase, why choose us
- **Booking flow**: Progressive disclosure (dates → rooms → guest → confirm)
- **Room selection**: Real-time availability grid, clear pricing
- **Price preview**: Shows per-night breakdown, seasonal rates
- **Payment security**: Chapa integration, SSL, PCI-DSS compliant

### Lookup Page
- **Minimal friction**: Reference + phone only
- **Status-aware display**: Different colors/icons for awaiting payment vs checked-in
- **Check-in info**: Address, time, what to bring, contact
- **PDF download**: Mobile-friendly ticket
- **Help CTA**: Email contact prominently displayed

## 🌍 Localization (Future)

The system is built with i18n-ready:
- `guest_language` field on bookings (en, am planned)
- SMS templates support multiple languages
- PDF generation respects booking language
- UI strings in modules/shared/lib/i18n (not yet extracted)

## 📞 Support & Maintenance

### Monitoring
- Check Supabase dashboard for query performance
- Review audit log monthly for anomalies
- Monitor SMS costs via Africa's Talking dashboard
- Track payment success rate in payment_records

### Maintenance Tasks
- Archive old bookings (6+ months) → `booking_archive` table
- Clean expired room locks (daily cron via Edge Function)
- Update seasonal rates before peak seasons
- Review staff access quarterly

## 📄 License

Proprietary. Built for Ras Hotel, Harar, Ethiopia.

---

**Built with ❤️ for Ras Hotel**

Questions? Contact: info@rashotel.example.com
