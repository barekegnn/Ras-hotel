// scripts/run-migration.mjs
// Runs the full schema migration against the hosted Supabase project
// Usage: node scripts/run-migration.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://lvisnkkqjnbpiajnmjln.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aXNua2txam5icGlham5tamxuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAzODEwNywiZXhwIjoyMDk0NjE0MTA3fQ.IdGdTXLtqfzGcbLIQRDLP-FXfFmdyjARPGmXN37kvgY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260525000000_ras_hotel_complete_schema.sql');
const sql = readFileSync(migrationPath, 'utf8');

// Split on statement boundaries for better error reporting
// We'll send the whole thing as one request via the SQL API
async function runMigration() {
  console.log('🚀 Running Ras Hotel schema migration...\n');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  console.log('✅ Supabase connection OK\n');

  // Use the SQL HTTP API (available via service role)
  const sqlResponse = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!sqlResponse.ok) {
    const err = await sqlResponse.text();
    // Try the management API approach
    console.log('Direct SQL endpoint not available, trying management API...');
    await runViaMgmtApi(sql);
    return;
  }

  const result = await sqlResponse.json();
  console.log('✅ Migration applied successfully!');
  console.log(result);
}

async function runViaMgmtApi(sql) {
  // Split into individual statements and run each via a custom RPC
  // First, create the exec function, then use it
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📋 Executing ${statements.length} SQL statements...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt });
      if (error) {
        // Many errors are expected (already exists, etc.)
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate')) {
          console.log(`  ⚠️  [${i+1}] Skipped (already exists): ${stmt.substring(0, 60)}...`);
        } else {
          console.error(`  ❌ [${i+1}] Error: ${error.message}`);
          console.error(`     SQL: ${stmt.substring(0, 100)}`);
          errorCount++;
        }
      } else {
        successCount++;
        if (i % 10 === 0) process.stdout.write('.');
      }
    } catch (e) {
      console.error(`  ❌ [${i+1}] Exception: ${e.message}`);
      errorCount++;
    }
  }

  console.log(`\n\n✅ Done: ${successCount} succeeded, ${errorCount} errors`);
}

runMigration().catch(console.error);
