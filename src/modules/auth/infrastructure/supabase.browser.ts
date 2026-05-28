// ============================================================
// Supabase Browser Client — CLIENT SAFE
// src/modules/auth/infrastructure/supabase.browser.ts
//
// Safe to import in Client Components and hooks.
// Does NOT import next/headers.
// ============================================================

'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/shared/types/supabase';

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase client for use in React Client Components.
 * Use for Realtime subscriptions and client-side data fetching.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
