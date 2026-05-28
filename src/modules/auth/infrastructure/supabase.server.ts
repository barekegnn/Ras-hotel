// ============================================================
// Supabase Server Clients — SERVER ONLY
// src/modules/auth/infrastructure/supabase.server.ts
//
// Use ONLY in API routes, Server Components, and Server Actions.
// Contains next/headers — will crash if imported in Client Components.
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/shared/types/supabase';

const SUPABASE_URL            = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY       = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Creates a Supabase client bound to the current request's cookies.
 * Use in API Route handlers, Server Components, and Server Actions.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try { cookieStore.set({ name, value: '', ...options }); } catch {}
      },
    },
  });
}

/**
 * Creates a Supabase client with the service role key.
 * Use ONLY in server-side code that requires bypassing RLS.
 * NEVER expose the service role key to the browser.
 */
export function createSupabaseServiceClient() {
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
