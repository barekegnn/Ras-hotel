// ============================================================
// Rooms Seed Script — Real Ras Hotel Data (4 room types)
// scripts/seed-rooms.mjs
// Usage: node scripts/seed-rooms.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? 'https://lvisnkkqjnbpiajnmjln.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aXNua2txam5icGlham5tamxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAzODEwNywiZXhwIjoyMDk0NjE0MTA3fQ.IdGdTXLtqfzGcbLIQRDLP-FXfFmdyjARPGmXN37kvgY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SINGLE_DESC    = 'Our friendly single rooms are refreshing for individual travelers. One single sized bed and a seating area, flat-screen TV with international channels, and bathroom with a bath or shower.';
const SUITE_DESC     = 'Our inspirational Suite rooms offer the perfect place for individuals and couples traveling together. One king sized bed and comprehensive seating area, flat-screen TV with international channels, and bathroom with a bath or shower.';
const TWIN_SM_DESC   = 'Our hospitable Twin rooms offer the perfect respite for friends traveling together, solo travelers or families with two single beds and a seating area, flat-screen TV with international channels, and bathroom with a bath or shower.';
const TWIN_LG_DESC   = 'Our hospitable Twin rooms offer the perfect respite for friends traveling together, solo travelers or families with two bigger single beds and a seating area, flat-screen TV with international channels, and bathroom with a bath or shower.';

const ROOMS = [
  // ── Single (ETB 2,000) ────────────────────────────────────
  { room_number: '101', room_type: 'Single',     floor: 1, base_price_per_night: 2000, description: SINGLE_DESC },
  { room_number: '102', room_type: 'Single',     floor: 1, base_price_per_night: 2000, description: SINGLE_DESC },
  { room_number: '103', room_type: 'Single',     floor: 1, base_price_per_night: 2000, description: SINGLE_DESC },
  { room_number: '201', room_type: 'Single',     floor: 2, base_price_per_night: 2000, description: SINGLE_DESC },

  // ── Suite (ETB 4,000) ─────────────────────────────────────
  { room_number: '301', room_type: 'Suite',      floor: 3, base_price_per_night: 4000, description: SUITE_DESC },
  { room_number: '302', room_type: 'Suite',      floor: 3, base_price_per_night: 4000, description: SUITE_DESC },

  // ── Twin Small (ETB 2,000) ────────────────────────────────
  { room_number: '104', room_type: 'Twin Small', floor: 1, base_price_per_night: 2000, description: TWIN_SM_DESC },
  { room_number: '105', room_type: 'Twin Small', floor: 1, base_price_per_night: 2000, description: TWIN_SM_DESC },
  { room_number: '202', room_type: 'Twin Small', floor: 2, base_price_per_night: 2000, description: TWIN_SM_DESC },

  // ── Twin Large (ETB 4,000) ────────────────────────────────
  { room_number: '203', room_type: 'Twin Large', floor: 2, base_price_per_night: 4000, description: TWIN_LG_DESC },
  { room_number: '303', room_type: 'Twin Large', floor: 3, base_price_per_night: 4000, description: TWIN_LG_DESC },
];

async function seed() {
  console.log('🌱 Seeding Ras Hotel rooms (4 types)...\n');
  let created = 0, skipped = 0;

  for (const room of ROOMS) {
    const { data: existing } = await supabase
      .from('rooms').select('id').eq('room_number', room.room_number).maybeSingle();

    if (existing) { console.log(`  ↩  Room ${room.room_number} exists — skipping`); skipped++; continue; }

    const { error } = await supabase.from('rooms').insert({ ...room, status: 'available', is_active: true });
    if (error) { console.error(`  ❌ Room ${room.room_number}: ${error.message}`); }
    else { console.log(`  ✅ Room ${room.room_number} (${room.room_type}) — ETB ${room.base_price_per_night}/night`); created++; }
  }

  console.log(`\n✅ Done: ${created} created, ${skipped} skipped`);
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│  Single     (4): ETB 2,000/night             │');
  console.log('│  Suite      (2): ETB 4,000/night             │');
  console.log('│  Twin Small (3): ETB 2,000/night             │');
  console.log('│  Twin Large (2): ETB 4,000/night             │');
  console.log('│  Total: 11 rooms                             │');
  console.log('└──────────────────────────────────────────────┘');
}

seed().catch((err) => { console.error('\n💥', err.message); process.exit(1); });
