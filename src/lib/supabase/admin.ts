import { createClient } from '@supabase/supabase-js';
import { getRequiredEnvVar } from '@/lib/env';

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
  const url = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const key = getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
