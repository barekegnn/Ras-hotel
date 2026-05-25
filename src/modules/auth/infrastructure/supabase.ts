// ============================================================
// Supabase Client Factory
// src/modules/auth/infrastructure/supabase.ts
//
// Provides server-side and browser-side Supabase clients.
// Uses @supabase/ssr for proper cookie-based auth in Next.js App Router.
// Requirements 11.1, 11.5
// ============================================================

import { createServerClient, createBrowserClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/shared/types/supabase';

// ── Environment Variable Guards ───────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(key: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

// ── Server Client (for API Routes and Server Components) ──────

/**
 * Creates a Supabase client bound to the current request's cookies.
 * Use in API Route handlers, Server Components, and Server Actions.
 * Auth state (JWT) is read from / written to HTTP-only cookies.
 *
 * Requirements 11.1, 11.5
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', SUPABASE_ANON_KEY),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server component — cookie mutation is ignored
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Server component — cookie mutation is ignored
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client with the service role key.
 * Use ONLY in server-side code that requires bypassing RLS (e.g. webhooks, cron jobs).
 * NEVER expose the service role key to the browser.
 */
export function createSupabaseServiceClient() {
  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ── Browser Client (for Client Components) ────────────────────

/**
 * Creates a Supabase client for use in React Client Components.
 * Manages auth state via cookies (coordinated with server client).
 * Use for Realtime subscriptions and client-side data fetching.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', SUPABASE_ANON_KEY)
  );
}
