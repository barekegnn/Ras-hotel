// ============================================================
// Supabase Client Factory — Re-export barrel
// src/modules/auth/infrastructure/supabase.ts
//
// Re-exports all clients for backwards compatibility.
// Server-side code imports from here or supabase.server.ts directly.
// Client Components MUST import createSupabaseBrowserClient from
// supabase.browser.ts (or via this barrel only if tree-shaking works).
//
// NOTE: Because this file re-exports from supabase.server.ts which
// uses next/headers, Client Components should import directly from
// supabase.browser.ts to avoid bundling server-only code.
// ============================================================

export { createSupabaseServerClient, createSupabaseServiceClient } from './supabase.server';
export { createSupabaseBrowserClient } from './supabase.browser';
