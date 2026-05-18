import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/auth/logout
// Called by the client logout button.
// Signs out on the server so the SSR cookie is properly cleared,
// then redirects to the landing page.

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Hard redirect — clears any client-side router cache too
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(new URL('/', url), { status: 302 });
}