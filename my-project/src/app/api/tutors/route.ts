import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const verifiedOnly = searchParams.get('verified') === 'true';

    const supabase = await createClient();

    // Use your fuzzy_search_tutors RPC if a search term is provided,
    // otherwise do a standard query
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
  } catch (error) {
    console.error('Get tutors error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}