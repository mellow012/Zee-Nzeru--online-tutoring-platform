import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get('tutorId');
    const sessionId = searchParams.get('sessionId');
    const supabase = await createClient();

    if (sessionId) {
      const { data: review } = await supabase
        .from('reviews')
        .select(`*, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)`)
        .eq('session_id', sessionId)
        .single();
      return NextResponse.json({ success: true, review });
    }

    if (!tutorId) {
      return NextResponse.json({ success: false, error: 'Tutor ID required' }, { status: 400 });
    }

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles!reviews_reviewer_id_fkey(full_name, avatar_url),
        sessions(subject, scheduled_start_time)
      `)
      .eq('reviewee_id', tutorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'student') {
      return NextResponse.json({ success: false, error: 'Only students can leave reviews' }, { status: 403 });
    }

    const { sessionId, rating, comment } = await request.json();

    if (!sessionId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: 'Valid session ID and rating (1-5) required' }, { status: 400 });
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('tutor_id, student_id, status')
      .eq('id', sessionId)
      .single();

    if (!session) return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    if (session.student_id !== user.id) return NextResponse.json({ success: false, error: 'You can only review your own sessions' }, { status: 403 });
    if (session.status !== 'completed') return NextResponse.json({ success: false, error: 'Can only review completed sessions' }, { status: 400 });

    // Your update_tutor_rating() trigger handles avg recalculation automatically
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        session_id: sessionId,
        reviewer_id: user.id,
        reviewee_id: session.tutor_id,
        rating,
        comment,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return NextResponse.json({ success: false, error: 'Session already reviewed' }, { status: 400 });
      }
      throw insertError;
    }

    await supabase.from('notifications').insert({
      user_id: session.tutor_id,
      type: 'review',
      title: 'New Review',
      message: `${profile.full_name} left you a ${rating}-star review!`,
      session_id: sessionId,
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}