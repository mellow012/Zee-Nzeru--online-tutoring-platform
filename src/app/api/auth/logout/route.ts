import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/auth/logout
// Called by the client logout button.
// Signs out on the server so the SSR cookie is properly cleared.

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Logout API route error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}