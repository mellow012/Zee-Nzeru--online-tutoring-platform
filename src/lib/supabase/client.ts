'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getRequiredEnvVar } from '@/lib/env';

// Module-level singleton — one instance for the entire app lifetime.
// Without this, calling createClient() inside components or hooks creates
// multiple Supabase instances that fight over the same Navigator LockManager
// lock on the auth token, causing 10s timeouts.
let client: SupabaseClient | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}