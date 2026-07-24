import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin client — uses the SERVICE_ROLE key.
 *
 * ⚠️  NEVER import this in client components or expose to the browser.
 * Only use in Server Actions, API Route Handlers, and server-side code.
 *
 * Capabilities:
 *  - auth.admin.inviteUserByEmail()
 *  - auth.admin.createUser()
 *  - Bypass RLS policies
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
