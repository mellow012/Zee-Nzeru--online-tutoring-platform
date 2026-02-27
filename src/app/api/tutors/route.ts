import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Roles permitted to access this endpoint
const ALLOWED_ROLES = ['tutor', 'admin'] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ✅ Always use getUser() — validates session server-side, never trusts cookie alone
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Read role from user_metadata (set at signup, no extra DB round-trip)
    const role = user.user_metadata?.role as string | undefined;

    if (!role || !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // ─── Business logic (unchanged) ──────────────────────────────────────────

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const verifiedOnly = searchParams.get('verified') === 'true';

    if (subject) {
      const { data: tutors, error } = await supabase.rpc('fuzzy_search_tutors', {
        search_term: subject,
        subject_filter: subject,
        min_rating: 0,
      });
      if (error) throw error;
      return NextResponse.json({ success: true, tutors });
    }

    let query = supabase
      .from('tutor_profiles')
      .select(`*, profiles(full_name, avatar_url)`)
      .order('rating', { ascending: false });

    if (verifiedOnly) query = query.eq('verified', true);

    const { data: tutors, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, tutors });

    // ─────────────────────────────────────────────────────────────────────────
  } catch (error) {
    console.error('Get tutors error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}