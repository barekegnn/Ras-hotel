// ============================================================
// Staff Seed Script
// scripts/seed-staff.mjs
//
// Creates Supabase Auth users + staff_accounts rows for:
//   - 1 manager
//   - 2 receptionists
//
// Usage: node scripts/seed-staff.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js';

// ── Config (reads from env or falls back to hardcoded values) ─
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? 'https://lvisnkkqjnbpiajnmjln.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aXNua2txam5icGlham5tamxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAzODEwNywiZXhwIjoyMDk0NjE0MTA3fQ.IdGdTXLtqfzGcbLIQRDLP-FXfFmdyjARPGmXN37kvgY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Staff to seed ─────────────────────────────────────────────
const STAFF = [
  {
    email:    'manager@rashotel.local',
    password: 'Manager@123',
    username: 'manager',
    fullName: 'Hotel Manager',
    role:     'manager',
    mustChangePassword: false,
  },
  {
    email:    'receptionist1@rashotel.local',
    password: 'Recept@123',
    username: 'receptionist',
    fullName: 'Front Desk',
    role:     'receptionist',
    mustChangePassword: false,
  },
  {
    email:    'receptionist2@rashotel.local',
    password: 'Recept@123',
    username: 'receptionist2',
    fullName: 'Front Desk 2',
    role:     'receptionist',
    mustChangePassword: false,
  },
];

// ── Helpers ───────────────────────────────────────────────────

async function upsertAuthUser(email, password) {
  // Check if user already exists
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);

  const existing = users.find((u) => u.email === email);
  if (existing) {
    console.log(`  ↩  Auth user already exists: ${email} (${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // skip email verification
  });

  if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
  console.log(`  ✅ Auth user created: ${email} (${data.user.id})`);
  return data.user.id;
}

async function upsertStaffAccount(authId, { username, fullName, role, mustChangePassword }) {
  // Check if staff_account already exists for this auth_id
  const { data: existing } = await supabase
    .from('staff_accounts')
    .select('id, username')
    .eq('auth_id', authId)
    .maybeSingle();

  if (existing) {
    console.log(`  ↩  Staff account already exists: ${existing.username}`);
    return;
  }

  // Also check username uniqueness
  const { data: byUsername } = await supabase
    .from('staff_accounts')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  const finalUsername = byUsername
    ? `${username}_${Date.now().toString().slice(-4)}`
    : username;

  const { error } = await supabase.from('staff_accounts').insert({
    auth_id:              authId,
    full_name:            fullName,
    username:             finalUsername,
    role,
    is_active:            true,
    must_change_password: mustChangePassword,
  });

  if (error) throw new Error(`insert staff_account(${username}) failed: ${error.message}`);
  console.log(`  ✅ Staff account created: ${finalUsername} (${role})`);
}

// ── Main ──────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding staff accounts...\n');
  console.log(`   Supabase: ${SUPABASE_URL}\n`);

  for (const staff of STAFF) {
    console.log(`\n── ${staff.fullName} (${staff.role}) ──`);
    try {
      const authId = await upsertAuthUser(staff.email, staff.password);
      await upsertStaffAccount(authId, staff);
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
    }
  }

  console.log('\n\n✅ Seeding complete!\n');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│  Login at: http://localhost:3000/login           │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│  manager       / Manager@123  (manager role)    │');
  console.log('│  receptionist  / Recept@123   (receptionist)    │');
  console.log('│  receptionist2 / Recept@123   (receptionist)    │');
  console.log('└─────────────────────────────────────────────────┘');
}

seed().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
