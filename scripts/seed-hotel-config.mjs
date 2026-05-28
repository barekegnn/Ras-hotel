// ============================================================
// Hotel Configuration Seed — Real Ras Hotel Data
// scripts/seed-hotel-config.mjs
//
// Seeds hotel_configuration table with real Ras Hotel values.
// Usage: node scripts/seed-hotel-config.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? 'https://lvisnkkqjnbpiajnmjln.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aXNua2txam5icGlham5tamxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAzODEwNywiZXhwIjoyMDk0NjE0MTA3fQ.IdGdTXLtqfzGcbLIQRDLP-FXfFmdyjARPGmXN37kvgY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CONFIG = [
  // ── Identity ──────────────────────────────────────────────
  { key: 'hotel_name',    value: 'Ras Hotel' },
  { key: 'hotel_address', value: 'Harar Jugol (Walled City), Harar, Ethiopia' },
  { key: 'hotel_phone',   value: '+251256660027, +251930179947' },
  { key: 'hotel_email',   value: 'reservation@hararrashotel.com' },
  { key: 'hotel_website', value: 'https://hararrashotel.com' },
  // ── Operations ────────────────────────────────────────────
  { key: 'reception_hours',           value: '24 hours, 7 days a week' },
  { key: 'checkin_time',              value: '14:00' },
  { key: 'checkout_time',             value: '12:00' },
  { key: 'no_show_threshold_time',    value: '20:00' },
  { key: 'cancellation_window_hours', value: '48' },
  { key: 'timezone',                  value: 'Africa/Addis_Ababa' },
  { key: 'currency',                  value: 'ETB' },

  // ── Notifications ─────────────────────────────────────────
  { key: 'feedback_link_expiry_days', value: '7' },
  { key: 'pre_arrival_reminder_hour', value: '9' },

  // ── Services ──────────────────────────────────────────────
  { key: 'services', value: JSON.stringify([
    'Concierge service',
    'Luggage storage',
    'Currency exchange',
    'Express check-in/check-out',
    'Room service',
    '24-hour front desk',
    'Shuttle service',
    'Ras Cinema & Game Zone',
    'Free WiFi',
    'ATM',
    'Laundry',
    'Ras Café',
  ])},
];

async function seed() {
  console.log('🌱 Seeding Ras Hotel configuration...\n');

  for (const entry of CONFIG) {
    const { error } = await supabase
      .from('hotel_configuration')
      .upsert({ key: entry.key, value: entry.value }, { onConflict: 'key' });

    if (error) {
      console.error(`  ❌ Failed to set ${entry.key}: ${error.message}`);
    } else {
      const display = entry.value.length > 60 ? entry.value.slice(0, 57) + '...' : entry.value;
      console.log(`  ✅ ${entry.key} = "${display}"`);
    }
  }

  console.log('\n✅ Hotel configuration seeded!\n');
}

seed().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
