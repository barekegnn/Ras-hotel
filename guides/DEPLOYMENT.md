# Ras Hotel — Deployment Checklist

## Pre-deployment

### 1. Environment Variables
Copy `.env.local.example` and configure all required values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...

# Authentication
NEXTAUTH_SECRET=<generate with: openssl rand -hex 32>
NEXTAUTH_URL=https://rashotel.example.com

# Payment (Chapa)
CHAPA_SECRET_KEY=CHASECK_xxxx
CHAPA_PUBLIC_KEY=CHASPUB_xxxx

# SMS (Africa's Talking)
AFRICAS_TALKING_API_KEY=atsk_xxx
AFRICAS_TALKING_USERNAME=RasHotel

# Google Maps (optional, for location embedding)
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...

# Gemini API (future chatbot)
GEMINI_API_KEY=AIzaSy...
```

### 2. Database Setup

```bash
# Push Supabase migrations
npx supabase migration up

# Create role enum values
INSERT INTO public.roles (name) VALUES ('receptionist'), ('manager');

# Create initial hotel configuration
INSERT INTO public.hotel_configuration (key, value) VALUES
  ('hotel_name', 'Ras Hotel'),
  ('hotel_address', 'Harar, Ethiopia'),
  ('hotel_phone', '+251 XXX XXX XXX'),
  ('hotel_email', 'info@rashotel.example.com'),
  ('checkin_time', '14:00'),
  ('checkout_time', '12:00'),
  ('reception_hours', '24 hours');

# Create initial admin staff account (manually or via script)
-- Staff account creation should go through the sign-up flow
```

### 3. Storage Buckets

Create in Supabase Storage:
- `room-photos` (public)
- `booking-tickets` (public)
- `backup` (private, for nightly backups)

Bucket policies:
```sql
-- room-photos: public read, service-role write
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'room-photos');

-- booking-tickets: public read, service-role write
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'booking-tickets');
```

### 4. Webhooks Configuration

#### Chapa Payment Webhook
- **Endpoint**: `https://rashotel.example.com/api/v1/payments/chapa-webhook`
- **Events**: Payment successful, payment failed
- **Method**: POST
- Set up in Chapa dashboard under "Integrations → Webhooks"

#### Africa's Talking SMS Status
- **Endpoint**: (optional, for delivery reports)
- Set up in Africa's Talking dashboard

### 5. Email Notifications (Future)
When you add transactional email:
- Provider: SendGrid, Mailgun, or Resend
- Templates for: booking confirmation, check-in reminder, feedback request
- Setup environment variables: `SENDGRID_API_KEY` or equivalent

## Deployment Steps

### Option A: Vercel (Recommended)

```bash
# 1. Link project
vercel link

# 2. Pull environment variables from Vercel
vercel env pull

# 3. Make sure .env.local is configured
# (copy from .env.local.example and fill in values)

# 4. Deploy to staging (optional)
vercel deploy --prebuilt

# 5. Deploy to production
vercel deploy --prod
```

### Option B: Self-hosted (Docker)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy files
COPY package*.json ./
RUN npm ci --production

COPY .next ./.next
COPY public ./public

# Environment variables must be set at runtime
# docker run -e NEXT_PUBLIC_SUPABASE_URL=... app

CMD ["npm", "start"]
EXPOSE 3000
```

Run:
```bash
docker build -t ras-hotel .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY \
  ... other env vars ...
  ras-hotel
```

## Post-deployment

### 1. Verify Endpoints
```bash
# Test health check
curl https://rashotel.example.com/api/v1/health

# Test room list (public)
curl https://rashotel.example.com/api/v1/rooms

# Test auth (should redirect to login)
curl https://rashotel.example.com/dashboard -L
```

### 2. Staff Onboarding
- Create staff accounts in Supabase Auth
- Assign roles (receptionist/manager) via staff_accounts table
- Share login link: https://rashotel.example.com/login

### 3. Configure Payment Gateway
- Test Chapa payment flow with a test card
- Verify webhook delivery (check transaction logs)
- Set up email alerts for failed payments

### 4. Test Guest Booking
- Complete a test booking end-to-end
- Verify SMS sent
- Verify email (when email is added)
- Test payment webhook
- Check booking appears in staff dashboard

### 5. Monitoring & Logging

**Supabase Dashboard**
- Monitor query performance
- Check for slow queries (sort by duration)
- Review RLS policy errors in logs
- Set up email alerts for quota exceeded

**Vercel Analytics**
- Monitor page load times
- Check error rate
- Review function execution times

**Application Monitoring** (optional but recommended)
- Add Sentry for error tracking: `npm install @sentry/nextjs`
- Configure `sentry.client.config.ts` and `sentry.server.config.ts`
- Monitor real user metrics (CWV)

## Maintenance

### Weekly
- Check Supabase storage quota
- Monitor payment processor status page
- Review failed SMS logs

### Monthly
- Backup Supabase database: `npx supabase db pull > backup.sql`
- Review audit log for unusual patterns
- Check staff access is still appropriate

### Quarterly
- Update npm dependencies: `npm update`
- Review security advisories: `npm audit`
- Performance review (query logs, slowest endpoints)
- Cost review (Supabase, Chapa fees, SMS volume)

## Troubleshooting

### Payment Webhook Not Triggering
1. Verify Chapa webhook URL is correct in Chapa dashboard
2. Check webhook signature verification in code
3. Review Chapa transaction logs for webhook delivery status
4. Test with Chapa's "Send Test Webhook" button

### SMS Not Sending
1. Verify `AFRICAS_TALKING_API_KEY` is correct
2. Check Africa's Talking account has credit
3. Review send logs in Africa's Talking dashboard
4. Verify phone number format (should be +251...)

### Room Lock Timeout
- Room locks expire after 10 minutes automatically
- If a guest's payment times out, the lock is released
- Check `room_locks` table to see active locks

### Booking Creation Fails
1. Check if booking reference is unique (try again, should work)
2. Verify room is available (check other active bookings)
3. Review API error response for validation errors
4. Check staff has receptionist role or higher

## Scaling

### If adding more properties
1. Create separate Supabase projects (or add `property_id` to all tables)
2. Each property gets its own hotel_configuration
3. Staff accounts tied to property (or multiple properties)
4. Reports filtered by property

### If traffic increases
1. Enable Full-Text Search on bookings table
2. Add caching layer (Redis) for room availability
3. Implement rate limiting more aggressively
4. Consider materialized views for reports

### If team grows
1. Add more manager accounts for operational oversight
2. Implement shift scheduling (add `shifts` table)
3. Add staff performance metrics (bookings per day, guest ratings)
4. Implement team chat for coordination (integration with Slack/Teams)

## Security Hardening

### Before production
- [ ] Change all default passwords
- [ ] Enable 2FA on Supabase account
- [ ] Enable 2FA on Chapa account
- [ ] Enable 2FA on Africa's Talking account
- [ ] Set strong NEXTAUTH_SECRET
- [ ] Review RLS policies thoroughly
- [ ] Enable rate limiting on APIs
- [ ] Add CORS restrictions
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Set up WAF rules (Vercel DDoS protection is default)

### Ongoing
- [ ] Monthly security audit
- [ ] Quarterly access review (who has staff accounts)
- [ ] Enable Supabase backup to cold storage
- [ ] Set up security alerts for failed auth attempts

---

**Need help?** Check the main README.md or contact the development team.
